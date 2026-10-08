import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sliders, AlertTriangle, CheckCircle2, Clock, Users, MapPin,
  TrendingUp, Shield, Activity, RefreshCw, ArrowRight, Layers,
  Compass, Eye, SlidersHorizontal
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wardFilter, setWardFilter] = useState('');

  const fetchMetrics = async () => {
    try {
      const url = wardFilter ? `/officer/dashboard?ward_number=${wardFilter}` : '/officer/dashboard';
      const data = await apiRequest(url);
      setMetrics(data);
    } catch (err) {
      console.error("Dashboard metrics failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [wardFilter]);

  const kpis = metrics?.kpis || {
    total_complaints: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    new_today: 0,
    duplicate_reports: 0,
    in_progress: 0,
    awaiting_verification: 0,
    resolved: 0
  };

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-blue-950 text-sky-400 border border-blue-800 text-[10px] font-bold tracking-wider uppercase">
                MUNICIPAL OPERATIONS COMMAND
              </span>
              <span className="text-xs text-slate-400">Tamil Nadu Urban Admin</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Ward Officer Operations Center
            </h1>
            <p className="text-xs text-slate-400">
              Live automated grievance dispatch &bull; Active Deduplication: <strong className="text-sky-400">50m Spatial Radius</strong>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">All Municipal Wards</option>
              <option value="12">Ward 12 (Royapuram - Zone 5)</option>
              <option value="114">Ward 114 (Anna Nagar - Zone 8)</option>
              <option value="124">Ward 124 (Mylapore - Zone 9)</option>
              <option value="32">Ward 32 (Tambaram Sanatorium)</option>
              <option value="7">Ward 7 (Ramanathapuram Kenikarai)</option>
            </select>

            <button
              onClick={fetchMetrics}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              title="Refresh Real-time KPIs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 23 Top Real Database KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-8">
          <div className="civic-card p-4 rounded-xl border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1">Total Complaints</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">{kpis.total_complaints}</div>
            <div className="text-[10px] text-slate-500 mt-1">All registered grievances</div>
          </div>

          <div className="civic-card p-4 rounded-xl border-red-900/40 bg-red-950/20">
            <div className="text-xs text-red-300 font-semibold mb-1">Critical Urgency</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-red-400">{kpis.critical}</div>
            <div className="text-[10px] text-red-300/70 mt-1">High citizen hazard</div>
          </div>

          <div className="civic-card p-4 rounded-xl border-amber-900/40 bg-amber-950/20">
            <div className="text-xs text-amber-300 font-semibold mb-1">High Priority</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">{kpis.high}</div>
            <div className="text-[10px] text-amber-300/70 mt-1">Escalated reports</div>
          </div>

          <div className="civic-card p-4 rounded-xl border-purple-900/40 bg-purple-950/20">
            <div className="text-xs text-purple-300 font-semibold mb-1">Duplicate Merged</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-400">{kpis.duplicate_reports}</div>
            <div className="text-[10px] text-purple-300/70 mt-1">Within 50m radius</div>
          </div>

          <div className="civic-card p-4 rounded-xl border-emerald-900/40 bg-emerald-950/20">
            <div className="text-xs text-emerald-300 font-semibold mb-1">Awaiting Verification</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">{kpis.awaiting_verification}</div>
            <div className="text-[10px] text-emerald-300/70 mt-1">Work done by worker</div>
          </div>

          <div className="civic-card p-4 rounded-xl border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1">Medium Priority</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-yellow-400">{kpis.medium}</div>
            <div className="text-[10px] text-slate-500 mt-1">Standard repair queue</div>
          </div>

          <div className="civic-card p-4 rounded-xl border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1">Low Priority</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-400">{kpis.low}</div>
            <div className="text-[10px] text-slate-500 mt-1">Minor maintenance</div>
          </div>

          <div className="civic-card p-4 rounded-xl border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1">New Today</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-400">{kpis.new_today}</div>
            <div className="text-[10px] text-slate-500 mt-1">Received past 24 hrs</div>
          </div>

          <div className="civic-card p-4 rounded-xl border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1">In Progress</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-400">{kpis.in_progress}</div>
            <div className="text-[10px] text-slate-500 mt-1">Worker active on site</div>
          </div>

          <div className="civic-card p-4 rounded-xl border-slate-800">
            <div className="text-xs text-slate-400 font-semibold mb-1">Resolved</div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">{kpis.resolved}</div>
            <div className="text-[10px] text-slate-500 mt-1">Officer verified & closed</div>
          </div>
        </div>

        {/* Operational Quick Nav Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Link
            to="/admin/complaints"
            className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-semibold flex items-center justify-between text-slate-200 transition-colors"
          >
            <span>All Grievances Queue</span>
            <ArrowRight className="w-4 h-4 text-sky-400" />
          </Link>

          <Link
            to="/admin/settings"
            className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-semibold flex items-center justify-between text-slate-200 transition-colors"
          >
            <span>Configure 50m Radius</span>
            <SlidersHorizontal className="w-4 h-4 text-sky-400" />
          </Link>

          <Link
            to="/admin/workers"
            className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-semibold flex items-center justify-between text-slate-200 transition-colors"
          >
            <span>Field Workers Management</span>
            <Users className="w-4 h-4 text-sky-400" />
          </Link>

          <Link
            to="/admin/telemetry"
            className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500 text-xs font-semibold flex items-center justify-between text-slate-200 transition-colors"
          >
            <span>AI Telemetry Logs</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </Link>
        </div>

        {/* Grievance Queue & Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Grievances Requiring Action */}
          <div className="lg:col-span-2 civic-card p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Priority Action Queue</span>
              </h2>
              <Link to="/admin/complaints" className="text-xs text-sky-400 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {(metrics?.recent_critical || []).length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center font-mono">
                  No active critical issues currently pending
                </div>
              ) : (
                metrics.recent_critical.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-sky-400">{c.ticket_number}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.priority === 'CRITICAL' ? 'badge-critical' :
                          c.priority === 'HIGH' ? 'badge-high' : 'badge-medium'
                        }`}>
                          {c.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Ward {c.ward_number}</span>
                      </div>
                      <div className="text-xs font-bold text-white mt-1">{c.category}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {c.report_count} {c.report_count === 1 ? 'Report' : 'Reports Merged'} &bull; Status: {c.status}
                      </div>
                    </div>

                    <Link
                      to={`/admin/complaint/${c.id}`}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center space-x-1 shrink-0 transition-colors"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Category Distribution Breakdown */}
          <div className="civic-card p-6 rounded-2xl shadow-xl">
            <h2 className="text-base font-bold text-white mb-4 pb-3 border-b border-slate-800">
              Grievance Categories
            </h2>

            <div className="space-y-3 font-mono text-xs">
              {Object.entries(metrics?.category_distribution || {}).map(([cat, count]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>{cat}</span>
                    <span className="font-bold text-sky-400">{count}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (count / (kpis.total_complaints || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
