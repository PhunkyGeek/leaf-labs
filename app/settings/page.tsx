'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAppStore } from '@/lib/stores/app-store'
import { createClient } from '@/lib/supabase/client'
import { BottomNav } from '@/components/ui/bottom-nav'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Moon, 
  Sun, 
  Database, 
  Smartphone, 
  Bell, 
  Globe, 
  Info, 
  FileText, 
  Shield, 
  LogOut, 
  RefreshCw,
  ChevronRight 
} from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const { lastSynced, setLastSynced } = useAppStore()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const supabase = createClient()
  
  const [syncing, setSyncing] = useState(false)
  const [notifications, setNotifications] = useState(true)

  if (!user) {
    router.push('/auth')
    return null
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      router.push('/auth')
      toast.success('Signed out successfully')
    } catch (error: any) {
      toast.error('Failed to sign out')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const now = new Date()
      setLastSynced(now)
      toast.success('Data synced successfully')
    } catch (error) {
      toast.error('Sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
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
            <h1 className="font-semibold">Settings</h1>
            <div></div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <div>
                    <div className="font-medium">Theme</div>
                    <div className="text-sm text-muted-foreground">
                      {theme === 'dark' ? 'Dark' : 'Light'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Sync Data</div>
                  <div className="text-sm text-muted-foreground">
                    {lastSynced 
                      ? `Last synced ${lastSynced.toLocaleString()}`
                      : 'Not yet synced'
                    }
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Sync Now'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Language</div>
                    <div className="text-sm text-muted-foreground">English</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      {notifications ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Version</div>
                  <div className="text-sm text-muted-foreground">1.2.5</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Terms of Service</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Privacy Policy</div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="font-medium">{user.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.user_metadata?.name || 'User'}
                  </div>
                </div>
                
                <Button
                  variant="destructive"
                  onClick={handleSignOut}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}