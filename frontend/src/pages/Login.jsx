import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ShieldAlert, User, Lock, ArrowRight, Building2, HardHat,
  Users, CheckCircle2, AlertTriangle, KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const isOfficer = location.pathname.startsWith('/admin') || location.pathname.startsWith('/officer');
  const isWorker = location.pathname.startsWith('/worker');
  const isCitizen = !isOfficer && !isWorker;

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Set friendly defaults for easy testing
  useEffect(() => {
    if (isOfficer) {
      setUsernameOrEmail('admin');
      setPassword('admin123');
    } else if (isWorker) {
      setUsernameOrEmail('worker_001');
      setPassword('worker123');
    } else {
      setUsernameOrEmail('');
      setPassword('');
    }
    setError(null);
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isCitizen && isRegister) {
        await register({
          email: usernameOrEmail,
          password,
          full_name: fullName,
          phone,
          role: 'CITIZEN'
        });
        navigate('/citizen/my-reports');
      } else {
        const u = await login(usernameOrEmail, password);
        if (isOfficer || u.role === 'OFFICER' || u.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (isWorker || u.role === 'WORKER') {
          navigate('/worker/dashboard');
        } else {
          navigate('/citizen/my-reports');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Role-Specific Header */}
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-0.5 shadow-xl mb-4">
            <div className="w-full h-full bg-[#0B1528] rounded-[14px] flex items-center justify-center">
              {isOfficer ? (
                <Building2 className="w-7 h-7 text-blue-400" />
              ) : isWorker ? (
                <HardHat className="w-7 h-7 text-amber-400" />
              ) : (
                <Users className="w-7 h-7 text-sky-400" />
              )}
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isOfficer
              ? 'Officer Operations Login'
              : isWorker
              ? 'Worker Field Portal Login'
              : isRegister
              ? 'Create Citizen Account'
              : 'Citizen Portal Sign In'}
          </h2>

          <p className="text-xs text-slate-400 mt-1.5">
            {isOfficer
              ? 'Municipal Administration & Grievance Dispatch'
              : isWorker
              ? 'Assigned Field Operations & Site Verifications'
              : 'Tamil Nadu Municipal Grievance Tracking'}
          </p>

          {isOfficer && (
            <div className="inline-block mt-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/80 text-[10px] text-blue-300 font-semibold tracking-wider uppercase">
              Authorized municipal personnel only
            </div>
          )}
        </div>

        {/* Dedicated Login Card */}
        <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Credentials Tip */}
          {isOfficer && (
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 mb-5 text-xs text-blue-300 flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Competition Demo Credentials:</span>
                <div className="font-mono text-[11px] text-sky-300 mt-0.5">
                  admin &bull; admin123
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUsernameOrEmail('admin');
                  setPassword('admin123');
                }}
                className="px-2 py-1 rounded bg-blue-800 hover:bg-blue-700 text-white text-[10px] font-bold"
              >
                Auto Fill
              </button>
            </div>
          )}

          {isWorker && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 mb-5 text-xs text-amber-300 flex items-center justify-between">
              <div>
                <span className="font-bold text-white">Default Test Worker:</span>
                <div className="font-mono text-[11px] text-amber-200 mt-0.5">
                  worker_001 &bull; worker123
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUsernameOrEmail('worker_001');
                  setPassword('worker123');
                }}
                className="px-2 py-1 rounded bg-amber-800 hover:bg-amber-700 text-white text-[10px] font-bold"
              >
                Auto Fill
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isCitizen && isRegister && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Karthikeyan M"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {isOfficer ? 'Officer Username / Email' : isWorker ? 'Worker Username' : 'Email Address'}
              </label>
              <div className="relative">
                <input
                  type={isCitizen ? 'email' : 'text'}
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder={isOfficer ? 'admin' : isWorker ? 'worker_001' : 'citizen@example.com'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {isCitizen && isRegister && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98401 23456"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all mt-6 text-white shadow-lg ${
                isOfficer
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                  : isWorker
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/30'
              }`}
            >
              <span>{loading ? 'Authenticating...' : isRegister ? 'Register Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {isCitizen && (
            <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
              {isRegister ? (
                <span>
                  Already registered?{' '}
                  <button onClick={() => setIsRegister(false)} className="text-sky-400 font-semibold hover:underline">
                    Sign In
                  </button>
                </span>
              ) : (
                <span>
                  New citizen?{' '}
                  <button onClick={() => setIsRegister(true)} className="text-sky-400 font-semibold hover:underline">
                    Create Account
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Back to Portal Selection */}
        <div className="text-center">
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-white underline transition-colors"
          >
            &larr; Return to Role Portal Selection
          </Link>
        </div>

      </div>

      <footer className="text-center text-xs text-slate-600 mt-8">
        Tamil Nadu Municipal Grievance &bull; PostGIS Spatial Engine &bull; Gemini Multimodal AI
      </footer>
    </div>
  );
}
