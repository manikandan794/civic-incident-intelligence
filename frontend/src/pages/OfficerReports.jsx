import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText, Search, Filter, RefreshCw, Eye, CheckCircle2,
  AlertTriangle, Clock, MapPin, Camera, Video, ArrowRight,
  HardHat, User, Building2, Send, X, ExternalLink, ChevronRight,
  ShieldCheck, Check, Sparkles, MessageSquare
} from 'lucide-react';
import { apiRequest } from '../api/client';
import MapComponent from '../components/MapComponent';

export default function OfficerReports() {
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState({
    total: 0,
    new_received: 0,
    under_review: 0,
    action_required: 0,
    worker_verification: 0,
    resolved_closed: 0
  });

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [wardFilter, setWardFilter] = useState('');

  // Selected Detail Modal
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Forward to worker modal state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [wardWorkers, setWardWorkers] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [forwardInstruction, setForwardInstruction] = useState('Inspect site condition and verify if defects remain visible.');
  const [forwardPriority, setForwardPriority] = useState('HIGH');
  const [forwarding, setForwarding] = useState(false);

  // Resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('Grievance physical repairs verified and confirmed resolved on site.');
  const [resolving, setResolving] = useState(false);

  // Enlarged photo preview
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState(null);

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      const url = wardFilter ? `/evidence-reports/stats?ward_number=${wardFilter}` : '/evidence-reports/stats';
      const data = await apiRequest(url);
      if (data) setStats(data);
    } catch (err) {
      console.error('Failed to fetch evidence report stats:', err);
    }
  };

  // Fetch Paginated List
  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '12');
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (typeFilter && typeFilter !== 'ALL') params.append('report_type', typeFilter);
      if (wardFilter) params.append('ward_number', wardFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const data = await apiRequest(`/evidence-reports?${params.toString()}`);
      if (data) {
        setReports(data.items || []);
        setTotalPages(data.total_pages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to list evidence reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [wardFilter]);

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter, typeFilter, wardFilter]);

  // Handle Search submit / debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
  };

  // Load Report Details
  const handleOpenDetail = async (id) => {
    setSelectedReportId(id);
    setDetailLoading(true);
    setReportDetail(null);
    try {
      const data = await apiRequest(`/evidence-reports/${id}`);
      setReportDetail(data);

      // Load workers for forwarding
      const wList = await apiRequest(`/workers?ward_number=${data.ward_number || 12}`);
      setWardWorkers(wList || []);
      if (wList && wList.length > 0) {
        setSelectedWorkerId(wList[0].id.toString());
      }
    } catch (err) {
      alert(err.message || 'Failed to load report details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Officer Action: Update Status (Under Review / Action Required / Close)
  const handleUpdateStatus = async (action, newStatus) => {
    if (!selectedReportId) return;
    try {
      await apiRequest(`/evidence-reports/${selectedReportId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          status: newStatus,
          notes: `Officer updated report status to ${newStatus}`
        })
      });
      // Refresh detail & list
      await handleOpenDetail(selectedReportId);
      fetchStats();
      fetchReports();
    } catch (err) {
      alert(err.message || 'Status update failed');
    }
  };

  // Officer Action: Forward to Worker
  const handleForwardToWorker = async (e) => {
    e.preventDefault();
    if (!selectedWorkerId || !selectedReportId) return;
    setForwarding(true);
    try {
      await apiRequest(`/evidence-reports/${selectedReportId}/forward`, {
        method: 'POST',
        body: JSON.stringify({
          worker_id: parseInt(selectedWorkerId),
          instruction: forwardInstruction,
          priority: forwardPriority
        })
      });
      setShowForwardModal(false);
      await handleOpenDetail(selectedReportId);
      fetchStats();
      fetchReports();
    } catch (err) {
      alert(err.message || 'Forwarding failed');
    } finally {
      setForwarding(false);
    }
  };

  // Officer Action: Resolve & Close Report
  const handleResolveReport = async (e) => {
    e.preventDefault();
    if (!selectedReportId) return;
    setResolving(true);
    try {
      await apiRequest(`/evidence-reports/${selectedReportId}/resolve?notes=${encodeURIComponent(resolveNotes)}`, {
        method: 'POST'
      });
      setShowResolveModal(false);
      await handleOpenDetail(selectedReportId);
      fetchStats();
      fetchReports();
    } catch (err) {
      alert(err.message || 'Resolution failed');
    } finally {
      setResolving(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RECEIVED':
        return <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-bold">NEW RECEIVED</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold">UNDER REVIEW</span>;
      case 'ACTION_REQUIRED':
        return <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">ACTION REQUIRED</span>;
      case 'WORKER_VERIFICATION':
        return <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold">WORKER DISPATCHED</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">CLOSED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold">REJECTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-blue-950 text-sky-400 border border-blue-800 text-[10px] font-bold tracking-wider uppercase">
                MUNICIPAL EVIDENCE AUDIT
              </span>
              <span className="text-xs text-slate-400">Tamil Nadu Field Evidence Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Citizen Evidence &amp; Update Reports
            </h1>
            <p className="text-xs text-slate-400">
              Review on-site citizen observations, contractor quality evidence, and forward to field workers for physical inspection.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={wardFilter}
              onChange={(e) => {
                setWardFilter(e.target.value);
                setPage(1);
              }}
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
              onClick={() => {
                fetchStats();
                fetchReports();
              }}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 22: Real Database Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-8">
          <div
            onClick={() => setStatusFilter('RECEIVED')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              statusFilter === 'RECEIVED'
                ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-xs text-sky-400 font-semibold mb-1">New Received</div>
            <div className="text-2xl font-extrabold font-mono text-white">{stats.new_received}</div>
            <div className="text-[10px] text-slate-400 mt-1">Pending officer triage</div>
          </div>

          <div
            onClick={() => setStatusFilter('UNDER_REVIEW')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              statusFilter === 'UNDER_REVIEW'
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-xs text-blue-300 font-semibold mb-1">Under Review</div>
            <div className="text-2xl font-extrabold font-mono text-blue-300">{stats.under_review}</div>
            <div className="text-[10px] text-slate-400 mt-1">Officer inspecting</div>
          </div>

          <div
            onClick={() => setStatusFilter('ACTION_REQUIRED')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              statusFilter === 'ACTION_REQUIRED'
                ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-xs text-amber-400 font-semibold mb-1">Action Required</div>
            <div className="text-2xl font-extrabold font-mono text-amber-400">{stats.action_required}</div>
            <div className="text-[10px] text-slate-400 mt-1">Defects confirmed</div>
          </div>

          <div
            onClick={() => setStatusFilter('WORKER_VERIFICATION')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              statusFilter === 'WORKER_VERIFICATION'
                ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-xs text-purple-300 font-semibold mb-1">Worker Verifying</div>
            <div className="text-2xl font-extrabold font-mono text-purple-300">{stats.worker_verification}</div>
            <div className="text-[10px] text-slate-400 mt-1">Field crew on site</div>
          </div>

          <div
            onClick={() => setStatusFilter('RESOLVED')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-xs text-emerald-400 font-semibold mb-1">Resolved / Closed</div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400">{stats.resolved_closed}</div>
            <div className="text-[10px] text-slate-400 mt-1">Officially verified</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Report ID (REP-xxxx), Ticket (UG-xxxx), description, citizen..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="RECEIVED">Received</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="ACTION_REQUIRED">Action Required</option>
                <option value="WORKER_VERIFICATION">Worker Verification</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="ALL">All Report Types</option>
                <option value="Issue Still Exists">Issue Still Exists</option>
                <option value="Issue Has Worsened">Issue Has Worsened</option>
                <option value="Work In Progress">Work In Progress</option>
                <option value="Work Completed">Work Completed</option>
                <option value="Work Quality Concern">Work Quality Concern</option>
                <option value="Additional Evidence">Additional Evidence</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shrink-0"
              >
                Filter
              </button>
            </div>
          </form>
        </div>

        {/* Section 29: Report Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 animate-pulse h-48"></div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <h3 className="text-base font-bold text-white mb-1">No Evidence Reports Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No citizen evidence reports match your current filter parameters. Try clearing your search query or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-[#0B1528] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-sky-400">
                      {report.public_report_id}
                    </span>
                    {getStatusBadge(report.status)}
                  </div>

                  {report.related_ticket_number && (
                    <div className="flex items-center space-x-1.5 mb-2 font-mono text-xs">
                      <span className="text-slate-400">Linked Ticket:</span>
                      <span className="text-white font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                        {report.related_ticket_number}
                      </span>
                    </div>
                  )}

                  <div className="text-xs font-bold text-white mb-1 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span>{report.report_type}</span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                    "{report.description}"
                  </p>

                  <div className="text-[11px] text-slate-400 space-y-1 mb-4">
                    <div className="flex items-center space-x-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{report.location_name || 'Ward 12 Chennai'}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                      <span>Submitted: {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>&bull;</span>
                      <span>Ward {report.ward_number || 12}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Camera className="w-3.5 h-3.5 text-sky-400" />
                      <span>{report.attachment_count || 0} Files</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenDetail(report.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-sm"
                  >
                    <span>VIEW REPORT</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 bg-[#0B1528] border border-slate-800 rounded-2xl text-xs text-slate-300">
            <div>
              Showing page <span className="font-bold text-white">{page}</span> of <span className="font-bold text-white">{totalPages}</span> ({totalCount} total reports)
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 disabled:opacity-50 hover:bg-slate-800"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 disabled:opacity-50 hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* SECTION 13: REPORT DETAIL MODAL / DRAWER */}
      {/* ======================================================== */}
      {selectedReportId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-100 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-lg font-bold text-sky-400">
                      {reportDetail?.public_report_id || 'Loading...'}
                    </span>
                    {reportDetail && getStatusBadge(reportDetail.status)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Citizen Municipal Field Evidence Audit
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedReportId(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-mono">
                Loading complete report details...
              </div>
            ) : reportDetail && (
              <>
                {/* Meta details strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Related Ticket</span>
                    {reportDetail.related_ticket_number ? (
                      <Link
                        to={`/admin/complaint/${reportDetail.complaint_id}`}
                        className="font-mono font-bold text-sky-400 hover:underline flex items-center space-x-1"
                      >
                        <span>{reportDetail.related_ticket_number}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ) : (
                      <span className="text-slate-400">Independent Report</span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Report Type</span>
                    <span className="font-semibold text-white">{reportDetail.report_type}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Reporter</span>
                    <span className="text-slate-300">{reportDetail.citizen_name || 'Citizen'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Date &amp; Time</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {new Date(reportDetail.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Citizen Observation / Defect Details
                  </h3>
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed">
                    {reportDetail.description}
                  </div>
                </div>

                {/* Attachments Section: Photos & Video */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Attached Visual Evidence ({reportDetail.attachments?.length || 0})
                  </h3>

                  {(!reportDetail.attachments || reportDetail.attachments.length === 0) ? (
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-500 text-center font-mono">
                      No media files attached with this report
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Photos Thumbnail Grid */}
                      {reportDetail.attachments.filter(a => a.file_type === 'photo').length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {reportDetail.attachments.filter(a => a.file_type === 'photo').map((att, i) => (
                            <div
                              key={i}
                              onClick={() => setEnlargedPhotoUrl(att.file_url)}
                              className="cursor-pointer group relative aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-950 hover:border-sky-400 transition-all"
                            >
                              <img src={att.file_url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold text-white">
                                <Eye className="w-4 h-4 mr-1" /> View Full
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Video Player (On-Demand, NOT Autoplay per Section 30) */}
                      {reportDetail.attachments.filter(a => a.file_type === 'video').length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                            <Video className="w-3.5 h-3.5 text-purple-400" />
                            <span>Video Evidence (Loaded On Demand):</span>
                          </div>
                          {reportDetail.attachments.filter(a => a.file_type === 'video').map((vAtt, i) => (
                            <div key={i} className="max-w-md rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                              <video src={vAtt.file_url} controls preload="metadata" className="w-full max-h-56 object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Location on Map */}
                {reportDetail.latitude && reportDetail.longitude && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        <span>Evidence Location ({reportDetail.location_name})</span>
                      </h3>
                      <span className="font-mono text-[11px] text-slate-400">
                        {reportDetail.latitude.toFixed(5)}, {reportDetail.longitude.toFixed(5)}
                      </span>
                    </div>
                    <MapComponent
                      center={[reportDetail.latitude, reportDetail.longitude]}
                      zoom={15}
                      markers={[
                        {
                          lat: reportDetail.latitude,
                          lng: reportDetail.longitude,
                          color: '#0066FF',
                          popup: `Report: ${reportDetail.public_report_id}`
                        }
                      ]}
                      style={{ height: '220px', width: '100%' }}
                    />
                  </div>
                )}

                {/* Worker Field Response Section (if forwarded or verified) */}
                {reportDetail.assigned_worker_name && (
                  <div className="p-4 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <HardHat className="w-4 h-4 text-purple-400" />
                        <span className="font-bold text-purple-300">
                          Field Verification by: {reportDetail.assigned_worker_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {reportDetail.worker_verified_at ? 'Verification Done' : 'On-Site Inspection Pending'}
                      </span>
                    </div>
                    {reportDetail.officer_instruction && (
                      <p className="text-slate-300">
                        <strong className="text-slate-400">Officer Instruction:</strong> {reportDetail.officer_instruction}
                      </p>
                    )}
                    {reportDetail.worker_notes && (
                      <p className="text-amber-200">
                        <strong className="text-amber-300">Worker Field Findings:</strong> {reportDetail.worker_notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Timeline */}
                {reportDetail.timeline && reportDetail.timeline.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Audit Trail &amp; Action Timeline</span>
                    </h3>
                    <div className="space-y-2 border-l border-slate-800 ml-2 pl-4 text-xs font-mono">
                      {reportDetail.timeline.map((ev, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-sky-400 border border-slate-900"></div>
                          <div className="text-slate-300 font-semibold">{ev.description}</div>
                          <div className="text-[10px] text-slate-500">
                            {ev.actor_name} ({ev.actor_role}) &bull; {new Date(ev.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Officer Action Buttons Bar */}
                <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('UNDER_REVIEW', 'UNDER_REVIEW')}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      [ MARK UNDER REVIEW ]
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus('ACTION_REQUIRED', 'ACTION_REQUIRED')}
                      className="px-3 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-xs font-semibold text-amber-300 transition-colors"
                    >
                      [ ACTION REQUIRED ]
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowForwardModal(true)}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <HardHat className="w-3.5 h-3.5" />
                      <span>FORWARD TO WORKER</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowResolveModal(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>RESOLVE REPORT</span>
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FORWARD TO FIELD WORKER MODAL */}
      {/* ======================================================== */}
      {showForwardModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-purple-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <HardHat className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Forward Report for On-Site Verification</h3>
              </div>
              <button onClick={() => setShowForwardModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleForwardToWorker} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Field Worker</label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  {wardWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} &bull; {w.specialization} ({w.team_name || 'Crew'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                <select
                  value={forwardPriority}
                  onChange={(e) => setForwardPriority(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Field Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={forwardInstruction}
                  onChange={(e) => setForwardInstruction(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForwardModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forwarding}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-wider"
                >
                  {forwarding ? 'Dispatching...' : 'Dispatch Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RESOLVE & CLOSE REPORT MODAL */}
      {/* ======================================================== */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-emerald-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Officially Resolve &amp; Close Report</h3>
              </div>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleResolveReport} className="space-y-4 text-xs">
              <p className="text-slate-300 text-xs leading-relaxed">
                Approving this report will update its status to <strong>RESOLVED</strong> in PostgreSQL, log your audit notes in the timeline, and send a completion notification to the citizen.
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Resolution Audit Notes</label>
                <textarea
                  rows={3}
                  required
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider"
                >
                  {resolving ? 'Resolving...' : 'Confirm & Resolve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ENLARGED PHOTO PREVIEW MODAL */}
      {/* ======================================================== */}
      {enlargedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setEnlargedPhotoUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={enlargedPhotoUrl} alt="Enlarged evidence" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button
              onClick={() => setEnlargedPhotoUrl(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
