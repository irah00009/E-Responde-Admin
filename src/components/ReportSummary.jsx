import React from 'react'
import './ReportSummary.css'

const ReportSummary = ({ reports = [] }) => {
  // Calculate statistics
  const totalReports = reports.length
  
  const statusCounts = {
    pending: 0,
    'in-progress': 0,
    dispatched: 0,
    resolved: 0,
    other: 0
  }
  
  const severityCounts = {
    low: 0,
    moderate: 0,
    high: 0,
    immediate: 0
  }
  
  const crimeTypeCounts = {}
  
  reports.forEach(report => {
    // Count by status
    const status = (report.status || 'other').toLowerCase()
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++
    } else {
      statusCounts.other++
    }
    
    // Count by severity
    const severity = (report.severity || '').toLowerCase()
    if (severityCounts.hasOwnProperty(severity)) {
      severityCounts[severity]++
    }
    
    // Count by crime type
    const crimeType = report.crimeType || report.type || report.crime_type || 'Unknown'
    crimeTypeCounts[crimeType] = (crimeTypeCounts[crimeType] || 0) + 1
  })
  
  const resolvedCount = statusCounts.resolved
  const pendingCount = statusCounts.pending + statusCounts['in-progress']
  const resolutionRate = totalReports > 0 ? ((resolvedCount / totalReports) * 100).toFixed(1) : 0
  
  // Get top crime types
  const topCrimeTypes = Object.entries(crimeTypeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  
  // Calculate average response time (simplified - would need actual timestamps)
  const recentReports = reports.filter(r => {
    const dateStr = r.dateTime || r.createdAt
    if (!dateStr) return false
    const date = new Date(dateStr)
    const daysDiff = (new Date() - date) / (1000 * 60 * 60 * 24)
    return daysDiff <= 30
  })
  
  return (
    <div className="report-summary">
      <h2 className="summary-title">Report Summary</h2>
      
      <div className="summary-grid">
        {/* Key Metrics */}
        <div className="summary-card primary">
          <div className="summary-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="summary-content">
            <div className="summary-value">{totalReports}</div>
            <div className="summary-label">Total Reports</div>
          </div>
        </div>
        
        <div className="summary-card success">
          <div className="summary-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="summary-content">
            <div className="summary-value">{resolvedCount}</div>
            <div className="summary-label">Resolved</div>
            <div className="summary-subtext">{resolutionRate}% resolution rate</div>
          </div>
        </div>
        
        <div className="summary-card warning">
          <div className="summary-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="summary-content">
            <div className="summary-value">{pendingCount}</div>
            <div className="summary-label">Pending</div>
            <div className="summary-subtext">Awaiting action</div>
          </div>
        </div>
        
        <div className="summary-card info">
          <div className="summary-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="summary-content">
            <div className="summary-value">{recentReports.length}</div>
            <div className="summary-label">Last 30 Days</div>
            <div className="summary-subtext">Recent activity</div>
          </div>
        </div>
      </div>
      
      {/* Status Breakdown */}
      <div className="summary-section">
        <h3 className="section-title">Status Breakdown</h3>
        <div className="status-breakdown">
          <div className="status-item">
            <span className="status-badge pending">Pending</span>
            <span className="status-count">{statusCounts.pending}</span>
          </div>
          <div className="status-item">
            <span className="status-badge in-progress">In Progress</span>
            <span className="status-count">{statusCounts['in-progress']}</span>
          </div>
          <div className="status-item">
            <span className="status-badge dispatched">Dispatched</span>
            <span className="status-count">{statusCounts.dispatched}</span>
          </div>
          <div className="status-item">
            <span className="status-badge resolved">Resolved</span>
            <span className="status-count">{statusCounts.resolved}</span>
          </div>
        </div>
      </div>
      
      {/* Severity Breakdown */}
      <div className="summary-section">
        <h3 className="section-title">Severity Breakdown</h3>
        <div className="severity-breakdown">
          <div className="severity-item">
            <span className="severity-badge low">Low</span>
            <span className="severity-count">{severityCounts.low}</span>
          </div>
          <div className="severity-item">
            <span className="severity-badge moderate">Moderate</span>
            <span className="severity-count">{severityCounts.moderate}</span>
          </div>
          <div className="severity-item">
            <span className="severity-badge high">High</span>
            <span className="severity-count">{severityCounts.high}</span>
          </div>
          <div className="severity-item">
            <span className="severity-badge immediate">Immediate</span>
            <span className="severity-count">{severityCounts.immediate}</span>
          </div>
        </div>
      </div>
      
      {/* Top Crime Types */}
      {topCrimeTypes.length > 0 && (
        <div className="summary-section">
          <h3 className="section-title">Top Crime Types</h3>
          <div className="crime-types-list">
            {topCrimeTypes.map(([type, count], index) => (
              <div key={type} className="crime-type-item">
                <div className="crime-type-rank">#{index + 1}</div>
                <div className="crime-type-name">{type}</div>
                <div className="crime-type-count">{count} reports</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportSummary

