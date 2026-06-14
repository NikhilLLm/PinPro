/**
 * AGENT TYPES & INTERFACES
 * PinProject-centric architecture
 * Used by Content, Visual, Layout, Generator and SEO agents
 */

// ─────────────────────────────────────────────
// AGENT RESULT
// ─────────────────────────────────────────────

export interface AgentResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    validationErrors?: string[];
    retryCount?: number;
}

// ─────────────────────────────────────────────
// CONTENT OUTPUT
// ─────────────────────────────────────────────

export interface ContentOutput {
    id: string;

    headline: string;

    steps: string[];

    cta: string;
}

// ─────────────────────────────────────────────
// VISUAL OUTPUT
// ─────────────────────────────────────────────

export interface VisualCandidate {
    id: string;

    url: string;

    prompt: string;

    source:
        | "pexels"
        | "ai"
        | "mixed"
        | "fallback"
        | "user-upload";

    width?: number;
    height?: number;
    aspectRatio?: number;
}

export interface VisualOutput {
    id: string;

    backgroundUrl: string;

    backgroundSource: string;

    description: string;

    candidates?: VisualCandidate[];
}

// ─────────────────────────────────────────────
// LAYOUT OUTPUT
// ─────────────────────────────────────────────

export interface LayoutOutput {
    id: string;
    layoutName: string;
    layoutZones: any;
    reasoning: string;

    candidates?: Array<{
        id: string;
        name: string;
        layoutType?: string;
        columnCount?: number;
        zones: Record<string, any>;
        roleMap?: Record<string, string[]>;
        recommendedStyle?: string;
        description?: string;
    }>;
}

// ─────────────────────────────────────────────
// GENERATOR OUTPUT
// ─────────────────────────────────────────────

export interface GeneratorOutput {
    id: string;

    pinJson: {
        baseImageUrl: string;
        style: string;
        layers: any[];
    };

    pinUrl?: string;
}

// ─────────────────────────────────────────────
// SEO OUTPUT
// ─────────────────────────────────────────────

export interface SEOOutput {
    title: string;

    description: string;

    hashtags: string[];

    keywords: string[];
}

// ─────────────────────────────────────────────
// PLANNER OUTPUT (OPTIONAL)
// Remove later if planner agent is deleted
// ─────────────────────────────────────────────

export interface PlannerOutput {
    topic: string;

    audience: string;

    tone: string;

    confidence: number;

    rationale: string;
}

// ─────────────────────────────────────────────
// CRITIC OUTPUT
// ─────────────────────────────────────────────

export interface CriticOutput {
    isValid: boolean;

    errors: string[];

    warnings: string[];

    score: number;
}

// ─────────────────────────────────────────────
// PIN PROJECT STATE
// Main object stored in DB
// ─────────────────────────────────────────────

export interface PinProjectState {
    projectId: string;

    userId: string;

    topic: string;

    // Generated options
    contentOptions: ContentOutput[];

    layoutOptions: LayoutOutput[];

    backgroundOptions: VisualOutput[];

    // User selections
    selectedContent?: ContentOutput;

    selectedLayout?: LayoutOutput;

    selectedBackground?: VisualOutput;

    // Final outputs
    generatedPins?: GeneratorOutput[];

    seo?: SEOOutput;

    // Optional planner output
    pinIdea?: PlannerOutput;

    createdAt: Date;

    updatedAt: Date;
}

// ─────────────────────────────────────────────
// AGENT CONTEXT
// Passed into every agent
// ─────────────────────────────────────────────

export interface AgentContext {
    userId: string;

    projectId: string;

    project: PinProjectState;

    input: {
        topic?: string;

        prompt?: string;

        selectedContent?: ContentOutput;

        selectedLayout?: LayoutOutput;

        selectedBackground?: VisualOutput;

        approvedContent?: string;

        approvedBackground?: {
            url?: string;
            source?: string;
            description?: string;
        } | null;

        runGenerator?: boolean;
    };
}

// ─────────────────────────────────────────────
// API RESPONSES
// ─────────────────────────────────────────────

export interface CreateProjectResponse {
    projectId: string;

    contentOptions: ContentOutput[];

    layoutOptions: LayoutOutput[];

    backgroundOptions: VisualOutput[];
}

export interface GeneratePinResponse {
    generatedPins: GeneratorOutput[];

    seo: SEOOutput;
}