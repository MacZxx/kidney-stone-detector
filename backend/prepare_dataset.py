"""
Dataset Preparation Script for Kidney Stone Detection
This script helps prepare and validate your dataset for YOLOv8 training
"""

import os
import yaml
from pathlib import Path
import shutil

def create_dataset_structure():
    """Create proper directory structure for YOLOv8 dataset"""
    
    base_dir = Path('../data')
    
    # Create directories
    dirs = [
        base_dir / 'images' / 'train',
        base_dir / 'images' / 'val',
        base_dir / 'images' / 'test',
        base_dir / 'labels' / 'train',
        base_dir / 'labels' / 'val',
        base_dir / 'labels' / 'test',
    ]
    
    for dir_path in dirs:
        dir_path.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created: {dir_path}")
    
    print("\n📁 Dataset structure created successfully!")
    print("\nNext steps:")
    print("1. Add your CT scan images to data/images/train (and val, test)")
    print("2. Add corresponding label files to data/labels/train (and val, test)")
    print("3. Label format: Each line = <class> <x_center> <y_center> <width> <height>")
    print("   (All values normalized to 0-1)")

def create_data_yaml():
    """Create dataset configuration YAML file for YOLOv8"""
    
    yaml_content = {
        'path': str(Path('../data').absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'test': 'images/test',
        
        # Number of classes
        'nc': 1,
        
        # Class names
        'names': ['kidney_stone']
    }
    
    yaml_path = Path('../data/kidney_stones.yaml')
    
    with open(yaml_path, 'w') as f:
        yaml.dump(yaml_content, f, default_flow_style=False)
    
    print(f"\n✅ Created dataset config: {yaml_path}")
    print("\nYAML Contents:")
    print(yaml.dump(yaml_content, default_flow_style=False))

def validate_dataset():
    """Validate dataset structure and file counts"""
    
    print("\n" + "="*60)
    print("Dataset Validation")
    print("="*60)
    
    base_dir = Path('../data')
    
    splits = ['train', 'val', 'test']
    total_images = 0
    total_labels = 0
    
    for split in splits:
        img_dir = base_dir / 'images' / split
        lbl_dir = base_dir / 'labels' / split
        
        images = list(img_dir.glob('*.jpg')) + list(img_dir.glob('*.png'))
        labels = list(lbl_dir.glob('*.txt'))
        
        print(f"\n{split.upper()} Set:")
        print(f"  Images: {len(images)}")
        print(f"  Labels: {len(labels)}")
        
        total_images += len(images)
        total_labels += len(labels)
        
        # Check for matching files
        image_stems = {img.stem for img in images}
        label_stems = {lbl.stem for lbl in labels}
        
        missing_labels = image_stems - label_stems
        missing_images = label_stems - image_stems
        
        if missing_labels:
            print(f"  ⚠️  {len(missing_labels)} images without labels")
        if missing_images:
            print(f"  ⚠️  {len(missing_images)} labels without images")
        
        if not missing_labels and not missing_images and len(images) > 0:
            print(f"  ✅ All files properly paired")
    
    print(f"\n📊 Total Statistics:")
    print(f"   Total Images: {total_images}")
    print(f"   Total Labels: {total_labels}")
    
    if total_images == 0:
        print("\n⚠️  WARNING: No images found! Add images to get started.")
        print("\nRecommended dataset sizes:")
        print("   - Minimum: 100 images (train), 20 (val), 20 (test)")
        print("   - Good: 500 images (train), 100 (val), 100 (test)")
        print("   - Excellent: 1000+ images (train), 200+ (val), 200+ (test)")
    elif total_images < 100:
        print("\n⚠️  WARNING: Dataset is very small. Collect more images for better accuracy.")
    elif total_images < 500:
        print("\n✅ Dataset size is adequate. More images will improve accuracy.")
    else:
        print("\n✅ Dataset size is good!")
    
    return total_images > 0

def download_sample_dataset():
    """Instructions for downloading sample kidney stone datasets"""
    
    print("\n" + "="*60)
    print("Sample Dataset Sources")
    print("="*60)
    
    print("\n🌐 Public Medical Imaging Datasets:")
    print("\n1. KiTS19/KiTS21 (Kidney Tumor Segmentation)")
    print("   URL: https://kits19.grand-challenge.org/")
    print("   - 300+ kidney CT scans")
    print("   - Some include stones")
    print("   - Requires annotation for stone detection")
    
    print("\n2. The Cancer Imaging Archive (TCIA)")
    print("   URL: https://www.cancerimagingarchive.net/")
    print("   - Search: 'kidney stones' or 'urinary calculi'")
    print("   - Various CT scan collections")
    
    print("\n3. Radiopaedia Cases")
    print("   URL: https://radiopaedia.org/")
    print("   - Educational cases with kidney stones")
    print("   - Requires manual annotation")
    
    print("\n📝 Annotation Tools:")
    print("   - LabelImg: For 2D bounding boxes (YOLO format)")
    print("     GitHub: https://github.com/heartexlabs/labelImg")
    print("   - CVAT: Web-based annotation")
    print("     URL: https://cvat.org/")
    
    print("\n💡 Quick Start with Sample Data:")
    print("   For testing, you can use any kidney CT images from Google Images")
    print("   and manually annotate a few (~10-20) to test the training pipeline.")

def create_sample_annotation():
    """Create a sample annotation file for reference"""
    
    sample_path = Path('../data/labels/SAMPLE_LABEL_FORMAT.txt')
    
    sample_content = """# YOLOv8 Label Format
# Each line represents one object (kidney stone)
# Format: <class> <x_center> <y_center> <width> <height>
# All values are normalized (0.0 to 1.0)

# Example annotations:
# Class 0 (kidney_stone) at center (0.5, 0.3) with size (0.1, 0.08)
0 0.5 0.3 0.1 0.08

# Another stone at different location
0 0.35 0.6 0.08 0.09

# Notes:
# - x_center: horizontal center position (0=left, 1=right)
# - y_center: vertical center position (0=top, 1=bottom)
# - width: bounding box width as fraction of image width
# - height: bounding box height as fraction of image height
"""
    
    with open(sample_path, 'w') as f:
        f.write(sample_content)
    
    print(f"\n✅ Created sample label format: {sample_path}")

if __name__ == '__main__':
    import sys
    
    print("="*60)
    print("YOLOv8 Kidney Stone Dataset Preparation")
    print("="*60)
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'init':
            create_dataset_structure()
            create_data_yaml()
            create_sample_annotation()
        elif command == 'validate':
            validate_dataset()
        elif command == 'download':
            download_sample_dataset()
        else:
            print(f"Unknown command: {command}")
            print("Usage: python prepare_dataset.py [init|validate|download]")
    else:
        print("\nUsage:")
        print("  python prepare_dataset.py init      - Create dataset structure")
        print("  python prepare_dataset.py validate  - Validate dataset")
        print("  python prepare_dataset.py download  - Show dataset sources")
        print("\nRunning init by default...")
        create_dataset_structure()
        create_data_yaml()
        create_sample_annotation()
        print("\n✅ Dataset preparation complete!")
        print("\nNext: Add your images and labels, then run: python prepare_dataset.py validate")
