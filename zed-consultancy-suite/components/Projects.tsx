import React, { useState, useEffect } from 'react';
import type { Project } from '../types';
import { ProjectState } from '../types';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { supabase } from '../lib/supabaseClient';
import { StateBadge } from './StateBadge';
import { motion } from 'framer-motion';

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
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);


    if (isLoading) {
        return <div className="p-6 text-center text-slate-500 dark:text-slate-400 animate-fade-in">Loading projects...</div>;
    }

    return (
      <div className="animate-fade-in">
        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tighter">Project Workflow Management</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2 mb-8 max-w-2xl">Track ZED projects through their lifecycle. Select a project to view its hub.</p>

        <div className="bg-white dark:bg-slate-800 shadow-md rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                  <ClipboardDocumentListIcon className="h-6 w-6 mr-3 text-primary-600 dark:text-primary-400"/>
                  All Projects ({projectList.length})
              </h3>
          </div>
          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Client</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Current State</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Due Date</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                      {projectList.map(project => (
                          <motion.tr 
                            key={project.id} 
                            className="transition-colors"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            whileHover={{ backgroundColor: 'rgba(46, 134, 193, 0.1)' }}
                            transition={{ duration: 0.2 }}
                          >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{project.client_name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400"><StateBadge state={project.current_state} /></td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(project.milestone_due_date).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                  <motion.button 
                                      onClick={() => onSelectProject(project)} 
                                      className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 font-semibold"
                                      whileHover={{ scale: 1.1, textDecoration: 'underline' }}
                                      whileTap={{ scale: 0.95 }}
                                  >
                                    View Hub
                                  </motion.button>
                              </td>
                          </motion.tr>
                      ))}
                  </tbody>
              </table>
          </div>
        </div>
      </div>
  );
}