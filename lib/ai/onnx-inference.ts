// NOTE: We intentionally do NOT import 'onnxruntime-web' here.
// We lazy-load the UMD script from /onnx/ort.min.js at runtime and use window.ort.
// Make sure ORT runtime files are in /public/onnx.

declare global {
  interface Window {
    ort?: any;
  }
}

interface InferenceResult {
  predictions: Array<{
    class_name: string
    confidence: number
  }>
  success: boolean
  error?: string
}

let _ortLoadPromise: Promise<any> | null = null

function loadOrtScript(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('ONNX runtime must run in the browser'))
  }
  if (window.ort) return Promise.resolve(window.ort)
  if (_ortLoadPromise) return _ortLoadPromise

  _ortLoadPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/onnx/ort.min.js'
    s.async = true
    s.onload = () => {
      if (!window.ort) {
        reject(new Error('ORT script loaded but window.ort is undefined'))
        return
      }
      // Configure ORT runtime to use our self-hosted assets,
      // and avoid cross-origin isolation requirements.
      window.ort.env.wasm.wasmPaths = '/onnx/'
      window.ort.env.wasm.numThreads = 1
      window.ort.env.wasm.simd = false
      resolve(window.ort)
    }
    s.onerror = () => reject(new Error('Failed to load /onnx/ort.min.js'))
    document.head.appendChild(s)
  })

  return _ortLoadPromise
}

function softmax(logits: Float32Array | number[]): number[] {
  const arr = Array.from(logits)
  const m = Math.max(...arr)
  const exps = arr.map(v => Math.exp(v - m))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map(v => v / sum)
}

class ONNXInferenceEngine {
  private session: any | null = null
  private modelLoaded = false

  async loadModel(modelPath: string = '/models/plant-disease-model.onnx'): Promise<boolean> {
    try {
      const ort = await loadOrtScript()
      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm'],
      })
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
        // Resize to model input size (224x224)
        const W = 224, H = 224
        canvas.width = W
        canvas.height = H
        ctx.drawImage(img, 0, 0, W, H)
        
        const imageData = ctx.getImageData(0, 0, W, H)
        const pixels = imageData.data
        
        // ImageNet normalization, CHW
        const input = new Float32Array(3 * W * H)
        const mean = [0.485, 0.456, 0.406]
        const std  = [0.229, 0.224, 0.225]
        
        for (let i = 0; i < W * H; i++) {
          const r = pixels[i * 4] / 255.0
          const g = pixels[i * 4 + 1] / 255.0
          const b = pixels[i * 4 + 2] / 255.0
          
          input[i]               = (r - mean[0]) / std[0] // R
          input[W * H + i]       = (g - mean[1]) / std[1] // G
          input[2 * W * H + i]   = (b - mean[2]) / std[2] // B
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

      const ort = await loadOrtScript()
      const inputTensor = await this.preprocessImage(imageFile)
      const tensor = new ort.Tensor('float32', inputTensor, [1, 3, 224, 224])
      
      const results = await this.session!.run({ input: tensor })
      // Try common output names; otherwise fall back to the first output
      const outTensor: any =
        (results as any).logits ??
        (results as any).output ??
        (results as any)[Object.keys(results)[0]]

      if (!outTensor?.data) {
        return { success: false, error: 'Invalid model output', predictions: [] }
      }

      const probs = softmax(outTensor.data as Float32Array)

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
      
      const predictions = probs
        .map((p, index) => ({
          class_name: classNames[index] || `Disease ${index}`,
          confidence: Math.max(0, Math.min(1, p))
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
