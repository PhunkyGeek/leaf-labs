'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAppStore } from '@/lib/stores/app-store'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Search, Clock, AlertTriangle, Battery as Bacteria, Brush as Virus, Zap } from 'lucide-react'
import Image from 'next/image'

const mockDiseases = [
  {
    id: 'early_blight',
    name: 'Early Blight',
    type: 'fungal' as const,
    short_desc: 'White, powdery spots on leaves and stems, often caused by high humidity and poor air circulation.',
    long_desc: 'Early blight is a common fungal disease that affects tomato plants, causing dark lesions with concentric rings on leaves. The disease typically starts on lower, older leaves and progresses upward. It thrives in warm, humid conditions and can significantly reduce plant yield if left untreated.',
    thumbnail_url: 'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg?auto=compress&cs=tinysrgb&w=400',
    tips: {
      prevention: ['Ensure good air circulation', 'Water at soil level', 'Apply mulch to prevent soil splash'],
      treatment: ['Remove affected leaves', 'Apply fungicide sprays', 'Improve plant spacing']
    }
  },
  {
    id: 'bacterial_spot',
    name: 'Bacterial Spot',
    type: 'bacterial' as const,
    short_desc: 'Dark, water-soaked lesions on leaves and stems, often caused by wet conditions and poor sanitation.',
    long_desc: 'Bacterial spot is caused by several Xanthomonas species and creates small, dark spots with yellow halos on leaves. The disease spreads rapidly in warm, wet conditions and can affect both foliage and fruit. Proper sanitation and copper-based treatments are essential for management.',
    thumbnail_url: 'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=400',
    tips: {
      prevention: ['Use disease-free seeds', 'Practice crop rotation', 'Avoid overhead watering'],
      treatment: ['Apply copper-based fungicides', 'Remove infected plant debris', 'Improve drainage']
    }
  },
  {
    id: 'mosaic_virus',
    name: 'Mosaic Virus',
    type: 'viral' as const,
    short_desc: 'Mottled or streaked patterns on leaves, often caused by insect vectors or contaminated tools.',
    long_desc: 'Mosaic viruses cause characteristic mottled patterns on plant leaves, with alternating light and dark green areas. These viruses are typically spread by aphids, thrips, or contaminated tools. There is no cure for viral infections, so prevention and vector control are crucial.',
    thumbnail_url: 'https://images.pexels.com/photos/1379636/pexels-photo-1379636.jpeg?auto=compress&cs=tinysrgb&w=400',
    tips: {
      prevention: ['Control insect vectors', 'Use virus-free planting material', 'Sanitize tools regularly'],
      treatment: ['Remove infected plants', 'Control aphid populations', 'No chemical cure available']
    }
  }
]

export default function LibraryPage() {
  const { user } = useAuthStore()
  const { scans } = useAppStore()
  const router = useRouter()
  
  const [selectedDisease, setSelectedDisease] = useState<typeof mockDiseases[0] | null>(null)
  const [selectedScan, setSelectedScan] = useState<any>(null)

  if (!user) {
    router.push('/auth')
    return null
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fungal':
        return <Zap className="h-4 w-4" />
      case 'bacterial':
        return <Bacteria className="h-4 w-4" />
      case 'viral':
        return <Virus className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fungal':
        return 'bg-orange-500'
      case 'bacterial':
        return 'bg-red-500'
      case 'viral':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="main-content">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="font-semibold">Library</h1>
            <Button variant="ghost" size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="history" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">Scan History</TabsTrigger>
              <TabsTrigger value="diseases">Disease Library</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              {scans.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Clock className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">No Scans Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Start scanning your plants to build your history
                        </p>
                      </div>
                      <Button onClick={() => router.push('/scan')}>
                        Start Scanning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {scans.map((scan) => (
                    <Card key={scan.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div 
                          className="flex items-center gap-3"
                          onClick={() => setSelectedScan(scan)}
                        >
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={scan.image_url}
                              alt="Plant scan"
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">
                                {scan.disease_name || 'Healthy Plant'}
                              </h3>
                              <Badge variant={scan.disease_name ? 'destructive' : 'success'}>
                                {Math.round(scan.confidence * 100)}%
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {new Date(scan.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className={`w-3 h-3 rounded-full ${scan.disease_name ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="diseases" className="space-y-4">
              {/* Filter Tabs */}
              <Tabs defaultValue="all" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="bacterial">Bacterial</TabsTrigger>
                  <TabsTrigger value="fungal">Fungal</TabsTrigger>
                  <TabsTrigger value="viral">Viral</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Common Diseases</h3>
                    <div className="space-y-3">
                      {mockDiseases.map((disease) => (
                        <Card key={disease.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div 
                              className="flex items-center gap-3"
                              onClick={() => setSelectedDisease(disease)}
                            >
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                                <Image
                                  src={disease.thumbnail_url}
                                  alt={disease.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{disease.name}</h3>
                                  <Badge variant="outline" className={`${getTypeColor(disease.type)} text-white border-none`}>
                                    {getTypeIcon(disease.type)}
                                    <span className="ml-1 capitalize">{disease.type}</span>
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {disease.short_desc}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {['bacterial', 'fungal', 'viral'].map((type) => (
                  <TabsContent key={type} value={type}>
                    <div className="space-y-3">
                      {mockDiseases
                        .filter((disease) => disease.type === type)
                        .map((disease) => (
                          <Card key={disease.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div 
                                className="flex items-center gap-3"
                                onClick={() => setSelectedDisease(disease)}
                              >
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                                  <Image
                                    src={disease.thumbnail_url}
                                    alt={disease.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold mb-1">{disease.name}</h3>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {disease.short_desc}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <BottomNav />

      {/* Disease Detail Modal */}
      <Dialog open={!!selectedDisease} onOpenChange={() => setSelectedDisease(null)}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          {selectedDisease && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedDisease.name}
                  <Badge variant="outline" className={`${getTypeColor(selectedDisease.type)} text-white border-none`}>
                    {getTypeIcon(selectedDisease.type)}
                    <span className="ml-1 capitalize">{selectedDisease.type}</span>
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={selectedDisease.thumbnail_url}
                    alt={selectedDisease.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Description</h3>
                  <p className="text-sm text-muted-foreground">{selectedDisease.long_desc}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Prevention</h3>
                  <ul className="space-y-1">
                    {selectedDisease.tips.prevention.map((tip, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Treatment</h3>
                  <ul className="space-y-1">
                    {selectedDisease.tips.treatment.map((tip, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button onClick={() => setSelectedDisease(null)} className="w-full">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Scan Detail Modal */}
      <Dialog open={!!selectedScan} onOpenChange={() => setSelectedScan(null)}>
        <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
          {selectedScan && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedScan.disease_name || 'Healthy Plant'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={selectedScan.image_url}
                    alt="Scan result"
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Confidence</span>
                  <Badge variant={selectedScan.disease_name ? 'destructive' : 'success'}>
                    {Math.round(selectedScan.confidence * 100)}%
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Scanned</span>
                  <span className="text-sm">
                    {new Date(selectedScan.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {selectedScan.result && (
                  <>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Analysis</h3>
                      <p className="text-sm text-muted-foreground">{selectedScan.result.explanation}</p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Recommendations</h3>
                      <p className="text-sm text-muted-foreground">{selectedScan.result.advice}</p>
                    </div>
                  </>
                )}

                <Button onClick={() => setSelectedScan(null)} className="w-full">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}