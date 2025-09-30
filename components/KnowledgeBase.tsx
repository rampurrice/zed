
import React, { useState, useEffect, useRef } from 'react';
import type { Client, ChatMessage, RAGSource, Project } from '../types';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';
import { uploadDocument, askQuestion } from '../services/ragService';
import { MapPinIcon } from './icons/MapPinIcon';
import { ProjectState } from '../types';

interface KnowledgeBaseProps {
    project: Project;
    client: Client;
}

const AILoader: React.FC = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse delay-75"></div>
        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse delay-150"></div>
    </div>
);

const AIResponse: React.FC<{ text: string; sources?: RAGSource[] }> = ({ text, sources }) => {
    return (
        <div className="space-y-4">
            <p className="text-slate-700 whitespace-pre-wrap">{text}</p>
            {sources && sources.length > 0 && (
                 <div>
                    <h4 className="text-sm font-semibold text-slate-600 mt-4 mb-2">Sources</h4>
                    <div className="flex flex-wrap gap-2">
                        {sources.map((source, i) => (
                            <span key={i} className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-md">
                               {source.doc_type}, Page {source.page_no}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ project, client }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [docType, setDocType] = useState<'ZED Guideline' | 'SOP' | 'Baseline Report'>('ZED Guideline');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [geoTag, setGeoTag] = useState<string | null>(null);

    const [query, setQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoadingQuery, setIsLoadingQuery] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    
     useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isLoadingQuery]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setUploadStatus(null);
            setGeoTag(null);
        }
    };

    const handleAddGeoTag = () => {
        // In a real mobile app, this would use navigator.geolocation
        setGeoTag("Lat: 28.6139, Lon: 77.2090 (Mocked)");
    };

    const handleUpload = async () => {
        if (!selectedFile || !project.id) {
            setUploadStatus({ message: "A file must be selected to upload.", type: 'error' });
            return;
        }
        setIsUploading(true);
        setUploadStatus(null);
        try {
            const result = await uploadDocument(project.id, docType, selectedFile);
            setUploadStatus({ message: `${result.message} ${geoTag ? `with Geo-tag: ${geoTag}`: ''}`, type: 'success' });
            setSelectedFile(null);
            setGeoTag(null);
        } catch (error: any) {
            setUploadStatus({ message: error.message || 'File upload failed.', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const parseSourcesFromStream = (text: string): RAGSource[] => {
        const regex = /\[Source:\s*([^,]+),\s*Page\s*(\d+)]/g;
        const matches = [...text.matchAll(regex)];
        const sources: RAGSource[] = [];
        const uniqueKeys = new Set<string>();

        for (const match of matches) {
            const key = `${match[1]}-${match[2]}`;
            if (!uniqueKeys.has(key)) {
                sources.push({ doc_type: match[1].trim(), page_no: parseInt(match[2], 10) });
                uniqueKeys.add(key);
            }
        }
        return sources;
    };


    const handleQuerySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || !project.id) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', text: query.trim() };
        setChatHistory(prev => [...prev, userMessage]);
        
        const aiMessageId = (Date.now() + 1).toString();
        const aiMessage: ChatMessage = { id: aiMessageId, sender: 'ai', text: '' };
        setChatHistory(prev => [...prev, aiMessage]);
        
        setQuery('');
        setIsLoadingQuery(true);

        try {
            const response = await askQuestion(query.trim(), project.id);
            if (!response.body) throw new Error("Response body is empty.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                accumulatedText += chunk;
                
                setChatHistory(prev => prev.map(msg => 
                    msg.id === aiMessageId ? { ...msg, text: accumulatedText } : msg
                ));
            }
            
             const finalSources = parseSourcesFromStream(accumulatedText);
             setChatHistory(prev => prev.map(msg => 
                msg.id === aiMessageId ? { ...msg, text: accumulatedText.replace(/\[Source:[^\]]+\]/g, '').trim(), sources: finalSources } : msg
            ));

        } catch (error: any) {
            setChatHistory(prev => prev.map(msg => 
                msg.id === aiMessageId ? { ...msg, error: error.message || "Sorry, I couldn't get an answer." } : msg
            ));
        } finally {
            setIsLoadingQuery(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-8 p-6">
            {/* Document Management Section */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                <h2 className="text-2xl font-bold text-slate-700 pb-3 mb-6 border-b border-gray-200">Project Documents</h2>
                 {project.current_state === ProjectState.ClientOnboarding && (
                    <div className="mb-6 p-4 bg-primary-50 border-l-4 border-primary-400 rounded-r-md">
                        <h3 className="font-semibold text-primary-800">Get Started</h3>
                        <p className="text-sm text-primary-700">Your Project Hub is Ready. **Upload your first document** to activate the AI Auto-Writer and Q&A features.</p>
                    </div>
                 )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="doc-type-select" className="block text-sm font-medium text-slate-700 mb-2">Document Type</label>
                        <select
                            id="doc-type-select"
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as any)}
                            className="w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                            <option>ZED Guideline</option>
                            <option>SOP</option>
                            <option>Baseline Report</option>
                        </select>
                    </div>
                
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md md:col-span-2">
                        <div className="space-y-1 text-center">
                            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-slate-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-slate-500">PDF up to 10MB</p>
                            {selectedFile && <p className="text-sm text-slate-800 pt-2 font-medium">{selectedFile.name}</p>}
                            {geoTag && <p className="text-xs text-green-600 font-semibold pt-1">{geoTag}</p>}
                        </div>
                    </div>
                </div>
                
                {uploadStatus && (
                    <div className={`mt-4 text-sm p-3 rounded-md ${uploadStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {uploadStatus.message}
                    </div>
                )}
                <div className="mt-4 flex justify-between items-center">
                    <button
                        onClick={handleAddGeoTag}
                        disabled={!selectedFile || !!geoTag}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-gray-50 focus:outline-none disabled:bg-gray-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                        <MapPinIcon className="w-4 h-4 mr-2" />
                        Add Geo-tag
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={isUploading || !selectedFile}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400"
                    >
                        {isUploading ? 'Processing...' : 'Upload & Process Document'}
                    </button>
                </div>
            </div>

            {/* Chat Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                     <h2 className="text-xl font-bold text-slate-800">Ask Your Documents</h2>
                </div>
                <div ref={chatContainerRef} className="p-6 h-96 overflow-y-auto space-y-6">
                    {chatHistory.length === 0 && (
                        <div className="text-center text-slate-500 h-full flex items-center justify-center">
                            <p>Ask a question about the uploaded documents for '{client.name}'.</p>
                        </div>
                    )}
                    {chatHistory.map(msg => (
                        <div key={msg.id} className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                           {msg.sender === 'ai' && <div className="w-8 h-8 flex-shrink-0 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center"><SparklesIcon className="w-5 h-5"/></div>}
                            <div className={`max-w-xl p-4 rounded-lg ${msg.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-slate-800'}`}>
                               {msg.sender === 'user' && <p>{msg.text}</p>}
                               {msg.sender === 'ai' && !msg.error && (
                                   (msg.text || isLoadingQuery) ? <AIResponse text={msg.text} sources={msg.sources} /> : null
                               )}
                               {msg.id === chatHistory[chatHistory.length - 1].id && isLoadingQuery && msg.sender === 'ai' && <AILoader />}
                               {msg.error && <p className="text-red-600">{msg.error}</p>}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-200 bg-gray-50/50 rounded-b-xl">
                    <form onSubmit={handleQuerySubmit} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., What are the safety requirements for process control?"
                            className="flex-1 w-full border border-gray-300 rounded-md p-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                            disabled={isLoadingQuery}
                        />
                        <button
                            type="submit"
                            disabled={isLoadingQuery || !query.trim()}
                            className="p-2 bg-primary-600 text-white rounded-full shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
