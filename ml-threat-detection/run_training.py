"""
Main script to train the threat detection model
Run this to train the model from your data
"""

import pandas as pd
from train_model import ThreatDetectionTrainer
from sklearn.model_selection import train_test_split
import os

def main():
    print("=" * 60)
    print("Threat Detection Model Training")
    print("=" * 60)
    
    # Initialize trainer
    trainer = ThreatDetectionTrainer()
    
    # Load training data
    data_file = 'training_data.csv'
    if not os.path.exists(data_file):
        print(f"Error: {data_file} not found!")
        print("Please run prepare_training_data.py first or create training_data.csv")
        return
    
    print(f"\nLoading training data from {data_file}...")
    df = trainer.load_training_data(data_path=data_file)
    
    print(f"Loaded {len(df)} samples")
    print(f"Severity distribution:")
    print(df['severity'].value_counts())
    
    # Split data
    print("\nSplitting data into train/test sets...")
    train_df, test_df = train_test_split(
        df, 
        test_size=0.2, 
        random_state=42, 
        stratify=df['severity']
    )
    
    print(f"Training set: {len(train_df)} samples")
    print(f"Test set: {len(test_df)} samples")
    
    # Train model
    print("\nTraining model...")
    trainer.train(train_df)
    
    # Evaluate model
    print("\nEvaluating model on test set...")
    results = trainer.evaluate(test_df)
    
    print("\n" + "=" * 60)
    print("Evaluation Results")
    print("=" * 60)
    print(f"Overall Accuracy: {results['accuracy']:.3f} ({results['accuracy']*100:.1f}%)")
    print(f"Threat Detection Accuracy: {results['threat_accuracy']:.3f} ({results['threat_accuracy']*100:.1f}%)")
    
    print("\nPer-Severity Metrics:")
    print("-" * 60)
    for severity, metrics in results['severity_metrics'].items():
        print(f"{severity:12s} - Precision: {metrics['precision']:.3f}, Recall: {metrics['recall']:.3f}, F1: {metrics['f1']:.3f}, Support: {metrics['support']}")
    
    # Save model
    print("\nSaving model...")
    model_dir = 'model'
    trainer.save_model(model_dir)
    print(f"Model saved to {model_dir}/")
    
    # Test predictions
    print("\n" + "=" * 60)
    print("Sample Predictions")
    print("=" * 60)
    test_cases = [
        "Armed suspect with gun threatening people. Immediate danger.",
        "Drug dealing activity in the area. High priority.",
        "Noise complaint from neighbors. Disturbance after hours.",
        "Broken streetlight needs repair. Routine maintenance."
    ]
    
    for test_case in test_cases:
        prediction = trainer.predict(test_case)
        print(f"\nDescription: {test_case}")
        print(f"Predicted Severity: {prediction['severity']}")
        print(f"Confidence: {prediction['confidence']:.3f}")
        print(f"Raw Similarity: {prediction['raw_similarity']:.3f}")
        print(f"Is Threat: {prediction['isThreat']}")

if __name__ == '__main__':
    main()

