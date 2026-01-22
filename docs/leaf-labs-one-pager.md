# Leaf Labs — Technical One‑Pager

A concise technical overview of components and high‑level architecture for the Leaf Labs plant disease detection app.

## Core Components

- **Frontend**: Next.js (App Router), TypeScript, TailwindCSS, shadcn/ui
- **State**: Zustand for scans, stats, and user session cache
- **AI Inference**: ONNX Runtime Web (client) with server fallback (Google Gemini)
- **Backend**: Supabase — Auth, Postgres, Storage, Edge Functions
- **Storage**: Supabase Storage (uploaded images), CDN/signed URLs
- **Third‑party**: Unsplash proxy (server) for images

## Database (summary)

- `scans`: id, user_id, image_url, model_version, confidence, status, created_at
- `scan_results`: id, scan_id, disease_id, parts(jsonb), explanation, advice, postcare, metadata(jsonb), created_at
- `diseases`: id, name, type, short_desc, long_desc, thumbnail_url
- RLS: clients may insert their own scans; service role writes scan_results & upserts diseases

## Data Flow — High Level

1. User captures/uploads image in browser.
2. Client runs ONNX inference (fast path). If confident, show modal; otherwise call server classify.
3. Client inserts a `scans` row (RLS allows owner insert) with image_url.
4. Client calls `/functions/save-scan-result` with user token; server validates and inserts `scan_results` using service role and upserts `diseases`.
5. Provider hydrates scan history from DB (scans + scan_results.metadata) and reconstitutes the modal view for history.

## Key Design Decisions

- Persist full modal payload in `scan_results.metadata` (jsonb) so history reproduces exact UI.
- Minimize client permissions: client inserts scans only; server uses service role for sensitive writes.
- Unsplash proxy on server to keep API key secret and persist chosen thumbnails.
- Hydration tolerant to schema changes (attempt metadata select, fallback if absent).

---

Generated file: `docs/leaf-labs-one-pager.md`
