# Fix Model - 0.000 Similarity Scores Issue

## Problem: Model Returns 0.000 Similarity Scores

When the model predicts, all similarity scores are 0.000, which means the model isn't working correctly.

## Step-by-Step Fix

### Step 1: Verify Model Files Exist

Check if all model files are present:

```bash
cd ml-threat-detection
dir model
```

**Should show:**
- `vectorizer.joblib`
- `embeddings.json`
- `thresholds.json`

**If files missing or corrupted → Retrain model**

---

### Step 2: Retrain the Model

**Run training script:**

```bash
cd ml-threat-detection
python run_training.py
```

**Wait for:**
```
Training completed!
Model saved to model/
```

**Check training output:**
- Should show accuracy > 0%
- Should show severity distribution
- Should show evaluation results

---

### Step 3: Test the Model

**Test with a known example:**

```bash
python test_specific_report.py
```

**Check similarity scores:**
- Should NOT be all 0.000
- Should have meaningful values (0.0-1.0)
- Highest similarity = predicted severity

---

### Step 4: Restart ML Server

**After retraining, restart server:**

```bash
# Stop old server (Ctrl+C)
# Then start again:
python threat_model_server.py
```

**Verify server loaded model:**
- Should show: "Model loaded successfully!"
- Should NOT show errors

---

### Step 5: Test Server Endpoint

**Test ML server:**

```bash
# Open browser: http://localhost:5001/health
# Should show: {"model_loaded": true}
```

**Test prediction:**

```bash
# Use browser console or curl:
fetch('http://localhost:5001/predict', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({description: 'Armed suspect with gun. Immediate danger.'})
})
.then(r => r.json())
.then(d => console.log(d))
```

**Check prediction:**
- Should have non-zero similarity scores
- Should predict correct severity

---

## Common Issues & Solutions

### Issue 1: Model Not Trained

**Symptom:** No `model/` folder or missing files

**Solution:**
```bash
cd ml-threat-detection
python run_training.py
```

---

### Issue 2: Model Files Corrupted

**Symptom:** Files exist but model doesn't work

**Solution:**
1. Delete `model/` folder
2. Retrain model:
   ```bash
   python run_training.py
   ```

---

### Issue 3: Vectorizer Mismatch

**Symptom:** Similarity scores are all 0.000

**Solution:**
- This happens when vectorizer vocabulary doesn't match training data
- **Retrain model** to rebuild vectorizer with correct vocabulary

---

### Issue 4: Embeddings Empty

**Symptom:** `embeddings.json` is empty or has wrong format

**Solution:**
1. Check `embeddings.json`:
   ```bash
   # Should have keys: "Immediate", "High", "Moderate", "Low"
   # Each should have array values (not empty)
   ```
2. If empty/corrupted → Retrain model

---

### Issue 5: Training Data Issues

**Symptom:** Model trains but predicts incorrectly

**Solution:**
1. Check `training_data.csv`:
   - Should have 1000+ examples
   - Should have both English and Filipino
   - Should be balanced across severities
2. Regenerate if needed:
   ```bash
   python create_large_dataset.py
   ```
3. Retrain:
   ```bash
   python run_training.py
   ```

---

## Quick Fix Checklist

- [ ] Model files exist? (`model/vectorizer.joblib`, `embeddings.json`, `thresholds.json`)
- [ ] Model trained recently? (Run `python run_training.py`)
- [ ] Similarity scores NOT all 0.000? (Test with `python test_specific_report.py`)
- [ ] ML server restarted after retraining? (Stop and start again)
- [ ] Training data has enough examples? (1000+ examples, balanced severities)

---

## Complete Fix Process

### Option 1: Quick Retrain (if model exists)

```bash
cd ml-threat-detection
python run_training.py
```

**Then restart ML server:**

```bash
# Stop old server (Ctrl+C)
python threat_model_server.py
```

---

### Option 2: Full Reset (if model is broken)

```bash
cd ml-threat-detection

# Delete old model (if corrupted)
rmdir /s model
# or manually delete model folder

# Retrain from scratch
python run_training.py

# Verify model works
python test_specific_report.py

# Start server
python threat_model_server.py
```

---

### Option 3: Regenerate Training Data (if needed)

```bash
cd ml-threat-detection

# Regenerate training data
python create_large_dataset.py

# Retrain model with new data
python run_training.py

# Test model
python test_specific_report.py

# Start server
python threat_model_server.py
```

---

## Verification

After fixing, test the model:

```bash
python test_specific_report.py
```

**Expected output:**
```
Similarity Scores by Severity:
  High: 0.XXX    (NOT 0.000)
  Moderate: 0.XXX
  Immediate: 0.XXX
  Low: 0.XXX
```

**If still all 0.000:**
- Check vectorizer is loading correctly
- Check embeddings.json has data
- Check training completed without errors
- Try regenerating training data

---

## Summary

**Most common fix:** Retrain the model

```bash
cd ml-threat-detection
python run_training.py
# Then restart ML server
```

**If that doesn't work:** Full reset (delete model folder, regenerate training data, retrain)

---

**The 0.000 similarity scores indicate the model needs to be retrained properly.**

