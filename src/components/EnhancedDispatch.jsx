import { useState, useEffect } from 'react'
import { realtimeDb } from '../firebase'
import { ref, get, onValue, off, update, query, orderByChild, equalTo } from 'firebase/database'
import './EnhancedDispatch.css'

function EnhancedDispatch() {
  const [reports, setReports] = useState([])
  const [patrolUnits, setPatrolUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Dispatch-related state variables removed - implement your own state management
  const [realTimeStats, setRealTimeStats] = useState({
    totalReports: 0,
    activeDispatches: 0,
    availableUnits: 0,
    averageResponseTime: 0
  })
  const [liveTracking, setLiveTracking] = useState({})
  const [filterStatus, setFilterStatus] = useState('all')
  const [showActiveOfficersModal, setShowActiveOfficersModal] = useState(false)
  const [showAvailableOfficersModal, setShowAvailableOfficersModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [selectedOfficer, setSelectedOfficer] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [activeDispatches, setActiveDispatches] = useState([])
  const [undispatching, setUndispatching] = useState(false)

  useEffect(() => {
    fetchData()
    setupRealTimeListeners()
    
    return () => {
      // Cleanup listeners
      const reportsRef = ref(realtimeDb, 'civilian/civilian crime reports')
      const unitsRef = ref(realtimeDb, 'police/police account')
      off(reportsRef, 'value')
      off(unitsRef, 'value')
    }
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Fetch reports, patrol units, and SOS alerts in parallel
      const [reportsSnapshot, unitsSnapshot, sosSnapshot] = await Promise.all([
        get(ref(realtimeDb, 'civilian/civilian crime reports')),
        get(ref(realtimeDb, 'police/police account')),
        get(ref(realtimeDb, 'civilian/sos alerts'))
      ])
      
      // Process reports and clean up old/invalid data
      const reportsList = []
      const reportsToDelete = []
      
      if (reportsSnapshot.exists()) {
        const reportsData = reportsSnapshot.val()
        const totalReportsInDB = Object.keys(reportsData).length
        console.log('Total reports in database:', totalReportsInDB)
        
        const currentDate = new Date()
        const oct20 = new Date(currentDate.getFullYear(), 9, 20) // October 20
        const oct22 = new Date(currentDate.getFullYear(), 9, 22) // October 22
        
        Object.keys(reportsData).forEach(reportId => {
          const report = reportsData[reportId]
          const reportDate = new Date(report.createdAt || report.dateTime)
          
          // Check if report is outside the date range (not between Oct 20-22)
          const isOutsideDateRange = reportDate < oct20 || reportDate > oct22
          
          // Check if report has no location data
          const hasNoLocation = !report.location || 
            (!report.location.address && !report.location.latitude && !report.location.longitude)
          
          // Mark for deletion if outside date range or no location
          if (isOutsideDateRange || hasNoLocation) {
            reportsToDelete.push(reportId)
            return
          }
          
          reportsList.push({
            id: reportId,
            ...report,
            createdAt: reportDate,
            dispatchedAt: report.dispatchInfo?.dispatchedAt ? new Date(report.dispatchInfo.dispatchedAt) : null
          })
        })
        
        console.log('Reports after filtering:', reportsList.length)
        console.log('Reports marked for deletion:', reportsToDelete.length)
      } else {
        console.log('No reports found in database')
      }
      
      // Delete old/invalid reports
      if (reportsToDelete.length > 0) {
        console.log(`Cleaning up ${reportsToDelete.length} old/invalid reports...`)
        const deletePromises = reportsToDelete.map(reportId => {
          const reportRef = ref(realtimeDb, `civilian/civilian crime reports/${reportId}`)
          return update(reportRef, null) // Set to null to delete
        })
        await Promise.all(deletePromises)
        console.log(`Successfully deleted ${reportsToDelete.length} old/invalid reports`)
      }
      
      // Clean up SOS alerts
      const sosToDelete = []
      if (sosSnapshot.exists()) {
        const sosData = sosSnapshot.val()
        const currentDate = new Date()
        const oct20 = new Date(currentDate.getFullYear(), 9, 20) // October 20
        const oct22 = new Date(currentDate.getFullYear(), 9, 22) // October 22
        
        Object.keys(sosData).forEach(sosId => {
          const sos = sosData[sosId]
          const sosDate = new Date(sos.createdAt || sos.dateTime)
          
          // Check if SOS is outside the date range (not between Oct 20-22)
          const isOutsideDateRange = sosDate < oct20 || sosDate > oct22
          
          // Check if SOS has no location data
          const hasNoLocation = !sos.location || 
            (!sos.location.address && !sos.location.latitude && !sos.location.longitude)
          
          // Mark for deletion if outside date range or no location
          if (isOutsideDateRange || hasNoLocation) {
            sosToDelete.push(sosId)
          }
        })
      }
      
      // Delete old/invalid SOS alerts
      if (sosToDelete.length > 0) {
        console.log(`Cleaning up ${sosToDelete.length} old/invalid SOS alerts...`)
        const deleteSosPromises = sosToDelete.map(sosId => {
          const sosRef = ref(realtimeDb, `civilian/sos alerts/${sosId}`)
          return update(sosRef, null) // Set to null to delete
        })
        await Promise.all(deleteSosPromises)
        console.log(`Successfully deleted ${sosToDelete.length} old/invalid SOS alerts`)
      }
      
      // Process patrol units
      const unitsList = []
      if (unitsSnapshot.exists()) {
        const unitsData = unitsSnapshot.val()
        Object.keys(unitsData).forEach(unitId => {
          const unit = unitsData[unitId]
          if (unit.email && unit.firstName) {
            const currentLocation = unit.currentLocation || {}
            unitsList.push({
              id: unitId,
              ...unit,
              latitude: currentLocation.latitude || unit.latitude || 14.5995,
              longitude: currentLocation.longitude || unit.longitude || 120.9842,
              lastLocationUpdate: currentLocation.lastUpdated || null,
              status: unit.status || (unit.isActive !== false ? 'Available' : 'Unavailable')
            })
          }
        })
      }
      
      // Sort reports by creation date (newest first)
      reportsList.sort((a, b) => b.createdAt - a.createdAt)
      setReports(reportsList)
      setPatrolUnits(unitsList)
      
      // Calculate real-time stats
      calculateRealTimeStats(reportsList, unitsList)
      
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load dispatch data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeListeners = () => {
    // Listen for reports changes
    const reportsRef = ref(realtimeDb, 'civilian/civilian crime reports')
    onValue(reportsRef, (snapshot) => {
      if (snapshot.exists()) {
        const reportsData = snapshot.val()
        const reportsList = []
        
        Object.keys(reportsData).forEach(reportId => {
          const report = reportsData[reportId]
          reportsList.push({
            id: reportId,
            ...report,
            createdAt: new Date(report.createdAt || report.dateTime),
            dispatchedAt: report.dispatchInfo?.dispatchedAt ? new Date(report.dispatchInfo.dispatchedAt) : null
          })
        })
        
        reportsList.sort((a, b) => b.createdAt - a.createdAt)
        setReports(reportsList)
        calculateRealTimeStats(reportsList, patrolUnits)
      }
    })
    
    // Listen for patrol units changes
    const unitsRef = ref(realtimeDb, 'police/police account')
    onValue(unitsRef, (snapshot) => {
      if (snapshot.exists()) {
        const unitsData = snapshot.val()
        const unitsList = []
        
        Object.keys(unitsData).forEach(unitId => {
          const unit = unitsData[unitId]
          if (unit.email && unit.firstName) {
            const currentLocation = unit.currentLocation || {}
            unitsList.push({
              id: unitId,
              ...unit,
              latitude: currentLocation.latitude || unit.latitude || 14.5995,
              longitude: currentLocation.longitude || unit.longitude || 120.9842,
              lastLocationUpdate: currentLocation.lastUpdated || null,
              status: unit.status || (unit.isActive !== false ? 'Available' : 'Unavailable')
            })
          }
        })
        
        setPatrolUnits(unitsList)
        calculateRealTimeStats(reports, unitsList)
      }
    })
  }

  const calculateRealTimeStats = (reportsList, unitsList) => {
    const totalReports = reportsList.length
    const activeDispatchesList = reportsList.filter(report => 
      report.status?.toLowerCase() === 'dispatched' || 
      report.status?.toLowerCase() === 'in progress'
    )
    const activeDispatchesCount = activeDispatchesList.length
    
    // Count available units based on their actual status from database
    const availableUnits = unitsList.filter(unit => 
      unit.status === 'Available'
    ).length
    
    console.log('Available Units Calculation:', {
      totalUnits: unitsList.length,
      availableUnits: availableUnits,
      unitStatuses: unitsList.map(unit => ({ id: unit.id, name: `${unit.firstName} ${unit.lastName}`, status: unit.status }))
    })
    
    // Calculate average response time
    const dispatchedReports = reportsList.filter(report => 
      report.dispatchInfo?.dispatchedAt
    )
    
    let totalResponseTime = 0
    dispatchedReports.forEach(report => {
      if (report.dispatchInfo?.dispatchedAt && report.createdAt) {
        const responseTime = (report.dispatchInfo.dispatchedAt - report.createdAt) / 1000 / 60 // in minutes
        totalResponseTime += responseTime
      }
    })
    
    const averageResponseTime = dispatchedReports.length > 0 
      ? totalResponseTime / dispatchedReports.length 
      : 0
    
    // Update active dispatches with officer information
    const activeDispatchesWithOfficers = activeDispatchesList.map(report => {
      const assignedOfficer = unitsList.find(unit => unit.id === report.dispatchInfo?.unit)
      return {
        ...report,
        assignedOfficer: assignedOfficer ? {
          id: assignedOfficer.id,
          name: `${assignedOfficer.policeRank} ${assignedOfficer.firstName} ${assignedOfficer.lastName}`,
          email: assignedOfficer.email,
          contactNumber: assignedOfficer.contactNumber,
          status: assignedOfficer.status,
          location: assignedOfficer.latitude && assignedOfficer.longitude ? {
            latitude: assignedOfficer.latitude,
            longitude: assignedOfficer.longitude
          } : null
        } : null
      }
    })
    
    setActiveDispatches(activeDispatchesWithOfficers)
    setRealTimeStats({
      totalReports,
      activeDispatches: activeDispatchesCount,
      availableUnits,
      averageResponseTime: Math.round(averageResponseTime)
    })
  }

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    return distance
  }

  const sortPatrolUnitsByDistance = (units, crimeLat, crimeLon) => {
    if (!crimeLat || !crimeLon) return units

    return units.map(unit => {
      const unitLat = parseFloat(unit.latitude || 0)
      const unitLon = parseFloat(unit.longitude || 0)
      
      if (unitLat && unitLon && unitLat !== 0 && unitLon !== 0) {
        const distance = calculateDistance(crimeLat, crimeLon, unitLat, unitLon)
        return { ...unit, distance: distance }
      } else {
        return { ...unit, distance: 999999 }
      }
    }).sort((a, b) => {
      if (a.status === 'Available' && b.status !== 'Available') return -1
      if (b.status === 'Available' && a.status !== 'Available') return 1
      return a.distance - b.distance
    })
  }

  // Handle dispatch button click to show report information
  const handleDispatchClick = (report) => {
    setSelectedReport(report)
    setShowReportModal(true)
  }

  // Close report modal
  const handleCloseReportModal = () => {
    setShowReportModal(false)
    setSelectedReport(null)
    setSelectedOfficer('')
  }

  // Handle officer assignment and dispatch
  const handleAssignOfficer = async () => {
    if (!selectedReport || !selectedOfficer) {
      alert('Please select an officer to assign')
      return
    }

    if (isAssigning) {
      alert('Assignment is already in progress. Please wait...')
      return
    }

    setIsAssigning(true)

    try {
      console.log('Starting dispatch process...', {
        selectedReport: selectedReport,
        selectedOfficer: selectedOfficer,
        patrolUnits: patrolUnits,
        realtimeDb: realtimeDb
      })

      // Check if Firebase connection is available
      if (!realtimeDb) {
        throw new Error('Firebase Realtime Database connection not available')
      }

      const selectedUnit = patrolUnits.find(unit => unit.id === selectedOfficer)
      if (!selectedUnit) {
        console.error('Selected officer not found:', selectedOfficer)
        alert('Selected officer not found. Please refresh and try again.')
        return
      }

      console.log('Selected unit found:', selectedUnit)

      // Create dispatch information
      const dispatchInfo = {
        unit: selectedOfficer,
        unitName: `${selectedUnit.policeRank} ${selectedUnit.firstName} ${selectedUnit.lastName}`,
        unitEmail: selectedUnit.email,
        dispatchedAt: new Date().toISOString(),
        dispatchedBy: 'admin@e-responde.com'
      }

      console.log('Dispatch info created:', dispatchInfo)

      // Update the crime report status to Assigned (waiting for officer confirmation)
      try {
        console.log('Updating crime report...', selectedReport.id)
        const reportRef = ref(realtimeDb, `civilian/civilian crime reports/${selectedReport.id}`)
        await update(reportRef, {
          status: 'Assigned',
          dispatchInfo: dispatchInfo,
          assignmentStatus: 'Pending Confirmation'
        })
        console.log('Crime report updated successfully')
      } catch (error) {
        console.error('Error updating crime report:', error)
        throw new Error(`Failed to update crime report: ${error.message}`)
      }

      // Update officer status to Standby when assigned (waiting for confirmation)
      try {
        console.log('Updating officer status to Standby...', selectedOfficer)
        const officerRef = ref(realtimeDb, `police/police account/${selectedOfficer}`)
        await update(officerRef, {
          status: 'Standby'
        })
        console.log('Officer status updated to Standby successfully')
      } catch (error) {
        console.error('Error updating officer status:', error)
        throw new Error(`Failed to update officer status: ${error.message}`)
      }

      // Update the officer's current assignment
      try {
        console.log('Updating officer current assignment...')
        const currentAssignmentRef = ref(realtimeDb, `police/police account/${selectedOfficer}/currentAssignment`)
        const currentAssignmentData = {
          reportId: selectedReport.id,
          incidentType: selectedReport.crimeType || 'Emergency',
          incidentLocation: selectedReport.location?.address || 'Location not available',
          assignedAt: new Date().toISOString(),
          description: selectedReport.description || 'No description provided',
          assignmentStatus: 'Pending Confirmation',
          requiresMobileConfirmation: true
        }
        await update(currentAssignmentRef, currentAssignmentData)
        console.log('Officer current assignment updated successfully')
      } catch (error) {
        console.error('Error updating officer current assignment:', error)
        throw new Error(`Failed to update officer current assignment: ${error.message}`)
      }

      // Create notification for the dispatched officer
      try {
        console.log('Creating notification...')
        const notificationId = `dispatch_${selectedReport.id}_${Date.now()}`
        const notificationRef = ref(realtimeDb, `police/notifications/${selectedOfficer}/${notificationId}`)
        
        const notificationData = {
          id: notificationId,
          type: 'dispatch_assignment',
          title: 'New Dispatch Assignment - Confirmation Required',
          message: `You have been assigned to respond to a ${selectedReport.crimeType || 'emergency'} report. Please confirm your acceptance in the mobile app.`,
          reportId: selectedReport.id,
        reportDetails: {
          crimeType: selectedReport.crimeType || 'Emergency',
          location: selectedReport.location?.address || 'Location not available',
          description: selectedReport.description || 'No description provided'
        },
          dispatchInfo: dispatchInfo,
          createdAt: new Date().toISOString(),
          isRead: false,
          isActive: true,
          requiresConfirmation: true,
          assignmentStatus: 'Pending Confirmation'
        }

        await update(notificationRef, notificationData)
        console.log('Notification created successfully')
      } catch (error) {
        console.error('Error creating notification:', error)
        throw new Error(`Failed to create notification: ${error.message}`)
      }

      console.log('Officer dispatched successfully:', {
        reportId: selectedReport.id,
        officerId: selectedOfficer,
        officerName: dispatchInfo.unitName
      })

      alert(`Officer ${dispatchInfo.unitName} has been assigned to the incident. They will receive a notification and must confirm the assignment in their mobile app.`)
      
      // Close modal and refresh data
      handleCloseReportModal()
      await fetchData()

    } catch (error) {
      console.error('Error dispatching officer:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      })
      
      let errorMessage = 'Failed to dispatch officer. Please try again.'
      
      if (error.code === 'PERMISSION_DENIED') {
        errorMessage = 'Permission denied. Please check your Firebase rules.'
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your internet connection.'
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`
      }
      
      alert(errorMessage)
    } finally {
      setIsAssigning(false)
    }
  }


  const formatDate = (date) => {
    if (!date) return 'N/A'
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  const getStatusClass = (status) => {
    const normalizedStatus = status?.toLowerCase();
    if (normalizedStatus === "resolved" || normalizedStatus === "case resolved") {
      return "status-resolved";
    } else if (normalizedStatus === "in progress") {
      return "status-in-progress";
    } else if (normalizedStatus === "received") {
      return "status-received";
    } else if (normalizedStatus === "dispatched") {
      return "status-dispatched";
    } else if (normalizedStatus === "assigned") {
      return "status-assigned";
    } else {
      return "status-pending";
    }
  }

  // Handle when police officer confirms an assignment
  const handleOfficerConfirm = async (dispatch) => {
    console.log('Officer confirmation triggered for:', dispatch)
    
    if (!dispatch.assignedOfficer) {
      alert('No officer information available for this dispatch')
      return
    }

    try {
      console.log('Updating officer status to Dispatched after confirmation...')
      // Update officer status to Dispatched after confirmation
      const officerRef = ref(realtimeDb, `police/police account/${dispatch.assignedOfficer.id}`)
      await update(officerRef, {
        status: 'Dispatched',
        currentAssignment: {
          ...dispatch.currentAssignment,
          confirmedAt: new Date().toISOString(),
          assignmentStatus: 'Confirmed'
        }
      })
      console.log('Officer status updated to Dispatched successfully')

      console.log('Updating report status to Dispatched after confirmation...')
      // Update report status to Dispatched after officer confirmation
      const reportRef = ref(realtimeDb, `civilian/civilian crime reports/${dispatch.id}`)
      await update(reportRef, {
        status: 'Dispatched',
        assignmentStatus: 'Confirmed',
        confirmedAt: new Date().toISOString()
      })
      console.log('Report status updated to Dispatched successfully')

      // Update dispatch record to show confirmed status
      const dispatchRef = ref(realtimeDb, `dispatches/${dispatch.dispatchId}`)
      await update(dispatchRef, {
        status: 'Confirmed',
        confirmedAt: new Date().toISOString(),
        confirmedBy: dispatch.assignedOfficer.name
      })

      // Create notification for admin about the confirmation
      const adminNotificationId = `confirm_${dispatch.id}_${Date.now()}`
      const adminNotificationRef = ref(realtimeDb, `admin/notifications/${adminNotificationId}`)
      
      const adminNotificationData = {
        id: adminNotificationId,
        type: 'assignment_confirmed',
        title: 'Assignment Confirmed',
        message: `Officer ${dispatch.assignedOfficer.name} has confirmed the assignment for ${dispatch.crimeType || 'emergency'} report.`,
        reportId: dispatch.id,
        reportDetails: {
          crimeType: dispatch.crimeType || 'Emergency',
          location: dispatch.location?.address || 'Location not available',
          reporterName: dispatch.reporterName || 'Anonymous',
          description: dispatch.description || 'No description provided'
        },
        confirmedOfficer: {
          id: dispatch.assignedOfficer.id,
          name: dispatch.assignedOfficer.name,
          email: dispatch.assignedOfficer.email
        },
        createdAt: new Date().toISOString(),
        isRead: false,
        isActive: true
      }

      await update(adminNotificationRef, adminNotificationData)
      console.log('Admin notification created successfully')

      alert(`Officer ${dispatch.assignedOfficer.name} has confirmed the assignment. The report status is now Dispatched.`)
      
      // Refresh data to show updated status
      await fetchData()

    } catch (error) {
      console.error('Error processing officer confirmation:', error)
      alert('Failed to process officer confirmation. Please try again.')
    }
  }

  // Handle when police officer declines an assignment
  const handleOfficerDecline = async (dispatch) => {
    console.log('Officer decline triggered for:', dispatch)
    
    if (!dispatch.assignedOfficer) {
      alert('No officer information available for this dispatch')
      return
    }

    if (undispatching) {
      alert('Processing is already in progress. Please wait...')
      return
    }

    setUndispatching(true)
    console.log('Processing officer decline...')

    try {
      console.log('Updating officer status after decline...')
      // Update officer status back to Available and clear assignment
      const officerRef = ref(realtimeDb, `police/police account/${dispatch.assignedOfficer.id}`)
      await update(officerRef, {
        status: 'Available',
        currentAssignment: null
      })
      console.log('Officer status updated successfully')

      console.log('Updating report status back to Pending...')
      // Update report status back to Pending so it can be reassigned
      const reportRef = ref(realtimeDb, `civilian/civilian crime reports/${dispatch.id}`)
      await update(reportRef, {
        status: 'Pending',
        dispatchInfo: null,
        assignmentStatus: 'Declined',
        assignmentDeclined: {
          declinedBy: dispatch.assignedOfficer.name,
          declinedAt: new Date().toISOString(),
          reason: 'Officer declined assignment'
        }
      })
      console.log('Report status updated successfully')

      // Update dispatch record to show declined status
      const dispatchRef = ref(realtimeDb, `dispatches/${dispatch.dispatchId}`)
      await update(dispatchRef, {
        status: 'Declined',
        declinedAt: new Date().toISOString(),
        declinedBy: dispatch.assignedOfficer.name
      })

      // Create notification for admin about the decline
      const adminNotificationId = `decline_${dispatch.id}_${Date.now()}`
      const adminNotificationRef = ref(realtimeDb, `admin/notifications/${adminNotificationId}`)
      
      const adminNotificationData = {
        id: adminNotificationId,
        type: 'assignment_declined',
        title: 'Assignment Declined',
        message: `Officer ${dispatch.assignedOfficer.name} has declined the assignment for ${dispatch.crimeType || 'emergency'} report. The report is now back to Pending status and can be reassigned.`,
        reportId: dispatch.id,
        reportDetails: {
          crimeType: dispatch.crimeType || 'Emergency',
          location: dispatch.location?.address || 'Location not available',
          reporterName: dispatch.reporterName || 'Anonymous',
          description: dispatch.description || 'No description provided'
        },
        declinedOfficer: {
          id: dispatch.assignedOfficer.id,
          name: dispatch.assignedOfficer.name,
          email: dispatch.assignedOfficer.email
        },
        createdAt: new Date().toISOString(),
        isRead: false,
        isActive: true
      }

      await update(adminNotificationRef, adminNotificationData)

      alert(`Officer ${dispatch.assignedOfficer.name} has declined the assignment. The report is now back to Pending status and can be reassigned to another officer.`)
      
      // Refresh data to show updated status
      await fetchData()

    } catch (error) {
      console.error('Error processing officer decline:', error)
      alert('Error processing officer decline. Please try again.')
    } finally {
      setUndispatching(false)
    }
  }

  // Undispatch function to make officer available again
  const handleUndispatch = async (dispatch) => {
    console.log('Undispatch triggered for:', dispatch)
    
    if (!dispatch.assignedOfficer) {
      alert('No officer information available for this dispatch')
      return
    }

    if (undispatching) {
      alert('Undispatch is already in progress. Please wait...')
      return
    }

    const confirmUndispatch = window.confirm(
      `Are you sure you want to undispatch ${dispatch.assignedOfficer.name}? This will make them available for other assignments.`
    )

    if (!confirmUndispatch) return

    setUndispatching(true)
    console.log('Starting undispatch process...')

    try {
      console.log('Updating officer status...')
      // Update officer status back to Available
      const officerRef = ref(realtimeDb, `police/police account/${dispatch.assignedOfficer.id}`)
      await update(officerRef, {
        status: 'Available',
        currentAssignment: null
      })
      console.log('Officer status updated successfully')

      console.log('Updating report status...')
      // Update report status back to Pending
      const reportRef = ref(realtimeDb, `civilian/civilian crime reports/${dispatch.id}`)
      await update(reportRef, {
        status: 'Pending',
        dispatchInfo: null
      })
      console.log('Report status updated successfully')

      // Create notification for the officer about undispatch
      const notificationId = `undispatch_${dispatch.id}_${Date.now()}`
      const notificationRef = ref(realtimeDb, `police/notifications/${dispatch.assignedOfficer.id}/${notificationId}`)
      
      const notificationData = {
        id: notificationId,
        type: 'undispatch_notification',
        title: 'Dispatch Cancelled',
        message: `Your assignment to ${dispatch.crimeType || 'emergency'} report has been cancelled. You are now available for new assignments.`,
        reportId: dispatch.id,
        reportDetails: {
          crimeType: dispatch.crimeType || 'Emergency',
          location: dispatch.location?.address || 'Location not available',
          reporterName: dispatch.reporterName || 'Anonymous',
          description: dispatch.description || 'No description provided'
        },
        createdAt: new Date().toISOString(),
        isRead: false,
        isActive: true
      }

      await update(notificationRef, notificationData)

      // Also create a general notification
      const generalNotificationRef = ref(realtimeDb, `police/notifications/general/${notificationId}`)
      const generalNotificationData = {
        ...notificationData,
        assignedOfficer: {
          id: dispatch.assignedOfficer.id,
          name: dispatch.assignedOfficer.name,
          email: dispatch.assignedOfficer.email
        }
      }

      await update(generalNotificationRef, generalNotificationData)

      alert(`Officer ${dispatch.assignedOfficer.name} has been successfully undispatched and is now available for new assignments.`)

      // Refresh data to update the UI
      await fetchData()

    } catch (error) {
      console.error('Error undispatching officer:', error)
      alert('Failed to undispatch officer. Please try again.')
    } finally {
      setUndispatching(false)
    }
  }

  const filteredReports = reports.filter(report => {
    if (filterStatus === 'all') {
      return true // Show all reports when "All Status" is selected
    }
    
    const reportStatus = report.status?.toLowerCase() || ''
    const filterValue = filterStatus.toLowerCase()
    
    // Handle different status variations with comprehensive matching
    switch (filterValue) {
      case 'pending':
        return reportStatus === 'pending' || 
               reportStatus === 'under review' || 
               reportStatus === 'new' ||
               reportStatus === 'unassigned'
      
      case 'received':
        return reportStatus === 'received' || 
               reportStatus === 'acknowledged'
      
      case 'in progress':
        return reportStatus === 'in progress' || 
               reportStatus === 'in-progress' ||
               reportStatus === 'processing' ||
               reportStatus === 'investigating'
      
      case 'dispatched':
        return reportStatus === 'dispatched' || 
               reportStatus === 'assigned' ||
               reportStatus === 'en route'
      
      case 'resolved':
        return reportStatus === 'resolved' || 
               reportStatus === 'case resolved' ||
               reportStatus === 'completed' ||
               reportStatus === 'closed'
      
      default:
        // Fallback to exact match
        return reportStatus === filterValue
    }
  })

  // Debug logging for reports
  console.log('Total reports:', reports.length)
  console.log('Filtered reports:', filteredReports.length)
  console.log('Filter status:', filterStatus)
  console.log('Report statuses:', reports.map(r => ({ id: r.id, status: r.status, crimeType: r.crimeType })))
  console.log('Filtered report statuses:', filteredReports.map(r => ({ id: r.id, status: r.status, crimeType: r.crimeType })))

  if (loading) {
    return (
      <div className="enhanced-dispatch-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading enhanced dispatch system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="enhanced-dispatch-container">
      <section className="mb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black mb-2" style={{ 
            fontSize: '2.5rem', 
            fontWeight: '800', 
            color: '#1e293b', 
            letterSpacing: '-0.025em',
            textTransform: 'uppercase'
          }}>Dispatch Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="text-3xl font-bold text-black mb-2" style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              color: '#1e293b', 
              letterSpacing: '-0.025em'
            }}>{reports.length}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              color: '#64748b', 
              letterSpacing: '0.05em'
            }}>Total Reports</div>
          </div>
          
          <div className="card cursor-pointer transition-all duration-200 hover:bg-gray-50" onClick={() => setShowActiveOfficersModal(true)}>
            <div className="text-3xl font-bold text-black mb-2" style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              color: '#1e293b', 
              letterSpacing: '-0.025em'
            }}>{patrolUnits.filter(unit => unit.status === 'Dispatched').length}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              color: '#64748b', 
              letterSpacing: '0.05em'
            }}>Dispatched Officers</div>
          </div>
          
          <div className="card cursor-pointer transition-all duration-200 hover:bg-gray-50" onClick={() => setShowAvailableOfficersModal(true)}>
            <div className="text-3xl font-bold text-black mb-2" style={{ 
              fontSize: '3rem', 
              fontWeight: '800', 
              color: '#1e293b', 
              letterSpacing: '-0.025em'
            }}>{patrolUnits.filter(unit => unit.status === 'Available').length}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ 
              fontSize: '0.95rem', 
              fontWeight: '700', 
              color: '#64748b', 
              letterSpacing: '0.05em'
            }}>Available Officers</div>
          </div>
          
        </div>
      </section>


      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status Filter:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
            <option value="in progress">In Progress</option>
            <option value="dispatched">Dispatched</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        
        
         <button onClick={fetchData} className="refresh-btn">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
             <polyline points="23,4 23,10 17,10"></polyline>
             <polyline points="1,20 1,14 7,14"></polyline>
             <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
           </svg>
           Refresh
         </button>
      </div>

      {/* Reports Grid */}
      <div className="reports-section">
        <h2>Emergency Reports</h2>
        {filteredReports.length === 0 ? (
          <div className="no-reports">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="10"></circle>
            </svg>
            <h3>No Reports Found</h3>
            <p>No emergency reports match your current filters.</p>
          </div>
        ) : (
          <div className="reports-grid">
            {filteredReports.map((report) => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <div className="report-type">
                    <span className="type-badge">{report.crimeType || 'Unknown'}</span>
                    <span className={`status-badge ${getStatusClass(report.status)}`}>
                      {report.status}
                    </span>
                    {report.priority && (
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(report.priority) }}
                      >
                        {report.priority.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="report-time">
                    {formatDate(report.createdAt)}
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
                  
                  {report.dispatchInfo ? (
                    <div className="dispatch-info">
                      <strong>Dispatched to:</strong> {report.dispatchInfo.unitName}
                      <br />
                      <strong>Dispatched at:</strong> {formatDate(report.dispatchInfo.dispatchedAt)}
                      <br />
                      <strong>Priority:</strong> {report.dispatchInfo.priority}
                    </div>
                  ) : report.status?.toLowerCase() === 'dispatched' ? (
                    <div className="dispatch-info">
                      <strong>Status:</strong> Dispatched (Officer information not available)
                    </div>
                  ) : null}
                </div>

                <div className="report-actions">
                  {report.status !== 'Case Resolved' && (
                    <button 
                      className="dispatch-btn"
                      onClick={() => handleDispatchClick(report)}
                    >
                      Dispatch Unit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Information Modal */}
      {showReportModal && selectedReport && (
        <div className="modal-overlay">
          <div className="modal-content report-info-modal">
            <div className="modal-header">
              <h3>Crime Report Information</h3>
              <button className="close-btn" onClick={handleCloseReportModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="report-info-content">
                <div className="report-header-info">
                  <div className="report-type-info">
                    <span className="type-badge">{selectedReport.crimeType || 'Unknown'}</span>
                    <span className={`status-badge ${getStatusClass(selectedReport.status)}`}>
                      {selectedReport.status}
                    </span>
                    {selectedReport.priority && (
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: getPriorityColor(selectedReport.priority) }}
                      >
                        {selectedReport.priority.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="report-time-info">
                    {formatDate(selectedReport.createdAt)}
                  </div>
                </div>
                
                <div className="report-details-info">
                  <div className="detail-section">
                    <h4>Location Information</h4>
                    <div className="detail-item">
                      <strong>Address:</strong> {selectedReport.location?.address || 'No location provided'}
                    </div>
                    {selectedReport.location?.latitude && selectedReport.location?.longitude && (
                      <div className="detail-item">
                        <strong>Coordinates:</strong> 
                        {selectedReport.location.latitude.toFixed(6)}, {selectedReport.location.longitude.toFixed(6)}
                      </div>
                    )}
                  </div>
                  
                  <div className="detail-section">
                    <h4>Reporter Information</h4>
                    <div className="detail-item">
                      <strong>Name:</strong> {selectedReport.reporterName || 'Anonymous'}
                    </div>
                    {selectedReport.reporterContact && (
                      <div className="detail-item">
                        <strong>Contact:</strong> {selectedReport.reporterContact}
                      </div>
                    )}
                  </div>
                  
                  <div className="detail-section">
                    <h4>Incident Details</h4>
                    <div className="detail-item">
                      <strong>Description:</strong>
                      <p className="description-text">
                        {selectedReport.description || 'No description provided'}
                      </p>
                    </div>
                    {selectedReport.incidentType && (
                      <div className="detail-item">
                        <strong>Incident Type:</strong> {selectedReport.incidentType}
                      </div>
                    )}
                    {selectedReport.severity && (
                      <div className="detail-item">
                        <strong>Severity:</strong> {selectedReport.severity}
                      </div>
                    )}
                  </div>
                  
                  {selectedReport.dispatchInfo && (
                    <div className="detail-section">
                      <h4>Dispatch Information</h4>
                      <div className="detail-item">
                        <strong>Dispatched to:</strong> {selectedReport.dispatchInfo.unitName}
                      </div>
                      <div className="detail-item">
                        <strong>Dispatched at:</strong> {formatDate(selectedReport.dispatchInfo.dispatchedAt)}
                      </div>
                      <div className="detail-item">
                        <strong>Priority:</strong> {selectedReport.dispatchInfo.priority}
                      </div>
                      {selectedReport.dispatchInfo.estimatedTime && (
                        <div className="detail-item">
                          <strong>Estimated Response Time:</strong> {selectedReport.dispatchInfo.estimatedTime}
                        </div>
                      )}
                      {selectedReport.dispatchInfo.notes && (
                        <div className="detail-item">
                          <strong>Dispatch Notes:</strong> {selectedReport.dispatchInfo.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Police Officer Selection */}
              {!selectedReport.dispatchInfo && (
                <div className="officer-selection-section">
                  <h4>Assign Police Officer</h4>
                  <div className="officer-dropdown-container">
                    <label htmlFor="officer-select">Select Available Officer:</label>
                    <select
                      id="officer-select"
                      value={selectedOfficer}
                      onChange={(e) => setSelectedOfficer(e.target.value)}
                      className="officer-select"
                    >
                      <option value="">Choose an officer...</option>
                      {patrolUnits
                        .filter(unit => unit.status === 'Available')
                        .map((officer) => (
                          <option key={officer.id} value={officer.id}>
                            {officer.policeRank} {officer.firstName} {officer.lastName}
                            {officer.contactNumber && ` - ${officer.contactNumber}`}
                          </option>
                        ))}
                    </select>
                    {patrolUnits.filter(unit => unit.status === 'Available').length === 0 && (
                      <p className="no-officers-available">
                        No available officers at the moment
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={handleCloseReportModal}>
                Close
              </button>
              {!selectedReport.dispatchInfo && selectedOfficer && (
                <button 
                  className="assign-btn" 
                  onClick={handleAssignOfficer}
                  disabled={isAssigning}
                >
                  {isAssigning ? 'Assigning...' : 'Assign Officer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Officers Modal */}
      {showActiveOfficersModal && (
        <div className="modal-overlay">
          <div className="modal-content active-officers-modal">
            <div className="modal-header">
              <h3>Dispatched Police Officers</h3>
              <button className="close-btn" onClick={() => setShowActiveOfficersModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              {patrolUnits.filter(unit => unit.status === 'Dispatched').length === 0 ? (
                <div className="no-active-officers">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"></path>
                    <circle cx="12" cy="12" r="10"></circle>
                  </svg>
                  <h4>No Dispatched Officers</h4>
                  <p>There are currently no officers with "Dispatched" status.</p>
                </div>
              ) : (
                <div className="active-officers-list">
                  {patrolUnits
                    .filter(unit => unit.status === 'Dispatched')
                    .map((officer) => (
                    <div key={officer.id} className="active-officer-card">
                      <div className="officer-info">
                        <div className="officer-header">
                          <h4>{officer.policeRank} {officer.firstName} {officer.lastName}</h4>
                          <span className="status-badge status-dispatched">
                            Dispatched
                          </span>
                        </div>
                        
                        <div className="officer-details">
                          <div className="detail-row">
                            <strong>Officer ID:</strong> {officer.id}
                          </div>
                          <div className="detail-row">
                            <strong>Email:</strong> {officer.email}
                          </div>
                          <div className="detail-row">
                            <strong>Contact:</strong> {officer.contactNumber || 'Not available'}
                          </div>
                          <div className="detail-row">
                            <strong>Status:</strong> 
                            <span className="status-badge status-dispatched">Dispatched</span>
                          </div>
                          {officer.latitude && officer.longitude && (
                            <div className="detail-row">
                              <strong>Location:</strong> 
                              {officer.latitude.toFixed(4)}, {officer.longitude.toFixed(4)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowActiveOfficersModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Available Officers Modal */}
      {showAvailableOfficersModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Available Police Officers</h3>
              <button className="close-btn" onClick={() => setShowAvailableOfficersModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="officers-list">
                {patrolUnits.filter(unit => unit.status === 'Available').length > 0 ? (
                  patrolUnits
                    .filter(unit => unit.status === 'Available')
                    .map((officer, index) => (
                      <div key={officer.id} className="officer-card">
                        <div className="officer-info">
                          <div className="officer-name">
                            <strong>{officer.policeRank} {officer.firstName} {officer.lastName}</strong>
                          </div>
                          <div className="officer-details">
                            <div className="detail-row">
                              <strong>Email:</strong> {officer.email}
                            </div>
                            {officer.contactNumber && (
                              <div className="detail-row">
                                <strong>Contact:</strong> {officer.contactNumber}
                              </div>
                            )}
                            <div className="detail-row">
                              <strong>Status:</strong> 
                              <span className="status-badge status-available">Available</span>
                            </div>
                            {officer.latitude && officer.longitude && (
                              <div className="detail-row">
                                <strong>Location:</strong> 
                                {officer.latitude.toFixed(4)}, {officer.longitude.toFixed(4)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="no-officers">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <p>No available officers at the moment</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowAvailableOfficersModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedDispatch


