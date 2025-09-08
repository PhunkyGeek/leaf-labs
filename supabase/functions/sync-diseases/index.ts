// Make this file a module and avoid cross-file name collisions (e.g., corsHeaders)
export {};

// NOTE: VS Code/tsc (Node) can't resolve Deno's `npm:` specifier.
// We keep it for runtime correctness and silence the local type error.
// @ts-ignore -- resolved by Deno at runtime
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update last synced timestamp
    const metaIdRes = await supabase.from('meta').select('id').single();
    const metaId = metaIdRes.data?.id;

    const { error: updateError } = await supabase
      .from('meta')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', metaId ?? '');

    if (updateError) {
      throw updateError;
    }

    // You could add logic here to sync with external disease databases
    // or update disease information from remote sources
    
    const { data: diseases, error: diseasesError } = await supabase
      .from('diseases')
      .select('*')
      .order('created_at', { ascending: false });

    if (diseasesError) {
      throw diseasesError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        diseases: diseases || [],
        synced_at: new Date().toISOString(),
        message: 'Disease database synced successfully'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        diseases: []
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
