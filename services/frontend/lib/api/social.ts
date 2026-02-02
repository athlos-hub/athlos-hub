"use server";

import {
    AthleteProfile,
    Post,
    Comment,
    CreatePostPayload,
    PageResponse,
    ApiResponse,
} from "@/types/social";

const SOCIAL_SERVICE_URL = process.env.SOCIAL_SERVICE_URL || "http://localhost:8083";

async function callSocialService<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    params?: Record<string, string | number | boolean>
): Promise<T> {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/lib/auth");
    
    const session = await getServerSession(authOptions);
    
    console.log('Session:', session ? 'exists' : 'null');
    console.log('Access Token:', session?.accessToken ? 'exists' : 'missing');
    
    const queryString = params ? '?' + new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
    ).toString() : '';
    
    const url = `${SOCIAL_SERVICE_URL}/api/social${endpoint}${queryString}`;
    
    console.log('Calling URL:', url);
    
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(session?.accessToken ? { 'Authorization': `Bearer ${session.accessToken}` } : {}),
        },
        ...(data && method !== 'GET' ? { body: JSON.stringify(data) } : {}),
    };
    
    console.log('Headers:', options.headers);
    
    const response = await fetch(url, options);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    return response.json();
}

export async function getMyProfile(): Promise<AthleteProfile> {
    const response = await callSocialService<ApiResponse<AthleteProfile>>('/profile/me');
    return response.data;
}

export async function getProfileByKeycloakId(keycloakId: string): Promise<AthleteProfile> {
    const response = await callSocialService<ApiResponse<AthleteProfile>>(`/profile/${keycloakId}`);
    return response.data;
}

export async function updateMyProfile(updates: Partial<AthleteProfile>): Promise<AthleteProfile> {
    const response = await callSocialService<ApiResponse<AthleteProfile>>('/profile/me', 'PUT', updates);
    return response.data;
}

export async function updateBio(bio: string): Promise<AthleteProfile> {
    const response = await callSocialService<ApiResponse<AthleteProfile>>('/profile/me/bio', 'PUT', { bio });
    return response.data;
}

export async function canPostAsOrganization(slug: string): Promise<boolean> {
    const response = await callSocialService<ApiResponse<boolean>>(`/context/can-post-as-organization/${slug}`);
    return response.data;
}

export async function canPostAsTeam(teamId: string): Promise<boolean> {
    const response = await callSocialService<ApiResponse<boolean>>(`/context/can-post-as-team/${teamId}`);
    return response.data;
}

export async function createOrganizationPost(
    slug: string,
    payload: CreatePostPayload
): Promise<Post> {
    const response = await callSocialService<ApiResponse<Post>>(`/organizations/${slug}/posts`, 'POST', payload);
    return response.data;
}

export async function getOrganizationPosts(
    slug: string,
    page: number = 0,
    size: number = 10
): Promise<PageResponse<Post>> {
    const response = await callSocialService<ApiResponse<PageResponse<Post>>>(
        `/organizations/${slug}/posts`,
        'GET',
        undefined,
        { page, size }
    );
    return response.data;
}

export async function createTeamPost(
    teamId: string,
    payload: CreatePostPayload
): Promise<Post> {
    const response = await callSocialService<ApiResponse<Post>>(`/teams/${teamId}/posts`, 'POST', payload);
    return response.data;
}

export async function getTeamPosts(
    teamId: string,
    page: number = 0,
    size: number = 10
): Promise<PageResponse<Post>> {
    const response = await callSocialService<ApiResponse<PageResponse<Post>>>(
        `/teams/${teamId}/posts`,
        'GET',
        undefined,
        { page, size }
    );
    return response.data;
}

export async function getPublicFeed(
    page: number = 0,
    size: number = 10
): Promise<PageResponse<Post>> {
    const queryString = '?' + new URLSearchParams({
        page: String(page),
        size: String(size),
    }).toString();
    
    const url = `${SOCIAL_SERVICE_URL}/api/social/feed/public${queryString}`;
    
    console.log('Fetching public feed from:', url);
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    
    console.log('Public feed response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Public feed error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data;
}

export async function getFollowingFeed(
    page: number = 0,
    size: number = 10
): Promise<PageResponse<Post>> {
    const response = await callSocialService<ApiResponse<PageResponse<Post>>>(
        '/feed/following',
        'GET',
        undefined,
        { page, size }
    );
    return response.data;
}

export async function deletePost(postId: string, profileType: 'organizations' | 'teams', profileId: string): Promise<void> {
    await callSocialService(`/${profileType}/${profileId}/posts/${postId}`, 'DELETE');
}

export async function addComment(postId: string, content: string): Promise<Comment> {
    const response = await callSocialService<ApiResponse<Comment>>(`/posts/${postId}/comments`, 'POST', { content });
    return response.data;
}

export async function toggleLike(postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const response = await callSocialService<ApiResponse<{ liked: boolean; likesCount: number }>>(
        `/posts/${postId}/like`,
        'POST',
        {}
    );
    return response.data;
}
