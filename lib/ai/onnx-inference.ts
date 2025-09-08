import * as ort from 'onnxruntime-web'

interface InferenceResult {
  predictions: Array<{
    class_name: string
    confidence: number
  }>
  success: boolean
  error?: string
}

class ONNXInferenceEngine {
  private session: ort.InferenceSession | null = null
  private modelLoaded = false

  async loadModel(modelPath: string = '/models/plant-disease-model.onnx'): Promise<boolean> {
    try {
      ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/'
      this.session = await ort.InferenceSession.create(modelPath)
      this.modelLoaded = true
      return true
    } catch (error) {
      console.error('Failed to load ONNX model:', error)
      return false
    }
  }

  async preprocessImage(imageFile: File): Promise<Float32Array> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()
      
      img.onload = () => {
        // Resize to model input size (224x224 for most plant disease models)
        canvas.width = 224
        canvas.height = 224
        ctx.drawImage(img, 0, 0, 224, 224)
        
        const imageData = ctx.getImageData(0, 0, 224, 224)
        const pixels = imageData.data
        
        // Normalize to [-1, 1] range and convert to CHW format
        const input = new Float32Array(3 * 224 * 224)
        
        for (let i = 0; i < 224 * 224; i++) {
          const r = pixels[i * 4] / 255.0
          const g = pixels[i * 4 + 1] / 255.0
          const b = pixels[i * 4 + 2] / 255.0
          
          // Normalize using ImageNet means and stds
          input[i] = (r - 0.485) / 0.229
          input[224 * 224 + i] = (g - 0.456) / 0.224
          input[2 * 224 * 224 + i] = (b - 0.406) / 0.225
        }
        
        resolve(input)
      }
      
      img.src = URL.createObjectURL(imageFile)
    })
  }

  async predict(imageFile: File): Promise<InferenceResult> {
    try {
      if (!this.modelLoaded || !this.session) {
        const loaded = await this.loadModel()
        if (!loaded) {
          return {
            success: false,
            error: 'Model not loaded',
            predictions: []
          }
        }
      }

      const inputTensor = await this.preprocessImage(imageFile)
      const tensor = new ort.Tensor('float32', inputTensor, [1, 3, 224, 224])
      
      const results = await this.session!.run({ input: tensor })
      const output = results.output.data as Float32Array
      
      // Get top 3 predictions
      const classNames = [
        'Healthy',
        'Early Blight',
        'Late Blight',
        'Bacterial Spot',
        'Powdery Mildew',
        'Mosaic Virus',
        'Leaf Scorch',
        'Rust',
        'Black Rot',
        'Anthracnose'
      ]
      
      const predictions = Array.from(output)
        .map((confidence, index) => ({
          class_name: classNames[index] || `Disease ${index}`,
          confidence: Math.max(0, Math.min(1, confidence))
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)

      return {
        success: true,
        predictions
      }
    } catch (error) {
      console.error('ONNX inference error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        predictions: []
      }
    }
  }
}

export const onnxEngine = new ONNXInferenceEngine()