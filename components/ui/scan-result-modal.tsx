'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, CheckCircle, Leaf, Droplets, Sun, Thermometer } from 'lucide-react'
import Image from 'next/image'

interface ScanResult {
  image_url: string
  disease_name: string | null
  confidence: number
  predictions: Array<{
    class_name: string
    confidence: number
  }>
  stage?: number
  parts?: Record<string, number>
  explanation: string
  advice: string
  postcare: string
}

interface ScanResultModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: ScanResult | null
}

export function ScanResultModal({ open, onOpenChange, result }: ScanResultModalProps) {
  if (!result) return null

  const isHealthy = result.disease_name === 'Healthy' || result.disease_name === null
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isHealthy ? 'No Disease Detected' : 'Disease Detected'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative aspect-square rounded-lg overflow-hidden">
            <Image
              src={result.image_url}
              alt="Plant scan"
              fill
              className="object-cover"
            />
          </div>

          {/* Result Status */}
          <div className="text-center">
            {isHealthy ? (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle size={24} />
                <span className="font-semibold">Plant appears healthy!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-orange-600">
                <AlertTriangle size={24} />
                <span className="font-semibold">{result.disease_name}</span>
              </div>
            )}
          </div>

          {/* Top Predictions */}
          {result.predictions && result.predictions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Top Predictions</h3>
              {result.predictions.slice(0, 3).map((pred, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{pred.class_name}</span>
                  <Badge variant={index === 0 ? 'default' : 'secondary'}>
                    {Math.round(pred.confidence * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Disease Stage */}
          {!isHealthy && result.stage && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Disease Progression</h3>
              <div className="text-center">
                <div className="text-lg font-bold">Stage {result.stage}</div>
                <div className="text-sm text-muted-foreground">Current</div>
                <Progress value={(result.stage / 3) * 100} className="mt-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Stage 1</span>
                  <span>Stage 2</span>
                  <span>Stage 3</span>
                </div>
              </div>
            </div>
          )}

          {/* Affected Parts */}
          {!isHealthy && result.parts && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Affected Plant Parts</h3>
              {Object.entries(result.parts).map(([part, percentage]) => (
                <div key={part} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{part}</span>
                    <span>{Math.round(percentage * 100)}%</span>
                  </div>
                  <Progress value={percentage * 100} />
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Explanation */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">
              {isHealthy ? 'Assessment' : 'About This Disease'}
            </h3>
            <p className="text-sm text-muted-foreground">{result.explanation}</p>
          </div>

          {/* Advice */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">
              {isHealthy ? 'Maintenance Tips' : 'Expert Advice'}
            </h3>
            <p className="text-sm text-muted-foreground">{result.advice}</p>
          </div>

          {/* Maintenance Tips for Healthy Plants */}
          {isHealthy && (
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Droplets className="text-blue-600" size={20} />
                <div>
                  <p className="font-medium text-sm">Watering</p>
                  <p className="text-xs text-muted-foreground">Water thoroughly when top soil feels dry</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Sun className="text-yellow-600" size={20} />
                <div>
                  <p className="font-medium text-sm">Light</p>
                  <p className="text-xs text-muted-foreground">Provide bright, indirect light for optimal growth</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Thermometer className="text-red-600" size={20} />
                <div>
                  <p className="font-medium text-sm">Temperature</p>
                  <p className="text-xs text-muted-foreground">Maintain temperature between 65-75°F (18-24°C)</p>
                </div>
              </div>
            </div>
          )}

          {/* Post-care (for diseases) */}
          {!isHealthy && result.postcare && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Post-Care Instructions</h3>
              <p className="text-sm text-muted-foreground">{result.postcare}</p>
            </div>
          )}

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}