import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, MapPin, AlertTriangle, ArrowRight, RefreshCw,
  Sliders, ShieldCheck, CheckCircle2, Clock
} from 'lucide-react';
import { apiRequest } from '../api/client';

export default function OfficerComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [category, setCategory] = useState('');
  const [ward, setWard] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (priority) params.append('priority', priority);
      if (statusFilter) params.append('status', statusFilter);
      if (category) params.append('category', category);
      if (ward) params.append('ward_number', ward);

      const res = await apiRequest(`/complaints?${params.toString()}`);
      setComplaints(res || []);
    } catch (err) {
      console.error("Failed to load complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [priority, statusFilter, category, ward]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'RESOLVED': return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
      case 'WORK_COMPLETED': return 'bg-purple-950/60 text-purple-300 border-purple-800';
      case 'IN_PROGRESS': return 'bg-sky-950/60 text-sky-400 border-sky-800';
      default: return 'bg-amber-950/60 text-amber-400 border-amber-800';
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Municipal Grievance Operations Queue
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Active tickets with multi-signal deduplication records and field worker dispatch controls
            </p>
          </div>

          <button
            onClick={fetchComplaints}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Search & Filters Row */}
        <div className="civic-card p-4 rounded-xl mb-6 shadow-md">
          <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search ticket number (e.g. UG-1001), defect description, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WORK_COMPLETED">Awaiting Verification</option>
                <option value="RESOLVED">Resolved</option>
              </select>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="">All Categories</option>
                <option value="Pothole">Pothole</option>
                <option value="Garbage Overflow">Garbage</option>
                <option value="Water Leakage">Water Leakage</option>
                <option value="Broken Streetlight">Streetlight</option>
                <option value="Drainage">Drainage</option>
                <option value="Road Damage">Road Damage</option>
              </select>

              <select
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
              >
                <option value="">All Wards</option>
                <option value="12">Ward 12 (Royapuram)</option>
                <option value="114">Ward 114 (Anna Nagar)</option>
                <option value="124">Ward 124 (Mylapore)</option>
                <option value="32">Ward 32 (Tambaram)</option>
                <option value="7">Ward 7 (Ramanathapuram)</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-colors shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        {/* Complaints Grid Cards */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-mono text-sm">
            Retrieving municipal complaints...
          </div>
        ) : complaints.length === 0 ? (
          <div className="civic-card p-12 text-center rounded-2xl">
            <h3 className="text-base font-bold text-white mb-1">No complaints found</h3>
            <p className="text-xs text-slate-400">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {complaints.map((c) => (
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(c.status)}`}>
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
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono mb-4 space-y-1.5">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">Citizen Reports:</span>
                      <span className="text-sky-400 font-bold">{c.report_count}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">Duplicates (within 50m):</span>
                      <span className="text-purple-400 font-bold">{c.supporting_report_count}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 truncate">
                      <span className="text-slate-500">Location:</span>
                      <span className="text-slate-300 truncate">{c.city} &bull; Ward {c.ward_number}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Link
                      to={`/admin/complaint/${c.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center space-x-1 transition-colors"
                    >
                      <span>VIEW COMPLAINT</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
