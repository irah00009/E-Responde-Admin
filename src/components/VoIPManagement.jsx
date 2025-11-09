import { useState, useEffect } from 'react'
import { realtimeDb } from '../firebase'
import { ref, get, onValue, off, update } from 'firebase/database'
import './VoIPManagement.css'

function VoIPManagement() {
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCalls, setActiveCalls] = useState([])
  const [callStats, setCallStats] = useState({
    totalCalls: 0,
    activeCalls: 0,
    completedCalls: 0,
    missedCalls: 0,
    averageDuration: 0
  })
  const [selectedCall] = useState(null)
  const [showCallDetails] = useState(false)

  useEffect(() => {
    fetchCalls()
    setupRealTimeListeners()
    
    return () => {
      // Cleanup listeners
      const callsRef = ref(realtimeDb, 'voip_calls')
      off(callsRef, 'value')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCalls = async () => {
    try {
      setLoading(true)
      setError('')
      
      const callsRef = ref(realtimeDb, 'voip_calls')
      const snapshot = await get(callsRef)
      
      if (snapshot.exists()) {
        const callsData = snapshot.val()
        const callsList = []
        
        Object.keys(callsData).forEach(callId => {
          const call = callsData[callId]
          
          // Ensure caller and callee objects have proper structure
          const safeCall = {
            id: callId,
            ...call,
            caller: {
              name: call.caller?.name || 'Unknown',
              userType: call.caller?.userType || 'Unknown',
              userId: call.caller?.userId || 'unknown',
              ...call.caller
            },
            callee: {
              name: call.callee?.name || 'Unknown',
              userType: call.callee?.userType || 'Unknown',
              userId: call.callee?.userId || 'unknown',
              ...call.callee
            },
            createdAt: call.createdAt ? new Date(call.createdAt) : new Date(),
            answeredAt: call.answeredAt ? new Date(call.answeredAt) : null,
            endedAt: call.endedAt ? new Date(call.endedAt) : null,
            status: call.status || 'unknown',
            duration: call.duration || 0
          }
          
          callsList.push(safeCall)
        })
        
        // Sort by creation date (newest first)
        callsList.sort((a, b) => b.createdAt - a.createdAt)
        setCalls(callsList)
        
        // Calculate stats
        calculateCallStats(callsList)
      } else {
        setCalls([])
      }
      
    } catch (err) {
      console.error('Error fetching calls:', err)
      setError('Failed to load call data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeListeners = () => {
    const callsRef = ref(realtimeDb, 'voip_calls')
    
    onValue(callsRef, (snapshot) => {
      if (snapshot.exists()) {
        const callsData = snapshot.val()
        const callsList = []
        const activeCallsList = []
        
        Object.keys(callsData).forEach(callId => {
          const call = callsData[callId]
          
          // Ensure caller and callee objects have proper structure
          const callObj = {
            id: callId,
            ...call,
            caller: {
              name: call.caller?.name || 'Unknown',
              userType: call.caller?.userType || 'Unknown',
              userId: call.caller?.userId || 'unknown',
              ...call.caller
            },
            callee: {
              name: call.callee?.name || 'Unknown',
              userType: call.callee?.userType || 'Unknown',
              userId: call.callee?.userId || 'unknown',
              ...call.callee
            },
            createdAt: call.createdAt ? new Date(call.createdAt) : new Date(),
            answeredAt: call.answeredAt ? new Date(call.answeredAt) : null,
            endedAt: call.endedAt ? new Date(call.endedAt) : null,
            status: call.status || 'unknown',
            duration: call.duration || 0
          }
          
          callsList.push(callObj)
          
          // Track active calls
          if (call.status === 'ringing' || call.status === 'answered') {
            activeCallsList.push(callObj)
          }
        })
        
        // Sort by creation date (newest first)
        callsList.sort((a, b) => b.createdAt - a.createdAt)
        setCalls(callsList)
        setActiveCalls(activeCallsList)
        
        // Calculate stats
        calculateCallStats(callsList)
      }
    })
  }

  const calculateCallStats = (callsList) => {
    const totalCalls = callsList.length
    const activeCalls = callsList.filter(call => 
      call.status === 'ringing' || call.status === 'answered'
    ).length
    const completedCalls = callsList.filter(call => 
      call.status === 'ended'
    ).length
    const missedCalls = callsList.filter(call => 
      call.status === 'missed' || call.status === 'rejected'
    ).length
    
    // Calculate average duration
    const completedCallsWithDuration = callsList.filter(call => 
      call.status === 'ended' && call.answeredAt && call.endedAt
    )
    
    let totalDuration = 0
    completedCallsWithDuration.forEach(call => {
      const duration = (call.endedAt - call.answeredAt) / 1000 // in seconds
      totalDuration += duration
    })
    
    const averageDuration = completedCallsWithDuration.length > 0 
      ? totalDuration / completedCallsWithDuration.length 
      : 0
    
    setCallStats({
      totalCalls,
      activeCalls,
      completedCalls,
      missedCalls,
      averageDuration: Math.round(averageDuration)
    })
  }

  const formatDuration = (seconds) => {
    try {
      if (!seconds || isNaN(seconds) || seconds < 0) return '0s'
      if (seconds < 60) return `${Math.floor(seconds)}s`
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = Math.floor(seconds % 60)
      return `${minutes}m ${remainingSeconds}s`
    } catch (error) {
      console.warn('Error formatting duration:', error)
      return '0s'
    }
  }

  const formatDate = (date) => {
    try {
      if (!date) return 'N/A'
      const dateObj = date instanceof Date ? date : new Date(date)
      if (isNaN(dateObj.getTime())) return 'Invalid Date'
      return dateObj.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      console.warn('Error formatting date:', error)
      return 'N/A'
    }
  }

  const getStatusColor = (status) => {
    try {
      if (!status) return '#6b7280'
      switch (status.toLowerCase()) {
        case 'ringing': return '#f59e0b'
        case 'answered': return '#10b981'
        case 'ended': return '#10b981'
        case 'missed': return '#ef4444'
        case 'rejected': return '#dc2626'
        default: return '#6b7280'
      }
    } catch (error) {
      console.warn('Error getting status color:', error)
      return '#6b7280'
    }
  }

  const getStatusIcon = (status) => {
    try {
      if (!status) return ''
      switch (status.toLowerCase()) {
        case 'ringing': return ''
        case 'answered': return ''
        case 'ended': return ''
        case 'missed': return ''
        case 'rejected': return ''
        default: return ''
      }
    } catch (error) {
      console.warn('Error getting status icon:', error)
      return ''
    }
  }

  const formatStatus = (status) => {
    if (!status) return 'Unknown'
    const normalized = status.toLowerCase()
    if (normalized === 'ended') return 'Ended'
    if (normalized === 'rejected') return 'Rejected'
    return normalized
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const handleEndCall = async (callId) => {
    try {
      const callRef = ref(realtimeDb, `voip_calls/${callId}`)
      await update(callRef, {
        status: 'ended',
        endedAt: new Date().toISOString()
      })
      
      // Show success message
      alert('Call ended successfully')
    } catch (err) {
      console.error('Error ending call:', err)
      alert('Failed to end call. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="voip-management-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading VoIP calls...</p>
        </div>
      </div>
    )
  }

  // Error boundary for the component
  if (error) {
    return (
      <div className="voip-management-container">
        <div className="voip-management-header">
          <h1>VoIP Call Management</h1>
          <p>Monitor calls between responding police and civilian</p>
        </div>
        <div className="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          {error}
          <button onClick={fetchCalls} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="voip-management-container">
      <div className="voip-management-header">
        <h1>VoIP Call Management</h1>
        <p>Monitor calls between responding police and civilian</p>
      </div>

      {/* Call Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="card">
          <div
            className="text-3xl font-bold text-black mb-2"
            style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: '#1e293b',
              letterSpacing: '-0.025em'
            }}
          >
            {callStats.totalCalls}
          </div>
          <div
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              color: '#64748b',
              letterSpacing: '0.05em'
            }}
          >
            Total Calls
          </div>
        </div>

        <div className="card">
          <div
            className="text-3xl font-bold text-black mb-2"
            style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: '#1e293b',
              letterSpacing: '-0.025em'
            }}
          >
            {callStats.activeCalls}
          </div>
          <div
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              color: '#64748b',
              letterSpacing: '0.05em'
            }}
          >
            Active Calls
          </div>
        </div>

        <div className="card">
          <div
            className="text-3xl font-bold text-black mb-2"
            style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: '#1e293b',
              letterSpacing: '-0.025em'
            }}
          >
            {callStats.completedCalls}
          </div>
          <div
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              color: '#64748b',
              letterSpacing: '0.05em'
            }}
          >
            Completed
          </div>
        </div>

        <div className="card">
          <div
            className="text-3xl font-bold text-black mb-2"
            style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: '#1e293b',
              letterSpacing: '-0.025em'
            }}
          >
            {callStats.missedCalls}
          </div>
          <div
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              color: '#64748b',
              letterSpacing: '0.05em'
            }}
          >
            Missed
          </div>
        </div>

        <div className="card">
          <div
            className="text-3xl font-bold text-black mb-2"
            style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: '#1e293b',
              letterSpacing: '-0.025em'
            }}
          >
            {formatDuration(callStats.averageDuration)}
          </div>
          <div
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              color: '#64748b',
              letterSpacing: '0.05em'
            }}
          >
            Avg Duration
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          {error}
        </div>
      )}

      {/* Active Calls Section */}
      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading call data...</p>
        </div>
      )}

      {/* Active Calls */}
      {!loading && activeCalls.length > 0 && (
        <div className="active-calls-section">
          <h2>Active Calls</h2>
          <div className="active-calls-grid">
            {activeCalls.map((call) => (
              <div key={call.id} className="active-call-card">
                <div className="call-header">
                  <div className="call-status">
                    <span className="status-icon">{getStatusIcon(call.status)}</span>
                    <span className="status-text" style={{ color: getStatusColor(call.status) }}>
                      {formatStatus(call.status)}
                    </span>
                  </div>
                  <div className="call-actions">
                    {call.status === 'answered' && (
                      <button 
                        className="end-call-btn"
                        onClick={() => handleEndCall(call.id)}
                      >
                        End Call
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="call-participants">
                  <div className="participant">
                    <strong>Caller:</strong> {call.caller?.name || 'Unknown'} ({call.caller?.userType || 'Unknown'})
                  </div>
                  <div className="participant">
                    <strong>Callee:</strong> {call.callee?.name || 'Unknown'} ({call.callee?.userType || 'Unknown'})
                  </div>
                </div>
                
                <div className="call-time">
                  Started: {formatDate(call.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Calls Table */}
      <div className="calls-table-section">
        <div className="section-header">
          <h2>All Calls</h2>
          <button onClick={fetchCalls} className="refresh-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23,4 23,10 17,10"></polyline>
              <polyline points="1,20 1,14 7,14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            Refresh
          </button>
        </div>

        {calls.length === 0 ? (
          <div className="no-calls">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <h3>No Calls Found</h3>
            <p>No VoIP calls have been made yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="calls-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Caller</th>
                  <th>Callee</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Started</th>
                  <th>Ended</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call, index) => (
                  <tr key={call.id}>
                    <td className="call-number">{index + 1}</td>
                    <td className="call-caller">
                      <div className="caller-info">
                        <div className="caller-name">{call.caller?.name || 'Unknown'}</div>
                        <div className="caller-type">{call.caller?.userType || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="call-callee">
                      <div className="callee-info">
                        <div className="callee-name">{call.callee?.name || 'Unknown'}</div>
                        <div className="callee-type">{call.callee?.userType || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="call-status">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(call.status) }}
                      >
                        {getStatusIcon(call.status)} {formatStatus(call.status)}
                      </span>
                    </td>
                    <td className="call-duration">
                      {call.answeredAt && call.endedAt 
                        ? formatDuration((call.endedAt - call.answeredAt) / 1000)
                        : call.status === 'answered' && call.answeredAt
                        ? formatDuration((new Date() - call.answeredAt) / 1000)
                        : 'N/A'
                      }
                    </td>
                    <td className="call-started">{formatDate(call.createdAt)}</td>
                    <td className="call-ended">{formatDate(call.endedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Call Details Modal */}
      {showCallDetails && selectedCall && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Call Details</h3>
              <button className="modal-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="call-details-grid">
                <div className="detail-item">
                  <strong>Call ID:</strong> {selectedCall.id}
                </div>
                <div className="detail-item">
                  <strong>Status:</strong> 
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedCall.status) }}>
                    {getStatusIcon(selectedCall.status)} {formatStatus(selectedCall.status)}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Caller:</strong> {selectedCall.caller?.name || 'Unknown'} ({selectedCall.caller?.userType || 'Unknown'})
                </div>
                <div className="detail-item">
                  <strong>Callee:</strong> {selectedCall.callee?.name || 'Unknown'} ({selectedCall.callee?.userType || 'Unknown'})
                </div>
                <div className="detail-item">
                  <strong>Started:</strong> {formatDate(selectedCall.createdAt)}
                </div>
                <div className="detail-item">
                  <strong>Answered:</strong> {formatDate(selectedCall.answeredAt)}
                </div>
                <div className="detail-item">
                  <strong>Ended:</strong> {formatDate(selectedCall.endedAt)}
                </div>
                <div className="detail-item">
                  <strong>Duration:</strong> {
                    selectedCall.answeredAt && selectedCall.endedAt 
                      ? formatDuration((selectedCall.endedAt - selectedCall.answeredAt) / 1000)
                      : selectedCall.status === 'answered' && selectedCall.answeredAt
                      ? formatDuration((new Date() - selectedCall.answeredAt) / 1000)
                      : 'N/A'
                  }
                </div>
                {selectedCall.reportId && (
                  <div className="detail-item">
                    <strong>Related Report:</strong> {selectedCall.reportId}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="close-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoIPManagement
