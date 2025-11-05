'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAppStore } from '@/lib/stores/app-store'
import { useEffect } from 'react'

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore()
  const supabase = createClient()
  const { setScans, setStats, setLastSynced } = useAppStore()

  useEffect(() => {
    const hydrate = async (user: any) => {
      try {
        if (!user) {
          setScans([])
          setStats({ plantsScanned: 0, diseasesDetected: 0 })
          setLastSynced(null)
          return
        }

        // Try to select scan_results including `metadata` first (newer schema).
        // If the DB doesn't have that column yet, fall back to a safe select without metadata.
        let rows: any[] | null = null
        try {
          const first = await supabase
            .from('scans')
            .select(
              `id,image_url,confidence,created_at,status, scan_results(id, disease_id, stage, parts, explanation, advice, postcare, metadata, created_at)`
            )
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if ((first as any).error) {
            // try fallback without metadata
            const fallback = await supabase
              .from('scans')
              .select(
                `id,image_url,confidence,created_at,status, scan_results(id, disease_id, stage, parts, explanation, advice, postcare, created_at)`
              )
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })

            if ((fallback as any).error) {
              console.error('Failed to load user scans (fallback):', (fallback as any).error)
              return
            }

            rows = (fallback as any).data
          } else {
            rows = (first as any).data
          }
        } catch (err) {
          console.error('Failed to load user scans:', err)
          return
        }

        const scans = (rows || []).map((r: any) => {
          const sr = r.scan_results?.[0]
          const metadata = sr?.metadata || {};
          return {
            id: r.id,
            image_url: r.image_url,
            disease_name: (metadata?.disease_name || (sr?.disease_id as string)) ?? null,
            confidence: metadata?.confidence ?? (Number(r.confidence) || 0),
            created_at: r.created_at,
            result: sr
              ? {
                  disease_id: sr.disease_id,
                  stage: sr.stage,
                  parts: sr.parts || metadata?.predictions || {},
                  explanation: sr.explanation || metadata?.diagnosis || metadata?.explanation || '',
                  advice: sr.advice || metadata?.advice || '',
                  postcare: sr.postcare || metadata?.postcare || '',
                  diagnosis: metadata?.diagnosis || null,
                  management: metadata?.management || null,
                  confidence: metadata?.confidence ?? null,
                  image_url: metadata?.image_url || r.image_url || null,
                }
              : undefined,
          }
        })

        setScans(scans)

        // If any scans reference a non-persisted image (blob: or data:), try to fetch a replacement from Unsplash
        ;(async () => {
          try {
            const updated = [...scans]
            let changed = false
            for (let i = 0; i < updated.length; i++) {
              const s = updated[i]
              const url = s.image_url || ''
              if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
                // build a query from disease name or generic plant
                const q = s.disease_name && s.disease_name !== 'Healthy' ? `${s.disease_name} plant disease` : 'plant'
                try {
                  const resp = await fetch('/api/unsplash-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: q }),
                  })
                  if (resp.ok) {
                    const j = await resp.json()
                    if (j?.url) {
                      updated[i] = { ...s, image_url: j.url }
                      changed = true
                    }
                  }
                } catch (err) {
                  // ignore and continue
                }
                // small delay to avoid rate limits
                await new Promise((r) => setTimeout(r, 120))
              }
            }
            if (changed) setScans(updated)
          } catch (err) {
            console.error('Failed to fetch replacement images for scans:', err)
          }
        })()

        const plantsScanned = scans.length
        const diseasesDetected = scans.reduce(
          (acc, s) => acc + (s.disease_name && s.disease_name !== 'Healthy' ? 1 : 0),
          0
        )
        setStats({ plantsScanned, diseasesDetected })
        setLastSynced(new Date())
      } catch (err) {
        console.error('Error hydrating scans:', err)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null
      setUser(user)
      setLoading(false)
      hydrate(user)
    })

    // also run once on mount to pick up an existing session
    ;(async () => {
      try {
        const sessionResp: any = await supabase.auth.getSession()
        const user = sessionResp?.data?.session?.user ?? null
        setUser(user)
        setLoading(false)
        await hydrate(user)
      } catch (err) {
        console.error('Failed to initialize auth session:', err)
      }
    })()

    return () => subscription.unsubscribe()
  }, [supabase, setUser, setLoading])

  return <>{children}</>
}