"""
Test script for the ML Threat Detection Server
Run this to test all endpoints
"""

import requests
import json

BASE_URL = 'http://localhost:5001'

def test_root():
    """Test root endpoint"""
    print("\n" + "="*60)
    print("Testing Root Endpoint (GET /)")
    print("="*60)
    try:
        response = requests.get(f'{BASE_URL}/')
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("Testing Health Endpoint (GET /health)")
    print("="*60)
    try:
        response = requests.get(f'{BASE_URL}/health')
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_predict():
    """Test predict endpoint"""
    print("\n" + "="*60)
    print("Testing Predict Endpoint (POST /predict)")
    print("="*60)
    
    test_cases = [
        {
            "description": "Armed suspect with gun threatening people. Immediate danger."
        },
        {
            "description": "Drug dealing activity in the area. High priority."
        },
        {
            "description": "Noise complaint from neighbors. Disturbance after hours."
        },
        {
            "description": "Broken streetlight needs repair. Routine maintenance."
        }
    ]
    
    all_passed = True
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}:")
        print(f"Description: {test_case['description']}")
        try:
            response = requests.post(
                f'{BASE_URL}/predict',
                json=test_case,
                headers={'Content-Type': 'application/json'}
            )
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                prediction = data.get('prediction', {})
                print(f"Predicted Severity: {prediction.get('severity')}")
                print(f"Confidence: {prediction.get('confidence', 0):.3f}")
                print(f"Raw Similarity: {prediction.get('raw_similarity', 0):.3f}")
                print(f"Is Threat: {prediction.get('isThreat')}")
            else:
                print(f"Error Response: {response.text}")
                all_passed = False
        except Exception as e:
            print(f"Error: {e}")
            all_passed = False
    
    return all_passed

def test_predict_batch():
    """Test batch predict endpoint"""
    print("\n" + "="*60)
    print("Testing Batch Predict Endpoint (POST /predict-batch)")
    print("="*60)
    
    test_data = {
        "descriptions": [
            "Armed suspect with gun. Immediate danger.",
            "Drug dealing activity. High priority.",
            "Noise complaint. Disturbance.",
            "Broken streetlight. Routine maintenance."
        ]
    }
    
    try:
        response = requests.post(
            f'{BASE_URL}/predict-batch',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Number of predictions: {len(data.get('predictions', []))}")
            for i, pred in enumerate(data.get('predictions', []), 1):
                if 'prediction' in pred:
                    p = pred['prediction']
                    print(f"\n  Prediction {i}:")
                    print(f"    Severity: {p.get('severity')}")
                    print(f"    Confidence: {p.get('confidence', 0):.3f}")
                    print(f"    Is Threat: {p.get('isThreat')}")
        else:
            print(f"Error Response: {response.text}")
            return False
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_evaluate():
    """Test evaluate endpoint"""
    print("\n" + "="*60)
    print("Testing Evaluate Endpoint (POST /evaluate)")
    print("="*60)
    
    test_data = {
        "test_data": [
            {"description": "Armed suspect with gun. Immediate danger.", "severity": "Immediate"},
            {"description": "Drug dealing activity. High priority.", "severity": "High"},
            {"description": "Noise complaint. Disturbance.", "severity": "Moderate"},
            {"description": "Broken streetlight. Routine maintenance.", "severity": "Low"}
        ]
    }
    
    try:
        response = requests.post(
            f'{BASE_URL}/evaluate',
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', {})
            print(f"Overall Accuracy: {results.get('accuracy', 0):.3f}")
            print(f"Threat Accuracy: {results.get('threat_accuracy', 0):.3f}")
            print("\nPer-Severity Metrics:")
            for severity, metrics in results.get('severity_metrics', {}).items():
                print(f"  {severity}:")
                print(f"    Precision: {metrics.get('precision', 0):.3f}")
                print(f"    Recall: {metrics.get('recall', 0):.3f}")
                print(f"    F1: {metrics.get('f1', 0):.3f}")
        else:
            print(f"Error Response: {response.text}")
            return False
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("="*60)
    print("ML Threat Detection Server Test Suite")
    print("="*60)
    print(f"\nTesting server at: {BASE_URL}")
    print("Make sure the server is running: python threat_model_server.py")
    
    results = {
        'root': test_root(),
        'health': test_health(),
        'predict': test_predict(),
        'predict_batch': test_predict_batch(),
        'evaluate': test_evaluate()
    }
    
    print("\n" + "="*60)
    print("Test Results Summary")
    print("="*60)
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name:20s}: {status}")
    
    all_passed = all(results.values())
    if all_passed:
        print("\n✓ All tests passed!")
    else:
        print("\n✗ Some tests failed. Check the output above.")
    
    return all_passed

if __name__ == '__main__':
    main()

