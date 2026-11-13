/**
 * The two HandoverPulse projects. Trans-Shield details come only from its five supplied reference
 * documents; SkyGrid has no supplied documents yet, so its unknown details stay empty and the UI shows
 * "Not provided yet". Do not add facts here that are not in a supplied source.
 *
 * Reference document bytes live in private Cloud storage (bucket "project-documents" at `storagePath`)
 * and are only served by /api/project-files after the quiz + email OTP check passes.
 */
import type { AppNotification, Project } from "./types";

export const TRANS_SHIELD_ID = "trans-shield-ai";
export const SKYGRID_ID = "skygrid-ai";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Same-origin, access-checked URL for a reference document. */
const fileUrl = (projectId: string, docId: string) => `/api/project-files/${projectId}/${docId}`;

const SRC = {
  pdf: "TRANS-SHIELD AI Complete Project Reference.pdf",
  md: "TRANS-SHIELD AI Markdown Documentation",
  arch: "System Architecture and Security Governance.docx",
  backend: "Backend and AI RAG Pipeline.docx",
  frontend: "Frontend and SCADA Interface.docx",
};

const transShield: Project = {
  id: TRANS_SHIELD_ID,
  shortName: "TRANS SHIELD AI",
  name: "TRANS SHIELD AI SMART POWER GRID MONITORING AND PREDICTIVE PROTECTION",
  description:
    "An edge-monitoring, self-healing grid safety system for Distribution Transformers that uses real-time IoT telemetry and RAG-driven AI diagnostics to prevent burnouts, oil breakdown and thermal overloads.",
  status: "in-progress",
  website: "https://wind-guardian-ai-ro85.vercel.app/",
  repository: "https://github.com/zerobugsvcetsih-sketch/zerbugs.git",
  lead: { name: "Synced Sprints", role: "Contributing team" },
  team: [
    { name: "Kaviyadharshini R", role: "Product Researcher & Strategy Lead" },
    { name: "Prasanna M", role: "System Architect & Security Lead" },
    { name: "Mohamed Basheer K", role: "Backend & AI/RAG Engineer" },
    { name: "Ishwarya R", role: "Frontend & Integration Developer" },
  ],
  teamSource: SRC.pdf,
  handoverDate: { value: "November 2026", source: SRC.pdf },
  lifecycle: {
    value: "Telemetry Pipeline & RAG Engine Operational; Automated Relay Cut-Off in Field-Test Phase",
    source: SRC.pdf,
  },
  // The Project Overview text section was removed from this project by request.
  overview: null,
  overviewRemoved: true,
  stack: ["ESP32", "MQ-4 / MQ-7", "DHT22", "ACS712", "MQTT", "Mosquitto", "FastAPI", "PostgreSQL", "pgvector", "Next.js", "RAG assistant"],
  stackSource: SRC.pdf,
  architecture: {
    flow: {
      source: SRC.arch,
      value: ["ESP32 sensors", "MQTT over TLS", "Mosquitto broker", "FastAPI backend", "PostgreSQL + pgvector", "Next.js SCADA UI"],
    },
    layers: {
      source: SRC.md,
      value: [
        { name: "Edge Sensing", detail: "ESP32 reads analog/digital sensors every 2s and packages telemetry JSON payloads." },
        {
          name: "Ingestion",
          detail: "Data published via Mosquitto MQTT broker over TLS on transformer/{substation_id}/{dtr_id}/telemetry.",
        },
        {
          name: "Application & AI",
          detail: "Asynchronous FastAPI backend writes logs to PostgreSQL and triggers vector search (pgvector) on anomaly flags.",
        },
        { name: "Presentation", detail: "Next.js SCADA dashboard streams live feeds via WebSockets." },
      ],
    },
    hardware: {
      source: SRC.pdf,
      value: [
        { component: "MQ-4 & MQ-7 Gas", pin: "GPIO 34 / 35", logic: "Detects methane and CO gases from mineral oil breakdown. Warning: 150 ppm; Critical trip: 300 ppm." },
        { component: "DS18B20 / DHT22", pin: "GPIO 4", logic: "Monitors top-oil temperature. Cooling fan trip: 75°C; Emergency trip alert: 95°C." },
        { component: "ACS712 / CT Sensor", pin: "GPIO 32", logic: "Measures RMS current to detect overloads (>110% rated kVA) and sudden short circuits." },
        { component: "Relay Module", pin: "GPIO 26", logic: "Actuates shunt-trip breaker coil upon critical fault consensus." },
      ],
    },
    security: {
      source: SRC.arch,
      value: [
        "Transport encryption: MQTT communication encrypted via TLS v1.3.",
        "API authentication: JSON Web Tokens (JWT) with 15-minute access token expiration and HTTP-only refresh cookies.",
        "Data isolation: Row-Level Security (RLS) policies on PostgreSQL tables based on user substation mapping.",
      ],
    },
    access: {
      source: SRC.arch,
      value: {
        headers: ["Operation / Resource", "Field Technician", "Utility SCADA Operator", "System Admin"],
        rows: [
          ["View Live Telemetry", "Restricted (Assigned Substation)", "Full Substation Access", "Full Access"],
          ["Log Inspection Form", "Read / Write", "Read Only", "Full Access"],
          ["Execute Emergency Relay Trip", "No", "Read / Write", "Read / Write"],
          ["Manage RBAC / User Accounts", "No", "No", "Read / Write"],
        ],
      },
    },
    ai: {
      source: SRC.backend,
      value: [
        "FastAPI embeds anomaly signatures and queries manual_embeddings using pgvector similarity search.",
        "Every diagnostic chatbot answer must cite the specific manual and section (e.g. [IEEE C57.104, Sec 4.2]).",
        "If cosine distance exceeds 0.28 (similarity confidence below 0.72), auto-generation halts and a “Knowledge Gap Detected” alert requests manual engineering evaluation.",
      ],
    },
    frontend: {
      source: SRC.frontend,
      value: [
        "Next.js App Router with operator (SCADA real-time overview), technician (inspection & maintenance forms) and admin (user management & diagnostics) dashboards.",
        "Components: TelemetryGauge, SCADAOverviewMap and AIChatbotWidget; telemetry streamed over WebSockets.",
        "Inspection forms validate oil sample readings against threshold limits; offline logs sync via Service Workers on reconnect.",
      ],
    },
  },
  decisions: [
    {
      source: SRC.pdf,
      value:
        "Shift from HTTP to MQTT: HTTP POST polling caused 18% packet loss under network stress. The team migrated to event-driven MQTT Pub/Sub, reducing payload overhead by 75% and achieving sub-300ms alert delivery.",
    },
    {
      source: SRC.md,
      value:
        "Uncertainty fallback: below a 0.72 similarity score the system outputs “Knowledge Gap / Manual Engineering Review Required” instead of unverified diagnostic steps.",
    },
  ],
  developmentStatus: {
    done: {
      source: SRC.md,
      value: [
        "ESP32 pin wiring",
        "Sensor payload structure",
        "MQTT ingestion broker setup",
        "FastAPI database logging",
        "pgvector manual embedding search",
      ],
    },
    inProgress: {
      source: SRC.md,
      value: [
        "Field stress-testing the high-voltage automated relay cut-off loop under thermal runaway conditions",
        "Calibrating gas sensor thresholds in real environments",
      ],
    },
  },
  pendingTasks: [
    {
      source: SRC.pdf,
      value: "Stress-test the automated high-voltage relay cut-off loop under simulated thermal runaway conditions",
    },
    { source: SRC.pdf, value: "Complete field calibration for the MQ-4 / MQ-7 gas thresholds" },
  ],
  blockers: [],
  toConfirm: [
    "The frontend gauge sample marks oil temperature above 85°C as “CRITICAL OVERHEAT”, while the hardware specification lists 75°C (fan) and 95°C (emergency trip).",
    "The schema in the PDF reference omits the load_current_a and installed_at columns that appear in the architecture document and Markdown file.",
  ],
  milestones: [],
  documents: [
    {
      id: "ts-backend-rag",
      name: "Backend and AI RAG Pipeline.docx",
      downloadName: "Backend and AI RAG Pipeline.docx",
      kind: "doc",
      typeLabel: "Word (DOCX)",
      mimeType: DOCX_MIME,
      sizeBytes: 8498,
      url: fileUrl(TRANS_SHIELD_ID, "ts-backend-rag"),
      storagePath: `${TRANS_SHIELD_ID}/Backend and AI RAG Pipeline.docx`,
      addedAt: "2026-11-11",
      description:
        "FastAPI async telemetry endpoint and MQTT worker, pgvector similarity search, and the strict source-citation and knowledge-gap rules. Owner: Mohamed Basheer K.",
    },
    {
      id: "ts-frontend-scada",
      name: "Frontend and SCADA Interface.docx",
      downloadName: "Frontend and SCADA Interface.docx",
      kind: "doc",
      typeLabel: "Word (DOCX)",
      mimeType: DOCX_MIME,
      sizeBytes: 8570,
      url: fileUrl(TRANS_SHIELD_ID, "ts-frontend-scada"),
      storagePath: `${TRANS_SHIELD_ID}/Frontend and SCADA Interface.docx`,
      addedAt: "2026-11-11",
      description:
        "Next.js App Router structure for operator, technician and admin dashboards, a live telemetry gauge sample, and inspection-form validation with offline sync. Owner: Ishwarya R.",
    },
    {
      id: "ts-markdown",
      name: SRC.md,
      downloadName: "TRANS-SHIELD AI Markdown Documentation.md",
      kind: "text",
      typeLabel: "Markdown (MD)",
      mimeType: "text/markdown",
      sizeBytes: 4377,
      url: fileUrl(TRANS_SHIELD_ID, "ts-markdown"),
      storagePath: `${TRANS_SHIELD_ID}/TRANS-SHIELD AI Markdown Documentation.md`,
      addedAt: "2026-11-11",
      description:
        "Markdown handover file: lifecycle status, team ownership, architecture layers and decisions, sensor configuration, PostgreSQL schema and RAG citation rules.",
    },
    {
      id: "ts-architecture-security",
      name: "System Architecture and Security Governance.docx",
      downloadName: "System Architecture and Security Governance.docx",
      kind: "doc",
      typeLabel: "Word (DOCX)",
      mimeType: DOCX_MIME,
      sizeBytes: 9010,
      url: fileUrl(TRANS_SHIELD_ID, "ts-architecture-security"),
      storagePath: `${TRANS_SHIELD_ID}/System Architecture and Security Governance.docx`,
      addedAt: "2026-11-11",
      description:
        "Microservice topology, PostgreSQL relational and vector schema, role-based access matrix, and security governance (TLS 1.3, JWT, row-level security). Owner: Prasanna M.",
    },
    {
      id: "ts-master-project-overview",
      name: "TRANS-SHIELD_AI_-_Master_Project_Overview.pdf",
      downloadName: "TRANS-SHIELD_AI_-_Master_Project_Overview.pdf",
      kind: "pdf",
      typeLabel: "PDF",
      mimeType: "application/pdf",
      sizeBytes: 163075,
      url: fileUrl(TRANS_SHIELD_ID, "ts-master-project-overview"),
      storagePath: `${TRANS_SHIELD_ID}/TRANS-SHIELD_AI_-_Master_Project_Overview.pdf`,
      addedAt: "2026-11-12",
      description:
        "Three-page Smart India Hackathon project reference: project specifications, development team, core hardware, software stack, lifecycle status and executive summary.",
    },
    {
      id: "ts-dead-end-ledger",
      name: "TRANS-SHIELD_AI_Dead-End_Ledger.docx",
      downloadName: "TRANS-SHIELD_AI_Dead-End_Ledger.docx",
      kind: "doc",
      typeLabel: "Word (DOCX)",
      mimeType: DOCX_MIME,
      sizeBytes: 9209,
      url: fileUrl(TRANS_SHIELD_ID, "ts-dead-end-ledger"),
      storagePath: `${TRANS_SHIELD_ID}/TRANS-SHIELD_AI_Dead-End_Ledger.docx`,
      addedAt: "2026-11-12",
      description:
        "Dead-end ledger and engineering lessons learned: failed approaches, technical issues, why earlier attempts failed, solutions already tried and approaches to avoid repeating.",
    },
  ],
  quiz: [
    {
      id: "q1",
      prompt: "Why did the team move sensor transmission from HTTP POST polling to MQTT?",
      options: [
        "HTTP polling caused 18% packet loss under network stress",
        "MQTT was required by the ESP32 firmware",
        "HTTP could not carry JSON payloads",
        "To reduce hardware cost",
      ],
      answerIndex: 0,
      explanation: "The decision log records 18% packet loss with HTTP; MQTT cut payload overhead by 75% with sub-300ms alerts.",
    },
    {
      id: "q2",
      prompt: "At what gas concentration does the critical trip happen?",
      options: ["75 ppm", "150 ppm", "300 ppm", "500 ppm"],
      answerIndex: 2,
      explanation: "MQ-4 / MQ-7 warning is 150 ppm and the critical trip is 300 ppm (hardware pinout table).",
    },
    {
      id: "q3",
      prompt: "What does the RAG engine do when similarity confidence drops below 0.72?",
      options: [
        "Answers with its best guess",
        "Halts auto-generation and asks for manual engineering review",
        "Trips the relay automatically",
        "Retries with a larger model",
      ],
      answerIndex: 1,
      explanation: "The uncertainty fallback raises a Knowledge Gap alert instead of generating unverified diagnostic steps.",
    },
    {
      id: "q4",
      prompt: "What is the immediate priority for the incoming team?",
      options: [
        "Rewriting the SCADA dashboard",
        "Switching the broker away from Mosquitto",
        "Stress-testing the relay cut-off under simulated thermal runaway",
        "Adding a mobile app",
      ],
      answerIndex: 2,
      explanation: "The reference names relay cut-off stress-testing and MQ-4/MQ-7 field calibration as the next steps.",
    },
  ],
};

const skyGrid: Project = {
  id: SKYGRID_ID,
  shortName: "SkyGrid AI",
  name: "SkyGrid AI: Satellite-Driven Energy Optimization and Dual-Layer Predictive Transformer Protection for a Smarter Grid",
  description: "Project overview not provided yet. Add project documents under Project Files to build its handover knowledge.",
  status: "in-progress",
  website: "https://project-companion-eight.vercel.app/automation",
  repository: "https://github.com/syncedsprints/project-companion",
  team: [],
  overview: null,
  stack: [],
  architecture: null,
  decisions: [],
  developmentStatus: null,
  pendingTasks: [],
  blockers: [],
  toConfirm: [],
  milestones: [],
  documents: [],
  quiz: [],
};

export const projects: Project[] = [transShield, skyGrid];

/** No notifications have been recorded for these projects yet. */
export const notifications: AppNotification[] = [];

export function getProject(id: string) {
  return projects.find((p) => p.id === id);
}

export function getDocument(projectId: string, documentId: string) {
  return getProject(projectId)?.documents.find((d) => d.id === documentId);
}
