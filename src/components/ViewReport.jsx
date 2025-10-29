import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getDatabase, ref, get, set, push } from 'firebase/database'
import { ref as storageRef, getDownloadURL } from 'firebase/storage'
import { app, storage } from '../firebase'
import StatusTag from './StatusTag'
import './ViewReport.css'

function ViewReport({ reportId, alertType, onBackToDashboard }) {
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dispatchResult] = useState(null)
  const [policeRecommendations, setPoliceRecommendations] = useState(null)
  const [dispatching, setDispatching] = useState(false)
  const [dispatchSuccess, setDispatchSuccess] = useState(null)
  const [lightboxUrl, setLightboxUrl] = useState(null)

  const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
    shadowSize: [41, 41]
  })

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  // Calculate ETA based on distance and traffic conditions
  const calculateETA = (distance, trafficCondition = 'normal') => {
    const baseSpeed = 30; // km/h average speed in city
    const trafficMultipliers = {
      'light': 1.0,
      'normal': 1.2,
      'heavy': 1.8,
      'severe': 2.5
    };
    
    const speed = baseSpeed / trafficMultipliers[trafficCondition];
    const timeInHours = distance / speed;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    return {
      min: Math.max(5, timeInMinutes - 2), // Minimum 5 minutes
      max: timeInMinutes + 3,
      trafficCondition
    };
  }

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
  }

  // Generate route suggestions based on location
  const generateRouteSuggestion = (policeLat, policeLon, crimeLat, crimeLon) => {
    // This is a simplified route suggestion - in a real app, you'd use Google Maps API
    const routes = [
      {
        name: "Primary Route",
        description: "Direct route via main roads",
        distance: calculateDistance(policeLat, policeLon, crimeLat, crimeLon),
        traffic: "normal"
      },
      {
        name: "Alternative Route",
        description: "Via secondary roads to avoid traffic",
        distance: calculateDistance(policeLat, policeLon, crimeLat, crimeLon) * 1.1,
        traffic: "light"
      },
      {
        name: "Emergency Route",
        description: "Fastest route with emergency protocols",
        distance: calculateDistance(policeLat, policeLon, crimeLat, crimeLon) * 0.95,
        traffic: "light"
      }
    ];
    
    return routes.sort((a, b) => a.distance - b.distance)[0]; // Return shortest route
  }


  // Handle when police officer declines an assignment
  const handleOfficerDecline = async (policeId, policeData) => {
    try {
      setDispatching(true)
      const db = getDatabase(app)
      
      console.log('Processing officer decline for:', policeId)
      
      // Update officer status back to Available and clear assignment
      const policeRef = ref(db, `police/police account/${policeId}`)
      await set(policeRef, {
        ...policeData,
        status: 'Available',
        currentAssignment: null
      })
      console.log('Officer status updated to Available')

      // Update report status back to Pending so it can be reassigned
      const reportRef = ref(db, `civilian/civilian crime reports/${reportId}`)
      await set(reportRef, {
        ...reportData,
        status: 'Pending',
        dispatchedTo: null,
        assignmentDeclined: {
          declinedBy: `${policeData.firstName} ${policeData.lastName}`,
          declinedAt: new Date().toISOString(),
          reason: 'Officer declined assignment'
        }
      })
      console.log('Report status updated to Pending')

      // Update dispatch record to show declined status
      const dispatchRef = ref(db, 'dispatches')
      const newDispatchRef = push(dispatchRef)
      await set(newDispatchRef, {
        dispatchId: newDispatchRef.key,
        reportId: reportId,
        policeId: policeId,
        policeName: `${policeData.firstName} ${policeData.lastName}`,
        policeRank: policeData.rank || 'Police Officer',
        policeContact: policeData.contactNumber,
        incidentType: reportData?.type || 'Unknown',
        incidentLocation: reportData?.location || 'Unknown',
        dispatchedAt: new Date().toISOString(),
        status: 'Declined',
        declinedAt: new Date().toISOString(),
        declinedBy: `${policeData.firstName} ${policeData.lastName}`,
        eta: policeData.eta,
        distance: policeData.distance,
        route: policeData.route
      })

      setDispatchSuccess({
        policeName: `${policeData.firstName} ${policeData.lastName}`,
        dispatchId: newDispatchRef.key,
        eta: policeData.eta,
        declined: true
      })

      // Refresh police recommendations to show updated status
      if (reportData?.coordinates?.latitude && reportData?.coordinates?.longitude) {
        fetchNearestPolice(
          parseFloat(reportData.coordinates.latitude),
          parseFloat(reportData.coordinates.longitude)
        )
      }

    } catch (error) {
      console.error('Error processing officer decline:', error)
      setDispatchSuccess({
        error: 'Failed to process officer decline. Please try again.'
      })
    } finally {
      setDispatching(false)
    }
  }

  // Dispatch police officer to incident
  const dispatchPolice = async (policeId, policeData) => {
    try {
      setDispatching(true)
      const db = getDatabase(app)
      
      // Keep police officer status as "Available" - will be changed to "Dispatched" after mobile app confirmation
      const policeRef = ref(db, `police/police account/${policeId}`)
      await set(policeRef, {
        ...policeData,
        status: 'Available', // Keep as Available until mobile app confirmation
        currentAssignment: {
          reportId: reportId,
          assignedAt: new Date().toISOString(),
          incidentType: reportData?.type || 'Unknown',
          incidentLocation: reportData?.location || 'Unknown',
          assignmentStatus: 'Pending Confirmation',
          requiresMobileConfirmation: true
        }
      })

      // Create dispatch record
      const dispatchRef = ref(db, 'dispatches')
      const newDispatchRef = push(dispatchRef)
      await set(newDispatchRef, {
        dispatchId: newDispatchRef.key,
        reportId: reportId,
        policeId: policeId,
        policeName: `${policeData.firstName} ${policeData.lastName}`,
        policeRank: policeData.rank || 'Police Officer',
        policeContact: policeData.contactNumber,
        incidentType: reportData?.type || 'Unknown',
        incidentLocation: reportData?.location || 'Unknown',
        dispatchedAt: new Date().toISOString(),
        status: 'Pending Confirmation',
        eta: policeData.eta,
        distance: policeData.distance,
        route: policeData.route
      })

      // Update report status to "Assigned" (pending confirmation)
      const reportRef = ref(db, `civilian/civilian crime reports/${reportId}`)
      await set(reportRef, {
        ...reportData,
        status: 'Assigned',
        dispatchedTo: {
          policeId: policeId,
          policeName: `${policeData.firstName} ${policeData.lastName}`,
          dispatchedAt: new Date().toISOString(),
          assignmentStatus: 'Pending Confirmation',
          requiresMobileConfirmation: true
        }
      })

      setDispatchSuccess({
        policeName: `${policeData.firstName} ${policeData.lastName}`,
        dispatchId: newDispatchRef.key,
        eta: policeData.eta
      })

      // Refresh police recommendations to show updated status
      if (reportData?.coordinates?.latitude && reportData?.coordinates?.longitude) {
        fetchNearestPolice(
          parseFloat(reportData.coordinates.latitude),
          parseFloat(reportData.coordinates.longitude)
        )
      }

    } catch (error) {
      console.error('Error dispatching police:', error)
      setDispatchSuccess({
        error: 'Failed to dispatch police officer. Please try again.'
      })
    } finally {
      setDispatching(false)
    }
  }

  // Fetch police data and calculate nearest officers
  const fetchNearestPolice = async (crimeLat, crimeLon) => {
    try {
      const db = getDatabase(app)
      const policeRef = ref(db, 'police/police account')
      const snapshot = await get(policeRef)
      
      if (snapshot.exists()) {
        const policeData = snapshot.val()
        console.log('Raw police data:', policeData)
        
        const policeArray = Object.entries(policeData).map(([id, data]) => ({
          id,
          ...data
        }))
        
        console.log('Police array:', policeArray)

        // Filter police with location data and calculate distances
        const policeWithDistance = policeArray
          .filter(police => {
            const hasLocation = police.currentLocation && police.currentLocation.latitude && police.currentLocation.longitude
            console.log(`Police ${police.firstName} ${police.lastName}:`, {
              hasCurrentLocation: !!police.currentLocation,
              latitude: police.currentLocation?.latitude,
              longitude: police.currentLocation?.longitude,
              hasLocation
            })
            return hasLocation
          })
          .map(police => {
            const distance = calculateDistance(
              crimeLat, 
              crimeLon, 
              parseFloat(police.currentLocation.latitude), 
              parseFloat(police.currentLocation.longitude)
            );
            
            const eta = calculateETA(distance);
            const route = generateRouteSuggestion(
              parseFloat(police.currentLocation.latitude),
              parseFloat(police.currentLocation.longitude),
              crimeLat,
              crimeLon
            );
            
            return {
              ...police,
              distance,
              eta,
              route
            };
          })
          .sort((a, b) => a.distance - b.distance) // Sort by distance

        console.log('Police with distance:', policeWithDistance)

        // Filter out already dispatched officers and get top 3 nearest available police officers
        const availablePolice = policeWithDistance.filter(police => 
          police.status !== 'Dispatched' && police.status !== 'Busy'
        )
        const nearestPolice = availablePolice.slice(0, 3)
        
        console.log('Available police:', nearestPolice)
        setPoliceRecommendations(nearestPolice)
      } else {
        console.log('No police data found in database')
        setPoliceRecommendations([])
      }
    } catch (error) {
      console.error('Error fetching police data:', error)
      setPoliceRecommendations([])
    }
  }

  // Fetch report data from Firebase
  useEffect(() => {
    const fetchReportData = async () => {
      if (!reportId) {
        setError('No report ID provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        const db = getDatabase(app)
        
        console.log('Fetching report:', { reportId, alertType })
        
        // Determine the correct path based on alert type
        const reportPath = alertType === 'sos' 
          ? `sos_alerts/${reportId}` 
          : `civilian/civilian crime reports/${reportId}`
        
        console.log('Fetching from path:', reportPath)
        
        const reportRef = ref(db, reportPath)
        const snapshot = await get(reportRef)
        
        console.log('Report snapshot exists:', snapshot.exists())
        
        if (snapshot.exists()) {
          const data = snapshot.val()
          
          // Fetch reporter information from civilian account
          let reporterInfo = {
            name: 'Anonymous',
            phone: 'Not provided',
            email: 'Not provided'
          }
          
          console.log('Report data for reporter info:', {
            reporterUid: data.reporterUid,
            reporterName: data.reporterName,
            userId: data.userId,
            uid: data.uid
          })
          
          // Try multiple ways to get reporter information
          if (data.reporterUid || data.userId || data.uid) {
            const uidToTry = data.reporterUid || data.userId || data.uid
            console.log('Trying to fetch reporter info for UID:', uidToTry)
            
            try {
              const reporterRef = ref(db, `civilian/civilian account/${uidToTry}`)
              const reporterSnapshot = await get(reporterRef)
              
              if (reporterSnapshot.exists()) {
                const reporterData = reporterSnapshot.val()
                console.log('Reporter data found:', reporterData)
                
                const firstName = reporterData.firstName || ''
                const lastName = reporterData.lastName || ''
                const fullName = `${firstName} ${lastName}`.trim()
                
                reporterInfo = {
                  name: fullName || data.reporterName || 'Anonymous',
                  phone: reporterData.contactNumber || 'Not provided',
                  email: reporterData.email || 'Not provided'
                }
                
                console.log('Reporter info set to:', reporterInfo)
              } else {
                console.log('No reporter account found for UID:', uidToTry)
                // Try to use reporterName if available in the report data
                if (data.reporterName) {
                  reporterInfo.name = data.reporterName
                  console.log('Using reporterName from report data:', data.reporterName)
                }
              }
            } catch (reporterErr) {
              console.error('Error fetching reporter info:', reporterErr)
              // Try to use reporterName if available in the report data
              if (data.reporterName) {
                reporterInfo.name = data.reporterName
                console.log('Using reporterName from report data after error:', data.reporterName)
              }
            }
          } else {
            console.log('No reporter UID found, checking for reporterName in report data')
            // Try to use reporterName if available in the report data
            if (data.reporterName) {
              reporterInfo.name = data.reporterName
              console.log('Using reporterName from report data:', data.reporterName)
            }
          }
          
          // Debug multimedia data
          console.log('Raw multimedia data:', data.multimedia)
          console.log('Multimedia type:', typeof data.multimedia)
          console.log('Multimedia length:', data.multimedia ? data.multimedia.length : 'null/undefined')
          if (data.multimedia && data.multimedia.length > 0) {
            data.multimedia.forEach((media, index) => {
              console.log(`Media ${index}:`, {
                value: media,
                type: typeof media,
                startsWithData: media.startsWith('data:image/'),
                includesFirebase: media.includes('firebase'),
                includesHttp: media.includes('http'),
                includesFile: media.includes('file://'),
                includesRnPicker: media.includes('rn_image_picker'),
                isBase64: media.startsWith('data:image/'),
                length: media.length,
                preview: media.substring(0, 100) + '...'
              });
            });
          }
          
          // Process data based on alert type
          if (alertType === 'sos') {
            // Process SoS alert data
            const sosData = {
              reportId: data.reportId || reportId,
              type: data.alertType || 'Smart Watch SoS',
              dateReported: data.timestamp || data.createdAt,
              location: data.location?.address || 'No location provided',
              coordinates: {
                latitude: data.location?.latitude || null,
                longitude: data.location?.longitude || null
              },
              reportedBy: reporterInfo,
              description: data.message || 'No message provided',
              status: data.status || 'Unknown',
              multimedia: data.multimedia || [],
              videos: data.videos || [],
              // SoS-specific fields
              userId: data.userId || 'Unknown',
              deviceType: data.deviceType || 'Smart Watch',
              reporterInfo: reporterInfo,
              alertType: data.alertType || 'SoS Alert',
              fullLocation: data.location || {},
              voipCalls: data.voipCalls || [],
              voipSignaling: data.voipSignaling || {},
              formattedDate: data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown'
            }
            setReportData(sosData)
          } else {
            // Process crime report data
            setReportData({
              reportId: data.reportId || reportId,
              type: data.crimeType || 'Unknown',
              dateReported: data.dateTime || data.createdAt,
              location: data.location?.address || 'No location provided',
              coordinates: {
                latitude: data.location?.latitude || null,
                longitude: data.location?.longitude || null
              },
              reportedBy: reporterInfo,
              description: data.description || 'No description provided',
              status: data.status || 'Unknown',
              multimedia: data.multimedia || [],
              videos: data.videos || []
            })
          }

          // Fetch nearest police officers if coordinates are available
          if (data.location?.latitude && data.location?.longitude) {
            fetchNearestPolice(
              parseFloat(data.location.latitude), 
              parseFloat(data.location.longitude)
            )
          }

        } else {
          console.error('Report not found at path:', reportPath)
          console.error('Report ID:', reportId)
          console.error('Alert type:', alertType)
          setError(`Report not found. Path: ${reportPath}, ID: ${reportId}`)
        }
      } catch (err) {
        console.error('Error fetching report:', err)
        console.error('Report ID:', reportId)
        console.error('Alert type:', alertType)
        setError(`Failed to load report data: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [reportId, alertType])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to attempt to convert mobile file paths to accessible URLs
  const tryConvertMobileFileToUrl = async (filePath) => {
    try {
      console.log(`Starting Firebase Storage lookup for: ${filePath}`);
      
      // Extract filename from the path
      const filename = filePath.split('/').pop();
      console.log(`Extracted filename: ${filename}`);
      
      // Try to construct a potential Firebase Storage path
      // This assumes the mobile app might have uploaded to a specific path
      const potentialPaths = [
        `civilian crime reports/multimedia/${reportId}/${filename}`,
        `civilian/civilian crime reports/${reportId}/multimedia/${filename}`,
        `crime-reports/${reportId}/${filename}`,
        `multimedia/${reportId}/${filename}`,
        `evidence/${reportId}/${filename}`,
        `images/${reportId}/${filename}`,
        `uploads/${reportId}/${filename}`,
        filename // Just the filename
      ];
      
      console.log(`Will try ${potentialPaths.length} potential paths`);
      
      // Try each potential path with timeout
      for (let i = 0; i < potentialPaths.length; i++) {
        const path = potentialPaths[i];
        try {
          console.log(`[${i + 1}/${potentialPaths.length}] Trying Firebase Storage path: ${path}`);
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          
          const imageRef = storageRef(storage, path);
          const urlPromise = getDownloadURL(imageRef);
          
          const url = await Promise.race([urlPromise, timeoutPromise]);
          console.log(`Found image at path: ${path}`);
          return url;
        } catch (err) {
          console.log(`[${i + 1}/${potentialPaths.length}] Failed to find image at path: ${path}`, err.message);
          // Continue to next path
          continue;
        }
      }
      
      console.log(`🚫 No image found in Firebase Storage after trying ${potentialPaths.length} paths`);
      return null; // No accessible URL found
    } catch (error) {
      console.error('💥 Error trying to convert mobile file:', error);
      return null;
    }
  };

  // Component to handle mobile file paths with Firebase Storage lookup
  const MobileFileComponent = ({ media, index, reportId }) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      const attemptImageConversion = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          // Add overall timeout to prevent infinite loading (reduced to 10 seconds)
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Image not uploaded to Firebase Storage')), 10000)
          );
          
          const conversionPromise = tryConvertMobileFileToUrl(media);
          const url = await Promise.race([conversionPromise, timeoutPromise]);
          
          if (url) {
            setImageUrl(url);
          } else {
            setError('Image not found in Firebase Storage');
          }
        } catch (err) {
          setError('Mobile app image not uploaded to cloud storage');
          console.error('Mobile file conversion error:', err);
        } finally {
          setIsLoading(false);
        }
      };

      attemptImageConversion();
    }, [media, reportId]);

    if (isLoading) {
      return (
        <div className="evidence-placeholder mobile-file loading">
          <div className="loading-spinner"></div>
          <span>Photo {index + 1}</span>
          <small>Checking Firebase Storage...</small>
        </div>
      );
    }

    if (imageUrl) {
      return (
        <div className="evidence-photo">
          <img 
            src={imageUrl} 
            alt={`Evidence photo ${index + 1}`}
            onClick={() => setLightboxUrl(imageUrl)}
            onError={(e) => {
              console.error('Converted image load error:', e.target.src);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            onLoad={() => {
              console.log(`Converted mobile image ${index + 1} loaded successfully`);
            }}
          />
          <div className="evidence-placeholder" style={{ display: 'none' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21,15 16,10 5,21"></polyline>
            </svg>
            <span>Photo {index + 1}</span>
            <small>Failed to load</small>
          </div>
        </div>
      );
    }

    return (
      <div className="evidence-placeholder mobile-file">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21,15 16,10 5,21"></polyline>
        </svg>
        <span>Photo {index + 1}</span>
        <small>Mobile App Image</small>
        <div className="file-info">
          <small>File: {media.split('/').pop()}</small>
          <div className="file-note">
            <small>Mobile: {error || 'This image was captured on a mobile device and is not accessible from the web interface.'}</small>
            <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <strong>Note:</strong> The mobile app captured this image but didn't upload it to cloud storage. 
              To view the image, check the mobile device or contact the reporter.
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to determine video type and handle display
  const getVideoDisplayComponent = (videoUrl, index) => {
    console.log(`Processing video ${index}:`, videoUrl);
    
    // Check for Firebase Storage or HTTP URLs
    if (videoUrl.includes('firebase') || videoUrl.includes('http://') || videoUrl.includes('https://')) {
      return (
        <div className="evidence-video">
          <video 
            controls
            preload="metadata"
            style={{ width: '100%', height: '200px', borderRadius: '8px' }}
            onError={(e) => {
              console.error('Video load error:', e.target.src);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            onLoadStart={() => {
              console.log(`Video ${index + 1} started loading`);
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="evidence-placeholder" style={{ display: 'none' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23,7 16,12 23,17 23,7"></polygon>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
            <span>Video {index + 1}</span>
            <small>Failed to load</small>
          </div>
        </div>
      );
    }
    
    // Unknown format
    return (
      <div className="evidence-placeholder">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="23,7 16,12 23,17 23,7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
        <span>Video {index + 1}</span>
        <small>Unknown format</small>
        <div className="file-info">
          <small>{videoUrl.substring(0, 50)}...</small>
        </div>
      </div>
    );
  };

  // Helper function to determine image type and handle display
  const getImageDisplayComponent = (media, index) => {
    console.log(`Processing media ${index}:`, media);
    console.log(`Media length: ${media.length}, starts with data: ${media.startsWith('data:image/')}`);
    
    // Check for base64 data URLs (including those stored in Realtime Database)
    if (media.startsWith('data:image/')) {
      console.log(`Detected base64 image for photo ${index + 1}`);
      return (
        <div className="evidence-photo">
          <img 
            src={media} 
            alt={`Evidence photo ${index + 1}`}
            onClick={() => setLightboxUrl(media)}
            onError={(e) => {
              console.error('Base64 image load error:', e.target.src.substring(0, 50) + '...');
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            onLoad={() => {
              console.log(`Base64 image ${index + 1} loaded successfully from Realtime Database`);
            }}
          />
          <div className="evidence-placeholder" style={{ display: 'none' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21,15 16,10 5,21"></polyline>
            </svg>
            <span>Photo {index + 1}</span>
            <small>Failed to load</small>
          </div>
        </div>
      );
    }
    
    // Check for Firebase Storage or HTTP URLs
    if (media.includes('firebase') || media.includes('http://') || media.includes('https://')) {
      return (
        <div className="evidence-photo">
          <img 
            src={media} 
            alt={`Evidence photo ${index + 1}`}
            onClick={() => setLightboxUrl(media)}
            onError={(e) => {
              console.error('URL image load error:', e.target.src);
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
            onLoad={() => {
              console.log(`URL image ${index + 1} loaded successfully`);
            }}
          />
          <div className="evidence-placeholder" style={{ display: 'none' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21,15 16,10 5,21"></polyline>
            </svg>
            <span>Photo {index + 1}</span>
            <small>Failed to load</small>
          </div>
        </div>
      );
    }
    
    // Check for mobile app file paths
    if (media.includes('file://') || media.includes('rn_image_picker') || media.includes('content://')) {
      return <MobileFileComponent media={media} index={index} reportId={reportId} />;
    }
    
    // Unknown format
    return (
      <div className="evidence-placeholder">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21,15 16,10 5,21"></polyline>
        </svg>
        <span>Photo {index + 1}</span>
        <small>Unknown format</small>
        <div className="file-info">
          <small>{media.substring(0, 50)}...</small>
        </div>
      </div>
    );
  };

  // AI dispatch removed; no action buttons rendered.

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Loading report...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Error</h2>
          <p style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="page-content">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>No report data available</h2>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="page-content">
      <div className={`report-header ${alertType === 'sos' ? 'sos-alert-header' : ''}`}>
        <h1>{reportData.type}</h1>
        <button 
          className="close-button"
          onClick={onBackToDashboard}
          title="Close Report"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div className="report-layout">
        <div className="report-main">
          <div className="report-section">
            <h2>{alertType === 'sos' ? 'SoS Alert Details' : 'Report Details'}</h2>
            <div className="report-grid">
              <div className="detail-item">
                <label>Type:</label>
                <span>{reportData.type}</span>
              </div>
              <div className="detail-item">
                <label>Date Reported:</label>
                <span>{alertType === 'sos' ? reportData.formattedDate : formatDate(reportData.dateReported)}</span>
              </div>
              <div className="detail-item">
                <label>Location:</label>
                <span>{reportData.location}</span>
              </div>
              <div className="detail-item">
                <label>Status:</label>
                <StatusTag status={reportData.status} />
              </div>
              {alertType === 'sos' && (
                <>
                  <div className="detail-item">
                    <label>Alert Type:</label>
                    <span className="alert-type-badge">{reportData.alertType}</span>
                  </div>
                  <div className="detail-item">
                    <label>Device Type:</label>
                    <span>{reportData.deviceType}</span>
                  </div>
                  <div className="detail-item">
                    <label>User ID:</label>
                    <span className="user-id">{reportData.userId}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="report-section">
            <h2>{alertType === 'sos' ? 'User Information' : 'Reported By'}</h2>
            <div className="reporter-info">
              <div className="detail-item">
                <label>Name:</label>
                <span>{alertType === 'sos' ? reportData.reporterInfo.name : reportData.reportedBy.name}</span>
              </div>
              <div className="detail-item">
                <label>Phone:</label>
                <span>{alertType === 'sos' ? reportData.reporterInfo.phone : reportData.reportedBy.phone}</span>
              </div>
              <div className="detail-item">
                <label>Email:</label>
                <span>{alertType === 'sos' ? reportData.reporterInfo.email : reportData.reportedBy.email}</span>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Description</h2>
            <div className="description-content">
              <p>{reportData.description}</p>
            </div>
          </div>

          {alertType === 'sos' && reportData.fullLocation && (
            <div className="report-section">
              <h2>Detailed Location Information</h2>
              <div className="location-details">
                <div className="detail-item">
                  <label>Address:</label>
                  <span>{reportData.fullLocation.address || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <label>City:</label>
                  <span>{reportData.fullLocation.city || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <label>Country:</label>
                  <span>{reportData.fullLocation.country || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <label>Postal Code:</label>
                  <span>{reportData.fullLocation.postalCode || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <label>Coordinates:</label>
                  <span>{reportData.coordinates.latitude && reportData.coordinates.longitude 
                    ? `${reportData.coordinates.latitude}, ${reportData.coordinates.longitude}`
                    : 'Not available'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="report-section">
            <h2>Location Map</h2>
            <div className="map-container">
              {reportData.coordinates.latitude && reportData.coordinates.longitude ? (
                <div className="map-content">
                  <div style={{ height: 300, width: '100%' }}>
                    <MapContainer
                      center={[parseFloat(reportData.coordinates.latitude), parseFloat(reportData.coordinates.longitude)]}
                      zoom={17}
                      style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker
                        position={[parseFloat(reportData.coordinates.latitude), parseFloat(reportData.coordinates.longitude)]}
                        icon={redIcon}
                      >
                        <Popup>{reportData.location}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                  <div className="map-info">
                    <p><strong>Coordinates:</strong> {reportData.coordinates.latitude}, {reportData.coordinates.longitude}</p>
                    <p><strong>Address:</strong> {reportData.location}</p>
                  </div>
                </div>
              ) : (
                <div className="map-placeholder">
                  <div className="map-content">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <p>Location coordinates not available</p>
                    <small>{reportData.location}</small>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="report-section">
            <h2>Evidence Photos & Videos</h2>
            {reportData.multimedia && reportData.multimedia.some(media => 
              media.includes('file://') || media.includes('rn_image_picker') || media.includes('content://')
            ) && (
              <div style={{ 
                background: '#fef3c7', 
                border: '1px solid #f59e0b', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginBottom: '1rem',
                color: '#92400e'
              }}>
                <strong>Mobile App Images:</strong> Some images were captured on mobile devices. The system is checking if they are stored as base64 data in the database or need to be retrieved from cloud storage.
              </div>
            )}
            <div className="evidence-grid">
              {/* Display Photos */}
              {reportData.multimedia && reportData.multimedia.length > 0 && (
                reportData.multimedia.map((media, index) => (
                  <div key={`photo-${index}`} className="evidence-item">
                    {getImageDisplayComponent(media, index)}
                  </div>
                ))
              )}
              
              {/* Display Videos */}
              {reportData.videos && reportData.videos.length > 0 && (
                reportData.videos.map((videoUrl, index) => (
                  <div key={`video-${index}`} className="evidence-item">
                    {getVideoDisplayComponent(videoUrl, index)}
                  </div>
                ))
              )}
              
              {/* Show no evidence message if neither photos nor videos exist */}
              {(!reportData.multimedia || reportData.multimedia.length === 0) && 
               (!reportData.videos || reportData.videos.length === 0) && (
                <div className="no-evidence">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21,15 16,10 5,21"></polyline>
                  </svg>
                  <p>No evidence photos or videos available</p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons removed as requested */}
          {error && (
            <div className="report-section" style={{ marginTop: '1rem', borderLeft: '4px solid #ef4444' }}>
              <p style={{ color: 'var(--error)', margin: 0 }}>Error: {error}</p>
            </div>
          )}
          {dispatchResult && (
            <div className="report-section" style={{ marginTop: '1rem', borderLeft: '4px solid #10b981' }}>
              <p style={{ margin: 0 }}>
                Assigned Patrol: {dispatchResult.patrol_id ?? 'None'} | Severity: {dispatchResult.severity}
              </p>
              {dispatchResult.message && <small>{dispatchResult.message}</small>}
            </div>
          )}
        </div>

        <div className="ai-recommendations">
          <h2>Response Recommendations</h2>
          
          {dispatchSuccess && (
            <div className={`dispatch-success ${dispatchSuccess.error ? 'error' : dispatchSuccess.declined ? 'declined' : ''}`}>
              {dispatchSuccess.error ? (
                <p>{dispatchSuccess.error}</p>
              ) : dispatchSuccess.declined ? (
                <div>
                  <h4>Assignment Declined</h4>
                  <p><strong>Officer:</strong> {dispatchSuccess.policeName}</p>
                  <p><strong>Status:</strong> Report is now back to Pending and can be reassigned</p>
                </div>
              ) : (
                <div>
                  <h4>Officer Dispatched Successfully!</h4>
                  <p><strong>Officer:</strong> {dispatchSuccess.policeName}</p>
                  <p><strong>Dispatch ID:</strong> {dispatchSuccess.dispatchId}</p>
                  <p><strong>ETA:</strong> {dispatchSuccess.eta.min}-{dispatchSuccess.eta.max} minutes</p>
                </div>
              )}
            </div>
          )}

          
          <div className="recommendations-list">
            {policeRecommendations && policeRecommendations.length > 0 ? (
              policeRecommendations.map((police, index) => (
                <div key={police.id} className="recommendation-card">
                  <div className="recommendation-summary">
                    <p>
                      <strong>Recommended Responder:</strong> {police.firstName} {police.lastName} 
                      ({police.distance.toFixed(2)} km away, ETA {police.eta.min}-{police.eta.max} mins). 
                      <strong>Suggested route:</strong> {police.route.name} – {police.eta.trafficCondition} traffic. This is the fastest route to the crime scene.
                    </p>
                    <p className="contact-info">
                      <strong>Contact:</strong> {police.contactNumber || 'Not available'} | 
                      <strong>Status:</strong> {police.status || 'Available'}
                    </p>
                  </div>
                  
                  <div className="dispatch-actions">
                    <button 
                      className={`dispatch-button ${police.status === 'Dispatched' ? 'dispatched' : ''}`}
                      onClick={() => dispatchPolice(police.id, police)}
                      disabled={dispatching || police.status === 'Dispatched'}
                    >
                      {dispatching ? (
                        <>
                          <div className="loading-spinner-small"></div>
                          Dispatching...
                        </>
                      ) : police.status === 'Dispatched' ? (
                        'Already Dispatched'
                      ) : (
                        'Dispatch Officer'
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="recommendation-card">
                <h3>No Police Data Available</h3>
                <p>Unable to fetch police location data from database.</p>
                <p>Please ensure police accounts have location information.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {/* Lightbox for evidence photos */}
    {lightboxUrl && (
      <div 
        onClick={() => setLightboxUrl(null)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <img 
          src={lightboxUrl} 
          alt="Evidence"
          style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }}
          onClick={(e) => e.stopPropagation()}
        />
        <button 
          onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', top: 16, right: 16, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', borderRadius: 6, padding: '0.5rem 0.75rem', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>
    )}
    </>
  )
}

export default ViewReport



