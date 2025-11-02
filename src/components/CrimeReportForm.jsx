import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDatabase, ref, push, set } from 'firebase/database'
import { app } from '../firebase'
import { useAuth } from '../providers/AuthProvider'
import './CrimeReportForm.css'

const CrimeReportForm = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    crimeType: '',
    severity: '',
    dateTime: '',
    description: '',
    location: '',
    barangay: '',
    anonymous: false,
    reporterName: ''
  })

  const crimeTypes = [
    'Theft',
    'Assault',
    'Vandalism',
    'Fraud',
    'Harassment',
    'Breaking and Entering',
    'Vehicle Theft',
    'Drug Related',
    'Domestic Violence',
    'Other'
  ]

  const severityLevels = [
    'Low',
    'Moderate',
    'High',
    'Immediate'
  ]

  const barangays = [
    'Barangay 41',
    'Barangay 43'
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validation
    if (!formData.crimeType || !formData.severity || !formData.dateTime || 
        !formData.description || !formData.location || !formData.barangay) {
      setError('Please fill in all required fields')
      return
    }

    // If not anonymous, require reporter name
    if (!formData.anonymous && !formData.reporterName.trim()) {
      setError('Please provide reporter name or check anonymous')
      return
    }

    try {
      setLoading(true)

      const db = getDatabase(app)
      const reportsRef = ref(db, 'civilian/civilian crime reports')
      
      // Generate report ID using timestamp
      const reportId = Date.now().toString()
      const createdAt = new Date().toISOString()
      
      // Format dateTime to ISO string
      const dateTimeISO = new Date(formData.dateTime).toISOString()

      // Prepare location object (for now just address, can be enhanced with geocoding later)
      const locationData = {
        address: formData.location,
        latitude: 0, // Can be enhanced with geocoding
        longitude: 0 // Can be enhanced with geocoding
      }

      // Prepare crime report data
      const crimeReportData = {
        reportId,
        crimeType: formData.crimeType,
        severity: formData.severity,
        dateTime: dateTimeISO,
        description: formData.description.trim(),
        location: locationData,
        barangay: formData.barangay,
        anonymous: formData.anonymous,
        status: 'pending',
        createdAt,
        ...(formData.anonymous ? {} : {
          reporterName: formData.reporterName.trim(),
          reporterUid: user?.uid || 'admin'
        })
      }

      // Push to Firebase RTDB
      const newReportRef = push(reportsRef)
      await set(newReportRef, crimeReportData)

      setSuccess(true)
      
      // Reset form
      setFormData({
        crimeType: '',
        severity: '',
        dateTime: '',
        description: '',
        location: '',
        barangay: '',
        anonymous: false,
        reporterName: ''
      })

      // Navigate back to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/')
      }, 2000)

    } catch (err) {
      console.error('Error submitting crime report:', err)
      setError(err.message || 'Failed to submit crime report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="crime-report-form-container">
      <div className="crime-report-form-card">
        <div className="form-header">
          <h1>Submit Crime Report</h1>
          <p>Fill in the details below to submit a new crime report</p>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        {success && (
          <div className="form-success">
            Crime report submitted successfully! Redirecting to dashboard...
          </div>
        )}

        <form onSubmit={handleSubmit} className="crime-report-form">
          <div className="form-group">
            <label htmlFor="crimeType">
              Crime Type <span className="required">*</span>
            </label>
            <select
              id="crimeType"
              name="crimeType"
              value={formData.crimeType}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Select crime type</option>
              {crimeTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="severity">
              Severity <span className="required">*</span>
            </label>
            <select
              id="severity"
              name="severity"
              value={formData.severity}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Select severity level</option>
              {severityLevels.map(level => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dateTime">
              Date and Time <span className="required">*</span>
            </label>
            <input
              type="datetime-local"
              id="dateTime"
              name="dateTime"
              value={formData.dateTime}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="barangay">
              Barangay <span className="required">*</span>
            </label>
            <select
              id="barangay"
              name="barangay"
              value={formData.barangay}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Select barangay</option>
              {barangays.map(barangay => (
                <option key={barangay} value={barangay}>
                  {barangay}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="location">
              Location <span className="required">*</span>
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter crime location address"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide details about the crime incident"
              required
              rows={5}
              className="form-textarea"
            />
          </div>

          <div className="form-group checkbox-group">
            <label htmlFor="anonymous" className="checkbox-label">
              <input
                type="checkbox"
                id="anonymous"
                name="anonymous"
                checked={formData.anonymous}
                onChange={handleChange}
                className="form-checkbox"
              />
              <span>Report anonymously</span>
            </label>
          </div>

          {!formData.anonymous && (
            <div className="form-group">
              <label htmlFor="reporterName">
                Reporter Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="reporterName"
                name="reporterName"
                value={formData.reporterName}
                onChange={handleChange}
                placeholder="Enter your name"
                required={!formData.anonymous}
                className="form-input"
              />
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CrimeReportForm

