# Quick Test Guide - ML Model in Dashboard

## Step-by-Step: How to Test ML Model in Dashboard

### Step 1: Train the Model (First Time Only)

If you haven't trained the model yet, or want to retrain:

```bash
cd ml-threat-detection
python run_training.py
```

**Wait for:**
```
Model saved to model/
Training completed!
```

This creates:
- `model/vectorizer.joblib`
- `model/embeddings.json`
- `model/thresholds.json`

---

### Step 2: Start ML Server

**Open Terminal 1:**

```bash
cd E-Responde-Admin/ml-threat-detection
python threat_model_server.py
```

**Wait for:**
```
Model loaded successfully!
============================================================
Starting threat detection model server...
============================================================
Server running at:
  http://localhost:5001
```

**Keep this terminal running!** The ML server must stay running.

---

### Step 3: Verify ML Server is Working

**Open browser:**
```
http://localhost:5001/health
```

**Should show:**
```json
{
  "status": "ok",
  "model_loaded": true,
  "service": "ML Threat Detection API"
}
```

✅ If you see this, ML server is working!

---

### Step 4: Start Dashboard

**Open Terminal 2 (keep Terminal 1 running!):**

```bash
cd E-Responde-Admin
npm start
# or
yarn start
# or whatever command you use to start React
```

**Wait for:**
```
Compiled successfully!
webpack compiled with X warnings
```

Dashboard should open at `http://localhost:3000` (or your configured port)

---

### Step 5: Test with New Report

**Option A: From Mobile App**
1. Open your mobile app
2. Submit a new crime report
3. Watch Dashboard console (F12 → Console tab)

**Option B: Manual Test (if you have Firebase access)**
1. Open Firebase Console
2. Add a new report manually to test

---

### Step 6: Check Console Logs

**Open Dashboard → Press F12 → Console Tab**

**Look for these logs when NEW report arrives:**

✅ **ML Server Available:**
```
✅ ML Threat Detection: Ready and waiting for new reports (X existing reports loaded, not analyzing them)
```

✅ **New Report Detected:**
```
🚨 ML Threat Detection: New report detected! Analyzing 1 new report(s)...
   New report IDs: ['report-id-here']
✅ ML server is available, sending reports for analysis...
```

✅ **ML Analysis:**
```
🚨 ML Threat Detection: Starting analysis for 1 report(s)...
   Report details: [{ id: '...', description: '...', currentSeverity: 'moderate' }]
```

✅ **Reclassification (if severity changed):**
```
📊 ML Reclassification: Report [ID] - moderate → Immediate (confidence: 85.0%)
✅ ML Threat Detection completed: 1 report(s) reclassified, 1 threat(s) detected
```

✅ **Confirmation (if severity matches):**
```
✅ ML Confirmation: Report [ID] - Severity Moderate confirmed (confidence: 78.0%)
```

---

## Troubleshooting

### ❌ If you see: "ML server not available"

**Problem:** ML server is not running

**Fix:**
1. Check Terminal 1 - is `threat_model_server.py` still running?
2. If not, restart it:
   ```bash
   cd ml-threat-detection
   python threat_model_server.py
   ```
3. Wait for "Server running at http://localhost:5001"
4. Refresh Dashboard

---

### ❌ If you see: "Model not loaded"

**Problem:** Model files missing

**Fix:**
1. Train the model first:
   ```bash
   cd ml-threat-detection
   python run_training.py
   ```
2. Then start server:
   ```bash
   python threat_model_server.py
   ```

---

### ❌ If no logs appear when submitting report

**Problem:** Dashboard not detecting new reports

**Fix:**
1. Check browser console for errors
2. Make sure Firebase is connected
3. Check if report ID is being detected
4. Look for "NEW REPORTS DETECTED" in console

---

## Quick Checklist

Before testing:

- [ ] Model trained? (`python run_training.py`)
- [ ] Model files exist? (`model/vectorizer.joblib`, `model/embeddings.json`, `model/thresholds.json`)
- [ ] ML server running? (`python threat_model_server.py`)
- [ ] ML server accessible? (`http://localhost:5001/health` shows `model_loaded: true`)
- [ ] Dashboard running? (React app started)
- [ ] Browser console open? (F12 → Console)

During test:

- [ ] Submit new report from mobile app
- [ ] Check console for "New report detected"
- [ ] Check console for "ML server is available"
- [ ] Check console for "ML Reclassification" or "ML Confirmation"
- [ ] Check Firebase - report should have `mlReclassified`, `threatAnalysis` fields
- [ ] Check Dashboard UI - report should be in correct severity category

---

## Expected Behavior

### When ML Model Works:

1. **New report submitted** → Console shows detection
2. **ML server analyzes** → Console shows analysis logs
3. **Report reclassified** → Console shows reclassification
4. **Firebase updated** → Report has ML metadata fields
5. **Dashboard updates** → Report moves to correct category (Immediate/High/Moderate/Low)

### When ML Model Doesn't Work:

1. **No logs** → ML server not running or not connected
2. **"ML server not available"** → Server not started
3. **"Model not loaded"** → Model not trained
4. **No reclassification** → Check ML prediction vs current severity

---

## Test Commands Summary

**Terminal 1 (ML Server):**
```bash
cd E-Responde-Admin/ml-threat-detection
python threat_model_server.py
```

**Terminal 2 (Dashboard):**
```bash
cd E-Responde-Admin
npm start
```

**Browser:**
- Dashboard: `http://localhost:3000`
- ML Server Health: `http://localhost:5001/health`
- Console: F12 → Console tab

---

**That's it! Just run both commands in separate terminals and submit a new report to test!**

