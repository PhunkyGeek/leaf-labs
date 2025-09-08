'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAppStore } from '@/lib/stores/app-store'
import { BottomNav } from '@/components/ui/bottom-nav'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { Camera, Library, MessageCircle, Settings, Scan, Activity, AlertTriangle, TrendingUp } from 'lucide-react'
import Image from 'next/image'

export default function HomePage() {
  const { user, loading } = useAuthStore()
  const { stats, scans } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) return null

  const userName = user.user_metadata?.name?.split(' ')[0] || 'User'
  
  const quickActions = [
    { icon: Scan, label: 'Scan Plant', href: '/scan', color: 'bg-green-500' },
    { icon: Library, label: 'Disease Library', href: '/library', color: 'bg-blue-500' },
    { icon: MessageCircle, label: 'AI Assistant', href: '/chatbot', color: 'bg-purple-500' },
    { icon: Settings, label: 'Settings', href: '/settings', color: 'bg-gray-500' },
  ]

  const recentScans = scans.slice(0, 5)

  return (
    <div className="min-h-screen bg-background">
      <div className="main-content">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>
            <p className="text-muted-foreground">
              Keep track of your plant health and get AI-powered insights
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                className="h-20 flex flex-col gap-2"
                onClick={() => router.push(action.href)}
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium">{action.label}</span>
              </Button>
            ))}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Plants Scanned"
              value={stats.plantsScanned}
              icon={Scan}
            />
            <StatCard
              title="Diseases Detected"
              value={stats.diseasesDetected}
              icon={AlertTriangle}
            />
          </div>

          {/* Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Plant Health Index
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{stats.plantHealthIndex}</div>
                  <div className="flex items-center text-green-600 text-sm">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +5%
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Last 30 Days</div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.healthHistory}>
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Scans */}
          {recentScans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentScans.map((scan) => (
                    <div key={scan.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                        <Image
                          src={scan.image_url}
                          alt="Plant scan"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {scan.disease_name || 'Healthy Plant'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(scan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(scan.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Welcome Message for New Users */}
          {recentScans.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Start Your First Scan</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Capture or upload a photo of your plant to get started with AI-powered disease detection
                    </p>
                  </div>
                  <Button onClick={() => router.push('/scan')} className="w-full">
                    Scan Plant Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <BottomNav />
    </div>
  )
}