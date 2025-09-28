

import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { GeminiAnalysis, Client } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';

interface AnalysisDisplayProps {
  analysis: GeminiAnalysis;
  onReset: () => void;
  client: Client;
  onCreateProject: (analysis: GeminiAnalysis) => void;
}

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;
    let colorClass = 'text-red-500';
    if (score >= 75) {
        colorClass = 'text-green-500';
    } else if (score >= 50) {
        colorClass = 'text-amber-500';
    }

    return (
        <div className="relative flex items-center justify-center w-32 h-32">
            <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                <circle
                    className="text-slate-200 dark:text-slate-700"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                />
                <circle
                    className={`${colorClass} transition-all duration-1000 ease-out`}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <span className={`text-3xl font-bold ${colorClass}`}>{score}</span>
        </div>
    );
};

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis, onReset, client, onCreateProject }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    const reportElement = reportRef.current;
    if (!reportElement) return;

    setIsDownloading(true);
    try {
      // Temporarily switch to light mode for PDF generation for consistency
      const isDarkMode = document.documentElement.classList.contains('dark');
      if (isDarkMode) document.documentElement.classList.remove('dark');
      
      await new Promise(resolve => setTimeout(resolve, 100)); // allow time for re-render

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
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
      
      pdf.save(`ZED-Analysis-${client.name.replace(/\s/g, '_')}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">ZED Analysis Report</h2>
                <p className="text-slate-600 dark:text-slate-400">For: {client.name}</p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                 <button
                    onClick={onReset}
                    className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    New Assessment
                </button>
                <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                </button>
            </div>
        </div>

        <div ref={reportRef} className="bg-white dark:bg-slate-800 p-6 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Overall Summary</h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{analysis.overallSummary}</p>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Predicted ZED Score</h4>
                    <ScoreGauge score={analysis.predictedScore} />
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center mb-4">
                        <CheckCircleIcon className="h-6 w-6 mr-3 text-green-500" />
                        Key Strengths
                    </h4>
                    <ul className="space-y-2 list-disc list-inside text-slate-600 dark:text-slate-300">
                        {analysis.strengths.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center mb-4">
                        <ExclamationTriangleIcon className="h-6 w-6 mr-3 text-amber-500" />
                        Areas for Improvement
                    </h4>
                    <ul className="space-y-2 list-disc list-inside text-slate-600 dark:text-slate-300">
                        {analysis.areasForImprovement.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
            </div>

            <div className="mt-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 flex items-center mb-4">
                        <LightBulbIcon className="h-6 w-6 mr-3 text-primary-500" />
                        Actionable Recommendations
                    </h3>
                    <div className="space-y-4">
                        {analysis.recommendations.map((rec, index) => (
                        <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">{rec.title}</h4>
                            <ul className="mt-2 space-y-1 list-decimal list-inside text-slate-600 dark:text-slate-300 text-sm">
                            {rec.steps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}
                            </ul>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
         <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button
                onClick={() => onCreateProject(analysis)}
                className="flex items-center bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 transform hover:scale-[1.02]"
            >
                <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                Create Project from this Assessment
            </button>
        </div>
    </div>
  );
};