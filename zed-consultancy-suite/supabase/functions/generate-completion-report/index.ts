// Add a type declaration for the Deno global object to resolve TypeScript errors.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI, Type } from 'https://esm.sh/@google/genai@1.21.0';

// --- Configuration ---
// FIX: Use API_KEY environment variable as per guidelines.
const API_KEY = Deno.env.get('API_KEY');
const GENERATIVE_MODEL_NAME = 'gemini-2.5-flash';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Mock Data Fetching ---
// In a real application, you would query your database for this information.
const getProjectData = async (supabaseClient: any, projectId: string) => {
    // Fetch client name from the 'clients' table
    const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('client_name, certification_level, initial_analysis, action_items')
        .eq('id', projectId)
        .single();

    if (projectError) throw new Error(`Could not fetch project data: ${projectError.message}`);
    
    // For demonstration, some data is mocked.
    return {
        msmeName: project.client_name,
        certificationLevelAchieved: project.certification_level || 'Silver',
        baselineSummary: project.initial_analysis?.overallSummary || "Initial assessment revealed significant gaps. Strengths were noted in Quality Management fundamentals.",
        actionPlanSummary: `An action plan with ${project.action_items?.length || 0} items was implemented.`,
        reviewSummaries: [
            { reviewer: "Sunita Nair", date: "2024-07-15", feedbackSummary: "Good progress on SOPs, but waste management logs are inconsistent. More training is needed." },
            { reviewer: "Ravi Kumar", date: "2024-08-20", feedbackSummary: "Excellent implementation of new energy monitoring tools. All major gaps from the baseline are now closed." }
        ],
        evidenceList: [
            { documentName: "SOP-PC-001.pdf", documentHash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", description: "Standard Operating Procedure for Process Control" },
            { documentName: "Waste-Log-Aug24.xlsx", documentHash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", description: "Waste segregation and disposal logs for August 2024" },
            { documentName: "Energy-Audit-Report.pdf", documentHash: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6", description: "Third-party energy audit report" }
        ]
    };
};


// --- Main Function Handler ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!API_KEY) {
      throw new Error("API_KEY is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const { project_id } = await req.json();
    if (!project_id) {
      throw new Error('Missing required field: project_id');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Fetch all necessary data for the report
    const projectData = await getProjectData(supabaseClient, project_id);

    // 2. Construct the prompt for Gemini
    const prompt = `
      You are an expert QCI ZED consultant writing the final project completion report.
      Your task is to synthesize the provided project data into a formal report, following the structure of QCI Annexure 4.

      **Input: Project Data**
      ${JSON.stringify(projectData, null, 2)}

      **Your Task:**
      Generate a professional and comprehensive completion report.

      **Instructions:**
      1.  Your entire response MUST be a single JSON object that strictly adheres to the provided schema. Do not include any text or markdown outside of the JSON object.
      2.  'executiveSummary': Write a high-level overview of the project, from initial gaps to final successful certification.
      3.  'finalRecommendation': Write a concluding statement, confirming the MSME's compliance and suggesting areas for continuous improvement.
      4.  All other fields in the JSON schema should be populated directly from the provided project data.
      5.  Ensure the tone is formal and professional.
    `;
    
    // 3. Define the detailed JSON response schema
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        msmeName: { type: Type.STRING },
        projectId: { type: Type.STRING },
        certificationLevelAchieved: { type: Type.STRING },
        reportDate: { type: Type.STRING, description: "Current date in ISO 8601 format." },
        executiveSummary: { type: Type.STRING },
        baselineSummary: { type: Type.STRING },
        actionPlanSummary: { type: Type.STRING },
        reviewSummaries: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              reviewer: { type: Type.STRING },
              date: { type: Type.STRING },
              feedbackSummary: { type: Type.STRING },
            },
            required: ['reviewer', 'date', 'feedbackSummary'],
          }
        },
        evidenceList: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              documentName: { type: Type.STRING },
              documentHash: { type: Type.STRING },
              description: { type: Type.STRING },
              citation: { type: Type.STRING }
            },
            required: ['documentName', 'documentHash', 'description', 'citation']
          }
        },
        finalRecommendation: { type: Type.STRING }
      },
      required: ['msmeName', 'projectId', 'certificationLevelAchieved', 'reportDate', 'executiveSummary', 'baselineSummary', 'actionPlanSummary', 'reviewSummaries', 'evidenceList', 'finalRecommendation']
    };

    // 4. Call Gemini API
    const response = await ai.models.generateContent({
        model: GENERATIVE_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });
    
    let finalJson = JSON.parse(response.text.trim());

    // Merge static data back into the response for accuracy
    finalJson = {
        ...finalJson,
        msmeName: projectData.msmeName,
        projectId: project_id,
        certificationLevelAchieved: projectData.certificationLevelAchieved,
        reportDate: new Date().toISOString(),
        baselineSummary: projectData.baselineSummary,
        actionPlanSummary: projectData.actionPlanSummary,
        reviewSummaries: projectData.reviewSummaries,
        evidenceList: projectData.evidenceList.map(e => ({ ...e, citation: `[EVIDENCE-${e.documentName}]` }))
    };


    // 5. Return the structured JSON response
    return new Response(JSON.stringify(finalJson), {
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