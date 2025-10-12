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

  const classifyWithGemini = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/classify-image`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ image_data: base64 }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('Supabase function error:', res.status, text)
      throw new Error(`Supabase HTTP ${res.status}`)
    }

    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Gemini classification failed')
    return data
  }

  const processScan = async () => {
    if (!selectedImage) return
    setScanning(true)
    try {
      toast.info('Analyzing image using Gemini Vision...')
      const result = await classifyWithGemini(selectedImage)

      const main = result.predictions?.[0]
      const diseaseName = main?.class_name || 'Unknown'
      const confidence = main?.confidence ?? 0.85

      const formatted = {
        image_url: imagePreview!,
        disease_name: diseaseName,
        confidence,
        predictions: result.predictions || [],
        diagnosis: result.diagnosis || (diseaseName === 'Healthy' ? 'No signs of disease.' : ''),
        management:
          result.management ||
          (diseaseName === 'Healthy'
            ? 'Maintain good watering and spacing.'
            : 'Remove affected parts and apply neem/copper-based fungicide.'),
        postcare:
          result.postcare ||
          (diseaseName === 'Healthy'
            ? 'Check weekly for changes.'
            : 'Monitor for 2–3 weeks and repeat treatment if symptoms persist.'),
        advice:
          result.advice ||
          (diseaseName === 'Healthy'
            ? 'Your plant is healthy. Keep consistent sunlight and watering.'
            : 'Avoid overwatering and improve air circulation.'),
        explanation: result.explanation || '',
      }

      setScanResult(formatted)
      setShowResult(true)

      addScan({
        id: Date.now().toString(),
        image_url: imagePreview!,
        disease_name: diseaseName,
        confidence,
        created_at: new Date().toISOString(),
        result: {
          disease_id: diseaseName !== 'Healthy' ? diseaseName.toLowerCase().replace(/\s+/g, '_') : null,
          stage: diseaseName === 'Healthy' ? null : 2,
          parts: diseaseName === 'Healthy' ? {} : { leaves: 0.7, stems: 0.3 },
          explanation: formatted.explanation,
          advice: formatted.advice,
          postcare: formatted.postcare,
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

  const resetScan = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setScanResult(null)
    setShowResult(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="main-content">
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
              <Card>
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="font-semibold text-lg">Ready to Scan</h2>
                  <p className="text-sm text-muted-foreground">Take a clear photo or upload from your gallery</p>
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

              <div className="space-y-3">
                <Button size="lg" className="w-full h-14" onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="h-5 w-5 mr-2" />
                  Take Photo
                </Button>
                <Button variant="outline" size="lg" className="w-full h-14" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-5 w-5 mr-2" />
                  Upload from Gallery
                </Button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <Image src={imagePreview!} alt="Selected plant" fill className="object-cover" />
                    <div className="absolute inset-4 border-2 border-primary/50 border-dashed rounded-lg pointer-events-none" />
                  </div>
                  <div className="text-center mt-4">
                    <h3 className="font-semibold">Image Selected</h3>
                    <p className="text-sm text-muted-foreground">{selectedImage?.name || 'Captured image'}</p>
                  </div>
                </CardContent>
              </Card>

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
