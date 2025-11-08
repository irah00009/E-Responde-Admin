import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getDatabase, ref, onValue, off, update, get, push, set } from 'firebase/database'
import { app, iceServers } from '../firebase'
import { useAuth } from '../providers/AuthProvider'
import StatusTag from './StatusTag'
import MLThreatDetectionService from '../services/mlThreatDetection.js'
import PieChart from './PieChart'
import BarChart from './BarChart'
import ReportSummary from './ReportSummary'
import './Dashboard.css'

function Dashboard({ onNavigateToReport, onNavigateToSOSAlert }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, claims, loading: authLoading } = useAuth()
  const [currentPageImmediate, setCurrentPageImmediate] = useState(1);
  const [currentPageHigh, setCurrentPageHigh] = useState(1);
  const [currentPageModerate, setCurrentPageModerate] = useState(1);
  const [currentPageLow, setCurrentPageLow] = useState(1);
  const [currentPageSmartWatch, setCurrentPageSmartWatch] = useState(1);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [smartWatchSOSAlerts, setSmartWatchSOSAlerts] = useState([]);
  const [smartWatchLoading, setSmartWatchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [highlightedReportId, setHighlightedReportId] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');
  const timeFilterOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'Weekly' },
    { value: 'month', label: 'Monthly' },
    { value: 'all', label: 'All Time' }
  ];
  
  const timeFilterStart = useMemo(() => {
    const now = new Date();
    switch (timeFilter) {
      case 'today': {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      }
      case 'week': {
        const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startOfRange.setDate(startOfRange.getDate() - 7);
        return startOfRange.getTime();
      }
      case 'month': {
        const startOfRange = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startOfRange.setMonth(startOfRange.getMonth() - 1);
        return startOfRange.getTime();
      }
      default:
        return null;
    }
  }, [timeFilter]);
  
  const isWithinTimeFilter = useCallback((dateValue) => {
    if (timeFilter === 'all') {
      return true;
    }
    if (!dateValue) {
      return false;
    }
    const timestamp = new Date(dateValue).getTime();
    if (!Number.isFinite(timestamp)) {
      return false;
    }
    return timestamp >= (timeFilterStart ?? 0);
  }, [timeFilter, timeFilterStart]);
  
  const timeFilteredReports = useMemo(() => {
    return recentSubmissions.filter(report => isWithinTimeFilter(report.date));
  }, [recentSubmissions, isWithinTimeFilter]);
  
  const timeFilteredSmartWatch = useMemo(() => {
    return smartWatchSOSAlerts.filter(alert => isWithinTimeFilter(alert.date));
  }, [smartWatchSOSAlerts, isWithinTimeFilter]);
  
  const filteredSmartWatchSOS = useMemo(() => {
    if (!activeFilter) {
      return timeFilteredSmartWatch;
    }
    return timeFilteredSmartWatch.filter(alert => {
      const status = typeof alert.status === 'string' ? alert.status.toLowerCase() : '';
      switch (activeFilter) {
        case 'pending':
          return status === 'pending' || status === 'under review' || status === 'assigned' || status === 'active';
        case 'received':
          return status === 'received';
        case 'in-progress':
          return status === 'in progress';
        case 'resolved':
          return status === 'resolved' || status === 'case resolved';
        default:
          return true;
      }
    });
  }, [activeFilter, timeFilteredSmartWatch]);
  
  // Threat Detection State - Using ML Cosine Similarity Model
  const [threatDetectionService] = useState(() => new MLThreatDetectionService());
  const [threatAnalysisResults, setThreatAnalysisResults] = useState([]);
  const [isAnalyzingThreats, setIsAnalyzingThreats] = useState(false);
  const [escalatedReports, setEscalatedReports] = useState([]);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [updating, setUpdating] = useState(false);
  const itemsPerPage = 5;
  
  // WebRTC Call State
  const [callState, setCallState] = useState({
    isCalling: false,
    isInCall: false,
    callType: null, // 'civilian' or 'police'
    targetUser: null,
    callId: null
  });
  const [showCallModal, setShowCallModal] = useState(false);
  const [callError, setCallError] = useState('');
  const [callLoading, setCallLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  // Use refs to track previous alert IDs synchronously (for real-time detection)
  const lastReportIdsRef = useRef(new Set());

  // WebRTC refs
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  // Audio refs for sound effects
  const ringingAudioRef = useRef(null);
  const ringingIntervalRef = useRef(null);
  const callConnectedAudioRef = useRef(null);
  const callEndedAudioRef = useRef(null);


  // Filter reports by severity levels
  // Immediate: Only reports with severity="immediate" OR Emergency SOS
  // High/Moderate/Low reports with threatDetected stay in their own sections
  const immediateSeverityReports = timeFilteredReports.filter(submission => {
    const isImmediate = typeof submission.severity === 'string' && submission.severity.toLowerCase() === 'immediate';
    const isEmergencySOS = typeof submission.type === 'string' && submission.type.toLowerCase() === 'emergency sos';
    
    // Only show truly immediate severity or Emergency SOS in Immediate section
    // Don't pull High/Moderate/Low reports here even if they have threats
    const shouldInclude = isImmediate || isEmergencySOS;
    
    if (shouldInclude) {
      console.log(`Including in immediate severity:`, {
        id: submission.id,
        type: submission.type,
        severity: submission.severity,
        reason: isImmediate ? 'immediate severity' : 'emergency sos'
      });
    }
    
    return shouldInclude;
  });

  const highSeverityReports = timeFilteredReports.filter(submission => {
    const isHighSeverity = typeof submission.severity === 'string' && 
                          submission.severity.toLowerCase() === 'high';
    const isEmergencySOS = typeof submission.type === 'string' && 
                         submission.type.toLowerCase() === 'emergency sos';
    // Include high severity reports regardless of threatDetected status
    // But exclude Emergency SOS (should only be in Immediate section)
    return isHighSeverity && !isEmergencySOS;
  });

  const moderateSeverityReports = timeFilteredReports.filter(submission => {
    const isModerateSeverity = typeof submission.severity === 'string' && 
                              submission.severity.toLowerCase() === 'moderate';
    const isEmergencySOS = typeof submission.type === 'string' && 
                           submission.type.toLowerCase() === 'emergency sos';
    // Include moderate severity reports regardless of threatDetected status
    // But exclude Emergency SOS (should only be in Immediate section)
    return isModerateSeverity && !isEmergencySOS;
  });

  const lowSeverityReports = timeFilteredReports.filter(submission => {
    const isLowSeverity = typeof submission.severity === 'string' && 
                         submission.severity.toLowerCase() === 'low';
    const isEmergencySOS = typeof submission.type === 'string' && 
                          submission.type.toLowerCase() === 'emergency sos';
    // Include low severity reports regardless of threatDetected status
    // But exclude Emergency SOS (should only be in Immediate section)
    return isLowSeverity && !isEmergencySOS;
  });

  // Debug logging for severity filtering
  console.log('Severity filtering results:', {
    timeFilter,
    totalReports: timeFilteredReports.length,
    immediateSeverity: immediateSeverityReports.length,
    highSeverity: highSeverityReports.length,
    moderateSeverity: moderateSeverityReports.length,
    lowSeverity: lowSeverityReports.length,
    escalatedReports: escalatedReports.length,
    threatAnalysisResults: threatAnalysisResults.length
  });

  // Filter severity reports based on active filter
  const filteredImmediateSeverity = activeFilter 
    ? immediateSeverityReports.filter(submission => {
        const status = typeof submission.status === 'string' ? submission.status.toLowerCase() : '';
        switch (activeFilter) {
          case 'pending':
            return status === 'pending' || status === 'under review' || status === 'assigned';
          case 'received':
            return status === 'received';
          case 'in-progress':
            return status === 'in progress';
          case 'resolved':
            return status === 'resolved' || status === 'case resolved';
          default:
            return true;
        }
      })
    : immediateSeverityReports;

  const filteredHighSeverity = activeFilter 
    ? highSeverityReports.filter(submission => {
        const status = typeof submission.status === 'string' ? submission.status.toLowerCase() : '';
        switch (activeFilter) {
          case 'pending':
            return status === 'pending' || status === 'under review' || status === 'assigned';
          case 'received':
            return status === 'received';
          case 'in-progress':
            return status === 'in progress';
          case 'resolved':
            return status === 'resolved' || status === 'case resolved';
          default:
            return true;
        }
      })
    : highSeverityReports;

  const filteredModerateSeverity = activeFilter 
    ? moderateSeverityReports.filter(submission => {
        const status = typeof submission.status === 'string' ? submission.status.toLowerCase() : '';
        switch (activeFilter) {
          case 'pending':
            return status === 'pending' || status === 'under review' || status === 'assigned';
          case 'received':
            return status === 'received';
          case 'in-progress':
            return status === 'in progress';
          case 'resolved':
            return status === 'resolved' || status === 'case resolved';
          default:
            return true;
        }
      })
    : moderateSeverityReports;

  const filteredLowSeverity = activeFilter 
    ? lowSeverityReports.filter(submission => {
        const status = typeof submission.status === 'string' ? submission.status.toLowerCase() : '';
        switch (activeFilter) {
          case 'pending':
            return status === 'pending' || status === 'under review' || status === 'assigned';
          case 'received':
            return status === 'received';
          case 'in-progress':
            return status === 'in progress';
          case 'resolved':
            return status === 'resolved' || status === 'case resolved';
          default:
            return true;
        }
      })
    : lowSeverityReports;
  
  const displayStats = (() => {
    const counts = {
      receivedReports: 0,
      pendingReports: 0,
      resolvedReports: 0,
      inProgressReports: 0,
      smartWatchSOSReports: 0
    };

    timeFilteredReports.forEach(report => {
      const status = typeof report.status === 'string' ? report.status.toLowerCase() : '';
      if (status === 'received') {
        counts.receivedReports += 1;
      }
      if (status === 'in progress') {
        counts.inProgressReports += 1;
      }
      if (status === 'pending' || status === 'under review' || status === 'assigned') {
        counts.pendingReports += 1;
      }
      if (status === 'resolved' || status === 'case resolved') {
        counts.resolvedReports += 1;
      }
    });

    counts.smartWatchSOSReports = timeFilteredSmartWatch.length;
    return counts;
  })();


  // Pagination for severity-based reports
  const toTimestamp = (value) => {
    const ts = new Date(value).getTime();
    return Number.isFinite(ts) ? ts : 0;
  };

  // Always sort newest-first within each severity before paginating
  const immediateSorted = [...filteredImmediateSeverity].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
  const highSorted = [...filteredHighSeverity].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
  const moderateSorted = [...filteredModerateSeverity].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
  const lowSorted = [...filteredLowSeverity].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));
  const smartWatchSorted = [...filteredSmartWatchSOS].sort((a, b) => toTimestamp(b.date) - toTimestamp(a.date));

  const totalImmediatePages = Math.max(1, Math.ceil(immediateSorted.length / itemsPerPage));
  const startImmediateIndex = (currentPageImmediate - 1) * itemsPerPage;
  const endImmediateIndex = startImmediateIndex + itemsPerPage;
  const currentImmediateSubmissions = immediateSorted.slice(startImmediateIndex, endImmediateIndex);

  const totalSmartWatchPages = Math.max(1, Math.ceil(smartWatchSorted.length / itemsPerPage));
  const startSmartWatchIndex = (currentPageSmartWatch - 1) * itemsPerPage;
  const endSmartWatchIndex = startSmartWatchIndex + itemsPerPage;
  const currentSmartWatchSubmissions = smartWatchSorted.slice(startSmartWatchIndex, endSmartWatchIndex);

  const totalHighPages = Math.max(1, Math.ceil(highSorted.length / itemsPerPage));
  const startHighIndex = (currentPageHigh - 1) * itemsPerPage;
  const endHighIndex = startHighIndex + itemsPerPage;
  const currentHighSubmissions = highSorted.slice(startHighIndex, endHighIndex);

  const totalModeratePages = Math.max(1, Math.ceil(moderateSorted.length / itemsPerPage));
  const startModerateIndex = (currentPageModerate - 1) * itemsPerPage;
  const endModerateIndex = startModerateIndex + itemsPerPage;
  const currentModerateSubmissions = moderateSorted.slice(startModerateIndex, endModerateIndex);

  const totalLowPages = Math.max(1, Math.ceil(lowSorted.length / itemsPerPage));
  const startLowIndex = (currentPageLow - 1) * itemsPerPage;
  const endLowIndex = startLowIndex + itemsPerPage;
  const currentLowSubmissions = lowSorted.slice(startLowIndex, endLowIndex);

  const getStatusColor = (status) => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === "resolved" || normalizedStatus === "case resolved") {
      return "status-resolved";
    } else if (normalizedStatus === "in progress") {
      return "status-in-progress";
    } else if (normalizedStatus === "received") {
      return "status-received";
    } else {
      return "status-pending";
    }
  };

  const formatStatus = (status) => {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
    switch (normalizedStatus) {
      case "in progress":
        return "In Progress";
      case "received":
        return "Received";
      case "resolved":
      case "case resolved":
        return "Case Resolved";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  const isResolved = (status) => {
    const s = typeof status === 'string' ? status.toLowerCase() : '';
    return s === 'resolved' || s === 'case resolved';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateDescription = (description, maxLength = 100) => {
    if (!description) return 'No description'
    if (description.length <= maxLength) return description
    return description.substring(0, maxLength) + '...'
  };

  // Set up real-time listener for crime reports and statistics
  useEffect(() => {
    const db = getDatabase(app);
    const reportsRef = ref(db, 'civilian/civilian crime reports');
    
    console.log('Setting up real-time listener for reports...');
    
    const unsubscribe = onValue(reportsRef, (snapshot) => {
      try {
        setLoading(true);
        console.log('Real-time update received:', snapshot.exists());
        
        let reportsArray = [];
        
        if (snapshot.exists()) {
          const reportsData = snapshot.val();
          reportsArray = Object.keys(reportsData).map(key => {
            const report = reportsData[key];
            let locationText = 'Location not available';
            
            // Try different possible location field structures
            if (report.location?.address) {
              locationText = report.location.address;
            } else if (report.location?.formatted_address) {
              locationText = report.location.formatted_address;
            } else if (report.location?.fullAddress) {
              locationText = report.location.fullAddress;
            } else if (report.location?.streetAddress) {
              locationText = report.location.streetAddress;
            } else if (typeof report.location === 'string') {
              locationText = report.location;
            } else if (report.address) {
              locationText = report.address;
            } else if (report.locationText) {
              locationText = report.locationText;
            }
            
            return {
              id: key,
              type: report.crimeType || 'Unknown',
              description: report.description || 'No description',
              location: locationText,
              date: report.dateTime || report.createdAt,
              status: report.status || 'pending',
              severity: report.severity || 'moderate', // Default to moderate if no severity specified
              reportId: report.reportId || key,
              reporterUid: report.reporterUid || report.userId || report.uid, // Include reporter UID for calling
              threatDetected: report.threatDetected || false,
              aiEscalated: report.aiEscalated || false,
              escalatedAt: report.escalatedAt || null,
              escalationDetails: report.escalationDetails || null,
              // ML reclassification metadata
              mlReclassified: report.mlReclassified || false,
              mlReclassifiedAt: report.mlReclassifiedAt || null,
              originalSeverity: report.originalSeverity || null,
              predictedSeverity: report.predictedSeverity || null,
              threatAnalysis: report.threatAnalysis || null,
              mlAnalyzed: report.mlAnalyzed || false
            };
          });
          
          // Sort by date (newest first)
          reportsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // Check for new reports and trigger alarm
        
        // Get current report IDs
        const currentReportIds = new Set(reportsArray.map(report => report.id));
        
        // Use ref for synchronous comparison (state updates are async)
        const previousReportIds = lastReportIdsRef.current;
        
        // Find new reports by comparing IDs (use ref, not state)
        const newReportIds = new Set([...currentReportIds].filter(id => !previousReportIds.has(id)));
        
        // Debug: Log detection status
        if (newReportIds.size > 0) {
          console.log('🔍 NEW REPORT DETECTION:', {
            newReportIds: Array.from(newReportIds),
            previousCount: previousReportIds.size,
            currentCount: currentReportIds.size,
            willAnalyze: newReportIds.size > 0 && previousReportIds.size > 0
          });
        }
        
        if (previousReportIds.size === 0 && reportsArray.length > 0) {
          console.log('Initial load - setting report IDs');
        }
        
        // Update ref synchronously BEFORE state update (critical for detection)
        lastReportIdsRef.current = new Set(currentReportIds);
        
        setRecentSubmissions(reportsArray);
        setError(null); // Clear any previous errors
        console.log('Reports updated in real-time:', reportsArray.length, 'reports');
        
        // Run ML threat analysis ONLY on NEW reports (not on old data or continuously)
        // Only analyze when a NEW report is detected (has ID that wasn't in previous snapshot)
        if (newReportIds.size > 0 && previousReportIds.size > 0) {
          // NEW report detected - analyze only the new report(s)
          const newReports = reportsArray.filter(report => newReportIds.has(report.id));
          console.log(`🚨 ML Threat Detection: New report detected! Analyzing ${newReports.length} new report(s)...`);
          console.log(`   New report IDs:`, Array.from(newReportIds));
          console.log(`   New reports:`, newReports.map(r => ({ id: r.id, description: r.description?.substring(0, 50), severity: r.severity })));
          
          // Analyze only new reports using ML model
          analyzeReportsForThreats(newReports);
        } else {
          // No new reports detected - model in standby mode
          // On initial load (previousReportIds.size === 0), don't analyze existing reports
          // Only log standby status once per session to reduce console noise
          if (previousReportIds.size === 0 && reportsArray.length > 0) {
            console.log(`✅ ML Threat Detection: Ready and waiting for new reports (${reportsArray.length} existing reports loaded, NOT analyzing old data)`);
          } else if (newReportIds.size === 0 && previousReportIds.size > 0) {
            // Subsequent updates with no new reports - silent standby
            // Don't log to avoid console noise
          }
        }
      } catch (err) {
        console.error('Error processing real-time data:', err);
        setError(`Failed to process data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error('Real-time listener error:', error);
      setError(`Real-time connection failed: ${error.message}`);
      setLoading(false);
    });

    // Cleanup function to remove the listener when component unmounts
    return () => {
      console.log('Cleaning up real-time listener...');
      off(reportsRef, 'value', unsubscribe);
    };
  }, []);

  // Set up real-time listener for Smart Watch SoS alerts
  useEffect(() => {
    const db = getDatabase(app);
    const sosAlertsRef = ref(db, 'sos_alerts');
    
    console.log('Setting up real-time listener for Smart Watch SoS alerts...');
    
    const unsubscribe = onValue(sosAlertsRef, (snapshot) => {
      try {
        setSmartWatchLoading(true);
        console.log('Smart Watch SoS alerts update received:', snapshot.exists());
        
        let alertsArray = [];
        
        if (snapshot.exists()) {
          const alertsData = snapshot.val();
          alertsArray = Object.keys(alertsData).map(key => {
            const alert = alertsData[key];
            const alertType = alert.alertType || alert.type || (alert.deviceType ? `${alert.deviceType} SoS` : 'Smart Watch SoS');
            const normalizedDevice = alert.deviceType 
              || (typeof alertType === 'string' && alertType.toLowerCase().includes('watch') ? 'Smart Watch' : 'SOS Device');
            const reporterDisplayName = alert.userName || alert.reporterName || alert.fullName || null;
            
            // Handle location object properly
            let locationText = 'Location not available';
            if (alert.location) {
              if (typeof alert.location === 'string') {
                locationText = alert.location;
              } else if (typeof alert.location === 'object') {
                // Extract address from location object
                if (alert.location.address) {
                  locationText = alert.location.address;
                } else if (alert.location.formatted_address) {
                  locationText = alert.location.formatted_address;
                } else if (alert.location.fullAddress) {
                  locationText = alert.location.fullAddress;
                } else if (alert.location.streetAddress) {
                  locationText = alert.location.streetAddress;
                } else if (alert.location.city && alert.location.country) {
                  locationText = `${alert.location.city}, ${alert.location.country}`;
                } else if (alert.location.city) {
                  locationText = alert.location.city;
                } else if (alert.location.country) {
                  locationText = alert.location.country;
                }
              }
            }
            
            return {
              id: key,
              type: alertType,
              description: alert.message || alert.description || 'Smart Watch SoS Alert',
              location: locationText,
              date: alert.timestamp || alert.createdAt || new Date().toISOString(),
              status: alert.status || 'active',
              severity: alert.severity || 'immediate',
              userId: alert.userId || alert.user_id,
              deviceType: normalizedDevice,
              reporterName: reporterDisplayName
            };
          });
        }

        setSmartWatchSOSAlerts(alertsArray);
        console.log('Smart Watch SoS alerts updated:', alertsArray.length, 'alerts');
      } catch (err) {
        console.error('Error processing Smart Watch SoS data:', err);
      } finally {
        setSmartWatchLoading(false);
      }
    }, (error) => {
      console.error('Smart Watch SoS listener error:', error);
      setSmartWatchLoading(false);
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up Smart Watch SoS listener...');
      off(sosAlertsRef, 'value', unsubscribe);
    };
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      stopRingingSound();
    };
  }, []);

  // Cleanup ringing when call state changes
  useEffect(() => {
    if (!callState.isCalling || callState.isInCall) {
      stopRingingSound();
    }
  }, [callState.isCalling, callState.isInCall]);

  useEffect(() => {
    setCurrentPageImmediate(1);
    setCurrentPageHigh(1);
    setCurrentPageModerate(1);
    setCurrentPageLow(1);
    setCurrentPageSmartWatch(1);
  }, [timeFilter]);

  const handleFilterClick = (filterType) => {
    setActiveFilter(activeFilter === filterType ? null : filterType);
    // Reset per-section pages when filter changes
    setCurrentPageImmediate(1);
    setCurrentPageHigh(1);
    setCurrentPageModerate(1);
    setCurrentPageLow(1);
  };

  const handleUpdateStatus = (report) => {
    setSelectedReport(report);
    setShowUpdateModal(true);
  };


  // Audio Functions
  const createRingingSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a ringing pattern: 800Hz for 0.4s, silence for 0.2s, 1000Hz for 0.4s, silence for 0.2s
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.6);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 1.0);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + 0.4);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.45);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.6);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.65);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + 1.0);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1.05);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1.2);
      
      return { audioContext, oscillator, gainNode };
    } catch (error) {
      console.log('Could not create ringing sound:', error);
      return null;
    }
  };

  const playRingingSound = () => {
    try {
      // Clear any existing ringing interval
      if (ringingIntervalRef.current) {
        clearInterval(ringingIntervalRef.current);
      }
      
      // Start ringing immediately
      const playRing = () => {
        if (callState.isCalling && !callState.isInCall) {
          createRingingSound();
        }
      };
      
      // Play first ring immediately
      playRing();
      
      // Set up interval to repeat every 1.2 seconds (duration of one ring cycle)
      ringingIntervalRef.current = setInterval(playRing, 1200);
      
    } catch (error) {
      console.log('Could not play ringing sound:', error);
    }
  };

  const playCallConnectedSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant connected tone
      oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play connected sound:', error);
    }
  };

  const playCallEndedSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Call ended tone
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play ended sound:', error);
    }
  };

  const stopRingingSound = () => {
    try {
      // Clear the ringing interval
      if (ringingIntervalRef.current) {
        clearInterval(ringingIntervalRef.current);
        ringingIntervalRef.current = null;
      }
      
      // Clear any existing ringing audio
      if (ringingAudioRef.current) {
        ringingAudioRef.current.oscillator.stop();
        ringingAudioRef.current.audioContext.close();
        ringingAudioRef.current = null;
      }
    } catch (error) {
      console.log('Could not stop ringing sound:', error);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // WebRTC Call Functions
  const handleCallClick = async (report) => {
    try {
      setCallLoading(true);
      setCallError('');
      
      // Get admin data and reporter information
      const db = getDatabase(app);
      let targetUser = null;
      let adminData = null;
      
      // Get admin data from Firebase
      const adminRef = ref(db, 'admin_dashboard_account');
      const adminSnapshot = await get(adminRef);
      
      if (adminSnapshot.exists()) {
        adminData = adminSnapshot.val();
        console.log('Admin data retrieved:', adminData);
      } else {
        console.warn('No admin data found in Firebase');
      }
      
      if (report.reporterUid) {
        console.log('Fetching civilian info for call:', report.reporterUid);
        // Get civilian reporter info from their account
        const civilianRef = ref(db, `civilian/civilian account/${report.reporterUid}`);
        const civilianSnapshot = await get(civilianRef);
        
        if (civilianSnapshot.exists()) {
          const civilianData = civilianSnapshot.val();
          console.log('Civilian data found for call:', civilianData);
          const firstName = civilianData.firstName || '';
          const lastName = civilianData.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          
          targetUser = {
            id: report.reporterUid,
            name: fullName || 'Anonymous Reporter',
            email: civilianData.email || 'Not available',
            type: 'civilian',
            isOnline: civilianData.isOnline || false,
            lastSeen: civilianData.lastSeen || null
          };
          console.log('Target user set for call:', targetUser);
        } else {
          console.log('No civilian account found for UID:', report.reporterUid);
        }
      } else {
        console.log('No reporter UID available for call');
      }
      
      // If no reporter UID or civilian account found, show error
      if (!targetUser) {
        setCallError('No reporter information available for this report. Cannot initiate internet call.');
        return;
      }
      
      // Generate a unique call ID similar to mobile app format
      const callId = `-${Math.random().toString(36).substr(2, 9)}${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Generated new call ID:', callId);
      
      setCallState({
        isCalling: true,
        isInCall: false,
        callType: 'civilian',
        targetUser,
        callId: callId
      });
      
      setShowCallModal(true);
      
      // Start ringing sound
      playRingingSound();
      
      // Initialize WebRTC call through internet
      await initializeInternetCall(targetUser, report, adminData);
      
    } catch (error) {
      console.error('Error initiating call:', error);
      setCallError('Failed to initiate internet call. Please try again.');
    } finally {
      setCallLoading(false);
    }
  };

  const initializeInternetCall = async (targetUser, report, adminData) => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      // Check if WebRTC is supported
      if (!window.RTCPeerConnection) {
        throw new Error('WebRTC is not supported in this browser');
      }
      
      console.log('Requesting microphone access...');
      
      // Get user media (audio only)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('Microphone access granted');
      localStreamRef.current = stream;
      
      // Create peer connection for internet calling
      const configuration = {
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'balanced'
      };
      
      peerConnectionRef.current = new RTCPeerConnection(configuration);

      peerConnectionRef.current.oniceconnectionstatechange = () => {
        const state = peerConnectionRef.current?.iceConnectionState
        console.log('ICE state:', state)
        if (state === 'failed' || state === 'disconnected') {
          try {
            peerConnectionRef.current?.restartIce?.()
            console.log('Attempted ICE restart')
          } catch (e) {
            console.log('ICE restart unsupported', e)
          }
        }
      }
      
      
      // Add local audio stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind, track.label);
        peerConnectionRef.current.addTrack(track, stream);
      });
      
      // Handle remote audio stream from mobile app
      peerConnectionRef.current.ontrack = (event) => {
        const remoteStream = event.streams[0];
        // Play remote audio from mobile app
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
        
        // Stop ringing and play connected sound
        stopRingingSound();
        playCallConnectedSound();
        
        setCallState(prev => ({ ...prev, isInCall: true, isCalling: false }));
      };
      
      // Handle ICE candidates - following mobile app guide structure
      peerConnectionRef.current.onicecandidate = async (event) => {
        if (event.candidate && callState.callId) {
          console.log('Sending ICE candidate:', event.candidate);
          const db = getDatabase(app);
          const candidateRef = push(ref(db, `voip_signaling/${callState.callId}/iceCandidates/caller`));
          await set(candidateRef, {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
          });
        }
      };
      
      // Create and set local description
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await peerConnectionRef.current.setLocalDescription(offer);
      
      // Create call record in Firebase using push() for proper callId generation
      const db = getDatabase(app);
      const callsRef = ref(db, 'voip_calls');
      const newCallRef = push(callsRef);
      const callId = newCallRef.key;
      
      console.log('Generated call ID:', callId);
      
      // Update call state with new callId
      setCallState(prev => ({ ...prev, callId: callId }));
      
      const callData = {
        callId,
        caller: {
          userId: adminData?.userId || 'admin_dashboard',
          userType: 'admin',
          name: adminData?.email || 'Admin Dashboard',
        },
        callee: {
          userId: targetUser.id,
          userType: targetUser.type || 'civilian',
          name: targetUser.name,
        },
        status: 'ringing',
        createdAt: new Date().toISOString(),
        reportId: report.id,
        reportType: report.type,
      };
      
      await set(newCallRef, callData);
      console.log('Call record created in Firebase');
      
      // Send offer through signaling (following mobile app guide)
      const offerRef = ref(db, `voip_signaling/${callId}/offer`);
      await set(offerRef, {
        sdp: offer.sdp,
        type: offer.type,
      });
      console.log('Offer sent through signaling');
      
      // Listen for answer from mobile app (following mobile app guide)
      const answerRef = ref(db, `voip_signaling/${callId}/answer`);
      const answerUnsubscribe = onValue(answerRef, async (snapshot) => {
        const answer = snapshot.val();
        if (answer && peerConnectionRef.current) {
          console.log('Received answer from mobile app');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });
      
      // Listen for ICE candidates from callee
      const calleeCandidatesRef = ref(db, `voip_signaling/${callId}/iceCandidates/callee`);
      const calleeCandidatesUnsubscribe = onValue(calleeCandidatesRef, (snapshot) => {
        snapshot.forEach((childSnapshot) => {
          const candidateData = childSnapshot.val();
          if (candidateData && peerConnectionRef.current) {
            const candidate = new RTCIceCandidate({
              candidate: candidateData.candidate,
              sdpMLineIndex: candidateData.sdpMLineIndex,
              sdpMid: candidateData.sdpMid,
            });
            peerConnectionRef.current.addIceCandidate(candidate).catch((error) => {
              console.error('Error adding ICE candidate:', error);
            });
          }
        });
      });
      
      // Listen for call status changes
      const callStatusRef = ref(db, `voip_calls/${callId}`);
      const callStatusUnsubscribe = onValue(callStatusRef, (snapshot) => {
        if (snapshot.exists()) {
          const callData = snapshot.val();
          console.log('Call status update:', callData);
          
          if (callData.status === 'answered') {
            // Call was answered
            stopRingingSound();
            playCallConnectedSound();
            setCallState(prev => ({ ...prev, isInCall: true, isCalling: false }));
          } else if (callData.status === 'rejected') {
            alert('Call was declined');
            endCall();
          } else if (callData.status === 'ended') {
            endCall();
          }
        }
      });

      
      // Cleanup listeners after 30 seconds
      setTimeout(() => {
        off(answerRef, 'value', answerUnsubscribe);
        off(calleeCandidatesRef, 'value', calleeCandidatesUnsubscribe);
        off(callStatusRef, 'value', callStatusUnsubscribe);
      }, 30000);
      
    } catch (error) {
      console.error('Error initializing internet call:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to access microphone or establish internet connection. Please check permissions.';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'WebRTC is not supported in this browser. Please use Chrome, Firefox, or Edge.';
      } else if (error.message.includes('getUserMedia is not supported')) {
        errorMessage = 'Microphone access is not supported in this browser. Please use a modern browser.';
      } else if (error.message.includes('WebRTC is not supported')) {
        errorMessage = 'WebRTC is not supported in this browser. Please use Chrome, Firefox, or Edge.';
      }
      
      setCallError(errorMessage);
    }
  };

  const endCall = async () => {
    // Stop ringing sound
    stopRingingSound();
    
    // Play call ended sound
    playCallEndedSound();
    
    // Update call status in Firebase (following mobile app guide)
    if (callState.callId) {
      try {
        const db = getDatabase(app);
        const callRef = ref(db, `voip_calls/${callState.callId}`);
        await update(callRef, {
          status: 'ended',
          endedAt: new Date().toISOString()
        });
        console.log('Call status updated to ended');
      } catch (error) {
        console.error('Error updating call status:', error);
      }
    }
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Reset call state
    setCallState({
      isCalling: false,
      isInCall: false,
      callType: null,
      targetUser: null,
      callId: null
    });
    
    setShowCallModal(false);
    setCallError('');
  };

  const updateReportStatus = async (newStatus) => {
    if (!selectedReport) return;
    
    try {
      setUpdating(true);
      const db = getDatabase(app);
      const reportRef = ref(db, `civilian/civilian crime reports/${selectedReport.id}`);
      
      await update(reportRef, {
        status: newStatus
      });
      
      // No need to manually refresh data - real-time listener will handle updates automatically
      console.log('Report status updated, real-time listener will handle data refresh');
      
      setShowUpdateModal(false);
      setSelectedReport(null);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Threat Analysis Function - Only runs on NEW incoming reports (standby when no new reports)
  // Reclassifies reports based on ML model predictions and moves them to appropriate categories
  const analyzeReportsForThreats = async (reports) => {
    if (!reports || reports.length === 0) {
      console.warn('⚠️ ML Threat Detection: No reports provided for analysis');
      return;
    }
    
    setIsAnalyzingThreats(true);
    try {
      console.log(`🚨 ML Threat Detection: Starting analysis for ${reports.length} report(s)...`);
      console.log(`   Report details:`, reports.map(r => ({ 
        id: r.id, 
        description: r.description?.substring(0, 80), 
        currentSeverity: r.severity 
      })));
      
      // Check ML server availability first
      const serverAvailable = await threatDetectionService.checkServerHealth();
      if (!serverAvailable) {
        console.error('❌ ML Threat Detection: ML server is not available!');
        console.error('   Please ensure the ML server is running: python threat_model_server.py');
        console.error('   Reports will not be reclassified until ML server is running.');
        return;
      }
      
      console.log('✅ ML server is available, sending reports for analysis...');
      
      // Analyze only new reports using ML model
      const analysisResults = await threatDetectionService.analyzeReports(reports);
      setThreatAnalysisResults(analysisResults);
      
      // Get reports that should be escalated (for threat alerts)
      const escalated = threatDetectionService.getEscalatedReports(analysisResults);
      setEscalatedReports(escalated);
      
      const db = getDatabase(app);
      let reclassifiedCount = 0;
      
      // Reclassify ALL reports based on ML predictions
      for (const analysisResult of analysisResults) {
        const report = reports.find(r => r.id === analysisResult.reportId);
        if (!report) continue;
        
        const predictedSeverity = analysisResult.threatAnalysis.severity;
        const originalSeverity = (report.severity || 'moderate').toLowerCase();
        const normalizedPredictedSeverity = predictedSeverity.toLowerCase();
        
        // Reclassify if ML prediction differs from current severity
        // Only processes new reports (existing reports remain untouched)
        if (normalizedPredictedSeverity !== originalSeverity) {
          try {
            const reportRef = ref(db, `civilian/civilian crime reports/${report.id}`);
            
            // Update report with ML-predicted severity
            const updateData = {
              severity: normalizedPredictedSeverity, // Store as lowercase for consistency
              mlReclassified: true,
              mlReclassifiedAt: new Date().toISOString(),
              originalSeverity: originalSeverity,
              predictedSeverity: predictedSeverity,
              threatAnalysis: {
                ...analysisResult.threatAnalysis,
                reclassificationReason: `ML model reclassified from ${originalSeverity} to ${predictedSeverity} (confidence: ${(analysisResult.threatAnalysis.confidence * 100).toFixed(1)}%)`
              }
            };
            
            // If it's a threat, also mark it as such
            if (analysisResult.threatAnalysis.isThreat) {
              updateData.threatDetected = true;
              updateData.aiEscalated = true;
              if (predictedSeverity === 'Immediate' || predictedSeverity === 'High') {
                updateData.escalatedAt = new Date().toISOString();
                updateData.escalationDetails = {
                  threatKeywords: analysisResult.threatAnalysis.threats || [],
                  confidence: analysisResult.threatAnalysis.confidence,
                  reason: analysisResult.threatAnalysis.reason,
                  mlClassification: predictedSeverity
                };
              }
            }
            
            await update(reportRef, updateData);
            reclassifiedCount++;
            
            console.log(`📊 ML Reclassification: Report ${report.id} - ${originalSeverity} → ${predictedSeverity} (confidence: ${(analysisResult.threatAnalysis.confidence * 100).toFixed(1)}%)`);
            
          } catch (error) {
            console.error(`Failed to reclassify report ${report.id}:`, error);
          }
        } else {
          // Severity matches, but still update threat analysis metadata
          try {
            const reportRef = ref(db, `civilian/civilian crime reports/${report.id}`);
            const updateData = {
              threatAnalysis: analysisResult.threatAnalysis,
              mlAnalyzed: true,
              mlAnalyzedAt: new Date().toISOString()
            };
            
            if (analysisResult.threatAnalysis.isThreat) {
              updateData.threatDetected = true;
              if (predictedSeverity === 'Immediate' || predictedSeverity === 'High') {
                updateData.aiEscalated = true;
                updateData.escalatedAt = new Date().toISOString();
              }
            }
            
            await update(reportRef, updateData);
            console.log(`✅ ML Confirmation: Report ${report.id} - Severity ${predictedSeverity} confirmed (confidence: ${(analysisResult.threatAnalysis.confidence * 100).toFixed(1)}%)`);
            
          } catch (error) {
            console.error(`Failed to update threat analysis for report ${report.id}:`, error);
          }
        }
      }
      
      console.log(`✅ ML Threat Detection completed: ${reclassifiedCount} report(s) reclassified, ${escalated.length} threat(s) detected`);
      
      if (reclassifiedCount === 0 && reports.length > 0) {
        console.warn('⚠️ Warning: No reports were reclassified. This could mean:');
        console.warn('   - ML predictions matched current severity');
        console.warn('   - Or there was an error during reclassification');
        console.warn('   Check the console above for any errors.');
      }
      
    } catch (error) {
      console.error('❌ Error in threat analysis:', error);
      console.error('   Error details:', {
        message: error.message,
        stack: error.stack,
        reportsCount: reports.length,
        reportIds: reports.map(r => r.id)
      });
      console.error('   This error prevented ML reclassification. Please check ML server status.');
    } finally {
      setIsAnalyzingThreats(false);
    }
  };

  // Debug authentication info
  useEffect(() => {
    if (user && claims) {
      console.log('Dashboard: User authenticated:', {
        uid: user.uid,
        email: user.email,
        role: claims.role,
        accountType: claims.accountType,
        accountData: claims.accountData
      })
    }
  }, [user, claims])

  return (
    <div className="min-h-full bg-gray-50 p-4 lg:p-6">
      <section className="mb-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-black mb-2" style={{ 
            fontSize: '2.5rem', 
            fontWeight: '800', 
            color: '#1e293b', 
            letterSpacing: '-0.025em',
            textTransform: 'uppercase'
          }}>Report Overview</h2>
          <div className="time-filter-wrapper">
            <select
              className="time-filter-select"
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value)}
            >
              {timeFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div 
            className={`card cursor-pointer transition-all duration-200 ${
              activeFilter === 'pending' ? 'ring-2 ring-black bg-gray-50' : ''
            }`}
            onClick={() => handleFilterClick('pending')}
          >
            <div className="text-3xl font-bold text-black mb-2" style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              color: '#1e293b', 
              letterSpacing: '-0.025em'
            }}>{displayStats.pendingReports}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              color: '#64748b', 
              letterSpacing: '0.05em'
            }}>Pending Reports</div>
          </div>
          <div 
            className={`card cursor-pointer transition-all duration-200 ${
              activeFilter === 'received' ? 'ring-2 ring-black bg-gray-50' : ''
            }`}
            onClick={() => handleFilterClick('received')}
          >
            <div className="text-3xl font-bold text-black mb-2" style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              color: '#1e293b', 
              letterSpacing: '-0.025em'
            }}>{displayStats.receivedReports}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              color: '#64748b', 
              letterSpacing: '0.05em'
            }}>Received Reports</div>
          </div>
          <div 
            className={`card cursor-pointer transition-all duration-200 ${
              activeFilter === 'in-progress' ? 'ring-2 ring-black bg-gray-50' : ''
            }`}
            onClick={() => handleFilterClick('in-progress')}
          >
            <div className="text-3xl font-bold text-black mb-2" style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              color: '#1e293b', 
              letterSpacing: '-0.025em'
            }}>{displayStats.inProgressReports}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              color: '#64748b', 
              letterSpacing: '0.05em'
            }}>In Progress Reports</div>
          </div>
          <div 
            className={`card cursor-pointer transition-all duration-200 ${
              activeFilter === 'resolved' ? 'ring-2 ring-black bg-gray-50' : ''
            }`}
            onClick={() => handleFilterClick('resolved')}
          >
            <div className="text-3xl font-bold text-black mb-2" style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              color: '#1e293b', 
              letterSpacing: '-0.025em'
            }}>{displayStats.resolvedReports}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              color: '#64748b', 
              letterSpacing: '0.05em'
            }}>Resolved Reports</div>
          </div>
          <div 
            className="card cursor-pointer transition-all duration-200"
            onClick={() => {
              // Scroll to Smart Watch SoS section
              const sosSection = document.querySelector('.smartwatch-sos-section');
              if (sosSection) {
                sosSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <div className="text-3xl font-bold text-black mb-2" style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              color: '#1e293b', 
              letterSpacing: '-0.025em'
            }}>{displayStats.smartWatchSOSReports}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              color: '#64748b', 
              letterSpacing: '0.05em'
            }}>Smart Watch SoS</div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-black mb-6" style={{ 
          fontSize: '2.5rem', 
          fontWeight: '800', 
          color: '#1e293b', 
          letterSpacing: '-0.025em',
          textTransform: 'uppercase'
        }}>Analytics Dashboard</h2>
        
        {/* Report Summary */}
        <div className="mb-6">
          <ReportSummary reports={timeFilteredReports} />
        </div>
        
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart - Crime Type Distribution */}
          <div>
            <PieChart 
              data={timeFilteredReports} 
              title="Crime Type Distribution"
            />
          </div>
          
          {/* Bar Chart - Status Breakdown */}
          <div>
            <BarChart 
              data={timeFilteredReports} 
              title="Reports by Status"
              type="status"
            />
          </div>
        </div>
        
        {/* Additional Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Severity Breakdown */}
          <div>
            <BarChart 
              data={timeFilteredReports} 
              title="Reports by Severity"
              type="severity"
            />
          </div>
          
          {/* Bar Chart - Monthly Trends */}
          <div>
            <BarChart 
              data={timeFilteredReports} 
              title="Monthly Report Trends"
              type="monthly"
            />
          </div>
        </div>
      </section>

      {/* Threat Analysis Status */}
      {isAnalyzingThreats && (
        <div className="threat-analysis-status analyzing">
          <div className="loading-spinner"></div>
          <span>E-Responde Threat Detection is analyzing reports for threats...</span>
        </div>
      )}
      
      {escalatedReports.length > 0 && !isAnalyzingThreats && (
        <div className="threat-analysis-status completed">
          <span>WARNING</span>
          <span>E-Responde Threat Detection detected {escalatedReports.length} threat(s) and escalated to immediate severity</span>
        </div>
      )}
      {filteredImmediateSeverity.length > 0 && (
        <section className="reports-section immediate-severity-section">
          <div className="reports-section-header immediate-header">
            <div>
              <h2 className="reports-section-title">Immediate Severity Reports</h2>
            </div>
          </div>
          <div className="reports-table-container">
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead className="reports-table-header">
                  <tr>
                    <th className="table-header">Type</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Location</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="reports-table-body">
                  {currentImmediateSubmissions.length === 0 && !loading ? (
                    <tr>
                      <td colSpan="6" className="table-empty-state">
                        No immediate severity reports found
                      </td>
                    </tr>
                  ) : (
                    currentImmediateSubmissions.map((submission) => (
                      <tr key={submission.id} className="report-row">
                        <td className="table-cell table-cell-type">
                          <div className="type-container">
                            {submission.type}
                          </div>
                        </td>
                        <td className="table-cell table-cell-description">{truncateDescription(submission.description)}</td>
                        <td className="table-cell table-cell-location">{submission.location}</td>
                        <td className="table-cell table-cell-date">{formatDate(submission.date)}</td>
                        <td className="table-cell table-cell-status">
                          <StatusTag status={submission.status} />
                        </td>
                        <td className="table-cell table-cell-actions">
                          <div className="action-buttons">
                            <button 
                              className="action-btn action-btn-view" 
                              onClick={() => navigate(`/report/${submission.id}`)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                              View
                            </button>
                            <button 
                              className="action-btn action-btn-update"
                              onClick={() => handleUpdateStatus(submission)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Update
                            </button>
                            <button 
                              className="action-btn action-btn-call"
                              onClick={() => handleCallClick(submission)}
                              disabled={callLoading}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                              </svg>
                              {callLoading ? 'Calling...' : 'Call'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {filteredImmediateSeverity.length > itemsPerPage && (
            <div className="pagination-wrapper" style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem'}}>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageImmediate === 1}
                onClick={() => setCurrentPageImmediate(currentPageImmediate - 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <span className="text-sm text-gray-600 font-medium">
                Page {currentPageImmediate} of {totalImmediatePages}
              </span>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageImmediate === totalImmediatePages}
                onClick={() => setCurrentPageImmediate(currentPageImmediate + 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </div>
          )}
        </section>
      )}

      {/* Immediate Smart Watch SoS Section */}
      {filteredSmartWatchSOS.length > 0 && (
        <section className="reports-section smartwatch-sos-section">
          <div className="reports-section-header immediate-header">
            <div>
              <h2 className="reports-section-title">Immediate Smart Watch SoS</h2>
            </div>
          </div>
          <div className="reports-table-container">
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead className="reports-table-header">
                  <tr>
                    <th className="table-header">Type</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Location</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="reports-table-body">
                  {currentSmartWatchSubmissions.length === 0 && !smartWatchLoading ? (
                    <tr>
                      <td colSpan="6" className="table-empty-state">
                        No Smart Watch SoS alerts found
                      </td>
                    </tr>
                  ) : smartWatchLoading ? (
                    <tr>
                      <td colSpan="6" className="table-loading-state">
                        <div className="loading-spinner"></div>
                        Loading Smart Watch SoS alerts...
                      </td>
                    </tr>
                  ) : (
                    currentSmartWatchSubmissions.map((submission, index) => (
                      <tr key={submission.id} className="table-row">
                        <td className="table-cell table-cell-type">{submission.type}</td>
                        <td className="table-cell table-cell-description">{truncateDescription(submission.description)}</td>
                        <td className="table-cell table-cell-location">{submission.location}</td>
                        <td className="table-cell table-cell-date">{formatDate(submission.date)}</td>
                        <td className="table-cell table-cell-status">
                          <StatusTag status={submission.status} />
                        </td>
                        <td className="table-cell table-cell-actions">
                          <div className="action-buttons">
                            <button 
                              className="action-btn view-btn"
                              onClick={() => onNavigateToSOSAlert(submission.id)}
                              title="View Details"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              View
                            </button>
                            <button 
                              className="action-btn action-btn-update"
                              onClick={() => handleUpdateStatus(submission)}
                              title="Update Status"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {filteredSmartWatchSOS.length > itemsPerPage && (
            <div className="pagination-wrapper" style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem'}}>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageSmartWatch === 1}
                onClick={() => setCurrentPageSmartWatch(currentPageSmartWatch - 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <span className="text-sm text-gray-600 font-medium">
                Page {currentPageSmartWatch} of {totalSmartWatchPages}
              </span>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageSmartWatch === totalSmartWatchPages}
                onClick={() => setCurrentPageSmartWatch(currentPageSmartWatch + 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </div>
          )}
        </section>
      )}

      {/* High Severity Reports Section */}
      {filteredHighSeverity.length > 0 && (
        <section className="reports-section high-severity-section">
          <div className="reports-section-header high-header">
            <div>
              <h2 className="reports-section-title">High Severity Reports</h2>
            </div>
          </div>
          <div className="reports-table-container">
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead className="reports-table-header">
                  <tr>
                    <th className="table-header">Type</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Location</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="reports-table-body">
                  {currentHighSubmissions.length === 0 && !loading ? (
                    <tr>
                      <td colSpan="6" className="table-empty-state">
                        No high severity reports found
                      </td>
                    </tr>
                  ) : (
                    currentHighSubmissions.map((submission) => (
                      <tr key={submission.id} className="report-row">
                        <td className="table-cell table-cell-type">{submission.type}</td>
                        <td className="table-cell table-cell-description">{truncateDescription(submission.description)}</td>
                        <td className="table-cell table-cell-location">{submission.location}</td>
                        <td className="table-cell table-cell-date">{formatDate(submission.date)}</td>
                        <td className="table-cell table-cell-status">
                          <StatusTag status={submission.status} />
                        </td>
                        <td className="table-cell table-cell-actions">
                          <div className="action-buttons">
                            <button 
                              className="action-btn action-btn-view" 
                              onClick={() => navigate(`/report/${submission.id}`)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                              View
                            </button>
                            <button 
                              className="action-btn action-btn-update"
                              onClick={() => handleUpdateStatus(submission)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              Update
                            </button>
                            <button 
                              className="action-btn action-btn-call"
                              onClick={() => handleCallClick(submission)}
                              disabled={callLoading}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                              </svg>
                              {callLoading ? 'Calling...' : 'Call'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {filteredHighSeverity.length > itemsPerPage && (
            <div className="pagination-wrapper" style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem'}}>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageHigh === 1}
                onClick={() => setCurrentPageHigh(currentPageHigh - 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <span className="text-sm text-gray-600 font-medium">
                Page {currentPageHigh} of {totalHighPages}
              </span>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageHigh === totalHighPages}
                onClick={() => setCurrentPageHigh(currentPageHigh + 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </div>
          )}
        </section>
      )}

      {/* Moderate Severity Reports Section */}
      {filteredModerateSeverity.length > 0 && (
        <section className="reports-section moderate-severity-section">
          <div className="reports-section-header high-header">
            <div>
              <h2 className="reports-section-title">Moderate Severity Reports</h2>
            </div>
          </div>
          <div className="reports-table-container">
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead className="reports-table-header">
                  <tr>
                    <th className="table-header">Type</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Location</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="reports-table-body">
                {currentModerateSubmissions.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="6" className="table-empty-state">
                      No moderate severity reports found
                    </td>
                  </tr>
                ) : (
                    currentModerateSubmissions.map((submission) => (
                      <tr key={submission.id} className={`report-row ${submission.type.toLowerCase() === 'emergency sos' ? 'sos-row' : ''}`}>
                        <td className="table-cell table-cell-type">{submission.type}</td>
                        <td className="table-cell table-cell-description">{truncateDescription(submission.description)}</td>
                        <td className="table-cell table-cell-location">{submission.location}</td>
                        <td className="table-cell table-cell-date">{formatDate(submission.date)}</td>
                        <td className="table-cell table-cell-status">
                          <StatusTag status={submission.status} />
                        </td>
                      <td className="table-cell table-cell-actions">
                        <div className="action-buttons">
                          <button 
                            className="action-btn action-btn-view" 
                            onClick={() => navigate(`/report/${submission.id}`)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            View
                          </button>
                          <button 
                            className="action-btn action-btn-update"
                            onClick={() => handleUpdateStatus(submission)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Update
                          </button>
                          <button 
                            className="action-btn action-btn-call"
                            onClick={() => handleCallClick(submission)}
                            disabled={callLoading}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            {callLoading ? 'Calling...' : 'Call'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredModerateSeverity.length > itemsPerPage && (
            <div className="pagination-wrapper" style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem'}}>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageModerate === 1}
                onClick={() => setCurrentPageModerate(currentPageModerate - 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <span className="text-sm text-gray-600 font-medium">
                Page {currentPageModerate} of {totalModeratePages}
              </span>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageModerate === totalModeratePages}
                onClick={() => setCurrentPageModerate(currentPageModerate + 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </div>
          )}
          </div>
        </section>
      )}

      {/* Low Severity Reports Section */}
      {filteredLowSeverity.length > 0 && (
        <section className="reports-section low-severity-section">
          <div className="reports-section-header low-header">
            <div>
              <h2 className="reports-section-title">Low Severity Reports</h2>
            </div>
          </div>
          <div className="reports-table-container">
            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead className="reports-table-header">
                  <tr>
                    <th className="table-header">Type</th>
                    <th className="table-header">Description</th>
                    <th className="table-header">Location</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="reports-table-body">
                {currentLowSubmissions.length === 0 && !loading ? (
                  <tr>
                    <td colSpan="6" className="table-empty-state">
                      No low severity reports found
                    </td>
                  </tr>
                ) : (
                  currentLowSubmissions.map((submission) => (
                    <tr key={submission.id} className={`report-row ${submission.type.toLowerCase() === 'emergency sos' ? 'sos-row' : ''}`}>
                      <td className="table-cell table-cell-type">{submission.type}</td>
                      <td className="table-cell table-cell-description">{submission.description}</td>
                      <td className="table-cell table-cell-location">{submission.location}</td>
                      <td className="table-cell table-cell-date">{formatDate(submission.date)}</td>
                      <td className="table-cell table-cell-status">
                        <span className={`status-badge status-${submission.status.toLowerCase().replace(' ', '-')}`}>
                          {formatStatus(submission.status)}
                        </span>
                      </td>
                      <td className="table-cell table-cell-actions">
                        <div className="action-buttons">
                          <button 
                            className="action-btn action-btn-view" 
                            onClick={() => navigate(`/report/${submission.id}`)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            View
                          </button>
                          <button 
                            className="action-btn action-btn-update"
                            onClick={() => handleUpdateStatus(submission)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Update
                          </button>
                          <button 
                            className="action-btn action-btn-call"
                            onClick={() => handleCallClick(submission)}
                            disabled={callLoading}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            {callLoading ? 'Calling...' : 'Call'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredLowSeverity.length > itemsPerPage && (
            <div className="pagination-wrapper" style={{width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem'}}>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageLow === 1}
                onClick={() => setCurrentPageLow(currentPageLow - 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <span className="text-sm text-gray-600 font-medium">
                Page {currentPageLow} of {totalLowPages}
              </span>
              <button 
                className="pagination-btn-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPageLow === totalLowPages}
                onClick={() => setCurrentPageLow(currentPageLow + 1)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </div>
          )}
          </div>
        </section>
      )}

      {/* Update Status Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-lg">
            <h3 className="text-xl font-bold text-black mb-4">Update Report Status</h3>
            <div className="space-y-3 mb-6">
              <p><strong className="text-gray-700">Report ID:</strong> {selectedReport?.reportId}</p>
              <p><strong className="text-gray-700">Current Status:</strong> {selectedReport?.status}</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <button 
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  selectedReport?.status === 'Received' 
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => updateReportStatus('Received')}
                disabled={updating}
              >
                Received
              </button>
              <button 
                className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  selectedReport?.status === 'In Progress' 
                    ? 'bg-black text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => updateReportStatus('In Progress')}
                disabled={updating}
              >
                In Progress
              </button>
            </div>
            
            <div className="flex gap-3">
              <button 
                className="btn-secondary flex-1"
                onClick={() => {
                  setShowUpdateModal(false);
                  setSelectedReport(null);
                }}
                disabled={updating}
              >
                Cancel
              </button>
            </div>
            
            {updating && (
              <div className="mt-4 text-center text-gray-600">
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  Updating status...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WebRTC Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-black">VoIP Call</h3>
              <button 
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                onClick={endCall}
              >
                ×
              </button>
            </div>
            
            {callError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">{callError}</p>
              </div>
            )}
            
            {callState.targetUser && (
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-black mb-2">Internet Call to Mobile App</h4>
                <p className="text-gray-900 font-medium mb-1">{callState.targetUser.name}</p>
                <p className="text-sm text-gray-600 mb-2">
                  {callState.targetUser.isOnline ? 
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      Online
                    </span> : 
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      Offline
                    </span>
                  }
                </p>
                <p className="text-xs text-gray-500">Calling via E-Responde Mobile App</p>
              </div>
            )}
            
            <div className="text-center mb-6">
              {callState.isCalling && !callState.isInCall && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  <p className="text-gray-600">Connecting...</p>
                </div>
              )}
              
              {callState.isInCall && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </div>
                  <p className="text-gray-900 font-medium">Call Connected</p>
                  <div className="flex gap-3">
                    <button 
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        isMuted 
                          ? 'bg-gray-200 text-gray-700' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={toggleMute}
                    >
                      {isMuted ? 'Unmute' : 'Mute'}
                    </button>
                    <button 
                      className="bg-status-danger text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200"
                      onClick={endCall}
                    >
                      End Call
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              {!callState.isInCall && !callState.isCalling && (
                <button 
                  className="btn-primary flex-1"
                  onClick={async () => {
                    const db = getDatabase(app);
                    const adminRef = ref(db, 'admin_dashboard_account');
                    const adminSnapshot = await get(adminRef);
                    const adminData = adminSnapshot.exists() ? adminSnapshot.val() : null;
                    await initializeInternetCall(callState.targetUser, { id: callState.callId, type: 'Emergency' }, adminData);
                  }}
                >
                  Start Internet Call
                </button>
              )}
              <button 
                className="btn-secondary flex-1"
                onClick={endCall}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard




