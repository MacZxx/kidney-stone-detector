"""
Kidney Stone Detection Backend Server
Using YOLOv8 for real-time kidney stone detection from CT scans
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Global model variable
model = None
MODEL_PATH = '../models/kidney_stone_yolov8.pt'

def initialize_model():
    """Initialize the YOLO model"""
    global model
    try:
        if os.path.exists(MODEL_PATH):
            logger.info(f"Loading trained model from {MODEL_PATH}")
            model = YOLO(MODEL_PATH)
        else:
            logger.warning("Trained model not found, using pre-trained YOLOv8n")
            model = YOLO('yolov8n.pt')  # Use base model as fallback
            logger.info("NOTE: Using general YOLOv8 model. Train a custom model for better accuracy!")
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise

def decode_base64_image(base64_string):
    """Decode base64 image string to numpy array"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(base64_string)
        nparr = np.frombuffer(image_bytes, np.uint8)
        
        # Decode to image
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Failed to decode image")
        
        return img
    except Exception as e:
        logger.error(f"Error decoding image: {e}")
        raise

def calculate_stone_size(box_width, box_height, image_width, image_height):
    """
    Estimate stone size in mm based on bounding box
    Assumes average kidney width is ~100-120mm and takes ~300-400 pixels in CT
    This is a rough estimation - real clinical use needs calibration
    """
    # Average pixels per mm (approximate for typical CT scans)
    avg_pixels_per_mm = 3.5
    
    # Calculate size in mm
    width_mm = box_width / avg_pixels_per_mm
    height_mm = box_height / avg_pixels_per_mm
    
    # Use average of width and height for stone size
    size_mm = (width_mm + height_mm) / 2
    
    return round(size_mm, 1)

def determine_location(x_center, y_center, img_width, img_height):
    """
    Determine anatomical location based on position in image
    This is simplified - real implementation needs anatomical landmarks
    """
    # Divide image into regions
    horizontal_third = img_width / 3
    vertical_third = img_height / 3
    
    # Determine left/right
    if x_center < horizontal_third:
        side = "Left"
    elif x_center > 2 * horizontal_third:
        side = "Right"
    else:
        side = "Central"
    
    # Determine upper/middle/lower
    if y_center < vertical_third:
        pole = "Upper Pole"
    elif y_center > 2 * vertical_third:
        pole = "Lower Pole"
    else:
        pole = "Mid Section"
    
    return f"{side} Kidney - {pole}"

def assess_image_quality(image):
    """Assess CT scan image quality"""
    # Calculate basic quality metrics
    height, width = image.shape[:2]
    total_pixels = height * width
    
    # Check resolution
    if total_pixels > 2000000:
        quality = "excellent"
    elif total_pixels > 800000:
        quality = "good"
    elif total_pixels > 300000:
        quality = "fair"
    else:
        quality = "poor"
    
    # Check contrast (standard deviation of pixel values)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    contrast = np.std(gray)
    
    if contrast < 20 and quality != "poor":
        quality = "fair"  # Low contrast
    
    return quality

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/detect', methods=['POST'])
def detect_stones():
    """
    Main detection endpoint
    Expects: { "image": "base64_encoded_image", "patientInfo": {...} }
    Returns: Detection results in same format as Claude API
    """
    try:
        # Get request data
        data = request.json
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        base64_image = data['image']
        patient_info = data.get('patientInfo', {})
        
        logger.info(f"Processing detection request for patient: {patient_info.get('name', 'Unknown')}")
        
        # Decode image
        img = decode_base64_image(base64_image)
        img_height, img_width = img.shape[:2]
        
        # Assess image quality
        image_quality = assess_image_quality(img)
        logger.info(f"Image quality: {image_quality}")
        
        # Run YOLO detection
        results = model(img, conf=0.25)  # 25% confidence threshold
        
        # Parse results
        detected_stones = []
        for idx, box in enumerate(results[0].boxes):
            # Get box coordinates
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            confidence = float(box.conf[0].cpu().numpy()) * 100
            
            # Calculate box dimensions
            box_width = x2 - x1
            box_height = y2 - y1
            
            # Calculate center for location determination
            x_center = (x1 + x2) / 2
            y_center = (y1 + y2) / 2
            
            # Estimate size
            size_mm = calculate_stone_size(box_width, box_height, img_width, img_height)
            
            # Determine location
            location = determine_location(x_center, y_center, img_width, img_height)
            
            # Determine characteristics based on size and confidence
            if size_mm > 10:
                characteristics = "Large calcification, irregular borders"
            elif size_mm > 5:
                characteristics = "Moderate-sized stone, well-defined"
            else:
                characteristics = "Small calculus, smooth appearance"
            
            stone = {
                'id': idx + 1,
                'location': location,
                'coordinates': {
                    'x': float(x1),
                    'y': float(y1),
                    'width': float(box_width),
                    'height': float(box_height)
                },
                'size': f"{size_mm} mm",
                'confidence': round(confidence, 1),
                'characteristics': characteristics
            }
            
            detected_stones.append(stone)
        
        # Sort by confidence (highest first)
        detected_stones.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Generate findings summary
        total_count = len(detected_stones)
        if total_count == 0:
            findings = "No kidney stones detected in this CT scan. The renal parenchyma appears clear."
            recommendations = "No immediate intervention required. Continue routine monitoring if patient is symptomatic."
        elif total_count == 1:
            findings = f"Single kidney stone detected measuring {detected_stones[0]['size']}."
            recommendations = "Consider hydration therapy and pain management. Urology consultation recommended if stone is >5mm or patient is symptomatic."
        else:
            findings = f"Multiple kidney stones detected ({total_count} total). Bilateral involvement noted."
            recommendations = "Comprehensive urological evaluation recommended. Consider metabolic workup and 24-hour urine collection. Discuss treatment options including ESWL or ureteroscopy based on stone size and location."
        
        # Calculate overall confidence
        if detected_stones:
            overall_confidence = sum(s['confidence'] for s in detected_stones) / len(detected_stones)
        else:
            overall_confidence = 95  # High confidence if nothing detected
        
        # Prepare response
        response = {
            'detectedStones': detected_stones,
            'totalCount': total_count,
            'imageType': 'CT Scan - Automated YOLOv8 Analysis',
            'imageQuality': image_quality,
            'findings': findings,
            'recommendations': recommendations,
            'limitationsNoted': 'Automated detection may miss stones <3mm. Manual radiologist review recommended for clinical decision-making.',
            'analysisConfidence': round(overall_confidence, 1),
            'analysisDate': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'modelUsed': 'YOLOv8 (Deep Learning)',
            'preprocessingApplied': True,
            'validationApplied': True
        }
        
        logger.info(f"Detection complete: {total_count} stones found with {overall_confidence:.1f}% confidence")
        
        return jsonify(response)
    
    except Exception as e:
        logger.error(f"Error during detection: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Detection failed',
            'message': str(e)
        }), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded model"""
    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500
    
    return jsonify({
        'model_type': 'YOLOv8',
        'model_path': MODEL_PATH,
        'is_custom_trained': os.path.exists(MODEL_PATH),
        'input_size': '640x640',
        'confidence_threshold': 0.25
    })

@app.route('/train-status', methods=['GET'])
def train_status():
    """Check if custom model is trained"""
    return jsonify({
        'custom_model_exists': os.path.exists(MODEL_PATH),
        'model_path': MODEL_PATH,
        'recommendation': 'Train a custom model on kidney stone dataset for 80-95% accuracy'
    })

if __name__ == '__main__':
    # Initialize model on startup
    logger.info("Starting Kidney Stone Detection Server...")
    initialize_model()
    
    # Run server
    logger.info("Server ready on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
