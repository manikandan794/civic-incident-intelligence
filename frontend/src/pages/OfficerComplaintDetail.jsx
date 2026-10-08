import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ShieldCheck, MapPin, Calendar, Clock, AlertTriangle,
  ArrowLeft, CheckCircle2, Hammer, User, Layers, Sparkles, Send,
  RefreshCw, Check, FileText, ArrowRight
} from 'lucide-react';
import MapComponent from '../components/MapComponent';
import { apiRequest, getMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function OfficerComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Verification state
  const [verifyNotes, setVerifyNotes] = useState('Physical repairs inspected and verified on site in accordance with municipal standards.');
  const [verifying, setVerifying] = useState(false);

  const [evidenceReports, setEvidenceReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);

  const loadData = async () => {
    try {
      const comp = await apiRequest(`/complaints/${id}`);
      setComplaint(comp);

      // Load workers in this ward
      const wList = await apiRequest(`/workers?ward_number=${comp.ward_number}`);
      setWorkers(wList || []);
      if (comp.assigned_worker_id) {
        setSelectedWorkerId(comp.assigned_worker_id.toString());
      }

      // Load related citizen evidence reports (Section 33)
      try {
        const evList = await apiRequest(`/complaints/${id}/evidence-reports`);
        setEvidenceReports(evList || []);
      } catch (err) {
        // quiet
      }
    } catch (err) {
      console.error("Failed to load complaint details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAssignWorker = async (e) => {
    e.preventDefault();
    if (!selectedWorkerId) return;
    setAssigning(true);
    setActionSuccess(null);
    try {
      await apiRequest(`/officer/complaints/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          worker_id: parseInt(selectedWorkerId),
          notes: assignNotes || "Urgent site remediation assigned."
        })
      });
      setActionSuccess("Field worker successfully assigned and notified.");
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to assign worker");
    } finally {
      setAssigning(false);
    }
  };

  const handleVerifyAndResolve = async () => {
    setVerifying(true);
    setActionSuccess(null);
    try {
      await apiRequest(`/officer/complaints/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          verification_notes: verifyNotes,
          is_approved: true
        })
      });
      setActionSuccess("Grievance officially inspected, verified and resolved.");
      await loadData();
    } catch (err) {
      alert(err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070D18] flex items-center justify-center text-slate-400 font-mono text-sm">
        Loading complaint audit files...
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-[#070D18] py-16 text-center text-white">
        Complaint record not found.
      </div>
    );
  }

  // Markers for Leaflet
  const markers = [
    {
      lat: complaint.latitude,
      lng: complaint.longitude,
      color: '#0066FF',
      pulse: true,
      popup: `Master Grievance: ${complaint.ticket_number} (${complaint.category})`
    },
    ...(complaint.reports || [])
      .filter(r => !r.is_master_report)
      .map(r => ({
        lat: r.latitude,
        lng: r.longitude,
        color: '#A855F7',
        pulse: false,
        popup: `Supporting Report (Merged within 50m): ${r.distance_to_master_meters.toFixed(1)}m away`
      }))
  ];

  const ai = complaint.ai_analyses?.[0] || null;

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/admin/complaints"
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Operations Queue</span>
          </Link>

          <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Ward {complaint.ward_number} &bull; {complaint.city}
          </span>
        </div>

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-600 text-emerald-200 text-xs mb-6 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Master Header Card */}
        <div className="civic-card p-6 sm:p-8 rounded-2xl mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-3 mb-1.5">
                <span className="font-mono text-2xl font-black text-sky-400">
                  {complaint.ticket_number}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  complaint.priority === 'CRITICAL' ? 'badge-critical' :
                  complaint.priority === 'HIGH' ? 'badge-high' :
                  complaint.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                }`}>
                  {complaint.priority}
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-200">
                  {complaint.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {complaint.title || complaint.category}
              </h1>
            </div>

            {/* Deduplication Summary Metrics */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Total Supporting Citations:</span>
              <span className="text-lg font-bold text-sky-400">
                {complaint.report_count} Reports
              </span>
              <span className="text-[10px] text-purple-400">
                {complaint.supporting_report_count} merged within 50m radius
              </span>
            </div>
          </div>

          {/* OFFICER VERIFICATION BAR (Section 30) */}
          {complaint.status === 'WORK_COMPLETED' && (
            <div className="p-4 rounded-xl bg-purple-950/50 border border-purple-500/60 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <span>WORK COMPLETED — AWAITING OFFICER VERIFICATION</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Field worker has completed physical repairs on site. Municipal protocol requires Officer inspection before closing.
                </p>
              </div>

              <button
                onClick={handleVerifyAndResolve}
                disabled={verifying}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{verifying ? 'Verifying...' : '[ VERIFY & RESOLVE ]'}</span>
              </button>
            </div>
          )}

          {/* Operational Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Left 2 Cols: Details & Evidence */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Citizen Defect Description
                </div>
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-200 leading-relaxed">
                  {complaint.description}
                </div>
              </div>

              {/* AI Multimodal Analysis Card (Section 13) */}
              {ai && (
                <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-800/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-sky-400 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Gemini Multimodal Vision AI Verification</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {ai.provider} &bull; {ai.latency_ms}ms
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 font-mono text-center text-xs">
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Detected Category</div>
                      <div className="font-bold text-white text-[11px] truncate">{ai.category_detected}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Severity Assessment</div>
                      <div className="font-bold text-amber-400 text-[11px]">{ai.severity_detected}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Confidence Metric</div>
                      <div className="font-bold text-emerald-400 text-[11px]">{(ai.confidence * 100).toFixed(0)}%</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-500">Execution Mode</div>
                      <div className="font-bold text-sky-400 text-[11px]">{ai.is_fallback ? 'Fallback' : 'Live API'}</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                    <strong className="text-slate-400">Visual Summary:</strong> {ai.summary}
                  </p>
                  {ai.safety_impact && (
                    <p className="text-xs text-red-300 leading-relaxed">
                      <strong className="text-red-400">Safety Impact:</strong> {ai.safety_impact}
                    </p>
                  )}
                </div>
              )}

              {/* Photos Gallery */}
              {complaint.media && complaint.media.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Evidence Media ({complaint.media.length})
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {complaint.media.map((m, i) => (
                      <div key={i} className="h-40 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        {m.media_type === 'video' ? (
                          <video src={getMediaUrl(m.file_url)} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={getMediaUrl(m.file_url)} alt="Evidence" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Field Worker Dispatch & Location */}
            <div className="space-y-6">
              {/* Field Worker Dispatch Card */}
              <div className="civic-card p-5 rounded-xl border-slate-800">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
                  <Hammer className="w-4 h-4" />
                  <span>Field Crew Dispatch</span>
                </div>

                <form onSubmit={handleAssignWorker} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Assigned Field Worker (Ward {complaint.ward_number})
                    </label>
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Select Municipal Specialist...</option>
                      {workers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.specialization}) - {w.availability}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Dispatch Instructions / Special Notes
                    </label>
                    <textarea
                      rows={2}
                      value={assignNotes}
                      onChange={(e) => setAssignNotes(e.target.value)}
                      placeholder="e.g. Deploy cold-mix asphalt patch truck immediately..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={assigning || !selectedWorkerId}
                    className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{assigning ? 'Dispatching...' : 'DISPATCH WORK ORDER'}</span>
                  </button>
                </form>
              </div>

              {/* Location Summary */}
              <div className="civic-card p-5 rounded-xl border-slate-800 text-xs font-mono space-y-2">
                <div className="text-slate-400 font-bold uppercase tracking-wider">
                  Location Verified
                </div>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{complaint.address || 'Tamil Nadu Roadway'}</span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  Lat: {complaint.latitude.toFixed(5)}, Lng: {complaint.longitude.toFixed(5)}
                </div>
                <div className="text-sky-400 text-[11px]">
                  Active Radius Active at Decision: <strong>{complaint.active_duplicate_radius_meters || 50}m</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Map with 50m Circle */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Geospatial Operations Map &bull; 50-Meter Active Deduplication Perimeter
            </div>
            <MapComponent
              center={[complaint.latitude, complaint.longitude]}
              zoom={15}
              style={{ height: '320px', width: '100%' }}
              markers={markers}
              radiusCircle={{
                center: [complaint.latitude, complaint.longitude],
                radius: complaint.active_duplicate_radius_meters || 50,
                color: '#38BDF8',
                fillColor: '#0284C7'
              }}
            />
          </div>
        </div>

        {/* Supporting Reports Table (Section 17 & 25) */}
        {complaint.reports && complaint.reports.length > 1 && (
          <div className="civic-card p-6 rounded-2xl mb-8 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">
              Supporting Citizen Reports Merged ({complaint.reports.length - 1})
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Citizen reports within 50 meters merged into this master ticket to avoid duplicated work orders
            </p>

            <div className="space-y-3">
              {complaint.reports.filter(r => !r.is_master_report).map((rep, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-white mb-0.5">
                      Citizen: {rep.citizen_name}
                    </div>
                    <div className="text-slate-400 leading-relaxed">{rep.description}</div>
                  </div>
                  <div className="text-right shrink-0 font-mono">
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[11px] font-bold">
                      {rep.distance_to_master_meters.toFixed(1)}m away (&lt;= 50m)
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {new Date(rep.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 33: Related Citizen Evidence Reports */}
        <div className="civic-card p-6 rounded-2xl mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Related Citizen Evidence Reports ({evidenceReports.length})</span>
            </h2>
            <Link
              to="/admin/reports"
              className="text-xs text-sky-400 hover:underline flex items-center space-x-1"
            >
              <span>[ VIEW ALL REPORTS ]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Follow-up evidence, quality reports, and on-site observations submitted by citizens for ticket {complaint.ticket_number}
          </p>

          {evidenceReports.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-500 font-mono text-center">
              No follow-up evidence reports submitted for this ticket yet
            </div>
          ) : (
            <div className="space-y-3">
              {evidenceReports.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-mono font-bold text-sky-400">{ev.public_report_id}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold">
                        {ev.report_type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Status: {ev.status}</span>
                    </div>
                    <div className="text-slate-300 line-clamp-1">"{ev.description}"</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Reporter: {ev.citizen_name || 'Citizen'} &bull; {new Date(ev.created_at).toLocaleString()}
                    </div>
                  </div>

                  <Link
                    to={`/admin/reports?q=${ev.public_report_id}`}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 transition-colors"
                  >
                    Review Report
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="civic-card p-6 rounded-2xl shadow-xl">
          <h2 className="text-base font-bold text-white mb-4">Complete Audit Trail Timeline</h2>
          <div className="space-y-4">
            {(complaint.timeline || []).map((ev, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex justify-between items-start gap-4">
                <div>
                  <div className="font-bold text-white uppercase tracking-wider">{ev.event_type.replace(/_/g, ' ')}</div>
                  <div className="text-slate-300 mt-0.5 leading-relaxed">{ev.description}</div>
                  <div className="text-[10px] text-slate-500 mt-1">By: {ev.actor_name} ({ev.actor_role})</div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {new Date(ev.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
