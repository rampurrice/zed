
import React, { useState, useCallback, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { motion, AnimatePresence, type Transition } from "framer-motion";

import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { AssessmentForm } from "./components/AssessmentForm";
import { AnalysisDisplay } from "./components/AnalysisDisplay";
import { Loader } from "./components/Loader";
import { analyzeAssessment } from "./services/geminiService";

import type { AssessmentData, GeminiAnalysis, Client, Page, Project } from "./types";
import { ProjectState } from "./types";

import { PlusIcon } from "./components/icons/PlusIcon";

import { Auth } from "./components/Auth";
import { ClientManager } from "./components/ClientManager";
import { Projects } from "./components/Projects";
import { Dashboard } from "./components/Dashboard";
import { ProjectHub } from "./components/ProjectHub";
import { NewClientModal } from "./components/NewClientModal";
import { useNotification } from "./hooks/useNotification";

import { supabase } from "./lib/supabaseClient";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition: Transition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4,
};

const App: React.FC = () => {
  // ----- App State -----
  const [session, setSession] = useState<Session | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>("Dashboard");

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingClients, setIsFetchingClients] = useState(true);

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);

  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { addNotification } = useNotification();

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem("theme") as "light" | "dark" | null;
      if (stored) return stored;
      if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
    }
    return "light";
  });

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(theme === "light" ? "dark" : "light");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // ----- Auth -----
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ----- Fetch Clients + Projects & Realtime -----
  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    const fetchAll = async () => {
      setIsFetchingClients(true);
      try {
        const { data: cData, error: cErr } = await supabase.from("clients").select("*");
        if (cErr) throw cErr;
        if (!cancelled) {
          setClients(cData || []);
          if ((cData?.length ?? 0) > 0 && !selectedClientId) setSelectedClientId(cData![0].id);
        }

        const { data: pData, error: pErr } = await supabase.from("projects").select("*");
        if (pErr) throw pErr;
        if (!cancelled) setProjects(pData || []);
      } catch (e: any) {
        if (!cancelled) {
          addNotification(`Failed to fetch data: ${e.message}`, "error");
          console.error(e);
        }
      } finally {
        if (!cancelled) setIsFetchingClients(false);
      }
    };

    fetchAll();

    // realtime updates for projects
    const channel = supabase
      .channel("realtime:projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (payload) => {
        setProjects((prev) => {
          if (payload.eventType === "INSERT") return [...prev, payload.new as Project];
          if (payload.eventType === "UPDATE") {
             const updatedProject = payload.new as Project;
             // Also update the selected project if it's the one being changed
             if (selectedProject && selectedProject.id === updatedProject.id) {
                setSelectedProject(updatedProject);
             }
             return prev.map((p) => (p.id === updatedProject.id ? updatedProject : p));
          }
          if (payload.eventType === "DELETE")
            return prev.filter((p) => p.id !== (payload.old as Project).id);
          return prev;
        });
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session, selectedProject]);

  // ----- Assessment / AI flows -----
  const handleAssessmentSubmit = useCallback(
    async (data: Omit<AssessmentData, "clientName">) => {
      const client = clients.find((c) => c.id === selectedClientId);
      if (!client) {
        addNotification("Please select a valid client.", "error");
        return;
      }
      setIsLoading(true);
      setAnalysis(null);
      try {
        const result = await analyzeAssessment({ ...data, clientName: client.name });
        setAnalysis(result);
      } catch (err) {
        console.error(err);
        addNotification("Failed to generate AI analysis. Please check your connection/API key and try again.", "error");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedClientId, clients, addNotification]
  );

  const handleResetAssessment = useCallback(() => {
    setAnalysis(null);
  }, []);

  const handleCreateProject = useCallback(
    async (newAnalysis: GeminiAnalysis) => {
      const client = clients.find((c) => c.id === selectedClientId);
      if (!client || !session?.user) return;

      const payload = {
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
          .from("projects")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;

        addNotification(`Project for "${client.name}" created successfully.`, "success");
        setProjects((prev) => [...prev, newProject]);
        handleResetAssessment();
        handleSelectProject(newProject);
      } catch (e: any) {
        addNotification(`Failed to create project: ${e.message}`, "error");
        console.error(e);
      }
    },
    [clients, selectedClientId, session, handleResetAssessment, addNotification]
  );

  // ----- Project selection & updates -----
  const handleSelectProject = (project: Project) => {
    setCurrentPage("Projects");
    setSelectedProject(project);
  };

  const handleBackToProjects = () => setSelectedProject(null);

  const handleProjectUpdate = async (updatedProject: Project) => {
    try {
      const { id, user_id, ...updateData } = updatedProject;
      const { data: newUpdatedProject, error } = await supabase
        .from("projects")
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      addNotification(`Project "${newUpdatedProject.client_name}" updated.`, "info");
      setProjects((prev) => prev.map((p) => (p.id === newUpdatedProject.id ? newUpdatedProject : p)));
      setSelectedProject(newUpdatedProject);
    } catch (e: any) {
      addNotification(`Failed to update project: ${e.message}`, "error");
      console.error(e);
    }
  };

  const handleSaveNewClient = async (clientData: Omit<Client, "id" | "user_id">) => {
    if (!session?.user) return;
    try {
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert({ ...clientData, user_id: session.user.id })
        .select()
        .single();
      if (error) throw error;

      setClients((prev) => [...prev, newClient]);
      setSelectedClientId(newClient.id);
      setIsAddClientModalOpen(false);
      addNotification(`Client "${newClient.name}" created successfully.`, "success", 6000, [
        {
          label: "Start Assessment",
          onClick: () => {
            setCurrentPage("New Assessment");
            setSelectedClientId(newClient.id);
          }
        }
      ]);
    } catch (e: any) {
      addNotification(`Failed to save client: ${e.message}`, "error");
      console.error(e);
    }
  };

  // ----- Page renderers -----
  const renderPage = () => {
    switch (currentPage) {
      case "New Assessment":
        return (
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tighter">
              New MSME ZED Assessment
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 mb-8 max-w-2xl">
              Fill in the details below to generate an AI-powered compliance analysis for a selected client.
            </p>

            {isFetchingClients ? (
              <div className="flex items-center justify-center p-4">
                <Loader />
              </div>
            ) : clients.length > 0 ? (
              <div className="mb-8 p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md">
                <label
                  htmlFor="client-select"
                  className="block text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3"
                >
                  Select Client
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select
                    id="client-select"
                    value={selectedClientId || ""}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="flex-1 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} — {client.industry}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
                <p className="text-slate-600 dark:text-slate-400 mb-4">No clients found. Please add a client to begin.</p>
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

            {!isLoading && (analysis && clients.find((c) => c.id === selectedClientId) ? (
              <AnalysisDisplay
                analysis={analysis}
                onReset={handleResetAssessment}
                client={clients.find((c) => c.id === selectedClientId)!}
                onCreateProject={handleCreateProject}
              />
            ) : (
              clients.length > 0 && selectedClientId && <AssessmentForm onSubmit={handleAssessmentSubmit} />
            ))}
          </div>
        );
      case "Clients":
        return <ClientManager clients={clients} onAddNewClient={() => setIsAddClientModalOpen(true)} />;
      case "Dashboard":
        return <Dashboard />;
      case "Projects":
        return <Projects projects={projects} onSelectProject={handleSelectProject} />;
      default:
        return <Dashboard />;
    }
  };

  const renderMainContent = () => {
    const key = selectedProject ? selectedProject.id : currentPage;
    return (
      <AnimatePresence mode="wait">
        <motion.div key={key} variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}>
          {selectedProject ? (
            (() => {
              const client = clients.find((c) => c.id === selectedProject.client_id);
              if (!client) {
                return (
                  <div className="p-4 text-center text-red-500 dark:text-red-400">
                    Error: Client data for this project could not be found.
                    <button onClick={handleBackToProjects} className="mt-2 text-sm font-semibold text-primary-700 dark:text-primary-400">
                      Go Back
                    </button>
                  </div>
                );
              }
              return <ProjectHub project={selectedProject} client={client} onBack={handleBackToProjects} onProjectUpdate={handleProjectUpdate} />;
            })()
          ) : (
            renderPage()
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  if (!session) return <Auth />;

  return (
    <div className="min-h-screen font-sans bg-slate-50 dark:bg-slate-900">
      <Header session={session} theme={theme} toggleTheme={toggleTheme} />
      <div
        className={`grid h-[calc(100vh-64px)] transition-all ${
          isSidebarCollapsed ? "grid-cols-[80px_minmax(0,1fr)]" : "grid-cols-[256px_minmax(0,1fr)]"
        }`}
      >
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        <main role="main" className="relative overflow-y-auto p-6 sm:p-8 lg:p-10">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <Loader />
            </div>
          )}
          <div className="max-w-7xl mx-auto">{renderMainContent()}</div>
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