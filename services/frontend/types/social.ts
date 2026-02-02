export interface AthleteProfile {
    id: string;
    keycloakId: string;
    bio?: string;
    specialization?: string;
    city?: string;
    state?: string;
    country?: string;
    achievements?: Record<string, any>;
    statistics?: Record<string, any>;
    socialLinks?: Record<string, any>;
    followersCount: number;
    followingCount: number;
    achievementsCount: number;
    isVerified: boolean;
    verifiedAt?: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface OrganizationProfile {
    id: string;
    organizationSlug: string;
    description?: string;
    socialLinks?: Record<string, any>;
    followersCount: number;
    postsCount: number;
    isVerified: boolean;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TeamProfile {
    id: string;
    teamId: string;
    organizationSlug: string;
    description?: string;
    socialLinks?: Record<string, any>;
    followersCount: number;
    postsCount: number;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
}

export enum ProfileType {
    ATHLETE = 'ATHLETE',
    ORGANIZATION = 'ORGANIZATION',
    TEAM = 'TEAM'
}

export enum PostType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE',
    VIDEO = 'VIDEO',
    ACHIEVEMENT = 'ACHIEVEMENT',
    EVENT = 'EVENT',
    TRAINING = 'TRAINING',
    ANNOUNCEMENT = 'ANNOUNCEMENT',
    SHARED = 'SHARED'
}

export enum PostVisibility {
    PUBLIC = 'PUBLIC',
    FOLLOWERS = 'FOLLOWERS',
    PRIVATE = 'PRIVATE',
    MEMBERS_ONLY = 'MEMBERS_ONLY'
}

export interface Post {
    id: string;
    profileType: ProfileType;
    profileId: string;
    createdByKeycloakId: string;
    content: string;
    mediaUrls?: string[];
    metadata?: Record<string, any>;
    type: PostType;
    visibility: PostVisibility;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Comment {
    id: string;
    keycloakId: string;
    postId: string;
    content: string;
    likesCount: number;
    isEdited: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProfileContext {
    organizations: string[];
    canPostAsOrganization: (slug: string) => Promise<boolean>;
    canPostAsTeam: (teamId: string) => Promise<boolean>;
}

export interface CreatePostPayload extends Record<string, unknown> {
    content: string;
    mediaUrls?: string[];
    type?: PostType;
    visibility?: PostVisibility;
    metadata?: Record<string, any>;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
}

export interface ApiResponse<T> {
    data: T;
    message?: string;
    timestamp: string;
}
