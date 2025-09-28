// Add a type declaration for the Deno global object to resolve TypeScript errors.
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as pdfjs from 'https://esm.sh/pdfjs-dist@4.4.168/legacy/build/pdf.mjs';
import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.21.0';

// Set the worker script path for pdf.js. This is required for Deno environments.
pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs`;

// --- Configuration ---
// FIX: Use API_KEY environment variable as per guidelines.
const API_KEY = Deno.env.get('API_KEY');
const EMBEDDING_MODEL = 'text-embedding-004';

// --- Text Chunking Parameters ---
const CHUNK_SIZE_TOKENS = 300;
const TOKEN_APPROX_CHARS = 4; // 1 token is roughly 4 characters in English
const CHUNK_SIZE_CHARS = CHUNK_SIZE_TOKENS * TOKEN_APPROX_CHARS;
const CHUNK_OVERLAP_PERCENT = 0.2;
const CHUNK_OVERLAP_CHARS = Math.floor(CHUNK_SIZE_CHARS * CHUNK_OVERLAP_PERCENT);
const STEP_SIZE = CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS;

// Define CORS headers for cross-origin requests
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
    
    // 1. Initialize Supabase Admin Client & Google AI
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // 2. Parse Request Data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('project_id') as string | null;
    const docType = formData.get('doc_type') as string | null;

    if (!file || !projectId || !docType) {
      throw new Error('Missing required form fields: file, project_id, doc_type');
    }

    // 3. Parse PDF Content
    const fileBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: fileBuffer }).promise;
    const numPages = pdf.numPages;
    const pagesContent: { pageNumber: number, text: string }[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ').replace(/\s+/g, ' ').trim();
      if (text) {
        pagesContent.push({ pageNumber: i, text });
      }
    }

    if (pagesContent.length === 0) {
      return new Response(JSON.stringify({ message: 'PDF parsing resulted in no text content.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Chunk Text from All Pages
    const chunks: { pageNumber: number, text: string }[] = [];
    for (const page of pagesContent) {
      const pageText = page.text;
      if (pageText.length <= CHUNK_SIZE_CHARS) {
        chunks.push({ pageNumber: page.pageNumber, text: pageText });
      } else {
        for (let i = 0; i < pageText.length; i += STEP_SIZE) {
          const chunkText = pageText.substring(i, i + CHUNK_SIZE_CHARS);
          chunks.push({ pageNumber: page.pageNumber, text: chunkText });
        }
      }
    }

    // 5. Generate Embeddings in Batches
    const batchSize = 100; // API limit for batchEmbedContents
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      // NOTE: Assuming batchEmbedContents is available on the new SDK for this function to work.
      const result = await ai.models.batchEmbedContents({
          model: EMBEDDING_MODEL,
          requests: batchChunks.map(chunk => ({ content: { parts: [{ text: chunk.text }] } }))
      });
      allEmbeddings.push(...result.embeddings.map((e: any) => e.values));
    }

    // 6. Prepare Data for Supabase Insertion
    const rowsToInsert = chunks.map((chunk, i) => ({
      project_id: projectId,
      doc_type: docType,
      page_no: chunk.pageNumber,
      content: chunk.text,
      embedding: allEmbeddings[i],
    }));

    // 7. Store in Vector Table
    const { error } = await supabaseClient.from('vector_index').insert(rowsToInsert);
    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    // 8. Return Success Response
    return new Response(JSON.stringify({ message: `Successfully processed and stored ${chunks.length} text chunks.` }), {
      status: 200,
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