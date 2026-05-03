export interface Wound {
    _id: string;
    patient: string;
    name: string;
    bodyPart?: string;
    woundType: 'cut' | 'burn' | 'scratch' | 'bruise' | 'other';
    description?: string;
    initialSeverity: number;
    currentSeverity: number;
    status: 'active' | 'healed' | 'worsening';
    lastUpdated: string;
    reminderEnabled: boolean;
    initialImagePath?: string;
    latestImagePath?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Analysis {
    _id: string;
    wound?: string;
    symptomId?: string;
    createdAt: string;
    summary: string;
    severityScore: number;
    provider: string;
    model?: string;
    imagePath: string;
    notes?: string;
    insights: {
        label: string;
        detail: string;
    }[];
    recommendations: string[];
}

export interface TrackRequest {
    _id: string;
    doctor: {
        _id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    patient: {
        _id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    status: 'pending' | 'accepted' | 'rejected';
    message?: string;
    createdAt: string;
    respondedAt?: string;
}

export interface User {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'patient' | 'doctor';
    lastLoginAt?: string;
}

export interface PatientWithStatus extends User {
    highestSeverity: number;
    highestSeverityWound?: Wound;
    activeWoundsCount: number;
}

export interface SummarySnapshot {
    totalAnalyses: number;
    averageSeverity: number;
    providerMix: (string | null)[];
}

export interface ProgressPoint {
    date: string;
    severity: number;
    analysisId?: string;
}

export type ProgressData = ProgressPoint[];

export interface WoundProgress {
    wound: {
        id: string;
        name: string;
        initialSeverity: number;
        currentSeverity: number;
        status: string;
    };
    progress: ProgressPoint[];
}
