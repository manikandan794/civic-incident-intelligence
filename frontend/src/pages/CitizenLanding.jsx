import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Search, MapPin, Sparkles, CheckCircle2,
  TrendingUp, Shield, Clock, Compass, Layers, ArrowRight, Zap
} from 'lucide-react';

export default function CitizenLanding() {
  const [ticketSearch, setTicketSearch] = useState('');
  const navigate = useNavigate();

  const handleTrack = (e) => {
    e.preventDefault();
    if (ticketSearch.trim()) {
      navigate(`/citizen/ticket/${ticketSearch.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100">
      {/* Golden Demo Spotlight Alert Banner */}
      <div className="bg-gradient-to-r from-blue-900/60 via-sky-900/50 to-indigo-950/60 border-b border-sky-700/50 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span className="font-semibold text-sky-200">
              COMPETITION GOLDEN DEMO FLOW READY:
            </span>
            <span className="text-slate-300">
              Active Anchor Ticket <strong>UG-1001</strong> (Royapuram Pothole) is loaded in PostgreSQL.
            </span>
          </div>
          <Link
            to="/citizen/report?demo=true"
            className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-md transition-colors flex items-center space-x-1 shrink-0"
          >
            <span>Launch 50m Live Duplicate Test</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-sky-950/80 border border-sky-800/80 text-sky-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Tamil Nadu Municipal Operations &bull; Realtime AI Grievance Network</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Smart Civic Issue Reporting with{' '}
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Autonomous 50m Deduplication
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Eliminate municipal backlog and citizen frustration. UrbanGrid combines multimodal Vision AI with high-precision PostGIS spatial proximity to merge duplicate reports within 50 meters, escalate collective priority, and dispatch field crews automatically.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              to="/citizen/report"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-base shadow-lg shadow-sky-600/30 flex items-center justify-center space-x-2.5 transition-all transform hover:-translate-y-0.5"
            >
              <AlertTriangle className="w-5 h-5 text-white" />
              <span>Report a Civic Issue Now</span>
            </Link>

            <Link
              to="/citizen/my-reports"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-base border border-slate-700/80 flex items-center justify-center space-x-2 transition-colors"
            >
              <Compass className="w-5 h-5 text-slate-400" />
              <span>Track Active Reports</span>
            </Link>
          </div>

          {/* Quick Track Input */}
          <div className="max-w-md mx-auto bg-slate-900/90 border border-slate-800 rounded-xl p-2 shadow-xl">
            <form onSubmit={handleTrack} className="flex items-center">
              <div className="pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter Ticket ID (e.g. UG-1001)..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full bg-transparent border-0 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold text-xs rounded-lg transition-colors shrink-0"
              >
                Track Status
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Key Metrics Row */}
      <section className="border-y border-slate-800/80 bg-slate-950/60 py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className="text-3xl font-extrabold font-mono text-sky-400 mb-1">50 METERS</div>
            <div className="text-xs text-slate-400 font-medium">Standard Duplicate Spatial Radius</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className="text-3xl font-extrabold font-mono text-emerald-400 mb-1">&lt; 10 SEC</div>
            <div className="text-xs text-slate-400 font-medium">AI Analysis & Ward Dispatch Speed</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className="text-3xl font-extrabold font-mono text-cyan-400 mb-1">4 SIGNALS</div>
            <div className="text-xs text-slate-400 font-medium">Spatial + Vision + Text + Category</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className="text-3xl font-extrabold font-mono text-amber-400 mb-1">100% AUDIT</div>
            <div className="text-xs text-slate-400 font-medium">Full Public Timeline & Verification</div>
          </div>
        </div>
      </section>

      {/* Core Engineering Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Why Municipal Corporations Need UrbanGrid
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Traditional grievance systems create separate duplicate tickets for every citizen call, paralyzing field teams. UrbanGrid aggregates multiple voices into single actionable work orders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="civic-card p-6 rounded-xl hover:border-sky-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-sky-950/80 border border-sky-800 flex items-center justify-center mb-4">
              <MapPin className="w-6 h-6 text-sky-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">50m Spatial Radius Clustering</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Native PostgreSQL / PostGIS spatial math ensures that complaints outside the 50m radius are strictly preserved as distinct, while nearby reports merge into master tickets.
            </p>
            <div className="text-xs text-sky-400 font-mono font-semibold">Weight: 30% Spatial Evidence</div>
          </div>

          <div className="civic-card p-6 rounded-xl hover:border-sky-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-purple-950/80 border border-purple-800 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Gemini Multimodal Vision AI</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Server-side vision models analyze photographic evidence in real-time, detecting asphalt depth, garbage volume, electrical hazards, and water leakage severity.
            </p>
            <div className="text-xs text-purple-400 font-mono font-semibold">Weight: 40% Visual Evidence</div>
          </div>

          <div className="civic-card p-6 rounded-xl hover:border-sky-500/50 transition-all">
            <div className="w-12 h-12 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Dynamic Priority Escalation</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              As multiple citizens report the same issue, the priority automatically escalates from MEDIUM to HIGH and CRITICAL, moving urgent work to the top of the Ward Officer queue.
            </p>
            <div className="text-xs text-emerald-400 font-mono font-semibold">Collective Citizen Urgency</div>
          </div>
        </div>
      </section>
    </div>
  );
}
