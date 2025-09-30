
import React, { useState, useEffect, useRef } from 'react';
import type { ActionPlan } from '../types';
import { generateInfographic } from '../services/ragService';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

// A new icon component for the 'Undo' functionality
const ArrowUturnLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
  </svg>
);


interface InfographicGeneratorProps {
    actionPlan: ActionPlan;
}

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 768;

// Helper to extract base64 data and MIME type from a data URL
const getBase64AndMime = (dataUrl: string): { base64: string, mimeType: string } => {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!mimeMatch || mimeMatch.length < 2) {
        throw new Error("Invalid data URL");
    }
    return {
        base64: parts[1],
        mimeType: mimeMatch[1]
    };
};

export const InfographicGenerator: React.FC<InfographicGeneratorProps> = ({ actionPlan }) => {
    const [prompt, setPrompt] = useState('');
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiTextResponse, setAiTextResponse] = useState<string | null>(null);

    // Function to create a blank white canvas image as a data URL
    const createBlankImage = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        return canvas.toDataURL('image/png');
    };

    // Initialize the component with a blank image
    useEffect(() => {
        const blankImage = createBlankImage();
        setCurrentImage(blankImage);
        setHistory([blankImage]);
    }, []);
    
    // Pre-fill the prompt with context from the action plan when it becomes available
    useEffect(() => {
        if (actionPlan) {
            const planSummary = actionPlan.actionItems.map(item => `- ${item.activity}`).join('\n');
            setPrompt(`Create a visual flowchart roadmap based on the following action items. Start with a "Begin Project" box and connect the following activities sequentially:\n${planSummary}`);
        }
    }, [actionPlan]);

    const handleGenerate = async () => {
        if (!prompt.trim() || !currentImage) return;

        setIsLoading(true);
        setError(null);
        setAiTextResponse(null);

        try {
            const { base64, mimeType } = getBase64AndMime(currentImage);
            const result = await generateInfographic(prompt, base64, mimeType);
            const newImageDataUrl = `data:image/png;base64,${result.newImage}`;
            setCurrentImage(newImageDataUrl);
            setHistory(prev => [...prev, newImageDataUrl]); // Add new image to history
            if (result.text) {
                setAiTextResponse(result.text);
            }
        } catch (err: any) {
            setError(err.message || "Failed to generate image.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUndo = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop(); // Remove the current image
            setCurrentImage(newHistory[newHistory.length - 1]); // Revert to the previous one
            setHistory(newHistory);
        }
    };
    
    const handleReset = () => {
         const blankImage = createBlankImage();
         setCurrentImage(blankImage);
         setHistory([blankImage]); // Reset history to just the blank image
    };

    return (
        <div className="mt-12">
            <div className="mb-6 pb-4 border-b-2 border-primary-200 dark:border-primary-800">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-3 text-primary-600 dark:text-primary-400" />
                    Visual Roadmap Generator (Beta)
                </h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed">
                    Use AI to create flowcharts, roadmaps, and infographics from your action plan. Edit the prompt to refine the visual.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="space-y-4 flex flex-col">
                    <div>
                        <label htmlFor="infographic-prompt" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Editing Prompt
                        </label>
                        <textarea
                            id="infographic-prompt"
                            rows={8}
                            className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition text-sm"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Draw a box labeled 'Phase 1' and connect it to..."
                        />
                    </div>
                     {aiTextResponse && (
                        <div className="p-3 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 text-sm rounded-md border border-primary-200 dark:border-primary-700/50">
                            <strong>AI Response:</strong> {aiTextResponse}
                        </div>
                    )}
                    {error && (
                         <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 text-sm rounded-md border border-red-200 dark:border-red-700/50">
                            <strong>Error:</strong> {error}
                        </div>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-4">
                         <div className="flex items-center gap-2">
                            <button onClick={handleUndo} disabled={isLoading || history.length <= 1} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50 transition-colors py-2 px-4 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                                <ArrowUturnLeftIcon className="h-4 w-4 mr-2" />
                                Undo
                            </button>
                             <button onClick={handleReset} disabled={isLoading || history.length <= 1} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50 transition-colors py-2 px-4 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600">
                                <ArrowPathIcon className="h-4 w-4 mr-2" />
                                Reset
                            </button>
                        </div>
                        <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="flex items-center bg-primary-600 text-white font-semibold py-2 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400">
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Generating...
                                </>
                            ) : 'Update Infographic'}
                        </button>
                    </div>
                </div>

                {/* Image Display */}
                <div className="bg-slate-200 dark:bg-slate-900/50 p-4 rounded-lg flex items-center justify-center border border-slate-300 dark:border-slate-700 min-h-[400px]">
                    {currentImage ? (
                        <img src={currentImage} alt="Generated Infographic" className="max-w-full h-auto rounded shadow-lg" />
                    ) : (
                        <div className="w-full h-64 flex items-center justify-center text-slate-500">Loading initial canvas...</div>
                    )}
                </div>
            </div>
        </div>
    );
};
