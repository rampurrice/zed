
import React, { useState, useEffect } from 'react';
import type { Project } from '../types';
import { ProjectState } from '../types';
import { projectStateMachine } from '../lib/stateMachine';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ClockIcon } from './icons/ClockIcon';

interface ProjectWizardProps {
  project: Project;
  onClose: () => void;
  onTransitionSuccess: (updatedProject: Project) => void;
}

const PHASES = [
  'Assessment',
  'Analysis',
  'Planning',
  'Implementation',
  'Certification',
  'Complete',
];

const stateToPhaseMapping: Record<string, string> = {
  [ProjectState.ClientOnboarding]: 'Assessment',
  [ProjectState.InitialConsult]: 'Assessment',
  [ProjectState.BusinessReview]: 'Assessment',
  [ProjectState.LevelChoice]: 'Assessment',
  [ProjectState.GapAnalysis]: 'Analysis',
  [ProjectState.RoadmapPlanning]: 'Planning',
  [ProjectState.Implementation]: 'Implementation',
  [ProjectState.CertificationApplication]: 'Certification',
  [ProjectState.DesktopReview]: 'Certification',
  [ProjectState.SiteVisit]: 'Certification',
  [ProjectState.CertificationDecision]: 'Certification',
  [ProjectState.Certified]: 'Complete',
  [ProjectState.OngoingSupport]: 'Complete',
  [ProjectState.Complete]: 'Complete',
  [ProjectState.IssuesToFix]: 'Certification',
  [ProjectState.OnHold]: 'On Hold',
};


const ProgressBar: React.FC<{ currentState: ProjectState }> = ({ currentState }) => {
    const currentPhase = stateToPhaseMapping[currentState] || '';
    const currentIndex = PHASES.indexOf(currentPhase);

    return (
        <div className="flex items-center">
            {PHASES.map((phase, index) => (
                <React.Fragment key={phase}>
                    <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                            index <= currentIndex ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-300 text-slate-500'
                        }`}>
                            {index < currentIndex ? '✓' : '●'}
                        </div>
                        <p className={`mt-2 text-xs text-center w-20 ${
                             index <= currentIndex ? 'font-semibold text-primary-600' : 'text-slate-500'
                        }`}>{phase}</p>
                    </div>
                    {index < PHASES.length - 1 && (
                        <div className={`flex-1 h-1 mx-2 transition-colors duration-300 ${
                            index < currentIndex ? 'bg-primary-600' : 'bg-gray-300'
                        }`}></div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

const SlaTimer: React.FC<{ dueDate: string }> = ({ dueDate }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(dueDate) - +new Date();
        let timeLeft: { text: string; color: string } = { text: '', color: '' };

        if (difference > 0) {
            const days = Math.ceil(difference / (1000 * 60 * 60 * 24));
            timeLeft = {
                text: `${days} day${days !== 1 ? 's' : ''} remaining`,
                color: days > 7 ? 'text-green-700 bg-green-100' : 'text-amber-700 bg-amber-100',
            };
        } else {
            const days = Math.abs(Math.floor(difference / (1000 * 60 * 60 * 24)));
            timeLeft = {
                text: `${days} day${days !== 1 ? 's' : ''} overdue`,
                color: 'text-red-700 bg-red-100',
            };
        }
        return timeLeft;
    };

    const [timeLeft] = useState(calculateTimeLeft());

    return (
        <div className={`inline-flex items-center text-sm font-semibold p-2 rounded-md text-center ${timeLeft.color}`}>
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>Milestone Due: {new Date(dueDate).toLocaleDateString()} ({timeLeft.text})</span>
        </div>
    );
};


export const ProjectWizard: React.FC<ProjectWizardProps> = ({ project, onClose, onTransitionSuccess }) => {
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [mockProject, setMockProject] = useState<Project>({ ...project });
    
    useEffect(() => {
        setIsConfirmed(false);
        setMockProject({ ...project });
    }, [project]);

    const stateDef = projectStateMachine[project.current_state];
    if (!stateDef) {
        return <div>Error: State definition not found for {project.current_state}</div>;
    }

    const nextTransitions = stateDef.exitConditions;

    const handleTransition = async (transition: typeof nextTransitions[0]) => {
        if (!transition) return;
        
        setIsTransitioning(true);
        setError(null);
        
        setTimeout(() => {
            const validationFailures: string[] = [];
            for (const validation of transition.validations) {
                const result = validation(mockProject);
                if (!result.valid) {
                    validationFailures.push(result.message);
                }
            }

            if (validationFailures.length > 0) {
                setError({ message: 'Validation checks failed. Cannot transition state.', details: validationFailures });
                setIsTransitioning(false);
            } else {
                const updatedProject = { ...mockProject, current_state: transition.nextState };
                onTransitionSuccess(updatedProject);
                onClose();
            }
        }, 1000);
    };
    
    const IncompleteTasksList: React.FC<{ project: Project }> = ({ project }) => {
        const incomplete = project.action_items.filter(item => item.status === 'Pending');
        if (incomplete.length === 0) return null;
        return (
            <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded-md border border-amber-200">
                <p className="font-semibold">Pending Tasks:</p>
                <ul className="list-disc list-inside ml-2">
                    {incomplete.map(item => <li key={item.id}>{item.activity}</li>)}
                </ul>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-slate-900">Project Workflow: {project.client_name}</h2>
                    <p className="text-sm text-slate-500">Current Stage: <span className="font-semibold">{project.current_state}</span></p>
                </div>
                
                <div className="p-6">
                    <div className="mb-6">
                        <ProgressBar currentState={project.current_state} />
                    </div>
                    
                    <div className="mb-6 flex justify-center">
                        <SlaTimer dueDate={project.milestone_due_date} />
                    </div>
                    
                    {nextTransitions.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-md border">
                            <h3 className="font-semibold text-slate-800 mb-3">Next Stage Criteria</h3>
                           
                            {stateDef.validationChecks.length > 0 ? (
                                <>
                                    <p className="text-sm text-slate-600 mb-3">The following criteria must be met to proceed:</p>
                                    <ul className="space-y-3">
                                        {stateDef.validationChecks.map(({ description, check }, index) => {
                                            const result = check(mockProject);
                                            const isTaskCheck = description.includes('action plan tasks');
                                            return (
                                                <li key={index} className="text-sm">
                                                    <div className="flex items-center">
                                                        {result.valid ? 
                                                            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" /> : 
                                                            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                                                        }
                                                        <span className={result.valid ? 'text-slate-600' : 'text-slate-800 font-medium'}>{description}</span>
                                                    </div>
                                                    {!result.valid && isTaskCheck && <IncompleteTasksList project={mockProject} />}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    {/* Mock controls to satisfy validation */}
                                    <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                                        {project.current_state === ProjectState.BusinessReview && (
                                             <label className="flex items-center">
                                                <input type="checkbox" checked={mockProject.has_udyam_check} onChange={e => setMockProject(p => ({...p, has_udyam_check: e.target.checked}))} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                <span className="ml-2 text-slate-700">Simulate UDYAM Check Completion</span>
                                            </label>
                                        )}
                                        {project.current_state === ProjectState.LevelChoice && (
                                            <div className="flex items-center space-x-4">
                                                <span className="text-slate-700">Simulate Level Choice:</span>
                                                {['Bronze', 'Silver', 'Gold'].map(level => (
                                                     <label key={level} className="flex items-center">
                                                        <input type="radio" name="level" value={level} checked={mockProject.certification_level === level} onChange={() => setMockProject(p => ({...p, certification_level: level as any}))} className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500" />
                                                        <span className="ml-2 text-slate-700">{level}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-600 mb-3">The purpose of the next stage is to:</p>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 mb-4">
                                        {(projectStateMachine[nextTransitions[0].nextState]?.entryCriteria || []).map((criterion, i) => <li key={i}>{criterion}</li>)}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 bg-red-50 border border-red-300 text-red-800 p-3 rounded-md text-sm">
                            <p className="font-semibold">{error.message}</p>
                            {error.details && <ul className="list-disc list-inside mt-1">{error.details.map((d, i) => <li key={i}>{d}</li>)}</ul>}
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end items-center rounded-b-xl space-x-3">
                    <button onClick={onClose} className="text-sm font-medium text-slate-600 hover:text-slate-800 px-4 py-2 rounded-md">Cancel</button>
                    {nextTransitions.length > 0 ? (
                        nextTransitions.map(transition => {
                            const allChecksPassed = transition.validations.every(v => v(mockProject).valid);
                            return (
                                <button
                                    key={transition.nextState}
                                    onClick={() => handleTransition(transition)}
                                    disabled={isTransitioning || !allChecksPassed}
                                    className="bg-primary-600 text-white font-semibold py-2 px-5 rounded-md shadow-sm hover:bg-primary-700 focus:outline-none disabled:bg-slate-400 disabled:cursor-not-allowed"
                                >
                                    {isTransitioning ? 'Processing...' : `${transition.label ? `${transition.label} ->` : 'Move to'} ${transition.nextState}`}
                                </button>
                            )
                        })
                    ) : (
                        <span className="text-sm font-medium text-green-600">Project Cycle Complete</span>
                    )}
                </div>
            </div>
        </div>
    );
};