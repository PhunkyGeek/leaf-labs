'use client'

import { create } from 'zustand'

interface Scan {
  id: string
  image_url: string
  disease_name: string | null
  confidence: number
  created_at: string
  result?: {
    disease_id: string | null
    stage: number | null
    parts: Record<string, number>
    explanation: string
    advice: string
    postcare: string
  }
}

interface Disease {
  id: string
  name: string
  type: 'fungal' | 'bacterial' | 'viral'
  short_desc: string
  long_desc: string
  thumbnail_url: string
  tips: Record<string, any>
}

interface AppState {
  scans: Scan[]
  diseases: Disease[]
  stats: {
    plantsScanned: number
    diseasesDetected: number
    plantHealthIndex: number
    healthHistory: Array<{ month: string; value: number }>
  }
  lastSynced: Date | null
  setScans: (scans: Scan[]) => void
  addScan: (scan: Scan) => void
  setDiseases: (diseases: Disease[]) => void
  setStats: (stats: Partial<AppState['stats']>) => void
  setLastSynced: (date: Date) => void
}

export const useAppStore = create<AppState>((set) => ({
  scans: [],
  diseases: [],
  stats: {
    plantsScanned: 0,
    diseasesDetected: 0,
    plantHealthIndex: 85,
    healthHistory: [
      { month: 'Week 1', value: 82 },
      { month: 'Week 2', value: 78 },
      { month: 'Week 3', value: 85 },
      { month: 'Week 4', value: 85 },
    ]
  },
  lastSynced: null,
  setScans: (scans) => set({ scans }),
  addScan: (scan) => set((state) => ({ 
    scans: [scan, ...state.scans],
    stats: { 
      ...state.stats, 
      plantsScanned: state.stats.plantsScanned + 1 
    }
  })),
  setDiseases: (diseases) => set({ diseases }),
  setStats: (newStats) => set((state) => ({ 
    stats: { ...state.stats, ...newStats } 
  })),
  setLastSynced: (date) => set({ lastSynced: date }),
}))