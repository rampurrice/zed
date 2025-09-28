

import React from 'react';
import { ProjectState } from '../types';

interface StateBadgeProps {
    state: ProjectState;
}

export const StateBadge: React.FC<StateBadgeProps> = ({ state }) => {
    const colors: Record<string, string> = {
        // Phase 1: Assessment
        [ProjectState.ClientOnboarding]: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
        [ProjectState.InitialConsult]: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
        [ProjectState.BusinessReview]: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
        [ProjectState.LevelChoice]: 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300 font-semibold',
        
        // Phase 2 & 3: Analysis & Planning
        [ProjectState.GapAnalysis]: 'bg-primary-50 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
        [ProjectState.RoadmapPlanning]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        
        // Phase 4: Implementation
        [ProjectState.Implementation]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        
        // Phase 5: Certification
        [ProjectState.CertificationApplication]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        [ProjectState.DesktopReview]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        [ProjectState.SiteVisit]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        [ProjectState.CertificationDecision]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 font-semibold',
        
        // Phase 6 & End States
        [ProjectState.Certified]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [ProjectState.OngoingSupport]: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
        [ProjectState.Complete]: 'bg-green-200 text-green-900 dark:bg-green-500/30 dark:text-green-200 font-bold',
        
        // Off-track states
        [ProjectState.IssuesToFix]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [ProjectState.OnHold]: 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300 italic',
    };
    return (
        <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${colors[state] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'}`}>
            {state}
        </span>
    );
};