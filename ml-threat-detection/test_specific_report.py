#!/usr/bin/env python3
"""
Test script to check what the ML model predicts for a specific report
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from train_model import ThreatDetectionTrainer

def test_report():
    """Test the specific report description"""
    
    # Load the model
    print("Loading ML model...")
    trainer = ThreatDetectionTrainer()
    trainer.load_model('model')
    print("✅ Model loaded successfully!\n")
    
    # Test the exact description from the user's report
    description = "Sinigawan ako ng isang lalake sa kanto malapit sa bahay"
    
    print(f"Testing description:")
    print(f"  '{description}'")
    print(f"  Translation: 'I was shouted at by a man at the corner near the house.'\n")
    
    # Get prediction
    print("Running ML analysis...")
    result = trainer.predict(description)
    
    print("\n" + "="*60)
    print("ML MODEL PREDICTION:")
    print("="*60)
    print(f"Predicted Severity: {result['severity']}")
    print(f"Confidence: {result['confidence']:.2%}")
    print(f"Raw Similarity: {result['raw_similarity']:.3f}")
    print(f"Is Threat: {result['isThreat']}")
    print(f"Threshold: {result['threshold']:.3f}")
    
    print("\nSimilarity Scores by Severity:")
    if 'similarities' in result:
        for severity, similarity in result['similarities'].items():
            print(f"  {severity}: {similarity:.3f}")
    
    print("\n" + "="*60)
    
    # Expected severity for this description (shouting/verbal incident)
    expected = "Low"  # or "Moderate" - verbal incident, no physical harm
    predicted = result['severity']
    
    if predicted == expected:
        print(f"✅ CORRECT: Model predicted '{predicted}' (matches expected '{expected}')")
    else:
        print(f"⚠️ PREDICTION: Model predicted '{predicted}' (expected: '{expected}' based on description)")
        print(f"   Description: '{description}'")
        print(f"   This is a verbal incident (shouting), typically Low or Moderate severity")
    
    return result

if __name__ == '__main__':
    try:
        result = test_report()
        sys.exit(0 if result['severity'] == 'Immediate' else 1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

