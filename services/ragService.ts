import { supabase, supabaseUrl } from '../lib/supabaseClient';
import type { RAGResponse, BaselineReport, ActionPlan, CompletionReport, AnalyticsData, Project } from '../types';
import { ProjectState } from '../types';

/**
 * Uploads a document to be processed and embedded.
 * @param projectId The ID of the project/client.
 * @param docType The type of the document.
 * @param file The PDF file to upload.
 * @returns A success message.
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

    const { data, error } = await supabase.functions.invoke('embed-and-store', {
        body: formData,
    });

    if (error) {
        console.error('Error invoking embed-and-store function:', error);
        throw new Error(`Failed to process document: ${error.message}`);
    }

    return data;
};

/**
 * Asks a question to the RAG pipeline and returns a stream.
 * @param query The user's question.
 * @param projectId The ID of the project/client to scope the search.
 * @returns A Response object with a ReadableStream body.
 */
export const askQuestion = async (
    query: string,
    projectId: string
): Promise<Response> => {
    // FIX: Correctly handle streaming response from Supabase Edge Function.
    // The original `supabase.functions.invoke` call used an invalid `responseType: 'stream'` option
    // and is not suitable for streaming. The correct approach is to use `fetch` directly.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        throw new Error(`Authentication error: ${sessionError.message}`);
    }
    if (!session) {
        throw new Error('User not authenticated to ask question.');
    }

    // Construct the function URL dynamically.
    // FIX: Use the exported `supabaseUrl` constant instead of accessing a protected property `supabase.rest.url`.
    const functionUrl = `${supabaseUrl}/functions/v1/consultancy-rag`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
          query: query,
          project_id: projectId,
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error invoking consultancy-rag function:', response.statusText, errorText);
        throw new Error(`Failed to get an answer: ${response.statusText}`);
    }

    return response;
};


/**
 * Generates a Baseline Diagnostic Report using the RAG pipeline.
 * @param projectId The ID of the project/client.
 * @param sector The industry sector of the client.
 * @param certificationLevel The target ZED certification level.
 * @returns A structured BaselineReport object.
 */
export const generateBaselineReport = async (
    projectId: string,
    sector: string,
    certificationLevel: string
): Promise<BaselineReport> => {
     const { data, error } = await supabase.functions.invoke('generate-baseline-report', {
        body: JSON.stringify({
            project_id: projectId,
            sector: sector,
            certification_level: certificationLevel,
        }),
    });

    if (error) {
        console.error('Error invoking generate-baseline-report function:', error);
        throw new Error(`Failed to generate report: ${error.message}`);
    }

    return data as BaselineReport;
};

/**
 * Generates a detailed Action Plan from a Baseline Report.
 * @param baselineReport The completed baseline report object.
 * @returns A structured ActionPlan object.
 */
export const generateActionPlan = async (
    baselineReport: BaselineReport
): Promise<ActionPlan> => {
    const { data, error } = await supabase.functions.invoke('generate-action-plan', {
        body: JSON.stringify({
            baselineReport: baselineReport,
        }),
    });

    if (error) {
        console.error('Error invoking generate-action-plan function:', error);
        throw new Error(`Failed to generate action plan: ${error.message}`);
    }

    const plan = data as ActionPlan;
    // Add unique IDs to action items for drag-and-drop
    plan.actionItems = plan.actionItems.map(item => ({ ...item, id: crypto.randomUUID() }));
    return plan;
};

/**
 * Generates or edits an infographic using the image model.
 * @param prompt The text prompt for the image generation.
 * @param baseImage The base64 encoded string of the source image.
 * @param mimeType The MIME type of the source image.
 * @returns An object with the new base64 image and any accompanying text.
 */
export const generateInfographic = async (
    prompt: string,
    baseImage: string, // just the data, not the full data URL
    mimeType: string,
): Promise<{ newImage: string; text: string | null }> => {
    const { data, error } = await supabase.functions.invoke('generate-infographic', {
        body: JSON.stringify({
            prompt,
            baseImage,
            mimeType
        }),
    });

    if (error) {
        console.error('Error invoking generate-infographic function:', error);
        throw new Error(`Failed to generate infographic: ${error.message}`);
    }

    return data;
};

/**
 * Generates a Final Completion Report.
 * @param projectId The ID of the completed project.
 * @returns A structured CompletionReport object.
 */
export const generateCompletionReport = async (
    projectId: string
): Promise<CompletionReport> => {
     const { data, error } = await supabase.functions.invoke('generate-completion-report', {
        body: JSON.stringify({
            project_id: projectId,
        }),
    });

    if (error) {
        console.error('Error invoking generate-completion-report function:', error);
        throw new Error(`Failed to generate completion report: ${error.message}`);
    }
    
    return data as CompletionReport;
};

/**
 * Calls the backend function to securely transition a project to the next state.
 * @param projectId The ID of the project to transition.
 * @param nextState The target state.
 * @returns The updated project object after a successful transition.
 */
export const transitionProjectState = async (
    projectId: string,
    nextState: ProjectState
): Promise<Project> => {
    const { data, error } = await supabase.functions.invoke('transition-state', {
        body: { // Body can be an object; it will be stringified automatically
            project_id: projectId,
            next_state: nextState,
        },
    });

    if (error) {
        // Try to parse the specific validation error message from the function
        const errorContext = (error as any).context;
        if (errorContext && errorContext.status === 400) {
            try {
                const errorJson = await errorContext.json();
                const errorMessage = errorJson.errors ? `Validation failed: ${errorJson.errors.join(', ')}` : errorJson.message;
                throw new Error(errorMessage || "Server-side validation failed.");
            } catch (e) {
                 // Fallback if JSON parsing fails
                 throw new Error(`Failed to transition project state: ${error.message}`);
            }
        }
        // General or non-400 error
        throw new Error(`Failed to transition project state: ${error.message}`);
    }

    if (!data.success) { // This handles cases where the function returns 200 but success is false
        throw new Error(data.message || 'An unknown error occurred during state transition.');
    }

    return data.project as Project;
};


/**
 * Fetches analytics data for the dashboard.
 * In a real app, this would query a database view. Here, it returns mock data.
 * @returns A structured AnalyticsData object.
 */
export const getAnalyticsData = async (): Promise<AnalyticsData> => {
    console.log("Fetching analytics data (mocked)...");
    // Simulate network delay
    await new Promise(res => setTimeout(res, 800));

    const mockData: AnalyticsData = {
        consultantLoad: [
            { consultantName: 'Ravi Kumar', activeProjects: 5 },
            { consultantName: 'Sunita Nair', activeProjects: 7 },
            { consultantName: 'Amit Patel', activeProjects: 4 },
        ],
        milestoneTimings: [
            { milestone: ProjectState.GapAnalysis, averageDays: 7 },
            { milestone: ProjectState.RoadmapPlanning, averageDays: 14 },
            { milestone: ProjectState.Implementation, averageDays: 45 },
            { milestone: ProjectState.Certified, averageDays: 20 },
        ],
        deadlineCompliance: { onTime: 32, overdue: 6 },
        manDaysComparison: { totalPlanned: 550, totalLogged: 580 },
        successRatesBySector: [
            { sector: 'Technology', successPercentage: 92 },
            { sector: 'Manufacturing', successPercentage: 85 },
            { sector: 'Agriculture', successPercentage: 88 },
            { sector: 'Aerospace', successPercentage: 95 },
        ],
    };

    return mockData;
};