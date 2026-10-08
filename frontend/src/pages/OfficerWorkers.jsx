import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Phone, Shield, Hammer, CheckCircle2, X } from 'lucide-react';
import { apiRequest } from '../api/client';

export default function OfficerWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('Worker@1234');
  const [phone, setPhone] = useState('+91 9');
  const [wardNumber, setWardNumber] = useState(12);
  const [specialization, setSpecialization] = useState('Roads & Civil Works');
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
      await apiRequest('/workers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          username,
          password,
          phone,
          ward_number: parseInt(wardNumber),
          specialization
        })
      });
      setShowAddModal(false);
      setName('');
      setUsername('');
      await fetchWorkers();
    } catch (err) {
      alert(err.message || "Failed to create worker");
    } finally {
      setSubmitting(false);
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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Municipal Field Crew Roster
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Registered civic remediation specialists across Tamil Nadu wards
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-lg shadow-amber-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Field Specialist</span>
          </button>
        </div>

        {/* Workers Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-500 font-mono text-sm">
            Loading field worker records...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workers.map((w) => (
              <div key={w.id} className="civic-card p-5 rounded-2xl flex flex-col justify-between shadow-md">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{w.name}</h3>
                      <div className="text-xs text-slate-400 font-mono">@{w.username}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      w.availability === 'AVAILABLE'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {w.availability}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1.5 mb-4">
                    <div className="text-slate-300">
                      <span className="text-slate-500">Ward: </span>
                      <strong className="text-sky-400">Ward {w.ward_number}</strong>
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-500">Specialization: </span>
                      {w.specialization}
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-500">Phone: </span>
                      {w.phone}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-mono text-[10px]">
                    Status: {w.status}
                  </span>
                  <button
                    onClick={() => handleToggleStatus(w)}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] transition-colors"
                  >
                    Toggle Duty
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Worker Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="civic-card p-6 rounded-2xl max-w-md w-full border-slate-700 shadow-2xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Enroll Field Worker</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddWorker} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. S. Murugesan"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. worker.murugesan"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Default Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Ward Number</label>
                    <input
                      type="number"
                      required
                      value={wardNumber}
                      onChange={(e) => setWardNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Phone</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Specialization</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none"
                  >
                    <option value="Roads & Civil Works">Roads & Civil Works (Potholes, Asphalt)</option>
                    <option value="Sanitation & Solid Waste">Sanitation & Solid Waste (Garbage)</option>
                    <option value="Water Supply & Sewage">Water Supply & Sewage (Leaks, Drainage)</option>
                    <option value="Electrical & Streetlights">Electrical & Streetlights</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
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
