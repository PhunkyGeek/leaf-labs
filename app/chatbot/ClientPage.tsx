'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAppStore } from '@/lib/stores/app-store'
import { BottomNav } from '@/components/ui/bottom-nav'
import { ScanResultModal } from '@/components/ui/scan-result-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Upload, ArrowLeft, Loader2 } from 'lucide-react'
import { onnxEngine } from '@/lib/ai/onnx-inference'
import { toast } from 'sonner'
import Image from 'next/image'

export default function ScanPage() {
  const { user } = useAuthStore()
  const { addScan } = useAppStore()
  const router = useRouter()
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  if (!user) {
    router.push('/auth')
    return null
  }

  const handleImageSelect = (file: File) => {
    setSelectedImage(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file)
  }

  const processScan = async () => {
    if (!selectedImage) return
    setScanning(true)
    
    try {
      // Try GPT-5-mini classification first through your Edge Function
      toast.info('Analyzing image with AI (GPT-5-mini)...')
      let result = await callOpenAIClassification(selectedImage)

      // Fallback to ONNX if OpenAI fails
      if (!result.success || !result.predictions?.length) {
        toast.info('Falling back to local ONNX model...')
        result = await onnxEngine.predict(selectedImage)
      }

      if (!result.success) throw new Error(result.error || 'AI classification failed.')

      const mainPrediction = result.predictions[0]
      const confidence = mainPrediction?.confidence ?? 0.85
      const diseaseName = mainPrediction?.class_name || 'Unknown'

      const formattedResult = {
        image_url: imagePreview!,
        disease_name: diseaseName,
        confidence,
        predictions: result.predictions,
        explanation:
          diseaseName === 'Healthy'
            ? 'Your plant appears healthy. Keep up the good care!'
            : 'This disease affects plant leaves and stems, reducing vitality.',
        advice:
          result.advice ||
          (diseaseName === 'Healthy'
            ? 'Continue proper watering, sunlight, and soil management.'
            : 'Remove affected areas, apply organic fungicide or neem oil, and ensure good airflow.'),
        postcare:
          diseaseName === 'Healthy'
            ? ''
            : 'Monitor the plant for 2–3 weeks and reapply treatment if symptoms persist.',
      }

      setScanResult(formattedResult)
      setShowResult(true)

      addScan({
        id: Date.now().toString(),
        image_url: imagePreview!,
        disease_name: diseaseName,
        confidence,
        created_at: new Date().toISOString(),
        result: {
          disease_id:
            diseaseName !== 'Healthy'
              ? diseaseName.toLowerCase().replace(/\s+/g, '_')
              : null,
          stage: diseaseName === 'Healthy' ? null : 2,
          parts:
            diseaseName === 'Healthy'
              ? {}
              : { leaves: 0.7, stems: 0.3, fruits: 0.1 },
          explanation: formattedResult.explanation,
          advice: formattedResult.advice,
          postcare: formattedResult.postcare,
        },
      })

      toast.success('Scan completed successfully!')
    } catch (error) {
      console.error('Scan error:', error)
      toast.error('Failed to analyze the image. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  const callOpenAIClassification = async (imageFile: File): Promise<any> => {
    try {
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(imageFile)
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/classify-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            image_data: base64Image,
            model_version: 'gpt-5-mini',
          }),
        }
      )

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (!data.success) throw new Error(data.error || 'Classification failed')

      return {
        success: true,
        predictions: data.predictions,
        advice: data.advice || '',
      }
    } catch (error) {
      console.error('OpenAI classification error:', error)
      return { success: false, predictions: [] }
    }
  }

  const resetScan = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setScanResult(null)
    setShowResult(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="main-content">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="font-semibold">Plant Scanner</h1>
            <div></div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!selectedImage ? (
            <>
              {/* Instructions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">Ready to Scan</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Take a clear photo of the affected plant or upload from your gallery
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scanning Tips */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Tips for Best Results</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>Ensure good lighting and focus on the affected area</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>Include the entire leaf or affected plant part</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>Avoid blurry or dark images for accurate results</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span>Hold steady and capture from about 6–12 inches away</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button size="lg" className="w-full h-14" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="h-5 w-5 mr-2" />
                  Take Photo
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload from Gallery
                </Button>
              </div>

              {/* Hidden Inputs */}
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </>
          ) : (
            <>
              {/* Image Preview */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <Image src={imagePreview!} alt="Selected plant" fill className="object-cover" />
                      <div className="absolute inset-4 border-2 border-primary/50 border-dashed rounded-lg pointer-events-none">
                        <div className="absolute -top-6 left-0 text-xs text-primary font-medium bg-background px-2 py-1 rounded">
                          Focus Area
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <h3 className="font-semibold">Image Selected</h3>
                      <p className="text-sm text-muted-foreground">{selectedImage?.name || 'Captured image'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Buttons */}
              <div className="space-y-3">
                <Button size="lg" className="w-full h-14" onClick={processScan} disabled={scanning}>
                  {scanning ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Plant'
                  )}
                </Button>
                
                <Button variant="outline" size="lg" className="w-full h-14" onClick={resetScan} disabled={scanning}>
                  Choose Different Image
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <BottomNav />
      
      <ScanResultModal open={showResult} onOpenChange={setShowResult} result={scanResult} />
    </div>
  )
}
