import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  FileText, Camera, Video, MapPin, Search, Crosshair, CheckCircle2,
  AlertTriangle, ArrowLeft, ArrowRight, X, Upload, Loader2, Sparkles,
  ShieldCheck, Info, Compass
} from 'lucide-react';
import MapComponent from '../components/MapComponent';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

const REPORT_TYPES = [
  'Issue Still Exists',
  'Issue Has Worsened',
  'Work In Progress',
  'Work Completed',
  'Work Quality Concern',
  'Incorrect Resolution',
  'Additional Evidence',
  'Repeated Issue',
  'Safety Concern',
  'Other'
];

export default function CitizenEvidenceForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form Fields
  const [ticketId, setTicketId] = useState(searchParams.get('ticket') || '');
  const [ticketValidated, setTicketValidated] = useState(null);
  const [validatingTicket, setValidatingTicket] = useState(false);
  const [reportType, setReportType] = useState('Issue Still Exists');
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState(user?.full_name || '');
  const [citizenPhone, setCitizenPhone] = useState(user?.phone || '');

  // Media
  const [photos, setPhotos] = useState([]); // array of File
  const [photoPreviews, setPhotoPreviews] = useState([]); // array of base64/url
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  // Location
  const [locationName, setLocationName] = useState('Chennai Municipal Area');
  const [latitude, setLatitude] = useState(13.0827);
  const [longitude, setLongitude] = useState(80.2707);
  const [locSearchQuery, setLocSearchQuery] = useState('');
  const [locSearchResults, setLocSearchResults] = useState([]);
  const [locSearching, setLocSearching] = useState(false);

  // State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(null); // holds report response

  // Refs for hidden inputs
  const photoCameraInputRef = useRef(null);
  const photoGalleryInputRef = useRef(null);
  const videoCameraInputRef = useRef(null);
  const videoGalleryInputRef = useRef(null);

  // Validate Ticket ID if provided
  const handleValidateTicket = async () => {
    if (!ticketId.trim()) {
      setTicketValidated(null);
      return;
    }
    setValidatingTicket(true);
    setTicketValidated(null);
    setError(null);
    try {
      const data = await apiRequest(`/complaints/check/${ticketId.trim().toUpperCase()}`);
      if (data && data.exists) {
        setTicketValidated({
          valid: true,
          ticketNumber: data.ticket_number,
          category: data.category,
          status: data.status,
          locationName: data.location_name
        });
        if (data.latitude && data.longitude) {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
          setLocationName(data.location_name || locationName);
        }
      } else {
        setTicketValidated({ valid: false, message: 'Ticket not found. Please check the ticket ID.' });
      }
    } catch (err) {
      setTicketValidated({ valid: false, message: err.message || 'Ticket not found. Please check ticket ID.' });
    } finally {
      setValidatingTicket(false);
    }
  };

  // Location Method 1: GPS
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocationName(`GPS Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
      },
      (err) => {
        setError('Location access denied. Please click on the map or search location.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Location Method 2: Map Click / Drag
  const handleMapLocationChange = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationName(`Selected Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  };

  // Location Method 3: Search Location (Nominatim API via backend)
  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!locSearchQuery.trim()) return;
    setLocSearching(true);
    setError(null);
    try {
      const results = await apiRequest(`/complaints/search-location?query=${encodeURIComponent(locSearchQuery)}`);
      setLocSearchResults(results || []);
      if (!results || results.length === 0) {
        setError('No municipal locations found for this query. Try adding district name (e.g. "Royapuram Chennai").');
      }
    } catch (err) {
      setError('Location search temporarily unavailable. You can click directly on the map.');
    } finally {
      setLocSearching(false);
    }
  };

  const selectSearchResult = (item) => {
    setLatitude(item.latitude);
    setLongitude(item.longitude);
    setLocationName(item.display_name);
    setLocSearchResults([]);
    setLocSearchQuery('');
  };

  // Photo handlers
  const handleAddPhotos = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    // Max 5 photos
    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);

    // Create previews
    const newPreviews = newPhotos.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(newPreviews);
  };

  const handleRemovePhoto = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    setPhotoPreviews(newPreviews);
  };

  // Video handlers
  const handleAddVideo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Video file size must be under 25MB');
      return;
    }

    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleRemoveVideo = () => {
    setVideo(null);
    setVideoPreview(null);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a description of the observed issue or work status.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      if (ticketId.trim()) formData.append('ticket_id', ticketId.trim().toUpperCase());
      formData.append('report_type', reportType);
      formData.append('description', description);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('location_name', locationName);
      if (citizenName) formData.append('citizen_name', citizenName);
      if (citizenPhone) formData.append('citizen_phone', citizenPhone);

      // Photos
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      // Video
      if (video) {
        formData.append('video', video);
      }

      const res = await apiRequest('/evidence-reports/submit', {
        method: 'POST',
        body: formData
      });

      setSubmissionSuccess(res);
    } catch (err) {
      setError(err.message || 'Failed to submit evidence report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Success Screen
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-[#070D18] py-12 px-4 sm:px-6 lg:px-8 text-slate-100 flex items-center justify-center">
        <div className="max-w-lg w-full bg-[#0B1528] border border-sky-800/60 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="text-[10px] font-bold tracking-wider text-sky-400 uppercase font-mono">
            MUNICIPAL EVIDENCE LOGGED
          </span>
          <h2 className="text-2xl font-extrabold text-white mt-1 mb-2">
            Report Submitted Successfully
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            Your evidence report has been routed to the Municipal Ward Operations Center for review. An officer will inspect the attachments and update the relevant grievance.
          </p>

          {/* Reference Card */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 text-left font-mono text-xs space-y-2 mb-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400">Report Reference:</span>
              <span className="font-bold text-sky-400 text-sm">{submissionSuccess.report_id}</span>
            </div>
            {submissionSuccess.related_ticket && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Related Ticket:</span>
                <span className="font-bold text-white">{submissionSuccess.related_ticket}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Report Type:</span>
              <span className="text-slate-200">{submissionSuccess.report_type}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Current Status:</span>
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/80 font-bold">
                {submissionSuccess.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Attachments:</span>
              <span className="text-slate-200">{submissionSuccess.attachments_count} Files Logged</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to="/citizen/my-reports"
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors"
            >
              <Compass className="w-4 h-4" />
              <span>Track My Reports</span>
            </Link>

            <button
              onClick={() => {
                setSubmissionSuccess(null);
                setDescription('');
                setPhotos([]);
                setPhotoPreviews([]);
                setVideo(null);
                setVideoPreview(null);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Submit Another Evidence Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070D18] py-8 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="max-w-4xl mx-auto">
        {/* Header Strip */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/citizen"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Citizen Portal</span>
          </Link>

          <div className="flex items-center space-x-1 text-[11px] text-sky-400 font-mono bg-sky-950/60 border border-sky-800/60 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            <span>Citizen Evidence Module</span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Submit Evidence / Field Update
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Upload on-site evidence, progress photos, or quality feedback regarding municipal works. Reports reach the municipal officer directly for review and verification dispatch.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs mb-6 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Ticket Association & Report Type */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-sky-400 flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>1. Grievance Association &amp; Category</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Optional Ticket ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Related Ticket ID (Optional)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => {
                      setTicketId(e.target.value.toUpperCase());
                      setTicketValidated(null);
                    }}
                    placeholder="e.g. UG-1001"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleValidateTicket}
                    disabled={validatingTicket || !ticketId.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50"
                  >
                    {validatingTicket ? 'Checking...' : 'Verify'}
                  </button>
                </div>
                {ticketValidated && (
                  <div className={`mt-2 text-xs p-2 rounded-lg ${
                    ticketValidated.valid
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-red-950/60 border border-red-800 text-red-300'
                  }`}>
                    {ticketValidated.valid ? (
                      <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Found: {ticketValidated.ticketNumber} &bull; {ticketValidated.category} ({ticketValidated.status})</span>
                      </div>
                    ) : (
                      <span>{ticketValidated.message}</span>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  If reporting follow-up on an existing complaint, enter its ID.
                </p>
              </div>

              {/* Report Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Report Type / Purpose <span className="text-red-400">*</span>
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  {REPORT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Indicate the nature of your observation or field update.
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Detailed Observation / Description <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe current site conditions, whether work was completed properly, or what defects remain visible..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Section 2: Photo & Video Upload (Mobile friendly) */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-sky-400 flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>2. Visual Evidence (Photos &amp; Video)</span>
            </h2>

            {/* Hidden native inputs for Camera vs Gallery */}
            <input
              type="file"
              ref={photoCameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleAddPhotos}
              className="hidden"
            />
            <input
              type="file"
              ref={photoGalleryInputRef}
              accept="image/*"
              multiple
              onChange={handleAddPhotos}
              className="hidden"
            />
            <input
              type="file"
              ref={videoCameraInputRef}
              accept="video/*"
              capture="environment"
              onChange={handleAddVideo}
              className="hidden"
            />
            <input
              type="file"
              ref={videoGalleryInputRef}
              accept="video/*"
              onChange={handleAddVideo}
              className="hidden"
            />

            {/* Mobile-Friendly Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => photoCameraInputRef.current?.click()}
                className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-sky-300 flex items-center justify-center space-x-2 transition-colors"
              >
                <Camera className="w-4 h-4 text-sky-400" />
                <span>📷 TAKE PHOTO</span>
              </button>

              <button
                type="button"
                onClick={() => photoGalleryInputRef.current?.click()}
                className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center space-x-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>📁 UPLOAD PHOTOS</span>
              </button>

              <button
                type="button"
                onClick={() => videoCameraInputRef.current?.click()}
                className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-purple-300 flex items-center justify-center space-x-2 transition-colors"
              >
                <Video className="w-4 h-4 text-purple-400" />
                <span>🎥 RECORD VIDEO</span>
              </button>

              <button
                type="button"
                onClick={() => videoGalleryInputRef.current?.click()}
                className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center space-x-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>📁 UPLOAD VIDEO</span>
              </button>
            </div>

            {/* Photos Preview Grid */}
            {photoPreviews.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="text-xs font-semibold text-slate-300">
                  Attached Photos ({photoPreviews.length}/5):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {photoPreviews.map((previewUrl, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video">
                      <img src={previewUrl} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600/90 text-white hover:bg-red-500 transition-colors shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Preview */}
            {video && (
              <div className="space-y-1.5 pt-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Attached Video ({(video.size / (1024 * 1024)).toFixed(1)} MB):</span>
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center space-x-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove Video</span>
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 max-w-sm">
                  <video src={videoPreview} controls className="w-full max-h-48 object-cover" />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Location (3 Methods) */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-sky-400 flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>3. Location Evidence</span>
              </h2>

              {/* Method 1: Geolocation button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="px-3 py-1.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-800 text-xs font-semibold text-sky-300 flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Use My Current Location</span>
              </button>
            </div>

            {/* Method 3: Search Location Input */}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locSearchQuery}
                  onChange={(e) => setLocSearchQuery(e.target.value)}
                  placeholder="Search landmark (e.g. Ramanathapuram Bus Stand, Royapuram Market)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleSearchLocation}
                  disabled={locSearching || !locSearchQuery.trim()}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center space-x-1 transition-colors disabled:opacity-50"
                >
                  {locSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Search</span>
                </button>
              </div>

              {/* Search results dropdown */}
              {locSearchResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800">
                  {locSearchResults.map((res, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectSearchResult(res)}
                      className="w-full text-left p-2.5 hover:bg-slate-800 text-xs text-slate-200 transition-colors flex items-start space-x-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-white">{res.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{res.display_name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Current Coordinates Bar */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Location:</span>
                <span className="text-sky-300 font-bold">{locationName}</span>
              </div>
              <div className="text-slate-400">
                Lat: <span className="text-white">{latitude.toFixed(5)}</span> &bull; Lng: <span className="text-white">{longitude.toFixed(5)}</span>
              </div>
            </div>

            {/* Method 2: Interactive Leaflet Map with draggable marker */}
            <MapComponent
              center={[latitude, longitude]}
              zoom={14}
              draggableMarker={{ lat: latitude, lng: longitude }}
              onMarkerDragEnd={handleMapLocationChange}
              onMapClick={handleMapLocationChange}
              style={{ height: '280px', width: '100%' }}
            />
            <p className="text-[11px] text-slate-500">
              Tip: Click anywhere on the map or drag the orange pin to set the exact spot.
            </p>
          </div>

          {/* Citizen Contact Details (Optional) */}
          <div className="bg-[#0B1528] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider text-sky-400">
              4. Citizen Contact (Optional)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Name</label>
                <input
                  type="text"
                  value={citizenName}
                  onChange={(e) => setCitizenName(e.target.value)}
                  placeholder="e.g. S. Murugesan"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(e.target.value)}
                  placeholder="+91 94440 12345"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Municipal Evidence...</span>
                </>
              ) : (
                <>
                  <span>SUBMIT EVIDENCE REPORT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              All submitted evidence is validated and stored permanently in the municipal database.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
