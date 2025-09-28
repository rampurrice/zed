
import React, { useState, useEffect } from 'react';
import type { Project } from '../types';
import { ProjectState } from '../types';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { supabase } from '../lib/supabaseClient';
import { StateBadge } from './StateBadge';

interface ProjectsProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
}

export const Projects: React.FC<ProjectsProps> = ({ projects, onSelectProject }) => {
    const [projectList, setProjectList] = useState<Project[]>(projects);
    const [isLoading, setIsLoading] = useState(projects.length === 0);

    useEffect(() => {
        setProjectList(projects);
        if (projects.length > 0) {
            setIsLoading(false);
        }
    }, [projects]);

    useEffect(() => {
        const channel = supabase.channel('realtime projects');
        channel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
                 console.log('Change received!', payload);
                 // In a real app with a DB, you would refetch or update state here
                 // For this mock app, we'll log it.
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);


    if (isLoading) {
        return <div className="p-6 text-center text-slate-500 animate-fade-in">Loading projects...</div>;
    }

    return (
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Workflow Management</h1>
        <p className="text-slate-600 mt-1 mb-8">Track ZED projects through their lifecycle. Select a project to view its hub.</p>

        <div className="bg-white shadow-lg rounded-xl">
          <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-slate-700 flex items-center">
                  <ClipboardDocumentListIcon className="h-6 w-6 mr-2 text-primary-600"/>
                  All Projects ({projectList.length})
              </h3>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current State</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {projectList.map(project => (
                          <tr key={project.id} className="hover:bg-primary-50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{project.client_name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><StateBadge state={project.current_state} /></td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(project.milestone_due_date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                  <button onClick={() => onSelectProject(project)} className="text-primary-600 hover:text-primary-800 font-semibold">View Hub</button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        </div>
      </div>
  );
}
