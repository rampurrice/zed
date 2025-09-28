// Add a type declaration for the Deno global object to resolve TypeScript errors.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.21.0';

// --- Configuration ---
// FIX: Use API_KEY environment variable as per guidelines.
const API_KEY = Deno.env.get('API_KEY');
const EMBEDDING_MODEL_NAME = 'text-embedding-004';
const GENERATIVE_MODEL_NAME = 'gemini-2.5-flash';

const MATCH_COUNT = 8; // Number of context chunks to retrieve

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
    const { query, project_id } = await req.json();
    if (!query || !project_id) {
      throw new Error('Missing required fields: query, project_id');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // 1. Embed the user's query
    // NOTE: Assuming embedContent is available on the new SDK for this function to work.
    const embeddingResult = await ai.models.embedContent({
        model: EMBEDDING_MODEL_NAME,
        content: query
    });
    const queryEmbedding = embeddingResult.embedding.values;


    // 2. Retrieve relevant document chunks from Supabase
    const { data: documents, error: rpcError } = await supabaseClient.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_project_id: project_id,
      match_count: MATCH_COUNT,
    });

    if (rpcError) {
      throw new Error(`Supabase RPC error: ${rpcError.message}`);
    }

    // 3. Construct the prompt with retrieved context
    const contextText = documents.map(doc => 
        `Source: ${doc.doc_type}, Page: ${doc.page_no}\nContent: ${doc.content.trim()}`
    ).join('\n\n---\n\n');
    
    const noContextResponse = "I could not find any relevant information in the uploaded documents for this project to answer your question. Please verify that the necessary documents have been uploaded and processed, or try rephrasing your question to be more specific.";

    const prompt = `
      You are an expert ZED (Zero Defect Zero Effect) consultant assistant. Your task is to answer the user's question based *only* on the provided context from internal project documents.

      **Context from internal documents:**
      ${documents && documents.length > 0 ? contextText : "No context provided."}

      **User's Question:**
      ${query}

      **Instructions:**
      1.  Analyze the provided context thoroughly.
      2.  Formulate a clear and concise answer to the user's question using ONLY the information from the context.
      3.  **Crucially, you must embed citations in your answer** for the information you use. For each piece of information, reference the document and page number, like this: [Source: SOP-01, Page 5].
      4.  If the context does not contain enough information to answer the question, you MUST respond with the exact phrase: "${noContextResponse}". Do not invent or infer information.
      5.  Do not add any preamble like "Here is the answer". Respond directly.
    `;

    // 4. Call Gemini streaming API
    const response = await ai.models.generateContentStream({
        model: GENERATIVE_MODEL_NAME,
        contents: prompt,
    });
    
    // 5. Pipe the streaming response back to the client
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            for await (const chunk of response) {
                 const text = chunk.text;
                 if (text) {
                    controller.enqueue(encoder.encode(text));
                 }
            }
            controller.close();
        }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});