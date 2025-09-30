// Add a type declaration for the Deno global object to resolve TypeScript errors.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { GoogleGenAI, Type } from 'https://esm.sh/@google/genai@1.21.0';

// --- Configuration ---
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

    const { parameterName } = await req.json();
    if (!parameterName) {
      throw new Error('Missing required field: parameterName');
    }

    const prompt = `
      You are an expert QCI ZED (Zero Defect Zero Effect) consultant.
      Your task is to provide a concise, helpful explanation for a specific ZED parameter for a fellow consultant who is filling out an assessment form.

      **ZED Parameter:**
      "${parameterName}"

      **Instructions:**
      1.  **Description:** Write a brief, one or two-sentence description explaining the core concept and importance of this parameter in the context of an MSME.
      2.  **Compliance Actions:** List 3-4 typical, high-impact compliance actions or evidence points an MSME would need to demonstrate for this parameter. Keep them brief and actionable.
      3.  Your entire response MUST be a single JSON object that strictly adheres to the provided schema. Do not include any text outside of the JSON object.
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        description: {
          type: Type.STRING,
          description: "A brief explanation of the ZED parameter's importance.",
        },
        complianceActions: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "A typical action an MSME can take to comply."
          },
          description: "A list of 3-4 common compliance actions.",
        },
      },
      required: ["description", "complianceActions"],
    };

    const response = await ai.models.generateContent({
        model: GENERATIVE_MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const jsonText = response.text.trim();

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