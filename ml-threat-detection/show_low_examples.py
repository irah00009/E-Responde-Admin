#!/usr/bin/env python3
"""Show Low severity examples from training data"""

import pandas as pd

# Load training data
df = pd.read_csv('training_data.csv')

# Filter Low severity
low_examples = df[df['severity'] == 'Low']

print("="*60)
print(f"Total Low severity examples: {len(low_examples)}")
print("="*60)
print("\nSample Low Severity Descriptions:\n")

for i, (idx, row) in enumerate(low_examples.head(50).iterrows(), 1):
    print(f"{i}. {row['description']}")

print(f"\n... and {len(low_examples) - 50} more Low severity examples")

