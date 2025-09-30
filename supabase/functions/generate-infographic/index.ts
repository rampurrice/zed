// Add a type declaration for the Deno global object to resolve TypeScript errors.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { GoogleGenAI, Modality } from 'https://esm.sh/@google/genai@1.21.0';

// --- Configuration ---
const API_KEY = Deno.env.get('API_KEY');
const MODEL_NAME = 'gemini-2.5-flash-image-preview';

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

    const { prompt, baseImage, mimeType } = await req.json();
    if (!prompt || !baseImage || !mimeType) {
      throw new Error('Missing required fields: prompt, baseImage, mimeType');
    }

    const imagePart = {
      inlineData: {
        data: baseImage,
        mimeType: mimeType,
      },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let newImageBase64: string | null = null;
    let newText: string | null = null;

    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                newImageBase64 = part.inlineData.data;
            } else if (part.text) {
                newText = part.text;
            }
        }
    }

    if (!newImageBase64) {
      throw new Error("The AI did not return an image. Please try a different prompt.");
    }

    return new Response(JSON.stringify({ newImage: newImageBase64, text: newText }), {
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