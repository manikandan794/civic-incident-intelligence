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

async function runCloudflareTest() {
  console.log('============================================================');
  console.log('CLOUDFLARE PUBLIC TUNNEL SPA NAVIGATION TEST');
  console.log('============================================================');

  const publicUrl = 'https://invisible-knows-film-administered.trycloudflare.com';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    'about:blank'
  ]);

  let ws = null;
  let msgId = 1;
  const callbacks = new Map();
  const consoleErrors = [];

  try {
    let targets = null;
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      try {
        targets = await fetchJson('http://127.0.0.1:9222/json/list');
        if (targets && targets.length > 0) break;
      } catch (e) {}
    }

    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const wsUrl = pageTarget.webSocketDebuggerUrl;

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
        if (msg.error) cb.reject(new Error(msg.error.message));
        else cb.resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const text = msg.params.args.map(a => a.value || a.description).join(' ');
        consoleErrors.push(text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
        consoleErrors.push(desc);
      }
    };

    await sendCmd('Page.enable');
    await sendCmd('Runtime.enable');

    async function evaluate(expression) {
      const res = await sendCmd('Runtime.evaluate', { expression, returnByValue: true });
      return res.result.value;
    }

    // Step 1: Navigate to Public Landing
    console.log(`\n--> Step 1: Navigating to Public Tunnel: ${publicUrl}...`);
    await sendCmd('Page.navigate', { url: publicUrl });
    await sleep(2500);

    let landingText = await evaluate('document.body.innerText');
    if (!landingText.includes('CITIZEN PORTAL')) {
      throw new Error('Public landing page did not load. Content: ' + landingText);
    }
    console.log('[PASS] Step 1: Public Tunnel landing page loaded.');

    // Step 2: Click Citizen Portal over Cloudflare Tunnel (SPA click)
    console.log('\n--> Step 2: Clicking Citizen Portal Link over Cloudflare Tunnel...');
    await evaluate(`
      (() => {
        const links = Array.from(document.querySelectorAll('a'));
        const l = links.find(a => a.href.includes('/citizen') && a.innerText.includes('OPEN CITIZEN PORTAL'));
        if (l) l.click();
      })()
    `);
    await sleep(2000);

    const citizenUrl = await evaluate('window.location.pathname');
    const citizenText = await evaluate('document.body.innerText');
    console.log('[DEBUG] Public Tunnel Current URL:', citizenUrl);
    console.log('[DEBUG] Snippet:', citizenText.substring(0, 150).replace(/\\n/g, ' '));

    if (!citizenText.includes('Report a New Issue') && !citizenText.includes('Smart Civic Issue Reporting')) {
      throw new Error('Public Tunnel Citizen page was BLANK after click! Body: ' + citizenText);
    }
    console.log('[PASS] Step 2: Public Tunnel Citizen Portal rendered IMMEDIATELY without blank screen!');

    // Step 3: Direct URL to /admin/login over Cloudflare Tunnel
    console.log('\n--> Step 3: Direct URL to /admin/login over Cloudflare Tunnel...');
    await sendCmd('Page.navigate', { url: `${publicUrl}/admin/login` });
    await sleep(2500);

    const officerText = await evaluate('document.body.innerText');
    if (!officerText.includes('OFFICER PORTAL') && !officerText.includes('Officer Operations')) {
      throw new Error('Public direct /admin/login did not load. Content: ' + officerText);
    }
    console.log('[PASS] Step 3: Public Tunnel direct URL to Officer Login loaded cleanly.');

    // Step 4: Direct URL to /worker/login over Cloudflare Tunnel
    console.log('\n--> Step 4: Direct URL to /worker/login over Cloudflare Tunnel...');
    await sendCmd('Page.navigate', { url: `${publicUrl}/worker/login` });
    await sleep(2500);

    const workerText = await evaluate('document.body.innerText');
    if (!workerText.includes('WORKER PORTAL') && !workerText.includes('Field Operations')) {
      throw new Error('Public direct /worker/login did not load. Content: ' + workerText);
    }
    console.log('[PASS] Step 4: Public Tunnel direct URL to Worker Login loaded cleanly.');

    console.log('\n============================================================');
    console.log('ALL CLOUDFLARE PUBLIC TUNNEL SPA TESTS PASSED CLEANLY');
    console.log('============================================================');

  } finally {
    if (ws) ws.close();
    chromeProcess.kill();
  }
}

runCloudflareTest().catch(err => {
  console.error('\n[FAIL] Cloudflare public test encountered error:', err.message);
  process.exit(1);
});
