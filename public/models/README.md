# ONNX Models Directory

This directory should contain your trained ONNX models for plant disease detection.

## Expected Model File
- `plant-disease-model.onnx` - Main plant disease classification model

## Model Requirements
- Input: 224x224 RGB image tensor
- Output: Probability distribution over disease classes
- Format: ONNX format for web compatibility

## Training Data Sources
The models should be trained on datasets from:
- PlantVillage dataset
- PlantDoc dataset
- Custom field data for improved accuracy

## Model Classes
The model should classify plants into categories such as:
- Healthy
- Early Blight
- Late Blight
- Bacterial Spot
- Powdery Mildew
- Mosaic Virus
- Leaf Scorch
- Rust
- Black Rot
- Anthracnose

Place your trained ONNX model file in this directory for the app to function properly.