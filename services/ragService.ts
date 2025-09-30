
import { supabase, supabaseUrl } from '../lib/supabaseClient';
import type { RAGResponse, BaselineReport, ActionPlan, CompletionReport, AnalyticsData, Project } from '../types';
// FIX: Import ProjectState enum to use its members instead of string literals.
import { ProjectState } from '../types';

/**
 * Uploads a document to be processed and embedded.
 */
export const uploadDocument = async (
    projectId: string,
    docType: 'ZED Guideline' | 'SOP' | 'Baseline Report',
    file: File
): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('doc_type', docType);
    formData.append('file', file);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("User not authenticated.");

    const response = await fetch(`${supabaseUrl}/functions/v1/embed-and-store`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `File upload failed with status ${response.status}`);
    }

    return response.json();
};

/**
 * Asks a question to the RAG service and returns a streaming response.
 */
export const askQuestion = async (
    query: string,
    projectId: string
): Promise<Response> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error("Authentication session not found. Please log in again.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/consultancy-rag`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, project_id: projectId }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get a response from the AI assistant.");
    }
    
    return response;
};

export const generateBaselineReport = async (projectId: string, sector: string, certificationLevel: 'Bronze' | 'Silver' | 'Gold'): Promise<BaselineReport> => {
  const { data, error } = await supabase.functions.invoke('generate-baseline-report', {
    body: { project_id: projectId, sector, certification_level: certificationLevel },
  });
  if (error) throw new Error(`Baseline report generation failed: ${error.message}`);
  return data;
};

export const generateActionPlan = async (baselineReport: BaselineReport): Promise<ActionPlan> => {
  const { data, error } = await supabase.functions.invoke('generate-action-plan', {
    body: { baselineReport },
  });
  if (error) throw new Error(`Action plan generation failed: ${error.message}`);
  const plan = data as ActionPlan;
  plan.actionItems = plan.actionItems.map(item => ({ ...item, id: Math.random().toString(36).substring(2, 9) }));
  return plan;
};

export const generateCompletionReport = async (projectId: string): Promise<CompletionReport> => {
    const { data, error } = await supabase.functions.invoke('generate-completion-report', {
        body: { project_id: projectId },
    });
    if (error) throw new Error(`Completion report generation failed: ${error.message}`);
    return data;
};

export const generateInfographic = async (prompt: string, baseImage: string, mimeType: string): Promise<{ newImage: string, text: string | null }> => {
    const { data, error } = await supabase.functions.invoke('generate-infographic', {
        body: { prompt, baseImage, mimeType },
    });
    if (error) throw new Error(`Infographic generation failed: ${error.message}`);
    return data;
};

export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  return new Promise(resolve => setTimeout(() => resolve({
    consultantLoad: [
      { consultantName: "Rohan Sharma", activeProjects: 5 },
      { consultantName: "Priya Singh", activeProjects: 8 },
    ],
    milestoneTimings: [
      // FIX: Use ProjectState enum for type safety instead of string literals.
      { milestone: ProjectState.GapAnalysis, averageDays: 12 },
      { milestone: ProjectState.Implementation, averageDays: 95 },
    ],
    deadlineCompliance: { onTime: 42, overdue: 5 },
    manDaysComparison: { totalPlanned: 850, totalLogged: 780 },
    successRatesBySector: [
      { sector: 'Manufacturing', successPercentage: 92 },
      { sector: 'Textiles & Garments', successPercentage: 85 },
    ],
  }), 1000));
};

export const transitionProjectState = async (projectId: string, nextState: string): Promise<Project> => {
  const { data, error } = await supabase.functions.invoke('transition-state', {
    body: { project_id: projectId, next_state: nextState },
  });
  if (error) {
     const errorBody = JSON.parse(error.context.responseText || '{}');
     throw new Error(errorBody.message || `State transition failed: ${error.message}`);
  }
  return data.project;
};

export const verifyUdyamNumber = async (projectId: string, udyamNumber: string): Promise<{ message: string, project: Project }> => {
    const { data, error } = await supabase.functions.invoke('verify-udyam', {
        body: { projectId, udyamNumber }
    });
    if (error) {
        const errorBody = JSON.parse(error.context.responseText || '{}');
        throw new Error(errorBody.error || `UDYAM verification failed: ${error.message}`);
    }
    return data;
};
