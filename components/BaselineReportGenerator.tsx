

import React, { useState, useEffect, useRef } from 'react';
import type { Client, BaselineReport, ActionPlan, ActionItem, Project } from '../types';
import { generateBaselineReport, generateActionPlan } from '../services/ragService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { InfographicGenerator } from './InfographicGenerator';

interface BaselineReportGeneratorProps {
    project: Project;
    client: Client;
}

const ReportLoader: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
    <div className="w-12 h-12 border-4 border-t-primary-600 border-r-primary-600/50 border-b-primary-600/50 border-l-primary-600/50 rounded-full animate-spin"></div>
    <p className="mt-4 text-slate-600 dark:text-slate-300 font-semibold">{text}</p>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The AI is working. This may take up to a minute.</p>
  </div>
);

const ActionPlanDisplay: React.FC<{ plan: ActionPlan; setPlan: React.Dispatch<React.SetStateAction<ActionPlan | null>> }> = ({ plan, setPlan }) => {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        dragOverItem.current = index;
    };

    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const newActionItems = [...plan.actionItems];
            const draggedItemContent = newActionItems.splice(dragItem.current, 1)[0];
            newActionItems.splice(dragOverItem.current, 0, draggedItemContent);
            setPlan({ ...plan, actionItems: newActionItems });
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };


    return (
        <div className="mt-12">
            <div className="mb-6 pb-4 border-b-2 border-primary-200 dark:border-primary-800">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Generated Action Plan</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed">{plan.overallStrategy}</p>
                <p className="mt-2 text-xs text-primary-700 dark:text-primary-400 font-semibold">Tip: Drag and drop rows to reorder activities.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">ZED Parameter</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Activity</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Responsibility</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Tools & Tech</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Est. Cost</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Est. Man-Days</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {plan.actionItems.map((item, index) => (
                            <tr 
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                                className="cursor-move hover:bg-primary-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-200">{item.zedParameter}</td>
                                <td className="px-4 py-4 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300 max-w-xs">{item.activity}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.responsiblePerson}</td>
                                <td className="px-4 py-4 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300 max-w-xs">{item.toolsAndTechnology.join(', ')}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.estimatedCost}</td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 text-center">{item.estimatedManDays}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const ReportDisplay: React.FC<{ report: BaselineReport; reportRef: React.RefObject<HTMLDivElement>; actionPlan: ActionPlan | null; setActionPlan: React.Dispatch<React.SetStateAction<ActionPlan | null>> }> = ({ report, reportRef, actionPlan, setActionPlan }) => {
  return (
      <div ref={reportRef} className="p-4 bg-white dark:bg-slate-800">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 mb-8">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Overall Summary</h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-2">{report.overallSummary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4">
                <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-md"><strong className="text-slate-700 dark:text-slate-300">Sector:</strong> {report.sector}</div>
                <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-md"><strong className="text-slate-700 dark:text-slate-300">Target Level:</strong> {report.certificationLevel}</div>
            </div>
        </div>
        
        <div className="space-y-8">
            {report.parameters.map((param, pIndex) => (
                <div key={pIndex} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <h4 className="text-lg font-semibold text-primary-700 dark:text-primary-400 mb-3 pb-2 border-b-2 border-primary-100 dark:border-primary-900">{param.parameter}</h4>
                    <p className="text-slate-600 dark:text-slate-300 italic mb-4">{param.summary}</p>
                    {param.gaps.map((gap, gIndex) => (
                        <div key={gIndex} className="bg-slate-50/70 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600 mb-4">
                           <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Gap: {gap.gapDescription}</p>
                           <div className="pl-4">
                                <h5 className="font-semibold text-sm text-slate-600 dark:text-slate-300 mt-3 mb-1">Recommendations:</h5>
                                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                                    {gap.recommendedImprovements.map((rec, rIndex) => <li key={rIndex}>{rec}</li>)}
                                </ul>
                                <h5 className="font-semibold text-sm text-slate-600 dark:text-slate-300 mt-3 mb-1">Suggested SOPs:</h5>
                                 <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300 text-sm">
                                    {gap.suggestedReferences.map((ref, refIndex) => <li key={refIndex}><strong className="text-slate-800 dark:text-slate-200">{ref.documentName}:</strong> {ref.description}</li>)}
                                </ul>
                                <div className="mt-3 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/50 inline-block px-2 py-1 rounded">
                                    Est. Time to Close: {gap.estimatedTimeToClose}
                                </div>
                           </div>
                        </div>
                    ))}
                     {param.gaps.length === 0 && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No significant gaps identified for this parameter based on the provided documents.</p>
                    )}
                </div>
            ))}
        </div>
        {actionPlan && <ActionPlanDisplay plan={actionPlan} setPlan={setActionPlan} />}
      </div>
  )
};

export const BaselineReportGenerator: React.FC<BaselineReportGeneratorProps> = ({ project, client }) => {
    const [certificationLevel, setCertificationLevel] = useState<'Bronze' | 'Silver' | 'Gold'>('Bronze');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<BaselineReport | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
    const [isGeneratingActionPlan, setIsGeneratingActionPlan] = useState(false);

    const handleGenerateReport = async () => {
        if (!project.id || !client.industry || !certificationLevel) {
            setError("Project context is missing.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setReport(null);
        setActionPlan(null);
        try {
            const result = await generateBaselineReport(project.id, client.industry, certificationLevel);
            setReport(result);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred while generating the report.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateActionPlan = async () => {
        if (!report) return;
        setIsGeneratingActionPlan(true);
        setError(null);
        try {
            const result = await generateActionPlan(report);
            setActionPlan(result);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred while generating the action plan.");
        } finally {
            setIsGeneratingActionPlan(false);
        }
    };


    const handleDownloadPdf = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return;
        setIsDownloading(true);
        try {
            const isDarkMode = document.documentElement.classList.contains('dark');
            if (isDarkMode) document.documentElement.classList.remove('dark');
            await new Promise(res => setTimeout(res, 100));

            const canvas = await html2canvas(reportElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            
            if (isDarkMode) document.documentElement.classList.add('dark');

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgWidth = pdfWidth - 20;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            let heightLeft = imgHeight;
            let position = 10;
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 20);
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - 20);
            }
            pdf.save(`ZED-Report-and-Plan-${client.name.replace(/\s/g, '_')}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-8 mt-6">
            {!report && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Industry Sector</label>
                             <input type="text" value={client.industry} disabled className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                            <label htmlFor="level-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Target Certification Level</label>
                            <select id="level-select" value={certificationLevel} onChange={(e) => setCertificationLevel(e.target.value as any)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500">
                                <option>Bronze</option>
                                <option>Silver</option>
                                <option>Gold</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleGenerateReport} disabled={isLoading} className="flex items-center bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400 disabled:opacity-50">
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isLoading ? 'Generating...' : 'Generate Baseline Report'}
                        </button>
                    </div>
                </div>
            )}

            {isLoading && <ReportLoader text="Generating Baseline Report..." />}
            
            {error && <div className="my-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 rounded-md text-sm text-red-700 dark:text-red-200">{error}</div>}

            {report && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Baseline Diagnostic Report</h2>
                            <p className="text-slate-600 dark:text-slate-400">For: {report.projectName}</p>
                        </div>
                        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                            {!actionPlan && !isGeneratingActionPlan && (
                                 <button
                                    onClick={handleGenerateActionPlan}
                                    className="flex items-center bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300 font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-200 dark:hover:bg-primary-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    <SparklesIcon className="w-5 h-5 mr-2" />
                                    Generate Action Plan
                                </button>
                            )}
                             {isGeneratingActionPlan && <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Generating Plan...</span>}
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 disabled:text-slate-400 disabled:cursor-not-allowed"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                                {isDownloading ? 'Downloading...' : 'Download PDF'}
                            </button>
                        </div>
                    </div>
                    
                    {isGeneratingActionPlan && <ReportLoader text="Generating Action Plan..." />}

                    <ReportDisplay report={report} reportRef={reportRef} actionPlan={actionPlan} setActionPlan={setActionPlan} />
                     
                    {actionPlan && (
                        <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700">
                            <InfographicGenerator actionPlan={actionPlan} />
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};
