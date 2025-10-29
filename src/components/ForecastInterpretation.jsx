import React, { useState, useEffect } from 'react'
import { generateForecastInterpretation } from '../services/geminiInterpretationService'
import './ForecastInterpretation.css'

const ForecastInterpretation = ({ 
  forecastData, 
  crimeType, 
  location,
  historicalData = [],
  forecastDataPoints = []
}) => {
  const [interpretation, setInterpretation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)

  useEffect(() => {
    const fetchInterpretation = async () => {
      if (!forecastData || !crimeType || !location) {
        return
      }

      // Check if we have enough data
      if (!forecastData.historical || forecastData.historical.length === 0) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await generateForecastInterpretation(
          forecastData,
          crimeType,
          location
        )
        setInterpretation(result)
      } catch (err) {
        console.error('Error fetching interpretation:', err)
        setError('Failed to generate interpretation. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchInterpretation()
  }, [forecastData, crimeType, location])

  // Reset to first card when interpretation changes
  useEffect(() => {
    if (interpretation) {
      setCurrentCardIndex(0)
    }
  }, [interpretation])

  if (!forecastData || !crimeType || !location) {
    return null
  }

  if (loading) {
    return (
      <div className="forecast-interpretation-card">
        <div className="interpretation-header">
          <h3 className="interpretation-title">Forecast Interpretation</h3>
        </div>
        <div className="interpretation-loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Generating interpretation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="forecast-interpretation-card">
        <div className="interpretation-header">
          <h3 className="interpretation-title">Forecast Interpretation</h3>
        </div>
        <div className="interpretation-error">
          <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!interpretation) {
    return null
  }

  const getTrendIcon = (trend) => {
    if (trend === 'increasing') {
      return (
        <svg className="trend-icon trend-icon-up" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      )
    } else if (trend === 'decreasing') {
      return (
        <svg className="trend-icon trend-icon-down" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )
    } else {
      return (
        <svg className="trend-icon trend-icon-stable" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      )
    }
  }

  const getTrendColor = (trend) => {
    if (trend === 'increasing') return '#ef4444'
    if (trend === 'decreasing') return '#10b981'
    return '#6b7280'
  }

  // Create cards array
  const cards = [
    {
      id: 'summary',
      title: 'Summary',
      icon: (
        <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      content: <p className="section-text">{interpretation.summary}</p>
    },
    {
      id: 'trend',
      title: 'Trend Analysis',
      icon: (
        <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
      ),
      content: <p className="section-text">{interpretation.trendExplanation}</p>
    },
    {
      id: 'implications',
      title: 'Operational Implications',
      icon: (
        <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      content: (
        <div className="implications-grid">
          <div className="implication-item">
            <div className="implication-header">
              <svg className="implication-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
              <h5 className="implication-title">Patrol Scheduling</h5>
            </div>
            <p className="implication-text">{interpretation.operationalImplications.patrolScheduling}</p>
          </div>
          <div className="implication-item">
            <div className="implication-header">
              <svg className="implication-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h5 className="implication-title">Resource Allocation</h5>
            </div>
            <p className="implication-text">{interpretation.operationalImplications.resourceAllocation}</p>
          </div>
          <div className="implication-item">
            <div className="implication-header">
              <svg className="implication-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
              <h5 className="implication-title">Community Safety</h5>
            </div>
            <p className="implication-text">{interpretation.operationalImplications.communitySafety}</p>
          </div>
        </div>
      )
    },
    {
      id: 'takeaways',
      title: 'Key Takeaways',
      icon: (
        <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      content: (
        <ul className="takeaways-list">
          {interpretation.keyTakeaways.map((takeaway, index) => (
            <li key={index} className="takeaway-item">
              <svg className="takeaway-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{takeaway}</span>
            </li>
          ))}
        </ul>
      )
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      icon: (
        <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      content: <p className="section-text recommendations-text">{interpretation.recommendations}</p>,
      isRecommendations: true
    }
  ]

  const currentCard = cards[currentCardIndex]
  const totalCards = cards.length

  const goToNext = () => {
    setCurrentCardIndex((prev) => (prev + 1) % totalCards)
  }

  const goToPrevious = () => {
    setCurrentCardIndex((prev) => (prev - 1 + totalCards) % totalCards)
  }

  return (
    <div className="forecast-interpretation-card flashcard-container">
      <div className="interpretation-header">
        <div className="header-left">
          <h3 className="interpretation-title">Forecast Interpretation</h3>
        </div>
        <div className="trend-badge" style={{ backgroundColor: `${getTrendColor(interpretation.trend)}15`, color: getTrendColor(interpretation.trend) }}>
          {getTrendIcon(interpretation.trend)}
          <span className="trend-text">{interpretation.trend.charAt(0).toUpperCase() + interpretation.trend.slice(1)}</span>
        </div>
      </div>

      <div className="flashcard-wrapper">
        <div className={`flashcard ${currentCard.isRecommendations ? 'recommendations-section' : ''}`}>
          <div className="section-header">
            {currentCard.icon}
            <h4 className="section-title">{currentCard.title}</h4>
          </div>
          <div className="flashcard-content">
            {currentCard.content}
          </div>
        </div>
      </div>

      <div className="flashcard-navigation">
        <button 
          className="nav-button prev-button" 
          onClick={goToPrevious}
          aria-label="Previous card"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Previous
        </button>
        
        <div className="card-indicators">
          {cards.map((_, index) => (
            <button
              key={index}
              className={`indicator-dot ${index === currentCardIndex ? 'active' : ''}`}
              onClick={() => setCurrentCardIndex(index)}
              aria-label={`Go to card ${index + 1}`}
            />
          ))}
        </div>

        <button 
          className="nav-button next-button" 
          onClick={goToNext}
          aria-label="Next card"
        >
          Next
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default ForecastInterpretation
