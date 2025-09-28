
import React, { useState } from 'react';
import type { Project, Client, ProjectHubTab } from '../types';
import { KnowledgeBase } from './KnowledgeBase';
import { BaselineReportGenerator } from './BaselineReportGenerator';
import { CompletionReportGenerator } from './CompletionReportGenerator';
import { StateBadge } from './StateBadge';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ProjectWizard } from './ProjectWizard';
import { ProjectState } from '../types';

interface ProjectHubProps {
    project: Project;
    client: Client;
    onBack: () => void;
    onProjectUpdate: (updatedProject: Project) => void;
}

const TABS: ProjectHubTab[] = ['Knowledge Base', 'Auto-Writer', 'Final Report'];

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
        // Wizard closes itself, but also ensure state is aligned
        setIsWizardOpen(false);
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Hub Header */}
            <div>
                 <button onClick={onBack} className="flex items-center text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4">
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Back to All Projects
                </button>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-lg">
                    <div>
                        <div className="flex items-center space-x-4">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{client.name}</h1>
                            <StateBadge state={project.current_state} />
                        </div>
                        <p className="text-slate-500">Project Hub</p>
                    </div>
                    {project.current_state !== ProjectState.Complete && (
                        <button 
                            onClick={() => setIsWizardOpen(true)}
                            className="bg-primary-600 text-white font-semibold py-2 px-5 rounded-md shadow-sm hover:bg-primary-700 focus:outline-none"
                        >
                           Advance to Next Stage...
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-lg">
                <div className="flex border-b border-gray-200">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-sm font-semibold transition-colors focus:outline-none ${
                                activeTab === tab 
                                    ? 'text-primary-600 border-b-2 border-primary-600' 
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {tab}
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
