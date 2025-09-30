
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

// Mock function for sending alerts. In a real scenario, this would integrate
// with services like Twilio (for WhatsApp) and SendGrid/Resend (for Email).
const sendAlert = async (type: 'email' | 'whatsapp', recipient: string, message: string) => {
  console.log(`--- Sending ${type} Alert ---`);
  console.log(`To: ${recipient}`);
  console.log(`Message: ${message}`);
  console.log(`--------------------------`);
  // Example: await fetch('https://api.sendgrid.com/...', { ... });
  // Example: await fetch('https://api.twilio.com/...', { ... });
  return Promise.resolve();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // This function is intended to be called by a cron job, e.g., daily.
    // It finds projects with upcoming or overdue milestones.
    
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // --- Fetch projects nearing deadlines ---
    const { data: upcomingProjects, error: upcomingError } = await supabaseClient
      .from('projects')
      .select('*')
      .neq('current_state', 'Completion') // Don't check completed projects
      .lte('milestone_due_date', sevenDaysFromNow.toISOString())
      .gte('milestone_due_date', today.toISOString());

    if (upcomingError) throw new Error(`Error fetching upcoming projects: ${upcomingError.message}`);

    // --- Fetch overdue projects ---
    const { data: overdueProjects, error: overdueError } = await supabaseClient
      .from('projects')
      .select('*')
      .neq('current_state', 'Completion')
      .lt('milestone_due_date', today.toISOString());

    if (overdueError) throw new Error(`Error fetching overdue projects: ${overdueError.message}`);

    const alertsToSend: Promise<void>[] = [];
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'admin@example.com';
    const ADMIN_WHATSAPP = Deno.env.get('ADMIN_WHATSAPP') || '+15551234567';

    // --- Process upcoming projects ---
    for (const project of upcomingProjects || []) {
      const dueDate = new Date(project.milestone_due_date);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        const message = `URGENT: Project "${project.client_name}" milestone is due in 24 hours.`;
        // Assume project has contact info, or we use a default.
        alertsToSend.push(sendAlert('email', 'consultant@example.com', message));
        alertsToSend.push(sendAlert('whatsapp', '+15557654321', message));
      } else if (diffDays <= 7) {
        const message = `REMINDER: Project "${project.client_name}" milestone is due in ${diffDays} days.`;
        alertsToSend.push(sendAlert('email', 'consultant@example.com', message));
      }
    }

    // --- Process overdue projects and escalate ---
    for (const project of overdueProjects || []) {
      const message = `ESCALATION: Project "${project.client_name}" milestone is overdue. Please review immediately.`;
      alertsToSend.push(sendAlert('email', ADMIN_EMAIL, message));
      alertsToSend.push(sendAlert('whatsapp', ADMIN_WHATSAPP, message));
    }
    
    await Promise.all(alertsToSend);

    return new Response(JSON.stringify({ 
      message: 'Workflow monitor executed successfully.',
      upcoming_alerts: (upcomingProjects || []).length,
      overdue_escalations: (overdueProjects || []).length
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
