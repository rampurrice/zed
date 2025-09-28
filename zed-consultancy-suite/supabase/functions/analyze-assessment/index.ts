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
    const data = await req.json();

    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        overallSummary: {
          type: Type.STRING,
          description: "A brief, high-level summary of the MSME's ZED compliance status.",
        },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A list of key strengths and positive practices observed.",
        },
        areasForImprovement: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A list of weaknesses, gaps, or areas of non-compliance.",
        },
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A concise title for the recommendation area." },
              steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific, actionable steps to implement the recommendation." }
            },
            required: ["title", "steps"],
          },
          description: "A list of actionable recommendations to improve ZED compliance.",
        },
        predictedScore: {
          type: Type.NUMBER,
          description: "An estimated ZED readiness score out of 100, based on the provided inputs.",
        },
      },
      required: ["overallSummary", "strengths", "areasForImprovement", "recommendations", "predictedScore"],
    };
    
    const { clientName, ...assessmentDetails } = data;
    const prompt = `
      You are an expert QCI ZED (Zero Defect Zero Effect) consultant analyzing an assessment for an Indian MSME.
      Your task is to provide a structured, professional, and actionable compliance report.

      Client Name: ${clientName}
      Assessment Details:
      ${JSON.stringify(assessmentDetails, null, 2)}

      Based on the notes and ratings provided for each ZED parameter, generate a detailed analysis.
      - Be objective and use professional language suitable for a consultancy report.
      - The ratings are on a scale of 1 to 5, where 1 is poor and 5 is excellent.
      - The recommendations should be practical for a small to medium-sized enterprise.
      - The predicted score should realistically reflect the provided assessment data.

      Provide your response strictly in the JSON format defined by the provided schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    
    return new Response(JSON.stringify(result), {
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