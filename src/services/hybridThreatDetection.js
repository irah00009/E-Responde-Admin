/**
 * Hybrid Threat Detection Service
 * Combines keyword-based detection, Gemini AI, and ML cosine similarity
 */

import ThreatDetectionService from './threatDetection.js';
import MLThreatDetectionService from './mlThreatDetection.js';

class HybridThreatDetectionService {
  constructor() {
    this.keywordService = new ThreatDetectionService();
    this.mlService = new MLThreatDetectionService();
    this.useML = true; // Toggle to use ML model
    this.useKeyword = true; // Toggle to use keyword detection
    this.useGemini = true; // Toggle to use Gemini AI
  }

  // Analyze text for threats using all available methods
  async analyzeThreat(text) {
    const results = {};
    
    // 1. Keyword-based detection (fastest)
    if (this.useKeyword) {
      try {
        results.keyword = this.keywordService.checkKeywordThreat(text);
      } catch (error) {
        console.error('Keyword detection failed:', error);
      }
    }

    // 2. ML cosine similarity detection
    if (this.useML) {
      try {
        results.ml = await this.mlService.analyzeThreat(text);
      } catch (error) {
        console.warn('ML detection failed:', error);
        // ML service not available, continue without it
      }
    }

    // 3. Gemini AI detection (if ML fails or for comparison)
    if (this.useGemini && (!results.ml || !results.ml.isThreat)) {
      try {
        results.gemini = await this.keywordService.analyzeWithGemini(text);
      } catch (error) {
        console.warn('Gemini detection failed:', error);
      }
    }

    // Combine results with priority: ML > Gemini > Keyword
    return this.combineResults(results);
  }

  // Combine results from multiple detection methods
  combineResults(results) {
    const combined = {
      isThreat: false,
      confidence: 0,
      severity: 'moderate',
      reason: '',
      sources: [],
      method: 'hybrid'
    };

    // Priority order: ML > Gemini > Keyword
    if (results.ml) {
      combined.isThreat = results.ml.isThreat;
      combined.confidence = results.ml.confidence;
      combined.severity = results.ml.severity;
      combined.reason = results.ml.reason;
      combined.sources.push('ml-cosine-similarity');
      combined.raw_similarity = results.ml.raw_similarity;
      combined.similarities = results.ml.similarities;
    } else if (results.gemini) {
      combined.isThreat = results.gemini.isThreat;
      combined.confidence = results.gemini.confidence;
      combined.severity = results.gemini.severity;
      combined.reason = results.gemini.reason;
      combined.sources.push('gemini-ai');
    } else if (results.keyword) {
      combined.isThreat = results.keyword.isThreat;
      combined.confidence = results.keyword.confidence;
      combined.severity = results.keyword.severity;
      combined.reason = results.keyword.reason;
      combined.sources.push('keyword-detection');
    }

    // If multiple methods agree, increase confidence
    if (results.ml && results.keyword && results.ml.isThreat === results.keyword.isThreat) {
      combined.confidence = Math.min(1.0, combined.confidence * 1.2);
      combined.sources.push('consensus');
    }

    return combined;
  }

  // Analyze multiple reports
  async analyzeReports(reports) {
    const results = [];

    for (const report of reports) {
      try {
        const description = report.description || report.message || '';
        const threatAnalysis = await this.analyzeThreat(description);

        const shouldEscalate = threatAnalysis.isThreat && (
          threatAnalysis.confidence > 0.3 ||
          threatAnalysis.severity === 'Immediate' ||
          threatAnalysis.severity === 'High' ||
          (threatAnalysis.raw_similarity && threatAnalysis.raw_similarity > 0.6)
        );

        results.push({
          reportId: report.id,
          originalSeverity: report.severity,
          threatAnalysis,
          shouldEscalate
        });

      } catch (error) {
        console.error(`Error analyzing report ${report.id}:`, error);
        results.push({
          reportId: report.id,
          originalSeverity: report.severity,
          threatAnalysis: {
            isThreat: false,
            confidence: 0,
            reason: 'Analysis failed',
            severity: 'moderate'
          },
          shouldEscalate: false
        });
      }
    }

    return results;
  }

  // Get reports that should be escalated
  getEscalatedReports(analysisResults) {
    return analysisResults.filter(result => {
      const isThreat = result.threatAnalysis.isThreat;
      const confidence = result.threatAnalysis.confidence || 0;
      const hasHighSeverityThreats = result.threatAnalysis.severity === 'Immediate' || 
                                    result.threatAnalysis.severity === 'High';
      
      const shouldEscalate = isThreat && (
        confidence > 0.3 ||
        hasHighSeverityThreats ||
        (result.threatAnalysis.raw_similarity && result.threatAnalysis.raw_similarity > 0.6)
      );

      return shouldEscalate;
    });
  }

  // Toggle detection methods
  setUseML(enabled) {
    this.useML = enabled;
  }

  setUseKeyword(enabled) {
    this.useKeyword = enabled;
  }

  setUseGemini(enabled) {
    this.useGemini = enabled;
  }
}

export default HybridThreatDetectionService;

