// Save scan result using Supabase service role (server-side)

export {};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'Supabase service configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const body = await req.json().catch(() => ({}));
    const scan_id = body?.scan_id;
    const result = body?.result;

    if (!scan_id || !result) {
      return new Response(JSON.stringify({ success: false, error: 'Missing scan_id or result' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const authHeader = req.headers.get('authorization') || '';
    const userToken = authHeader.replace(/^Bearer\s*/i, '');
    if (!userToken) {
      return new Response(JSON.stringify({ success: false, error: 'Missing user token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate user token and get user info
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${userToken}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });

    if (!userResp.ok) {
      const txt = await userResp.text();
      console.error('Auth user lookup failed:', userResp.status, txt);
      return new Response(JSON.stringify({ success: false, error: 'Invalid user token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const userJson = await userResp.json();
    const userId = userJson?.id;
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'Unable to determine user id' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Fetch scan record to verify ownership
    const scanFetch = await fetch(
      `${SUPABASE_URL}/rest/v1/scans?id=eq.${scan_id}&select=user_id`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    if (!scanFetch.ok) {
      const txt = await scanFetch.text();
      console.error('Failed to fetch scan:', scanFetch.status, txt);
      return new Response(JSON.stringify({ success: false, error: 'Scan not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const scanRows = await scanFetch.json();
    const ownerId = scanRows?.[0]?.user_id;
    if (!ownerId) {
      return new Response(JSON.stringify({ success: false, error: 'Scan owner not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (ownerId !== userId) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Insert scan_results as service_role (bypasses RLS)
    const scanResultPayload = [
      {
        scan_id: scan_id,
        disease_id: result?.disease_name && result.disease_name !== 'Healthy' ? result.disease_name.toLowerCase().replace(/\s+/g, '_') : null,
        stage: result?.disease_name === 'Healthy' ? null : 2,
        parts: result?.predictions || {},
        explanation: result?.explanation || '',
        advice: result?.advice || '',
        postcare: result?.postcare || '',
        metadata: {
          disease_name: result?.disease_name || null,
          confidence: result?.confidence ?? null,
          diagnosis: result?.diagnosis || null,
          management: result?.management || null,
          image_url: result?.image_url || null,
          predictions: result?.predictions || [],
          created_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      },
    ];

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/scan_results`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(scanResultPayload),
    });

    if (!insertRes.ok) {
      const txt = await insertRes.text();
      console.error('Failed to insert scan_results:', insertRes.status, txt);
      return new Response(JSON.stringify({ success: false, error: 'Failed to save scan result' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Upsert disease into diseases table (service role)
    if (result?.disease_name && result.disease_name !== 'Healthy') {
      const diseaseBody = [
        {
          name: result.disease_name,
          type: 'fungal',
          short_desc: result.explanation || result.diagnosis || '',
          long_desc: result.diagnosis || result.management || result.explanation || '',
          thumbnail_url: result.image_url || '',
          tips: {},
          created_at: new Date().toISOString(),
        },
      ];

      // Use on_conflict=name to upsert by name
      const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/diseases?on_conflict=name`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(diseaseBody),
      });

      if (!upsertRes.ok) {
        const txt = await upsertRes.text();
        console.error('Failed to upsert disease:', upsertRes.status, txt);
        // Non-fatal: continue
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    console.error('save-scan-result error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
