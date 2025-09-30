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

// Number of context chunks to retrieve. A higher number provides more context for the report.
const CONTEXT_MATCH_COUNT = 50; 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    const { project_id, sector, certification_level } = await req.json();
    if (!project_id || !sector || !certification_level) {
      throw new Error('Missing required fields: project_id, sector, certification_level');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Fetch ALL documents for the given project_id.
    const { data: documents, error: fetchError } = await supabaseClient
        .from('vector_index')
        .select('doc_type, page_no, content')
        .eq('project_id', project_id)
        .limit(CONTEXT_MATCH_COUNT);

    if (fetchError) {
      throw new Error(`Supabase fetch error: ${fetchError.message}`);
    }

    if (!documents || documents.length === 0) {
       throw new Error("No documents found for this project. Please upload documents to the Knowledge Base first.");
    }
    
    // Fetch project details to get the client name
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('client_name')
      .eq('id', project_id)
      .single();

    if (projectError) throw new Error(`Could not fetch project details: ${projectError.message}`);
    if (!project) throw new Error(`Project not found with id: ${project_id}`);

    // 2. Construct the prompt with retrieved context
    const contextText = documents.map(doc => 
        `Source: ${doc.doc_type}, Page: ${doc.page_no}\nContent: ${doc.content.trim()}`
    ).join('\n\n---\n\n');

    const prompt = `
      You are an expert QCI ZED (Zero Defect Zero Effect) consultant generating a draft Baseline Diagnostic Report for an MSME. Your analysis must be based *exclusively* on the provided context.

      **Project Details:**
      - Client Name: "${project.client_name || 'N/A'}"
      - Sector: "${sector}"
      - Target Certification Level: "${certification_level}"

      **Context from Knowledge Base (SOPs, Guidelines, Reports):**
      ${contextText}

      **Your Task:**
      Based on the project details and the provided context, generate a comprehensive diagnostic report. For each relevant ZED parameter (like Quality Management, Process Control, etc.), identify key gaps, recommend improvements, estimate the time to close each gap, and suggest relevant SOPs.

      **Instructions:**
      1.  Your entire response MUST be a single JSON object that strictly adheres to the provided schema. Do not include any text or markdown outside of the JSON object.
      2.  Analyze the context to find compliance gaps relevant to the client's sector and target certification level.
      3.  For each gap, provide a clear 'gapDescription'. Crucially, you MUST include citations in the description, like this: "The process lacks a formal review stage [SOP-01, Page 2]."
      4.  Provide specific, actionable 'recommendedImprovements' for each gap.
      5.  Estimate a realistic 'estimatedTimeToClose' (e.g., "2-4 weeks", "3 months") for each gap.
      6.  If the context mentions specific internal documents (like SOPs), list them in 'suggestedReferences' with their name and a brief description of their relevance.
      7.  If the context is insufficient for a particular ZED parameter, state that clearly in the 'summary' for that parameter and provide an empty array for 'gaps'. DO NOT invent information.
    `;
    
    // 3. Define the detailed JSON response schema for Gemini
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        projectName: { type: Type.STRING },
        sector: { type: Type.STRING },
        certificationLevel: { type: Type.STRING },
        overallSummary: { type: Type.STRING, description: 'A high-level summary of the findings.' },
        parameters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              parameter: { type: Type.STRING, description: 'Name of the ZED parameter (e.g., Quality Management).' },
              summary: { type: Type.STRING, description: 'A brief summary of findings for this parameter.' },
              gaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    gapDescription: { type: Type.STRING, description: 'Description of the compliance gap, with citations.' },
                    recommendedImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
                    estimatedTimeToClose: { type: Type.STRING, description: 'e.g., 2-4 weeks' },
                    suggestedReferences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          documentName: { type: Type.STRING, description: 'e.g., SOP-QC-002' },
                          description: { type: Type.STRING, description: 'Relevance of the document.' },
                        },
                        required: ['documentName', 'description'],
                      }
                    }
                  },
                  required: ['gapDescription', 'recommendedImprovements', 'estimatedTimeToClose', 'suggestedReferences'],
                }
              }
            },
            required: ['parameter', 'summary', 'gaps'],
          }
        }
      },
      required: ['projectName', 'sector', 'certificationLevel', 'overallSummary', 'parameters']
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

    const jsonText = response.text.trim();

    // 5. Return the structured JSON response
    return new Response(jsonText, {
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