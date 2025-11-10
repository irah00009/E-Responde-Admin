"""
Threat Detection Model Training using Cosine Similarity
Trains a model to classify threat reports based on description-severity pairs
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
import joblib
import json
import os
from collections import defaultdict

class ThreatDetectionTrainer:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 2),
            stop_words=None,  # Removed English stopwords to support Filipino/English mixed
            lowercase=True,
            min_df=2,
            max_df=0.95,
            analyzer='word'  # Works with any language
        )
        self.threat_embeddings = {}  # Store embeddings by severity
        self.severity_embeddings = {}  # Store reference embeddings for each severity
        self.severity_thresholds = {}  # Optimal thresholds for each severity level
        self.is_trained = False
        
    def load_training_data(self, data_path=None, data_list=None):
        """
        Load training data from CSV or list
        Data format: [{'description': str, 'severity': str}, ...]
        Severity: 'Immediate', 'High', 'Moderate', 'Low'
        """
        if data_list:
            df = pd.DataFrame(data_list)
        elif data_path and os.path.exists(data_path):
            df = pd.DataFrame(pd.read_csv(data_path))
        else:
            raise ValueError("Either data_path or data_list must be provided")
        
        # Validate data structure
        required_cols = ['description', 'severity']
        if not all(col in df.columns for col in required_cols):
            raise ValueError(f"Data must contain columns: {required_cols}")
        
        # Clean and validate
        df = df.dropna(subset=['description', 'severity'])
        df['description'] = df['description'].astype(str).str.strip()
        df['severity'] = df['severity'].astype(str).str.strip()
        
        # Normalize severity
        severity_map = {
            'immediate': 'Immediate',
            'high': 'High',
            'moderate': 'Moderate',
            'low': 'Low'
        }
        df['severity'] = df['severity'].str.lower().map(severity_map).fillna(df['severity'])
        
        return df
    
    def train(self, training_data):
        """
        Train the model using cosine similarity approach
        Creates reference embeddings for each severity level
        """
        print("Training threat detection model...")
        print(f"Training samples: {len(training_data)}")
        
        # Prepare texts
        descriptions = training_data['description'].tolist()
        severities = training_data['severity'].tolist()
        
        # Fit vectorizer on all descriptions
        print("Vectorizing descriptions...")
        all_vectors = self.vectorizer.fit_transform(descriptions)
        
        # Group by severity and create reference embeddings
        print("Creating severity reference embeddings...")
        severity_groups = defaultdict(list)
        severity_indices = defaultdict(list)
        
        for idx, severity in enumerate(severities):
            severity_groups[severity].append(descriptions[idx])
            severity_indices[severity].append(idx)
        
        # Create reference embeddings (centroids) for each severity level
        for severity, indices in severity_indices.items():
            if len(indices) > 0:
                # Get vectors for this severity
                severity_vectors = all_vectors[indices]
                # Create centroid (average embedding)
                centroid = np.mean(severity_vectors.toarray(), axis=0)
                self.severity_embeddings[severity] = centroid.reshape(1, -1)
                print(f"  {severity}: {len(indices)} samples")
        
        # Calculate optimal thresholds for each severity
        print("Calculating optimal thresholds...")
        self._calculate_thresholds(training_data, all_vectors, severities)
        
        self.is_trained = True
        print("Training completed!")
        
        return self
    
    def _calculate_thresholds(self, training_data, all_vectors, severities):
        """
        Calculate optimal cosine similarity thresholds for each severity
        by testing against training data
        Ensures Immediate and High have higher thresholds than Moderate and Low
        """
        thresholds = {}
        
        # First pass: Calculate optimal thresholds for all severities
        for severity in ['Immediate', 'High', 'Moderate', 'Low']:
            if severity not in self.severity_embeddings:
                continue
            
            # Get all samples of this severity
            severity_mask = np.array([s == severity for s in severities])
            severity_vectors = all_vectors[severity_mask]
            reference_embedding = self.severity_embeddings[severity]
            
            # Calculate similarities for positive samples (same severity)
            positive_similarities = cosine_similarity(severity_vectors, reference_embedding).flatten()
            
            # Calculate similarities for negative samples (different severity)
            negative_vectors = all_vectors[~severity_mask]
            if negative_vectors.shape[0] > 0:
                negative_similarities = cosine_similarity(negative_vectors, reference_embedding).flatten()
            else:
                negative_similarities = np.array([])
            
            # Find optimal threshold (maximize F1 score)
            best_threshold = 0.5
            best_f1 = 0
            
            if len(negative_similarities) > 0:
                # For Immediate and High, use higher minimum threshold range
                if severity in ['Immediate', 'High']:
                    min_threshold = 0.3  # Higher minimum for serious threats
                    test_thresholds = np.arange(min_threshold, 1.0, 0.05)
                else:
                    test_thresholds = np.arange(0.1, 1.0, 0.05)
                
                for threshold in test_thresholds:
                    tp = np.sum(positive_similarities >= threshold)
                    fp = np.sum(negative_similarities >= threshold)
                    fn = len(positive_similarities) - tp
                    
                    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
                    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
                    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
                    
                    if f1 > best_f1:
                        best_f1 = f1
                        best_threshold = threshold
            else:
                # Use percentile-based threshold
                if severity in ['Immediate', 'High']:
                    best_threshold = max(0.3, np.percentile(positive_similarities, 50))  # Median or 0.3, whichever is higher
                else:
                    best_threshold = np.percentile(positive_similarities, 25)  # Lower quartile
            
            thresholds[severity] = {
                'threshold': best_threshold,
                'avg_similarity': np.mean(positive_similarities),
                'min_similarity': np.min(positive_similarities),
                'max_similarity': np.max(positive_similarities)
            }
            
            print(f"  {severity} threshold: {best_threshold:.3f} (F1: {best_f1:.3f})")
        
        # Second pass: Ensure Immediate and High thresholds are higher than Moderate and Low
        moderate_threshold = thresholds.get('Moderate', {}).get('threshold', 0.2)
        low_threshold = thresholds.get('Low', {}).get('threshold', 0.2)
        max_lower_severity = max(moderate_threshold, low_threshold)
        
        # Set minimum thresholds for Immediate and High
        min_immediate_threshold = max(0.35, max_lower_severity + 0.1)  # At least 0.35, or 0.1 above Moderate/Low
        min_high_threshold = max(0.3, max_lower_severity + 0.05)  # At least 0.3, or 0.05 above Moderate/Low
        
        if 'Immediate' in thresholds:
            if thresholds['Immediate']['threshold'] < min_immediate_threshold:
                print(f"  WARNING: Adjusting Immediate threshold from {thresholds['Immediate']['threshold']:.3f} to {min_immediate_threshold:.3f}")
                thresholds['Immediate']['threshold'] = min_immediate_threshold
        
        if 'High' in thresholds:
            if thresholds['High']['threshold'] < min_high_threshold:
                print(f"  WARNING: Adjusting High threshold from {thresholds['High']['threshold']:.3f} to {min_high_threshold:.3f}")
                thresholds['High']['threshold'] = min_high_threshold
        
        self.severity_thresholds = thresholds
    
    def predict(self, description):
        """
        Predict threat severity using cosine similarity
        Returns: {
            'severity': str,
            'confidence': float,
            'similarities': dict,
            'isThreat': bool
        }
        """
        if not self.is_trained:
            raise ValueError("Model not trained. Call train() first.")
        
        # Use cosine similarity for unbiased ML predictions
        # Vectorize input
        input_vector = self.vectorizer.transform([description])
        
        # Calculate similarity with each severity reference
        similarities = {}
        for severity, ref_embedding in self.severity_embeddings.items():
            sim = cosine_similarity(input_vector, ref_embedding)[0][0]
            similarities[severity] = float(sim)
        
        # Find best matching severity (highest similarity)
        best_severity = max(similarities, key=similarities.get)
        best_similarity = similarities[best_severity]
        
        # Determine if it's a threat (Immediate or High)
        is_threat = best_severity in ['Immediate', 'High']
        
        # Check against threshold for confidence
        threshold_info = self.severity_thresholds.get(best_severity, {})
        threshold = threshold_info.get('threshold', 0.5)
        
        # Confidence based on how far above threshold
        if best_similarity >= threshold:
            confidence = min(1.0, best_similarity / threshold)
        else:
            confidence = best_similarity / threshold if threshold > 0 else 0
        
        return {
            'severity': best_severity,
            'confidence': float(confidence),
            'raw_similarity': float(best_similarity),
            'similarities': similarities,
            'isThreat': is_threat,
            'threshold': float(threshold)
        }
    
    def evaluate(self, test_data):
        """
        Evaluate model accuracy on test data
        Returns: accuracy, precision, recall, F1, confusion matrix
        """
        if not self.is_trained:
            raise ValueError("Model not trained. Call train() first.")
        
        descriptions = test_data['description'].tolist()
        true_severities = test_data['severity'].tolist()
        
        predictions = []
        for desc in descriptions:
            pred = self.predict(desc)
            predictions.append(pred['severity'])
        
        # Calculate metrics
        correct = sum(p == t for p, t in zip(predictions, true_severities))
        accuracy = correct / len(true_severities) if len(true_severities) > 0 else 0
        
        # Per-severity metrics
        severity_metrics = {}
        for severity in ['Immediate', 'High', 'Moderate', 'Low']:
            # True positives, false positives, false negatives
            tp = sum(p == severity and t == severity for p, t in zip(predictions, true_severities))
            fp = sum(p == severity and t != severity for p, t in zip(predictions, true_severities))
            fn = sum(p != severity and t == severity for p, t in zip(predictions, true_severities))
            
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
            
            severity_metrics[severity] = {
                'precision': precision,
                'recall': recall,
                'f1': f1,
                'support': sum(t == severity for t in true_severities)
            }
        
        # Threat detection accuracy (Immediate/High vs Moderate/Low)
        threat_predictions = [p in ['Immediate', 'High'] for p in predictions]
        threat_actual = [t in ['Immediate', 'High'] for t in true_severities]
        threat_accuracy = sum(tp == ta for tp, ta in zip(threat_predictions, threat_actual)) / len(threat_actual) if len(threat_actual) > 0 else 0
        
        return {
            'accuracy': accuracy,
            'threat_accuracy': threat_accuracy,
            'severity_metrics': severity_metrics,
            'predictions': predictions,
            'true_labels': true_severities
        }
    
    def save_model(self, model_path='model'):
        """Save trained model and vectorizer"""
        if not self.is_trained:
            raise ValueError("Model not trained. Cannot save.")
        
        os.makedirs(model_path, exist_ok=True)
        
        # Save vectorizer
        joblib.dump(self.vectorizer, f'{model_path}/vectorizer.joblib')
        
        # Save embeddings as JSON (convert numpy arrays to lists)
        embeddings_dict = {
            k: v.tolist() for k, v in self.severity_embeddings.items()
        }
        with open(f'{model_path}/embeddings.json', 'w') as f:
            json.dump(embeddings_dict, f)
        
        # Save thresholds
        thresholds_dict = {
            k: {kk: float(vv) if isinstance(vv, (np.integer, np.floating)) else vv 
                for kk, vv in v.items()} 
            for k, v in self.severity_thresholds.items()
        }
        with open(f'{model_path}/thresholds.json', 'w') as f:
            json.dump(thresholds_dict, f, indent=2)
        
        print(f"Model saved to {model_path}/")
    
    def load_model(self, model_path='model'):
        """Load trained model and vectorizer"""
        # Load vectorizer
        self.vectorizer = joblib.load(f'{model_path}/vectorizer.joblib')
        
        # Load embeddings
        with open(f'{model_path}/embeddings.json', 'r') as f:
            embeddings_dict = json.load(f)
        self.severity_embeddings = {
            k: np.array(v).reshape(1, -1) for k, v in embeddings_dict.items()
        }
        
        # Load thresholds
        with open(f'{model_path}/thresholds.json', 'r') as f:
            self.severity_thresholds = json.load(f)
        
        self.is_trained = True
        print(f"Model loaded from {model_path}/")


if __name__ == '__main__':
    # Example usage
    trainer = ThreatDetectionTrainer()
    
    # Example training data
    training_data = [
        {'description': 'There is a man with a gun threatening people near the park. Immediate danger.', 'severity': 'Immediate'},
        {'description': 'Someone is selling drugs in the area. High priority situation.', 'severity': 'High'},
        {'description': 'Noise complaint from neighbors. Disturbance in the evening.', 'severity': 'Moderate'},
        {'description': 'Broken streetlight. Needs repair.', 'severity': 'Low'},
    ]
    
    # Load and train
    df = trainer.load_training_data(data_list=training_data)
    
    # Split train/test
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['severity'])
    
    # Train
    trainer.train(train_df)
    
    # Evaluate
    results = trainer.evaluate(test_df)
    print(f"\nAccuracy: {results['accuracy']:.3f}")
    print(f"Threat Detection Accuracy: {results['threat_accuracy']:.3f}")
    
    # Save model
    trainer.save_model('ml-threat-detection/model')
    
    # Test prediction
    test_desc = "Armed suspect at location. Dangerous situation."
    prediction = trainer.predict(test_desc)
    print(f"\nTest: {test_desc}")
    print(f"Prediction: {prediction}")

