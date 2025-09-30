
import React, { useState, useEffect, useRef } from 'react';
import type { Client, ChatMessage, RAGSource, Project } from '../types';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';
import { uploadDocument, askQuestion } from '../services/ragService';
import { MapPinIcon } from './icons/MapPinIcon';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useNotification } from '../hooks/useNotification';

interface KnowledgeBaseProps {
    project: Project;
    client: Client;
}

const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, y: -30, transition: { duration: 0.2, ease: 'easeOut' } }
};

const UploadModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUploadSuccess: (message: string) => void;
  onUploadError: (message: string) => void;
}> = ({ isOpen, onClose, project, onUploadSuccess, onUploadError }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<'ZED Guideline' | 'SOP' | 'Baseline Report'>('ZED Guideline');
  const [isUploading, setIsUploading] = useState(false);
  const [geoTag, setGeoTag] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) {
        setSelectedFile(null);
        setDocType('ZED Guideline');
        setIsUploading(false);
        setGeoTag(null);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAddGeoTag = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setGeoTag(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
            },
            (error) => {
                console.warn(`Geolocation error: ${error.message}`);
                setGeoTag("Geolocation failed (mocked: Lat: 28.6139, Lon: 77.2090)");
            }
        );
    } else {
       setGeoTag("Geolocation not supported (mocked: Lat: 28.6139, Lon: 77.2090)");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !project.id) {
      onUploadError("A file must be selected to upload.");
      return;
    }
    setIsUploading(true);
    try {
      const result = await uploadDocument(project.id, docType, selectedFile);
      onUploadSuccess(`${result.message} ${geoTag ? `with Geo-tag: ${geoTag}` : ''}`);
      onClose();
    } catch (error: any) {
      onUploadError(error.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
          onClick={onClose}
          variants={backdropVariants}
          initial="hidden" animate="visible" exit="hidden"
        >
          <motion.div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Upload to Knowledge Base</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Files will be processed for AI Q&A.</p>
            </div>
            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="doc-type-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Document Type</label>
                    <select id="doc-type-select" value={docType} onChange={(e) => setDocType(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option>ZED Guideline</option>
                        <option>SOP</option>
                        <option>Baseline Report</option>
                    </select>
                </div>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600 dark:text-slate-400">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                                <span>Upload a file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500">PDF up to 10MB</p>
                        {selectedFile && <p className="text-sm text-slate-800 dark:text-slate-200 pt-2 font-medium">{selectedFile.name}</p>}
                        {geoTag && <p className="text-xs text-green-600 dark:text-green-400 font-semibold pt-1">{geoTag}</p>}
                    </div>
                </div>
                 <div className="flex justify-end">
                    <button onClick={handleAddGeoTag} disabled={!selectedFile || !!geoTag}
                        className="inline-flex items-center px-3 py-1.5 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                        <MapPinIcon className="w-4 h-4 mr-2" />
                        Attach Geo-tag
                    </button>
                </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end items-center rounded-b-xl space-x-3 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={onClose} className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg shadow-sm">Cancel</button>
                <button onClick={handleUpload} disabled={isUploading || !selectedFile} className="bg-primary-600 text-white font-semibold py-2 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none disabled:bg-slate-400">
                    {isUploading ? 'Processing...' : 'Upload & Process'}
                </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

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
            <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{text}</p>
            {sources && sources.length > 0 && (
                 <div>
                    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-4 mb-2">Sources</h4>
                    <div className="flex flex-wrap gap-2">
                        {sources.map((source, i) => (
                            <span key={i} className="px-2 py-1 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-500/10 rounded-md">
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
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const { addNotification } = useNotification();

    const [query, setQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isLoadingQuery, setIsLoadingQuery] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    
     useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isLoadingQuery]);
    
    const handleUploadSuccess = (message: string) => {
        addNotification(message, 'success');
    };
    
    const handleUploadError = (message: string) => {
        addNotification(message, 'error');
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
        <div className="animate-fade-in p-6 space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                     <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Ask Your Documents</h2>
                     <button onClick={() => setIsUploadModalOpen(true)} className="inline-flex items-center text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2 px-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                        Upload Documents
                     </button>
                </div>
                
                <div ref={chatContainerRef} className="p-6 h-96 overflow-y-auto space-y-6">
                    {chatHistory.length === 0 && (
                        <div className="text-center text-slate-500 dark:text-slate-400 h-full flex flex-col items-center justify-center">
                            <SparklesIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                            <p className="font-semibold">Welcome to the AI Assistant!</p>
                            <p className="max-w-md">Upload documents like SOPs and guidelines to create a knowledge base, then ask questions to get instant, cited answers.</p>
                        </div>
                    )}
                    {chatHistory.map(msg => (
                        <div key={msg.id} className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                           {msg.sender === 'ai' && <div className="w-8 h-8 flex-shrink-0 bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center"><SparklesIcon className="w-5 h-5"/></div>}
                            <div className={`max-w-xl p-4 rounded-lg shadow-sm ${msg.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
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
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-xl">
                    <form onSubmit={handleQuerySubmit} className="flex items-center space-x-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., What are the safety requirements for process control?"
                            className="flex-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-slate-700"
                            disabled={isLoadingQuery}
                        />
                        <button
                            type="submit"
                            disabled={isLoadingQuery || !query.trim()}
                            className="p-3 bg-primary-600 text-white rounded-full shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-slate-400"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
            
             <UploadModal 
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                project={project}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
            />
        </div>
    );
};