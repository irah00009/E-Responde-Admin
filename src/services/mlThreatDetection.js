/**
 * ML Threat Detection Service using Cosine Similarity
 * Integrates with Python ML server for threat detection
 */

const ML_SERVER_URL = import.meta.env.VITE_ML_SERVER_URL || 'http://localhost:5001';

class MLThreatDetectionService {
  constructor(serverUrl = ML_SERVER_URL) {
    this.serverUrl = serverUrl;
    this.isServerAvailable = false;
    this.checkServerHealth();
  }

  // Check if ML server is available
  async checkServerHealth() {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        timeout: 3000
      });
      const data = await response.json();
      this.isServerAvailable = data.model_loaded === true;
      return this.isServerAvailable;
    } catch (error) {
      console.warn('ML server not available:', error);
      this.isServerAvailable = false;
      return false;
    }
  }

  // Analyze text for threats using ML model
  async analyzeThreat(description) {
    try {
      // Check server availability
      if (!this.isServerAvailable) {
        const available = await this.checkServerHealth();
        if (!available) {
          // Fallback: return safe default if server unavailable
          console.warn('ML server not available, returning default response');
          return {
            isThreat: false,
            confidence: 0,
            severity: 'moderate',
            reason: 'ML server not available - using default',
            source: 'ml-fallback'
          };
        }
      }

      // Call ML server
      const response = await fetch(`${this.serverUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description })
      });

      if (!response.ok) {
        throw new Error(`ML server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Prediction failed');
      }

      const prediction = data.prediction;

      // Format result similar to existing threatDetection.js
      return {
        isThreat: prediction.isThreat,
        confidence: prediction.confidence,
        severity: prediction.severity,
        raw_similarity: prediction.raw_similarity,
        threshold: prediction.threshold,
        similarities: prediction.similarities,
        reason: `ML model prediction: ${prediction.severity} severity (similarity: ${prediction.raw_similarity.toFixed(3)})`,
        source: 'ml-cosine-similarity'
      };

    } catch (error) {
      console.error('ML threat analysis failed:', error);
      // Fallback: return safe default on error
      return {
        isThreat: false,
        confidence: 0,
        severity: 'moderate',
        reason: `ML analysis error: ${error.message}`,
        source: 'ml-error-fallback'
      };
    }
  }

  // Analyze multiple reports
  async analyzeReports(reports) {
    try {
      if (!this.isServerAvailable) {
        const available = await this.checkServerHealth();
        if (!available) {
          // Fallback: return default results for all reports
          console.warn('ML server not available, returning default responses');
          return reports.map(report => ({
            reportId: report.id,
            originalSeverity: report.severity,
            threatAnalysis: {
              isThreat: false,
              confidence: 0,
              reason: 'ML server not available - using default',
              severity: 'moderate'
            },
            shouldEscalate: false
          }));
        }
      }

      // Extract descriptions
      const descriptions = reports.map(report => 
        report.description || report.message || ''
      );

      // Call batch prediction endpoint
      const response = await fetch(`${this.serverUrl}/predict-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ descriptions })
      });

      if (!response.ok) {
        throw new Error(`ML server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Batch prediction failed');
      }

      // Map predictions back to reports
      const results = reports.map((report, index) => {
        const prediction = data.predictions[index];
        
        if (prediction.error) {
          return {
            reportId: report.id,
            originalSeverity: report.severity,
            threatAnalysis: {
              isThreat: false,
              confidence: 0,
              reason: `Error: ${prediction.error}`,
              severity: 'moderate'
            },
            shouldEscalate: false
          };
        }

        const threatAnalysis = {
          isThreat: prediction.prediction.isThreat,
          confidence: prediction.prediction.confidence,
          severity: prediction.prediction.severity,
          raw_similarity: prediction.prediction.raw_similarity,
          threshold: prediction.prediction.threshold,
          similarities: prediction.prediction.similarities,
          reason: `ML prediction: ${prediction.prediction.severity} (similarity: ${prediction.prediction.raw_similarity.toFixed(3)})`,
          source: 'ml-cosine-similarity'
        };

        // Escalation logic
        const shouldEscalate = threatAnalysis.isThreat && (
          threatAnalysis.confidence > 0.3 ||
          threatAnalysis.severity === 'Immediate' ||
          threatAnalysis.severity === 'High'
        );

        return {
          reportId: report.id,
          originalSeverity: report.severity,
          threatAnalysis,
          shouldEscalate
        };
      });

      return results;

    } catch (error) {
      console.error('ML batch analysis failed:', error);
      // Fallback: return default results for all reports
      return reports.map(report => ({
        reportId: report.id,
        originalSeverity: report.severity,
        threatAnalysis: {
          isThreat: false,
          confidence: 0,
          reason: `ML analysis error: ${error.message}`,
          severity: 'moderate'
        },
        shouldEscalate: false
      }));
    }
  }

  // Evaluate model accuracy on test data
  async evaluateModel(testData) {
    try {
      if (!this.isServerAvailable) {
        const available = await this.checkServerHealth();
        if (!available) {
          throw new Error('ML server not available');
        }
      }

      const response = await fetch(`${this.serverUrl}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test_data: testData })
      });

      if (!response.ok) {
        throw new Error(`ML server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Evaluation failed');
      }

      return data.results;

    } catch (error) {
      console.error('Model evaluation failed:', error);
      throw error;
    }
  }

  // Get reports that should be escalated
  getEscalatedReports(analysisResults) {
    return analysisResults.filter(result => {
      const isThreat = result.threatAnalysis.isThreat;
      const confidence = result.threatAnalysis.confidence || 0;
      const hasHighSeverityThreats = result.threatAnalysis.severity === 'Immediate' || 
                                    result.threatAnalysis.severity === 'High';
      
      // Escalate if threat detected with confidence > threshold
      const shouldEscalate = isThreat && (
        confidence > 0.3 ||
        hasHighSeverityThreats ||
        (result.threatAnalysis.raw_similarity && result.threatAnalysis.raw_similarity > 0.6)
      );
      
      return shouldEscalate;
    });
  }
}

// Export the service
export default MLThreatDetectionService;

