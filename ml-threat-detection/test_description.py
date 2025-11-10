#!/usr/bin/env python3
"""Test specific description"""

from train_model import ThreatDetectionTrainer

# Load model
trainer = ThreatDetectionTrainer()
trainer.load_model('model')

# Test description
description = "Hinalikan ako sa labi ng isang lalake sa loob ng hospital, nagulat ako sa ginawa nya"
translation = "I was kissed on the lips by a man inside the hospital, I was surprised by what he did"

print("="*60)
print("Testing Description:")
print(f"  '{description}'")
print(f"  Translation: '{translation}'")
print("="*60)

# Get prediction
result = trainer.predict(description)

print("\nML MODEL PREDICTION:")
print("="*60)
print(f"Predicted Severity: {result['severity']}")
print(f"Confidence: {result['confidence']:.2%}")
print(f"Raw Similarity: {result['raw_similarity']:.3f}")
print(f"Is Threat: {result['isThreat']}")
print(f"Threshold: {result['threshold']:.3f}")

print("\nSimilarity Scores by Severity:")
for severity, similarity in result['similarities'].items():
    print(f"  {severity}: {similarity:.3f}")

print("="*60)
