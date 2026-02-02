#!/bin/bash
# Setup script for AI Detector model
# Run this once after cloning the repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(dirname "$SCRIPT_DIR")"
PUBLIC_DIR="$FRONTEND_DIR/public"

echo "🔧 Setting up AI Detector model..."

# Create directories
mkdir -p "$PUBLIC_DIR/models"
mkdir -p "$PUBLIC_DIR/onnx"

# Copy ONNX Runtime WASM files
echo "📦 Copying ONNX Runtime files..."
if [ -d "$FRONTEND_DIR/../node_modules/onnxruntime-web/dist" ]; then
    cp "$FRONTEND_DIR/../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded"*.wasm "$PUBLIC_DIR/onnx/"
    cp "$FRONTEND_DIR/../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded"*.mjs "$PUBLIC_DIR/onnx/"
    cp "$FRONTEND_DIR/../node_modules/onnxruntime-web/dist/ort.min.js" "$PUBLIC_DIR/onnx/"
elif [ -d "$FRONTEND_DIR/node_modules/onnxruntime-web/dist" ]; then
    cp "$FRONTEND_DIR/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded"*.wasm "$PUBLIC_DIR/onnx/"
    cp "$FRONTEND_DIR/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded"*.mjs "$PUBLIC_DIR/onnx/"
    cp "$FRONTEND_DIR/node_modules/onnxruntime-web/dist/ort.min.js" "$PUBLIC_DIR/onnx/"
else
    echo "❌ Error: onnxruntime-web not found. Run 'npm install' first."
    exit 1
fi
echo "✅ ONNX Runtime files copied"

# Check if model exists
if [ -f "$PUBLIC_DIR/models/ai-detector-int8.onnx" ]; then
    echo "✅ AI model already exists"
    exit 0
fi

# Download and convert model
echo "🤖 Downloading and converting AI detection model..."
echo "   This requires Python with optimum and onnxruntime packages."

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found. Please install Python 3."
    exit 1
fi

# Install required packages
echo "📦 Installing Python dependencies..."
pip3 install -q optimum[exporters] onnxruntime

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Export model to ONNX
echo "🔄 Exporting model to ONNX format (this may take a few minutes)..."
python3 -c "
from optimum.exporters.onnx import main_export
main_export('umm-maybe/AI-image-detector', '$TEMP_DIR/model', task='image-classification')
"

# Quantize model
echo "🗜️ Quantizing model to INT8..."
python3 -c "
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic(
    '$TEMP_DIR/model/model.onnx',
    '$PUBLIC_DIR/models/ai-detector-int8.onnx',
    weight_type=QuantType.QUInt8
)
"

echo ""
echo "✅ AI Detector setup complete!"
echo "   Model: $PUBLIC_DIR/models/ai-detector-int8.onnx"
echo "   ONNX Runtime: $PUBLIC_DIR/onnx/"
