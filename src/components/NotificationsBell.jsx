import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDatabase, ref, onValue, off, set, query, orderByKey, limitToLast } from 'firebase/database'
import { realtimeDb } from '../firebase'

const NotificationsBell = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  // Listen for outside clicks and scroll to close dropdown
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleWheel = (event) => {
      if (!dropdownRef.current) return
      
      // Check if mouse wheel event happened inside the dropdown
      // by checking both the event target and mouse coordinates
      const target = event.target
      const isTargetInside = dropdownRef.current.contains(target)
      
      // Also check if mouse pointer is over the dropdown element
      const dropdownRect = dropdownRef.current.getBoundingClientRect()
      const isPointerInside = (
        event.clientX >= dropdownRect.left &&
        event.clientX <= dropdownRect.right &&
        event.clientY >= dropdownRect.top &&
        event.clientY <= dropdownRect.bottom
      )
      
      const isInsideDropdown = isTargetInside || isPointerInside
      
      // Only close if wheel event happened outside the dropdown
      // This allows scrolling inside the dropdown without closing it
      if (!isInsideDropdown) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    // Listen to wheel events to catch mouse wheel scrolling
    // We don't listen to scroll events because they fire when scrolling inside the dropdown too
    window.addEventListener('wheel', handleWheel, true)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('wheel', handleWheel, true)
    }
  }, [isOpen])

  // Set up real-time listeners for crime reports and SOS alerts
  useEffect(() => {
    const listeners = []
    let mounted = true
    let crimeReportsData = {}
    let sosAlertsData = {}
    let civilianNotificationsData = {}

    // Consolidated function to update notifications from all sources
    const updateAllNotifications = () => {
      if (!mounted) return

      const allNotifications = []

      // Process crime reports
      Object.entries(crimeReportsData || {}).forEach(([reportId, reportData]) => {
        let timestamp = reportData.dateTime || reportData.date || reportData.timestamp
        
        if (!timestamp && /^\d+$/.test(reportId)) {
          const keyAsNumber = parseInt(reportId)
          if (keyAsNumber > 946684800000 && keyAsNumber < 4102444800000) {
            timestamp = keyAsNumber
          } else if (keyAsNumber > 946684800 && keyAsNumber < 4102444800) {
            timestamp = keyAsNumber * 1000
          }
        }
        
        allNotifications.push({
          id: `crime_${reportId}`,
          type: 'crime_report',
          originalId: reportId,
          title: `New Crime Report: ${reportData.crimeType || reportData.type || 'Unknown'}`,
          message: reportData.description || reportData.details || 'New crime report submitted',
          timestamp: timestamp || Date.now(),
          reportedBy: reportData.reportedBy || reportData.userInfo || {
            name: reportData.name || 'Unknown User',
            email: reportData.email || '',
            phone: reportData.phone || ''
          },
          location: reportData.location || reportData.address || 'Unknown location',
          read: false
        })
      })

      // Process SOS alerts
      Object.entries(sosAlertsData || {}).forEach(([alertId, alertData]) => {
        if (alertData.resolvedAt) return // Skip resolved alerts
        
        let timestamp = alertData.timestamp || alertData.createdAt || alertData.dateTime
        
        if (!timestamp && /^\d+$/.test(alertId)) {
          const keyAsNumber = parseInt(alertId)
          if (keyAsNumber > 946684800000 && keyAsNumber < 4102444800000) {
            timestamp = keyAsNumber
          } else if (keyAsNumber > 946684800 && keyAsNumber < 4102444800) {
            timestamp = keyAsNumber * 1000
          }
        }
        
        allNotifications.push({
          id: `sos_${alertId}`,
          type: 'sos_alert',
          originalId: alertId,
          title: 'SOS Alert',
          message: alertData.message || alertData.description || 'Emergency SOS alert',
          timestamp: timestamp || Date.now(),
          reportedBy: alertData.userInfo || alertData.reportedBy || {
            name: alertData.name || 'Unknown User',
            email: alertData.email || '',
            phone: alertData.phone || ''
          },
          location: alertData.location || alertData.address || 'Unknown location',
          read: false
        })
      })

      // Process civilian notifications
      Object.entries(civilianNotificationsData || {}).forEach(([userId, userData]) => {
        if (userData.notifications) {
          Object.entries(userData.notifications).forEach(([notifId, notification]) => {
            if (notification.type === 'sos_alert' && !notification.read) {
              // Try to extract the actual SOS alert ID from the notification data
              // Check multiple possible locations where the alert ID might be stored
              let actualAlertId = notifId // Default to notification ID
              
              if (notification.data?.alertId) {
                actualAlertId = notification.data.alertId
              } else if (notification.data?.reportId) {
                actualAlertId = notification.data.reportId
              } else if (notification.data?.id) {
                actualAlertId = notification.data.id
              } else if (notification.alertId) {
                actualAlertId = notification.alertId
              } else if (notification.reportId) {
                actualAlertId = notification.reportId
              } else if (notification.sosAlertId) {
                actualAlertId = notification.sosAlertId
              }
              
              // Debug logging
              if (actualAlertId === notifId) {
                console.log('Warning: Using notification ID as alert ID (no alert ID found in notification data):', {
                  notifId,
                  notification: notification,
                  userId
                })
              } else {
                console.log('Extracted alert ID from notification:', {
                  notifId,
                  actualAlertId,
                  source: notification.data?.alertId ? 'data.alertId' : 
                          notification.data?.reportId ? 'data.reportId' :
                          notification.data?.id ? 'data.id' :
                          notification.alertId ? 'alertId' :
                          notification.reportId ? 'reportId' :
                          notification.sosAlertId ? 'sosAlertId' : 'unknown'
                })
              }
              
              allNotifications.push({
                id: `sos_notif_${userId}_${notifId}`,
                type: 'sos_notification',
                originalId: actualAlertId, // Use the actual alert ID, not the notification ID
                notificationId: notifId, // Store the notification ID separately for marking as read
                userId: userId,
                title: 'SOS Alert',
                message: notification.message || 'Emergency SOS alert',
                timestamp: notification.timestamp || notification.createdAt || Date.now(),
                reportedBy: {
                  name: userData.name || 'Unknown User',
                  email: userData.email || '',
                  phone: userData.phone || ''
                },
                read: false
              })
            }
          })
        }
      })

      // Update state with all notifications, preserving read status
      setNotifications(prev => {
        const readStatusMap = new Map(prev.map(n => [n.id, n.read]))
        
        // Merge with existing read status
        const notificationsWithReadStatus = allNotifications.map(notif => ({
          ...notif,
          read: readStatusMap.get(notif.id) || false
        }))
        
        // Sort by timestamp (newest first) and limit to 50
        return notificationsWithReadStatus
          .sort((a, b) => {
            const getTimestamp = (ts) => {
              if (!ts) return 0
              if (typeof ts === 'number') {
                return ts > 1000000000000 ? ts : ts * 1000
              }
              const date = new Date(ts)
              return isNaN(date.getTime()) ? 0 : date.getTime()
            }
            return getTimestamp(b.timestamp) - getTimestamp(a.timestamp)
          })
          .slice(0, 50)
      })

      setLoading(false)
    }

    const setupListeners = () => {
      try {
        setLoading(true)
        
        // Listen for new crime reports
        const crimeReportsRef = ref(realtimeDb, 'civilian/civilian crime reports')
        const crimeReportsQuery = query(crimeReportsRef, orderByKey(), limitToLast(50))
        
        const crimeReportsListener = onValue(crimeReportsQuery, (snapshot) => {
          if (!mounted) return
          
          if (snapshot.exists()) {
            crimeReportsData = snapshot.val() || {}
            updateAllNotifications()
          } else {
            crimeReportsData = {}
            updateAllNotifications()
          }
        }, (err) => {
          console.error('Error listening to crime reports:', err)
          if (mounted) {
            setError('Failed to load crime reports')
          }
        })

        listeners.push(() => off(crimeReportsRef, 'value', crimeReportsListener))

        // Listen for SOS alerts
        const sosAlertsRef = ref(realtimeDb, 'sos_alerts')
        const sosQuery = query(sosAlertsRef, orderByKey(), limitToLast(50))
        
        const sosListener = onValue(sosQuery, (snapshot) => {
          if (!mounted) return
          
          if (snapshot.exists()) {
            sosAlertsData = snapshot.val() || {}
            updateAllNotifications()
          } else {
            sosAlertsData = {}
            updateAllNotifications()
          }
        }, (err) => {
          console.error('Error listening to SOS alerts:', err)
          if (mounted) {
            setError('Failed to load SOS alerts')
          }
        })

        listeners.push(() => off(sosAlertsRef, 'value', sosListener))

        // Also check civilian notifications for SOS alerts
        const civilianNotificationsRef = ref(realtimeDb, 'civilian/civilian account')
        
        const civilianListener = onValue(civilianNotificationsRef, (snapshot) => {
          if (!mounted) return
          
          if (snapshot.exists()) {
            civilianNotificationsData = snapshot.val() || {}
            updateAllNotifications()
          } else {
            civilianNotificationsData = {}
            updateAllNotifications()
          }
        }, (err) => {
          console.error('Error listening to civilian notifications:', err)
        })

        listeners.push(() => off(civilianNotificationsRef, 'value', civilianListener))

      } catch (err) {
        console.error('Error setting up notification listeners:', err)
        if (mounted) {
          setError('Failed to initialize notifications')
          setLoading(false)
        }
      }
    }

    setupListeners()

    return () => {
      mounted = false
      listeners.forEach(cleanup => cleanup())
    }
  }, [])

  // Update unread count whenever notifications change
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length
    setUnreadCount(unread)
  }, [notifications])

  // Sort notifications by timestamp (newest first) - memoized
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      // Convert timestamps to numbers for comparison
      // Handle different timestamp formats
      const getTimestamp = (timestamp) => {
        if (!timestamp) return 0
        // If it's already a number, use it
        if (typeof timestamp === 'number') {
          return timestamp > 1000000000000 ? timestamp : timestamp * 1000 // Convert seconds to milliseconds if needed
        }
        // Try to parse as date
        const date = new Date(timestamp)
        return isNaN(date.getTime()) ? 0 : date.getTime()
      }
      
      const timeA = getTimestamp(a.timestamp)
      const timeB = getTimestamp(b.timestamp)
      return timeB - timeA // Descending order (newest first)
    })
  }, [notifications])

  // Load read status from localStorage
  useEffect(() => {
    const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]')
    setNotifications(prev => 
      prev.map(notif => ({
        ...notif,
        read: readNotifications.includes(notif.id)
      }))
    )
  }, [])

  const markAsRead = (notificationId) => {
    // Get notification before updating state
    const notification = notifications.find(n => n.id === notificationId)
    
    // Update state immediately
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )

    // Save to localStorage
    const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]')
    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId)
      localStorage.setItem('readNotifications', JSON.stringify(readNotifications))
    }

    // Update Firebase if it's a civilian notification
    // Use notificationId if available (for civilian notifications), otherwise use originalId
    if (notification?.userId) {
      const notifIdToUse = notification.notificationId || notification.originalId
      if (notifIdToUse) {
        const notifRef = ref(realtimeDb, `civilian/civilian account/${notification.userId}/notifications/${notifIdToUse}/read`)
        set(notifRef, true).catch(err => console.error('Error marking notification as read:', err))
      }
    }
  }

  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification)
    markAsRead(notification.id)
    setIsOpen(false)

    // Navigate to the appropriate report page using originalId
    let reportId = notification.originalId
    
    // If originalId is not available, extract from the id
    if (!reportId) {
      if (notification.id.startsWith('crime_')) {
        reportId = notification.id.replace('crime_', '')
      } else if (notification.id.startsWith('sos_')) {
        reportId = notification.id.replace('sos_', '')
      } else if (notification.id.startsWith('sos_notif_')) {
        // Extract from pattern: sos_notif_{userId}_{notifId}
        const match = notification.id.match(/sos_notif_\w+_(.+)/)
        reportId = match ? match[1] : notification.id
      } else {
        reportId = notification.id
      }
    }
    
    // Ensure reportId is a string and trim any whitespace
    reportId = String(reportId).trim()
    
    console.log('Extracted reportId:', reportId)
    console.log('Notification type:', notification.type)
    console.log('Full notification object:', JSON.stringify(notification, null, 2))
    
    // Navigate based on notification type
    if (notification.type === 'sos_alert' || notification.type === 'sos_notification') {
      const path = `/sos-alert/${reportId}`
      console.log('Navigating to SOS alert:', path)
      navigate(path)
    } else if (notification.type === 'crime_report') {
      const path = `/report/${reportId}`
      console.log('Navigating to crime report:', path)
      navigate(path)
    } else {
      console.warn('Unknown notification type:', notification.type)
    }
  }

  const markAllAsRead = () => {
    // Get all unread notifications before updating
    const unreadNotifications = notifications.filter(n => !n.read)
    const unreadIds = unreadNotifications.map(n => n.id)
    
    if (unreadIds.length === 0) return
    
    // Update all notifications at once
    setNotifications(prev => 
      prev.map(notif => 
        unreadIds.includes(notif.id) ? { ...notif, read: true } : notif
      )
    )

    // Save all to localStorage at once
    const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]')
    unreadIds.forEach(id => {
      if (!readNotifications.includes(id)) {
        readNotifications.push(id)
      }
    })
    localStorage.setItem('readNotifications', JSON.stringify(readNotifications))

    // Update Firebase for civilian notifications
    // Use notificationId if available (for civilian notifications), otherwise use originalId
    unreadNotifications.forEach(notification => {
      if (notification?.userId) {
        const notifIdToUse = notification.notificationId || notification.originalId
        if (notifIdToUse) {
          const notifRef = ref(realtimeDb, `civilian/civilian account/${notification.userId}/notifications/${notifIdToUse}/read`)
          set(notifRef, true).catch(err => console.error('Error marking notification as read:', err))
        }
      }
    })
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getNotificationIcon = (type) => {
    if (type === 'sos_alert' || type === 'sos_notification') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          console.log('Bell clicked!', isOpen)
          setIsOpen(!isOpen)
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
        aria-label="Notifications"
        type="button"
        style={{ pointerEvents: 'auto', zIndex: 50 }}
      >
        <svg 
          className="w-6 h-6 pointer-events-none" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed right-4 top-16 w-96 max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-2rem)] md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading notifications...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-4 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Notifications List */}
          {!loading && !error && (
            <div className="overflow-y-auto flex-1">
              {sortedNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sortedNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleNotificationClick(notification)
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>{formatTimestamp(notification.timestamp)}</span>
                            {notification.reportedBy?.name && (
                              <>
                                <span>•</span>
                                <span>{notification.reportedBy.name}</span>
                              </>
                            )}
                            {notification.originalId && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-xs">ID: {notification.originalId.substring(0, 8)}...</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
