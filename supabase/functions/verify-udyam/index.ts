declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock database of valid Udyam numbers and names for successful verification
// In a real scenario, this would call an external government API.
const mockUdyamDatabase: Record<string, string> = {
    'UDYAM-MH-18-0000001': 'Pioneer Engineering Works',
    'UDYAM-DL-07-0000002': 'Delhi Textile Solutions',
    'UDYAM-KA-29-0000003': 'Bangalore Tech Innovations',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { projectId, udyamNumber } = await req.json();
    if (!projectId || !udyamNumber) {
      throw new Error("Missing 'projectId' or 'udyamNumber' in request body.");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Simulate API call and validation against our mock database
    const verifiedName = mockUdyamDatabase[udyamNumber.toUpperCase()];

    if (!verifiedName) {
         return new Response(JSON.stringify({ 
             error: `UDYAM number ${udyamNumber} not found or is invalid.` 
        }), { 
             status: 404, 
             headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    // On successful verification, update the project in the database
    const { data: updatedProject, error: updateError } = await supabaseClient
      .from('projects')
      .update({ 
          has_udyam_check: true, 
          udyam_number: udyamNumber,
          // This demonstrates fetching data from the portal
          client_name: verifiedName, 
          updated_at: new Date().toISOString() 
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
        throw new Error(`Failed to update project: ${updateError.message}`);
    }

    return new Response(JSON.stringify({
      message: `Successfully verified: ${verifiedName}`,
      project: updatedProject,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
