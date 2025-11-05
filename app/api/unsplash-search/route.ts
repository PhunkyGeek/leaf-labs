import { NextResponse } from 'next/server'

type ReqBody = { query: string, disease?: any }

// Simple in-memory cache to avoid repeated calls during a single server run
const cache = new Map<string, string>()

export async function POST(req: Request) {
  try {
  const body: ReqBody = await req.json()
  const q = (body.query || '').trim()
  const disease = (body.disease || null)
    if (!q) return NextResponse.json({ ok: false, error: 'Missing query' }, { status: 400 })

    if (cache.has(q)) {
      return NextResponse.json({ ok: true, url: cache.get(q) })
    }

    const key = process.env.EXPO_PUBLIC_UNSPLASH_KEY || process.env.NEXT_PUBLIC_UNSPLASH_KEY || process.env.UNSPLASH_KEY
    if (!key) return NextResponse.json({ ok: false, error: 'Unsplash key not configured' }, { status: 500 })

    const params = new URLSearchParams({ query: q, per_page: '1', page: '1' })
    const resp = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`, {
      headers: {
        Authorization: `Client-ID ${key}`,
      },
    })

    if (!resp.ok) {
      const txt = await resp.text()
      return NextResponse.json({ ok: false, error: `Unsplash error: ${resp.status} ${txt}` }, { status: 502 })
    }

    const data = await resp.json()
    const first = data?.results?.[0]
    const url = first?.urls?.regular || first?.urls?.small || null
    if (!url) return NextResponse.json({ ok: false, error: 'No image found' }, { status: 404 })

    cache.set(q, url)

    // If caller provided disease metadata, persist the thumbnail_url into the diseases table
    // using Supabase service role to bypass RLS. This avoids runtime lookups later.
    try {
      if (disease && disease.name) {
        const SUPABASE_URL = process.env.SUPABASE_URL
        const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
          const payload = [
            {
              name: disease.name,
              type: disease.type || 'fungal',
              short_desc: disease.short_desc || '',
              long_desc: disease.long_desc || '',
              thumbnail_url: url,
              tips: disease.tips || {},
              created_at: new Date().toISOString(),
            },
          ]

          // Use on_conflict=name to upsert by disease name
          await fetch(`${SUPABASE_URL}/rest/v1/diseases?on_conflict=name`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify(payload),
          })
        }
      }
    } catch (err) {
      // Non-fatal; log server-side for debugging
      // eslint-disable-next-line no-console
      console.error('Failed to persist disease thumbnail:', err)
    }

    return NextResponse.json({ ok: true, url })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
