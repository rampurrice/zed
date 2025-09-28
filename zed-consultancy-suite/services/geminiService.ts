
import { supabase } from '../lib/supabaseClient';
import type { AssessmentData, GeminiAnalysis } from '../types';

export const analyzeAssessment = async (data: AssessmentData): Promise<GeminiAnalysis> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('analyze-assessment', {
        body: data,
    });

    if (error) {
        throw new Error(`Edge function invocation failed: ${error.message}`);
    }

    return result as GeminiAnalysis;

  } catch (error) {
    console.error("Error calling analyze-assessment function:", error);
    throw new Error("Failed to get a valid response from the AI service.");
  }
};
