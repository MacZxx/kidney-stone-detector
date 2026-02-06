"""
YOLOv8 Training Script for Kidney Stone Detection
This script trains a YOLOv8 model on kidney stone CT scan dataset
"""

from ultralytics import YOLO
import os
import torch
from pathlib import Path

# Configuration
CONFIG = {
    'model_size': 'yolov8n.pt',  # Options: yolov8n, yolov8s, yolov8m, yolov8l, yolov8x
    'data_yaml': '../data/kidney_stones.yaml',
    'epochs': 200,
    'batch_size': 16,
    'img_size': 640,
    'patience': 50,  # Early stopping patience
    'save_dir': '../models',
    'device': 'cpu',  # Will auto-detect GPU below
}

# Auto-detect GPU/CPU
if torch.cuda.is_available():
    CONFIG['device'] = 0  # Use GPU
    print("🎮 GPU detected! Training will be fast.")
else:
    CONFIG['device'] = 'cpu'  # Use CPU
    CONFIG['batch_size'] = 8  # Reduce batch size for CPU
    print("💻 No GPU detected. Training on CPU (will be slower).")
    print("   Tip: Use Google Colab for free GPU: https://colab.research.google.com/")

def train_model():
    """Train YOLOv8 model on kidney stone dataset"""
    
    print("="*60)
    print("YOLOv8 Kidney Stone Detection Training")
    print("="*60)
    
    # Check if data.yaml exists
    if not os.path.exists(CONFIG['data_yaml']):
        print(f"\n❌ Error: Dataset configuration not found at {CONFIG['data_yaml']}")
        print("\nPlease create the dataset first. See instructions in TRAINING_GUIDE.md")
        return
    
    # Create save directory
    os.makedirs(CONFIG['save_dir'], exist_ok=True)
    
    # Load model
    print(f"\n📦 Loading model: {CONFIG['model_size']}")
    model = YOLO(CONFIG['model_size'])
    
    # Display model info
    print(f"\n📊 Training Configuration:")
    print(f"   - Model: {CONFIG['model_size']}")
    print(f"   - Epochs: {CONFIG['epochs']}")
    print(f"   - Batch Size: {CONFIG['batch_size']}")
    print(f"   - Image Size: {CONFIG['img_size']}")
    print(f"   - Device: {CONFIG['device']}")
    
    if CONFIG['device'] == 'cpu':
        print(f"\n⏱️  Estimated time: 30-60 minutes")
    else:
        print(f"\n⏱️  Estimated time: 10-15 minutes")
    
    # Train model
    print(f"\n🚀 Starting training...\n")
    
    try:
        results = model.train(
            data=CONFIG['data_yaml'],
            epochs=CONFIG['epochs'],
            batch=CONFIG['batch_size'],
            imgsz=CONFIG['img_size'],
            patience=CONFIG['patience'],
            save=True,
            device=CONFIG['device'],
            project=CONFIG['save_dir'],
            name='kidney_stone_yolov8',
            exist_ok=True,
            
            # Data augmentation
            augment=True,
            hsv_h=0.015,  # HSV-Hue augmentation
            hsv_s=0.7,    # HSV-Saturation augmentation
            hsv_v=0.4,    # HSV-Value augmentation
            degrees=10.0,  # Rotation
            translate=0.1, # Translation
            scale=0.5,     # Scale
            flipud=0.5,    # Flip up-down
            fliplr=0.5,    # Flip left-right
            mosaic=1.0,    # Mosaic augmentation
            
            # Optimization
            optimizer='AdamW',
            lr0=0.01,      # Initial learning rate
            lrf=0.01,      # Final learning rate
            momentum=0.937,
            weight_decay=0.0005,
            warmup_epochs=3,
            
            # Validation
            val=True,
            save_period=10,  # Save checkpoint every 10 epochs
            verbose=True,
        )
        
        print("\n" + "="*60)
        print("✅ Training Complete!")
        print("="*60)
        
        # Print results
        print(f"\n📈 Final Metrics:")
        print(f"   - mAP50: {results.results_dict['metrics/mAP50(B)']:.4f}")
        print(f"   - mAP50-95: {results.results_dict['metrics/mAP50-95(B)']:.4f}")
        print(f"   - Precision: {results.results_dict['metrics/precision(B)']:.4f}")
        print(f"   - Recall: {results.results_dict['metrics/recall(B)']:.4f}")
        
        # Model location
        best_model_path = Path(CONFIG['save_dir']) / 'kidney_stone_yolov8' / 'weights' / 'best.pt'
        print(f"\n💾 Best model saved to: {best_model_path}")
        print(f"\n📋 To deploy this model:")
        print(f"   1. Copy: copy {best_model_path} {CONFIG['save_dir']}\\kidney_stone_yolov8.pt")
        print(f"   2. Restart backend: python app.py")
        print(f"   3. Test in your web app!")
        
    except Exception as e:
        print(f"\n❌ Training failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check that dataset exists and is properly formatted")
        print("2. Try reducing batch size (edit CONFIG['batch_size'] = 4)")
        print("3. Verify all images are valid and labels are correct")
        print("4. Run: python prepare_dataset.py validate")

def validate_model(model_path='../models/kidney_stone_yolov8.pt'):
    """Validate trained model on test set"""
    
    print("\n" + "="*60)
    print("Model Validation")
    print("="*60)
    
    if not os.path.exists(model_path):
        print(f"\n❌ Model not found at {model_path}")
        return
    
    model = YOLO(model_path)
    
    print(f"\n🔍 Validating model on test set...")
    results = model.val(data=CONFIG['data_yaml'])
    
    print(f"\n📊 Validation Results:")
    print(f"   - mAP50: {results.box.map50:.4f}")
    print(f"   - mAP50-95: {results.box.map:.4f}")
    print(f"   - Precision: {results.box.mp:.4f}")
    print(f"   - Recall: {results.box.mr:.4f}")

def test_inference(model_path='../models/kidney_stone_yolov8.pt', test_image='../data/test_images/sample.jpg'):
    """Test model on a single image"""
    
    print("\n" + "="*60)
    print("Test Inference")
    print("="*60)
    
    if not os.path.exists(model_path):
        print(f"\n❌ Model not found at {model_path}")
        return
    
    if not os.path.exists(test_image):
        print(f"\n❌ Test image not found at {test_image}")
        return
    
    model = YOLO(model_path)
    
    print(f"\n🔍 Running inference on: {test_image}")
    results = model(test_image)
    
    # Display results
    for result in results:
        boxes = result.boxes
        print(f"\n✅ Detected {len(boxes)} stones")
        
        for idx, box in enumerate(boxes):
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            print(f"   Stone {idx+1}: Confidence = {conf:.2%}, Class = {cls}")
    
    # Save results
    output_path = '../models/test_result.jpg'
    results[0].save(filename=output_path)
    print(f"\n💾 Result saved to: {output_path}")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'train':
            train_model()
        elif command == 'validate':
            validate_model()
        elif command == 'test':
            test_image = sys.argv[2] if len(sys.argv) > 2 else '../data/test_images/sample.jpg'
            test_inference(test_image=test_image)
        else:
            print(f"Unknown command: {command}")
            print("Usage: python train.py [train|validate|test]")
    else:
        print("YOLOv8 Kidney Stone Training Script")
        print("\nUsage:")
        print("  python train.py train          - Train new model")
        print("  python train.py validate       - Validate trained model")
        print("  python train.py test [image]   - Test on single image")
        print("\nRunning training by default...")
        train_model()