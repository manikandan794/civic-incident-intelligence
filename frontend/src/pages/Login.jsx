import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, User, Lock, ArrowRight, Sparkles, Sliders, Hammer, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login, register, quickLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register({
          email,
          password,
          full_name: fullName,
          phone,
          role: 'CITIZEN'
        });
        navigate('/citizen/my-reports');
      } else {
        const u = await login(email, password);
        if (u.role === 'OFFICER' || u.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (u.role === 'WORKER') {
          navigate('/worker/dashboard');
        } else {
          navigate('/citizen/my-reports');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = async (roleName) => {
    setLoading(true);
    try {
      const u = await quickLogin(roleName);
      if (u.role === 'OFFICER') navigate('/admin/dashboard');
      else if (u.role === 'WORKER') navigate('/worker/dashboard');
      else navigate('/citizen/my-reports');
    } catch (err) {
      setError(err.message || "Quick login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 p-0.5 shadow-xl mb-4">
            <div className="w-full h-full bg-[#0B1528] rounded-[14px] flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-sky-400" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {isRegister ? 'Create Citizen Account' : 'Sign in to UrbanGrid'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tamil Nadu Municipal Civic Grievance Deduplication Platform
          </p>
        </div>

        {/* Competition Judge Quick-Login Panel */}
        <div className="civic-card p-4 rounded-xl border-sky-800/40 bg-sky-950/20 shadow-md">
          <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Judge Demo 1-Click Authentication</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuick('OFFICER')}
              className="p-2 rounded-lg bg-blue-900/60 hover:bg-blue-800/80 border border-blue-700/60 text-center transition-colors"
            >
              <div className="text-xs font-bold text-blue-200">Officer</div>
              <div className="text-[9px] text-slate-400">Admin Ops</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuick('WORKER')}
              className="p-2 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 border border-amber-700/60 text-center transition-colors"
            >
              <div className="text-xs font-bold text-amber-200">Worker</div>
              <div className="text-[9px] text-slate-400">Field Crew</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuick('CITIZEN')}
              className="p-2 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-700/60 text-center transition-colors"
            >
              <div className="text-xs font-bold text-emerald-200">Citizen</div>
              <div className="text-[9px] text-slate-400">Public User</div>
            </button>
          </div>
        </div>

        {/* Main Form */}
        <div className="civic-card p-6 sm:p-8 rounded-2xl shadow-xl">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isRegister && (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Anbuselvan K"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="citizen.anbu@gmail.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Mobile Phone (Optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 97890 12345"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 flex items-center justify-center space-x-2 transition-all mt-6"
            >
              <span>{loading ? 'Processing...' : (isRegister ? 'Register Account' : 'Sign In')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button onClick={() => setIsRegister(false)} className="text-sky-400 font-semibold hover:underline">
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button onClick={() => setIsRegister(true)} className="text-sky-400 font-semibold hover:underline">
                  Create Account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
