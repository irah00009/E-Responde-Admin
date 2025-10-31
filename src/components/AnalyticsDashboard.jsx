import React, { useState, useEffect } from 'react'
import { getDatabase, ref, get, onValue, off } from 'firebase/database'
import { app } from '../firebase'
import LineChart from './LineChart'
import ForecastInterpretation from './ForecastInterpretation'
import { 
  performLocalForecasting, 
  fetchAvailableFilters
} from '../services/localModelService'
import { 
  processReportWithGeotagging
} from '../services/geotaggingService'
import './AnalyticsDashboard.css'

const AnalyticsDashboard = () => {
  const [crimeData, setCrimeData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCrimeType, setSelectedCrimeType] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedTimeRange, setSelectedTimeRange] = useState('6')
  const [availableCrimeTypes, setAvailableCrimeTypes] = useState([])
  const [availableLocations, setAvailableLocations] = useState([])
  const [chartData, setChartData] = useState({
    historical: [],
    forecast: [],
    confidenceUpper: [],
    confidenceLower: []
  })
  const [forecastingData, setForecastingData] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [forecastError, setForecastError] = useState(null)

  // ✅ Load local filters (cleaned)
  const loadLocalData = async () => {
    try {
      console.log('Loading available filters from Firebase')
      const { barangays, crimeTypes } = await fetchAvailableFilters()
      
      const mappedCrimeTypes = Array.from(new Set(
        (crimeTypes || []).map(t => t === 'Emergency SOS' ? 'Others' : t)
      ))
      const targetBarangays = barangays.filter(
        b => b === 'Barangay 41' || b === 'Barangay 43'
      )
      
      console.log('Available crime types:', mappedCrimeTypes)
      console.log('Available barangays:', targetBarangays)
      
      setAvailableCrimeTypes(mappedCrimeTypes)
      setAvailableLocations(targetBarangays.length > 0 ? targetBarangays : ['Barangay 41', 'Barangay 43'])
    } catch (err) {
      console.error('Error loading local data:', err)
      setError(`Failed to load local data: ${err.message}`)
    }
  }

  // ✅ Forecasting
  const fetchForecastingData = async () => {
    if (!selectedCrimeType || !selectedLocation) {
      setForecastError('Please select both crime type and location')
      return
    }

    setForecastLoading(true)
    setForecastError(null)
    
    try {
      const data = await performLocalForecasting(
        selectedCrimeType, 
        selectedLocation, 
        parseInt(selectedTimeRange)
      )
      if (!data.success) throw new Error(data.error)

      setForecastingData(data)
      setChartData({
        historical: data.historical || [],
        forecast: data.forecast || [],
        confidenceUpper: data.confidenceUpper || [],
        confidenceLower: data.confidenceLower || []
      })
    } catch (err) {
      setForecastError(err.message)
      console.error('Forecast error:', err)
    } finally {
      setForecastLoading(false)
    }
  }

  // ✅ Fetch Crime Data with conflict resolved
  const fetchCrimeData = async () => {
    try {
      setLoading(true)
      setError(null)

      const db = getDatabase(app)
      const reportsRef = ref(db, 'civilian/civilian crime reports')
      const snapshot = await get(reportsRef)

      if (!snapshot.exists()) throw new Error('No crime reports found')

      const data = snapshot.val()
      const reportsArray = Object.entries(data).map(([key, d]) => ({
        id: key,
        ...d,
        location: d.location || {
          latitude: d.latitude || d.lat,
          longitude: d.longitude || d.lng,
          address: d.address || d.location_address || "Unknown location"
        }
      }))

      setCrimeData(reportsArray)

      // ✅ Unified clean crime type extraction
      const crimeTypes = [...new Set(
        reportsArray
          .map(r => r.crimeType || r.type || r.crime_type)
          .filter(Boolean)
          .map(t => t === 'Emergency SOS' ? 'Others' : String(t))
      )]
      const barangays = [...new Set(
        reportsArray.map(r => r.barangay).filter(Boolean)
      )]
      const targetBarangays = barangays.filter(
        b => b === 'Barangay 41' || b === 'Barangay 43'
      )

      setAvailableCrimeTypes(crimeTypes)
      setAvailableLocations(targetBarangays.length > 0 ? targetBarangays : ['Barangay 41', 'Barangay 43'])
    } catch (err) {
      console.error('Error fetching crime data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Realtime listener (cleaned + unified logic)
  useEffect(() => {
    const db = getDatabase(app)
    const reportsRef = ref(db, 'civilian/civilian crime reports')

    const unsubscribe = onValue(reportsRef, snapshot => {
      if (!snapshot.exists()) return

      const all = snapshot.val()
      const reportsArray = Object.entries(all).map(([key, d]) => ({
        id: key,
        ...d,
        location: d.location || {
          latitude: d.latitude || d.lat,
          longitude: d.longitude || d.lng,
          address: d.address || d.location_address || "Unknown location"
        }
      }))

      setCrimeData(reportsArray)

      const crimeTypes = [...new Set(
        reportsArray
          .map(r => r.crimeType || r.type || r.crime_type)
          .filter(Boolean)
          .map(t => t === 'Emergency SOS' ? 'Others' : String(t))
      )]
      const barangays = [...new Set(
        reportsArray.map(r => r.barangay).filter(Boolean)
      )]
      const targetBarangays = barangays.filter(
        b => b === 'Barangay 41' || b === 'Barangay 43'
      )

      setAvailableCrimeTypes(crimeTypes)
      setAvailableLocations(targetBarangays.length > 0 ? targetBarangays : ['Barangay 41', 'Barangay 43'])
    })

    return () => off(reportsRef, 'value', unsubscribe)
  }, [])

  // ✅ Initial load
  useEffect(() => {
    loadLocalData()
    fetchCrimeData()
  }, [])

  // ✅ Auto-update forecast on selection
  useEffect(() => {
    if (selectedCrimeType && selectedLocation) {
      fetchForecastingData()
    }
  }, [selectedCrimeType, selectedLocation, selectedTimeRange])

  // ✅ UI ---------------------------------------------------------------------------------------------------
  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="analytics-dashboard">
      <h1 className="text-2xl font-bold">Crime Trends Analytics</h1>

      <div className="dashboard-controls">
        <select value={selectedCrimeType} onChange={e => setSelectedCrimeType(e.target.value)}>
          <option value="">Select Crime Type</option>
          {availableCrimeTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
          <option value="">Select Location</option>
          {availableLocations.map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <select value={selectedTimeRange} onChange={e => setSelectedTimeRange(e.target.value)}>
          <option value="3">3 Months</option>
          <option value="6">6 Months</option>
          <option value="12">12 Months</option>
          <option value="24">24 Months</option>
        </select>

        <button onClick={fetchForecastingData}>Refresh Forecast</button>
      </div>

      {selectedCrimeType && selectedLocation && (
        <div>
          <LineChart
            historicalData={chartData.historical}
            forecastData={chartData.forecast}
            confidenceUpper={chartData.confidenceUpper}
            confidenceLower={chartData.confidenceLower}
            title={`${selectedCrimeType} in ${selectedLocation}`}
          />

          {forecastingData && forecastingData.success && (
            <ForecastInterpretation
              forecastData={forecastingData}
              crimeType={selectedCrimeType}
              location={selectedLocation}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default AnalyticsDashboard