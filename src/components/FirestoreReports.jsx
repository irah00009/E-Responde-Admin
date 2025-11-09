import { Fragment, useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { db as firestoreDb } from '../firebase'
import './FirestoreReports.css'

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateOnly = (dateString) => {
  if (!dateString) return 'Unknown date'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const truncate = (text, maxLength = 120) => {
  if (!text) return 'No description available'
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

const extractReporterName = (data) => {
  if (!data) return null

  const reportedBy = data.reportedBy
  if (reportedBy) {
    if (typeof reportedBy === 'string' && reportedBy.trim().length > 0) {
      return reportedBy.trim()
    }

    if (typeof reportedBy === 'object') {
      if (typeof reportedBy.name === 'string' && reportedBy.name.trim().length > 0) {
        return reportedBy.name.trim()
      }

      const combined = [reportedBy.firstName, reportedBy.lastName].filter(Boolean).join(' ').trim()
      if (combined.length > 0) {
        return combined
      }
    }
  }

  if (typeof data.reporterName === 'string' && data.reporterName.trim().length > 0) {
    return data.reporterName.trim()
  }

  return null
}

const normalizeDateValue = (value) => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  if (typeof value === 'number') return new Date(value).toISOString()
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString()
    } catch {
      return null
    }
  }
  return null
}

const buildLocationText = (payload) => {
  if (!payload) return 'Location not available'
  if (typeof payload === 'string') return payload
  if (payload.address) return payload.address
  if (payload.formatted_address) return payload.formatted_address
  if (payload.fullAddress) return payload.fullAddress
  if (payload.streetAddress) return payload.streetAddress
  if (payload.locationText) return payload.locationText
  if (payload.placeName) return payload.placeName
  if (payload.description) return payload.description
  return 'Location not available'
}

const FirestoreReports = () => {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeFilter, setTimeFilter] = useState('week')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showCustomInputs, setShowCustomInputs] = useState(false)
  const [customRange, setCustomRange] = useState({ start: '', end: '' })
  const [customDraft, setCustomDraft] = useState({ start: '', end: '' })
  const [customError, setCustomError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const filterMenuRef = useRef(null)

  const filterLabels = useMemo(() => ({
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'This Week',
    month: 'This Month',
    custom: 'Custom Range'
  }), [])

  const formatDateForLabel = useCallback((value) => {
    if (!value) return ''
    const date = new Date(value + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }, [])

  useEffect(() => {
    const reportsCollection = collection(firestoreDb, 'crime_reports')

    const unsubscribe = onSnapshot(
      reportsCollection,
      (snapshot) => {
        try {
          const mapped = snapshot.docs.map(doc => {
            const data = doc.data() || {}
            const locationSource = data.location || data.locationInfo || data.incidentLocation || data.address || data.locationText
            const threatAnalysis = data.threatAnalysis || data.mlThreatAnalysis || null

            return {
              id: doc.id,
              type: data.crimeType || data.type || data.reportType || 'Unknown',
              description: data.description || data.details || data.summary || '',
              location: buildLocationText(locationSource),
              date: normalizeDateValue(
                data.date ||
                data.dateTime ||
                data.createdAt ||
                data.reportedAt ||
                data.timestamp ||
                data.mlReclassifiedAt
              ),
              status: data.status || 'pending',
              severity: data.severity || data.predictedSeverity || 'moderate',
              reporterUid: data.reporterUid || data.userId || data.uid || null,
              threatDetected: data.threatDetected || (threatAnalysis ? threatAnalysis.isThreat : false),
              threatAnalysis,
              reporterDisplay: extractReporterName(data)
            }
          })

          setReports(mapped)
          setLoading(false)
        } catch (err) {
          console.error('Failed to parse Firestore crime_reports snapshot:', err)
          setError('Unable to load crime reports.')
          setLoading(false)
        }
      },
      (err) => {
        console.error('Firestore crime_reports listener error:', err)
        setError('Unable to load crime reports.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const aDate = a.date ? new Date(a.date).getTime() : 0
      const bDate = b.date ? new Date(b.date).getTime() : 0
      return bDate - aDate
    })
  }, [reports])

  const timeFilterRange = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (timeFilter) {
      case 'today':
        return {
          start: startOfToday.getTime(),
          end: now.getTime()
        }
      case 'yesterday': {
        const startYesterday = new Date(startOfToday)
        startYesterday.setDate(startYesterday.getDate() - 1)
        const endYesterday = new Date(startOfToday.getTime() - 1)
        return {
          start: startYesterday.getTime(),
          end: endYesterday.getTime()
        }
      }
      case 'week': {
        const startWeek = new Date(startOfToday)
        startWeek.setDate(startWeek.getDate() - 7)
        return {
          start: startWeek.getTime(),
          end: now.getTime()
        }
      }
      case 'month': {
        const startMonth = new Date(startOfToday)
        startMonth.setDate(1)
        return {
          start: startMonth.getTime(),
          end: now.getTime()
        }
      }
      case 'custom': {
        if (customRange.start && customRange.end) {
          const start = new Date(customRange.start + 'T00:00:00').getTime()
          const end = new Date(customRange.end + 'T23:59:59.999').getTime()
          if (Number.isFinite(start) && Number.isFinite(end) && start <= end) {
            return { start, end }
          }
        }
        return null
      }
      default:
        return null
    }
  }, [timeFilter, customRange])

  const isWithinTimeFilter = useCallback((reportDate) => {
    if (!timeFilterRange) {
      return true
    }

    if (!reportDate) {
      return false
    }

    const timestamp = new Date(reportDate).getTime()
    if (!Number.isFinite(timestamp)) {
      return false
    }

    if (timeFilterRange.start != null && timestamp < timeFilterRange.start) {
      return false
    }

    if (timeFilterRange.end != null && timestamp > timeFilterRange.end) {
      return false
    }

    return true
  }, [timeFilterRange])

  const currentFilterLabel = useMemo(() => {
    if (timeFilter === 'custom' && customRange.start && customRange.end) {
      return `${formatDateForLabel(customRange.start)} – ${formatDateForLabel(customRange.end)}`
    }
    return filterLabels[timeFilter] || 'Select Range'
  }, [timeFilter, customRange, filterLabels, formatDateForLabel])

  useEffect(() => {
    if (!showFilterMenu) return

    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setShowFilterMenu(false)
        setShowCustomInputs(false)
        setCustomError('')
      }
    }

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setShowFilterMenu(false)
        setShowCustomInputs(false)
        setCustomError('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [showFilterMenu])

  const handleFilterSelect = (value) => {
    setTimeFilter(value)
    setShowFilterMenu(false)
    setShowCustomInputs(false)
    setCustomError('')
  }

  const handleCustomSelect = () => {
    setShowCustomInputs(true)
    setCustomError('')
    setCustomDraft({
      start: customRange.start || '',
      end: customRange.end || ''
    })
  }

  const handleApplyCustomRange = () => {
    if (!customDraft.start || !customDraft.end) {
      setCustomError('Please select both start and end dates.')
      return
    }

    if (new Date(customDraft.start) > new Date(customDraft.end)) {
      setCustomError('Start date cannot be after end date.')
      return
    }

    setCustomRange({ start: customDraft.start, end: customDraft.end })
    setTimeFilter('custom')
    setShowCustomInputs(false)
    setShowFilterMenu(false)
    setCustomError('')
  }

  const handleCancelCustomRange = () => {
    setShowCustomInputs(false)
    setCustomError('')
  }

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return sortedReports.filter(report => {
      const matchesSearch = query.length === 0 || (() => {
        const haystacks = [
          report.reporterDisplay,
          report.description,
          report.location,
          report.type,
          report.id,
          report.status,
          report.severity
        ]

        return haystacks.some(value =>
          typeof value === 'string' && value.toLowerCase().includes(query)
        )
      })()

      if (!matchesSearch) return false

      return isWithinTimeFilter(report.date)
    })
  }, [sortedReports, searchQuery, isWithinTimeFilter])

  const groupedReports = useMemo(() => {
    const groups = new Map()

    filteredReports.forEach(report => {
      const timestamp = report.date ? new Date(report.date).getTime() : null
      const hasValidDate = Number.isFinite(timestamp)
      const dayTimestamp = hasValidDate ? new Date(new Date(report.date).setHours(0, 0, 0, 0)).getTime() : null
      const key = hasValidDate ? String(dayTimestamp) : 'unknown'

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: hasValidDate ? formatDateOnly(report.date) : 'Unknown Date',
          timestamp: dayTimestamp ?? -Infinity,
          reports: []
        })
      }

      groups.get(key).reports.push(report)
    })

    const result = Array.from(groups.values())

    result.forEach(group => {
      group.reports.sort((a, b) => {
        const aDate = a.date ? new Date(a.date).getTime() : 0
        const bDate = b.date ? new Date(b.date).getTime() : 0
        return bDate - aDate
      })
    })

    result.sort((a, b) => (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity))

    return result
  }, [filteredReports])

  return (
    <div className="firestore-page">
      <header className="firestore-header">
        <div>
          <h1>Case Resolved Crime Reports</h1>
        </div>
        <div className="firestore-controls-row">
          <div className="firestore-header-actions">
            <div className="firestore-search">
              <label htmlFor="firestore-search-input">Search</label>
              <div className="firestore-search-input-wrapper">
                <input
                  id="firestore-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Reporter, type, location, details..."
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="firestore-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            <div className="firestore-filter-dropdown" ref={filterMenuRef}>
              <button
                type="button"
                className="firestore-filter-button"
                onClick={() => setShowFilterMenu(prev => !prev)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 5h16" />
                  <path d="M7 12h10" />
                  <path d="M10 19h4" />
                </svg>
                <span>{currentFilterLabel}</span>
              </button>
              {showFilterMenu && (
                <div className="firestore-filter-menu">
                  <button
                    type="button"
                    className={timeFilter === 'today' ? 'active' : ''}
                    onClick={() => handleFilterSelect('today')}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={timeFilter === 'yesterday' ? 'active' : ''}
                    onClick={() => handleFilterSelect('yesterday')}
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    className={timeFilter === 'week' ? 'active' : ''}
                    onClick={() => handleFilterSelect('week')}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    className={timeFilter === 'month' ? 'active' : ''}
                    onClick={() => handleFilterSelect('month')}
                  >
                    This Month
                  </button>
                  <div className="firestore-filter-divider" />
                  {showCustomInputs ? (
                    <div className="firestore-custom-range">
                      <label>
                        <span>Start</span>
                        <input
                          type="date"
                          value={customDraft.start}
                          onChange={(event) => setCustomDraft(prev => ({ ...prev, start: event.target.value }))}
                        />
                      </label>
                      <label>
                        <span>End</span>
                        <input
                          type="date"
                          value={customDraft.end}
                          onChange={(event) => setCustomDraft(prev => ({ ...prev, end: event.target.value }))}
                        />
                      </label>
                      {customError && (
                        <p className="firestore-custom-error">{customError}</p>
                      )}
                      <div className="firestore-custom-actions">
                        <button type="button" className="cancel" onClick={handleCancelCustomRange}>
                          Cancel
                        </button>
                        <button type="button" className="apply" onClick={handleApplyCustomRange}>
                          Apply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={timeFilter === 'custom' ? 'active' : ''}
                      onClick={handleCustomSelect}
                    >
                      Custom Date Range
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <button className="firestore-button secondary" onClick={() => navigate(-1)}>
            Back
          </button>
          <span className="firestore-badge">{filteredReports.length} Reports</span>
        </div>
      </header>

      {loading && (
        <div className="firestore-status">Loading reports...</div>
      )}

      {error && (
        <div className="firestore-status error">{error}</div>
      )}

      {!loading && !error && (
        <div className="firestore-table-wrapper">
          {sortedReports.length === 0 ? (
            <div className="firestore-status">No reports found in Firestore.</div>
          ) : (
            <table className="firestore-table">
              <thead>
                <tr>
                  <th>Reporter</th>
                  <th>Type</th>
                  <th className="status-column">Status</th>
                  <th>Severity</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Details</th>
                  <th>Threat</th>
                </tr>
              </thead>
              <tbody>
                {groupedReports.map(group => (
                  <Fragment key={group.key}>
                    <tr className="firestore-date-row">
                      <td colSpan={8}>{group.label}</td>
                    </tr>
                    {group.reports.map(report => (
                      <tr
                        key={report.id}
                        className="firestore-row"
                        onClick={() => setSelectedReport(report)}
                        tabIndex={0}
                        role="button"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setSelectedReport(report)
                          }
                        }}
                      >
                        <td className={`firestore-reporter ${report.reporterDisplay ? '' : 'firestore-reporter--id'}`}>
                          {report.reporterDisplay || report.id}
                        </td>
                        <td>{report.type}</td>
                        <td className="firestore-status-cell">
                          <span className={`firestore-status-pill ${((report.status || 'pending').toLowerCase().replace(/\s+/g, '-'))}`}>
                            {report.status || 'pending'}
                          </span>
                        </td>
                        <td>{report.severity || 'moderate'}</td>
                        <td>{formatDate(report.date)}</td>
                        <td>{truncate(report.location, 80)}</td>
                        <td>{truncate(report.description, 160)}</td>
                        <td>{report.threatDetected ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selectedReport && (
        <div className="firestore-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="firestore-modal" onClick={(event) => event.stopPropagation()}>
            <div className="firestore-modal-header">
              <h2>{selectedReport.type || 'Report Details'}</h2>
              <button
                type="button"
                className="firestore-modal-close"
                onClick={() => setSelectedReport(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>
            <div className="firestore-modal-body">
              <dl className="firestore-modal-details">
                <div>
                  <dt>Reporter</dt>
                  <dd>{selectedReport.reporterDisplay || selectedReport.id}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selectedReport.status || 'Unknown'}</dd>
                </div>
                <div>
                  <dt>Severity</dt>
                  <dd>{selectedReport.severity || 'N/A'}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatDate(selectedReport.date)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selectedReport.location || 'Not provided'}</dd>
                </div>
                <div>
                  <dt>Details</dt>
                  <dd>{selectedReport.description || 'No description available'}</dd>
                </div>
                <div>
                  <dt>Threat Detected</dt>
                  <dd>{selectedReport.threatDetected ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Report ID</dt>
                  <dd className="firestore-modal-id">{selectedReport.id}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FirestoreReports

