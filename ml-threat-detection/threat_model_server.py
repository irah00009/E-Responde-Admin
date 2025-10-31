"""
Flask server to serve threat detection model predictions
Can be called from Node.js service
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from train_model import ThreatDetectionTrainer
import os

app = Flask(__name__)
CORS(app)

trainer = ThreatDetectionTrainer()
model_loaded = False

def load_model():
    """Load the trained model"""
    global trainer, model_loaded
    try:
        model_path = os.path.join(os.path.dirname(__file__), 'model')
        print(f"Looking for model in: {model_path}")
        print(f"Model path exists: {os.path.exists(model_path)}")
        
        if os.path.exists(model_path):
            # Check if all required files exist
            required_files = ['vectorizer.joblib', 'embeddings.json', 'thresholds.json']
            for file in required_files:
                file_path = os.path.join(model_path, file)
                if not os.path.exists(file_path):
                    print(f"Warning: {file} not found at {file_path}")
                    return False
            
            print("All model files found. Loading model...")
            trainer.load_model(model_path)
            model_loaded = True
            print("Model loaded successfully!")
            return True
        else:
            print(f"Model path not found: {model_path}")
            print("Current directory:", os.getcwd())
            print("Script directory:", os.path.dirname(__file__))
            return False
    except Exception as e:
        import traceback
        print(f"Error loading model: {e}")
        print(traceback.format_exc())
        return False

@app.route('/', methods=['GET'])
def index():
    """Root endpoint - shows API information"""
    try:
        return jsonify({
            'service': 'ML Threat Detection API',
            'version': '1.0.0',
            'model_loaded': model_loaded,
            'status': 'running',
            'endpoints': {
                'GET /': 'This endpoint - API information',
                'GET /health': 'Health check',
                'POST /predict': 'Predict threat severity for a single description',
                'POST /predict-batch': 'Predict threat severity for multiple descriptions',
                'POST /evaluate': 'Evaluate model on test data'
            },
            'usage': {
                'predict': {
                    'method': 'POST',
                    'url': '/predict',
                    'body': {'description': 'string'}
                },
                'predict_batch': {
                    'method': 'POST',
                    'url': '/predict-batch',
                    'body': {'descriptions': ['string1', 'string2', ...]}
                }
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        return jsonify({
            'status': 'ok',
            'model_loaded': model_loaded,
            'service': 'ML Threat Detection API'
        })
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/predict', methods=['POST'])
def predict():
    """Predict threat severity for a description"""
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.json
        description = data.get('description', '')
        
        if not description:
            return jsonify({'error': 'Description is required'}), 400
        
        prediction = trainer.predict(description)
        
        return jsonify({
            'success': True,
            'prediction': prediction
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict-batch', methods=['POST'])
def predict_batch():
    """Predict threat severity for multiple descriptions"""
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.json
        descriptions = data.get('descriptions', [])
        
        if not descriptions or not isinstance(descriptions, list):
            return jsonify({'error': 'descriptions must be a list'}), 400
        
        predictions = []
        for desc in descriptions:
            try:
                pred = trainer.predict(desc)
                predictions.append({
                    'description': desc,
                    'prediction': pred
                })
            except Exception as e:
                predictions.append({
                    'description': desc,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'predictions': predictions
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/evaluate', methods=['POST'])
def evaluate():
    """Evaluate model on test data"""
    if not model_loaded:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.json
        test_data = data.get('test_data', [])
        
        if not test_data or not isinstance(test_data, list):
            return jsonify({'error': 'test_data must be a list of {description, severity}'}), 400
        
        import pandas as pd
        df = pd.DataFrame(test_data)
        results = trainer.evaluate(df)
        
        return jsonify({
            'success': True,
            'results': {
                'accuracy': results['accuracy'],
                'threat_accuracy': results['threat_accuracy'],
                'severity_metrics': results['severity_metrics']
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Load model on startup
    print("Loading model...")
    if load_model():
        print("Model loaded successfully!")
        print("=" * 60)
        print("Starting threat detection model server...")
        print("=" * 60)
        print(f"Server running at:")
        print(f"  http://localhost:5001")
        print(f"  http://127.0.0.1:5001")
        print("")
        print("Available endpoints:")
        print("  GET  /           - API information")
        print("  GET  /health     - Health check")
        print("  POST /predict    - Single prediction")
        print("  POST /predict-batch - Batch predictions")
        print("  POST /evaluate   - Model evaluation")
        print("=" * 60)
        app.run(host='0.0.0.0', port=5001, debug=True)
    else:
        print("Warning: Model not found. Server started without model.")
        print("Make sure you run 'python run_training.py' first to train the model.")
        print("=" * 60)
        print("Server running at http://localhost:5001")
        print("=" * 60)
        app.run(host='0.0.0.0', port=5001, debug=True)

