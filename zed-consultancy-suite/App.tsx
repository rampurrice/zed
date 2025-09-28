import React, { useState, useCallback, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AssessmentForm } from './components/AssessmentForm';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { Loader } from './components/Loader';
import { analyzeAssessment } from './services/geminiService';
import type { AssessmentData, GeminiAnalysis, Client, Page, Project } from './types';
import { AlertTriangleIcon } from './components/icons/AlertTriangleIcon';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabaseClient';
import { ClientManager } from './components/ClientManager';
import { Projects } from './components/Projects';
import { Dashboard } from './components/Dashboard';
import { ProjectHub } from './components/ProjectHub';
import { ProjectState } from './types';
import { NewClientModal } from './components/NewClientModal';
import { PlusIcon } from './components/icons/PlusIcon';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition: Transition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingClients, setIsFetchingClients] = useState<boolean>(true);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (storedTheme) return storedTheme;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
    }
    return 'light';
  });

  const toggleTheme = () => {
      setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      const fetchClientsAndProjects = async () => {
        setIsFetchingClients(true);
        setError(null);
        try {
          const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('*');
          if (clientsError) throw clientsError;
          setClients(clientsData || []);
          if (clientsData && clientsData.length > 0 && !selectedClientId) {
            setSelectedClientId(clientsData[0].id);
          }

          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select('*');
          if (projectsError) throw projectsError;
          setProjects(projectsData || []);

        } catch (e: any) {
          setError(`Failed to fetch data: ${e.message}`);
          console.error(e);
        } finally {
          setIsFetchingClients(false);
        }
      };
      
      fetchClientsAndProjects();

      const channel = supabase.channel('realtime projects');
      channel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
              if (payload.eventType === 'UPDATE') {
                  setProjects(prev => prev.map(p => p.id === (payload.new as Project).id ? payload.new as Project : p));
              } else if (payload.eventType === 'INSERT') {
                  setProjects(prev => [...prev, payload.new as Project]);
              } else if (payload.eventType === 'DELETE') {
                  setProjects(prev => prev.filter(p => p.id !== (payload.old as Project).id));
              }
          })
          .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
    }
  }, [session, selectedClientId]);

  const handleAssessmentSubmit = useCallback(async (data: Omit<AssessmentData, 'clientName'>) => {
    const selectedClient = clients.find(c => c.id === selectedClientId);
    if (!selectedClient) {
        setError("Please select a valid client.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await analyzeAssessment({ ...data, clientName: selectedClient.name });
      setAnalysis(result);
    } catch (err) {
      console.error("Error generating analysis:", err);
      setError("Failed to generate AI analysis. Please check your connection or API key and try again.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClientId, clients]);

  const handleResetAssessment = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);
  
  const handleCreateProject = async (newAnalysis: GeminiAnalysis) => {
      const client = clients.find(c => c.id === selectedClientId);
      if (!client || !session?.user) return;

      const projectPayload = {
          client_id: client.id,
          user_id: session.user.id,
          client_name: client.name,
          current_state: ProjectState.ClientOnboarding,
          man_days: 0,
          has_msme_signoff: false,
          has_evidence_uploaded: false,
          milestone_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          action_items: [] as any[],
          initial_analysis: newAnalysis,
          has_udyam_check: false,
      };

      try {
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert(projectPayload)
          .select()
          .single();

        if (error) throw error;
        
        setProjects(prev => [...prev, newProject]);
        handleResetAssessment();
        handleSelectProject(newProject);
      } catch (e: any) {
        setError(`Failed to create project: ${e.message}`);
        console.error(e);
      }
  };

  const handleSelectProject = (project: Project) => {
    setCurrentPage('Projects');
    setSelectedProject(project);
  };
  
  const handleBackToProjects = () => {
      setSelectedProject(null);
  };
  
  const handleProjectUpdate = async (updatedProject: Project) => {
      try {
        const { id, user_id, ...updateData } = updatedProject;
        const { data: newUpdatedProject, error } = await supabase
            .from('projects')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
            
        if (error) throw error;
        
        setProjects(prev => prev.map(p => p.id === newUpdatedProject.id ? newUpdatedProject : p));
        setSelectedProject(newUpdatedProject);
    } catch (e: any) {
        setError(`Failed to update project: ${e.message}`);
        console.error(e);
    }
  };

  const handleSaveNewClient = async (clientData: Omit<Client, 'id' | 'user_id'>) => {
    if (!session?.user) return;
    try {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({ ...clientData, user_id: session.user.id })
        .select()
        .single();
      
      if (error) throw error;

      setClients(prev => [...prev, newClient]);
      setSelectedClientId(newClient.id);
      setIsAddClientModalOpen(false);
    } catch (e: any) {
      setError(`Failed to save client: ${e.message}`);
      console.error(e);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
        case 'New Assessment':
            return (
                <div>
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tighter">New MSME ZED Assessment</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2 mb-8 max-w-2xl">Fill in the details below to generate an AI-powered compliance analysis for a selected client.</p>

                    {isFetchingClients ? ( <div className="flex items-center justify-center p-4"><Loader /></div>
                    ) : clients.length > 0 ? (
                        <div className="mb-8 p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md">
                            <label htmlFor="client-select" className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">Select Client</label>
                            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
                                <select id="client-select" value={selectedClientId || ''} onChange={(e) => setSelectedClientId(e.target.value)}
                                    className="flex-1 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm pl-4 pr-10 py-3 text-left cursor-default focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                                >
                                    {clients.map((client) => ( <option key={client.id} value={client.id}>{client.name} - {client.industry}</option> ))}
                                </select>
                                <motion.button
                                    type="button"
                                    onClick={() => setIsAddClientModalOpen(true)}
                                    className="flex-shrink-0 w-full sm:w-auto flex items-center justify-center text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 px-4 py-3 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-700/50 transition-colors"
                                    aria-label="Add new client"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <PlusIcon className="h-5 w-5 mr-2" />
                                    New Client
                                </motion.button>
                            </div>
                        </div>
                    ) : ( 
                        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md"> 
                            <p className="text-slate-600 dark:text-slate-400 mb-4">No clients found. Please add a client to begin an assessment.</p>
                             <motion.button
                                type="button"
                                onClick={() => setIsAddClientModalOpen(true)}
                                className="inline-flex items-center text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                whileHover={{ scale: 1.05, transition: { duration: 0.1 } }}
                                whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                            >
                                <PlusIcon className="h-5 w-5 mr-2" />
                                Add Your First Client
                            </motion.button>
                        </div> 
                    )}

                    {isLoading ? ( <Loader />
                    ) : (
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -20, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -20, height: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 p-4 rounded-md mb-6"
                          role="alert"
                        >
                          <div className="flex">
                            <div className="flex-shrink-0"> <AlertTriangleIcon className="h-5 w-5 text-red-400 dark:text-red-500" /> </div>
                            <div className="ml-3">
                              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                              <button onClick={handleResetAssessment} className="mt-2 text-sm font-semibold text-red-800 dark:text-red-300 hover:text-red-600 dark:hover:text-red-100"> Try Again </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    )}

                    { !isLoading && !error && (analysis && clients.find(c => c.id === selectedClientId) ? (
                        <AnalysisDisplay analysis={analysis} onReset={handleResetAssessment} client={clients.find(c => c.id === selectedClientId)!} onCreateProject={handleCreateProject} />
                    ) : (
                        clients.length > 0 && selectedClientId && <AssessmentForm onSubmit={handleAssessmentSubmit} />
                    ))}
                </div>
            );
        case 'Clients':
            return <ClientManager clients={clients} />;
        case 'Dashboard':
            return <Dashboard />;
        case 'Projects':
            return <Projects projects={projects} onSelectProject={handleSelectProject} />;
        default:
            return <Dashboard />;
    }
  };
  
  const renderMainContent = () => {
      const key = selectedProject ? selectedProject.id : currentPage;
      const content = () => {
        if (selectedProject) {
            const client = clients.find(c => c.id === selectedProject.client_id);
            if (!client) {
                return (
                    <div className="p-4 text-center text-red-500 dark:text-red-400">
                        Error: Client data for this project could not be found.
                        <button onClick={handleBackToProjects} className="mt-2 text-sm font-semibold text-primary-700 dark:text-primary-400">Go Back</button>
                    </div>
                );
            }
            return <ProjectHub project={selectedProject} client={client} onBack={handleBackToProjects} onProjectUpdate={handleProjectUpdate} />;
        }
        return renderPage();
      }

      return (
        <AnimatePresence mode="wait">
            <motion.div
                key={key}
                variants={pageVariants}
                initial="initial"
                animate="in"
                exit="out"
                transition={pageTransition}
            >
                {content()}
            </motion.div>
        </AnimatePresence>
      )
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-900">
      <Header session={session} theme={theme} toggleTheme={toggleTheme}/>
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar 
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <main className={`flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
          <div className="max-w-7xl mx-auto">
            {renderMainContent()}
          </div>
        </main>
      </div>
      <NewClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSave={handleSaveNewClient}
      />
    </div>
  );
};

export default App;