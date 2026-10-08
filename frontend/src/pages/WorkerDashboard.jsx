import React, { useState, useEffect } from 'react';
import {
  Hammer, CheckCircle2, Clock, AlertTriangle, MapPin, Play,
  Check, FileText, RefreshCw, Sparkles, User
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function WorkerDashboard() {
  const { user, quickLogin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingTicket, setActingTicket] = useState(null);
  const [notes, setNotes] = useState('');

  const fetchTasks = async () => {
    try {
      const data = await apiRequest('/workers/portal/my-tasks');
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleStartWork = async (complaintId) => {
    setActingTicket(complaintId);
    try {
      await apiRequest(`/workers/tasks/${complaintId}/start`, {
        method: 'POST',
        body: JSON.stringify({ notes: notes || "Field crew mobilized with repair materials on site." })
      });
      setNotes('');
      await fetchTasks();
    } catch (err) {
      alert(err.message || "Failed to start work");
    } finally {
      setActingTicket(null);
    }
  };

  const handleCompleteWork = async (complaintId) => {
    setActingTicket(complaintId);
    try {
      await apiRequest(`/workers/tasks/${complaintId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes: notes || "Remediation physical work finished. Ready for Officer inspection." })
      });
      setNotes('');
      await fetchTasks();
    } catch (err) {
      alert(err.message || "Failed to mark complete");
    } finally {
      setActingTicket(null);
    }
  };

  const isWorkerRole = user?.role === 'WORKER' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold tracking-wider uppercase">
                FIELD WORKER DISPATCH PORTAL
              </span>
              <span className="text-xs text-slate-400">On-Site Execution</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Assigned Field Work Orders
            </h1>
            <p className="text-xs text-slate-400">
              Welcome, <strong className="text-white">{user?.full_name || 'Municipal Specialist'}</strong> &bull; Ward 12
            </p>
          </div>

          <button
            onClick={fetchTasks}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 text-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Assignments</span>
          </button>
        </div>

        {/* If not logged in as worker, prompt quick login */}
        {!isWorkerRole && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="text-amber-200">
              You are currently browsing as <strong>{user?.role || 'Guest'}</strong>. Switch to Field Worker role to execute physical work orders.
            </div>
            <button
              onClick={() => quickLogin('WORKER')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors shrink-0"
            >
              One-Click Worker Login
            </button>
          </div>
        )}

        {/* Task Cards Queue */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-mono text-sm">
            Retrieving assigned field tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="civic-card p-12 text-center rounded-2xl">
            <Hammer className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No active work assigned</h3>
            <p className="text-xs text-slate-400">
              You have completed all pending physical dispatches in your assigned municipal ward.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="civic-card p-6 rounded-2xl border-slate-700 shadow-xl space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xl font-bold text-sky-400">
                      {task.ticket_number}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      task.priority === 'CRITICAL' ? 'badge-critical' :
                      task.priority === 'HIGH' ? 'badge-high' : 'badge-medium'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider bg-slate-900 border-slate-700 text-slate-200">
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    Reports Merged: <strong className="text-sky-400">{task.report_count}</strong>
                  </span>
                </div>

                {/* Details */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{task.category}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    {task.description}
                  </p>
                </div>

                {/* Location */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex items-center space-x-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{task.address || `Ward ${task.ward_number}, ${task.city}`}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    GPS Coordinates: ({task.latitude.toFixed(5)}, {task.longitude.toFixed(5)})
                  </div>
                </div>

                {/* Field Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400 font-mono">
                    Municipal protocol: Complete work & submit for Officer sign-off
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    {task.status !== 'IN_PROGRESS' && task.status !== 'WORK_COMPLETED' && task.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleStartWork(task.id)}
                        disabled={actingTicket === task.id}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-amber-600/20"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>START WORK</span>
                      </button>
                    )}

                    {task.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleCompleteWork(task.id)}
                        disabled={actingTicket === task.id}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-lg shadow-purple-600/20"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>MARK COMPLETED</span>
                      </button>
                    )}

                    {task.status === 'WORK_COMPLETED' && (
                      <div className="px-4 py-2 rounded-xl bg-purple-950/80 border border-purple-600 text-purple-300 text-xs font-semibold flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span>AWAITING OFFICER VERIFICATION</span>
                      </div>
                    )}

                    {task.status === 'RESOLVED' && (
                      <div className="px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>VERIFIED & RESOLVED BY OFFICER</span>
                      </div>
                    )}
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
