#!/bin/bash

# Quick Start Script for Kidney Stone Detection System
# This script automates the initial setup process

echo "========================================"
echo "🏥 Kidney Stone Detection System Setup"
echo "========================================"
echo ""

# Check Python version
echo "📋 Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✅ Python version: $python_version"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip not found. Please install pip first."
    exit 1
fi
echo "✅ pip is installed"

echo ""
echo "🔧 Installing Python dependencies..."
cd backend

# Create virtual environment (optional but recommended)
read -p "Create virtual environment? (recommended) [y/N]: " create_venv
if [[ $create_venv =~ ^[Yy]$ ]]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "✅ Virtual environment created and activated"
fi

# Install requirements
echo "📥 Installing packages..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ All Python packages installed successfully"
else
    echo "❌ Failed to install some packages. Check errors above."
    exit 1
fi

echo ""
echo "📁 Setting up dataset structure..."
python3 prepare_dataset.py init

echo ""
echo "🎯 Setup complete!"
echo ""
echo "========================================"
echo "📝 Next Steps:"
echo "========================================"
echo ""
echo "1️⃣  Start the backend server:"
echo "   cd backend"
echo "   python3 app.py"
echo ""
echo "2️⃣  Test the server (in a new terminal):"
echo "   curl http://localhost:5000/health"
echo ""
echo "3️⃣  (Optional) Add training data:"
echo "   - Add CT images to: data/images/train/"
echo "   - Add labels to: data/labels/train/"
echo "   - Run: python3 train.py train"
echo ""
echo "4️⃣  (Optional) Start React frontend:"
echo "   cd frontend"
echo "   npm install"
echo "   npm start"
echo ""
echo "========================================"
echo "📚 Documentation:"
echo "========================================"
echo ""
echo "- Complete Setup: docs/COMPLETE_SETUP_GUIDE.md"
echo "- Training Guide: See training section in README.md"
echo "- API Docs: Test at http://localhost:5000/health"
echo ""
echo "🎉 Ready to detect kidney stones!"
echo ""
