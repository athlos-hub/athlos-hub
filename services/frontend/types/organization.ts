export enum MemberStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  INVITED = "INVITED",
  BANNED = "BANNED",
}

export enum OrganizationStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  REJECTED = "REJECTED",
  SUSPENDED = "SUSPENDED",
  EXCLUDED = "EXCLUDED",
}

export enum OrganizationPrivacy {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

export enum OrganizationJoinPolicy {
  INVITE_ONLY = "INVITE_ONLY",
  REQUEST_ONLY = "REQUEST_ONLY",
  LINK_ONLY = "LINK_ONLY",
  INVITE_AND_REQUEST = "INVITE_AND_REQUEST",
  INVITE_AND_LINK = "INVITE_AND_LINK",
  REQUEST_AND_LINK = "REQUEST_AND_LINK",
  ALL = "ALL",
}

export enum OrgRole {
  OWNER = "OWNER",
  ORGANIZER = "ORGANIZER",
  MEMBER = "MEMBER",
}

export interface UserOrgMember {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface OrganizationBase {
  name: string;
  description: string | null;
  logo_url: string | null;
  privacy: OrganizationPrivacy;
}

export interface OrganizationCreate {
  name: string;
  description?: string;
  privacy: OrganizationPrivacy;
  logo?: File;
}

export interface OrganizationUpdate {
  name?: string;
  description?: string;
  logo_url?: string;
  privacy?: OrganizationPrivacy;
  join_policy?: OrganizationJoinPolicy;
}

export interface OrganizationGetPublic extends OrganizationBase {
  id: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export interface OrganizationResponse extends OrganizationGetPublic {
  status: OrganizationStatus;
  join_policy: OrganizationJoinPolicy | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationWithRole extends OrganizationGetPublic {
  role: string;
}

export interface OrganizationAdminWithRole extends OrganizationResponse {
  role: string;
}

export interface OrganizationMemberResponse {
  id: string;
  user: UserOrgMember;
  status: MemberStatus;
  joined_at: string;
  is_owner: boolean;
}

export interface MembersListResponse {
  total: number;
  members: OrganizationMemberResponse[];
}

export interface OrganizerResponse {
  id: string;
  user: UserOrgMember;
  added_at: string;
}

export type OrganizationOrganizerResponse = OrganizerResponse;

export interface OrganizersListResponse {
  total: number;
  organizers: OrganizerResponse[];
}

export interface PendingMemberRequest {
  id: string;
  user: UserOrgMember;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
}

export interface PendingRequestsResponse {
  total: number;
  requests: PendingMemberRequest[];
}

export interface TeamOverviewResponse {
  owner: UserOrgMember;
  organizers: OrganizerResponse[];
  members: OrganizationMemberResponse[];
  total_members: number;
  total_organizers: number;
  created_at: string;
}

export interface UpdateJoinPolicyRequest {
  join_policy: OrganizationJoinPolicy;
}

export interface TransferOwnershipRequest {
  new_owner_id: string;
}

export type OrganizationListItem = OrganizationWithRole | OrganizationAdminWithRole;

export interface OrganizationFormData {
  name: string;
  description: string;
  privacy: OrganizationPrivacy;
  logo?: File | null;
}

export interface OrganizationSettingsFormData {
  name: string;
  description: string;
  privacy: OrganizationPrivacy;
  join_policy: OrganizationJoinPolicy;
  logo?: File | null;
}
