import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sliders, AlertTriangle, CheckCircle2, Clock, Users, MapPin,
  TrendingUp, Shield, Activity, RefreshCw, ArrowRight, Layers,
  Compass, Eye, SlidersHorizontal, QrCode, Copy, ExternalLink,
  Check, FileText, HardHat, Building2, Sparkles
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MapComponent from '../components/MapComponent';

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [priorityComplaints, setPriorityComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wardFilter, setWardFilter] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const citizenPortalUrl = `${window.location.origin}/citizen`;

  const fetchDashboardData = async () => {
    try {
      const summaryUrl = wardFilter ? `/officer/summary?ward_number=${wardFilter}` : '/officer/summary';
      const complaintsUrl = wardFilter
        ? `/complaints/paginated?ward_number=${wardFilter}&limit=6`
        : '/complaints/paginated?limit=6';

      // Concurrent fetch for maximum speed
      const [sumData, compData] = await Promise.all([
        apiRequest(summaryUrl),
        apiRequest(complaintsUrl)
      ]);

      setSummary(sumData);
      setPriorityComplaints(compData?.items || []);
    } catch (err) {
      console.error('Officer dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 12000);
    return () => clearInterval(interval);
  }, [wardFilter]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(citizenPortalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Operational Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-blue-950 text-sky-400 border border-blue-800 text-[10px] font-bold tracking-wider uppercase">
                MUNICIPAL OPERATIONS COMMAND
              </span>
              <span className="text-xs text-slate-400">Tamil Nadu Urban Administration</span>
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
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            >
              <option value="">All Municipal Wards</option>
              <option value="12">Ward 12 (Royapuram - Zone 5)</option>
              <option value="114">Ward 114 (Anna Nagar - Zone 8)</option>
              <option value="124">Ward 124 (Mylapore - Zone 9)</option>
              <option value="32">Ward 32 (Tambaram Sanatorium)</option>
              <option value="7">Ward 7 (Ramanathapuram Kenikarai)</option>
            </select>

            <button
              onClick={fetchDashboardData}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              title="Refresh Real-time KPIs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 24: Citizen Portal Link / QR Destination Bar */}
        <div className="bg-[#0B1528] border border-sky-800/60 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/80 flex items-center justify-center text-sky-400 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Citizen Portal Link (QR Destination)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  PUBLIC ENTRY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Share this official URL for public grievance submission and tracking without exposing officer credentials.
              </p>
              <div className="font-mono text-xs text-sky-300 mt-1 truncate max-w-xl">
                {citizenPortalUrl}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button
              onClick={handleCopyLink}
              className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'COPIED' : 'COPY LINK'}</span>
            </button>

            <a
              href={citizenPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1 transition-colors"
            >
              <span>OPEN</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Section 39: Prioritized Situation KPI Cards */}
        {loading && !summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Critical Urgency */}
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/50">
              <div className="text-xs text-red-300 font-semibold mb-1 flex items-center justify-between">
                <span>Critical / High</span>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-red-400">
                {summary?.critical_high || 0}
              </div>
              <div className="text-[10px] text-red-300/70 mt-1">Immediate hazard remediation</div>
            </div>

            {/* 2. New Today */}
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-900/50">
              <div className="text-xs text-cyan-300 font-semibold mb-1 flex items-center justify-between">
                <span>New Today</span>
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-400">
                {summary?.new_today || 0}
              </div>
              <div className="text-[10px] text-cyan-300/70 mt-1">Logged past 24 hours</div>
            </div>

            {/* 3. Active Unresolved */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-between">
                <span>Active Issues</span>
                <Activity className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
                {summary?.active_issues || 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Total pending resolution</div>
            </div>

            {/* 4. Pending Officer Verification */}
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/50">
              <div className="text-xs text-amber-300 font-semibold mb-1 flex items-center justify-between">
                <span>Awaiting Verification</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">
                {summary?.awaiting_verification || 0}
              </div>
              <div className="text-[10px] text-amber-300/70 mt-1">Work completed by worker</div>
            </div>

            {/* 5. Active Field Workers */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/50">
              <div className="text-xs text-blue-300 font-semibold mb-1 flex items-center justify-between">
                <span>Available Workers</span>
                <HardHat className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-400">
                {summary?.available_workers || 0} / {summary?.total_workers || 0}
              </div>
              <div className="text-[10px] text-blue-300/70 mt-1">Ready for site dispatch</div>
            </div>
          </div>
        )}

        {/* Operational Fast Navigation Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/admin/complaints"
            className="p-3.5 rounded-xl bg-[#0B1528] border border-slate-800 hover:border-sky-500 text-xs font-semibold flex items-center justify-between text-slate-200 transition-colors shadow-md"
          >
            <span>All Grievances Queue</span>
            <ArrowRight className="w-4 h-4 text-sky-400" />
          </Link>

          <Link
            to="/admin/reports"
            className="p-3.5 rounded-xl bg-[#0B1528] border border-slate-800 hover:border-blue-500 text-xs font-semibold flex items-center justify-between text-slate-200 transition-colors shadow-md"
          >
            <div className="flex items-center space-x-1.5">
              <span>Citizen Evidence Reports</span>
              {summary?.pending_evidence_reports > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              )}
            </div>
            <FileText className="w-4 h-4 text-blue-400" />
          </Link>

          <Link
            to="/admin/workers"
            className="p-3.5 rounded-xl bg-[#0B1528] border border-slate-800 hover:border-amber-500 text-xs font-semibold flex items-center justify-between text-slate-200 transition-colors shadow-md"
          >
            <span>Field Crews &amp; Workers</span>
            <Users className="w-4 h-4 text-amber-400" />
          </Link>

          <Link
            to="/admin/settings"
            className="p-3.5 rounded-xl bg-[#0B1528] border border-slate-800 hover:border-purple-500 text-xs font-semibold flex items-center justify-between text-slate-200 transition-colors shadow-md"
          >
            <span>50m Deduplication Rules</span>
            <SlidersHorizontal className="w-4 h-4 text-purple-400" />
          </Link>
        </div>

        {/* Priority Action Queue & Live Operations Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Grievances Requiring Action */}
          <div className="lg:col-span-2 bg-[#0B1528] border border-slate-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Priority Action Queue</span>
              </h2>
              <Link to="/admin/complaints" className="text-xs text-sky-400 hover:underline">
                View All Complaints &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {priorityComplaints.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center font-mono">
                  No grievances pending in priority action queue
                </div>
              ) : (
                priorityComplaints.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-sky-400">{c.ticket_number}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.priority === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                          c.priority === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-sky-950 text-sky-300 border border-sky-800'
                        }`}>
                          {c.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Ward {c.ward_number}</span>
                      </div>
                      <div className="text-xs font-bold text-white mt-1">{c.category}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {c.report_count} {c.report_count === 1 ? 'Report' : 'Reports Merged within 50m'} &bull; Status: {c.status}
                      </div>
                    </div>

                    <Link
                      to={`/admin/complaint/${c.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 shrink-0 transition-colors uppercase tracking-wider"
                    >
                      <span>Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Stats Summary Card */}
          <div className="bg-[#0B1528] border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white mb-4 pb-3 border-b border-slate-800 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Geospatial Operations</span>
              </h2>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Active Proximity Perimeter</div>
                  <div className="text-base font-bold text-sky-400 mt-0.5">50 Meters Radius</div>
                  <div className="text-[10px] text-slate-500 mt-1">Autonomous PostGIS ST_DWithin clustering</div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Citizen Evidence Reports</div>
                  <div className="text-base font-bold text-blue-400 mt-0.5">{summary?.total_evidence_reports || 0} Total Logged</div>
                  <div className="text-[10px] text-slate-500 mt-1">{summary?.pending_evidence_reports || 0} awaiting officer review</div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Total Grievances In DB</div>
                  <div className="text-base font-bold text-white mt-0.5">{summary?.total_complaints || 0} Registered</div>
                  <div className="text-[10px] text-emerald-400 mt-1">{summary?.resolved_complaints || 0} officially resolved</div>
                </div>
              </div>
            </div>

            <Link
              to="/admin/reports"
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>MANAGE EVIDENCE REPORTS</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
