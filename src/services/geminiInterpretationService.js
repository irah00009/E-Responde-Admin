// Gemini AI Forecast Interpretation Service
const GEMINI_API_KEY = 'AIzaSyAnAAyLPzIK4u41jBqMTuvtf0QxDojdmV4';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Generate forecast interpretation using Google Gemini AI
 * @param {Object} forecastData - Contains historical and forecast data with trend information
 * @param {string} crimeType - Type of crime being analyzed
 * @param {string} location - Location being analyzed
 * @returns {Promise<Object>} Interpretation object with insights and recommendations
 */
export const generateForecastInterpretation = async (forecastData, crimeType, location) => {
  try {
    const { historical, forecast, statistics } = forecastData;
    
    // Calculate trend direction
    const trend = statistics?.trend || 0;
    const trendDirection = trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable';
    
    // Calculate average values
    const historicalAvg = historical.length > 0 
      ? historical.reduce((sum, d) => sum + d.value, 0) / historical.length 
      : 0;
    const forecastAvg = forecast.length > 0
      ? forecast.reduce((sum, d) => sum + d.value, 0) / forecast.length
      : 0;
    
    // Get recent trend
    const recentHistorical = historical.slice(-3);
    const firstValue = historical[0]?.value || 0;
    const lastValue = historical[historical.length - 1]?.value || 0;
    const percentageChange = firstValue > 0 
      ? ((lastValue - firstValue) / firstValue) * 100 
      : 0;
    
    // Prepare prompt for Gemini
    const prompt = `You are a crime analysis expert helping police officers understand crime forecasting results. 

Analyze the following crime forecast data and provide a clear, professional interpretation in plain language that police officers can understand without technical knowledge. Do NOT mention "ARIMA" or any technical forecasting terms in your response.

Crime Type: ${crimeType}
Location: ${location}

Historical Data Points: ${historical.length} months
Average Historical Crimes per Month: ${historicalAvg.toFixed(1)}
Most Recent Month: ${lastValue} crimes
First Month: ${firstValue} crimes
Historical Trend: ${trendDirection} (${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}%)

Forecast Period: ${forecast.length} months ahead
Average Forecasted Crimes per Month: ${forecastAvg.toFixed(1)}
Forecast Trend: ${trendDirection}
Model Confidence (R²): ${(statistics?.r_squared || 0).toFixed(2)}

Please provide an interpretation in the following JSON format:
{
  "trend": "increasing" or "decreasing" or "stable",
  "summary": "A brief 2-3 sentence summary of what the forecast shows",
  "trendExplanation": "Explain whether crimes are predicted to increase, decrease, or remain stable in simple terms",
  "operationalImplications": {
    "patrolScheduling": "Specific recommendations for patrol scheduling",
    "resourceAllocation": "Specific recommendations for resource allocation",
    "communitySafety": "Specific recommendations for community safety measures"
  },
  "keyTakeaways": [
    "First actionable insight",
    "Second actionable insight",
    "Third actionable insight"
  ],
  "recommendations": "A practical 2-3 sentence paragraph with actionable recommendations based on the forecast trend"
}

Use simple, professional language suitable for police reports. Focus on practical implications and actionable insights. Avoid statistical jargon.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('No response from Gemini AI');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    
    // Try to extract JSON from the response
    let interpretation;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        interpretation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback: create structured interpretation from text
      interpretation = {
        trend: trendDirection,
        summary: responseText.substring(0, 200) + '...',
        trendExplanation: `The forecast indicates that ${crimeType} incidents in ${location} are predicted to ${trendDirection === 'increasing' ? 'increase' : trendDirection === 'decreasing' ? 'decrease' : 'remain stable'} over the next ${forecast.length} months.`,
        operationalImplications: {
          patrolScheduling: 'Adjust patrol schedules based on forecasted trends.',
          resourceAllocation: 'Allocate resources according to predicted crime patterns.',
          communitySafety: 'Implement preventive measures based on forecast insights.'
        },
        keyTakeaways: [
          `Crime trend is ${trendDirection}`,
          `Average forecasted rate: ${forecastAvg.toFixed(1)} crimes per month`,
          `Model confidence: ${(statistics?.r_squared || 0).toFixed(2)}`
        ],
        recommendations: responseText.substring(0, 300)
      };
    }

    // Ensure all required fields exist
    return {
      trend: interpretation.trend || trendDirection,
      summary: interpretation.summary || 'Forecast analysis completed.',
      trendExplanation: interpretation.trendExplanation || `The forecast shows a ${trendDirection} trend.`,
      operationalImplications: interpretation.operationalImplications || {
        patrolScheduling: 'Monitor trends and adjust patrol schedules accordingly.',
        resourceAllocation: 'Allocate resources based on forecasted patterns.',
        communitySafety: 'Implement preventive community safety measures.'
      },
      keyTakeaways: interpretation.keyTakeaways || [
        `Trend: ${trendDirection}`,
        `Forecast period: ${forecast.length} months`,
        `Data points: ${historical.length} months`
      ],
      recommendations: interpretation.recommendations || 'Review the forecast data and adjust operational plans accordingly.'
    };

  } catch (error) {
    console.error('Error generating forecast interpretation:', error);
    
    // Return fallback interpretation
    const trend = forecastData.statistics?.trend || 0;
    const trendDirection = trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable';
    const forecastAvg = forecastData.forecast.length > 0
      ? forecastData.forecast.reduce((sum, d) => sum + d.value, 0) / forecastData.forecast.length
      : 0;
    
    return {
      trend: trendDirection,
      summary: `The forecast for ${crimeType} in ${location} shows a ${trendDirection} trend over the next ${forecastData.forecast.length} months.`,
      trendExplanation: `Based on historical data, ${crimeType} incidents are predicted to ${trendDirection === 'increasing' ? 'increase' : trendDirection === 'decreasing' ? 'decrease' : 'remain relatively stable'} with an average of ${forecastAvg.toFixed(1)} crimes per month forecasted.`,
      operationalImplications: {
        patrolScheduling: trendDirection === 'increasing' 
          ? 'Consider increasing patrol frequency during peak forecasted periods.'
          : trendDirection === 'decreasing'
          ? 'Maintain current patrol schedules while monitoring for any changes.'
          : 'Continue with current patrol schedules and monitor trends.',
        resourceAllocation: trendDirection === 'increasing'
          ? 'Allocate additional resources to high-risk areas and time periods.'
          : 'Maintain current resource allocation while monitoring trends.',
        communitySafety: trendDirection === 'increasing'
          ? 'Increase community engagement and preventive measures in the area.'
          : 'Continue current community safety programs and monitor effectiveness.'
      },
      keyTakeaways: [
        `The forecast indicates a ${trendDirection} trend`,
        `Average forecasted rate: ${forecastAvg.toFixed(1)} crimes per month`,
        `Forecast based on ${forecastData.historical.length} months of historical data`
      ],
      recommendations: trendDirection === 'increasing'
        ? `Given the predicted increase in ${crimeType} incidents, it is recommended to enhance patrol presence, strengthen community partnerships, and allocate additional resources to ${location} during the forecasted period.`
        : trendDirection === 'decreasing'
        ? `The forecast suggests a decrease in ${crimeType} incidents. Continue current operational strategies while monitoring trends to ensure the positive trend continues.`
        : `The forecast indicates stable crime levels. Maintain current operational strategies and continue monitoring to identify any emerging patterns.`
    };
  }
};
