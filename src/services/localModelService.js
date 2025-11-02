import { getDatabase, ref, get } from 'firebase/database'
import { app } from '../firebase'
import { processReportWithGeotagging } from './geotaggingService'

// Model configuration
const AVAILABLE_CRIME_TYPES = [
  'Assault',
  'Breaking and Entering', 
  'Domestic Violence',
  'Drug Related',
  'Fraud',
  'Harassment',
  'Other',
  'Theft',
  'Vandalism',
  'Vehicle Theft'
]

const AVAILABLE_LOCATIONS = [
  'Barangay 41',
  'Barangay 43'
]

// Model file mapping
const getModelFileName = (crimeType, location) => {
  const cleanCrimeType = crimeType.replace(/\s+/g, '_')
  const cleanLocation = location.replace(/\s+/g, '_')
  return `model_${cleanCrimeType}__${cleanLocation}.pkl`
}

// Check if model exists
export const modelExists = (crimeType, location) => {
  // Normalize "Other" and "Others" to "Other"
  let normalizedCrimeType = crimeType
  if (crimeType === 'Others') {
    normalizedCrimeType = 'Other'
  }
  
  const modelFile = getModelFileName(normalizedCrimeType, location)
  // In a real implementation, you would check if the file exists
  // For now, we'll assume all combinations exist based on the files we saw
  return AVAILABLE_CRIME_TYPES.includes(normalizedCrimeType) && AVAILABLE_LOCATIONS.includes(location)
}

// Get model name for display
export const getModelName = (crimeType, location) => {
  return `${crimeType} - ${location}`
}

// Fetch historical data from Firebase
export const fetchHistoricalData = async (crimeType, barangay) => {
  try {
    console.log(`📊 Fetching data for ${crimeType} in ${barangay}`);

    const db = getDatabase(app);
    const reportsRef = ref(db, 'civilian/civilian crime reports');
    const snapshot = await get(reportsRef);

    if (!snapshot.exists()) {
      console.warn('⚠️ No data found in Realtime Database.');
      return [];
    }

    const reports = snapshot.val();
    const allReports = Object.entries(reports).map(([id, data]) => ({
      id,
      ...data,
    }));

    // Filter reports based on selected barangay + crimeType
    const filteredReports = allReports.filter((report) => {
      const reportBarangay = (report.barangay || '').trim().toLowerCase();
      let reportCrime = (report.crimeType || '').trim().toLowerCase();
      const targetBarangay = barangay.trim().toLowerCase();
      let targetCrime = crimeType.trim().toLowerCase();

      // Normalize "Other" and "Others" to match both variations
      if (targetCrime === 'others') {
        targetCrime = 'other';
      }
      if (reportCrime === 'others') {
        reportCrime = 'other';
      }

      const matches = (
        reportBarangay === targetBarangay &&
        crimeMatches &&
        report.dateTime
      );

      // Debug logging for "Other" crime type
      if (crimeType.toLowerCase() === 'other' || crimeType.toLowerCase() === 'others') {
        if (reportCrime === 'other' || reportCrime === 'others') {
          console.log(`🔍 Filtering report for "Other":`, {
            reportId: report.id || report.reportId,
            reportCrime: report.crimeType,
            normalizedReportCrime: reportCrime,
            targetCrime: crimeType,
            normalizedTargetCrime: targetCrime,
            matches
          });
        }
      }

      return matches;
    });

    if (filteredReports.length === 0) {
      console.warn(`⚠️ No reports found for ${crimeType} in ${barangay}`);
      return [];
    }

    // Group by month (for time-series)
    const monthlyData = {};
    filteredReports.forEach((report) => {
      const date = new Date(report.dateTime);
      if (isNaN(date)) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    const historicalData = Object.entries(monthlyData)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log(`✅ Found ${historicalData.length} data points`);
    console.log(historicalData);

    return historicalData;
  } catch (error) {
    console.error('❌ Error fetching crime data:', error);
    throw error;
  }
};

// Helper function to generate historical data from reports
const generateHistoricalDataFromReports = async (reports) => {
  // Sort by date
  reports.sort((a, b) => new Date(a.date) - new Date(b.date))
  
  // Group by month
  const monthlyData = {}
  reports.forEach(report => {
    const date = new Date(report.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = 0
    }
    monthlyData[monthKey]++
  })
  
  // Convert to array format
  const historicalData = Object.entries(monthlyData)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date))
  
  console.log(`📊 Generated ${historicalData.length} monthly data points`)
  
  return historicalData
}

// Generate forecast using local ARIMA-like calculations (no API calls)
export const generateLocalForecast = (historicalData, months = 6) => {
  if (!historicalData || historicalData.length === 0) {
    return {
      forecast: [],
      confidenceUpper: [],
      confidenceLower: [],
      statistics: {
        trend: 0,
        r_squared: 0,
        forecast_mae: 0,
        forecast_rmse: 0,
        forecast_bias: 0,
        data_points: 0
      }
    }
  }
  
  console.log(`🔮 Generating local ARIMA-like forecast for ${historicalData.length} data points`)
  
  const n = historicalData.length
  const x = historicalData.map((_, i) => i)
  const y = historicalData.map(d => d.value)
  
  // Calculate linear regression (ARIMA-like trend)
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
  
  // Handle edge case where all x values are the same
  const denominator = (n * sumXX - sumX * sumX)
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator
  const intercept = (sumY - slope * sumX) / n
  
  // Calculate R-squared (model accuracy)
  const yMean = sumY / n
  const ssRes = y.reduce((sum, yi, i) => {
    const predicted = slope * x[i] + intercept
    return sum + Math.pow(yi - predicted, 2)
  }, 0)
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
  const rSquared = ssTot === 0 ? 1 : Math.max(0, 1 - (ssRes / ssTot))
  
  // Calculate Forecast metrics using walk-forward validation (last 20% of data)
  let forecastMae = 0
  let forecastRmse = 0
  let forecastBias = 0
  if (n >= 5) {
    const trainSize = Math.floor(n * 0.8) // Use 80% for training
    const testStart = trainSize
    
    // Calculate slope and intercept using only training data
    const trainX = x.slice(0, trainSize)
    const trainY = y.slice(0, trainSize)
    const trainN = trainSize
    
    const trainSumX = trainX.reduce((a, b) => a + b, 0)
    const trainSumY = trainY.reduce((a, b) => a + b, 0)
    const trainSumXY = trainX.reduce((sum, xi, i) => sum + xi * trainY[i], 0)
    const trainSumXX = trainX.reduce((sum, xi) => sum + xi * xi, 0)
    
    const trainDenominator = (trainN * trainSumXX - trainSumX * trainSumX)
    const trainSlope = trainDenominator === 0 ? 0 : (trainN * trainSumXY - trainSumX * trainSumY) / trainDenominator
    const trainIntercept = (trainSumY - trainSlope * trainSumX) / trainN
    
    // Test on remaining 20% of data (out-of-sample)
    const testData = []
    for (let i = testStart; i < n; i++) {
      const predicted = trainSlope * x[i] + trainIntercept
      testData.push({
        actual: y[i],
        predicted: predicted
      })
    }
    
    // Calculate metrics on test set
    if (testData.length > 0) {
      forecastMae = testData.reduce((sum, d) => sum + Math.abs(d.actual - d.predicted), 0) / testData.length
      forecastRmse = Math.sqrt(testData.reduce((sum, d) => sum + Math.pow(d.actual - d.predicted, 2), 0) / testData.length)
      forecastBias = testData.reduce((sum, d) => sum + (d.actual - d.predicted), 0) / testData.length
    }
  }
  
  console.log(`📈 Trend: ${slope.toFixed(3)}, R²: ${rSquared.toFixed(3)}`)
  console.log(`🔮 Forecast MAE: ${forecastMae.toFixed(3)}, RMSE: ${forecastRmse.toFixed(3)}, Bias: ${forecastBias.toFixed(3)}`)
  
  // Generate forecast with ARIMA-like confidence intervals
  const lastDate = new Date(historicalData[historicalData.length - 1].date)
  const forecast = []
  const confidenceUpper = []
  const confidenceLower = []
  
  for (let i = 1; i <= months; i++) {
    const forecastDate = new Date(lastDate.getFullYear(), lastDate.getMonth() + i, 1)
    const forecastValue = Math.max(0, slope * (n + i - 1) + intercept)
    
    // ARIMA-like confidence intervals based on historical variance
    const variance = ssRes / n
    const confidenceInterval = Math.max(forecastValue * 0.2, Math.sqrt(variance))
    
    forecast.push({
      date: `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`,
      value: Math.round(forecastValue)
    })
    
    confidenceUpper.push({
      date: `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`,
      value: Math.round(forecastValue + confidenceInterval)
    })
    
    confidenceLower.push({
      date: `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`,
      value: Math.round(Math.max(0, forecastValue - confidenceInterval))
    })
  }
  
  console.log(`🔮 Generated ${forecast.length} ARIMA-like forecast points`)
  
  return {
    forecast,
    confidenceUpper,
    confidenceLower,
    statistics: {
      trend: slope,
      r_squared: rSquared,
      forecast_mae: forecastMae, // Out-of-sample forecast MAE
      forecast_rmse: forecastRmse, // Out-of-sample forecast RMSE
      forecast_bias: forecastBias, // Out-of-sample forecast Bias
      data_points: n
    }
  }
}

// Main function to perform local forecasting
export const performLocalForecasting = async (crimeType, location, months = 6) => {
  try {
    // Normalize crimeType before using it
    let normalizedCrimeType = crimeType
    if (crimeType === 'Other' || crimeType === 'Others') {
      normalizedCrimeType = 'Other'
    }
    
    console.log(`🔮 Performing local forecasting for ${normalizedCrimeType} in ${location}`)
    
    // Check if model exists (using normalized crimeType)
    if (!modelExists(normalizedCrimeType, location)) {
      throw new Error(`No model available for ${normalizedCrimeType} in ${location}`)
    }
    
    // Fetch historical data (fetchHistoricalData will normalize "Others" to "Other" when filtering)
    const historicalData = await fetchHistoricalData(normalizedCrimeType, location)
    
    if (historicalData.length === 0) {
      throw new Error(`No historical data found for ${normalizedCrimeType} in ${location}`)
    }
    
    console.log(`📊 Found ${historicalData.length} historical data points`)
    console.log('Sample historical data:', historicalData.slice(0, 3))
    
    // Generate forecast using local ARIMA-like calculations
    const forecastResult = generateLocalForecast(historicalData, months)
    
    console.log(`🔮 Generated ${forecastResult.forecast.length} forecast points`)
    console.log('Sample forecast:', forecastResult.forecast.slice(0, 3))
    
    return {
      success: true,
      historical: historicalData,
      forecast: forecastResult.forecast,
      confidenceUpper: forecastResult.confidenceUpper,
      confidenceLower: forecastResult.confidenceLower,
      statistics: forecastResult.statistics,
      model: getModelName(normalizedCrimeType, location)
    }
  } catch (error) {
    console.error('Error in local forecasting:', error)
    return {
      success: false,
      error: error.message,
      historical: [],
      forecast: [],
      confidenceUpper: [],
      confidenceLower: [],
      statistics: {
        trend: 0,
        r_squared: 0,
        forecast_mae: 0,
        forecast_rmse: 0,
        forecast_bias: 0,
        data_points: 0
      }
    }
  }
}

// Get available crime types
export const getAvailableCrimeTypes = () => {
  return [...AVAILABLE_CRIME_TYPES]
}

// Get available locations
export const getAvailableLocations = () => {
  return [...AVAILABLE_LOCATIONS]
}

// Fetch available filters from Firebase
export const fetchAvailableFilters = async () => {
  const db = getDatabase(app);
  const refReports = ref(db, 'civilian/civilian crime reports');
  const snapshot = await get(refReports);
  if (!snapshot.exists()) return { barangays: [], crimeTypes: [] };

  const data = Object.values(snapshot.val());
  const barangays = [...new Set(data.map(r => r.barangay))].filter(Boolean);
  
  // Get all raw crime types first for debugging
  const rawCrimeTypes = [...new Set(data.map(r => r.crimeType).filter(Boolean))];
  console.log('🔍 Raw crime types from Firebase:', rawCrimeTypes);
  
  const crimeTypes = [...new Set(
    data
      .map(r => r.crimeType)
      .filter(Boolean)
      .map(t => {
        // Normalize "Others" and "Emergency SOS" to "Other"
        if (t === 'Others' || t === 'Emergency SOS') return 'Other'
        return t
      })
  )];
  
  console.log('✅ Normalized crime types for filters:', crimeTypes);

  return { barangays, crimeTypes };
};

// Get all available model combinations
export const getAvailableModels = () => {
  const models = []
  AVAILABLE_CRIME_TYPES.forEach(crimeType => {
    AVAILABLE_LOCATIONS.forEach(location => {
      models.push({
        crimeType,
        location,
        modelName: getModelName(crimeType, location),
        exists: modelExists(crimeType, location)
      })
    })
  })
  return models
}

