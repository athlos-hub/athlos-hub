export interface User {
    id: string;
    username: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
}

export interface UserOrgMember extends User {
    email: string;
}

export interface UserAdmin extends UserOrgMember {
    enabled: boolean;
    email_verified: boolean;
    keycloak_id: string;
    created_at: string;
    updated_at: string;
    roles?: string[];
    is_admin?: boolean;
}
