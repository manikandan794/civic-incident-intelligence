import React, { useState, useEffect } from 'react';
import { Sliders, CheckCircle2, ShieldCheck, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { apiRequest } from '../api/client';

export default function OfficerSettings() {
  const [activeRadius, setActiveRadius] = useState(50.0);
  const [customValue, setCustomValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await apiRequest('/settings');
      const rad = res.find(s => s.key === 'duplicate_radius_meters');
      if (rad) {
        const val = parseFloat(rad.value);
        setActiveRadius(val);
        setCustomValue(val.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateRadius = async (val) => {
    setSaving(true);
    setSavedSuccess(null);
    try {
      const res = await apiRequest('/settings/duplicate-radius', {
        method: 'PATCH',
        body: JSON.stringify({ value: val.toString() })
      });
      const updated = parseFloat(res.value);
      setActiveRadius(updated);
      setCustomValue(updated.toString());
      setSavedSuccess(`Active Deduplication Radius updated to ${updated} meters.`);
    } catch (err) {
      alert(err.message || "Failed to update radius");
    } finally {
      setSaving(false);
    }
  };

  const presets = [
    { label: "50m (Official Challenge Default)", val: 50.0, isDefault: true },
    { label: "100m (High Density Urban)", val: 100.0, isDefault: false },
    { label: "500m (Zonal Neighborhood)", val: 500.0, isDefault: false },
    { label: "1000m (Suburban Arterial)", val: 1000.0, isDefault: false },
  ];

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Municipal Operational Configurations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Spatial deduplication boundaries & algorithm parameters
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-600 text-emerald-200 text-xs mb-6 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedSuccess}</span>
          </div>
        )}

        {/* Section 27 Radius Configuration Card */}
        <div className="civic-card p-6 sm:p-8 rounded-2xl shadow-xl mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-sky-400" />
                <span>Active Duplicate Detection Radius</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical geodesic boundary for merging citizen grievance reports into master work tickets
              </p>
            </div>

            {/* Official Default Badge */}
            <div className="px-3 py-1.5 rounded-xl bg-sky-950 border border-sky-600/60 text-xs font-mono font-bold text-sky-300">
              Challenge Default Radius: 50m
            </div>
          </div>

          <div className="mb-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-mono">Current Active Setting:</div>
              <div className="text-3xl font-black font-mono text-sky-400 mt-1">
                {activeRadius} METERS
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">
              LIVE IN POSTGRESQL
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Preset Radius:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((p) => (
                <button
                  key={p.val}
                  type="button"
                  disabled={saving}
                  onClick={() => handleUpdateRadius(p.val)}
                  className={`p-3.5 rounded-xl border text-left text-xs font-mono transition-all flex items-center justify-between ${
                    activeRadius === p.val
                      ? 'bg-sky-950/80 border-sky-500 text-white font-bold ring-2 ring-sky-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div>{p.label}</div>
                    {p.isDefault && (
                      <span className="text-[10px] text-sky-400 font-sans">
                        Official competition verification parameter
                      </span>
                    )}
                  </div>
                  {activeRadius === p.val && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Numeric Radius */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 mb-6">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Numeric Radius (meters):
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="5"
                max="50000"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="e.g. 75"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                disabled={saving || !customValue}
                onClick={() => handleUpdateRadius(parseFloat(customValue))}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-colors"
              >
                Apply Custom
              </button>
            </div>
          </div>

          {/* Audit Rule Explanation */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-start space-x-3 text-xs text-slate-400 leading-relaxed">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-300">Auditing Integrity Standard:</strong>
              <br />
              Every duplicate decision records which radius was active at decision time. Changing this setting takes effect for future reports and does not retroactively alter historical decisions or audit trail records.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
