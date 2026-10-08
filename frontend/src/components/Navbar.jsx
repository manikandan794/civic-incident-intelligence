import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert, MapPin, Bell, User, LogOut, CheckCircle,
  AlertTriangle, Hammer, Sliders, Activity, ChevronDown, Layers,
  Compass, PlusCircle, FileText, QrCode, Copy, ExternalLink,
  Check, HardHat, Building2, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';

export default function Navbar() {
  const { user, role, logout, quickLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeRadius, setActiveRadius] = useState(50);

  const isCitizenPath = location.pathname.startsWith('/citizen');
  const isOfficerPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/officer');
  const isWorkerPath = location.pathname.startsWith('/worker');

  useEffect(() => {
    if (location.pathname === '/') return;
    async function fetchNavData() {
      try {
        const notifs = await apiRequest('/notifications?limit=5');
        setNotifications(notifs || []);
      } catch (err) {
        // quiet
      }
      if (isOfficerPath) {
        try {
          const settings = await apiRequest('/settings');
          const r = settings?.find?.(s => s.key === 'duplicate_radius_meters');
          if (r) setActiveRadius(parseFloat(r.value));
        } catch (err) {
          // quiet
        }
      }
    }
    fetchNavData();
    const interval = setInterval(fetchNavData, 15000);
    return () => clearInterval(interval);
  }, [user, location.pathname, isOfficerPath]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const citizenPortalUrl = typeof window !== 'undefined' ? `${window.location.origin}/citizen` : '/citizen';

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(citizenPortalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isActive = (path) => location.pathname === path;

  // If on the root portal selection screen, hide the global navbar
  if (location.pathname === '/') {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#070D18]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* ==================== CITIZEN HEADER ==================== */}
          {isCitizenPath && (
            <>
              <div className="flex items-center space-x-3">
                <Link to="/citizen" className="flex items-center space-x-2.5 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 p-0.5 shadow-md shadow-sky-500/20">
                    <div className="w-full h-full bg-[#0B1528] rounded-[10px] flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-sky-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold tracking-tight text-white font-mono">
                        URBAN<span className="text-sky-400">GRID</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800/60 font-semibold">
                        CITIZEN PORTAL
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-none">
                      Municipal Public Grievances
                    </p>
                  </div>
                </Link>
              </div>

              {/* Citizen Navigation Links */}
              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  to="/citizen"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive('/citizen')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  Overview
                </Link>

                <Link
                  to="/citizen/report"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                    isActive('/citizen/report')
                      ? 'bg-sky-600 text-white'
                      : 'text-sky-400 hover:text-sky-300 hover:bg-sky-950/40'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Report Issue</span>
                </Link>

                <Link
                  to="/citizen/submit-evidence"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                    isActive('/citizen/submit-evidence')
                      ? 'bg-blue-600 text-white'
                      : 'text-blue-300 hover:text-white hover:bg-blue-950/40'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Submit Evidence / Update</span>
                </Link>

                <Link
                  to="/citizen/my-reports"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                    isActive('/citizen/my-reports')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Track Reports</span>
                </Link>

                <Link
                  to="/citizen/notifications"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 ${
                    isActive('/citizen/notifications')
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Updates</span>
                  {unreadCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  )}
                </Link>
              </nav>

              {/* Citizen Right Controls */}
              <div className="flex items-center space-x-2">
                <Link
                  to="/"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
                >
                  Switch Portal
                </Link>
              </div>
            </>
          )}

          {/* ==================== OFFICER HEADER ==================== */}
          {isOfficerPath && (
            <>
              <div className="flex items-center space-x-3">
                <Link to="/admin/dashboard" className="flex items-center space-x-2.5 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 p-0.5 shadow-md shadow-blue-500/20">
                    <div className="w-full h-full bg-[#0B1528] rounded-[10px] flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold tracking-tight text-white font-mono">
                        URBAN<span className="text-blue-400">GRID</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 font-semibold">
                        OFFICER OPERATIONS
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-none">
                      Municipal Command &amp; Deduplication
                    </p>
                  </div>
                </Link>

                <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-400">Radius:</span>
                  <span className="font-mono font-bold text-sky-400">{activeRadius}m</span>
                </div>
              </div>

              {/* Officer Navigation Links */}
              <nav className="hidden lg:flex items-center space-x-1">
                <Link
                  to="/admin/dashboard"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive('/admin/dashboard')
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  Overview
                </Link>

                <Link
                  to="/admin/complaints"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive('/admin/complaints')
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  Complaints
                </Link>

                <Link
                  to="/admin/reports"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 ${
                    isActive('/admin/reports')
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Citizen Reports</span>
                </Link>

                <Link
                  to="/admin/workers"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 ${
                    isActive('/admin/workers')
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Workers</span>
                </Link>

                <Link
                  to="/admin/telemetry"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive('/admin/telemetry')
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  AI Telemetry
                </Link>

                <Link
                  to="/admin/settings"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isActive('/admin/settings')
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  Settings
                </Link>
              </nav>

              {/* Officer Right Controls (Section 24: Citizen Link / QR) */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-800/70 text-xs font-semibold text-sky-300 flex items-center space-x-1.5 transition-colors shadow-sm"
                  title="Citizen Portal Entry Point & QR"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">User Login Link</span>
                </button>

                <Link
                  to="/"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
                >
                  Switch Portal
                </Link>
              </div>
            </>
          )}

          {/* ==================== WORKER HEADER ==================== */}
          {isWorkerPath && (
            <>
              <div className="flex items-center space-x-3">
                <Link to="/worker/dashboard" className="flex items-center space-x-2.5 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 p-0.5 shadow-md shadow-amber-500/20">
                    <div className="w-full h-full bg-[#0B1528] rounded-[10px] flex items-center justify-center">
                      <HardHat className="w-5 h-5 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold tracking-tight text-white font-mono">
                        URBAN<span className="text-amber-400">GRID</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-semibold">
                        WORKER FIELD OPS
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-none">
                      Assigned Municipal Field Work
                    </p>
                  </div>
                </Link>
              </div>

              {/* Worker Navigation */}
              <nav className="flex items-center space-x-2">
                <Link
                  to="/worker/dashboard"
                  className="px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-700/60 text-xs font-bold text-amber-300 flex items-center space-x-1.5"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Assigned Field Work</span>
                </Link>

                <Link
                  to="/"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
                >
                  Switch Portal
                </Link>
              </nav>
            </>
          )}

        </div>
      </header>

      {/* Section 24: Citizen Portal Link & QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-sky-800/60 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Public Citizen Portal Link</h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Share this official municipal URL with citizens or generate QR codes for public ward signage. This endpoint grants secure citizen issue submission and ticket tracking without exposing officer or worker administration.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-sky-300 break-all mb-4">
              {citizenPortalUrl}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY LINK'}</span>
              </button>

              <a
                href={citizenPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1.5 transition-colors"
              >
                <span>OPEN</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
