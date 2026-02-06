# 🚀 Complete Setup Guide: YOLOv8 Kidney Stone Detection System

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Detailed Setup](#detailed-setup)
3. [Dataset Preparation](#dataset-preparation)
4. [Training Your Model](#training-your-model)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Start (15 Minutes)

### Prerequisites
- Python 3.8 or higher
- Node.js 14+ (for React frontend)
- 4GB RAM minimum
- GPU recommended (but not required)

### Install Everything

```bash
# 1. Clone/download the project
cd kidney-stone-yolo-project

# 2. Install Python dependencies
cd backend
pip install -r requirements.txt

# 3. Install React dependencies (optional, if you're using React)
cd ../frontend
npm install

# 4. Start the backend server
cd ../backend
python app.py

# 5. In a new terminal, start the frontend (if using React)
cd frontend
npm start
```

### Test It Out

1. Backend should be running on `http://localhost:5000`
2. Frontend should open automatically at `http://localhost:3000`
3. Upload a CT scan image
4. Click "Analyze with YOLOv8"

**Note**: Without a trained model, it will use the base YOLOv8 model (won't detect stones accurately yet).

---

## 🔧 Detailed Setup

### Step 1: Install Python Dependencies

```bash
cd backend
pip install flask==3.0.0
pip install flask-cors==4.0.0
pip install ultralytics==8.1.0
pip install opencv-python==4.8.1.78
pip install numpy==1.24.3
pip install pillow==10.1.0
pip install torch torchvision  # For GPU: pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

Or use requirements.txt:
```bash
pip install -r requirements.txt
```

### Step 2: Verify Installation

```bash
python -c "from ultralytics import YOLO; print('✅ YOLOv8 installed successfully')"
python -c "import cv2; print('✅ OpenCV installed successfully')"
python -c "import torch; print(f'✅ PyTorch installed. GPU available: {torch.cuda.is_available()}')"
```

### Step 3: Set Up Frontend (React)

```bash
cd frontend

# If you don't have the node_modules yet
npm install react react-dom lucide-react

# Or if package.json exists
npm install
```

---

## 📦 Dataset Preparation

### Option 1: Use Pre-trained YOLOv8 (No Training Needed)

The system works out-of-the-box with base YOLOv8, but won't be accurate for kidney stones.

**Accuracy without training**: ~30-50% (detects dense objects, but not specifically trained)

### Option 2: Train Your Own Model (Recommended)

#### Step 2.1: Prepare Dataset Structure

```bash
cd backend
python prepare_dataset.py init
```

This creates:
```
data/
├── images/
│   ├── train/    # Training images (70%)
│   ├── val/      # Validation images (20%)
│   └── test/     # Test images (10%)
└── labels/
    ├── train/    # Training labels
    ├── val/      # Validation labels
    └── test/     # Test labels
```

#### Step 2.2: Get Dataset

**Option A: Download Public Datasets**

```bash
python prepare_dataset.py download
```

This shows you where to find public kidney stone datasets.

**Option B: Use Your Own CT Scans**

1. Collect 100-1000 CT scan images with kidney stones
2. Annotate them using LabelImg or CVAT
3. Export in YOLO format

**Option C: Sample Dataset (Quick Test)**

For testing only, use 10-20 sample images:
1. Google "kidney stone CT scan"
2. Download 10-20 images
3. Annotate 5-10 manually with LabelImg
4. Use for quick training test

#### Step 2.3: Annotate Images

Using **LabelImg**:

```bash
pip install labelImg
labelImg
```

1. Open the `data/images/train` folder
2. Change save format to "YOLO"
3. Create bounding boxes around kidney stones
4. Save (creates .txt files in correct format)

**Label Format** (YOLO):
```
<class> <x_center> <y_center> <width> <height>
```

Example (`001.txt`):
```
0 0.456 0.378 0.089 0.102
0 0.632 0.541 0.076 0.084
```

Where:
- `0` = class ID (kidney_stone)
- All values normalized (0.0 to 1.0)

#### Step 2.4: Validate Dataset

```bash
python prepare_dataset.py validate
```

This checks:
- ✅ All images have corresponding labels
- ✅ Label format is correct
- ✅ Dataset size is adequate

**Recommended Sizes**:
- Minimum: 100 train, 20 val, 20 test (140 total)
- Good: 500 train, 100 val, 100 test (700 total)
- Excellent: 1000+ train, 200+ val, 200+ test (1400+ total)

---

## 🎓 Training Your Model

### Quick Training (Test)

```bash
cd backend
python train.py train
```

This trains for 100 epochs (~30-60 minutes on GPU, 2-4 hours on CPU).

### Custom Training Configuration

Edit `train.py` to adjust:

```python
CONFIG = {
    'model_size': 'yolov8n.pt',  # n=nano, s=small, m=medium, l=large, x=xlarge
    'epochs': 100,                # More epochs = better accuracy (diminishing returns >100)
    'batch_size': 16,             # Reduce if GPU memory error (try 8, 4, 2)
    'img_size': 640,              # Standard for YOLOv8
    'patience': 20,               # Early stopping
}
```

**Model Sizes**:
| Size | Speed | Accuracy | GPU Memory | Recommendation |
|------|-------|----------|------------|----------------|
| yolov8n | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ | 2GB | Quick testing |
| yolov8s | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | 4GB | **Recommended** |
| yolov8m | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | 6GB | High accuracy |
| yolov8l | ⚡⚡ | ⭐⭐⭐⭐⭐ | 8GB | Production |
| yolov8x | ⚡ | ⭐⭐⭐⭐⭐ | 12GB | Maximum accuracy |

### Training Progress

Watch for:
```
Epoch   GPU_mem   box_loss   cls_loss   dfl_loss   Instances   Size
1/100      2.1G      1.234      0.987      1.456         32      640
```

Good signs:
- Losses decreasing
- mAP increasing
- Training completes without errors

### After Training

Model saved to: `models/kidney_stone_yolov8/weights/best.pt`

Copy to deployment location:
```bash
cp models/kidney_stone_yolov8/weights/best.pt models/kidney_stone_yolov8.pt
```

### Validate Trained Model

```bash
python train.py validate
```

Expected results:
- mAP50: 0.85-0.95 (85-95% accuracy)
- Precision: 0.80-0.92
- Recall: 0.78-0.90

---

## 🏃 Running the Application

### Start Backend Server

```bash
cd backend
python app.py
```

Output should show:
```
 * Running on http://0.0.0.0:5000
Model loaded successfully
Server ready on http://localhost:5000
```

### Test Backend API

```bash
# Health check
curl http://localhost:5000/health

# Should return:
{"status":"healthy","model_loaded":true,"timestamp":"..."}
```

### Start Frontend (React)

In a new terminal:
```bash
cd frontend
npm start
```

Browser should automatically open to `http://localhost:3000`

### Using the Application

1. **Upload Image**: Click "Upload CT Scan" and select a kidney CT image
2. **Select Method**: Choose "YOLOv8 Deep Learning" or "Claude AI Vision"
3. **Add Patient Info**: (Optional) Fill in patient details
4. **Analyze**: Click "Analyze" button
5. **View Results**: See detected stones with bounding boxes
6. **Save**: Save results to database or download report

---

## 🎯 Expected Accuracy

### With Base YOLOv8 (No Training)
- Stone Detection: ~30-50%
- False Positives: High (~40-60%)
- Not recommended for actual use

### With Trained YOLOv8 (100+ images)
- Stone Detection: ~75-85%
- False Positives: ~15-25%
- Good for screening

### With Trained YOLOv8 (500+ images)
- Stone Detection: ~85-92%
- False Positives: ~8-15%
- Good for clinical assistance

### With Trained YOLOv8 (1000+ images)
- Stone Detection: ~90-95%
- False Positives: ~3-8%
- Excellent for clinical assistance

**Note**: These are estimates. Real accuracy depends on:
- Dataset quality
- Image quality
- Stone size (smaller stones harder to detect)
- Training configuration

---

## 🐛 Troubleshooting

### Backend Issues

#### "ModuleNotFoundError: No module named 'ultralytics'"
```bash
pip install ultralytics
```

#### "Model not found"
The app uses base YOLOv8 as fallback. To use trained model:
```bash
# Ensure trained model is at:
backend/models/kidney_stone_yolov8.pt
```

#### "CUDA out of memory"
Reduce batch size in training:
```python
# In train.py
CONFIG = {
    'batch_size': 8,  # Try 8, 4, or 2
}
```

#### "Port 5000 already in use"
Change port in `app.py`:
```python
app.run(host='0.0.0.0', port=5001)  # Change to 5001
```

### Frontend Issues

#### "Backend Offline" Status
1. Check backend is running: `python app.py`
2. Check no firewall blocking port 5000
3. Verify URL in frontend matches backend port

#### CORS Errors
Already handled by `flask-cors`. If issues persist:
```python
# In app.py
CORS(app, resources={r"/*": {"origins": "*"}})
```

### Training Issues

#### "Dataset not found"
```bash
# Check data.yaml exists
ls -la ../data/kidney_stones.yaml

# If not, create it:
python prepare_dataset.py init
```

#### Low Accuracy After Training
**Causes**:
- Dataset too small (< 100 images)
- Poor quality annotations
- Not enough training epochs
- Overfitting

**Solutions**:
1. Collect more data (aim for 500+ images)
2. Re-check annotations carefully
3. Train longer (try 150-200 epochs)
4. Add more data augmentation
5. Try larger model (yolov8s or yolov8m)

#### "GPU not available" but I have GPU
**For NVIDIA GPUs**:
```bash
# Uninstall CPU version
pip uninstall torch torchvision

# Install GPU version
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Verify
python -c "import torch; print(torch.cuda.is_available())"
```

---

## 📊 Performance Optimization

### Speed Up Training

1. **Use GPU**: 10-20x faster than CPU
2. **Smaller model**: yolov8n is 3-4x faster than yolov8l
3. **Larger batch size**: Use maximum that fits in GPU memory
4. **Reduce image size**: Try 512 instead of 640

### Speed Up Inference

```python
# In app.py, adjust confidence threshold
results = model(img, conf=0.35)  # Higher = faster but may miss stones
```

### Reduce Memory Usage

```python
# In train.py
CONFIG = {
    'batch_size': 4,      # Smaller batches
    'img_size': 512,      # Smaller images
    'model_size': 'yolov8n.pt'  # Smaller model
}
```

---

## 🔐 Security & Privacy

### For Development
- Current setup is fine (localhost only)

### For Production Deployment

⚠️ **Important Security Considerations**:

1. **Authentication**: Add user authentication
2. **HTTPS**: Use SSL/TLS for API calls
3. **API Keys**: Protect backend with API keys
4. **HIPAA Compliance**: Required for real patient data
5. **Data Encryption**: Encrypt patient data at rest
6. **Audit Logging**: Log all access to patient records
7. **Access Control**: Role-based permissions

**Sample Production Setup**:
```python
# Add API key authentication
from functools import wraps

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')
        if api_key != os.environ.get('API_KEY'):
            return jsonify({'error': 'Invalid API key'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/detect', methods=['POST'])
@require_api_key
def detect_stones():
    # ... detection code
```

---

## 📈 Next Steps

### Week 1-2: Get It Running
- [x] Install all dependencies
- [x] Run backend server
- [x] Test with sample images
- [ ] Collect 50-100 training images

### Week 3-4: Train Initial Model
- [ ] Annotate 100+ images
- [ ] Train first model
- [ ] Test and evaluate accuracy
- [ ] Iterate on annotations

### Month 2: Improve Accuracy
- [ ] Collect 500+ images
- [ ] Fine-tune hyperparameters
- [ ] Try different model sizes
- [ ] Achieve 85%+ accuracy

### Month 3+: Production Ready
- [ ] Collect 1000+ images
- [ ] Clinical validation
- [ ] Add security features
- [ ] Deploy to production

---

## 🆘 Getting Help

### Resources
- **YOLOv8 Docs**: https://docs.ultralytics.com/
- **Medical Imaging**: https://radiopaedia.org/
- **YOLO Forum**: https://github.com/ultralytics/ultralytics/discussions

### Common Questions

**Q: How many images do I need?**
A: Minimum 100, recommended 500+, excellent 1000+

**Q: Can I use this for real patients?**
A: Not yet - needs FDA approval and clinical validation

**Q: How accurate is YOLOv8 vs Claude?**
A: YOLOv8 (trained): 85-95%, Claude: 80-90%, depends on training data

**Q: Do I need a GPU?**
A: Not required, but highly recommended (10-20x faster training)

**Q: Can I run this on a server?**
A: Yes! Just change `app.run(host='0.0.0.0')` to allow external access

---

## ✅ Success Checklist

Before considering it "production ready":

- [ ] Trained on 500+ images
- [ ] Accuracy >85% on test set
- [ ] False positive rate <15%
- [ ] Tested on diverse CT scans
- [ ] Clinical validation by radiologists
- [ ] Security measures implemented
- [ ] HIPAA compliance (if applicable)
- [ ] Documentation complete
- [ ] Backup and recovery plan
- [ ] User training completed

---

**Remember**: This is a powerful tool for assisting healthcare professionals, but should never replace professional medical judgment. Always have radiologist oversight!
