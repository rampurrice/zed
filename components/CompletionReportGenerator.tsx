

import React, { useState, useEffect, useRef } from 'react';
import type { Client, CompletionReport, Project } from '../types';
import { generateCompletionReport } from '../services/ragService';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { TrophyIcon } from './icons/TrophyIcon';

interface CompletionReportGeneratorProps {
    project: Project;
    client: Client;
}

const ReportLoader: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
    <div className="w-12 h-12 border-4 border-t-primary-600 border-r-primary-600/50 border-b-primary-600/50 border-l-primary-600/50 rounded-full animate-spin"></div>
    <p className="mt-4 text-slate-600 dark:text-slate-300 font-semibold">{text}</p>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">The AI is compiling project data. This may take a moment.</p>
  </div>
);

const ReportDisplay: React.FC<{ report: CompletionReport; reportRef: React.RefObject<HTMLDivElement> }> = ({ report, reportRef }) => {
  return (
    <div ref={reportRef} className="p-4 bg-white dark:bg-slate-800 font-serif text-slate-800 dark:text-slate-200">
      {/* Report Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">ZED Completion Report</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">{report.msmeName}</p>
        <div className="mt-4 text-sm text-slate-500 dark:text-slate-500">
          <span>Project ID: {report.projectId}</span> | <span>Report Date: {new Date(report.reportDate).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold border-b-2 border-slate-300 dark:border-slate-600 pb-2 mb-4">1. Executive Summary</h2>
        <p className="leading-relaxed">{report.executiveSummary}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold border-b-2 border-slate-300 dark:border-slate-600 pb-2 mb-4">2. Certification Achieved</h2>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-md text-center">
            <p className="font-semibold text-green-800 dark:text-green-200">The MSME has successfully met the criteria for:</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">{report.certificationLevelAchieved} Level Certification</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold border-b-2 border-slate-300 dark:border-slate-600 pb-2 mb-4">3. Project Journey Summary</h2>
        <div className="space-y-4">
            <div>
                <h3 className="font-semibold text-lg">3.1. Initial Baseline Assessment</h3>
                <p className="leading-relaxed text-sm mt-1">{report.baselineSummary}</p>
            </div>
             <div>
                <h3 className="font-semibold text-lg">3.2. Action Plan Implementation</h3>
                <p className="leading-relaxed text-sm mt-1">{report.actionPlanSummary}</p>
            </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-bold border-b-2 border-slate-300 dark:border-slate-600 pb-2 mb-4">4. Review & Feedback Cycles</h2>
        <div className="space-y-4">
          {report.reviewSummaries.map((review, index) => (
            <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md border border-slate-200 dark:border-slate-600 text-sm">
              <p className="font-semibold">{review.feedbackSummary}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">-- {review.reviewer} on {new Date(review.date).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

       <div className="mb-8" style={{ pageBreakBefore: 'always' }}>
        <h2 className="text-xl font-bold border-b-2 border-slate-300 dark:border-slate-600 pb-2 mb-4">5. Evidence Submitted</h2>
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                    <th className="px-4 py-2 text-left font-semibold">Document Name</th>
                    <th className="px-4 py-2 text-left font-semibold">Description</th>
                    <th className="px-4 py-2 text-left font-semibold">Document Hash (SHA256)</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {report.evidenceList.map((item, index) => (
                    <tr key={index}>
                        <td className="px-4 py-2 font-medium">{item.documentName}</td>
                        <td className="px-4 py-2">{item.description}</td>
                        <td className="px-4 py-2 font-mono text-xs">{item.documentHash.substring(0, 32)}...</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold border-b-2 border-slate-300 dark:border-slate-600 pb-2 mb-4">6. Final Recommendation</h2>
        <p className="leading-relaxed">{report.finalRecommendation}</p>
      </div>

      <div className="pt-16 text-sm text-slate-500 dark:text-slate-400">
        <div className="grid grid-cols-2 gap-16">
            <div className="border-t-2 pt-2 border-slate-300 dark:border-slate-600">
                <p>MSME Representative Signature</p>
            </div>
            <div className="border-t-2 pt-2 border-slate-300 dark:border-slate-600">
                <p>ZED Consultant Signature</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export const CompletionReportGenerator: React.FC<CompletionReportGeneratorProps> = ({ project, client }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<CompletionReport | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleGenerateReport = async () => {
        if (!project.id) {
            setError("Project context is missing.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setReport(null);
        try {
            const result = await generateCompletionReport(project.id);
            setReport(result);
        } catch (err: any) {
            setError(err.message || "An unknown error occurred while generating the report.");
        } finally {
            setIsLoading(false);
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
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= (pdfHeight - 20);
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= (pdfHeight - 20);
            }
            pdf.save(`ZED-Completion-Report-${client.name.replace(/\s/g, '_')}.pdf`);
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
                    <div className="text-center">
                        <TrophyIcon className="h-16 w-16 mx-auto text-amber-400"/>
                        <p className="mt-4 text-slate-600 dark:text-slate-300">This action will compile all project data, reviews, and evidence into a final ZED Completion Report.</p>
                        <div className="mt-6 flex justify-center">
                            <button onClick={handleGenerateReport} disabled={isLoading} className="flex items-center bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400 disabled:opacity-50">
                                <TrophyIcon className="w-5 h-5 mr-2" />
                                {isLoading ? 'Generating...' : 'Generate Final Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading && <ReportLoader text="Generating Completion Report..." />}
            
            {error && <div className="my-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 rounded-md text-sm text-red-700 dark:text-red-200">{error}</div>}

            {report && (
                <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Completion Report Generated</h2>
                            <p className="text-slate-600 dark:text-slate-400">For: {report.msmeName}</p>
                        </div>
                         <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                            <button
                                onClick={() => setReport(null)}
                                className="text-sm font-semibold text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                            >
                                Generate New
                            </button>
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
                    
                    <ReportDisplay report={report} reportRef={reportRef} />
                </div>
            )}
        </div>
    );
};