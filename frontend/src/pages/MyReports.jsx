import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, MapPin, Clock, AlertTriangle, ArrowRight, CheckCircle2,
  Calendar, Layers, Filter, Search
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MyReports() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    async function loadReports() {
      try {
        // If logged in, fetch user's reports; otherwise fetch public recent reports
        const endpoint = user ? '/complaints/my-reports' : '/complaints?limit=20';
        const res = await apiRequest(endpoint);
        setComplaints(res || []);
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [user]);

  const filtered = complaints.filter(c => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') return c.status !== 'RESOLVED' && c.status !== 'REJECTED';
    if (filterStatus === 'RESOLVED') return c.status === 'RESOLVED';
    return true;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED': return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
      case 'WORK_COMPLETED': return 'bg-purple-950/60 text-purple-300 border-purple-800';
      case 'IN_PROGRESS': return 'bg-sky-950/60 text-sky-400 border-sky-800';
      default: return 'bg-amber-950/60 text-amber-400 border-amber-800';
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {user ? 'My Reported Grievances' : 'Active Public Civic Reports'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Live status tracking with autonomous 50m deduplication citations
            </p>
          </div>

          <Link
            to="/citizen/report"
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center space-x-2 transition-colors shadow-lg shadow-sky-600/30"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Report New Issue</span>
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 mb-6 text-xs">
          {['ALL', 'ACTIVE', 'RESOLVED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg border font-semibold transition-colors ${
                filterStatus === f
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {f === 'ALL' ? 'All Grievances' : f}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16 text-slate-500 font-mono text-sm">
            Loading municipal reports...
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="civic-card p-12 text-center rounded-2xl">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No reports found</h3>
            <p className="text-xs text-slate-400 mb-6">
              You haven't filed any complaints matching this filter.
            </p>
            <Link
              to="/citizen/report"
              className="px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs"
            >
              Submit First Report
            </Link>
          </div>
        )}

        {/* Complaints Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="civic-card p-5 rounded-2xl flex flex-col justify-between hover:border-sky-500/60 transition-all shadow-md group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-mono font-bold text-sky-400 text-sm tracking-wider">
                    {c.ticket_number}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(c.priority)}`}>
                      {c.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(c.status)}`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1 group-hover:text-sky-300 transition-colors line-clamp-1">
                  {c.category}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 mb-4 space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{c.address || `Ward ${c.ward_number}, ${c.city}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-sky-400 font-bold">
                      {c.report_count} {c.report_count === 1 ? 'Citizen Report' : 'Citizen Reports'}
                    </span>
                    {c.supporting_report_count > 0 && (
                      <span className="text-purple-400">
                        ({c.supporting_report_count} within 50m)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/citizen/ticket/${c.ticket_number}`}
                    className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center space-x-1"
                  >
                    <span>View Timeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
