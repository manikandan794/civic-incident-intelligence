import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Upload, Camera, Video, MapPin, Navigation, Search, Check,
  AlertTriangle, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw,
  Info, Sparkles, FileText, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import MapComponent from '../components/MapComponent';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

// Known Tamil Nadu Locations for quick search
const TN_LOCATIONS = [
  { name: "Royapuram Market, Zone 5 (Chennai)", lat: 13.1077, lng: 80.2934, hint: "Near Anchor UG-1001 (22m distance)" },
  { name: "Anna Salai / Central (Chennai)", lat: 13.0827, lng: 80.2707, hint: "Greater Chennai Corporation" },
  { name: "Anna Nagar Roundtana, Zone 8 (Chennai)", lat: 13.0850, lng: 80.2101, hint: "Ward 114" },
  { name: "Mylapore Luz Church Road (Chennai)", lat: 13.0368, lng: 80.2676, hint: "Near Resolved UG-0985" },
  { name: "Sanatorium Main Road (Tambaram)", lat: 12.9345, lng: 80.1250, hint: "Ward 32, Tambaram Corporation" },
  { name: "Kenikarai Market (Ramanathapuram)", lat: 9.3639, lng: 78.8395, hint: "Ward 7, Ramanathapuram Municipality" },
  { name: "Gandhipuram Central (Coimbatore)", lat: 11.0168, lng: 76.9680, hint: "Ward 22, Coimbatore Corporation" },
];

export default function ReportFlow() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Multi-step progress: 1: Media, 2: Description, 3: Location, 4: Review/Submit
  const [step, setStep] = useState(1);

  // Form State
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState('image');
  const [fileSize, setFileSize] = useState(0);

  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Location State (Tamil Nadu Default: Chennai center)
  const [locationMethod, setLocationMethod] = useState('map'); // 'gps', 'map', 'search'
  const [latitude, setLatitude] = useState(13.1077);
  const [longitude, setLongitude] = useState(80.2934);
  const [address, setAddress] = useState('Near Royapuram Market, Zone 5, Chennai, Tamil Nadu');
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-check duplicate state
  const [duplicatePreview, setDuplicatePreview] = useState(null);

  // Submission & Progress state
  const [submitting, setSubmitting] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Recurring issue prompt state
  const [recurringCandidate, setRecurringCandidate] = useState(null);

  // Check if loaded with ?demo=true for Golden 50m flow
  useEffect(() => {
    if (searchParams.get('demo') === 'true') {
      loadGoldenDemoData();
    }
  }, [searchParams]);

  const loadGoldenDemoData = async () => {
    // Royapuram coordinates 22 meters from Anchor UG-1001 (13.1075, 80.2934)
    setLatitude(13.1077);
    setLongitude(80.2934);
    setAddress("Royapuram High Road, Zone 5, Chennai, Tamil Nadu");
    setDescription("Large pothole causing serious hazard to two-wheelers and vehicles near the market junction.");
    setSelectedCategory("Pothole");

    // Fetch sample pothole image as file
    try {
      const resp = await fetch('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&q=80');
      const blob = await resp.blob();
      const demoFile = new File([blob], "demo_pothole_evidence.jpg", { type: "image/jpeg" });
      setFile(demoFile);
      setFilePreview(URL.createObjectURL(demoFile));
      setFileType('image');
      setFileSize(demoFile.size);
    } catch (e) {
      // fallback placeholder
    }
    setStep(3); // Jump to location to show 50m proximity
  };

  // Handle File Input
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.size > 50 * 1024 * 1024) {
      alert("File size exceeds 50MB limit");
      return;
    }

    setFile(selected);
    setFileSize(selected.size);
    const isVid = selected.type.includes('video');
    setFileType(isVid ? 'video' : 'image');
    setFilePreview(URL.createObjectURL(selected));
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    setFileSize(0);
  };

  // Location Method A: Browser Geolocation
  const handleUseCurrentLocation = () => {
    setLocatingGPS(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser");
      setLocatingGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setAddress(`Device GPS Fix: Lat ${position.coords.latitude.toFixed(4)}, Lng ${position.coords.longitude.toFixed(4)}`);
        setLocatingGPS(false);
        setLocationMethod('gps');
      },
      (err) => {
        setGpsError(`GPS Access: ${err.message}. You can still choose your location on the map below.`);
        setLocatingGPS(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Location Method B: Map Drag
  const handleMarkerDragEnd = (newLat, newLng) => {
    setLatitude(newLat);
    setLongitude(newLng);
    setAddress(`Pinned on Map: Coordinates (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`);
    setLocationMethod('map');
  };

  // Location Method C: Search selection
  const handleSelectSearchLoc = (loc) => {
    setLatitude(loc.lat);
    setLongitude(loc.lng);
    setAddress(loc.name);
    setLocationMethod('search');
  };

  // Pre-check active complaints within 50m radius
  useEffect(() => {
    async function runDuplicatePreview() {
      if (!latitude || !longitude) return;
      try {
        const res = await apiRequest('/complaints/check-duplicate', {
          method: 'POST',
          body: JSON.stringify({
            latitude,
            longitude,
            category: selectedCategory || null,
            description: description || null
          })
        });
        setDuplicatePreview(res);
        if (res.has_resolved_past_issue && res.resolved_matches?.length > 0) {
          setRecurringCandidate(res.resolved_matches[0]);
        } else {
          setRecurringCandidate(null);
        }
      } catch (err) {
        console.error("Duplicate preview error:", err);
      }
    }
    const timer = setTimeout(runDuplicatePreview, 600);
    return () => clearTimeout(timer);
  }, [latitude, longitude, selectedCategory]);

  // Final Submission Pipeline with Realtime Checklist
  const handleSubmitReport = async (isRecurringConfirmed = false, parentTicketId = null) => {
    if (!file && !filePreview) {
      alert("Please upload visual evidence (photo or video)");
      setStep(1);
      return;
    }
    if (!description || description.trim().length < 5) {
      alert("Please provide a description of the civic issue");
      setStep(2);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setProgressStage(1);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('address', address);
    formData.append('selected_category', selectedCategory);
    formData.append('citizen_name', user?.full_name || 'Citizen Reporter');
    formData.append('citizen_phone', user?.phone || '');
    if (isRecurringConfirmed && parentTicketId) {
      formData.append('is_recurring_confirmed', 'true');
      formData.append('parent_ticket_id', parentTicketId.toString());
    }

    // Honest progress simulation steps matching backend execution
    const interval = setInterval(() => {
      setProgressStage((prev) => (prev < 5 ? prev + 1 : prev));
    }, 1200);

    try {
      const result = await apiRequest('/complaints/submit', {
        method: 'POST',
        body: formData,
      });
      clearInterval(interval);
      setProgressStage(6);
      setTimeout(() => {
        setSubmissionResult(result);
        setSubmitting(false);
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setSubmitError(err.message || 'Submission failed');
      setSubmitting(false);
    }
  };

  const progressLabels = [
    "Preparing evidence...",
    "Uploading photo/video payload to secure municipal server...",
    "Executing Multimodal Gemini Vision AI analysis...",
    "Scanning PostgreSQL / PostGIS 50m spatial perimeter...",
    "Calculating multi-signal deduplication & priority matrix...",
    "Routing to Municipal Ward & notifying Officer...",
    "Dispatch finalized!"
  ];

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-3xl mx-auto">
        {/* Step Indicator */}
        {!submissionResult && !submitting && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-400">
              <span className={step >= 1 ? 'text-sky-400 font-bold' : ''}>1. MEDIA EVIDENCE</span>
              <span className={step >= 2 ? 'text-sky-400 font-bold' : ''}>2. DESCRIPTION</span>
              <span className={step >= 3 ? 'text-sky-400 font-bold' : ''}>3. LOCATION (50m)</span>
              <span className={step >= 4 ? 'text-sky-400 font-bold' : ''}>4. VERIFICATION</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Submitting Honest Progress Screen */}
        {submitting && (
          <div className="civic-card p-8 rounded-2xl text-center shadow-2xl border-sky-500/30">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-sky-950/80 border border-sky-600/50 flex items-center justify-center relative">
              <Sparkles className="w-8 h-8 text-sky-400 animate-spin" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Analyzing Grievance</h2>
            <p className="text-sm text-sky-400 font-mono mb-8">
              {progressLabels[progressStage]}
            </p>

            <div className="space-y-3 max-w-md mx-auto text-left text-xs font-mono">
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${progressStage >= 1 ? 'bg-sky-950/40 border-sky-700/60 text-sky-200' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                <span>1. Photographic Evidence Payload</span>
                {progressStage >= 1 && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${progressStage >= 2 ? 'bg-sky-950/40 border-sky-700/60 text-sky-200' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                <span>2. Vision AI Multimodal Defect Analysis</span>
                {progressStage >= 2 && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${progressStage >= 3 ? 'bg-sky-950/40 border-sky-700/60 text-sky-200' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                <span>3. PostGIS 50m Radius Proximity Filter</span>
                {progressStage >= 3 && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${progressStage >= 4 ? 'bg-sky-950/40 border-sky-700/60 text-sky-200' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                <span>4. Multi-Signal Deduplication & Priority Scoring</span>
                {progressStage >= 4 && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${progressStage >= 5 ? 'bg-sky-950/40 border-sky-700/60 text-sky-200' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                <span>5. Municipal Ward Routing & Dispatch Order</span>
                {progressStage >= 5 && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>
          </div>
        )}

        {/* Final Submission Result State */}
        {submissionResult && (
          <div className="civic-card p-6 sm:p-8 rounded-2xl shadow-2xl border-slate-700">
            {/* DUPLICATE DETECTED RESULT */}
            {submissionResult.is_duplicate ? (
              <div>
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 mb-6 flex items-start space-x-3.5">
                  <div className="p-2 rounded-lg bg-amber-900/60 border border-amber-600 shrink-0">
                    <ShieldCheck className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider mb-1">
                      EXISTING COMPLAINT FOUND — DUPLICATE MERGED
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      Merged with Master Ticket: {submissionResult.ticket_number}
                    </h2>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      {submissionResult.message}
                    </p>
                  </div>
                </div>

                {/* Evidence Metrics Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono text-center">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Distance</div>
                    <div className="text-lg font-bold text-sky-400">{submissionResult.distance_meters}m</div>
                    <div className="text-[10px] text-slate-500">&lt;= 50m radius</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Duplicate Score</div>
                    <div className="text-lg font-bold text-emerald-400">{submissionResult.duplicate_score}%</div>
                    <div className="text-[10px] text-slate-500">Confidence</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Total Reports</div>
                    <div className="text-lg font-bold text-purple-400">{submissionResult.details?.total_reports || 2}</div>
                    <div className="text-[10px] text-slate-500">Supporting Citations</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Priority Escalated</div>
                    <div className="text-lg font-bold text-red-400">{submissionResult.details?.new_priority || 'HIGH'}</div>
                    <div className="text-[10px] text-slate-500">From {submissionResult.details?.old_priority || 'MEDIUM'}</div>
                  </div>
                </div>

                {/* Signal Breakdown */}
                {submissionResult.details?.breakdown && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 mb-6 text-xs font-mono">
                    <div className="text-slate-400 font-bold mb-2 flex items-center justify-between">
                      <span>EXPLAINABLE DEDUPLICATION EVIDENCE BREAKDOWN:</span>
                      <span className="text-sky-400">50m Spatial Boundary Active</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>Spatial Proximity (30% weight): <span className="font-bold text-sky-400">{submissionResult.details.breakdown.spatial_score}%</span></div>
                      <div>Visual Evidence (40% weight): <span className="font-bold text-sky-400">{submissionResult.details.breakdown.visual_score}%</span></div>
                      <div>Description Overlap (20% weight): <span className="font-bold text-sky-400">{submissionResult.details.breakdown.text_score}%</span></div>
                      <div>Category Concordance (10% weight): <span className="font-bold text-sky-400">{submissionResult.details.breakdown.category_score}%</span></div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={`/citizen/ticket/${submissionResult.ticket_number}`}
                    className="flex-1 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm text-center transition-colors shadow-lg shadow-sky-600/30"
                  >
                    View Master Complaint Timeline
                  </Link>
                  <button
                    onClick={() => {
                      setSubmissionResult(null);
                      setStep(1);
                      removeFile();
                      setDescription('');
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                  >
                    Report Another Grievance
                  </button>
                </div>
              </div>
            ) : (
              /* NEW DISTINCT COMPLAINT RESULT */
              <div>
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 mb-6 flex items-start space-x-3.5">
                  <div className="p-2 rounded-lg bg-emerald-900/60 border border-emerald-600 shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                  </div>
                  <div>
                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase tracking-wider mb-1">
                      NEW CIVIC TICKET REGISTERED & DISPATCHED
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      Ticket ID: {submissionResult.ticket_number}
                    </h2>
                    <p className="text-xs text-emerald-200/90 leading-relaxed">
                      {submissionResult.message}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 font-mono text-center">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Category</div>
                    <div className="text-sm font-bold text-white">{submissionResult.details?.category || 'Civic Issue'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Severity</div>
                    <div className="text-sm font-bold text-amber-400">{submissionResult.details?.severity || 'HIGH'}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">Ward</div>
                    <div className="text-sm font-bold text-sky-400">Ward {submissionResult.details?.ward_number || 12}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-xs text-slate-400">City</div>
                    <div className="text-sm font-bold text-slate-200">{submissionResult.details?.city || 'Chennai'}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={`/citizen/ticket/${submissionResult.ticket_number}`}
                    className="flex-1 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm text-center transition-colors shadow-lg shadow-sky-600/30"
                  >
                    Track Public Status Timeline
                  </Link>
                  <button
                    onClick={() => {
                      setSubmissionResult(null);
                      setStep(1);
                      removeFile();
                      setDescription('');
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                  >
                    Report Another Grievance
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: MEDIA UPLOAD */}
        {!submitting && !submissionResult && step === 1 && (
          <div className="civic-card p-6 sm:p-8 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Step 1: Upload Civic Evidence</h2>
                <p className="text-xs text-slate-400">
                  Visual proof is the primary input for Gemini Vision AI verification
                </p>
              </div>
              <button
                type="button"
                onClick={loadGoldenDemoData}
                className="px-3 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-300 text-xs font-semibold flex items-center space-x-1"
                title="Prefills 50m duplicate pothole test data"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Prefill 50m Demo</span>
              </button>
            </div>

            {/* Media Dropzone */}
            {!filePreview ? (
              <label className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/40 hover:bg-slate-900/80">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-sky-950/80 border border-sky-800 flex items-center justify-center mb-4 text-sky-400">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="text-sm font-semibold text-white mb-1">
                  Click or drag photo/video here
                </div>
                <div className="text-xs text-slate-400">
                  Supports JPG, PNG, WEBP, MP4 (Max 50MB)
                </div>
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                {fileType === 'video' ? (
                  <video src={filePreview} controls className="w-full h-72 object-cover" />
                ) : (
                  <img src={filePreview} alt="Civic defect preview" className="w-full h-72 object-cover" />
                )}
                <div className="absolute top-3 right-3 flex items-center space-x-2">
                  <label className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-xs font-semibold text-white cursor-pointer shadow-lg backdrop-blur-sm border border-slate-700">
                    Replace
                    <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                  </label>
                  <button
                    onClick={removeFile}
                    className="p-1.5 rounded-lg bg-red-950/90 hover:bg-red-900 text-red-400 shadow-lg border border-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-xs flex justify-between text-slate-400 font-mono">
                  <span>File: {file?.name || 'Evidence photo'}</span>
                  <span>Size: {(fileSize / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                disabled={!filePreview}
                onClick={() => setStep(2)}
                className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all ${
                  filePreview
                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Continue to Description</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DESCRIPTION */}
        {!submitting && !submissionResult && step === 2 && (
          <div className="civic-card p-6 sm:p-8 rounded-2xl shadow-xl">
            <h2 className="text-xl font-bold text-white mb-1">Step 2: Describe the Problem</h2>
            <p className="text-xs text-slate-400 mb-6">
              Provide context to assist AI classification and field dispatch teams
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Problem Description <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Large pothole near the main market road junction causing difficulty and danger for two-wheelers..."
                className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <div className="flex justify-between items-center mt-1.5 text-xs text-slate-500">
                <span>Natural language will be processed by AI</span>
                <span>{description.length} characters</span>
              </div>
            </div>

            {/* Optional Category Override */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Issue Category <span className="text-slate-500 font-normal">(Optional — AI detects this automatically)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {['Pothole', 'Garbage Overflow', 'Water Leakage', 'Broken Streetlight', 'Drainage', 'Road Damage'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      selectedCategory === cat
                        ? 'bg-sky-950/80 border-sky-500 text-sky-300 font-semibold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                disabled={description.trim().length < 5}
                onClick={() => setStep(3)}
                className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all ${
                  description.trim().length >= 5
                    ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Continue to Location</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION SYSTEM (3 METHODS) */}
        {!submitting && !submissionResult && step === 3 && (
          <div className="civic-card p-6 sm:p-8 rounded-2xl shadow-xl">
            <h2 className="text-xl font-bold text-white mb-1">Step 3: Pin Complaint Location</h2>
            <p className="text-xs text-slate-400 mb-6">
              Essential for 50-meter active deduplication and municipal ward assignment
            </p>

            {/* 3 Location Methods Tab Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locatingGPS}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
                  locationMethod === 'gps'
                    ? 'bg-sky-950/80 border-sky-500 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Navigation className={`w-4 h-4 ${locatingGPS ? 'animate-spin text-sky-400' : ''}`} />
                <span>{locatingGPS ? 'Getting GPS Fix...' : 'Use Current Location'}</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationMethod('map')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
                  locationMethod === 'map'
                    ? 'bg-sky-950/80 border-sky-500 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Select on Map</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationMethod('search')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-colors ${
                  locationMethod === 'search'
                    ? 'bg-sky-950/80 border-sky-500 text-sky-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Search Tamil Nadu Locality</span>
              </button>
            </div>

            {gpsError && (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300 text-xs mb-4">
                {gpsError}
              </div>
            )}

            {/* Search Location Selector */}
            {locationMethod === 'search' && (
              <div className="mb-4 space-y-2">
                <div className="text-xs text-slate-400 font-semibold">Choose Tamil Nadu Ward / Locality:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TN_LOCATIONS.map((loc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectSearchLoc(loc)}
                      className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500 text-left text-xs transition-colors"
                    >
                      <div className="font-semibold text-white">{loc.name}</div>
                      <div className="text-[10px] text-sky-400 mt-0.5">{loc.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Leaflet Map Centered on Tamil Nadu */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold">Interactive Tamil Nadu Operations Map:</span>
                <span className="text-sky-400 font-mono">Drag marker to exact defect point</span>
              </div>
              <MapComponent
                center={[latitude, longitude]}
                zoom={14}
                style={{ height: '320px', width: '100%' }}
                draggableMarker={{ lat: latitude, lng: longitude }}
                onMarkerDragEnd={handleMarkerDragEnd}
                radiusCircle={{
                  center: [latitude, longitude],
                  radius: 50,
                  color: '#38BDF8',
                  fillColor: '#0284C7'
                }}
              />
            </div>

            {/* Selected Coordinates & Address Card */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 mb-6 text-xs font-mono space-y-1">
              <div className="text-slate-400 flex items-center justify-between">
                <span>Selected Complaint Coordinates:</span>
                <span className="text-sky-400 font-bold">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
              </div>
              <div className="text-slate-300">
                <span className="text-slate-500">Resolved Location: </span>
                {address}
              </div>
            </div>

            {/* Proximity Pre-check Feedback */}
            {duplicatePreview && duplicatePreview.has_active_duplicate && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 mb-6 flex items-start space-x-2.5 text-xs text-amber-200">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300">50m Spatial Proximity Match Detected:</strong>
                  <br />
                  Active ticket <strong>{duplicatePreview.active_matches[0]?.ticket_number}</strong> ({duplicatePreview.active_matches[0]?.category}) is located within{' '}
                  <strong>{duplicatePreview.active_matches[0]?.distance_meters} meters</strong>.
                  Upon submission, your report will be merged as supporting evidence to escalate urgency!
                </div>
              </div>
            )}

            {/* Recurring Issue Detected Card */}
            {recurringCandidate && (
              <div className="p-4 rounded-xl bg-blue-950/60 border border-blue-500/50 mb-6 text-xs text-blue-200">
                <div className="font-bold text-white text-sm mb-1">
                  Previous Resolved Grievance Found at this Site
                </div>
                <p className="text-slate-300 mb-3">
                  A complaint for <strong>{recurringCandidate.category} ({recurringCandidate.ticket_number})</strong> was previously resolved within {recurringCandidate.distance_meters}m of this location.
                </p>
                <div className="text-xs font-semibold text-sky-300 mb-2">
                  Is this the same physical issue recurring again?
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSubmitReport(true, recurringCandidate.complaint_id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                  >
                    YES — REPORT AGAIN (Link to {recurringCandidate.ticket_number})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
                  >
                    NO — NEW ISSUE
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center space-x-2 shadow-lg shadow-sky-600/30 transition-all"
              >
                <span>Review & Submit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & FINAL SUBMISSION */}
        {!submitting && !submissionResult && step === 4 && (
          <div className="civic-card p-6 sm:p-8 rounded-2xl shadow-xl">
            <h2 className="text-xl font-bold text-white mb-1">Step 4: Review Grievance Summary</h2>
            <p className="text-xs text-slate-400 mb-6">
              Verify all details before initiating the automated AI analysis and dispatch engine
            </p>

            <div className="space-y-4 mb-6">
              {/* Media Thumbnail */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
                <img src={filePreview} alt="Evidence" className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
                <div className="text-xs">
                  <div className="font-semibold text-white">Visual Evidence</div>
                  <div className="text-slate-400">{file?.name || 'Evidence photo'}</div>
                  <div className="text-sky-400 font-mono mt-0.5">Ready for Multimodal Vision AI</div>
                </div>
              </div>

              {/* Description */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div className="font-semibold text-slate-400 mb-1">Problem Description:</div>
                <div className="text-slate-200">{description}</div>
              </div>

              {/* Location */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Location Coordinates:</span>
                  <span className="text-sky-400">{latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-500">Address: </span>
                  {address}
                </div>
              </div>

              {/* Deduplication Status Preview */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Autonomous Deduplication Engine:</div>
                  <div className="text-slate-400 text-[11px]">
                    Active 50m radius search will be performed upon submission
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-sky-950 text-sky-400 border border-sky-800 font-mono font-bold">
                  50m Active
                </span>
              </div>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-700 text-red-300 text-xs mb-6">
                Submission Error: {submitError}
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => handleSubmitReport(false, null)}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-sky-600/30 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
              >
                <ShieldCheck className="w-5 h-5 text-white" />
                <span>SUBMIT CIVIC REPORT</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
