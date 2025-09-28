// Add a type declaration for the Deno global object to resolve TypeScript errors.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { GoogleGenAI, Type } from 'https://esm.sh/@google/genai@1.21.0';

// --- Configuration ---
// FIX: Use API_KEY environment variable as per guidelines.
const API_KEY = Deno.env.get('API_KEY');
const GENERATIVE_MODEL_NAME = 'gemini-2.5-flash';

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
    
    const { baselineReport } = await req.json();
    if (!baselineReport) {
      throw new Error('Missing required field: baselineReport');
    }

    const prompt = `
      You are an expert ZED (Zero Defect Zero Effect) Senior Project Manager.
      Your task is to create a detailed, actionable project plan based on the provided Baseline Diagnostic Report.

      **Input: Baseline Diagnostic Report**
      ${JSON.stringify(baselineReport, null, 2)}

      **Your Task:**
      For each gap identified in the report, create a specific action item. The goal is to produce a comprehensive plan that a consultant can use to guide the MSME to ZED certification.

      **Instructions:**
      1.  Your entire response MUST be a single JSON object that strictly adheres to the provided schema.
      2.  Begin with an 'overallStrategy' that summarizes the approach to achieving compliance.
      3.  For each gap in the report's 'parameters' section, create a corresponding item in the 'actionItems' array.
      4.  'zedParameter': The name of the ZED parameter the activity falls under.
      5.  'activity': A clear, concise description of the task to be performed to close the gap.
      6.  'responsiblePerson': Suggest a likely role responsible for this task (e.g., "Production Manager", "Quality Head", "HR Manager").
      7.  'toolsAndTechnology': List required tools or technologies. Crucially, include recommendations for "Zero Effect" technologies where applicable (e.g., "Energy-efficient lighting", "Water recycling unit", "Solar panel installation").
      8.  'estimatedCost': Provide a realistic cost estimate in INR (e.g., "₹25,000 - ₹40,000", "Approx. ₹1.5 Lakh").
      9.  'estimatedManDays': Estimate the number of consultant man-days required for this activity.
      10. Ensure the plan is practical for an Indian MSME.
    `;
    
    // Define the detailed JSON response schema for Gemini
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        projectName: { type: Type.STRING },
        overallStrategy: { type: Type.STRING, description: "A brief, high-level summary of the implementation strategy." },
        actionItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              zedParameter: { type: Type.STRING, description: "The ZED parameter this action item addresses." },
              activity: { type: Type.STRING, description: "The specific task to be performed." },
              responsiblePerson: { type: Type.STRING, description: "The suggested role responsible for the task." },
              toolsAndTechnology: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of required tools, including Zero Effect tech." },
              estimatedCost: { type: Type.STRING, description: "Cost estimate in INR." },
              estimatedManDays: { type: Type.NUMBER, description: "Estimated consultant man-days." },
              status: { type: Type.STRING, description: "Initial status, should be 'Pending'." },
            },
            required: ['zedParameter', 'activity', 'responsiblePerson', 'toolsAndTechnology', 'estimatedCost', 'estimatedManDays', 'status'],
          }
        }
      },
      required: ['projectName', 'overallStrategy', 'actionItems']
    };

    // Call Gemini API
    const response = await ai.models.generateContent({
        model: GENERATIVE_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const jsonText = response.text.trim();

    // Return the structured JSON response
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