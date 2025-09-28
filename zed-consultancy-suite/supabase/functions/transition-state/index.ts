

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { projectStateMachine } from '../_shared/stateMachine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { project_id, next_state } = await req.json();
    if (!project_id || !next_state) {
      throw new Error("Missing 'project_id' or 'next_state' in request body.");
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch the current project state from the database
    const { data: project, error: fetchError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (fetchError) throw new Error(`Failed to fetch project: ${fetchError.message}`);
    if (!project) throw new Error(`Project with ID ${project_id} not found.`);

    const currentState = project.current_state;
    const stateDefinition = projectStateMachine[currentState];

    if (!stateDefinition) {
        throw new Error(`Invalid current state '${currentState}' found for project.`);
    }

    // 2. Check if the requested transition is valid
    const transition = stateDefinition.exitConditions.find(
      (condition) => condition.nextState === next_state
    );

    if (!transition) {
      return new Response(JSON.stringify({
        success: false,
        message: `Transition from '${currentState}' to '${next_state}' is not allowed.`,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Run all validation checks for this transition
    const validationFailures: string[] = [];
    for (const validation of transition.validations) {
      const result = validation(project);
      if (!result.valid) {
        validationFailures.push(result.message);
      }
    }

    if (validationFailures.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Validation checks failed. Cannot transition state.',
        errors: validationFailures,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. If all validations pass, update the project state in the database
    const { data: updatedProject, error: updateError } = await supabaseClient
      .from('projects')
      .update({ current_state: next_state, updated_at: new Date().toISOString() })
      .eq('id', project_id)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to update project state: ${updateError.message}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Project successfully transitioned to '${next_state}'.`,
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