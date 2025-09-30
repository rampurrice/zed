

export enum ZEDParameter {
  // Bronze Level (Core 5)
  Leadership = "Leadership",
  SwachhWorkplace = "Swachh Workplace",
  WorkplaceSafety = "Workplace Safety",
  MeasurementOfTimelyDelivery = "Measurement of Timely Delivery",
  QualityManagement = "Quality Management",

  // Silver Level (Adds 9 Parameters)
  ProductionPlanning = "Production Planning",
  ProcessControl = "Process Control",
  HumanResourceManagement = "Human Resource Management",
  DesignAndDevelopment = "Design & Development",
  Metrology = "Metrology (Measurement & Calibration)",
  CustomerComplaintRedressal = "Customer Complaint Redressal",
  EnvironmentalManagement = "Environmental Management",
  EnergyManagement = "Energy Management",
  FinancialManagement = "Financial Management",

  // Gold Level (Adds 6 Parameters)
  SupplyChainManagement = "Supply Chain Management",
  RiskManagement = "Risk Management",
  TechnologySelectionAndUpgradation = "Technology Selection & Upgradation",
  NaturalResourceConservation = "Natural Resource Conservation",
  CorporateSocialResponsibility = "Corporate Social Responsibility",
  InnovationManagement = "Innovation Management",
}


export interface AssessmentInput {
  notes: string;
  rating: number;
}

export type AssessmentData = {
  [key in ZEDParameter]: AssessmentInput;
} & { clientName: string };

export interface GeminiAnalysis {
  overallSummary: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: { title: string; steps: string[] }[];
  predictedScore: number;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  contact_person?: string;
  contact_email?: string;
}

export type Page = 'Dashboard' | 'Clients' | 'New Assessment' | 'Projects';

export type ProjectHubTab = 'Knowledge Base' | 'Auto-Writer' | 'Final Report';

// --- RAG & Knowledge Base Types ---

export interface RAGSource {
  doc_type: string;
  page_no: number;
  content?: string; // Add content for display or debugging
}

export interface RAGResponse {
  answer: string;
  sources: RAGSource[];
  confidence: 'Low' | 'Medium' | 'High';
  recommended_next_steps: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  ragResponse?: RAGResponse; // Kept for non-streaming fallback, but text is primary now
  sources?: RAGSource[]; // For sources extracted from stream
  error?: string;
}


// --- Workflow & Project Management Types ---

export enum ProjectState {
  // Phase 1: Assessment
  ClientOnboarding = 'Client Onboarding',
  InitialConsult = 'Initial Consult',
  BusinessReview = 'Business Review',
  LevelChoice = 'Level Choice',
  
  // Phase 2: Gap Analysis
  GapAnalysis = 'Gap Analysis',

  // Phase 3: Planning
  RoadmapPlanning = 'Roadmap Planning',

  // Phase 4: Implementation
  Implementation = 'Implementation',

  // Phase 5: Certification
  CertificationApplication = 'Certification Application',
  DesktopReview = 'Desktop Review',
  SiteVisit = 'Site Visit',
  CertificationDecision = 'Certification Decision',
  
  // Phase 6 & End States
  Certified = 'Certified',
  OngoingSupport = 'Ongoing Support',
  Complete = 'Complete',
  
  // Off-track/Alternative states
  IssuesToFix = 'Issues to Fix',
  OnHold = 'On Hold',
}

export interface Project {
  id: string; 
  client_id: string;
  user_id: string;
  client_name: string;
  current_state: ProjectState;
  certification_level?: 'Bronze' | 'Silver' | 'Gold';
  has_udyam_check?: boolean;
  udyam_number?: string;
  man_days: number;
  has_msme_signoff: boolean;
  has_evidence_uploaded: boolean;
  milestone_due_date: string; // ISO date string
  action_items: ActionItem[];
  created_at: string;
  updated_at: string;
  initial_analysis: GeminiAnalysis | null;
}

// --- Baseline Report Auto-Writer Types ---

export interface SuggestedReference {
  documentName: string;
  description: string;
}

export interface GapDetail {
  gapDescription: string;
  recommendedImprovements: string[];
  estimatedTimeToClose: string;
  suggestedReferences: SuggestedReference[];
}

export interface ParameterAnalysis {
  parameter: string;
  summary: string;
  gaps: GapDetail[];
}

export interface BaselineReport {
  projectName: string;
  sector: string;
  certificationLevel: string;
  overallSummary: string;
  parameters: ParameterAnalysis[];
}

// --- Action Plan Generator Types ---

export interface ActionItem {
  id: string; // Add an ID for drag-and-drop
  zedParameter: string;
  activity: string;
  responsiblePerson: string;
  toolsAndTechnology: string[];
  estimatedCost: string;
  estimatedManDays: number;
  status: 'Pending' | 'Complete';
}

export interface ActionPlan {
  projectName: string;
  overallStrategy: string;
  actionItems: ActionItem[];
}

// --- Final Completion Report Types ---
export interface EvidenceItem {
  documentName: string;
  documentHash: string;
  description: string;
  citation: string;
}

export interface ReviewFeedback {
  reviewer: string;
  date: string;
  feedbackSummary: string;
}

export interface CompletionReport {
  msmeName: string;
  projectId: string;
  certificationLevelAchieved: string;
  reportDate: string;
  executiveSummary: string;
  baselineSummary: string;
  actionPlanSummary: string;
  reviewSummaries: ReviewFeedback[];
  evidenceList: EvidenceItem[];
  finalRecommendation: string;
}

// --- Analytics Dashboard Types ---
export interface ConsultantLoad {
  consultantName: string;
  activeProjects: number;
}
export interface MilestoneTiming {
  milestone: ProjectState;
  averageDays: number;
}
export interface DeadlineCompliance {
  onTime: number;
  overdue: number;
}
export interface ManDaysComparison {
  totalPlanned: number;
  totalLogged: number;
}
export interface SuccessRate {
  sector: string;
  successPercentage: number;
}
export interface AnalyticsData {
  consultantLoad: ConsultantLoad[];
  milestoneTimings: MilestoneTiming[];
  deadlineCompliance: DeadlineCompliance;
  manDaysComparison: ManDaysComparison;
  successRatesBySector: SuccessRate[];
}

// --- Notification System Types ---
export type NotificationType = 'success' | 'error' | 'info';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
  actions?: NotificationAction[];
}
