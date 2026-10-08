import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const data = await apiRequest('/notifications?limit=100');
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Civic Notifications & Alerts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Realtime alerts on complaint deduplication, priority escalations, and worker assignments
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500 font-mono text-sm">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="civic-card p-12 text-center rounded-2xl">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No notifications</h3>
            <p className="text-xs text-slate-400">You are completely up to date.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`civic-card p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${
                  n.is_read
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-80'
                    : 'bg-slate-900 border-sky-800/80 shadow-md'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-bold text-sm text-white">{n.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      n.type === 'ALERT' ? 'bg-red-950 text-red-400 border border-red-800' :
                      n.type === 'ESCALATION' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      n.type === 'SUCCESS' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      'bg-sky-950 text-sky-300 border border-sky-800'
                    }`}>
                      {n.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-2">
                    {n.message}
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {n.complaint_id && (
                    <Link
                      to={`/citizen/ticket/${n.complaint_id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold flex items-center space-x-1 transition-colors"
                    >
                      <span>Track</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
