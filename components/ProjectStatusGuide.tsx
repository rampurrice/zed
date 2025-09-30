
import React from 'react';
import type { Project } from '../types';
import { projectStateMachine } from '../lib/stateMachine';
import { InformationCircleIcon } from './icons/InformationCircleIcon';

interface ProjectStatusGuideProps {
    project: Project;
}

export const ProjectStatusGuide: React.FC<ProjectStatusGuideProps> = ({ project }) => {
    const currentStateDef = projectStateMachine[project.current_state];
    if (!currentStateDef || currentStateDef.exitConditions.length === 0) {
        return null;
    }

    const nextStateKey = currentStateDef.exitConditions[0].nextState;
    const nextStateDef = projectStateMachine[nextStateKey];
    
    if (!nextStateDef || !nextStateDef.entryCriteria || nextStateDef.entryCriteria.length === 0) {
        return null;
    }

    const nextStep = nextStateDef.entryCriteria[0];

    return (
        <div className="p-4 bg-primary-50 dark:bg-primary-500/10 rounded-lg border border-primary-200 dark:border-primary-500/20 flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
                <p className="text-sm font-semibold text-primary-800 dark:text-primary-200">Next Step: {nextStateKey}</p>
                <p className="text-sm text-primary-700 dark:text-primary-300">{nextStep}</p>
            </div>
        </div>
    );
};