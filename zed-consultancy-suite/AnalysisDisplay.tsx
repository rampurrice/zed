
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
                    className="text-gray-200"
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
      const canvas = await html2canvas(reportElement, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth - 20; // with margin
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 10; // top margin

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10; // next page top margin
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
    <div className="bg-gray-50/50 p-8 rounded-xl shadow-lg border border-gray-200 animate-fade-in">
        <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-200">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">ZED Analysis Report</h2>
                <p className="text-slate-600">For: {client.name}</p>
            </div>
            <div className="flex items-center space-x-4">
                 <button
                    onClick={onReset}
                    className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                    <ArrowPathIcon className="h-4 w-4 mr-1" />
                    New Assessment
                </button>
                <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="flex items-center text-sm font-semibold text-primary-600 hover:text-primary-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                </button>
            </div>
        </div>

        <div ref={reportRef} className="bg-white p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-xl font-semibold text-slate-700">Overall Summary</h3>
                    <p className="text-slate-600 leading-relaxed">{analysis.overallSummary}</p>
                </div>
                <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-slate-700 mb-2">Predicted ZED Score</h4>
                    <ScoreGauge score={analysis.predictedScore} />
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h4 className="text-lg font-semibold text-slate-700 flex items-center mb-4">
                        <CheckCircleIcon className="h-6 w-6 mr-2 text-green-500" />
                        Key Strengths
                    </h4>
                    <ul className="space-y-2 list-disc list-inside text-slate-600">
                        {analysis.strengths.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h4 className="text-lg font-semibold text-slate-700 flex items-center mb-4">
                        <ExclamationTriangleIcon className="h-6 w-6 mr-2 text-amber-500" />
                        Areas for Improvement
                    </h4>
                    <ul className="space-y-2 list-disc list-inside text-slate-600">
                        {analysis.areasForImprovement.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
            </div>

            <div className="mt-8">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-slate-700 flex items-center mb-4">
                        <LightBulbIcon className="h-6 w-6 mr-2 text-primary-500" />
                        Actionable Recommendations
                    </h3>
                    <div className="space-y-4">
                        {analysis.recommendations.map((rec, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h4 className="font-bold text-slate-700">{rec.title}</h4>
                            <ul className="mt-2 space-y-1 list-decimal list-inside text-slate-600 text-sm">
                            {rec.steps.map((step, stepIndex) => <li key={stepIndex}>{step}</li>)}
                            </ul>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
         <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
            <button
                onClick={() => onCreateProject(analysis)}
                className="flex items-center bg-primary-600 text-white font-semibold py-2 px-6 rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
                <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
                Create Project from this Assessment
            </button>
        </div>
    </div>
  );
};
