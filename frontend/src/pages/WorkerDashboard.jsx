import React, { useState, useEffect } from 'react';
import {
  Hammer, CheckCircle2, Clock, AlertTriangle, MapPin, Play,
  Check, FileText, RefreshCw, Sparkles, User, Radio, Camera,
  Send, X, ExternalLink, HardHat, Compass
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('WORK_ORDERS'); // 'WORK_ORDERS' or 'VERIFICATIONS'
  const [tasks, setTasks] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // GPS Location Beacon state
  const [gpsStatus, setGpsStatus] = useState('Requesting...');
  const [gpsCoords, setGpsCoords] = useState(null);

  // Work action modal/state
  const [actingTicket, setActingTicket] = useState(null);
  const [workNotes, setWorkNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Verification modal state
  const [selectedVerif, setSelectedVerif] = useState(null);
  const [verifNotes, setVerifNotes] = useState('');
  const [submittingVerif, setSubmittingVerif] = useState(false);

  // Periodic GPS Beaconing (Section 17)
  useEffect(() => {
    let watchId = null;
    let beaconInterval = null;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setGpsCoords(coords);
          setGpsStatus('Live Tracking Active');
        },
        (err) => {
          setGpsStatus('Location unavailable');
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );

      // Send to backend every 45 seconds
      const sendBeacon = async () => {
        if (gpsCoords) {
          try {
            await apiRequest('/workers/location', {
              method: 'POST',
              body: JSON.stringify({
                latitude: gpsCoords.lat,
                longitude: gpsCoords.lng,
                is_online: true
              })
            });
          } catch (e) {
            // quiet
          }
        }
      };

      beaconInterval = setInterval(sendBeacon, 45000);
      sendBeacon(); // Initial beacon
    } else {
      setGpsStatus('Location unavailable');
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (beaconInterval) clearInterval(beaconInterval);
    };
  }, [gpsCoords?.lat]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [tList, vList] = await Promise.all([
        apiRequest('/workers/portal/my-tasks').catch(() => []),
        apiRequest('/workers/portal/verifications').catch(() => [])
      ]);
      setTasks(tList || []);
      setVerifications(vList || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  // Worker Action: Start Work
  const handleStartWork = async (complaintId) => {
    setActingTicket(complaintId);
    try {
      await apiRequest(`/workers/tasks/${complaintId}/start`, {
        method: 'POST',
        body: JSON.stringify({ notes: workNotes || 'Field crew deployed to site with equipment.' })
      });
      setWorkNotes('');
      await fetchAllData();
    } catch (err) {
      alert(err.message || 'Failed to start work');
    } finally {
      setActingTicket(null);
    }
  };

  // Worker Action: Complete Work (Sends to Officer for inspection per Section 13)
  const handleCompleteWork = async (complaintId) => {
    setActingTicket(complaintId);
    try {
      await apiRequest(`/workers/tasks/${complaintId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes: workNotes || 'Physical repairs completed. Ready for Ward Officer inspection.' })
      });
      setWorkNotes('');
      await fetchAllData();
    } catch (err) {
      alert(err.message || 'Failed to submit completion');
    } finally {
      setActingTicket(null);
    }
  };

  // Worker Action: Submit Evidence Verification (Additional Module)
  const handleSubmitVerification = async (e) => {
    e.preventDefault();
    if (!selectedVerif) return;
    setSubmittingVerif(true);
    try {
      await apiRequest(`/evidence-reports/${selectedVerif.id}/worker-verify`, {
        method: 'POST',
        body: JSON.stringify({
          worker_notes: verifNotes || 'Site condition inspected. Verified defect status.'
        })
      });
      setSelectedVerif(null);
      setVerifNotes('');
      await fetchAllData();
    } catch (err) {
      alert(err.message || 'Verification submission failed');
    } finally {
      setSubmittingVerif(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header & Live Location Beacon */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold tracking-wider uppercase">
                FIELD WORKER DISPATCH PORTAL
              </span>
              <span className="text-xs text-slate-400">On-Site Execution</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Field Operations &amp; Verifications
            </h1>
            <p className="text-xs text-slate-400">
              Assigned Specialist: <strong className="text-white">{user?.full_name || 'Worker'}</strong> &bull; Ward Operations
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* GPS Beacon Status Badge (Section 17) */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${gpsStatus.includes('Active') ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-slate-300 font-semibold">{gpsStatus}</span>
            </div>

            <button
              onClick={fetchAllData}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Operational Tabs: Work Orders vs Evidence Verifications */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('WORK_ORDERS')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'WORK_ORDERS'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hammer className="w-4 h-4" />
            <span>Assigned Work Orders ({tasks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('VERIFICATIONS')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'VERIFICATIONS'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Site Verifications ({verifications.length})</span>
          </button>
        </div>

        {/* TAB 1: Assigned Work Orders Queue */}
        {activeTab === 'WORK_ORDERS' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-16 text-slate-500 font-mono text-sm">
                Retrieving assigned work orders...
              </div>
            ) : tasks.length === 0 ? (
              <div className="bg-[#0B1528] border border-slate-800 p-12 text-center rounded-2xl text-slate-400">
                <Hammer className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Active Work Assigned</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You have completed all pending physical repairs in your assigned municipal queue. New dispatches will appear here.
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-[#0B1528] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-base font-bold text-sky-400">{task.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        task.priority === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                        task.priority === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-sky-950 text-sky-300 border border-sky-800'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Ward {task.ward_number}</span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono self-start sm:self-auto ${
                      task.status === 'IN_PROGRESS'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : task.status === 'WORK_COMPLETED'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-900 text-slate-300 border border-slate-700'
                    }`}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white mb-1">{task.category}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">"{task.description}"</p>

                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-mono flex items-center space-x-2 text-slate-300">
                      <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{task.address || 'Municipal Location'}</span>
                    </div>
                  </div>

                  {/* Citizen Evidence Media Preview */}
                  {task.media && task.media.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Citizen Defect Photos ({task.media.length}):
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {task.media.map((m, i) => (
                          <div key={i} className="aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                            {m.media_type === 'video' ? (
                              <video src={m.file_url} controls className="w-full h-full object-cover" />
                            ) : (
                              <img src={m.file_url} alt="Defect" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Work Notes Input & Status Transitions (Section 12 & 13) */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    {task.status !== 'WORK_COMPLETED' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Work Execution Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={actingTicket === task.id ? workNotes : ''}
                          onChange={(e) => {
                            setActingTicket(task.id);
                            setWorkNotes(e.target.value);
                          }}
                          placeholder="e.g. Cleared debris, applied 50mm bitumen patch..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500">
                        {task.status === 'ASSIGNED' && 'Step 1: Mobilize team to start work.'}
                        {task.status === 'IN_PROGRESS' && 'Step 2: Complete repairs and submit for officer sign-off.'}
                        {task.status === 'WORK_COMPLETED' && 'Awaiting Officer physical verification.'}
                      </div>

                      <div className="flex items-center space-x-2">
                        {task.status === 'ASSIGNED' && (
                          <button
                            onClick={() => handleStartWork(task.id)}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-sm"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Start Work</span>
                          </button>
                        )}

                        {task.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleCompleteWork(task.id)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Completed</span>
                          </button>
                        )}

                        {task.status === 'WORK_COMPLETED' && (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-semibold flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Submitted to Officer</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Site Verification Tasks (Additional Module) */}
        {activeTab === 'VERIFICATIONS' && (
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-16 text-slate-500 font-mono text-sm">
                Retrieving verification tasks...
              </div>
            ) : verifications.length === 0 ? (
              <div className="bg-[#0B1528] border border-slate-800 p-12 text-center rounded-2xl text-slate-400">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Verification Tasks Pending</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When a Municipal Officer forwards a citizen evidence report for on-site inspection, it will appear here.
                </p>
              </div>
            ) : (
              verifications.map((v) => (
                <div
                  key={v.id}
                  className="bg-[#0B1528] border border-purple-900/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-base font-bold text-purple-400">{v.public_report_id}</span>
                      {v.related_ticket_number && (
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-xs border border-slate-700">
                          {v.related_ticket_number}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">
                        {v.report_type}
                      </span>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono bg-purple-950 text-purple-300 border border-purple-800">
                      {v.status}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-300 mb-1">Citizen Observation:</div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">"{v.description}"</p>

                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                      <div className="flex items-center space-x-2 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{v.location_name}</span>
                      </div>
                      <div className="text-purple-300 pt-1 border-t border-slate-800">
                        <strong>Officer Instruction:</strong> {v.officer_instruction || 'Inspect site conditions and report back.'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedVerif(v);
                        setVerifNotes('Inspected site. Confirmed road repair completed according to standards.');
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Submit On-Site Findings</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Field Verification Submission Modal */}
      {selectedVerif && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-purple-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <HardHat className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Log Site Verification Findings</h3>
              </div>
              <button onClick={() => setSelectedVerif(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitVerification} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                <div>Report: <strong className="text-purple-400">{selectedVerif.public_report_id}</strong></div>
                {selectedVerif.related_ticket_number && (
                  <div>Linked Ticket: <strong>{selectedVerif.related_ticket_number}</strong></div>
                )}
                <div>Location: {selectedVerif.location_name}</div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  On-Site Inspection Findings / Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={verifNotes}
                  onChange={(e) => setVerifNotes(e.target.value)}
                  placeholder="Detail whether defect still exists, materials used, or further municipal action required..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVerif(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVerif}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-wider"
                >
                  {submittingVerif ? 'Submitting...' : 'Send Findings to Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
