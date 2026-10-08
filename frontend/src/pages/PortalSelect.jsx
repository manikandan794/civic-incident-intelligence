import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Building2,
  HardHat,
  ArrowRight,
  MapPin,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Search,
  Sliders,
  Compass
} from 'lucide-react';

export default function PortalSelect() {
  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Top Bar with Municipal Seal */}
      <header className="border-b border-slate-800/80 bg-[#060B14]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 p-0.5 shadow-lg shadow-sky-500/20">
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
                  TN MUNICIPAL OPS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none">
                Grievance Deduplication & Field Operations Platform
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center space-x-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>PostGIS Spatial Core</span>
            </span>
            <span>&bull;</span>
            <span className="text-sky-400 font-bold">50m Deduplication Active</span>
          </div>
        </div>
      </header>

      {/* Main Role Portal Selection Screen */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-5xl w-full text-center mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-sky-950/70 border border-sky-800/60 text-sky-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Select Operational Role to Proceed</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Municipal Grievance & Field Operations Platform
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Choose your authorized portal. UrbanGrid isolates operational roles while synchronizing live grievance deduplication, worker dispatch, and citizen transparency.
          </p>
        </div>

        {/* The 3 Dedicated Role Cards */}
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. CITIZEN PORTAL */}
          <div className="relative group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/60 p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-sky-500/10">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-sky-500 to-blue-600 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-950/60 border border-sky-800/40 flex items-center justify-center mb-5 text-sky-400 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono mb-1">
                PUBLIC CIVIC ACCESS
              </div>
              <h2 className="text-xl font-bold text-white mb-3">
                CITIZEN PORTAL
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Report civic issues, track complaint resolution status, upload follow-up photo/video evidence, and view public ward updates.
              </p>

              <div className="space-y-2 mb-8 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Report civic issues with photo & GPS</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Real-time ticket tracking (UG-xxxx)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Submit photo/video evidence reports</span>
                </div>
              </div>
            </div>

            <Link
              to="/citizen"
              className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-sky-600/20 transition-colors"
            >
              <span>OPEN CITIZEN PORTAL</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 2. OFFICER PORTAL */}
          <div className="relative group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/60 p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/10">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-600 to-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800/40 flex items-center justify-center mb-5 text-blue-400 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 font-mono mb-1">
                COMMAND &amp; CONTROL
              </div>
              <h2 className="text-xl font-bold text-white mb-3">
                OFFICER PORTAL
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Municipal administration, 50m spatial deduplication queue, field crew dispatch, evidence verification, and telemetry.
              </p>

              <div className="space-y-2 mb-8 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Municipal operations &amp; deduplication</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Field worker assignment &amp; team dispatch</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Verify completion &amp; resolve tickets</span>
                </div>
              </div>
            </div>

            <Link
              to="/admin/login"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 transition-colors"
            >
              <span>OPEN OFFICER PORTAL</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 3. WORKER PORTAL */}
          <div className="relative group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/60 p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-amber-500/10">
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-amber-500 to-orange-600 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center mb-5 text-amber-400 group-hover:scale-105 transition-transform">
                <HardHat className="w-6 h-6" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono mb-1">
                ON-SITE EXECUTION
              </div>
              <h2 className="text-xl font-bold text-white mb-3">
                WORKER PORTAL
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Assigned field operations, live job progress tracking, site verification tasks, and repair completion reporting.
              </p>

              <div className="space-y-2 mb-8 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Receive assigned field repairs</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Live work updates &amp; GPS beaconing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Upload completion photos for officer sign-off</span>
                </div>
              </div>
            </div>

            <Link
              to="/worker/login"
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/20 transition-colors"
            >
              <span>OPEN WORKER PORTAL</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Bottom Features Strip */}
      <footer className="border-t border-slate-800/80 bg-[#040810] py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-slate-300">URBANGRID</span>
            <span>&bull;</span>
            <span>Tamil Nadu Municipal Operations System</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-400">
            <span>50m Spatial Proximity</span>
            <span>&bull;</span>
            <span>Multimodal Vision AI</span>
            <span>&bull;</span>
            <span>Field Team Dispatch</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
