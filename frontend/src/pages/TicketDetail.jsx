import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, MapPin, Calendar, Clock, AlertTriangle, ArrowLeft,
  CheckCircle2, Hammer, User, Layers, Sparkles, ChevronRight
} from 'lucide-react';
import MapComponent from '../components/MapComponent';
import { apiRequest } from '../api/client';

export default function TicketDetail() {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDetail() {
      setLoading(true);
      setError(null);
      try {
        // ID could be numeric ID or Ticket string like UG-1001
        let res;
        if (id.startsWith('UG-') || id.startsWith('ug-')) {
          res = await apiRequest(`/complaints/ticket/${id.toUpperCase()}`);
        } else {
          res = await apiRequest(`/complaints/${id}`);
        }
        setComplaint(res);
      } catch (err) {
        setError(err.message || 'Grievance ticket not found');
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070D18] flex items-center justify-center text-slate-400 font-mono text-sm">
        Retrieving municipal ticket records...
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="min-h-screen bg-[#070D18] py-16 px-4 text-center">
        <div className="max-w-md mx-auto civic-card p-8 rounded-2xl">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Ticket Not Found</h2>
          <p className="text-xs text-slate-400 mb-6">{error || 'Invalid ticket identifier'}</p>
          <Link
            to="/citizen/my-reports"
            className="px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs"
          >
            Browse Active Grievances
          </Link>
        </div>
      </div>
    );
  }

  const markers = [
    {
      lat: complaint.latitude,
      lng: complaint.longitude,
      color: '#0066FF',
      pulse: true,
      popup: `Master Ticket: ${complaint.ticket_number} (${complaint.category})`
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

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/citizen/my-reports"
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Reports</span>
          </Link>

          <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
            Ward {complaint.ward_number} &bull; {complaint.city}
          </span>
        </div>

        {/* Master Ticket Header Card */}
        <div className="civic-card p-6 sm:p-8 rounded-2xl mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2.5 mb-1.5">
                <span className="font-mono text-2xl font-black text-sky-400">
                  {complaint.ticket_number}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  complaint.priority === 'CRITICAL' ? 'badge-critical' :
                  complaint.priority === 'HIGH' ? 'badge-high' :
                  complaint.priority === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                }`}>
                  {complaint.priority} PRIORITY
                </span>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-200">
                  {complaint.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {complaint.title || complaint.category}
              </h1>
            </div>

            {/* Citations Count */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">Citizen Reports:</span>
              <span className="text-lg font-bold text-sky-400 font-mono">
                {complaint.report_count} {complaint.report_count === 1 ? 'Report' : 'Reports Merged'}
              </span>
              {complaint.supporting_report_count > 0 && (
                <span className="text-[10px] text-purple-400 font-mono">
                  {complaint.supporting_report_count} within 50m radius
                </span>
              )}
            </div>
          </div>

          {/* Description & Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Citizen Grievance Description
              </div>
              <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                {complaint.description}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Verified Civic Location
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs font-mono text-slate-300">
                  <div className="flex items-center space-x-1.5 mb-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>{complaint.address || 'Tamil Nadu Roadway'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Coordinates: ({complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)})
                  </div>
                </div>
              </div>

              {complaint.assigned_worker && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-amber-300">
                    <Hammer className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold">Dispatched Worker: {complaint.assigned_worker.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{complaint.assigned_worker.specialization}</span>
                </div>
              )}
            </div>
          </div>

          {/* Media Evidence Gallery */}
          {complaint.media && complaint.media.length > 0 && (
            <div className="mb-6">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Photographic Evidence ({complaint.media.length})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {complaint.media.map((m, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-44 group relative">
                    {m.media_type === 'video' ? (
                      <video src={m.file_url} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={m.file_url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/80 p-1.5 text-[10px] font-mono text-slate-300 truncate">
                      {m.file_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 50m Spatial Proximity Map */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-bold uppercase tracking-wider">
                Geospatial 50m Deduplication Perimeter
              </span>
              <span className="text-sky-400 font-mono">
                Blue = Master Ticket &bull; Purple = Supporting Reports within 50m
              </span>
            </div>
            <MapComponent
              center={[complaint.latitude, complaint.longitude]}
              zoom={15}
              style={{ height: '300px', width: '100%' }}
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

        {/* Realtime Public Status Timeline */}
        <div className="civic-card p-6 sm:p-8 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Public Status Timeline</h2>
              <p className="text-xs text-slate-400">
                Transparent cryptographic timestamps directly from PostgreSQL database audit trail
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-[10px] font-mono text-emerald-400">
              AUDITED TIMELINE
            </span>
          </div>

          <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
            {complaint.timeline && complaint.timeline.length > 0 ? (
              complaint.timeline.map((event, idx) => (
                <div key={idx} className="relative flex items-start space-x-4 pl-1">
                  <div className="w-6 h-6 rounded-full bg-sky-950 border-2 border-sky-400 flex items-center justify-center shrink-0 z-10 shadow-md shadow-sky-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-300"></div>
                  </div>
                  <div className="flex-1 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                        {event.event_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 leading-relaxed">
                      {event.description}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2 font-mono flex items-center space-x-2">
                      <span>Actor: <strong className="text-slate-400">{event.actor_name}</strong></span>
                      <span>&bull;</span>
                      <span>Role: <strong className="text-slate-400">{event.actor_role}</strong></span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-6">
                No timeline events recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
