import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Phone, Shield, Hammer, CheckCircle2, X,
  Trash2, Key, HardHat, MapPin, Check, AlertTriangle, Radio
} from 'lucide-react';
import { apiRequest } from '../api/client';

export default function OfficerWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('worker123');
  const [phone, setPhone] = useState('+91 9');
  const [wardNumber, setWardNumber] = useState(12);
  const [specialization, setSpecialization] = useState('Road Maintenance');
  const [teamName, setTeamName] = useState('Road Repair Team A');
  const [teamSize, setTeamSize] = useState(3);
  const [isTeamLeader, setIsTeamLeader] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchWorkers = async () => {
    try {
      const data = await apiRequest('/workers');
      setWorkers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleAddWorker = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        username,
        password,
        phone,
        ward_number: parseInt(wardNumber),
        specialization,
        team_name: teamName,
        team_size: parseInt(teamSize),
        is_team_leader: isTeamLeader
      };

      const res = await apiRequest('/workers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Show credentials once
      setCreatedCredentials({
        name,
        username,
        password,
        ward: wardNumber,
        team: teamName
      });

      setShowAddModal(false);
      setName('');
      setUsername('');
      await fetchWorkers();
    } catch (err) {
      alert(err.message || 'Failed to create worker');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorker = async (id, workerName) => {
    if (!window.confirm(`Are you sure you want to remove worker "${workerName}"?`)) return;
    try {
      await apiRequest(`/workers/${id}`, { method: 'DELETE' });
      await fetchWorkers();
    } catch (err) {
      alert(err.message || 'Failed to delete worker');
    }
  };

  const handleToggleStatus = async (worker) => {
    const nextAvailability = worker.availability === 'AVAILABLE' ? 'ON_DUTY' : 'AVAILABLE';
    try {
      await apiRequest(`/workers/${worker.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ availability: nextAvailability })
      });
      await fetchWorkers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold tracking-wider uppercase">
                FIELD OPERATIONS CREW
              </span>
              <span className="text-xs text-slate-400">Tamil Nadu Municipal Corporations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Field Workers &amp; Operational Teams
            </h1>
            <p className="text-xs text-slate-400">
              Only authorized officers can provision field worker credentials. Crews execute site work and verification tasks.
            </p>
          </div>

          <button
            onClick={() => {
              setCreatedCredentials(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-lg shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Worker</span>
          </button>
        </div>

        {/* Section 11: Show Created Worker Credentials Once */}
        {createdCredentials && (
          <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-600/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Field Worker Successfully Provisioned</span>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Dismiss
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Store these initial credentials securely. The worker can sign in immediately through the <strong>Worker Portal</strong>.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Worker Name</span>
                <span className="text-white font-bold">{createdCredentials.name}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Username</span>
                <span className="text-sky-400 font-bold">{createdCredentials.username}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Password</span>
                <span className="text-emerald-300 font-bold">{createdCredentials.password}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Assigned Ward</span>
                <span className="text-white">Ward {createdCredentials.ward} ({createdCredentials.team})</span>
              </div>
            </div>
          </div>
        )}

        {/* Workers Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-mono text-sm">
            Loading field worker records...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workers.map((w) => (
              <div
                key={w.id}
                className="bg-[#0B1528] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-base font-bold text-white">{w.name}</h3>
                        {w.is_team_leader && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[9px] font-bold">
                            LEADER
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">@{w.username}</div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        w.availability === 'AVAILABLE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {w.availability}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1.5 mb-4">
                    <div className="text-slate-300 flex justify-between">
                      <span className="text-slate-500">Ward:</span>
                      <strong className="text-sky-400">Ward {w.ward_number}</strong>
                    </div>

                    <div className="text-slate-300 flex justify-between">
                      <span className="text-slate-500">Specialization:</span>
                      <span className="text-white truncate">{w.specialization}</span>
                    </div>

                    <div className="text-slate-300 flex justify-between">
                      <span className="text-slate-500">Team:</span>
                      <span className="text-slate-200">
                        {w.team_name || 'Field Crew'} (Size: {w.team_size || 1})
                      </span>
                    </div>

                    <div className="text-slate-300 flex justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span className="text-slate-400">{w.phone}</span>
                    </div>

                    <div className="text-slate-300 flex justify-between items-center pt-1 border-t border-slate-800/80">
                      <span className="text-slate-500">GPS Beacon:</span>
                      <span className="flex items-center space-x-1 text-[10px]">
                        <span className={`w-2 h-2 rounded-full ${w.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                        <span className={w.is_online ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {w.is_online ? 'Active' : 'Offline'}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <button
                    onClick={() => handleToggleStatus(w)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-[11px] transition-colors"
                  >
                    Toggle Duty
                  </button>

                  <button
                    onClick={() => handleDeleteWorker(w.id, w.name)}
                    className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-400 transition-colors"
                    title="Remove Worker Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section 11: Add Worker Modal with Team Details */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[#0B1528] border border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <HardHat className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">Enroll Municipal Field Worker</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddWorker} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Worker Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Karthikeyan M"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. worker_001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Initial Password</label>
                    <input
                      type="text"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Ward Number</label>
                    <input
                      type="number"
                      required
                      value={wardNumber}
                      onChange={(e) => setWardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98401 23456"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Specialization</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Road Maintenance">Road Maintenance (Potholes, Asphalt, Pavers)</option>
                    <option value="Sanitation & Solid Waste">Sanitation &amp; Solid Waste (Garbage, Dumps)</option>
                    <option value="Water Supply & Drainage">Water Supply &amp; Drainage (Leaks, Pipelines)</option>
                    <option value="Electrical & Streetlights">Electrical &amp; Streetlights</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Team Name</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Road Repair Team A"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Team Size</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="teamLeaderCheck"
                    checked={isTeamLeader}
                    onChange={(e) => setIsTeamLeader(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="teamLeaderCheck" className="text-slate-300 font-semibold cursor-pointer">
                    Assign as Team Leader
                  </label>
                </div>

                <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider"
                  >
                    {submitting ? 'Creating...' : 'Enroll Worker'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
