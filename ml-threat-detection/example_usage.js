/**
 * Example usage of ML Threat Detection in JavaScript
 * Shows how to integrate with the existing admin dashboard
 */

// Import the service
// import MLThreatDetectionService from '../src/services/mlThreatDetection.js';
// import HybridThreatDetectionService from '../src/services/hybridThreatDetection.js';

// Example: Using ML Threat Detection Service
async function exampleMLDetection() {
  const mlService = new MLThreatDetectionService('http://localhost:5001');

  // Single prediction
  const description = "Armed suspect with gun at the location. Immediate danger to public safety.";
  
  try {
    const result = await mlService.analyzeThreat(description);
    
    console.log('ML Threat Detection Result:');
    console.log('Is Threat:', result.isThreat);
    console.log('Severity:', result.severity);
    console.log('Confidence:', result.confidence);
    console.log('Raw Similarity:', result.raw_similarity);
    console.log('Similarities:', result.similarities);
    console.log('Reason:', result.reason);
    
    // Use result to determine if report should be escalated
    if (result.isThreat && result.confidence > 0.3) {
      console.log('Report should be escalated!');
    }
  } catch (error) {
    console.error('ML detection failed:', error);
    // Fallback to keyword detection
  }
}

// Example: Using Hybrid Detection Service
async function exampleHybridDetection() {
  const hybridService = new HybridThreatDetectionService();

  const description = "Drug dealing activity observed. Suspected illegal substances.";

  try {
    const result = await hybridService.analyzeThreat(description);
    
    console.log('Hybrid Threat Detection Result:');
    console.log('Is Threat:', result.isThreat);
    console.log('Severity:', result.severity);
    console.log('Confidence:', result.confidence);
    console.log('Sources:', result.sources);
    console.log('Method:', result.method);
  } catch (error) {
    console.error('Hybrid detection failed:', error);
  }
}

// Example: Analyzing multiple reports
async function exampleBatchAnalysis() {
  const mlService = new MLThreatDetectionService('http://localhost:5001');

  const reports = [
    {
      id: '1',
      description: 'Armed suspect with gun. Immediate danger.',
      severity: 'Moderate'
    },
    {
      id: '2',
      description: 'Noise complaint from neighbors. Disturbance after hours.',
      severity: 'Low'
    },
    {
      id: '3',
      description: 'Drug dealing activity in the area. High priority.',
      severity: 'High'
    }
  ];

  try {
    const results = await mlService.analyzeReports(reports);
    
    console.log('Batch Analysis Results:');
    results.forEach(result => {
      console.log(`Report ${result.reportId}:`);
      console.log(`  Original Severity: ${result.originalSeverity}`);
      console.log(`  Predicted Severity: ${result.threatAnalysis.severity}`);
      console.log(`  Is Threat: ${result.threatAnalysis.isThreat}`);
      console.log(`  Should Escalate: ${result.shouldEscalate}`);
    });

    // Get reports that should be escalated
    const escalated = mlService.getEscalatedReports(results);
    console.log(`\nReports to escalate: ${escalated.length}`);
    
  } catch (error) {
    console.error('Batch analysis failed:', error);
  }
}

// Example: Evaluating model accuracy
async function exampleModelEvaluation() {
  const mlService = new MLThreatDetectionService('http://localhost:5001');

  // Test data with known severities
  const testData = [
    { description: 'Armed suspect with gun. Immediate danger.', severity: 'Immediate' },
    { description: 'Drug dealing activity. High priority.', severity: 'High' },
    { description: 'Noise complaint. Disturbance.', severity: 'Moderate' },
    { description: 'Broken streetlight. Needs repair.', severity: 'Low' }
  ];

  try {
    const results = await mlService.evaluateModel(testData);
    
    console.log('Model Evaluation Results:');
    console.log('Overall Accuracy:', results.accuracy);
    console.log('Threat Detection Accuracy:', results.threat_accuracy);
    console.log('\nPer-Severity Metrics:');
    
    for (const [severity, metrics] of Object.entries(results.severity_metrics)) {
      console.log(`${severity}:`);
      console.log(`  Precision: ${metrics.precision.toFixed(3)}`);
      console.log(`  Recall: ${metrics.recall.toFixed(3)}`);
      console.log(`  F1: ${metrics.f1.toFixed(3)}`);
      console.log(`  Support: ${metrics.support}`);
    }
  } catch (error) {
    console.error('Model evaluation failed:', error);
  }
}

// Export examples for use in Dashboard component
export {
  exampleMLDetection,
  exampleHybridDetection,
  exampleBatchAnalysis,
  exampleModelEvaluation
};

// Usage in Dashboard.jsx:
/*
import MLThreatDetectionService from '../services/mlThreatDetection.js';
import HybridThreatDetectionService from '../services/hybridThreatDetection.js';

// Option 1: Use ML only
const mlService = new MLThreatDetectionService();
const results = await mlService.analyzeReports(reports);

// Option 2: Use Hybrid (ML + Gemini + Keyword)
const hybridService = new HybridThreatDetectionService();
const results = await hybridService.analyzeReports(reports);

// Get escalated reports
const escalated = mlService.getEscalatedReports(results);
*/

