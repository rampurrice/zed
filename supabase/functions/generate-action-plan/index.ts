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
      You are an expert ZED (Zero Defect Zero Effect) Senior Project Manager with a specialization in digital transformation for MSMEs.
      Your task is to create a detailed, actionable project plan based on the provided Baseline Diagnostic Report.

      **Input: Baseline Diagnostic Report**
      ${JSON.stringify(baselineReport, null, 2)}

      **Your Task:**
      For each gap identified in the report, create a specific action item. The goal is to produce a comprehensive plan that a consultant can use to guide the MSME to ZED certification, with a strong focus on capacity building and modern system implementation.

      **Instructions:**
      1.  Your entire response MUST be a single JSON object that strictly adheres to the provided schema.
      2.  Begin with an 'overallStrategy' that summarizes the approach to achieving compliance.
      3.  For each gap in the report's 'parameters' section, create a corresponding item in the 'actionItems' array.
      4.  **Crucially, you MUST include dedicated action items for System Implementation, Digital Transformation & Capacity Building:**
          -   **Documentation:** Add tasks for developing key documents (e.g., "Draft and digitize Quality Manual", "Create SOP for Waste Management").
          -   **Quality Tools:** Include items for integrating relevant, industry-specific tools (e.g., "Implement Statistical Process Control (SPC) charts for critical automotive processes", "Conduct Kaizen event for shop-floor optimization in a manufacturing unit", "Implement HACCP protocols for a food processing unit").
          -   **Digital Transformation:** Suggest modern technology solutions. For 'toolsAndTechnology', include items like "IoT sensors for real-time energy monitoring", "Cloud-based Quality Management System (QMS)", and "Mobile app for digital audit checklists".
          -   **Training (Multi-Tier):**
              -   **Shop-floor:** (e.g., "Conduct training on Swachh Workplace principles").
              -   **Middle Management:** (e.g., "Train supervisors on Process Control monitoring").
              -   **Senior Management:** (e.g., "Workshop on Risk Management frameworks").
          -   **Knowledge Transfer:** Include an action item to **"Establish and train an internal ZED champion network"**.
      5.  'zedParameter': The name of the ZED parameter the activity falls under.
      6.  'activity': A clear, concise description of the task to be performed to close the gap.
      7.  'responsiblePerson': Suggest a likely role responsible for this task (e.g., "Production Manager", "HR Manager", "Internal ZED Champion").
      8.  'toolsAndTechnology': List required tools or technologies. Be specific and include digital solutions where appropriate.
      9.  'estimatedCost': Provide a realistic cost estimate in INR (e.g., "₹25,000", "Approx. ₹1.5 Lakh").
      10. 'estimatedManDays': Estimate the number of consultant man-days required for this activity.
      11. Ensure the plan is practical for an Indian MSME in the specified sector.
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
              toolsAndTechnology: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of required tools, including digital solutions." },
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