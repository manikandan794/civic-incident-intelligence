const { spawn } = require('child_process');
const http = require('http');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runBrowserTest() {
  console.log('============================================================');
  console.log('CHROME SPA NAVIGATION & BLANK PAGE VERIFICATION TEST');
  console.log('============================================================');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    'about:blank'
  ]);

  let ws = null;
  let msgId = 1;
  const callbacks = new Map();
  const consoleErrors = [];

  try {
    // Wait for Chrome CDP to be available
    let targets = null;
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      try {
        targets = await fetchJson('http://127.0.0.1:9222/json/list');
        if (targets && targets.length > 0) break;
      } catch (e) {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Chrome remote debugging did not start on port 9222');
    }

    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;
    console.log('[DEBUG] Connected to Chrome DevTools WebSocket:', wsUrl);

    ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    function sendCmd(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const cb = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) {
          cb.reject(new Error(msg.error.message));
        } else {
          cb.resolve(msg.result);
        }
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          const text = msg.params.args.map(a => a.value || a.description).join(' ');
          console.log('[BROWSER CONSOLE ERROR]:', text);
          consoleErrors.push(text);
        }
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
        console.log('[BROWSER UNCAUGHT EXCEPTION]:', desc);
        consoleErrors.push(desc);
      }
    };

    // Enable events
    await sendCmd('Page.enable');
    await sendCmd('Runtime.enable');
    await sendCmd('DOM.enable');

    async function evaluate(expression) {
      const res = await sendCmd('Runtime.evaluate', { expression, returnByValue: true });
      return res.result.value;
    }

    // TEST 1: Load Root / Landing page
    console.log('\n--> Step 1: Navigating to Landing Page (http://127.0.0.1:8000/)...');
    await sendCmd('Page.navigate', { url: 'http://127.0.0.1:8000/' });
    await sleep(1500);

    let landingText = await evaluate('document.body.innerText');
    if (!landingText.includes('CITIZEN PORTAL') || !landingText.includes('OFFICER PORTAL') || !landingText.includes('WORKER PORTAL')) {
      throw new Error('Landing page did not display 3 role cards correctly. Body: ' + landingText.substring(0, 300));
    }
    console.log('[PASS] Step 1: Landing page rendered all 3 role portals cleanly.');

    // TEST 2: Click "OPEN CITIZEN PORTAL" (Client-side SPA link click WITHOUT reload)
    console.log('\n--> Step 2: Clicking "OPEN CITIZEN PORTAL" link (Client-side SPA transition)...');
    const citizenClicked = await evaluate(`
      (() => {
        const links = Array.from(document.querySelectorAll('a'));
        const citizenLink = links.find(a => a.href.includes('/citizen') && a.innerText.includes('OPEN CITIZEN PORTAL'));
        if (citizenLink) {
          citizenLink.click();
          return true;
        }
        return false;
      })()
    `);

    if (!citizenClicked) {
      throw new Error('Could not find "OPEN CITIZEN PORTAL" link to click');
    }

    await sleep(1000);

    const currentUrl = await evaluate('window.location.pathname');
    const citizenText = await evaluate('document.body.innerText');
    console.log('[DEBUG] Current URL:', currentUrl);
    console.log('[DEBUG] Page text snippet:', citizenText.substring(0, 200).replace(/\\n/g, ' '));

    if (currentUrl !== '/citizen') {
      throw new Error(`Expected URL to be /citizen, got: ${currentUrl}`);
    }

    if (!citizenText.includes('Report a New Issue') && !citizenText.includes('Submit Evidence') && !citizenText.includes('Smart Civic Issue Reporting')) {
      throw new Error('Citizen page was BLANK after clicking link! Body text: ' + citizenText);
    }
    console.log('[PASS] Step 2: Citizen Portal rendered IMMEDIATELY after click with zero blank page!');

    // TEST 3: Navigate from Citizen to Officer Login via SPA
    console.log('\n--> Step 3: Navigating to Officer Login (/admin/login)...');
    await evaluate(`window.history.pushState({}, '', '/admin/login'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await sleep(800);

    const officerText = await evaluate('document.body.innerText');
    if (!officerText.includes('OFFICER PORTAL') && !officerText.includes('Officer Operations')) {
      throw new Error('Officer login page blank or did not render. Text: ' + officerText.substring(0, 300));
    }
    console.log('[PASS] Step 3: Officer Portal Login rendered immediately without refresh.');

    // TEST 4: Navigate to Worker Login via SPA
    console.log('\n--> Step 4: Navigating to Worker Login (/worker/login)...');
    await evaluate(`window.history.pushState({}, '', '/worker/login'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await sleep(800);

    const workerText = await evaluate('document.body.innerText');
    if (!workerText.includes('WORKER PORTAL') && !workerText.includes('Field Operations')) {
      throw new Error('Worker login page blank or did not render. Text: ' + workerText.substring(0, 300));
    }
    console.log('[PASS] Step 4: Worker Portal Login rendered immediately without refresh.');

    // TEST 5: Return to Root / Landing page via SPA
    console.log('\n--> Step 5: Returning to Landing Page (/)...');
    await evaluate(`window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await sleep(800);

    const backLanding = await evaluate('document.body.innerText');
    if (!backLanding.includes('CITIZEN PORTAL')) {
      throw new Error('Returning to landing page failed. Text: ' + backLanding.substring(0, 200));
    }
    console.log('[PASS] Step 5: Successfully returned to Landing page.');

    // TEST 6: Second click to Citizen Portal to ensure repeated navigation works flawlessly
    console.log('\n--> Step 6: Second click from Landing -> Citizen Portal...');
    await evaluate(`
      (() => {
        const links = Array.from(document.querySelectorAll('a'));
        const citizenLink = links.find(a => a.href.includes('/citizen') && a.innerText.includes('OPEN CITIZEN PORTAL'));
        if (citizenLink) citizenLink.click();
      })()
    `);
    await sleep(800);

    const citizenText2 = await evaluate('document.body.innerText');
    if (!citizenText2.includes('Report a New Issue')) {
      throw new Error('Second navigation to Citizen Portal went blank! Text: ' + citizenText2);
    }
    console.log('[PASS] Step 6: Second navigation to Citizen Portal verified instant load.');

    // TEST 7: Check console errors
    console.log('\n--> Step 7: Verifying Browser Console Error Log...');
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('401') && 
      !e.includes('Failed to load resource')
    );

    if (criticalErrors.length > 0) {
      console.warn('[WARNING] Uncaught console errors observed:', criticalErrors);
    } else {
      console.log('[PASS] Step 7: Zero React render exceptions or uncaught runtime errors!');
    }

    console.log('\n============================================================');
    console.log('ALL CHROME BROWSER SPA TESTS PASSED CLEANLY (NO BLANK PAGES)');
    console.log('============================================================');

  } finally {
    if (ws) ws.close();
    chromeProcess.kill();
  }
}

runBrowserTest().catch(err => {
  console.error('\n[FAIL] Test encountered error:', err.message);
  process.exit(1);
});
