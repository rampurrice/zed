import type { Project } from './types.ts';
import { ProjectState } from './types.ts';

type ValidationCheck = (project: Project) => { valid: boolean; message: string };

interface StateDefinition {
  entryCriteria?: string[];
  exitConditions: {
    nextState: ProjectState;
    validations: ValidationCheck[];
    // Add a condition property to handle branching logic (e.g., Pass/Fail)
    condition?: (project: Project) => boolean; 
    label?: string; // e.g., "Pass", "Fail"
  }[];
  validationChecks: {
    description: string;
    check: ValidationCheck;
  }[];
}

const checkUdyam = (project: Project) => ({
    valid: !!project.has_udyam_check,
    message: 'UDYAM check must be completed.'
});

const checkLevelChoice = (project: Project) => ({
    valid: !!project.certification_level,
    message: 'A certification level (Bronze, Silver, or Gold) must be chosen.'
});

const checkManDays = (project: Project) => ({
    valid: project.man_days >= 14,
    message: `Project requires at least 14 man-days. Current: ${project.man_days}.`
});

const checkMsmeSignoff = (project: Project) => ({
    valid: project.has_msme_signoff,
    message: 'MSME sign-off is required.'
});

const checkEvidenceUploaded = (project: Project) => ({
    valid: project.has_evidence_uploaded,
    message: 'Evidence must be uploaded before completion.'
});

const checkAllTasksComplete = (project: Project) => {
    const incompleteTasks = project.action_items?.filter(item => item.status !== 'Complete').length ?? 0;
    return {
        valid: incompleteTasks === 0,
        message: `${incompleteTasks} action item(s) are still pending.`
    };
};

export const projectStateMachine: Record<string, StateDefinition> = {
  [ProjectState.ClientOnboarding]: {
    entryCriteria: ["Start of the ZED process. Collect initial client information and documentation."],
    exitConditions: [{ nextState: ProjectState.InitialConsult, validations: [] }],
    validationChecks: []
  },
  [ProjectState.InitialConsult]: {
    entryCriteria: ["Conduct the first meeting with the client to understand their business, objectives, and current challenges."],
    exitConditions: [{ nextState: ProjectState.BusinessReview, validations: [] }],
    validationChecks: []
  },
  [ProjectState.BusinessReview]: {
    entryCriteria: ["Perform a detailed review of the client's existing processes, systems, and documentation against the UDYAM registration."],
    exitConditions: [{ nextState: ProjectState.LevelChoice, validations: [checkUdyam] }],
    validationChecks: [{ description: 'UDYAM Check Completed', check: checkUdyam }]
  },
  [ProjectState.LevelChoice]: {
    entryCriteria: ["Based on the initial review, the client decides on the target certification level: Bronze, Silver, or Gold."],
    exitConditions: [{ nextState: ProjectState.GapAnalysis, validations: [checkLevelChoice] }],
    validationChecks: [{ description: 'Certification Level Selected', check: checkLevelChoice }]
  },
  [ProjectState.GapAnalysis]: {
    entryCriteria: [
        "Conduct a detailed analysis based on the chosen certification level.",
        "Bronze Level (5 Core Parameters): Focuses on Leadership, Swacch Workplace, Workplace Safety, Measurement of Timely Delivery, and Quality Management. Emphasizes establishing basic quality foundations.",
        "Silver Level (14 Parameters): Expands on Bronze with a focus on Systems.",
        "Gold Level (20 Parameters): Aims for overall Excellence across all business functions."
    ],
    exitConditions: [{ nextState: ProjectState.RoadmapPlanning, validations: [] }],
    validationChecks: []
  },
  [ProjectState.RoadmapPlanning]: {
    entryCriteria: ["Develop a strategic roadmap, set priorities, create a timeline, and plan resources based on the gap analysis."],
    exitConditions: [{ nextState: ProjectState.Implementation, validations: [] }],
    validationChecks: []
  },
  [ProjectState.Implementation]: {
    entryCriteria: ["Execute the action plan. This involves designing processes, integrating systems, training staff, and documenting all changes."],
    exitConditions: [{ nextState: ProjectState.CertificationApplication, validations: [checkAllTasksComplete] }],
    validationChecks: [{ description: "All action plan tasks completed.", check: checkAllTasksComplete }]
  },
  [ProjectState.CertificationApplication]: {
    entryCriteria: ["Prepare and submit the formal certification application to the relevant authorities."],
    exitConditions: [{ nextState: ProjectState.DesktopReview, validations: [] }],
    validationChecks: []
  },
  [ProjectState.DesktopReview]: {
    entryCriteria: ["Authorities conduct a review of the submitted application and documentation."],
    exitConditions: [{ nextState: ProjectState.SiteVisit, validations: [] }],
    validationChecks: []
  },
  [ProjectState.SiteVisit]: {
    entryCriteria: ["An on-site visit or audit is conducted by assessors to verify implementation and compliance."],
    exitConditions: [{ nextState: ProjectState.CertificationDecision, validations: [] }],
    validationChecks: []
  },
  [ProjectState.CertificationDecision]: {
    entryCriteria: ["Awaiting the final pass/fail decision from the certification body."],
    exitConditions: [
      { 
        nextState: ProjectState.Certified, 
        validations: [checkManDays, checkMsmeSignoff, checkEvidenceUploaded],
        label: "Pass"
      },
      { 
        nextState: ProjectState.IssuesToFix, 
        validations: [],
        label: "Fail"
      },
    ],
    validationChecks: [
        { description: "Minimum 14 man-days logged.", check: checkManDays },
        { description: "MSME sign-off obtained.", check: checkMsmeSignoff },
        { description: "Final evidence uploaded.", check: checkEvidenceUploaded },
    ]
  },
  [ProjectState.IssuesToFix]: {
    entryCriteria: ["Address the issues identified during the certification process."],
    exitConditions: [{ nextState: ProjectState.CertificationApplication, validations: [] }],
    validationChecks: []
  },
  [ProjectState.Certified]: {
    entryCriteria: ["Congratulations! The client has received their ZED certification."],
    exitConditions: [{ nextState: ProjectState.OngoingSupport, validations: [] }],
    validationChecks: []
  },
  [ProjectState.OngoingSupport]: {
    entryCriteria: ["Provide continuous support, conduct annual reviews, and help the client improve continuously."],
    exitConditions: [
        { nextState: ProjectState.Complete, validations: [], label: "Maintain Status" },
        { nextState: ProjectState.GapAnalysis, validations: [], label: "Upgrade Certification" }
    ],
    validationChecks: []
  },
  [ProjectState.Complete]: {
    entryCriteria: ["The project is complete and the client is maintaining their certification status."],
    exitConditions: [], // Terminal state
    validationChecks: []
  },
   [ProjectState.OnHold]: {
    entryCriteria: ["Project is currently on hold."],
    exitConditions: [],
    validationChecks: []
  },
};