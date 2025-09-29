import { useState, useEffect } from 'react'
import { getDatabase, ref, get } from 'firebase/database'
import { app } from '../firebase'
import './ViewReport.css'

function ViewReport({ reportId }) {
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dispatchResult] = useState(null)

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
        const db = getDatabase(app)
        const reportRef = ref(db, `civilian/civilian crime reports/${reportId}`)
        const snapshot = await get(reportRef)
        
        if (snapshot.exists()) {
          const data = snapshot.val()
          
          // Fetch reporter information from civilian account
          let reporterInfo = {
            name: 'Anonymous',
            phone: 'Not provided',
            email: 'Not provided'
          }
          
          if (data.reporterUid) {
            try {
              const reporterRef = ref(db, `civilian/civilian account/${data.reporterUid}`)
              const reporterSnapshot = await get(reporterRef)
              
              if (reporterSnapshot.exists()) {
                const reporterData = reporterSnapshot.val()
                reporterInfo = {
                  name: `${reporterData.firstName || ''} ${reporterData.lastName || ''}`.trim() || 'Anonymous',
                  phone: reporterData.contactNumber || 'Not provided',
                  email: reporterData.email || 'Not provided'
                }
              }
            } catch (reporterErr) {
              console.error('Error fetching reporter info:', reporterErr)
              // Keep default values if reporter fetch fails
            }
          }
          
          // Debug multimedia data
          console.log('Multimedia data:', data.multimedia)
          
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
            multimedia: data.multimedia || []
          })
        } else {
          setError('Report not found')
        }
      } catch (err) {
        console.error('Error fetching report:', err)
        setError('Failed to load report data')
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [reportId])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <p style={{ color: 'red' }}>{error}</p>
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
    <div className="page-content">
      <div className="report-header">
        <h1>View Report</h1>
        <div className="report-id">Report ID: {reportData.reportId}</div>
      </div>
      
      <div className="report-layout">
        <div className="report-main">
          <div className="report-section">
            <h2>Report Details</h2>
            <div className="report-grid">
              <div className="detail-item">
                <label>Type:</label>
                <span>{reportData.type}</span>
              </div>
              <div className="detail-item">
                <label>Date Reported:</label>
                <span>{formatDate(reportData.dateReported)}</span>
              </div>
              <div className="detail-item">
                <label>Location:</label>
                <span>{reportData.location}</span>
              </div>
              <div className="detail-item">
                <label>Status:</label>
                <span className="status-badge status-pending">{reportData.status}</span>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Reported By</h2>
            <div className="reporter-info">
              <div className="detail-item">
                <label>Name:</label>
                <span>{reportData.reportedBy.name}</span>
              </div>
              <div className="detail-item">
                <label>Phone:</label>
                <span>{reportData.reportedBy.phone}</span>
              </div>
              <div className="detail-item">
                <label>Email:</label>
                <span>{reportData.reportedBy.email}</span>
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2>Description</h2>
            <div className="description-content">
              <p>{reportData.description}</p>
            </div>
          </div>

          <div className="report-section">
            <h2>Location Map</h2>
            <div className="map-container">
              {reportData.coordinates.latitude && reportData.coordinates.longitude ? (
                <div className="map-content">
                  <iframe
                    width="100%"
                    height="300"
                    style={{ border: 0, borderRadius: '8px' }}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${reportData.coordinates.longitude-0.01},${reportData.coordinates.latitude-0.01},${reportData.coordinates.longitude+0.01},${reportData.coordinates.latitude+0.01}&layer=mapnik&marker=${reportData.coordinates.latitude},${reportData.coordinates.longitude}`}
                    allowFullScreen
                    title="Report Location Map"
                  ></iframe>
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
            <h2>Evidence Photos</h2>
            <div className="evidence-grid">
              {reportData.multimedia && reportData.multimedia.length > 0 ? (
                reportData.multimedia.map((media, index) => {
                  console.log(`Media ${index}:`, media)
                  return (
                  <div key={index} className="evidence-item">
                    {media.includes('file://') ? (
                      <div className="evidence-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21,15 16,10 5,21"></polyline>
                        </svg>
                        <span>Photo {index + 1}</span>
                        <small>Mobile app file</small>
                        <div className="file-info">
                          <small>Path: {media.split('/').pop()}</small>
                        </div>
                      </div>
                    ) : media.startsWith('data:image/') ? (
                      <div className="evidence-photo">
                        <img 
                          src={media} 
                          alt={`Evidence photo ${index + 1}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
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
                    ) : media.includes('firebase') || media.includes('http') ? (
                      <div className="evidence-photo">
                        <img 
                          src={media} 
                          alt={`Evidence photo ${index + 1}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
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
                    ) : (
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
                    )}
                  </div>
                  )
                })
              ) : (
                <div className="no-evidence">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21,15 16,10 5,21"></polyline>
                  </svg>
                  <p>No evidence photos available</p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons removed as requested */}
          {error && (
            <div className="report-section" style={{ marginTop: '1rem', borderLeft: '4px solid #ef4444' }}>
              <p style={{ color: '#b91c1c', margin: 0 }}>Error: {error}</p>
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
          <h2>AI Response Recommendations</h2>
          <div className="recommendations-list">
            <div className="recommendation-card">
              <div className="recommendation-header">
                <span className="recommendation-type">Priority</span>
                <span className="recommendation-score">95%</span>
              </div>
              <h3>Immediate Response Required</h3>
              <p>This theft incident involves personal property and should be prioritized for immediate investigation. Recommend dispatching patrol unit within 30 minutes.</p>
            </div>
            
            <div className="recommendation-card">
              <div className="recommendation-header">
                <span className="recommendation-type">Investigation</span>
                <span className="recommendation-score">87%</span>
              </div>
              <h3>Evidence Collection Strategy</h3>
              <p>Security camera footage mentioned in description. Recommend collecting and analyzing CCTV recordings from nearby businesses for suspect identification.</p>
            </div>
            
            <div className="recommendation-card">
              <div className="recommendation-header">
                <span className="recommendation-type">Follow-up</span>
                <span className="recommendation-score">78%</span>
              </div>
              <h3>Witness Interview Protocol</h3>
              <p>Contact the reporting individual for additional details about the stolen items and any suspicious activity noticed before the incident.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewReport



