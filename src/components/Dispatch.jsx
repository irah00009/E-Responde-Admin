import { useState, useEffect } from 'react'
import { getDatabase, ref, get, update } from 'firebase/database'
import { app } from '../firebase'
import './Dispatch.css'

function Dispatch() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatchData, setDispatchData] = useState({
    unit: '',
    priority: 'medium',
    notes: '',
    estimatedTime: ''
  })

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true)
        const db = getDatabase(app)
        const reportsRef = ref(db, 'civilian/civilian crime reports')
        const snapshot = await get(reportsRef)

        if (snapshot.exists()) {
          const reportsData = snapshot.val()
          const reportsArray = Object.entries(reportsData).map(([key, data]) => ({
            id: key,
            ...data
          }))
          // Filter for reports that need dispatch (pending, received, in progress)
          const dispatchableReports = reportsArray.filter(report => 
            report.status?.toLowerCase() === 'pending' ||
            report.status?.toLowerCase() === 'received' ||
            report.status?.toLowerCase() === 'in progress'
          )
          setReports(dispatchableReports)
        } else {
          setReports([])
        }
      } catch (err) {
        console.error('Error fetching reports:', err)
        setError('Failed to load dispatch reports')
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [])

  const handleDispatchReport = (report) => {
    setSelectedReport(report)
    setShowDispatchModal(true)
  }

  const handleDispatchSubmit = async () => {
    if (!selectedReport || !dispatchData.unit) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const db = getDatabase(app)
      const reportRef = ref(db, `civilian/civilian crime reports/${selectedReport.id}`)
      
      const updates = {
        status: 'Dispatched',
        dispatchInfo: {
          unit: dispatchData.unit,
          priority: dispatchData.priority,
          notes: dispatchData.notes,
          estimatedTime: dispatchData.estimatedTime,
          dispatchedAt: new Date().toISOString(),
          dispatchedBy: 'admin@e-responde.com'
        }
      }

      await update(reportRef, updates)
      
      // Update local state
      setReports(prev => prev.filter(report => report.id !== selectedReport.id))
      setShowDispatchModal(false)
      setSelectedReport(null)
      setDispatchData({
        unit: '',
        priority: 'medium',
        notes: '',
        estimatedTime: ''
      })
      
      alert('Report dispatched successfully!')
    } catch (err) {
      console.error('Error dispatching report:', err)
      alert('Failed to dispatch report')
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return '#dc2626'
      case 'medium': return '#d97706'
      case 'low': return '#16a34a'
      default: return '#6b7280'
    }
  }

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#f59e0b'
      case 'received': return '#3b82f6'
      case 'in progress': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="dispatch-container">
        <div className="loading">Loading dispatch reports...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dispatch-container">
        <div className="error">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="dispatch-container">
      <div className="dispatch-header">
        <h1>Dispatch Center</h1>
        <p>Manage and dispatch emergency response units to crime reports</p>
      </div>

      <div className="dispatch-stats">
        <div className="stat-card">
          <div className="stat-icon pending">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12,6 12,12 16,14"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-number">{reports.length}</span>
            <span className="stat-label">Pending Dispatch</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon high-priority">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-number">
              {reports.filter(r => r.priority === 'high').length}
            </span>
            <span className="stat-label">High Priority</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-number">
              {reports.filter(r => r.status?.toLowerCase() === 'in progress').length}
            </span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
      </div>

      <div className="dispatch-content">
        <div className="reports-section">
          <h2>Reports Awaiting Dispatch</h2>
          {reports.length === 0 ? (
            <div className="no-reports">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
              <p>No reports pending dispatch</p>
            </div>
          ) : (
            <div className="reports-grid">
              {reports.map((report) => (
                <div key={report.id} className="report-card">
                  <div className="report-header">
                    <div className="report-type">
                      <span className="type-badge">{report.crimeType || 'Unknown'}</span>
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(report.status) }}
                      >
                        {report.status}
                      </span>
                    </div>
                    <div className="report-time">
                      {new Date(report.dateTime || report.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="report-details">
                    <div className="detail-item">
                      <strong>Location:</strong> {report.location?.address || 'No location'}
                    </div>
                    <div className="detail-item">
                      <strong>Reporter:</strong> {report.reporterName || 'Anonymous'}
                    </div>
                    <div className="detail-item">
                      <strong>Description:</strong> 
                      <p className="description-text">
                        {report.description || 'No description provided'}
                      </p>
                    </div>
                  </div>

                  <div className="report-actions">
                    <button 
                      className="dispatch-btn"
                      onClick={() => handleDispatchReport(report)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                      </svg>
                      Dispatch Unit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="modal-overlay">
          <div className="modal-content dispatch-modal">
            <div className="modal-header">
              <h3>Dispatch Response Unit</h3>
              <button 
                className="close-btn"
                onClick={() => setShowDispatchModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="report-summary">
                <h4>Report Details</h4>
                <p><strong>Type:</strong> {selectedReport?.crimeType}</p>
                <p><strong>Location:</strong> {selectedReport?.location?.address}</p>
                <p><strong>Reporter:</strong> {selectedReport?.reporterName}</p>
              </div>

              <div className="dispatch-form">
                <div className="form-group">
                  <label>Response Unit *</label>
                  <input
                    type="text"
                    value={dispatchData.unit}
                    onChange={(e) => setDispatchData({...dispatchData, unit: e.target.value})}
                    placeholder="e.g., Unit Alpha-1, Patrol Car 42"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Priority Level</label>
                  <select
                    value={dispatchData.priority}
                    onChange={(e) => setDispatchData({...dispatchData, priority: e.target.value})}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Estimated Response Time</label>
                  <input
                    type="text"
                    value={dispatchData.estimatedTime}
                    onChange={(e) => setDispatchData({...dispatchData, estimatedTime: e.target.value})}
                    placeholder="e.g., 15 minutes, 30 minutes"
                  />
                </div>

                <div className="form-group">
                  <label>Dispatch Notes</label>
                  <textarea
                    value={dispatchData.notes}
                    onChange={(e) => setDispatchData({...dispatchData, notes: e.target.value})}
                    placeholder="Additional instructions or information for the response unit..."
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={() => setShowDispatchModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-dispatch"
                onClick={handleDispatchSubmit}
              >
                Dispatch Unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dispatch
