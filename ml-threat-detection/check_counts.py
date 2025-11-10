#!/usr/bin/env python3
"""Check severity distribution"""

import pandas as pd

df = pd.read_csv('training_data.csv')

print("="*60)
print("Training Data Distribution:")
print("="*60)
print(f"Total samples: {len(df)}")
print(f"\nSeverity distribution:")
print(df['severity'].value_counts().sort_index())
print("="*60)

