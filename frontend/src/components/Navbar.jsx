import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldAlert, MapPin, Bell, User, LogOut, CheckCircle,
  AlertTriangle, Hammer, Sliders, Activity, ChevronDown, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';

export default function Navbar() {
  const { user, role, logout, quickLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [activeRadius, setActiveRadius] = useState(50);

  useEffect(() => {
    async function fetchNavData() {
      try {
        const notifs = await apiRequest('/notifications?limit=5');
        setNotifications(notifs || []);
      } catch (err) {
        // quiet
      }
      try {
        const settings = await apiRequest('/settings');
        const r = settings.find(s => s.key === 'duplicate_radius_meters');
        if (r) setActiveRadius(parseFloat(r.value));
      } catch (err) {
        // quiet
      }
    }
    fetchNavData();
    const interval = setInterval(fetchNavData, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleRoleSwitch = async (targetRole) => {
    await quickLogin(targetRole);
    setShowRoleMenu(false);
    if (targetRole === 'OFFICER') navigate('/admin/dashboard');
    else if (targetRole === 'WORKER') navigate('/worker/dashboard');
    else navigate('/citizen/my-reports');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#070D18]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Tamil Nadu Civic Emblem */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 p-0.5 shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0B1528] rounded-[10px] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-white font-mono">
                  URBAN<span className="text-sky-400">GRID</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800/60 font-semibold tracking-wider">
                  TN CIVIC TECH
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">
                Municipal Grievance Deduplication & Dispatch
              </p>
            </div>
          </Link>

          {/* Active 50m Challenge Radius Badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Radius:</span>
            <span className="font-mono font-bold text-sky-400">{activeRadius}m</span>
            <span className="text-[10px] text-slate-500 font-sans">(Challenge Default)</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-1">
          <Link
            to="/citizen"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/citizen') || isActive('/')
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Citizen Portal
          </Link>
          <Link
            to="/citizen/report"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
              isActive('/citizen/report')
                ? 'bg-sky-600 text-white'
                : 'text-sky-400 hover:text-sky-300 hover:bg-sky-950/40'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-sky-400" />
            <span>Report Issue</span>
          </Link>
          <Link
            to="/citizen/my-reports"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/citizen/my-reports')
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Track Reports
          </Link>
          <Link
            to="/admin/dashboard"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
              location.pathname.startsWith('/admin')
                ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Officer Operations</span>
          </Link>
          <Link
            to="/worker/dashboard"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
              location.pathname.startsWith('/worker')
                ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Hammer className="w-4 h-4 text-amber-400" />
            <span>Worker Field Portal</span>
          </Link>
        </nav>

        {/* Action Controls & Profile */}
        <div className="flex items-center space-x-3">
          {/* Live Judge Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors shadow-sm"
              title="One-click demo role switcher for competition judging"
            >
              <span className="text-slate-400">Demo Role:</span>
              <span className="font-bold text-sky-400">{role || 'GUEST'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 text-xs">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1 border-b border-slate-800">
                  Switch Role (Instant Auth)
                </div>
                <button
                  onClick={() => handleRoleSwitch('OFFICER')}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-blue-950/80 text-blue-300 flex items-center space-x-2 transition-colors"
                >
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-semibold">Ward Officer / Admin</div>
                    <div className="text-[10px] text-slate-400">Thiru R. Selvakumar</div>
                  </div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('WORKER')}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-amber-950/80 text-amber-300 flex items-center space-x-2 transition-colors mt-1"
                >
                  <Hammer className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold">Municipal Field Worker</div>
                    <div className="text-[10px] text-slate-400">Karthikeyan M (Ward 12)</div>
                  </div>
                </button>
                <button
                  onClick={() => handleRoleSwitch('CITIZEN')}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-950/80 text-emerald-300 flex items-center space-x-2 transition-colors mt-1"
                >
                  <User className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold">Public Citizen</div>
                    <div className="text-[10px] text-slate-400">Anbuselvan K</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
              title="System Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-3 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <span className="font-bold text-white">Notifications ({notifications.length})</span>
                  <Link
                    to="/citizen/notifications"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    View All
                  </Link>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-slate-500 text-center py-4">No recent notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2 rounded-lg border ${
                          n.is_read ? 'bg-slate-950/40 border-slate-800/40 text-slate-400' : 'bg-slate-800/60 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="font-semibold text-slate-200">{n.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Auth State */}
          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight">{user.full_name}</div>
                <div className="text-[10px] text-slate-400">{user.role}</div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/citizen/login"
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
