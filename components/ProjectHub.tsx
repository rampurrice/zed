
import React, { useState } from 'react';
import type { Project, Client, ProjectHubTab } from '../types';
import { KnowledgeBase } from './KnowledgeBase';
import { BaselineReportGenerator } from './BaselineReportGenerator';
import { CompletionReportGenerator } from './CompletionReportGenerator';
import { StateBadge } from './StateBadge';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ProjectWizard } from './ProjectWizard';
import { ProjectState } from '../types';
import { motion } from 'framer-motion';
import { ProjectStatusGuide } from './ProjectStatusGuide';

interface ProjectHubProps {
    project: Project;
    client: Client;
    onBack: () => void;
    onProjectUpdate: (updatedProject: Project) => void;
}

const TABS: { label: string, componentKey: ProjectHubTab }[] = [
    { label: 'Q&A and Documents', componentKey: 'Knowledge Base' },
    { label: 'Reports & Action Plan', componentKey: 'Auto-Writer' },
    { label: 'Certification Report', componentKey: 'Final Report' },
];

export const ProjectHub: React.FC<ProjectHubProps> = ({ project, client, onBack, onProjectUpdate }) => {
    const [activeTab, setActiveTab] = useState<ProjectHubTab>('Knowledge Base');
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    const renderActiveTab = () => {
        switch(activeTab) {
            case 'Knowledge Base':
                return <KnowledgeBase project={project} client={client} />;
            case 'Auto-Writer':
                return <BaselineReportGenerator project={project} client={client} />;
            case 'Final Report':
                return <CompletionReportGenerator project={project} client={client} />;
            default:
                return null;
        }
    }
    
    const handleTransitionSuccess = (updatedProject: Project) => {
        onProjectUpdate(updatedProject);
        setIsWizardOpen(false);
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Hub Header */}
            <div>
                 <button onClick={onBack} className="flex items-center text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to All Projects
                </button>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                    <div className="mb-4 sm:mb-0">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tighter">{client.name}</h1>
                            <StateBadge state={project.current_state} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">Project Hub</p>
                    </div>
                    {project.current_state !== ProjectState.Complete && (
                        <motion.button 
                            onClick={() => setIsWizardOpen(true)}
                            className="bg-primary-600 text-white font-semibold py-2 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                           Advance to Next Stage...
                        </motion.button>
                    )}
                </div>
            </div>
            
            <div className="mb-6">
                <ProjectStatusGuide project={project} />
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {TABS.map(tab => (
                        <button
                            key={tab.componentKey}
                            onClick={() => setActiveTab(tab.componentKey)}
                            className={`relative px-4 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
                                activeTab === tab.componentKey 
                                    ? 'text-primary-600 dark:text-primary-400' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'
                            }`}
                        >
                            {tab.label}
                            {activeTab === tab.componentKey && (
                                <motion.div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400" layoutId="underline" />
                            )}
                        </button>
                    ))}
                </div>
                <div>
                    {renderActiveTab()}
                </div>
            </div>
            
            {isWizardOpen && <ProjectWizard project={project} onClose={() => setIsWizardOpen(false)} onTransitionSuccess={handleTransitionSuccess} />}
        </div>
    );
};