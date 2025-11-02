"""
Script to prepare training data from Firebase/existing reports
Extracts description-severity pairs for training
"""

import json
import pandas as pd
from firebase_admin import credentials, initialize_app, db
import os

def export_from_firebase():
    """
    Export reports from Firebase to CSV for training
    Requires Firebase credentials
    """
    # Initialize Firebase Admin SDK
    cred = credentials.Certificate('path/to/serviceAccountKey.json')
    initialize_app(cred, {
        'databaseURL': 'https://your-project.firebaseio.com'
    })
    
    # Fetch reports
    ref = db.reference('civilian/civilian crime reports')
    reports = ref.get()
    
    training_data = []
    for report_id, report_data in reports.items():
        if 'description' in report_data and 'severity' in report_data:
            training_data.append({
                'description': report_data['description'],
                'severity': report_data['severity']
            })
    
    # Save to CSV
    df = pd.DataFrame(training_data)
    df.to_csv('training_data.csv', index=False)
    print(f"Exported {len(df)} reports to training_data.csv")
    
    return df

def prepare_manual_data():
    """
    Manually prepare training data
    Add your training examples here
    """
    training_data = [
        # Immediate threats
        {'description': 'Armed suspect with gun at the location. Immediate danger to public safety.', 'severity': 'Immediate'},
        {'description': 'Bomb threat reported at the building. Evacuation required immediately.', 'severity': 'Immediate'},
        {'description': 'Hostage situation in progress. Suspects armed and dangerous.', 'severity': 'Immediate'},
        {'description': 'Terrorist activity suspected. Multiple suspects with weapons.', 'severity': 'Immediate'},
        {'description': 'Active shooting in progress. Multiple casualties reported.', 'severity': 'Immediate'},
        {'description': 'Explosive device found at location. Immediate evacuation needed.', 'severity': 'Immediate'},
        {'description': 'Person threatening with knife. Dangerous situation unfolding.', 'severity': 'Immediate'},
        {'description': 'Gunshots heard in the area. Active threat to civilians.', 'severity': 'Immediate'},
        
        # High priority
        {'description': 'Drug dealing activity observed. Suspected illegal substances.', 'severity': 'High'},
        {'description': 'Suspicious person carrying weapon-like object. Potential threat.', 'severity': 'High'},
        {'description': 'Gang activity and violence in the neighborhood. High risk area.', 'severity': 'High'},
        {'description': 'Assault in progress. Physical violence occurring.', 'severity': 'High'},
        {'description': 'Kidnapping attempt reported. Suspect vehicle identified.', 'severity': 'High'},
        {'description': 'Domestic violence situation. Victim needs immediate protection.', 'severity': 'High'},
        {'description': 'Robbery in progress. Suspects fleeing the scene.', 'severity': 'High'},
        {'description': 'Sexual assault reported. Victim requires immediate medical attention.', 'severity': 'High'},
        {'description': 'Torture or abuse happening. Urgent intervention needed.', 'severity': 'High'},
        {'description': 'Human trafficking activity suspected. Multiple victims involved.', 'severity': 'High'},
        
        # Moderate priority
        {'description': 'Noise complaint from neighbors. Disturbance after hours.', 'severity': 'Moderate'},
        {'description': 'Vandalism reported. Property damage occurred.', 'severity': 'Moderate'},
        {'description': 'Theft incident. Stolen items reported.', 'severity': 'Moderate'},
        {'description': 'Fighting in public place. Crowd gathering.', 'severity': 'Moderate'},
        {'description': 'Disorderly conduct. Alcohol-related incident.', 'severity': 'Moderate'},
        {'description': 'Traffic accident. No serious injuries reported.', 'severity': 'Moderate'},
        {'description': 'Suspicious activity. No immediate threat detected.', 'severity': 'Moderate'},
        {'description': 'Harassment complaint. Verbal altercation occurred.', 'severity': 'Moderate'},
        {'description': 'Trespassing on private property. Person asked to leave.', 'severity': 'Moderate'},
        {'description': 'Illegal gambling operation. Investigation needed.', 'severity': 'Moderate'},
        
        # Low priority
        {'description': 'Broken streetlight. Needs repair service.', 'severity': 'Low'},
        {'description': 'Pothole on the road. Traffic inconvenience.', 'severity': 'Low'},
        {'description': 'Lost property found. Owner can claim.', 'severity': 'Low'},
        {'description': 'General inquiry. Information request.', 'severity': 'Low'},
        {'description': 'Minor disturbance. Situation under control.', 'severity': 'Low'},
        {'description': 'Non-emergency service request. Routine matter.', 'severity': 'Low'},
        {'description': 'Public utility issue. Scheduled maintenance needed.', 'severity': 'Low'},
        {'description': 'Neighborhood watch concern. Preventive measure.', 'severity': 'Low'},
    ]
    
    # Save to CSV
    df = pd.DataFrame(training_data)
    df.to_csv('training_data.csv', index=False)
    print(f"Created training_data.csv with {len(df)} examples")
    
    return df

if __name__ == '__main__':
    # Use manual data preparation (or call export_from_firebase if you have Firebase access)
    prepare_manual_data()

