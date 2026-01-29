--
-- PostgreSQL database dump
--

\restrict jWWKPqraIvQu4JhijmWz4aIl1N77GY2Uib6PtE6jF1PidxZjA42Si2FA4WVqKhn

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_event_entity; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.admin_event_entity (
    id character varying(36) NOT NULL,
    admin_event_time bigint,
    realm_id character varying(255),
    operation_type character varying(255),
    auth_realm_id character varying(255),
    auth_client_id character varying(255),
    auth_user_id character varying(255),
    ip_address character varying(255),
    resource_path character varying(2550),
    representation text,
    error character varying(255),
    resource_type character varying(64)
);


ALTER TABLE public.admin_event_entity OWNER TO keycloak;

--
-- Name: associated_policy; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.associated_policy (
    policy_id character varying(36) NOT NULL,
    associated_policy_id character varying(36) NOT NULL
);


ALTER TABLE public.associated_policy OWNER TO keycloak;

--
-- Name: authentication_execution; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.authentication_execution (
    id character varying(36) NOT NULL,
    alias character varying(255),
    authenticator character varying(36),
    realm_id character varying(36),
    flow_id character varying(36),
    requirement integer,
    priority integer,
    authenticator_flow boolean DEFAULT false NOT NULL,
    auth_flow_id character varying(36),
    auth_config character varying(36)
);


ALTER TABLE public.authentication_execution OWNER TO keycloak;

--
-- Name: authentication_flow; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.authentication_flow (
    id character varying(36) NOT NULL,
    alias character varying(255),
    description character varying(255),
    realm_id character varying(36),
    provider_id character varying(36) DEFAULT 'basic-flow'::character varying NOT NULL,
    top_level boolean DEFAULT false NOT NULL,
    built_in boolean DEFAULT false NOT NULL
);


ALTER TABLE public.authentication_flow OWNER TO keycloak;

--
-- Name: authenticator_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.authenticator_config (
    id character varying(36) NOT NULL,
    alias character varying(255),
    realm_id character varying(36)
);


ALTER TABLE public.authenticator_config OWNER TO keycloak;

--
-- Name: authenticator_config_entry; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.authenticator_config_entry (
    authenticator_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.authenticator_config_entry OWNER TO keycloak;

--
-- Name: broker_link; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.broker_link (
    identity_provider character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL,
    broker_user_id character varying(255),
    broker_username character varying(255),
    token text,
    user_id character varying(255) NOT NULL
);


ALTER TABLE public.broker_link OWNER TO keycloak;

--
-- Name: client; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client (
    id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    full_scope_allowed boolean DEFAULT false NOT NULL,
    client_id character varying(255),
    not_before integer,
    public_client boolean DEFAULT false NOT NULL,
    secret character varying(255),
    base_url character varying(255),
    bearer_only boolean DEFAULT false NOT NULL,
    management_url character varying(255),
    surrogate_auth_required boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    protocol character varying(255),
    node_rereg_timeout integer DEFAULT 0,
    frontchannel_logout boolean DEFAULT false NOT NULL,
    consent_required boolean DEFAULT false NOT NULL,
    name character varying(255),
    service_accounts_enabled boolean DEFAULT false NOT NULL,
    client_authenticator_type character varying(255),
    root_url character varying(255),
    description character varying(255),
    registration_token character varying(255),
    standard_flow_enabled boolean DEFAULT true NOT NULL,
    implicit_flow_enabled boolean DEFAULT false NOT NULL,
    direct_access_grants_enabled boolean DEFAULT false NOT NULL,
    always_display_in_console boolean DEFAULT false NOT NULL
);


ALTER TABLE public.client OWNER TO keycloak;

--
-- Name: client_attributes; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_attributes (
    client_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE public.client_attributes OWNER TO keycloak;

--
-- Name: client_auth_flow_bindings; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_auth_flow_bindings (
    client_id character varying(36) NOT NULL,
    flow_id character varying(36),
    binding_name character varying(255) NOT NULL
);


ALTER TABLE public.client_auth_flow_bindings OWNER TO keycloak;

--
-- Name: client_initial_access; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_initial_access (
    id character varying(36) NOT NULL,
    realm_id character varying(36) NOT NULL,
    "timestamp" integer,
    expiration integer,
    count integer,
    remaining_count integer
);


ALTER TABLE public.client_initial_access OWNER TO keycloak;

--
-- Name: client_node_registrations; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_node_registrations (
    client_id character varying(36) NOT NULL,
    value integer,
    name character varying(255) NOT NULL
);


ALTER TABLE public.client_node_registrations OWNER TO keycloak;

--
-- Name: client_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_scope (
    id character varying(36) NOT NULL,
    name character varying(255),
    realm_id character varying(36),
    description character varying(255),
    protocol character varying(255)
);


ALTER TABLE public.client_scope OWNER TO keycloak;

--
-- Name: client_scope_attributes; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_scope_attributes (
    scope_id character varying(36) NOT NULL,
    value character varying(2048),
    name character varying(255) NOT NULL
);


ALTER TABLE public.client_scope_attributes OWNER TO keycloak;

--
-- Name: client_scope_client; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_scope_client (
    client_id character varying(255) NOT NULL,
    scope_id character varying(255) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


ALTER TABLE public.client_scope_client OWNER TO keycloak;

--
-- Name: client_scope_role_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_scope_role_mapping (
    scope_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


ALTER TABLE public.client_scope_role_mapping OWNER TO keycloak;

--
-- Name: client_session; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session (
    id character varying(36) NOT NULL,
    client_id character varying(36),
    redirect_uri character varying(255),
    state character varying(255),
    "timestamp" integer,
    session_id character varying(36),
    auth_method character varying(255),
    realm_id character varying(255),
    auth_user_id character varying(36),
    current_action character varying(36)
);


ALTER TABLE public.client_session OWNER TO keycloak;

--
-- Name: client_session_auth_status; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session_auth_status (
    authenticator character varying(36) NOT NULL,
    status integer,
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_session_auth_status OWNER TO keycloak;

--
-- Name: client_session_note; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session_note (
    name character varying(255) NOT NULL,
    value character varying(255),
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_session_note OWNER TO keycloak;

--
-- Name: client_session_prot_mapper; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session_prot_mapper (
    protocol_mapper_id character varying(36) NOT NULL,
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_session_prot_mapper OWNER TO keycloak;

--
-- Name: client_session_role; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_session_role (
    role_id character varying(255) NOT NULL,
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_session_role OWNER TO keycloak;

--
-- Name: client_user_session_note; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.client_user_session_note (
    name character varying(255) NOT NULL,
    value character varying(2048),
    client_session character varying(36) NOT NULL
);


ALTER TABLE public.client_user_session_note OWNER TO keycloak;

--
-- Name: component; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.component (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_id character varying(36),
    provider_id character varying(36),
    provider_type character varying(255),
    realm_id character varying(36),
    sub_type character varying(255)
);


ALTER TABLE public.component OWNER TO keycloak;

--
-- Name: component_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.component_config (
    id character varying(36) NOT NULL,
    component_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE public.component_config OWNER TO keycloak;

--
-- Name: composite_role; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.composite_role (
    composite character varying(36) NOT NULL,
    child_role character varying(36) NOT NULL
);


ALTER TABLE public.composite_role OWNER TO keycloak;

--
-- Name: credential; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    user_id character varying(36),
    created_date bigint,
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


ALTER TABLE public.credential OWNER TO keycloak;

--
-- Name: databasechangelog; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.databasechangelog (
    id character varying(255) NOT NULL,
    author character varying(255) NOT NULL,
    filename character varying(255) NOT NULL,
    dateexecuted timestamp without time zone NOT NULL,
    orderexecuted integer NOT NULL,
    exectype character varying(10) NOT NULL,
    md5sum character varying(35),
    description character varying(255),
    comments character varying(255),
    tag character varying(255),
    liquibase character varying(20),
    contexts character varying(255),
    labels character varying(255),
    deployment_id character varying(10)
);


ALTER TABLE public.databasechangelog OWNER TO keycloak;

--
-- Name: databasechangeloglock; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.databasechangeloglock (
    id integer NOT NULL,
    locked boolean NOT NULL,
    lockgranted timestamp without time zone,
    lockedby character varying(255)
);


ALTER TABLE public.databasechangeloglock OWNER TO keycloak;

--
-- Name: default_client_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.default_client_scope (
    realm_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL,
    default_scope boolean DEFAULT false NOT NULL
);


ALTER TABLE public.default_client_scope OWNER TO keycloak;

--
-- Name: event_entity; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.event_entity (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    details_json character varying(2550),
    error character varying(255),
    ip_address character varying(255),
    realm_id character varying(255),
    session_id character varying(255),
    event_time bigint,
    type character varying(255),
    user_id character varying(255),
    details_json_long_value text
);


ALTER TABLE public.event_entity OWNER TO keycloak;

--
-- Name: fed_user_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_attribute (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    value character varying(2024)
);


ALTER TABLE public.fed_user_attribute OWNER TO keycloak;

--
-- Name: fed_user_consent; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


ALTER TABLE public.fed_user_consent OWNER TO keycloak;

--
-- Name: fed_user_consent_cl_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_consent_cl_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE public.fed_user_consent_cl_scope OWNER TO keycloak;

--
-- Name: fed_user_credential; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_credential (
    id character varying(36) NOT NULL,
    salt bytea,
    type character varying(255),
    created_date bigint,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36),
    user_label character varying(255),
    secret_data text,
    credential_data text,
    priority integer
);


ALTER TABLE public.fed_user_credential OWNER TO keycloak;

--
-- Name: fed_user_group_membership; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE public.fed_user_group_membership OWNER TO keycloak;

--
-- Name: fed_user_required_action; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_required_action (
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE public.fed_user_required_action OWNER TO keycloak;

--
-- Name: fed_user_role_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.fed_user_role_mapping (
    role_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    storage_provider_id character varying(36)
);


ALTER TABLE public.fed_user_role_mapping OWNER TO keycloak;

--
-- Name: federated_identity; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.federated_identity (
    identity_provider character varying(255) NOT NULL,
    realm_id character varying(36),
    federated_user_id character varying(255),
    federated_username character varying(255),
    token text,
    user_id character varying(36) NOT NULL
);


ALTER TABLE public.federated_identity OWNER TO keycloak;

--
-- Name: federated_user; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.federated_user (
    id character varying(255) NOT NULL,
    storage_provider_id character varying(255),
    realm_id character varying(36) NOT NULL
);


ALTER TABLE public.federated_user OWNER TO keycloak;

--
-- Name: group_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.group_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    group_id character varying(36) NOT NULL
);


ALTER TABLE public.group_attribute OWNER TO keycloak;

--
-- Name: group_role_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.group_role_mapping (
    role_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


ALTER TABLE public.group_role_mapping OWNER TO keycloak;

--
-- Name: identity_provider; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.identity_provider (
    internal_id character varying(36) NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    provider_alias character varying(255),
    provider_id character varying(255),
    store_token boolean DEFAULT false NOT NULL,
    authenticate_by_default boolean DEFAULT false NOT NULL,
    realm_id character varying(36),
    add_token_role boolean DEFAULT true NOT NULL,
    trust_email boolean DEFAULT false NOT NULL,
    first_broker_login_flow_id character varying(36),
    post_broker_login_flow_id character varying(36),
    provider_display_name character varying(255),
    link_only boolean DEFAULT false NOT NULL
);


ALTER TABLE public.identity_provider OWNER TO keycloak;

--
-- Name: identity_provider_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.identity_provider_config (
    identity_provider_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.identity_provider_config OWNER TO keycloak;

--
-- Name: identity_provider_mapper; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.identity_provider_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    idp_alias character varying(255) NOT NULL,
    idp_mapper_name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE public.identity_provider_mapper OWNER TO keycloak;

--
-- Name: idp_mapper_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.idp_mapper_config (
    idp_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.idp_mapper_config OWNER TO keycloak;

--
-- Name: keycloak_group; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.keycloak_group (
    id character varying(36) NOT NULL,
    name character varying(255),
    parent_group character varying(36) NOT NULL,
    realm_id character varying(36)
);


ALTER TABLE public.keycloak_group OWNER TO keycloak;

--
-- Name: keycloak_role; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.keycloak_role (
    id character varying(36) NOT NULL,
    client_realm_constraint character varying(255),
    client_role boolean DEFAULT false NOT NULL,
    description character varying(255),
    name character varying(255),
    realm_id character varying(255),
    client character varying(36),
    realm character varying(36)
);


ALTER TABLE public.keycloak_role OWNER TO keycloak;

--
-- Name: migration_model; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.migration_model (
    id character varying(36) NOT NULL,
    version character varying(36),
    update_time bigint DEFAULT 0 NOT NULL
);


ALTER TABLE public.migration_model OWNER TO keycloak;

--
-- Name: offline_client_session; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.offline_client_session (
    user_session_id character varying(36) NOT NULL,
    client_id character varying(255) NOT NULL,
    offline_flag character varying(4) NOT NULL,
    "timestamp" integer,
    data text,
    client_storage_provider character varying(36) DEFAULT 'local'::character varying NOT NULL,
    external_client_id character varying(255) DEFAULT 'local'::character varying NOT NULL
);


ALTER TABLE public.offline_client_session OWNER TO keycloak;

--
-- Name: offline_user_session; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.offline_user_session (
    user_session_id character varying(36) NOT NULL,
    user_id character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    created_on integer NOT NULL,
    offline_flag character varying(4) NOT NULL,
    data text,
    last_session_refresh integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.offline_user_session OWNER TO keycloak;

--
-- Name: policy_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.policy_config (
    policy_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value text
);


ALTER TABLE public.policy_config OWNER TO keycloak;

--
-- Name: protocol_mapper; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.protocol_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    protocol character varying(255) NOT NULL,
    protocol_mapper_name character varying(255) NOT NULL,
    client_id character varying(36),
    client_scope_id character varying(36)
);


ALTER TABLE public.protocol_mapper OWNER TO keycloak;

--
-- Name: protocol_mapper_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.protocol_mapper_config (
    protocol_mapper_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.protocol_mapper_config OWNER TO keycloak;

--
-- Name: realm; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm (
    id character varying(36) NOT NULL,
    access_code_lifespan integer,
    user_action_lifespan integer,
    access_token_lifespan integer,
    account_theme character varying(255),
    admin_theme character varying(255),
    email_theme character varying(255),
    enabled boolean DEFAULT false NOT NULL,
    events_enabled boolean DEFAULT false NOT NULL,
    events_expiration bigint,
    login_theme character varying(255),
    name character varying(255),
    not_before integer,
    password_policy character varying(2550),
    registration_allowed boolean DEFAULT false NOT NULL,
    remember_me boolean DEFAULT false NOT NULL,
    reset_password_allowed boolean DEFAULT false NOT NULL,
    social boolean DEFAULT false NOT NULL,
    ssl_required character varying(255),
    sso_idle_timeout integer,
    sso_max_lifespan integer,
    update_profile_on_soc_login boolean DEFAULT false NOT NULL,
    verify_email boolean DEFAULT false NOT NULL,
    master_admin_client character varying(36),
    login_lifespan integer,
    internationalization_enabled boolean DEFAULT false NOT NULL,
    default_locale character varying(255),
    reg_email_as_username boolean DEFAULT false NOT NULL,
    admin_events_enabled boolean DEFAULT false NOT NULL,
    admin_events_details_enabled boolean DEFAULT false NOT NULL,
    edit_username_allowed boolean DEFAULT false NOT NULL,
    otp_policy_counter integer DEFAULT 0,
    otp_policy_window integer DEFAULT 1,
    otp_policy_period integer DEFAULT 30,
    otp_policy_digits integer DEFAULT 6,
    otp_policy_alg character varying(36) DEFAULT 'HmacSHA1'::character varying,
    otp_policy_type character varying(36) DEFAULT 'totp'::character varying,
    browser_flow character varying(36),
    registration_flow character varying(36),
    direct_grant_flow character varying(36),
    reset_credentials_flow character varying(36),
    client_auth_flow character varying(36),
    offline_session_idle_timeout integer DEFAULT 0,
    revoke_refresh_token boolean DEFAULT false NOT NULL,
    access_token_life_implicit integer DEFAULT 0,
    login_with_email_allowed boolean DEFAULT true NOT NULL,
    duplicate_emails_allowed boolean DEFAULT false NOT NULL,
    docker_auth_flow character varying(36),
    refresh_token_max_reuse integer DEFAULT 0,
    allow_user_managed_access boolean DEFAULT false NOT NULL,
    sso_max_lifespan_remember_me integer DEFAULT 0 NOT NULL,
    sso_idle_timeout_remember_me integer DEFAULT 0 NOT NULL,
    default_role character varying(255)
);


ALTER TABLE public.realm OWNER TO keycloak;

--
-- Name: realm_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_attribute (
    name character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL,
    value text
);


ALTER TABLE public.realm_attribute OWNER TO keycloak;

--
-- Name: realm_default_groups; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_default_groups (
    realm_id character varying(36) NOT NULL,
    group_id character varying(36) NOT NULL
);


ALTER TABLE public.realm_default_groups OWNER TO keycloak;

--
-- Name: realm_enabled_event_types; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_enabled_event_types (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.realm_enabled_event_types OWNER TO keycloak;

--
-- Name: realm_events_listeners; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_events_listeners (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.realm_events_listeners OWNER TO keycloak;

--
-- Name: realm_localizations; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_localizations (
    realm_id character varying(255) NOT NULL,
    locale character varying(255) NOT NULL,
    texts text NOT NULL
);


ALTER TABLE public.realm_localizations OWNER TO keycloak;

--
-- Name: realm_required_credential; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_required_credential (
    type character varying(255) NOT NULL,
    form_label character varying(255),
    input boolean DEFAULT false NOT NULL,
    secret boolean DEFAULT false NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE public.realm_required_credential OWNER TO keycloak;

--
-- Name: realm_smtp_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_smtp_config (
    realm_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE public.realm_smtp_config OWNER TO keycloak;

--
-- Name: realm_supported_locales; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.realm_supported_locales (
    realm_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.realm_supported_locales OWNER TO keycloak;

--
-- Name: redirect_uris; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.redirect_uris (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.redirect_uris OWNER TO keycloak;

--
-- Name: required_action_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.required_action_config (
    required_action_id character varying(36) NOT NULL,
    value text,
    name character varying(255) NOT NULL
);


ALTER TABLE public.required_action_config OWNER TO keycloak;

--
-- Name: required_action_provider; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.required_action_provider (
    id character varying(36) NOT NULL,
    alias character varying(255),
    name character varying(255),
    realm_id character varying(36),
    enabled boolean DEFAULT false NOT NULL,
    default_action boolean DEFAULT false NOT NULL,
    provider_id character varying(255),
    priority integer
);


ALTER TABLE public.required_action_provider OWNER TO keycloak;

--
-- Name: resource_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_attribute (
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255),
    resource_id character varying(36) NOT NULL
);


ALTER TABLE public.resource_attribute OWNER TO keycloak;

--
-- Name: resource_policy; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_policy (
    resource_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


ALTER TABLE public.resource_policy OWNER TO keycloak;

--
-- Name: resource_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_scope (
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE public.resource_scope OWNER TO keycloak;

--
-- Name: resource_server; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server (
    id character varying(36) NOT NULL,
    allow_rs_remote_mgmt boolean DEFAULT false NOT NULL,
    policy_enforce_mode smallint NOT NULL,
    decision_strategy smallint DEFAULT 1 NOT NULL
);


ALTER TABLE public.resource_server OWNER TO keycloak;

--
-- Name: resource_server_perm_ticket; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server_perm_ticket (
    id character varying(36) NOT NULL,
    owner character varying(255) NOT NULL,
    requester character varying(255) NOT NULL,
    created_timestamp bigint NOT NULL,
    granted_timestamp bigint,
    resource_id character varying(36) NOT NULL,
    scope_id character varying(36),
    resource_server_id character varying(36) NOT NULL,
    policy_id character varying(36)
);


ALTER TABLE public.resource_server_perm_ticket OWNER TO keycloak;

--
-- Name: resource_server_policy; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server_policy (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    type character varying(255) NOT NULL,
    decision_strategy smallint,
    logic smallint,
    resource_server_id character varying(36) NOT NULL,
    owner character varying(255)
);


ALTER TABLE public.resource_server_policy OWNER TO keycloak;

--
-- Name: resource_server_resource; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server_resource (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255),
    icon_uri character varying(255),
    owner character varying(255) NOT NULL,
    resource_server_id character varying(36) NOT NULL,
    owner_managed_access boolean DEFAULT false NOT NULL,
    display_name character varying(255)
);


ALTER TABLE public.resource_server_resource OWNER TO keycloak;

--
-- Name: resource_server_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_server_scope (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    icon_uri character varying(255),
    resource_server_id character varying(36) NOT NULL,
    display_name character varying(255)
);


ALTER TABLE public.resource_server_scope OWNER TO keycloak;

--
-- Name: resource_uris; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.resource_uris (
    resource_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.resource_uris OWNER TO keycloak;

--
-- Name: role_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.role_attribute (
    id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255)
);


ALTER TABLE public.role_attribute OWNER TO keycloak;

--
-- Name: scope_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.scope_mapping (
    client_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL
);


ALTER TABLE public.scope_mapping OWNER TO keycloak;

--
-- Name: scope_policy; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.scope_policy (
    scope_id character varying(36) NOT NULL,
    policy_id character varying(36) NOT NULL
);


ALTER TABLE public.scope_policy OWNER TO keycloak;

--
-- Name: user_attribute; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_attribute (
    name character varying(255) NOT NULL,
    value character varying(255),
    user_id character varying(36) NOT NULL,
    id character varying(36) DEFAULT 'sybase-needs-something-here'::character varying NOT NULL
);


ALTER TABLE public.user_attribute OWNER TO keycloak;

--
-- Name: user_consent; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_consent (
    id character varying(36) NOT NULL,
    client_id character varying(255),
    user_id character varying(36) NOT NULL,
    created_date bigint,
    last_updated_date bigint,
    client_storage_provider character varying(36),
    external_client_id character varying(255)
);


ALTER TABLE public.user_consent OWNER TO keycloak;

--
-- Name: user_consent_client_scope; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_consent_client_scope (
    user_consent_id character varying(36) NOT NULL,
    scope_id character varying(36) NOT NULL
);


ALTER TABLE public.user_consent_client_scope OWNER TO keycloak;

--
-- Name: user_entity; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_entity (
    id character varying(36) NOT NULL,
    email character varying(255),
    email_constraint character varying(255),
    email_verified boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    federation_link character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    realm_id character varying(255),
    username character varying(255),
    created_timestamp bigint,
    service_account_client_link character varying(255),
    not_before integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.user_entity OWNER TO keycloak;

--
-- Name: user_federation_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_federation_config (
    user_federation_provider_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE public.user_federation_config OWNER TO keycloak;

--
-- Name: user_federation_mapper; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_federation_mapper (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    federation_provider_id character varying(36) NOT NULL,
    federation_mapper_type character varying(255) NOT NULL,
    realm_id character varying(36) NOT NULL
);


ALTER TABLE public.user_federation_mapper OWNER TO keycloak;

--
-- Name: user_federation_mapper_config; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_federation_mapper_config (
    user_federation_mapper_id character varying(36) NOT NULL,
    value character varying(255),
    name character varying(255) NOT NULL
);


ALTER TABLE public.user_federation_mapper_config OWNER TO keycloak;

--
-- Name: user_federation_provider; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_federation_provider (
    id character varying(36) NOT NULL,
    changed_sync_period integer,
    display_name character varying(255),
    full_sync_period integer,
    last_sync integer,
    priority integer,
    provider_name character varying(255),
    realm_id character varying(36)
);


ALTER TABLE public.user_federation_provider OWNER TO keycloak;

--
-- Name: user_group_membership; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_group_membership (
    group_id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL
);


ALTER TABLE public.user_group_membership OWNER TO keycloak;

--
-- Name: user_required_action; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_required_action (
    user_id character varying(36) NOT NULL,
    required_action character varying(255) DEFAULT ' '::character varying NOT NULL
);


ALTER TABLE public.user_required_action OWNER TO keycloak;

--
-- Name: user_role_mapping; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_role_mapping (
    role_id character varying(255) NOT NULL,
    user_id character varying(36) NOT NULL
);


ALTER TABLE public.user_role_mapping OWNER TO keycloak;

--
-- Name: user_session; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_session (
    id character varying(36) NOT NULL,
    auth_method character varying(255),
    ip_address character varying(255),
    last_session_refresh integer,
    login_username character varying(255),
    realm_id character varying(255),
    remember_me boolean DEFAULT false NOT NULL,
    started integer,
    user_id character varying(255),
    user_session_state integer,
    broker_session_id character varying(255),
    broker_user_id character varying(255)
);


ALTER TABLE public.user_session OWNER TO keycloak;

--
-- Name: user_session_note; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.user_session_note (
    user_session character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(2048)
);


ALTER TABLE public.user_session_note OWNER TO keycloak;

--
-- Name: username_login_failure; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.username_login_failure (
    realm_id character varying(36) NOT NULL,
    username character varying(255) NOT NULL,
    failed_login_not_before integer,
    last_failure bigint,
    last_ip_failure character varying(255),
    num_failures integer
);


ALTER TABLE public.username_login_failure OWNER TO keycloak;

--
-- Name: web_origins; Type: TABLE; Schema: public; Owner: keycloak
--

CREATE TABLE public.web_origins (
    client_id character varying(36) NOT NULL,
    value character varying(255) NOT NULL
);


ALTER TABLE public.web_origins OWNER TO keycloak;

--
-- Data for Name: admin_event_entity; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.admin_event_entity (id, admin_event_time, realm_id, operation_type, auth_realm_id, auth_client_id, auth_user_id, ip_address, resource_path, representation, error, resource_type) FROM stdin;
\.


--
-- Data for Name: associated_policy; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.associated_policy (policy_id, associated_policy_id) FROM stdin;
785961f5-0d1d-419d-9909-b6c8612adc5b	2eefe5b2-25c3-4079-b8b9-040ad96e203b
\.


--
-- Data for Name: authentication_execution; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.authentication_execution (id, alias, authenticator, realm_id, flow_id, requirement, priority, authenticator_flow, auth_flow_id, auth_config) FROM stdin;
f6d8fa1f-2aaa-4dbb-925e-a9c27340cb70	\N	auth-cookie	05d66952-1021-4a4e-9cfb-23359432e8cf	38efa76e-489f-4f4b-ad15-aba94fc563d5	2	10	f	\N	\N
19b67e75-5794-4cef-a71d-75e97f4134d6	\N	auth-spnego	05d66952-1021-4a4e-9cfb-23359432e8cf	38efa76e-489f-4f4b-ad15-aba94fc563d5	3	20	f	\N	\N
1027a753-cf42-409f-933f-304d28b79823	\N	identity-provider-redirector	05d66952-1021-4a4e-9cfb-23359432e8cf	38efa76e-489f-4f4b-ad15-aba94fc563d5	2	25	f	\N	\N
45857324-fc82-4bcb-b63a-ed673ed58658	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	38efa76e-489f-4f4b-ad15-aba94fc563d5	2	30	t	96f62b3b-0b4d-4528-a67b-a46c34c558e4	\N
7004267c-a6be-4c1b-8a8d-80cea1e96ba8	\N	auth-username-password-form	05d66952-1021-4a4e-9cfb-23359432e8cf	96f62b3b-0b4d-4528-a67b-a46c34c558e4	0	10	f	\N	\N
2ed56d45-9aa2-419d-8666-8d8d1926ccf2	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	96f62b3b-0b4d-4528-a67b-a46c34c558e4	1	20	t	1ecc435c-9212-421b-a587-2f618b94703e	\N
a10aa7e2-176d-4510-9bc4-d5ebb1aecf50	\N	conditional-user-configured	05d66952-1021-4a4e-9cfb-23359432e8cf	1ecc435c-9212-421b-a587-2f618b94703e	0	10	f	\N	\N
891b027c-e0cd-4c8a-b651-b82e84715d34	\N	auth-otp-form	05d66952-1021-4a4e-9cfb-23359432e8cf	1ecc435c-9212-421b-a587-2f618b94703e	0	20	f	\N	\N
da791cee-643d-42ac-8a92-30302951bc07	\N	direct-grant-validate-username	05d66952-1021-4a4e-9cfb-23359432e8cf	c3006417-0e12-4549-a115-d80cdf598649	0	10	f	\N	\N
1084d324-2ec1-43b7-ab01-1ae0dd90103a	\N	direct-grant-validate-password	05d66952-1021-4a4e-9cfb-23359432e8cf	c3006417-0e12-4549-a115-d80cdf598649	0	20	f	\N	\N
aa534a21-0ef4-431d-b763-54409a0b4346	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	c3006417-0e12-4549-a115-d80cdf598649	1	30	t	17a9fd9f-70ca-482f-87d8-e8a31974576c	\N
101ade0d-8893-4c55-b07d-eb65fabd1773	\N	conditional-user-configured	05d66952-1021-4a4e-9cfb-23359432e8cf	17a9fd9f-70ca-482f-87d8-e8a31974576c	0	10	f	\N	\N
153695c0-c533-4eef-bce9-c5e1b692dcb5	\N	direct-grant-validate-otp	05d66952-1021-4a4e-9cfb-23359432e8cf	17a9fd9f-70ca-482f-87d8-e8a31974576c	0	20	f	\N	\N
89d8c4a3-24af-4a65-8231-f1b4d50ff518	\N	registration-page-form	05d66952-1021-4a4e-9cfb-23359432e8cf	e63370d0-076e-442b-bf08-21a45d497a22	0	10	t	7be8315f-5c9e-4178-b0a0-e8f62026592e	\N
f5d21154-9b3d-4b9f-ae0a-1baf41c6d487	\N	registration-user-creation	05d66952-1021-4a4e-9cfb-23359432e8cf	7be8315f-5c9e-4178-b0a0-e8f62026592e	0	20	f	\N	\N
f866c81c-9dd4-44a2-b861-37f7f7067805	\N	registration-password-action	05d66952-1021-4a4e-9cfb-23359432e8cf	7be8315f-5c9e-4178-b0a0-e8f62026592e	0	50	f	\N	\N
0bd4233f-0dd4-43ff-97dd-64bfbdaacea9	\N	registration-recaptcha-action	05d66952-1021-4a4e-9cfb-23359432e8cf	7be8315f-5c9e-4178-b0a0-e8f62026592e	3	60	f	\N	\N
f0c5c701-073c-4783-a10d-294d55c69bde	\N	registration-terms-and-conditions	05d66952-1021-4a4e-9cfb-23359432e8cf	7be8315f-5c9e-4178-b0a0-e8f62026592e	3	70	f	\N	\N
183a1a41-c44e-4d6d-8670-7b6ec5ffef1c	\N	reset-credentials-choose-user	05d66952-1021-4a4e-9cfb-23359432e8cf	21ad0893-b321-4e44-a563-e73fb9c587e1	0	10	f	\N	\N
f836c279-7dd0-4cdb-b04c-430221ce9ec3	\N	reset-credential-email	05d66952-1021-4a4e-9cfb-23359432e8cf	21ad0893-b321-4e44-a563-e73fb9c587e1	0	20	f	\N	\N
64ca6a2a-75bb-4bf4-891c-5b0e86df0cf9	\N	reset-password	05d66952-1021-4a4e-9cfb-23359432e8cf	21ad0893-b321-4e44-a563-e73fb9c587e1	0	30	f	\N	\N
2c021971-17f2-4a69-ba5d-d21607a76e75	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	21ad0893-b321-4e44-a563-e73fb9c587e1	1	40	t	c2cc440e-3a6f-4163-ab6d-ad627fd4bdbd	\N
c0b51303-be17-4ede-868d-5efcf731e9e2	\N	conditional-user-configured	05d66952-1021-4a4e-9cfb-23359432e8cf	c2cc440e-3a6f-4163-ab6d-ad627fd4bdbd	0	10	f	\N	\N
0b4567b6-911e-4c8a-9600-440b761d4db2	\N	reset-otp	05d66952-1021-4a4e-9cfb-23359432e8cf	c2cc440e-3a6f-4163-ab6d-ad627fd4bdbd	0	20	f	\N	\N
2573d47e-cc7b-4be0-bea3-de8d3548f9b7	\N	client-secret	05d66952-1021-4a4e-9cfb-23359432e8cf	f022d5ca-ebf1-4b8b-9970-ccb106e926ec	2	10	f	\N	\N
7657498b-291e-4a28-8972-ad70182f9a0d	\N	client-jwt	05d66952-1021-4a4e-9cfb-23359432e8cf	f022d5ca-ebf1-4b8b-9970-ccb106e926ec	2	20	f	\N	\N
099dc299-2db6-410c-83d6-d95ccebcc1b7	\N	client-secret-jwt	05d66952-1021-4a4e-9cfb-23359432e8cf	f022d5ca-ebf1-4b8b-9970-ccb106e926ec	2	30	f	\N	\N
cac7ffec-6ddd-4aa3-9c92-094ea88366c3	\N	client-x509	05d66952-1021-4a4e-9cfb-23359432e8cf	f022d5ca-ebf1-4b8b-9970-ccb106e926ec	2	40	f	\N	\N
30cbdf73-07ab-4211-a203-7ef377034444	\N	idp-review-profile	05d66952-1021-4a4e-9cfb-23359432e8cf	85bf01b9-ac40-4c04-a879-0d8b0491cc9a	0	10	f	\N	78c545f1-85cb-4329-a367-401e5785f0c0
9ae0d3c0-e7d3-4af1-a014-1b47a455743c	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	85bf01b9-ac40-4c04-a879-0d8b0491cc9a	0	20	t	a877feab-62e2-4153-8582-6e4d6ed906eb	\N
306060a4-4e9e-4da5-a565-150d8acbad79	\N	idp-create-user-if-unique	05d66952-1021-4a4e-9cfb-23359432e8cf	a877feab-62e2-4153-8582-6e4d6ed906eb	2	10	f	\N	75f33405-a813-42d1-90b2-e4dde2bef67b
8396d563-315c-484c-8ab0-6aea5832254a	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	a877feab-62e2-4153-8582-6e4d6ed906eb	2	20	t	90c85d7f-dd5b-493e-a6be-1ce3ad623a45	\N
649ddc01-b52c-4786-890f-fe7776c05c3c	\N	idp-confirm-link	05d66952-1021-4a4e-9cfb-23359432e8cf	90c85d7f-dd5b-493e-a6be-1ce3ad623a45	0	10	f	\N	\N
1f3c3e6e-ca11-4155-9f48-19f0480cd499	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	90c85d7f-dd5b-493e-a6be-1ce3ad623a45	0	20	t	1d570bc9-8536-463c-aa15-800eb8fd98ee	\N
f6e63620-4851-4018-91fe-8b2d92746960	\N	idp-email-verification	05d66952-1021-4a4e-9cfb-23359432e8cf	1d570bc9-8536-463c-aa15-800eb8fd98ee	2	10	f	\N	\N
35d502dc-4bc3-4e0b-b108-86e91ee39e5b	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	1d570bc9-8536-463c-aa15-800eb8fd98ee	2	20	t	a3a1eeee-933a-45db-b3e3-9308e4761022	\N
b07ba20e-661e-40a6-9c9b-a2cbefaf6045	\N	idp-username-password-form	05d66952-1021-4a4e-9cfb-23359432e8cf	a3a1eeee-933a-45db-b3e3-9308e4761022	0	10	f	\N	\N
a3075af0-fe37-4916-899f-b51cfb9a1c52	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	a3a1eeee-933a-45db-b3e3-9308e4761022	1	20	t	362e9898-de57-4a79-b5be-3b993f4ad970	\N
d81b58a7-f60f-4966-b6fc-9b3bc48dfb97	\N	conditional-user-configured	05d66952-1021-4a4e-9cfb-23359432e8cf	362e9898-de57-4a79-b5be-3b993f4ad970	0	10	f	\N	\N
a50737ac-7ac2-490f-bb85-7a37e56b3d3b	\N	auth-otp-form	05d66952-1021-4a4e-9cfb-23359432e8cf	362e9898-de57-4a79-b5be-3b993f4ad970	0	20	f	\N	\N
c5a01b6d-38e1-4d3a-bda7-1bfa3afba040	\N	http-basic-authenticator	05d66952-1021-4a4e-9cfb-23359432e8cf	cdccce33-0c39-4587-9c95-b8e375481e96	0	10	f	\N	\N
6d1c0bbc-aa10-4650-be53-8228dc5463d7	\N	docker-http-basic-authenticator	05d66952-1021-4a4e-9cfb-23359432e8cf	1adda8e9-9834-4e62-b114-035cee377c16	0	10	f	\N	\N
40fd8e02-cb59-4807-ae2b-5ec9e7dcd644	\N	auth-cookie	01494400-afb0-4083-bb7d-02b8ec093758	f0a7be98-b19c-46d3-97fe-af26126c56fc	2	10	f	\N	\N
1c440b64-3a4f-4f10-b085-0cf95a5833db	\N	auth-spnego	01494400-afb0-4083-bb7d-02b8ec093758	f0a7be98-b19c-46d3-97fe-af26126c56fc	3	20	f	\N	\N
153ef3cb-30b1-4a12-b7ae-9fc5a333a35c	\N	identity-provider-redirector	01494400-afb0-4083-bb7d-02b8ec093758	f0a7be98-b19c-46d3-97fe-af26126c56fc	2	25	f	\N	\N
7420773f-60ed-4ffa-980b-2c296d669cc7	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	f0a7be98-b19c-46d3-97fe-af26126c56fc	2	30	t	e0137c36-4fde-4c4d-b6d0-0b623ee6a810	\N
f582d3ed-eecc-4d44-a27d-b94526233299	\N	auth-username-password-form	01494400-afb0-4083-bb7d-02b8ec093758	e0137c36-4fde-4c4d-b6d0-0b623ee6a810	0	10	f	\N	\N
18d77723-db8c-43c8-8318-edef7b60388f	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	e0137c36-4fde-4c4d-b6d0-0b623ee6a810	1	20	t	b2a5f728-6ff5-4931-bb00-de5d566c818b	\N
7a5d16a4-8538-440f-bc53-4c9e8cd34255	\N	conditional-user-configured	01494400-afb0-4083-bb7d-02b8ec093758	b2a5f728-6ff5-4931-bb00-de5d566c818b	0	10	f	\N	\N
b8a07fb2-754a-4bf1-ac81-9bf7bf0b00c0	\N	auth-otp-form	01494400-afb0-4083-bb7d-02b8ec093758	b2a5f728-6ff5-4931-bb00-de5d566c818b	0	20	f	\N	\N
ef2647f0-fcb4-4b38-bfa2-5ca9b709e0cc	\N	direct-grant-validate-username	01494400-afb0-4083-bb7d-02b8ec093758	36201bf4-ef4a-4134-881b-ed9f87ccf96d	0	10	f	\N	\N
05c8f48e-c448-4b6c-ba2e-316a0fda0222	\N	direct-grant-validate-password	01494400-afb0-4083-bb7d-02b8ec093758	36201bf4-ef4a-4134-881b-ed9f87ccf96d	0	20	f	\N	\N
1cbd59c9-fe85-4e8e-8cac-2114a783601d	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	36201bf4-ef4a-4134-881b-ed9f87ccf96d	1	30	t	b81e4918-063a-400c-9d37-ac0101667726	\N
a74f6660-7807-4338-8d09-47745a8dd37a	\N	conditional-user-configured	01494400-afb0-4083-bb7d-02b8ec093758	b81e4918-063a-400c-9d37-ac0101667726	0	10	f	\N	\N
09453d0c-9a42-4e75-9c45-3cda11e733db	\N	direct-grant-validate-otp	01494400-afb0-4083-bb7d-02b8ec093758	b81e4918-063a-400c-9d37-ac0101667726	0	20	f	\N	\N
e5bbef66-67b6-4566-a302-7d4accadaf31	\N	registration-page-form	01494400-afb0-4083-bb7d-02b8ec093758	53205125-e64d-4a36-8e45-95f125a50a75	0	10	t	89696bd0-c0ab-44ba-bd7f-ef32af6a8539	\N
583b3ef0-9f32-45c6-b862-2a4fdd5e5364	\N	registration-user-creation	01494400-afb0-4083-bb7d-02b8ec093758	89696bd0-c0ab-44ba-bd7f-ef32af6a8539	0	20	f	\N	\N
c04b2ce0-696d-4369-9411-bfe1d6365444	\N	registration-password-action	01494400-afb0-4083-bb7d-02b8ec093758	89696bd0-c0ab-44ba-bd7f-ef32af6a8539	0	50	f	\N	\N
e5722ada-597f-4d2a-a57f-1b0fba7baa90	\N	registration-recaptcha-action	01494400-afb0-4083-bb7d-02b8ec093758	89696bd0-c0ab-44ba-bd7f-ef32af6a8539	3	60	f	\N	\N
b7a3db7f-2217-4f14-be19-938b6706b489	\N	reset-credentials-choose-user	01494400-afb0-4083-bb7d-02b8ec093758	126db41d-ac2c-4ba3-a4e3-3c5b2ec41ad9	0	10	f	\N	\N
f323e65c-2525-4a67-9b65-03f23fc58ac4	\N	reset-credential-email	01494400-afb0-4083-bb7d-02b8ec093758	126db41d-ac2c-4ba3-a4e3-3c5b2ec41ad9	0	20	f	\N	\N
280d0490-36e3-42b4-8b6d-514f3415ee69	\N	reset-password	01494400-afb0-4083-bb7d-02b8ec093758	126db41d-ac2c-4ba3-a4e3-3c5b2ec41ad9	0	30	f	\N	\N
ff27d10e-f689-4129-a13c-0460dbdff672	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	126db41d-ac2c-4ba3-a4e3-3c5b2ec41ad9	1	40	t	5e0364c9-f80c-46df-a3cd-1a2e77665525	\N
307e12c8-49c3-4a3b-ae31-df5aa2c06e2d	\N	conditional-user-configured	01494400-afb0-4083-bb7d-02b8ec093758	5e0364c9-f80c-46df-a3cd-1a2e77665525	0	10	f	\N	\N
2e2291f4-4f3c-4d72-be86-9b117ab37e28	\N	reset-otp	01494400-afb0-4083-bb7d-02b8ec093758	5e0364c9-f80c-46df-a3cd-1a2e77665525	0	20	f	\N	\N
10f65a87-e552-42ba-801b-eaac93557fe2	\N	client-secret	01494400-afb0-4083-bb7d-02b8ec093758	dfc1905b-7145-4ef6-afdc-76e2e2db6441	2	10	f	\N	\N
488f2ca5-79ba-45a4-9a90-373be8fc76a4	\N	client-jwt	01494400-afb0-4083-bb7d-02b8ec093758	dfc1905b-7145-4ef6-afdc-76e2e2db6441	2	20	f	\N	\N
0d85d988-f16d-4e24-80fd-ef85711e8fba	\N	client-secret-jwt	01494400-afb0-4083-bb7d-02b8ec093758	dfc1905b-7145-4ef6-afdc-76e2e2db6441	2	30	f	\N	\N
d84913a7-dd13-44c9-95ef-e9407f61db35	\N	client-x509	01494400-afb0-4083-bb7d-02b8ec093758	dfc1905b-7145-4ef6-afdc-76e2e2db6441	2	40	f	\N	\N
33198062-8ce6-40dd-92b3-9acef25f503f	\N	idp-review-profile	01494400-afb0-4083-bb7d-02b8ec093758	a90ec092-c3dd-4560-a516-4000cb404429	0	10	f	\N	f7e05c37-d12a-4fac-9f15-5762827349a9
2a9e63dc-8be7-42f4-ad7b-790ae256392e	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	a90ec092-c3dd-4560-a516-4000cb404429	0	20	t	05466f99-3472-43da-9240-1bc66249d06e	\N
4d7fe420-e160-453f-896e-2d49221b00e4	\N	idp-create-user-if-unique	01494400-afb0-4083-bb7d-02b8ec093758	05466f99-3472-43da-9240-1bc66249d06e	2	10	f	\N	8c3a9746-b800-45c2-84d0-a74839886f4e
243a4ece-ad47-46e8-bb08-c2c0899d883f	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	05466f99-3472-43da-9240-1bc66249d06e	2	20	t	a56b686f-77c4-444c-8ae6-41fa5733974c	\N
81e5e23c-ee79-4a53-9a4a-a9cfad5c87fb	\N	idp-confirm-link	01494400-afb0-4083-bb7d-02b8ec093758	a56b686f-77c4-444c-8ae6-41fa5733974c	0	10	f	\N	\N
9ed4abb8-e3d0-4833-9795-76835aad58d5	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	a56b686f-77c4-444c-8ae6-41fa5733974c	0	20	t	19419d89-4f54-420e-89b5-9e99af8293b1	\N
393a0a71-72ac-4470-b06c-2e3f9852dde2	\N	idp-email-verification	01494400-afb0-4083-bb7d-02b8ec093758	19419d89-4f54-420e-89b5-9e99af8293b1	2	10	f	\N	\N
5b8cb7c6-9f75-48c0-b55e-b48c46fc2f30	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	19419d89-4f54-420e-89b5-9e99af8293b1	2	20	t	81de42da-3b25-4eb1-be64-20e40c23dafc	\N
06ad62cf-b31e-4c28-ae62-459aa8c12b6a	\N	idp-username-password-form	01494400-afb0-4083-bb7d-02b8ec093758	81de42da-3b25-4eb1-be64-20e40c23dafc	0	10	f	\N	\N
0dc31e1c-bfa0-4ef3-bf33-8fcffc6767e3	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	81de42da-3b25-4eb1-be64-20e40c23dafc	1	20	t	631da2af-2a7f-4a95-a3e3-eb0de98f2ff3	\N
ed0c1d43-42fb-474c-a434-da6348540e97	\N	conditional-user-configured	01494400-afb0-4083-bb7d-02b8ec093758	631da2af-2a7f-4a95-a3e3-eb0de98f2ff3	0	10	f	\N	\N
53e83240-3559-4693-988f-e1d59db27e4a	\N	auth-otp-form	01494400-afb0-4083-bb7d-02b8ec093758	631da2af-2a7f-4a95-a3e3-eb0de98f2ff3	0	20	f	\N	\N
248037ca-0c02-4e47-b561-82cd74df5cc5	\N	http-basic-authenticator	01494400-afb0-4083-bb7d-02b8ec093758	c66daebd-bcbe-4963-91a3-ad153f0ab66e	0	10	f	\N	\N
a795091f-b767-41d0-8579-5d08eb82d65b	\N	docker-http-basic-authenticator	01494400-afb0-4083-bb7d-02b8ec093758	5e179490-eb3e-4bfd-9f70-c874225230a3	0	10	f	\N	\N
\.


--
-- Data for Name: authentication_flow; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.authentication_flow (id, alias, description, realm_id, provider_id, top_level, built_in) FROM stdin;
38efa76e-489f-4f4b-ad15-aba94fc563d5	browser	browser based authentication	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	t	t
96f62b3b-0b4d-4528-a67b-a46c34c558e4	forms	Username, password, otp and other auth forms.	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	f	t
1ecc435c-9212-421b-a587-2f618b94703e	Browser - Conditional OTP	Flow to determine if the OTP is required for the authentication	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	f	t
c3006417-0e12-4549-a115-d80cdf598649	direct grant	OpenID Connect Resource Owner Grant	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	t	t
17a9fd9f-70ca-482f-87d8-e8a31974576c	Direct Grant - Conditional OTP	Flow to determine if the OTP is required for the authentication	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	f	t
e63370d0-076e-442b-bf08-21a45d497a22	registration	registration flow	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	t	t
7be8315f-5c9e-4178-b0a0-e8f62026592e	registration form	registration form	05d66952-1021-4a4e-9cfb-23359432e8cf	form-flow	f	t
21ad0893-b321-4e44-a563-e73fb9c587e1	reset credentials	Reset credentials for a user if they forgot their password or something	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	t	t
c2cc440e-3a6f-4163-ab6d-ad627fd4bdbd	Reset - Conditional OTP	Flow to determine if the OTP should be reset or not. Set to REQUIRED to force.	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	f	t
f022d5ca-ebf1-4b8b-9970-ccb106e926ec	clients	Base authentication for clients	05d66952-1021-4a4e-9cfb-23359432e8cf	client-flow	t	t
85bf01b9-ac40-4c04-a879-0d8b0491cc9a	first broker login	Actions taken after first broker login with identity provider account, which is not yet linked to any Keycloak account	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	t	t
a877feab-62e2-4153-8582-6e4d6ed906eb	User creation or linking	Flow for the existing/non-existing user alternatives	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	f	t
90c85d7f-dd5b-493e-a6be-1ce3ad623a45	Handle Existing Account	Handle what to do if there is existing account with same email/username like authenticated identity provider	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	f	t
1d570bc9-8536-463c-aa15-800eb8fd98ee	Account verification options	Method with which to verity the existing account	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	f	t
a3a1eeee-933a-45db-b3e3-9308e4761022	Verify Existing Account by Re-authentication	Reauthentication of existing account	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	f	t
362e9898-de57-4a79-b5be-3b993f4ad970	First broker login - Conditional OTP	Flow to determine if the OTP is required for the authentication	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	f	t
cdccce33-0c39-4587-9c95-b8e375481e96	saml ecp	SAML ECP Profile Authentication Flow	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	t	t
1adda8e9-9834-4e62-b114-035cee377c16	docker auth	Used by Docker clients to authenticate against the IDP	05d66952-1021-4a4e-9cfb-23359432e8cf	basic-flow	t	t
f0a7be98-b19c-46d3-97fe-af26126c56fc	browser	browser based authentication	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	t	t
e0137c36-4fde-4c4d-b6d0-0b623ee6a810	forms	Username, password, otp and other auth forms.	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	f	t
b2a5f728-6ff5-4931-bb00-de5d566c818b	Browser - Conditional OTP	Flow to determine if the OTP is required for the authentication	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	f	t
36201bf4-ef4a-4134-881b-ed9f87ccf96d	direct grant	OpenID Connect Resource Owner Grant	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	t	t
b81e4918-063a-400c-9d37-ac0101667726	Direct Grant - Conditional OTP	Flow to determine if the OTP is required for the authentication	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	f	t
53205125-e64d-4a36-8e45-95f125a50a75	registration	registration flow	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	t	t
89696bd0-c0ab-44ba-bd7f-ef32af6a8539	registration form	registration form	01494400-afb0-4083-bb7d-02b8ec093758	form-flow	f	t
126db41d-ac2c-4ba3-a4e3-3c5b2ec41ad9	reset credentials	Reset credentials for a user if they forgot their password or something	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	t	t
5e0364c9-f80c-46df-a3cd-1a2e77665525	Reset - Conditional OTP	Flow to determine if the OTP should be reset or not. Set to REQUIRED to force.	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	f	t
dfc1905b-7145-4ef6-afdc-76e2e2db6441	clients	Base authentication for clients	01494400-afb0-4083-bb7d-02b8ec093758	client-flow	t	t
a90ec092-c3dd-4560-a516-4000cb404429	first broker login	Actions taken after first broker login with identity provider account, which is not yet linked to any Keycloak account	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	t	t
05466f99-3472-43da-9240-1bc66249d06e	User creation or linking	Flow for the existing/non-existing user alternatives	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	f	t
a56b686f-77c4-444c-8ae6-41fa5733974c	Handle Existing Account	Handle what to do if there is existing account with same email/username like authenticated identity provider	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	f	t
19419d89-4f54-420e-89b5-9e99af8293b1	Account verification options	Method with which to verity the existing account	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	f	t
81de42da-3b25-4eb1-be64-20e40c23dafc	Verify Existing Account by Re-authentication	Reauthentication of existing account	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	f	t
631da2af-2a7f-4a95-a3e3-eb0de98f2ff3	First broker login - Conditional OTP	Flow to determine if the OTP is required for the authentication	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	f	t
c66daebd-bcbe-4963-91a3-ad153f0ab66e	saml ecp	SAML ECP Profile Authentication Flow	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	t	t
5e179490-eb3e-4bfd-9f70-c874225230a3	docker auth	Used by Docker clients to authenticate against the IDP	01494400-afb0-4083-bb7d-02b8ec093758	basic-flow	t	t
\.


--
-- Data for Name: authenticator_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.authenticator_config (id, alias, realm_id) FROM stdin;
78c545f1-85cb-4329-a367-401e5785f0c0	review profile config	05d66952-1021-4a4e-9cfb-23359432e8cf
75f33405-a813-42d1-90b2-e4dde2bef67b	create unique user config	05d66952-1021-4a4e-9cfb-23359432e8cf
f7e05c37-d12a-4fac-9f15-5762827349a9	review profile config	01494400-afb0-4083-bb7d-02b8ec093758
8c3a9746-b800-45c2-84d0-a74839886f4e	create unique user config	01494400-afb0-4083-bb7d-02b8ec093758
\.


--
-- Data for Name: authenticator_config_entry; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.authenticator_config_entry (authenticator_id, value, name) FROM stdin;
75f33405-a813-42d1-90b2-e4dde2bef67b	false	require.password.update.after.registration
78c545f1-85cb-4329-a367-401e5785f0c0	missing	update.profile.on.first.login
8c3a9746-b800-45c2-84d0-a74839886f4e	false	require.password.update.after.registration
f7e05c37-d12a-4fac-9f15-5762827349a9	missing	update.profile.on.first.login
\.


--
-- Data for Name: broker_link; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.broker_link (identity_provider, storage_provider_id, realm_id, broker_user_id, broker_username, token, user_id) FROM stdin;
\.


--
-- Data for Name: client; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client (id, enabled, full_scope_allowed, client_id, not_before, public_client, secret, base_url, bearer_only, management_url, surrogate_auth_required, realm_id, protocol, node_rereg_timeout, frontchannel_logout, consent_required, name, service_accounts_enabled, client_authenticator_type, root_url, description, registration_token, standard_flow_enabled, implicit_flow_enabled, direct_access_grants_enabled, always_display_in_console) FROM stdin;
9f3a1353-e07c-4736-ab29-2712088465fa	t	f	master-realm	0	f	\N	\N	t	\N	f	05d66952-1021-4a4e-9cfb-23359432e8cf	\N	0	f	f	master Realm	f	client-secret	\N	\N	\N	t	f	f	f
5ab11789-449d-4d65-9b20-694103d445f3	t	f	account	0	t	\N	/realms/master/account/	f	\N	f	05d66952-1021-4a4e-9cfb-23359432e8cf	openid-connect	0	f	f	${client_account}	f	client-secret	${authBaseUrl}	\N	\N	t	f	f	f
1634cea3-037e-4cb9-a1f7-6d06c149bc95	t	f	account-console	0	t	\N	/realms/master/account/	f	\N	f	05d66952-1021-4a4e-9cfb-23359432e8cf	openid-connect	0	f	f	${client_account-console}	f	client-secret	${authBaseUrl}	\N	\N	t	f	f	f
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	t	f	broker	0	f	\N	\N	t	\N	f	05d66952-1021-4a4e-9cfb-23359432e8cf	openid-connect	0	f	f	${client_broker}	f	client-secret	\N	\N	\N	t	f	f	f
9b7cea44-6a22-443a-b194-5b9f52bd3a67	t	f	security-admin-console	0	t	\N	/admin/master/console/	f	\N	f	05d66952-1021-4a4e-9cfb-23359432e8cf	openid-connect	0	f	f	${client_security-admin-console}	f	client-secret	${authAdminUrl}	\N	\N	t	f	f	f
e96588eb-7b72-4fa9-bdd6-68298b145b67	t	f	admin-cli	0	t	\N	\N	f	\N	f	05d66952-1021-4a4e-9cfb-23359432e8cf	openid-connect	0	f	f	${client_admin-cli}	f	client-secret	\N	\N	\N	f	f	t	f
dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	f	athlos-realm	0	f	\N	\N	t	\N	f	05d66952-1021-4a4e-9cfb-23359432e8cf	\N	0	f	f	athlos Realm	f	client-secret	\N	\N	\N	t	f	f	f
60585280-8aef-4444-aa67-c0f8c7d711f1	t	f	realm-management	0	f	\N	\N	t	\N	f	01494400-afb0-4083-bb7d-02b8ec093758	openid-connect	0	f	f	${client_realm-management}	f	client-secret	\N	\N	\N	t	f	f	f
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	t	f	account	0	t	\N	/realms/athlos/account/	f	\N	f	01494400-afb0-4083-bb7d-02b8ec093758	openid-connect	0	f	f	${client_account}	f	client-secret	${authBaseUrl}	\N	\N	t	f	f	f
7e6a9f09-5438-43c6-9f97-325c10d4271b	t	f	account-console	0	t	\N	/realms/athlos/account/	f	\N	f	01494400-afb0-4083-bb7d-02b8ec093758	openid-connect	0	f	f	${client_account-console}	f	client-secret	${authBaseUrl}	\N	\N	t	f	f	f
e523c7a5-c1e4-4029-94f1-64168993bc9c	t	f	broker	0	f	\N	\N	t	\N	f	01494400-afb0-4083-bb7d-02b8ec093758	openid-connect	0	f	f	${client_broker}	f	client-secret	\N	\N	\N	t	f	f	f
fd6bf04d-2664-4c42-9218-89b926ab62ef	t	f	security-admin-console	0	t	\N	/admin/athlos/console/	f	\N	f	01494400-afb0-4083-bb7d-02b8ec093758	openid-connect	0	f	f	${client_security-admin-console}	f	client-secret	${authAdminUrl}	\N	\N	t	f	f	f
431a655a-f197-400f-926a-aba70c72d69b	t	f	admin-cli	0	t	\N	\N	f	\N	f	01494400-afb0-4083-bb7d-02b8ec093758	openid-connect	0	f	f	${client_admin-cli}	f	client-secret	\N	\N	\N	f	f	t	f
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	t	t	auth-client	0	f	7VN1uxryJN0eBqm5rfXZDYRKHRJ8DLoL		f	http://athloshub.com.br	f	01494400-afb0-4083-bb7d-02b8ec093758	openid-connect	-1	t	f		t	client-secret	http://athloshub.com.br		\N	t	t	t	f
\.


--
-- Data for Name: client_attributes; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_attributes (client_id, name, value) FROM stdin;
5ab11789-449d-4d65-9b20-694103d445f3	post.logout.redirect.uris	+
1634cea3-037e-4cb9-a1f7-6d06c149bc95	post.logout.redirect.uris	+
1634cea3-037e-4cb9-a1f7-6d06c149bc95	pkce.code.challenge.method	S256
9b7cea44-6a22-443a-b194-5b9f52bd3a67	post.logout.redirect.uris	+
9b7cea44-6a22-443a-b194-5b9f52bd3a67	pkce.code.challenge.method	S256
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	post.logout.redirect.uris	+
7e6a9f09-5438-43c6-9f97-325c10d4271b	post.logout.redirect.uris	+
7e6a9f09-5438-43c6-9f97-325c10d4271b	pkce.code.challenge.method	S256
fd6bf04d-2664-4c42-9218-89b926ab62ef	post.logout.redirect.uris	+
fd6bf04d-2664-4c42-9218-89b926ab62ef	pkce.code.challenge.method	S256
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	client.secret.creation.time	1769224778
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	oauth2.device.authorization.grant.enabled	true
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	oidc.ciba.grant.enabled	false
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	post.logout.redirect.uris	http://athloshub.com.br
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	backchannel.logout.session.required	true
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	backchannel.logout.revoke.offline.tokens	false
\.


--
-- Data for Name: client_auth_flow_bindings; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_auth_flow_bindings (client_id, flow_id, binding_name) FROM stdin;
\.


--
-- Data for Name: client_initial_access; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_initial_access (id, realm_id, "timestamp", expiration, count, remaining_count) FROM stdin;
\.


--
-- Data for Name: client_node_registrations; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_node_registrations (client_id, value, name) FROM stdin;
\.


--
-- Data for Name: client_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_scope (id, name, realm_id, description, protocol) FROM stdin;
4f88b18b-890c-4680-9eb3-e407b1953d06	offline_access	05d66952-1021-4a4e-9cfb-23359432e8cf	OpenID Connect built-in scope: offline_access	openid-connect
a77d876d-38c1-48cd-a4a2-a37bb5e7a475	role_list	05d66952-1021-4a4e-9cfb-23359432e8cf	SAML role list	saml
1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	profile	05d66952-1021-4a4e-9cfb-23359432e8cf	OpenID Connect built-in scope: profile	openid-connect
af682952-a51c-4f04-b21a-a8bf7f328b19	email	05d66952-1021-4a4e-9cfb-23359432e8cf	OpenID Connect built-in scope: email	openid-connect
c052ad27-964d-4311-8d58-a54fe2754004	address	05d66952-1021-4a4e-9cfb-23359432e8cf	OpenID Connect built-in scope: address	openid-connect
ff0752e3-6652-443c-9750-3ebf753ac0eb	phone	05d66952-1021-4a4e-9cfb-23359432e8cf	OpenID Connect built-in scope: phone	openid-connect
a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	roles	05d66952-1021-4a4e-9cfb-23359432e8cf	OpenID Connect scope for add user roles to the access token	openid-connect
9a796082-2534-4c5c-8927-ab2275db62f9	web-origins	05d66952-1021-4a4e-9cfb-23359432e8cf	OpenID Connect scope for add allowed web origins to the access token	openid-connect
8cbed7b3-664c-4a6b-ae42-201ddfc78501	microprofile-jwt	05d66952-1021-4a4e-9cfb-23359432e8cf	Microprofile - JWT built-in scope	openid-connect
158d6470-ca16-4a90-b441-79a10b337639	acr	05d66952-1021-4a4e-9cfb-23359432e8cf	OpenID Connect scope for add acr (authentication context class reference) to the token	openid-connect
edd0b505-3d58-4f72-a7f0-b7f5832d8518	offline_access	01494400-afb0-4083-bb7d-02b8ec093758	OpenID Connect built-in scope: offline_access	openid-connect
3c6772a6-c5c4-431f-9813-097eb581627b	role_list	01494400-afb0-4083-bb7d-02b8ec093758	SAML role list	saml
e902eeb1-53e6-4540-8187-5488a320ce60	profile	01494400-afb0-4083-bb7d-02b8ec093758	OpenID Connect built-in scope: profile	openid-connect
9e6ee896-a73d-45c9-9810-011909a7d7a8	email	01494400-afb0-4083-bb7d-02b8ec093758	OpenID Connect built-in scope: email	openid-connect
3ba36fa1-6d7c-4344-9f25-78ff541f1cab	address	01494400-afb0-4083-bb7d-02b8ec093758	OpenID Connect built-in scope: address	openid-connect
74fad21c-6cf3-45ac-a7ee-da2be746831e	phone	01494400-afb0-4083-bb7d-02b8ec093758	OpenID Connect built-in scope: phone	openid-connect
2f908bff-dd50-4d89-a2d1-e2eae47cff3b	roles	01494400-afb0-4083-bb7d-02b8ec093758	OpenID Connect scope for add user roles to the access token	openid-connect
95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	web-origins	01494400-afb0-4083-bb7d-02b8ec093758	OpenID Connect scope for add allowed web origins to the access token	openid-connect
75d794d1-c1f6-4dc0-8df8-8a282a67fd98	microprofile-jwt	01494400-afb0-4083-bb7d-02b8ec093758	Microprofile - JWT built-in scope	openid-connect
504042e6-b3d0-4cca-a1a9-a2d37986fd33	acr	01494400-afb0-4083-bb7d-02b8ec093758	OpenID Connect scope for add acr (authentication context class reference) to the token	openid-connect
\.


--
-- Data for Name: client_scope_attributes; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_scope_attributes (scope_id, value, name) FROM stdin;
4f88b18b-890c-4680-9eb3-e407b1953d06	true	display.on.consent.screen
4f88b18b-890c-4680-9eb3-e407b1953d06	${offlineAccessScopeConsentText}	consent.screen.text
a77d876d-38c1-48cd-a4a2-a37bb5e7a475	true	display.on.consent.screen
a77d876d-38c1-48cd-a4a2-a37bb5e7a475	${samlRoleListScopeConsentText}	consent.screen.text
1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	true	display.on.consent.screen
1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	${profileScopeConsentText}	consent.screen.text
1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	true	include.in.token.scope
af682952-a51c-4f04-b21a-a8bf7f328b19	true	display.on.consent.screen
af682952-a51c-4f04-b21a-a8bf7f328b19	${emailScopeConsentText}	consent.screen.text
af682952-a51c-4f04-b21a-a8bf7f328b19	true	include.in.token.scope
c052ad27-964d-4311-8d58-a54fe2754004	true	display.on.consent.screen
c052ad27-964d-4311-8d58-a54fe2754004	${addressScopeConsentText}	consent.screen.text
c052ad27-964d-4311-8d58-a54fe2754004	true	include.in.token.scope
ff0752e3-6652-443c-9750-3ebf753ac0eb	true	display.on.consent.screen
ff0752e3-6652-443c-9750-3ebf753ac0eb	${phoneScopeConsentText}	consent.screen.text
ff0752e3-6652-443c-9750-3ebf753ac0eb	true	include.in.token.scope
a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	true	display.on.consent.screen
a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	${rolesScopeConsentText}	consent.screen.text
a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	false	include.in.token.scope
9a796082-2534-4c5c-8927-ab2275db62f9	false	display.on.consent.screen
9a796082-2534-4c5c-8927-ab2275db62f9		consent.screen.text
9a796082-2534-4c5c-8927-ab2275db62f9	false	include.in.token.scope
8cbed7b3-664c-4a6b-ae42-201ddfc78501	false	display.on.consent.screen
8cbed7b3-664c-4a6b-ae42-201ddfc78501	true	include.in.token.scope
158d6470-ca16-4a90-b441-79a10b337639	false	display.on.consent.screen
158d6470-ca16-4a90-b441-79a10b337639	false	include.in.token.scope
edd0b505-3d58-4f72-a7f0-b7f5832d8518	true	display.on.consent.screen
edd0b505-3d58-4f72-a7f0-b7f5832d8518	${offlineAccessScopeConsentText}	consent.screen.text
3c6772a6-c5c4-431f-9813-097eb581627b	true	display.on.consent.screen
3c6772a6-c5c4-431f-9813-097eb581627b	${samlRoleListScopeConsentText}	consent.screen.text
e902eeb1-53e6-4540-8187-5488a320ce60	true	display.on.consent.screen
e902eeb1-53e6-4540-8187-5488a320ce60	${profileScopeConsentText}	consent.screen.text
e902eeb1-53e6-4540-8187-5488a320ce60	true	include.in.token.scope
9e6ee896-a73d-45c9-9810-011909a7d7a8	true	display.on.consent.screen
9e6ee896-a73d-45c9-9810-011909a7d7a8	${emailScopeConsentText}	consent.screen.text
9e6ee896-a73d-45c9-9810-011909a7d7a8	true	include.in.token.scope
3ba36fa1-6d7c-4344-9f25-78ff541f1cab	true	display.on.consent.screen
3ba36fa1-6d7c-4344-9f25-78ff541f1cab	${addressScopeConsentText}	consent.screen.text
3ba36fa1-6d7c-4344-9f25-78ff541f1cab	true	include.in.token.scope
74fad21c-6cf3-45ac-a7ee-da2be746831e	true	display.on.consent.screen
74fad21c-6cf3-45ac-a7ee-da2be746831e	${phoneScopeConsentText}	consent.screen.text
74fad21c-6cf3-45ac-a7ee-da2be746831e	true	include.in.token.scope
2f908bff-dd50-4d89-a2d1-e2eae47cff3b	true	display.on.consent.screen
2f908bff-dd50-4d89-a2d1-e2eae47cff3b	${rolesScopeConsentText}	consent.screen.text
2f908bff-dd50-4d89-a2d1-e2eae47cff3b	false	include.in.token.scope
95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	false	display.on.consent.screen
95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87		consent.screen.text
95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	false	include.in.token.scope
75d794d1-c1f6-4dc0-8df8-8a282a67fd98	false	display.on.consent.screen
75d794d1-c1f6-4dc0-8df8-8a282a67fd98	true	include.in.token.scope
504042e6-b3d0-4cca-a1a9-a2d37986fd33	false	display.on.consent.screen
504042e6-b3d0-4cca-a1a9-a2d37986fd33	false	include.in.token.scope
\.


--
-- Data for Name: client_scope_client; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_scope_client (client_id, scope_id, default_scope) FROM stdin;
5ab11789-449d-4d65-9b20-694103d445f3	af682952-a51c-4f04-b21a-a8bf7f328b19	t
5ab11789-449d-4d65-9b20-694103d445f3	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	t
5ab11789-449d-4d65-9b20-694103d445f3	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	t
5ab11789-449d-4d65-9b20-694103d445f3	9a796082-2534-4c5c-8927-ab2275db62f9	t
5ab11789-449d-4d65-9b20-694103d445f3	158d6470-ca16-4a90-b441-79a10b337639	t
5ab11789-449d-4d65-9b20-694103d445f3	ff0752e3-6652-443c-9750-3ebf753ac0eb	f
5ab11789-449d-4d65-9b20-694103d445f3	4f88b18b-890c-4680-9eb3-e407b1953d06	f
5ab11789-449d-4d65-9b20-694103d445f3	8cbed7b3-664c-4a6b-ae42-201ddfc78501	f
5ab11789-449d-4d65-9b20-694103d445f3	c052ad27-964d-4311-8d58-a54fe2754004	f
1634cea3-037e-4cb9-a1f7-6d06c149bc95	af682952-a51c-4f04-b21a-a8bf7f328b19	t
1634cea3-037e-4cb9-a1f7-6d06c149bc95	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	t
1634cea3-037e-4cb9-a1f7-6d06c149bc95	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	t
1634cea3-037e-4cb9-a1f7-6d06c149bc95	9a796082-2534-4c5c-8927-ab2275db62f9	t
1634cea3-037e-4cb9-a1f7-6d06c149bc95	158d6470-ca16-4a90-b441-79a10b337639	t
1634cea3-037e-4cb9-a1f7-6d06c149bc95	ff0752e3-6652-443c-9750-3ebf753ac0eb	f
1634cea3-037e-4cb9-a1f7-6d06c149bc95	4f88b18b-890c-4680-9eb3-e407b1953d06	f
1634cea3-037e-4cb9-a1f7-6d06c149bc95	8cbed7b3-664c-4a6b-ae42-201ddfc78501	f
1634cea3-037e-4cb9-a1f7-6d06c149bc95	c052ad27-964d-4311-8d58-a54fe2754004	f
e96588eb-7b72-4fa9-bdd6-68298b145b67	af682952-a51c-4f04-b21a-a8bf7f328b19	t
e96588eb-7b72-4fa9-bdd6-68298b145b67	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	t
e96588eb-7b72-4fa9-bdd6-68298b145b67	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	t
e96588eb-7b72-4fa9-bdd6-68298b145b67	9a796082-2534-4c5c-8927-ab2275db62f9	t
e96588eb-7b72-4fa9-bdd6-68298b145b67	158d6470-ca16-4a90-b441-79a10b337639	t
e96588eb-7b72-4fa9-bdd6-68298b145b67	ff0752e3-6652-443c-9750-3ebf753ac0eb	f
e96588eb-7b72-4fa9-bdd6-68298b145b67	4f88b18b-890c-4680-9eb3-e407b1953d06	f
e96588eb-7b72-4fa9-bdd6-68298b145b67	8cbed7b3-664c-4a6b-ae42-201ddfc78501	f
e96588eb-7b72-4fa9-bdd6-68298b145b67	c052ad27-964d-4311-8d58-a54fe2754004	f
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	af682952-a51c-4f04-b21a-a8bf7f328b19	t
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	t
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	t
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	9a796082-2534-4c5c-8927-ab2275db62f9	t
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	158d6470-ca16-4a90-b441-79a10b337639	t
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	ff0752e3-6652-443c-9750-3ebf753ac0eb	f
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	4f88b18b-890c-4680-9eb3-e407b1953d06	f
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	8cbed7b3-664c-4a6b-ae42-201ddfc78501	f
bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	c052ad27-964d-4311-8d58-a54fe2754004	f
9f3a1353-e07c-4736-ab29-2712088465fa	af682952-a51c-4f04-b21a-a8bf7f328b19	t
9f3a1353-e07c-4736-ab29-2712088465fa	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	t
9f3a1353-e07c-4736-ab29-2712088465fa	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	t
9f3a1353-e07c-4736-ab29-2712088465fa	9a796082-2534-4c5c-8927-ab2275db62f9	t
9f3a1353-e07c-4736-ab29-2712088465fa	158d6470-ca16-4a90-b441-79a10b337639	t
9f3a1353-e07c-4736-ab29-2712088465fa	ff0752e3-6652-443c-9750-3ebf753ac0eb	f
9f3a1353-e07c-4736-ab29-2712088465fa	4f88b18b-890c-4680-9eb3-e407b1953d06	f
9f3a1353-e07c-4736-ab29-2712088465fa	8cbed7b3-664c-4a6b-ae42-201ddfc78501	f
9f3a1353-e07c-4736-ab29-2712088465fa	c052ad27-964d-4311-8d58-a54fe2754004	f
9b7cea44-6a22-443a-b194-5b9f52bd3a67	af682952-a51c-4f04-b21a-a8bf7f328b19	t
9b7cea44-6a22-443a-b194-5b9f52bd3a67	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	t
9b7cea44-6a22-443a-b194-5b9f52bd3a67	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	t
9b7cea44-6a22-443a-b194-5b9f52bd3a67	9a796082-2534-4c5c-8927-ab2275db62f9	t
9b7cea44-6a22-443a-b194-5b9f52bd3a67	158d6470-ca16-4a90-b441-79a10b337639	t
9b7cea44-6a22-443a-b194-5b9f52bd3a67	ff0752e3-6652-443c-9750-3ebf753ac0eb	f
9b7cea44-6a22-443a-b194-5b9f52bd3a67	4f88b18b-890c-4680-9eb3-e407b1953d06	f
9b7cea44-6a22-443a-b194-5b9f52bd3a67	8cbed7b3-664c-4a6b-ae42-201ddfc78501	f
9b7cea44-6a22-443a-b194-5b9f52bd3a67	c052ad27-964d-4311-8d58-a54fe2754004	f
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	t
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	504042e6-b3d0-4cca-a1a9-a2d37986fd33	t
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	e902eeb1-53e6-4540-8187-5488a320ce60	t
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	2f908bff-dd50-4d89-a2d1-e2eae47cff3b	t
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	9e6ee896-a73d-45c9-9810-011909a7d7a8	t
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	74fad21c-6cf3-45ac-a7ee-da2be746831e	f
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	3ba36fa1-6d7c-4344-9f25-78ff541f1cab	f
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	75d794d1-c1f6-4dc0-8df8-8a282a67fd98	f
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	edd0b505-3d58-4f72-a7f0-b7f5832d8518	f
7e6a9f09-5438-43c6-9f97-325c10d4271b	95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	t
7e6a9f09-5438-43c6-9f97-325c10d4271b	504042e6-b3d0-4cca-a1a9-a2d37986fd33	t
7e6a9f09-5438-43c6-9f97-325c10d4271b	e902eeb1-53e6-4540-8187-5488a320ce60	t
7e6a9f09-5438-43c6-9f97-325c10d4271b	2f908bff-dd50-4d89-a2d1-e2eae47cff3b	t
7e6a9f09-5438-43c6-9f97-325c10d4271b	9e6ee896-a73d-45c9-9810-011909a7d7a8	t
7e6a9f09-5438-43c6-9f97-325c10d4271b	74fad21c-6cf3-45ac-a7ee-da2be746831e	f
7e6a9f09-5438-43c6-9f97-325c10d4271b	3ba36fa1-6d7c-4344-9f25-78ff541f1cab	f
7e6a9f09-5438-43c6-9f97-325c10d4271b	75d794d1-c1f6-4dc0-8df8-8a282a67fd98	f
7e6a9f09-5438-43c6-9f97-325c10d4271b	edd0b505-3d58-4f72-a7f0-b7f5832d8518	f
431a655a-f197-400f-926a-aba70c72d69b	95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	t
431a655a-f197-400f-926a-aba70c72d69b	504042e6-b3d0-4cca-a1a9-a2d37986fd33	t
431a655a-f197-400f-926a-aba70c72d69b	e902eeb1-53e6-4540-8187-5488a320ce60	t
431a655a-f197-400f-926a-aba70c72d69b	2f908bff-dd50-4d89-a2d1-e2eae47cff3b	t
431a655a-f197-400f-926a-aba70c72d69b	9e6ee896-a73d-45c9-9810-011909a7d7a8	t
431a655a-f197-400f-926a-aba70c72d69b	74fad21c-6cf3-45ac-a7ee-da2be746831e	f
431a655a-f197-400f-926a-aba70c72d69b	3ba36fa1-6d7c-4344-9f25-78ff541f1cab	f
431a655a-f197-400f-926a-aba70c72d69b	75d794d1-c1f6-4dc0-8df8-8a282a67fd98	f
431a655a-f197-400f-926a-aba70c72d69b	edd0b505-3d58-4f72-a7f0-b7f5832d8518	f
e523c7a5-c1e4-4029-94f1-64168993bc9c	95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	t
e523c7a5-c1e4-4029-94f1-64168993bc9c	504042e6-b3d0-4cca-a1a9-a2d37986fd33	t
e523c7a5-c1e4-4029-94f1-64168993bc9c	e902eeb1-53e6-4540-8187-5488a320ce60	t
e523c7a5-c1e4-4029-94f1-64168993bc9c	2f908bff-dd50-4d89-a2d1-e2eae47cff3b	t
e523c7a5-c1e4-4029-94f1-64168993bc9c	9e6ee896-a73d-45c9-9810-011909a7d7a8	t
e523c7a5-c1e4-4029-94f1-64168993bc9c	74fad21c-6cf3-45ac-a7ee-da2be746831e	f
e523c7a5-c1e4-4029-94f1-64168993bc9c	3ba36fa1-6d7c-4344-9f25-78ff541f1cab	f
e523c7a5-c1e4-4029-94f1-64168993bc9c	75d794d1-c1f6-4dc0-8df8-8a282a67fd98	f
e523c7a5-c1e4-4029-94f1-64168993bc9c	edd0b505-3d58-4f72-a7f0-b7f5832d8518	f
60585280-8aef-4444-aa67-c0f8c7d711f1	95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	t
60585280-8aef-4444-aa67-c0f8c7d711f1	504042e6-b3d0-4cca-a1a9-a2d37986fd33	t
60585280-8aef-4444-aa67-c0f8c7d711f1	e902eeb1-53e6-4540-8187-5488a320ce60	t
60585280-8aef-4444-aa67-c0f8c7d711f1	2f908bff-dd50-4d89-a2d1-e2eae47cff3b	t
60585280-8aef-4444-aa67-c0f8c7d711f1	9e6ee896-a73d-45c9-9810-011909a7d7a8	t
60585280-8aef-4444-aa67-c0f8c7d711f1	74fad21c-6cf3-45ac-a7ee-da2be746831e	f
60585280-8aef-4444-aa67-c0f8c7d711f1	3ba36fa1-6d7c-4344-9f25-78ff541f1cab	f
60585280-8aef-4444-aa67-c0f8c7d711f1	75d794d1-c1f6-4dc0-8df8-8a282a67fd98	f
60585280-8aef-4444-aa67-c0f8c7d711f1	edd0b505-3d58-4f72-a7f0-b7f5832d8518	f
fd6bf04d-2664-4c42-9218-89b926ab62ef	95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	t
fd6bf04d-2664-4c42-9218-89b926ab62ef	504042e6-b3d0-4cca-a1a9-a2d37986fd33	t
fd6bf04d-2664-4c42-9218-89b926ab62ef	e902eeb1-53e6-4540-8187-5488a320ce60	t
fd6bf04d-2664-4c42-9218-89b926ab62ef	2f908bff-dd50-4d89-a2d1-e2eae47cff3b	t
fd6bf04d-2664-4c42-9218-89b926ab62ef	9e6ee896-a73d-45c9-9810-011909a7d7a8	t
fd6bf04d-2664-4c42-9218-89b926ab62ef	74fad21c-6cf3-45ac-a7ee-da2be746831e	f
fd6bf04d-2664-4c42-9218-89b926ab62ef	3ba36fa1-6d7c-4344-9f25-78ff541f1cab	f
fd6bf04d-2664-4c42-9218-89b926ab62ef	75d794d1-c1f6-4dc0-8df8-8a282a67fd98	f
fd6bf04d-2664-4c42-9218-89b926ab62ef	edd0b505-3d58-4f72-a7f0-b7f5832d8518	f
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	t
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	504042e6-b3d0-4cca-a1a9-a2d37986fd33	t
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	e902eeb1-53e6-4540-8187-5488a320ce60	t
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	2f908bff-dd50-4d89-a2d1-e2eae47cff3b	t
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	9e6ee896-a73d-45c9-9810-011909a7d7a8	t
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	74fad21c-6cf3-45ac-a7ee-da2be746831e	f
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	3ba36fa1-6d7c-4344-9f25-78ff541f1cab	f
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	75d794d1-c1f6-4dc0-8df8-8a282a67fd98	f
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	edd0b505-3d58-4f72-a7f0-b7f5832d8518	f
\.


--
-- Data for Name: client_scope_role_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_scope_role_mapping (scope_id, role_id) FROM stdin;
4f88b18b-890c-4680-9eb3-e407b1953d06	03b15308-3f69-45b2-94d5-1770bb169820
edd0b505-3d58-4f72-a7f0-b7f5832d8518	8955aec5-e951-46b8-ab6b-ac846f173c59
\.


--
-- Data for Name: client_session; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_session (id, client_id, redirect_uri, state, "timestamp", session_id, auth_method, realm_id, auth_user_id, current_action) FROM stdin;
\.


--
-- Data for Name: client_session_auth_status; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_session_auth_status (authenticator, status, client_session) FROM stdin;
\.


--
-- Data for Name: client_session_note; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_session_note (name, value, client_session) FROM stdin;
\.


--
-- Data for Name: client_session_prot_mapper; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_session_prot_mapper (protocol_mapper_id, client_session) FROM stdin;
\.


--
-- Data for Name: client_session_role; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_session_role (role_id, client_session) FROM stdin;
\.


--
-- Data for Name: client_user_session_note; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.client_user_session_note (name, value, client_session) FROM stdin;
\.


--
-- Data for Name: component; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.component (id, name, parent_id, provider_id, provider_type, realm_id, sub_type) FROM stdin;
96ea633b-674d-4381-a025-47f0cea013b6	Trusted Hosts	05d66952-1021-4a4e-9cfb-23359432e8cf	trusted-hosts	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	anonymous
da69a492-67d0-4f28-9e3f-65a6d468fe08	Consent Required	05d66952-1021-4a4e-9cfb-23359432e8cf	consent-required	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	anonymous
de4ca135-22a4-4a6e-af96-d678342f8df5	Full Scope Disabled	05d66952-1021-4a4e-9cfb-23359432e8cf	scope	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	anonymous
c88627ca-6b0a-4545-8a9c-4d60df24a571	Max Clients Limit	05d66952-1021-4a4e-9cfb-23359432e8cf	max-clients	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	anonymous
85cfa60f-26ff-4b96-ad72-cab4b58955fc	Allowed Protocol Mapper Types	05d66952-1021-4a4e-9cfb-23359432e8cf	allowed-protocol-mappers	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	anonymous
811f3fbd-b281-4f45-920f-08e26b1c2969	Allowed Client Scopes	05d66952-1021-4a4e-9cfb-23359432e8cf	allowed-client-templates	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	anonymous
34c543dd-f7e5-453b-bc8e-2049634f7e76	Allowed Protocol Mapper Types	05d66952-1021-4a4e-9cfb-23359432e8cf	allowed-protocol-mappers	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	authenticated
5c5a042f-c1b8-404c-82c4-8d5248a6313c	Allowed Client Scopes	05d66952-1021-4a4e-9cfb-23359432e8cf	allowed-client-templates	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	authenticated
5cf5a524-6324-4fe6-aeb9-8470ef66ac68	rsa-generated	05d66952-1021-4a4e-9cfb-23359432e8cf	rsa-generated	org.keycloak.keys.KeyProvider	05d66952-1021-4a4e-9cfb-23359432e8cf	\N
90cde681-058e-47f0-ae8f-9d340783d8ba	rsa-enc-generated	05d66952-1021-4a4e-9cfb-23359432e8cf	rsa-enc-generated	org.keycloak.keys.KeyProvider	05d66952-1021-4a4e-9cfb-23359432e8cf	\N
43f1815a-09f2-4c6d-aa5e-5f20e5332945	hmac-generated	05d66952-1021-4a4e-9cfb-23359432e8cf	hmac-generated	org.keycloak.keys.KeyProvider	05d66952-1021-4a4e-9cfb-23359432e8cf	\N
2bdc43b0-d772-4b0f-abbb-03b1ffa2461f	aes-generated	05d66952-1021-4a4e-9cfb-23359432e8cf	aes-generated	org.keycloak.keys.KeyProvider	05d66952-1021-4a4e-9cfb-23359432e8cf	\N
ef3a4e01-6f9a-4e3c-bf4a-fe9b6c77b9a1	rsa-generated	01494400-afb0-4083-bb7d-02b8ec093758	rsa-generated	org.keycloak.keys.KeyProvider	01494400-afb0-4083-bb7d-02b8ec093758	\N
e1facf1d-fca2-4f19-8044-7dedee4c4885	rsa-enc-generated	01494400-afb0-4083-bb7d-02b8ec093758	rsa-enc-generated	org.keycloak.keys.KeyProvider	01494400-afb0-4083-bb7d-02b8ec093758	\N
c14027f7-ab2b-480d-8668-5195a2f131f8	hmac-generated	01494400-afb0-4083-bb7d-02b8ec093758	hmac-generated	org.keycloak.keys.KeyProvider	01494400-afb0-4083-bb7d-02b8ec093758	\N
cc2a0fd3-5222-4236-9ce5-7e14e51a1424	aes-generated	01494400-afb0-4083-bb7d-02b8ec093758	aes-generated	org.keycloak.keys.KeyProvider	01494400-afb0-4083-bb7d-02b8ec093758	\N
2a3ce7de-cecb-4740-abfb-42103b5db562	Trusted Hosts	01494400-afb0-4083-bb7d-02b8ec093758	trusted-hosts	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	01494400-afb0-4083-bb7d-02b8ec093758	anonymous
ac8c6a10-af2c-4072-9585-a52fce0ec4d6	Consent Required	01494400-afb0-4083-bb7d-02b8ec093758	consent-required	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	01494400-afb0-4083-bb7d-02b8ec093758	anonymous
811aed09-71b3-407a-990a-f97fea0e77b6	Full Scope Disabled	01494400-afb0-4083-bb7d-02b8ec093758	scope	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	01494400-afb0-4083-bb7d-02b8ec093758	anonymous
e39006e1-1a7d-416a-a2b8-c9f48db7b307	Max Clients Limit	01494400-afb0-4083-bb7d-02b8ec093758	max-clients	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	01494400-afb0-4083-bb7d-02b8ec093758	anonymous
098e53d0-fff7-40de-8af7-49dba2bc9368	Allowed Protocol Mapper Types	01494400-afb0-4083-bb7d-02b8ec093758	allowed-protocol-mappers	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	01494400-afb0-4083-bb7d-02b8ec093758	anonymous
cd8e42e4-b23f-4d10-9ecf-5993eac5b157	Allowed Client Scopes	01494400-afb0-4083-bb7d-02b8ec093758	allowed-client-templates	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	01494400-afb0-4083-bb7d-02b8ec093758	anonymous
2ff6b81d-9ecc-46dd-9f93-4c135083a2c2	Allowed Protocol Mapper Types	01494400-afb0-4083-bb7d-02b8ec093758	allowed-protocol-mappers	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	01494400-afb0-4083-bb7d-02b8ec093758	authenticated
cf2d58de-0687-44fb-b54d-db10a54b57f0	Allowed Client Scopes	01494400-afb0-4083-bb7d-02b8ec093758	allowed-client-templates	org.keycloak.services.clientregistration.policy.ClientRegistrationPolicy	01494400-afb0-4083-bb7d-02b8ec093758	authenticated
\.


--
-- Data for Name: component_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.component_config (id, component_id, name, value) FROM stdin;
fd0d058b-f7ff-498a-9939-2ef57723117d	34c543dd-f7e5-453b-bc8e-2049634f7e76	allowed-protocol-mapper-types	oidc-usermodel-property-mapper
a8e92ae8-212b-4e18-9940-8462c1bd6e4d	34c543dd-f7e5-453b-bc8e-2049634f7e76	allowed-protocol-mapper-types	oidc-full-name-mapper
eb608bd3-a829-4843-ab4a-12a404993a2c	34c543dd-f7e5-453b-bc8e-2049634f7e76	allowed-protocol-mapper-types	oidc-usermodel-attribute-mapper
8a4a9c09-6fcd-49bd-b6dd-1752be097b97	34c543dd-f7e5-453b-bc8e-2049634f7e76	allowed-protocol-mapper-types	oidc-sha256-pairwise-sub-mapper
59737940-9d01-4957-821e-987c433fb730	34c543dd-f7e5-453b-bc8e-2049634f7e76	allowed-protocol-mapper-types	oidc-address-mapper
bca58095-e17d-448f-b6e8-b1e0a3e5f0be	34c543dd-f7e5-453b-bc8e-2049634f7e76	allowed-protocol-mapper-types	saml-user-attribute-mapper
30112b19-41bf-4417-901f-323d7eca2cd3	34c543dd-f7e5-453b-bc8e-2049634f7e76	allowed-protocol-mapper-types	saml-user-property-mapper
981b6e4b-5c79-4526-a2b6-f67bf7a01288	34c543dd-f7e5-453b-bc8e-2049634f7e76	allowed-protocol-mapper-types	saml-role-list-mapper
00eb0ace-fcb3-4867-ac6a-f301a23c0969	c88627ca-6b0a-4545-8a9c-4d60df24a571	max-clients	200
38b75b20-68b4-4178-9952-b4af2c0baba7	811f3fbd-b281-4f45-920f-08e26b1c2969	allow-default-scopes	true
a84f7b5d-5337-4d0e-a91b-846f8a9011ff	85cfa60f-26ff-4b96-ad72-cab4b58955fc	allowed-protocol-mapper-types	oidc-usermodel-attribute-mapper
6c974401-8348-4280-9db7-75366410f517	85cfa60f-26ff-4b96-ad72-cab4b58955fc	allowed-protocol-mapper-types	saml-role-list-mapper
4bef2bd2-e84d-4ae8-810b-94486f9bc8fb	85cfa60f-26ff-4b96-ad72-cab4b58955fc	allowed-protocol-mapper-types	saml-user-attribute-mapper
c5e271d5-6a9c-4ceb-bd81-9c85b89d78bd	85cfa60f-26ff-4b96-ad72-cab4b58955fc	allowed-protocol-mapper-types	saml-user-property-mapper
b8cca92d-ddd9-45fe-93f3-5a4c031ebef7	85cfa60f-26ff-4b96-ad72-cab4b58955fc	allowed-protocol-mapper-types	oidc-full-name-mapper
e28791b8-ea40-4a3d-a8a6-6f5184fad62c	85cfa60f-26ff-4b96-ad72-cab4b58955fc	allowed-protocol-mapper-types	oidc-sha256-pairwise-sub-mapper
71537ed8-e6e3-4dca-8b3c-607376135f72	85cfa60f-26ff-4b96-ad72-cab4b58955fc	allowed-protocol-mapper-types	oidc-address-mapper
90767314-8d52-49ee-a09e-30287d2a2bf9	85cfa60f-26ff-4b96-ad72-cab4b58955fc	allowed-protocol-mapper-types	oidc-usermodel-property-mapper
583bb536-b7e0-4c47-a418-767c73ec5cee	5c5a042f-c1b8-404c-82c4-8d5248a6313c	allow-default-scopes	true
f9d14752-f34a-4b2d-9661-f07113bc57ef	96ea633b-674d-4381-a025-47f0cea013b6	client-uris-must-match	true
0e1f7cf5-d800-4c67-8d7c-dd21b161b736	96ea633b-674d-4381-a025-47f0cea013b6	host-sending-registration-request-must-match	true
b92f280f-6bdb-4381-b236-bef06da98cdd	2bdc43b0-d772-4b0f-abbb-03b1ffa2461f	kid	8fe87922-d857-4278-97cb-64d57c3c36f1
8ec9b291-b456-4842-ba9f-5230e8eb2915	2bdc43b0-d772-4b0f-abbb-03b1ffa2461f	secret	_R2hycksMy5zbfzeTV9C-w
aef32ddf-a2bf-4c62-9b1b-7a6810695e9d	2bdc43b0-d772-4b0f-abbb-03b1ffa2461f	priority	100
feee67f2-1ac4-46ea-863b-66f2da4cbcb3	90cde681-058e-47f0-ae8f-9d340783d8ba	certificate	MIICmzCCAYMCBgGb7B0w4TANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZtYXN0ZXIwHhcNMjYwMTIzMTgyNjM0WhcNMzYwMTIzMTgyODE0WjARMQ8wDQYDVQQDDAZtYXN0ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCmlLr0s1b6OigAxl48NqpDg5uG10arf9EmG75yfbeIbUUchQ70FgqJVqBJBeKKo3TCAJKQhkfsnYgt1XrxWXtLNuMbfm7PoP1xq2CNvyS9aG1T0U88k+87EhO5q7Vit385oEAyaRzNfzlidRMgBZyZUIdfmON5Qpv7GPjEXSf2L6qiI49976NVLoeuUqnBoRKhEfiQ6g5tYkC+S3i76VqRI4GPesbFqeatsbOxduGwgITUu84XOBq9cRgldwEe/67hjwwUGXJSPcxNxtqSDJM0mFaM6ZH0jxGhL9UiMh9QgCwnrYXxVKmBee3t5NevY5+fQsGv0joR0noVx7/NWvDFAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAH82z3JEmYJ6haMUaXhTpD/DA94IKJH1WqzW5VGRrzhnJqPyJNqomccRe9YHB58hG7cNC3wLeygpsfzZLvoQrGoNKKORGy6zGyhAa5IKBjahQV3Es+xag7QQMh57zkweWdq2JX76F5T5JMK8+JEOIDvAmtB8lw0WxhjYx0IxBU1DJGYjddp4xeto+CdtoIfRnHg61kuu+Pkt5+zySCN208clArxzH9CGHNE9XIxXUvY6dL/XtIadoVaaW78w/MnA2EcYszPGuMw3ngU/bc5XHXlBVfO3QM0JjBDJtq4l9r2w+pknOsPexj5TemAB28XC3THfVnHnXoa4OHVm3FlhrVA=
e710654c-0944-4ddf-9ae9-79236617a5a7	90cde681-058e-47f0-ae8f-9d340783d8ba	priority	100
229f51ff-282b-4b26-b9fc-96997c6ae482	90cde681-058e-47f0-ae8f-9d340783d8ba	algorithm	RSA-OAEP
4a079559-61ad-4c84-9a4c-44f781485ab1	90cde681-058e-47f0-ae8f-9d340783d8ba	privateKey	MIIEowIBAAKCAQEAppS69LNW+jooAMZePDaqQ4ObhtdGq3/RJhu+cn23iG1FHIUO9BYKiVagSQXiiqN0wgCSkIZH7J2ILdV68Vl7SzbjG35uz6D9catgjb8kvWhtU9FPPJPvOxITuau1Yrd/OaBAMmkczX85YnUTIAWcmVCHX5jjeUKb+xj4xF0n9i+qoiOPfe+jVS6HrlKpwaESoRH4kOoObWJAvkt4u+lakSOBj3rGxanmrbGzsXbhsICE1LvOFzgavXEYJXcBHv+u4Y8MFBlyUj3MTcbakgyTNJhWjOmR9I8RoS/VIjIfUIAsJ62F8VSpgXnt7eTXr2Ofn0LBr9I6EdJ6Fce/zVrwxQIDAQABAoIBACSLZXZwb6jmoEcHPb40+eZk1XZf/Pt7x3z2QjIo3V47JpnKoQywVzBpBjHu7hOfJ2q2KHE3XEkPCESR3G5dRJysFme+NX4sYd2RjNWb9OnuomlsdlciVy3c2eH2Rw04l1sjimHkyHJWslaku4TfZksGLSSuTF0aXVDZWh3uF+m8kO2w66LSAF7Xcs1+QOiJqdK2hyPET0HdhB8w0KP3uNE3JFNiZXtenII8L+kCOLY88H8/b5tNRSqM/3Lws8vRZIYfcarR5NBWjyvDGQZHfdfCHfnNZG+ZyxAJJS8F9lOCCcP+CqOjqXf/mVH2ZridCgPDggFs1faPRavzjZOnKtMCgYEA63GJIgpcFOpydBlaxrnuDUAYpaw86gllumWYHWWYGYFRoDH2vKp4L/cQEUcGEo605In+oazE/NUpm9GBz4mer9027JTj2DMXEfQ6OYrLuMjDm/LjasWF4bt5HMO/m/TOeA56Qqnuo9PCGX6Ie+qQ4HZFL0HBbZT4KA9NwUIEtksCgYEAtSAHZqCs708Tr7YagK8/q3+TU7mR4+eMEJpwpGgEw98qsaVUqUHAJJOhiK7mna18jmKU9Ae4Rjs2/SA4jpTwdWyGfhfmdCo4P5wul7EFQXUwQ2mTzR+F69s0ajeXyG03n5qI3qpGzFLqz3vkWHBd3A2fdvB1dvgidKc4s1/Qyy8CgYBlPp9vyfCq9d5d2oFUr6OUgxmWNKjFI2FhdEqjaYqsfRWyw4mMu+mPBrkcFOShmkhjdovOzlKvPqLz5HXj3xQkIAZ8WdJYqC+lgtZ+5BaS0ZJ8P0hYI7Rcy5dbLTn6QJ2AtwkQHa8HOAphmC3sy4OdYn6Bwc8B5muIHnybPF52XQKBgQCs628lY7C2p+A7mLeks6stqBaXkErgMmdeUpPH4ibqeVzhTN6O2N8ADJHjVFeHoeGQbj2W3Ofo5Q+Sifh052zKLloYd+jkbopU8F7rI23JGICDW4BoDPhmPFjGL10RVHQORBL3wcjluSPEApv2cxCozbi4bMk4U51RkXRoi8lisQKBgG8TxlwT3CbybAu0ePZpEIi8nY47Pz6/5swjcczHIEodzR1MSxB3/9vBF34ylrKz18hBTvDHAHpOvgEoo3Ip7EeAHfp4aREWU377mAf5Q8W1dWu2yF8twsbpanfmPQxbLtmbVQmdlOjceIk9Mtuvp8sz3cyQzW2dC8e7aC4ldCbH
7db09e02-742b-44e2-9d4c-d821ac35f0a3	90cde681-058e-47f0-ae8f-9d340783d8ba	keyUse	ENC
d0a5f132-867c-4246-9bc4-8463a46c4504	5cf5a524-6324-4fe6-aeb9-8470ef66ac68	priority	100
9a4496ba-a7ee-4a9c-ba30-dcb87e96474b	5cf5a524-6324-4fe6-aeb9-8470ef66ac68	privateKey	MIIEowIBAAKCAQEAshdx0uWWJC/IpkSMbGQV4Ol3jGBjbEhhp1Z34e2yF65kb8x9CNz5+L/0nobmUUpjE0w230aQWIWYX1XMYp1elzLIJraLyrV43pE1C+qg4QdDcIdHkmJk6p2IhD2GI9YVKde8V+uSSlfW8yQG8O5HABzFNLiA6h2M3UBZI3JzkujBLVHSO0EAb5z43HZhtBld2K5HPAgLZpq874/PDDZNLmBVBtrV2tVCpB6leUuD02gJHTh/qB3Q9cAkFxEzkTBjt/My0b4ARYythlj/pJVfvADqSCZ1IdpsTor9xo7p3FE38xYv+a8bBVFGp6yrqtBqfAayx5sbTePraEaOVe0yRQIDAQABAoIBADuXd7lrpHFIYfos3tYYKXAAf0XELRCbKb4OQ4AgguLEsovsX3xbQPPY+3geSKwz2XIoIwZUPNG6JlHkSkdHRFMQpYO6uo0iaycCbL8njBywSwM46RyU+xK8kuU5Fw0fwiYlr7q1s1ZYDS9/wyjUeoKRnfV1tYFhUPTp5snjLsQdujLag7TTBt+1J/i4MMWpiC4kjXnHHBINZj2oES4ZGWkF+nfS1tK/Fa/w+ep5sfUhQM9B66j0Mq1xYfVkfipIZygAsvFpSaLg7+PEcZm2/GLDV6UH7nk2Gtn2rHoeXHUvPnOsE3K2vgEy9EDA0TaJngXp4RXZgicRID5MCJfnCOMCgYEA2pAcnjJCpPs40UazSSVvBhKuHU0Tf9AwZaJwhHG3O/tWC5iZmD136L9WnDdy6wU6UwqZ1K0neG1rJ6L9krxt2jBERuRgxY0WHCHHh35G1bZ6cTeX7/orLKTixFj/keq5H2FxgjfXNLGP5MDgcOEoHJqfDx8KHSGXa9lXEvLorzcCgYEA0JiuhzB1ux5U8ovyygqMvXGyHg6tgB2+c/WwG0Iy0eEgaiGYbi01v6dVpwFmVDZb0sXHxDD5AAU2Ii4KWk5+Q418obFA05eurj4AAoRbBGmPntGyyl39c1d6tAFIIHUvMx80eBJs2UJSM7S9ZIXtndVzuL6U/zeLEmjSvg/yEGMCgYEAgAn2yfJVuoL16RvLAins3Zjp6X5y0uiqwY+k7OIVXw1Bfi+ao2Y3LeGRopiVOPtqDKXkMoRx4AnxwVmpxWGf1Td7eDBoRLL/ZeGgG08tvhtVpafU2aAr1M6Pjkk5B0mDw895CLkf2N3Al1kq4tX0grVOQzSC30gDhgngCdjF2YcCgYBzwUaYnru2as6ZCjBhDhmrxzwgkeSWA+t8Tgq8FbA958AlJR+BhHUfNazCUHSIpuGtxTNmHAcRi9LOhN4Z3xUSR6Gx2LswsCuvZZh7zRb1C983MwcUZbQQHatp2Iw99smKhPaI6zCcH8GeD95JukhyHdFp49irCBeUz7ai4hZiIQKBgChPEkAQ//lhykbQ+y5GLfHGFw4QJYj4LLo2gzm+KFbH+G2vA8K4Ld4Zo9iSP/35j5pP+P6juQO1NcTbbas/9ssW5uVLY3tyP8uVqdbtC/2yrEJtKd1dpJ4p3UpPvnE/AvQRFfYCgI1J5wM3k2Q9D2HOd1GbVCVXjmB2nUGdLfoy
4ffe0b1d-2cd6-446c-9c77-8b052b11c72e	5cf5a524-6324-4fe6-aeb9-8470ef66ac68	certificate	MIICmzCCAYMCBgGb7B0uhDANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZtYXN0ZXIwHhcNMjYwMTIzMTgyNjM0WhcNMzYwMTIzMTgyODE0WjARMQ8wDQYDVQQDDAZtYXN0ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCyF3HS5ZYkL8imRIxsZBXg6XeMYGNsSGGnVnfh7bIXrmRvzH0I3Pn4v/SehuZRSmMTTDbfRpBYhZhfVcxinV6XMsgmtovKtXjekTUL6qDhB0Nwh0eSYmTqnYiEPYYj1hUp17xX65JKV9bzJAbw7kcAHMU0uIDqHYzdQFkjcnOS6MEtUdI7QQBvnPjcdmG0GV3Yrkc8CAtmmrzvj88MNk0uYFUG2tXa1UKkHqV5S4PTaAkdOH+oHdD1wCQXETORMGO38zLRvgBFjK2GWP+klV+8AOpIJnUh2mxOiv3GjuncUTfzFi/5rxsFUUanrKuq0Gp8BrLHmxtN4+toRo5V7TJFAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAEDDNYocm3LUCfMWC9iozMqx/Zv0j4k2/pyGYR/TH/+8lg+F6/ennG4mi/WVhsZgk/0oaAMVaKT72Xvon4jkO15bOBTps64s1bmA8u8l8zhbXQNCyKrkBSszlVAGjDb8veSgm6sWF8PVvkiFiWeV8JMyHlX+fNg/rgsk1M4BCu7nel3ARwQuPB9xTQN1sE//uxT2QMGVWXgUvaukSqSAvRbZe5N1vZGYrpuJUQlcmUO7h7nsHmYKpr5v3A+d9HHf1GBiypCgf2hluFKu++J9A3pFkCWsjzCyfM186ODNy6gJ3RprvyXFyBbu6HvsqpOLmuPIzFRP/D3XAjb5KtbWt08=
50d3c71c-12b1-42cd-a11c-81b1535719ad	5cf5a524-6324-4fe6-aeb9-8470ef66ac68	keyUse	SIG
abc2fc2a-a56c-450b-b0be-20e03b9831de	43f1815a-09f2-4c6d-aa5e-5f20e5332945	kid	5885e671-1f04-42b4-b140-dcd4e0519803
5f7aedf8-dc5c-402f-be9c-1b780b345eb2	43f1815a-09f2-4c6d-aa5e-5f20e5332945	priority	100
d150b220-95cf-4ac0-9e95-e4b74e58603a	43f1815a-09f2-4c6d-aa5e-5f20e5332945	algorithm	HS256
07c6cfcc-5c74-4ebc-ad98-bb066634dc75	43f1815a-09f2-4c6d-aa5e-5f20e5332945	secret	x8HN9b9ecp7-nKCmaSoRjuSIM4bzJZdAWoCX87PFVEznay8H7EOoojr8_lZo1c9iGaO-he5zIk-dLc6TD9c5ug
37cba8ed-9c3a-4aef-90e7-d3368fb92927	ef3a4e01-6f9a-4e3c-bf4a-fe9b6c77b9a1	keyUse	SIG
909df3a4-14a7-428e-9567-63118905cd56	ef3a4e01-6f9a-4e3c-bf4a-fe9b6c77b9a1	privateKey	MIIEowIBAAKCAQEAyOuM+1pTx5i8AhL+lc++mGCsyVjNNu0eLbNGfOW4sJs2MEaPTZh6ckC/wDwd8SvQvRVkagxE1qEPzWGMHSxj1jAhRwYAdiBPFiL68QezgB7w62/AFZYQ0EzUKX2Rx2BYihZDo2ijCIGfJCcWjmTyNSwAlsKLmYoPF4BiJkNNajP2lLBA2KZIU513uyCVNt9qzpc9QCt9IYTh9rOEf9TxNfnNnxKXXDGvVHtungUvnER7aXlQ04Ob5PB12UPkkm6hwQT5vknlMFzkuURNSOGAUMCiBhdHy24hXiPrhvVKjgwWKZYlImmAy5f9wrDFiAmfmbJ4lIgVWi5yBUlZQ3nkqwIDAQABAoIBAEftV3emIwb5zRh6/0vXZrZ7KXAdS73ljh+zJcFRpdgHgJMwt12CgBdFyb+CZf+v/VargVqbkMs7NoKCcNwCx6zmZwtbgS/IqjdVB3vhE2gC66GFTIENy3AeiPdffiAfhCLPDKDDtVW2vad+HMuWJMVXPtC5zasGKxfxPHHRNzYUx9y98wH66OyAqLPf8uRTI5gWSlSxjPFnnmpMF1QcugvFb3DkFKHVcHESug6W8UR0lfW5B3k6GHPcsECYpk/Usa83iAyPSRmJWl1YtJ38izqF9OVqj6hu/nIE7LG9nENXxhiq2EZQ3/S7936ioyNpbFmz5TKEHSBF/oW+o3jKqQ0CgYEA/EDF+0iCyyUCX4dUk873EtUs/8a+9uBD17M04niVDuYb8l3gvECRSQcxmZQwl5cD4E/I4DILZu61sDysxZKu0sSwZKA1c1sCi812DeavY0kSnFdGTqjQdThHdHIRZ+iSKRcOpu/dcaR/2U/bNNuPGj1yZs3AX5dWPeVT590CAS0CgYEAy+eTs+JsUDd8pM62Dz/lEjLBk52CcE0smAsFrBS/GA0VQdt6QkQfsKnhqghiej/nOxIEwDz6umu3sN8MPv3iIWaxeuQG7dVkQY1OT4v+9T2R0oPK8Zs5dQinDRMbuCsgE3cRg1iOP9rfdzB2sTHl8RUrjSzvghR+cqlVLC8YtDcCgYEArugy3xPeLQGSba6mhH6jbtmFhCzIyOGj6PKHnujBYj1H73wMkjurAZoNWFIah2Hc/DIWNO4+XbbzICpSGgSlV9ut+3fi2AOo9ksWqnjj79IBJ4qUY4JGWKEXWrSlQQlQH1GvhS0YvO21AHeQpUwAI8+rfYD4/M8wq2ZSEZl7BFkCgYB2x5sKIe8Yt4n7c5MoxP7LIBgVxp5yjvJYS6ttN9StzQlCCPlqWsbfIcccRrAfKNSpW3C7D4q7R/6EoRpAI6Mz89+Vh/nlV/aEHS2uNw45jDlDGZUCM3tACt9NRYFTQoP38teX3OFYn0an5upthHS/gKaTIccPzqJuZuf/yhuo9wKBgGsyJrrjPRzfCrT430qhBE7aqTXJ6aG5USjapb3rDmW0zO4BHaIpRcKIsHabj4rNP7CjuER7f6eWjd4SBuZmXDBrsRHxJNPxLagprng3oe20kRENiGzKTAQkfiOVeKXeP03Lzu0qN3IM/Q8JT56Ef2BClkUp32tCqDhHZm9D3VCu
c9c39004-aaf5-4982-9a91-5992a1799e72	ef3a4e01-6f9a-4e3c-bf4a-fe9b6c77b9a1	certificate	MIICmzCCAYMCBgGb7gFfXTANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZhdGhsb3MwHhcNMjYwMTI0MDMxNTI2WhcNMzYwMTI0MDMxNzA2WjARMQ8wDQYDVQQDDAZhdGhsb3MwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDI64z7WlPHmLwCEv6Vz76YYKzJWM027R4ts0Z85biwmzYwRo9NmHpyQL/APB3xK9C9FWRqDETWoQ/NYYwdLGPWMCFHBgB2IE8WIvrxB7OAHvDrb8AVlhDQTNQpfZHHYFiKFkOjaKMIgZ8kJxaOZPI1LACWwouZig8XgGImQ01qM/aUsEDYpkhTnXe7IJU232rOlz1AK30hhOH2s4R/1PE1+c2fEpdcMa9Ue26eBS+cRHtpeVDTg5vk8HXZQ+SSbqHBBPm+SeUwXOS5RE1I4YBQwKIGF0fLbiFeI+uG9UqODBYpliUiaYDLl/3CsMWICZ+ZsniUiBVaLnIFSVlDeeSrAgMBAAEwDQYJKoZIhvcNAQELBQADggEBADoCZdAfQ1jRdHukpMQ9uU8ATA/a8/fw04crc8bFDAWIfFRVTfthVm8hj9lOLlFa8zxn/8yxPgd3oktO1S/SMkjcwfL61zdp20oK7sNCrr0Ednb2eYxx2BnDWTpWqFp6xDuoDBN2x7rMyooYSGmIxnAxgdXGx2hh+apT4Ht4TW4itr8d7ZLD1lBEu3IhdcCnSiU/s0kET4OhlUI1VZPQC4HnSeti4dniyxqB4VmNyZ/H3YJZXJJzUBiOnsmlwT/R4zJgIcxxTabrclAs/baZlSzdSj+XZBTf6nYUL2k7WHmE0t5Cok21KdEvulFmsarKH0TpCvszJ2QmZlOtjU1X2gQ=
4868c3ac-fbe4-4192-a0e3-39dff164e280	ef3a4e01-6f9a-4e3c-bf4a-fe9b6c77b9a1	priority	100
81b64ed4-b84a-4fe9-9b17-a2f29d82767f	cc2a0fd3-5222-4236-9ce5-7e14e51a1424	priority	100
9fba97d3-826b-4d04-b73d-fdb921e597fa	cc2a0fd3-5222-4236-9ce5-7e14e51a1424	secret	kKhB81e3t7SkTv29lVAmjg
cdc44dad-abc4-446b-9bff-ece79c5f3d91	cc2a0fd3-5222-4236-9ce5-7e14e51a1424	kid	eed5122e-0061-418d-8bb8-88e678435238
0453e77d-2d6c-4ae4-8cdf-a04618205f88	e1facf1d-fca2-4f19-8044-7dedee4c4885	algorithm	RSA-OAEP
b8978047-6d79-4d1f-8ea3-08070d0e2974	e1facf1d-fca2-4f19-8044-7dedee4c4885	privateKey	MIIEowIBAAKCAQEAlKCDh8rPMBGUFLvE+9rc3HuJ/09+J7kSub9xYTSel4A5MSyAjw4eEJ8aA4kEYtvHJAVZ3udDhHNqnJGKge1n/4LDUL/t6um9vl0Q0GgcpQ3fcS0VUYElWm+WbczRTj7d3B0kXSZufd4ADhr/N7MzxjHEbYTFXjvWOu6jZrqtlBJFpz/12kf/lG1bh4n+B2m/8DeL1rmDYR0pxCOBbnYhzM03hz1ZOC/Br1F4F2spQTytueCtUzpx1SGFuJi3QcGz9M/cyQ76A+4958mmqS70gfpyb7dIMnj5fELUHfE9oQomumdQfKsoAvf1x5lKqak7dcu9DPWWFtFNipMFmcDYnQIDAQABAoIBAA2fdM7iiQEX62HHIDQRiILxE+IB8EdF0HCUGplVUGAEkblvIc169siBPMosKenByUwE7Yrf2bFvPsthD7f/AbRK0Qo6vVz11b14HE1t7Yo3bk6aWkThOIJEjh48UscAPiepyCZ9mk0RJyIj2VbKpyk4cI+1Rr3vcCBwtSt6WuSicFB0v3IMp6NVwy0/Hi2KzpobM0pPJZtbjefWQQX0Q4RKq7cXOHXoHGwOaLwSbv6n2+Z89tJypwBy+wdWdcc8zYVl6BGrtdTTpfc12zkXaihSpv8uGqNwiHT/1EEnObMbFjbBaFvaqx3lOqm5jkB3XJ5phI96lV500qZ3CsXL7gECgYEAzQmFJRiHAAYvlROafAGsiM1lZ0Q4ji6ZxYH3EBEuQhp/WzMmAhxVYuR8ZNFzYjjdPhMrFYj36btiKmWAsy7BPq6thcXDq3WOH1T/nV9oDcIPZSeBOU4+Ajvc3GE+9ecZNsjw7ypDncQSGGQv4fn9nUWp/aNv7DxKEslAvk9c+4ECgYEAuZGftxwuyvd89E7ud42aQ2nUQb5Ase0gQN6n/s0Ya8wfPMfiWAp7yg1Sa67XTO5s4SAWk2zzgCtkQ5LJCrFXcxeJHLAzVbFi2xL9EqqIahBNRTPg6tB9yym2wjYBo6MQoXMTob9f9Jfz3Kpx5ATK+vmIoE1NtsPOI7rQah2R2x0CgYB6QVPvg4lzfTy/8flqOYFL7NSq12W1eZncx5quLOBdL/mCQqRGG+jZ141IfA8FoQxiaAGHjKzt4/ord2xe6uD05Ci5G+uI/8YnboIfrvSXR3/we7a0ma+lm1Yc3asx6oMBRJ1MrfG1T2TOwGZAotQTA6fRgbNJs8UjIHcHQsEZgQKBgCJtqSMw4GGZvx4YktetduRw+wdjg98+7k/6v1JfvNsrGNSPBShucX8QL61418sXJS4zZNzfRuINquF6l0AbnOzmffLLogqRCZU5lahj6UE8Wwmu0Vjfa6dIyvaHTJCOjWRW1FqbBfN8Sas0GENEvGAJ8dZD4Vo6Q8GPRGGbsNblAoGBAKQyUTbE9BJWcqVCQ2LBzx+Lwpm8DNGGrXanKedXQxaewcy/V/k2O9SfKRc9cb8LkgjfZIR2u4jGyHNnRn5UV3G++Q38DrJil8JN+u3n+0MT9jIlCiw3UN+8ZRlogwwQa3kezVYOJnj5bsK3hOlgL+E8YjCi/PuqvH7oWJWiFI7L
cf770883-2225-4ee3-a465-fa24d2e62145	e1facf1d-fca2-4f19-8044-7dedee4c4885	priority	100
9199a711-1aaa-4df5-a170-019d4515a4a7	e1facf1d-fca2-4f19-8044-7dedee4c4885	certificate	MIICmzCCAYMCBgGb7gFgujANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZhdGhsb3MwHhcNMjYwMTI0MDMxNTI2WhcNMzYwMTI0MDMxNzA2WjARMQ8wDQYDVQQDDAZhdGhsb3MwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCUoIOHys8wEZQUu8T72tzce4n/T34nuRK5v3FhNJ6XgDkxLICPDh4QnxoDiQRi28ckBVne50OEc2qckYqB7Wf/gsNQv+3q6b2+XRDQaBylDd9xLRVRgSVab5ZtzNFOPt3cHSRdJm593gAOGv83szPGMcRthMVeO9Y67qNmuq2UEkWnP/XaR/+UbVuHif4Hab/wN4vWuYNhHSnEI4FudiHMzTeHPVk4L8GvUXgXaylBPK254K1TOnHVIYW4mLdBwbP0z9zJDvoD7j3nyaapLvSB+nJvt0gyePl8QtQd8T2hCia6Z1B8qygC9/XHmUqpqTt1y70M9ZYW0U2KkwWZwNidAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAEvnr41Wt/y8BSxqDva5t7QwmtXaCH1bCqqSUIhP1p1kyhyLTCYnQZUgDZ+qxTpw6VFfozKit+GMXQpBCQ3PnNnxjAh41e5pGxpdA/BIZETZrTdAfp7MOyk0cEreS3ICFfVK3VNP1+kJ7ea+yIVLq2GOIUayTplk5IP3Z7IGNk5T3USO0r725RpsmXyOFOcbM5WfjEJWNL61aCSob8/Aq0NOo5CtkM4U+sYdnS2tXvfeI+RQSpRoacLb0Red8hSH4068+8EMnzEveQOUyneigJZGgAmcxXMrreNAe+j2tkZN81C2yFBKhroo25KIlPmF0p7DOcgvDwdbw0LMwTnM/TU=
75a7c589-0849-431a-8b7d-847e105761f1	e1facf1d-fca2-4f19-8044-7dedee4c4885	keyUse	ENC
09d52dec-2644-422a-af49-d801de7ff8bb	c14027f7-ab2b-480d-8668-5195a2f131f8	algorithm	HS256
1dd2dd5f-ad47-4e3c-a059-beeb822edeb4	c14027f7-ab2b-480d-8668-5195a2f131f8	priority	100
0ae0f04c-6a67-488e-b8fd-91e37d72be3d	c14027f7-ab2b-480d-8668-5195a2f131f8	secret	oJgrNmrNWxHjp3pRAWIEKeNiSaeknBC6n7rAzJc0NRh9_Uc0_J5gXGFUpASLzyCOo-Yd-y_QeBz8zm5dzOf4zw
b8f9e070-98bb-4764-8aea-4a0df5a8edd7	c14027f7-ab2b-480d-8668-5195a2f131f8	kid	aecb7d49-c5e6-4e77-b324-67cc7d8b104c
7fd95a55-3879-4bc0-bd54-ae5955c99b21	cf2d58de-0687-44fb-b54d-db10a54b57f0	allow-default-scopes	true
6f4a3667-1452-4630-936d-185b4c56cdd9	098e53d0-fff7-40de-8af7-49dba2bc9368	allowed-protocol-mapper-types	saml-user-attribute-mapper
9a461248-09f0-4262-a06c-8246e272cc95	098e53d0-fff7-40de-8af7-49dba2bc9368	allowed-protocol-mapper-types	saml-role-list-mapper
3b173593-066e-4e48-b34d-b0a1f602f049	098e53d0-fff7-40de-8af7-49dba2bc9368	allowed-protocol-mapper-types	oidc-usermodel-attribute-mapper
8f88f5aa-8833-41c8-9d7b-b406b0593972	098e53d0-fff7-40de-8af7-49dba2bc9368	allowed-protocol-mapper-types	oidc-address-mapper
3722c387-836e-44eb-a03c-0a3b47602d35	098e53d0-fff7-40de-8af7-49dba2bc9368	allowed-protocol-mapper-types	saml-user-property-mapper
ba3399cd-fe05-4ccc-96d4-1a4454f8f352	098e53d0-fff7-40de-8af7-49dba2bc9368	allowed-protocol-mapper-types	oidc-usermodel-property-mapper
dc1484ec-69cc-4ccd-bcf7-21664f768e0d	098e53d0-fff7-40de-8af7-49dba2bc9368	allowed-protocol-mapper-types	oidc-full-name-mapper
c4899a44-07e6-4021-894e-62490a425949	098e53d0-fff7-40de-8af7-49dba2bc9368	allowed-protocol-mapper-types	oidc-sha256-pairwise-sub-mapper
be32e1b4-3cc2-45d2-89f9-558b443d05d3	e39006e1-1a7d-416a-a2b8-c9f48db7b307	max-clients	200
539dc075-8f54-4372-b968-722054e2ee25	cd8e42e4-b23f-4d10-9ecf-5993eac5b157	allow-default-scopes	true
64866ccd-2eb5-49a8-a0d8-e4105d4642a6	2ff6b81d-9ecc-46dd-9f93-4c135083a2c2	allowed-protocol-mapper-types	oidc-sha256-pairwise-sub-mapper
62e86364-78b5-49bd-b855-360142573c64	2ff6b81d-9ecc-46dd-9f93-4c135083a2c2	allowed-protocol-mapper-types	oidc-full-name-mapper
afd5f594-93b5-44d3-bef5-f61e8804f48a	2ff6b81d-9ecc-46dd-9f93-4c135083a2c2	allowed-protocol-mapper-types	saml-user-attribute-mapper
6b83b5f9-45ca-41f3-a305-adc1afbb2ffc	2ff6b81d-9ecc-46dd-9f93-4c135083a2c2	allowed-protocol-mapper-types	oidc-usermodel-property-mapper
802dd5f4-baaa-4e4a-a9d7-e332cd8a2fa8	2ff6b81d-9ecc-46dd-9f93-4c135083a2c2	allowed-protocol-mapper-types	oidc-usermodel-attribute-mapper
a50c0962-d1e7-4254-896f-343f28e4928e	2ff6b81d-9ecc-46dd-9f93-4c135083a2c2	allowed-protocol-mapper-types	saml-user-property-mapper
7ff0c576-7e77-4aa5-b948-7763e8b2053c	2ff6b81d-9ecc-46dd-9f93-4c135083a2c2	allowed-protocol-mapper-types	saml-role-list-mapper
0ebd47af-9088-4d77-adef-ea54aaee2b67	2ff6b81d-9ecc-46dd-9f93-4c135083a2c2	allowed-protocol-mapper-types	oidc-address-mapper
33d2e374-6a1f-4bbf-a39c-67f4ea5d1af9	2a3ce7de-cecb-4740-abfb-42103b5db562	client-uris-must-match	true
3245ea30-4c10-4f0c-a8dc-c4bfc3b5df3b	2a3ce7de-cecb-4740-abfb-42103b5db562	host-sending-registration-request-must-match	true
\.


--
-- Data for Name: composite_role; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.composite_role (composite, child_role) FROM stdin;
b191d06c-173e-4d20-985f-a175e2a7af84	201d4990-7f3f-4ba4-b343-5d960b8475e8
b191d06c-173e-4d20-985f-a175e2a7af84	0b205bcf-3d4a-4484-a9da-2e7ed19b543b
b191d06c-173e-4d20-985f-a175e2a7af84	c4c1a917-15cd-48c2-904f-9e5e86590202
b191d06c-173e-4d20-985f-a175e2a7af84	28c81855-de3b-4d1c-9afd-06ab574c3d45
b191d06c-173e-4d20-985f-a175e2a7af84	361dfc04-6040-4874-8a6d-3de6040d69db
b191d06c-173e-4d20-985f-a175e2a7af84	3f9672ad-f625-4ba4-99ac-a9c9f7fa9bc5
b191d06c-173e-4d20-985f-a175e2a7af84	ac374305-2426-4f66-a911-fb60267aa311
b191d06c-173e-4d20-985f-a175e2a7af84	834b8842-8f8c-43a5-8ef7-e0ca5a3ae49f
b191d06c-173e-4d20-985f-a175e2a7af84	c7a607da-9115-4dfe-89f5-d6cebcf47744
b191d06c-173e-4d20-985f-a175e2a7af84	e6f9ddda-115d-4819-aaff-39c19bde713b
b191d06c-173e-4d20-985f-a175e2a7af84	18c72e76-b38a-4878-911c-43f6f942dc59
b191d06c-173e-4d20-985f-a175e2a7af84	2a0fed2f-d0c1-4b3a-b8a5-fb51df89f700
b191d06c-173e-4d20-985f-a175e2a7af84	1fbd46c1-fdc1-4fee-bf95-0c722b16c24b
b191d06c-173e-4d20-985f-a175e2a7af84	a4c7f2f6-1401-455a-b58f-4e3ad8ebd6cf
b191d06c-173e-4d20-985f-a175e2a7af84	3e51a5c8-9801-42fd-a9fa-984b17da4dec
b191d06c-173e-4d20-985f-a175e2a7af84	504eff3f-d3e5-4b1d-8b92-9473d677d98b
b191d06c-173e-4d20-985f-a175e2a7af84	4ef6a4c8-18ed-438f-b753-da43fb3bd146
b191d06c-173e-4d20-985f-a175e2a7af84	da66f5ae-c0fa-4947-b1be-15ea3c8bb0ee
28c81855-de3b-4d1c-9afd-06ab574c3d45	da66f5ae-c0fa-4947-b1be-15ea3c8bb0ee
28c81855-de3b-4d1c-9afd-06ab574c3d45	3e51a5c8-9801-42fd-a9fa-984b17da4dec
361dfc04-6040-4874-8a6d-3de6040d69db	504eff3f-d3e5-4b1d-8b92-9473d677d98b
db257eaa-4c5f-405d-9a98-b03d69f838f4	8bed2006-49a1-479a-be2c-da8ae1c35799
db257eaa-4c5f-405d-9a98-b03d69f838f4	2b960113-dc6f-4441-93f8-aa8203d03a32
2b960113-dc6f-4441-93f8-aa8203d03a32	e317d2dc-07ea-4f18-bc2b-07a2badf4e1f
eadf9d70-0b13-4475-9ca0-509f2afb5fd6	242f003b-1054-4814-aaad-d1fa23d30829
b191d06c-173e-4d20-985f-a175e2a7af84	f10501dd-ca25-42aa-8d06-4397af5b02d9
db257eaa-4c5f-405d-9a98-b03d69f838f4	03b15308-3f69-45b2-94d5-1770bb169820
db257eaa-4c5f-405d-9a98-b03d69f838f4	0ad7d013-124a-46bc-85b9-9d4fb62019e2
b191d06c-173e-4d20-985f-a175e2a7af84	45bc9ee4-8374-4c5d-a918-ee4357358122
b191d06c-173e-4d20-985f-a175e2a7af84	e62e7f2d-e5ef-478c-a9d5-b74df315862b
b191d06c-173e-4d20-985f-a175e2a7af84	9ad84872-36dd-43bb-8cc0-8197b74f964a
b191d06c-173e-4d20-985f-a175e2a7af84	5903645f-21e7-443e-9d18-b1ea7676d9eb
b191d06c-173e-4d20-985f-a175e2a7af84	9a9c1e8c-c921-41bc-84c1-21492da7f433
b191d06c-173e-4d20-985f-a175e2a7af84	101c7960-7c76-4cb9-9152-e6432daa8e60
b191d06c-173e-4d20-985f-a175e2a7af84	39f288d5-cd1d-4376-a9d6-667565540ed8
b191d06c-173e-4d20-985f-a175e2a7af84	8362020c-bf62-466e-8aec-e06c6eed1fad
b191d06c-173e-4d20-985f-a175e2a7af84	2037cdec-2aab-453e-ad70-b4213c8878d9
b191d06c-173e-4d20-985f-a175e2a7af84	1842e66a-1138-42d6-84ef-5d3167938ca0
b191d06c-173e-4d20-985f-a175e2a7af84	68e3ce88-300e-4808-a9a1-e90c4d081331
b191d06c-173e-4d20-985f-a175e2a7af84	95cced90-4f34-4efd-934c-8860d922b7f6
b191d06c-173e-4d20-985f-a175e2a7af84	2341f5e1-c24c-4e51-a7aa-ff651b2301fe
b191d06c-173e-4d20-985f-a175e2a7af84	5253fa4a-aefa-4a08-9880-6bf9d8355581
b191d06c-173e-4d20-985f-a175e2a7af84	ccbc7fa2-2a4d-4643-afa2-d077c734e12c
b191d06c-173e-4d20-985f-a175e2a7af84	aaae2708-1219-4b84-8c97-98e0c2a641cf
b191d06c-173e-4d20-985f-a175e2a7af84	d103b704-d45e-427c-b2f5-c75086fe5fa7
5903645f-21e7-443e-9d18-b1ea7676d9eb	ccbc7fa2-2a4d-4643-afa2-d077c734e12c
9ad84872-36dd-43bb-8cc0-8197b74f964a	5253fa4a-aefa-4a08-9880-6bf9d8355581
9ad84872-36dd-43bb-8cc0-8197b74f964a	d103b704-d45e-427c-b2f5-c75086fe5fa7
291221ab-6fab-4e9e-9b15-48ae841d5d87	40824a82-1477-4da7-917c-aacb6a9ba298
291221ab-6fab-4e9e-9b15-48ae841d5d87	97fd48d8-24a6-4caf-a755-9e65b065d428
291221ab-6fab-4e9e-9b15-48ae841d5d87	8188fc29-cba5-4bad-b5d7-dda3b87b8947
291221ab-6fab-4e9e-9b15-48ae841d5d87	bbe8d0b1-ea88-4918-b5d1-98d3c8b814d8
291221ab-6fab-4e9e-9b15-48ae841d5d87	ca4f9691-7b76-4c9a-96d0-b47f09556c8e
291221ab-6fab-4e9e-9b15-48ae841d5d87	99aeb260-f28c-4156-b1e2-ad3e31a1183e
291221ab-6fab-4e9e-9b15-48ae841d5d87	ff6ed0bf-a8b5-4e7c-b275-1ca17a3fb37f
291221ab-6fab-4e9e-9b15-48ae841d5d87	e8be7efe-8ca2-41e3-834c-8f447553c414
291221ab-6fab-4e9e-9b15-48ae841d5d87	f774867a-67e8-450f-b242-5ad9de8ac8b6
291221ab-6fab-4e9e-9b15-48ae841d5d87	7319d1d4-caeb-453c-8bbf-ad732d2a53b1
291221ab-6fab-4e9e-9b15-48ae841d5d87	95fb059e-7b91-4201-b3ea-a0c29390311b
291221ab-6fab-4e9e-9b15-48ae841d5d87	4a18c505-aa5e-4582-b1b6-c87e97ec2de6
291221ab-6fab-4e9e-9b15-48ae841d5d87	a44b73bc-e048-4443-935b-40d4200c7c05
291221ab-6fab-4e9e-9b15-48ae841d5d87	594ebf5a-e119-4f48-872a-487b036ab547
291221ab-6fab-4e9e-9b15-48ae841d5d87	53093b88-438a-450f-8556-96281f0a5fb4
291221ab-6fab-4e9e-9b15-48ae841d5d87	16d49972-b3d1-4bf1-af7a-0ed58d87f806
291221ab-6fab-4e9e-9b15-48ae841d5d87	a9e5bf04-c2d7-4403-abec-b7bdc19e81e9
4184f4a1-ef85-40e5-b9f8-e71c5cd938a5	441e2e47-453a-4296-aabd-d81ab9021804
8188fc29-cba5-4bad-b5d7-dda3b87b8947	594ebf5a-e119-4f48-872a-487b036ab547
8188fc29-cba5-4bad-b5d7-dda3b87b8947	a9e5bf04-c2d7-4403-abec-b7bdc19e81e9
bbe8d0b1-ea88-4918-b5d1-98d3c8b814d8	53093b88-438a-450f-8556-96281f0a5fb4
4184f4a1-ef85-40e5-b9f8-e71c5cd938a5	9778725f-eab5-44d8-bd7a-9f2ed2d2ab21
9778725f-eab5-44d8-bd7a-9f2ed2d2ab21	518935dd-cddf-4fc4-8dd1-327af57ac5d5
31ef3486-4cb8-4efa-a264-821a0b98ebf1	b8e3ce2c-cb33-463c-95c7-efdf421f3a4d
b191d06c-173e-4d20-985f-a175e2a7af84	64910855-1919-45d1-9d87-d2d549d571cf
291221ab-6fab-4e9e-9b15-48ae841d5d87	da2ecdcc-71b2-44af-885f-9f242807be8e
4184f4a1-ef85-40e5-b9f8-e71c5cd938a5	8955aec5-e951-46b8-ab6b-ac846f173c59
4184f4a1-ef85-40e5-b9f8-e71c5cd938a5	3cef1892-cfe2-40df-9da5-6bbe37702a97
\.


--
-- Data for Name: credential; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.credential (id, salt, type, user_id, created_date, user_label, secret_data, credential_data, priority) FROM stdin;
fe4a1689-edfe-44be-b332-bcb235124633	\N	password	ce1d92bf-aa46-484c-9dad-6e9d87836a65	1769192895755	\N	{"value":"Vpd21aY2xSXU6yoa7iItwO7BCVq9UdBJdoWAUbZGxKk=","salt":"E7MNw1CW3sSbtSPXnfurpg==","additionalParameters":{}}	{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}}	10
8fa1afbd-14ee-4dfa-9eec-c91cfbfe6882	\N	password	1a8900ff-32e9-4b6e-8f4d-14127363e431	1769352148634	\N	{"value":"VNlTnd6++5p/fmwZ59DYPsTORlq32bHLQvODH7Pb+EU=","salt":"bLNPt58OPF8C+uODsYGPZQ==","additionalParameters":{}}	{"hashIterations":27500,"algorithm":"pbkdf2-sha256","additionalParameters":{}}	10
\.


--
-- Data for Name: databasechangelog; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, md5sum, description, comments, tag, liquibase, contexts, labels, deployment_id) FROM stdin;
1.0.0.Final-KEYCLOAK-5461	sthorger@redhat.com	META-INF/jpa-changelog-1.0.0.Final.xml	2026-01-23 18:28:02.157529	1	EXECUTED	9:6f1016664e21e16d26517a4418f5e3df	createTable tableName=APPLICATION_DEFAULT_ROLES; createTable tableName=CLIENT; createTable tableName=CLIENT_SESSION; createTable tableName=CLIENT_SESSION_ROLE; createTable tableName=COMPOSITE_ROLE; createTable tableName=CREDENTIAL; createTable tab...		\N	4.23.2	\N	\N	9192879576
1.0.0.Final-KEYCLOAK-5461	sthorger@redhat.com	META-INF/db2-jpa-changelog-1.0.0.Final.xml	2026-01-23 18:28:02.265803	2	MARK_RAN	9:828775b1596a07d1200ba1d49e5e3941	createTable tableName=APPLICATION_DEFAULT_ROLES; createTable tableName=CLIENT; createTable tableName=CLIENT_SESSION; createTable tableName=CLIENT_SESSION_ROLE; createTable tableName=COMPOSITE_ROLE; createTable tableName=CREDENTIAL; createTable tab...		\N	4.23.2	\N	\N	9192879576
1.1.0.Beta1	sthorger@redhat.com	META-INF/jpa-changelog-1.1.0.Beta1.xml	2026-01-23 18:28:02.443605	3	EXECUTED	9:5f090e44a7d595883c1fb61f4b41fd38	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION; createTable tableName=CLIENT_ATTRIBUTES; createTable tableName=CLIENT_SESSION_NOTE; createTable tableName=APP_NODE_REGISTRATIONS; addColumn table...		\N	4.23.2	\N	\N	9192879576
1.1.0.Final	sthorger@redhat.com	META-INF/jpa-changelog-1.1.0.Final.xml	2026-01-23 18:28:02.466967	4	EXECUTED	9:c07e577387a3d2c04d1adc9aaad8730e	renameColumn newColumnName=EVENT_TIME, oldColumnName=TIME, tableName=EVENT_ENTITY		\N	4.23.2	\N	\N	9192879576
1.2.0.Beta1	psilva@redhat.com	META-INF/jpa-changelog-1.2.0.Beta1.xml	2026-01-23 18:28:03.044009	5	EXECUTED	9:b68ce996c655922dbcd2fe6b6ae72686	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION; createTable tableName=PROTOCOL_MAPPER; createTable tableName=PROTOCOL_MAPPER_CONFIG; createTable tableName=...		\N	4.23.2	\N	\N	9192879576
1.2.0.Beta1	psilva@redhat.com	META-INF/db2-jpa-changelog-1.2.0.Beta1.xml	2026-01-23 18:28:03.132265	6	MARK_RAN	9:543b5c9989f024fe35c6f6c5a97de88e	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION; createTable tableName=PROTOCOL_MAPPER; createTable tableName=PROTOCOL_MAPPER_CONFIG; createTable tableName=...		\N	4.23.2	\N	\N	9192879576
1.2.0.RC1	bburke@redhat.com	META-INF/jpa-changelog-1.2.0.CR1.xml	2026-01-23 18:28:03.710587	7	EXECUTED	9:765afebbe21cf5bbca048e632df38336	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete tableName=USER_SESSION; createTable tableName=MIGRATION_MODEL; createTable tableName=IDENTITY_P...		\N	4.23.2	\N	\N	9192879576
1.2.0.RC1	bburke@redhat.com	META-INF/db2-jpa-changelog-1.2.0.CR1.xml	2026-01-23 18:28:03.810463	8	MARK_RAN	9:db4a145ba11a6fdaefb397f6dbf829a1	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete tableName=USER_SESSION; createTable tableName=MIGRATION_MODEL; createTable tableName=IDENTITY_P...		\N	4.23.2	\N	\N	9192879576
1.2.0.Final	keycloak	META-INF/jpa-changelog-1.2.0.Final.xml	2026-01-23 18:28:03.849637	9	EXECUTED	9:9d05c7be10cdb873f8bcb41bc3a8ab23	update tableName=CLIENT; update tableName=CLIENT; update tableName=CLIENT		\N	4.23.2	\N	\N	9192879576
1.3.0	bburke@redhat.com	META-INF/jpa-changelog-1.3.0.xml	2026-01-23 18:28:04.200914	10	EXECUTED	9:18593702353128d53111f9b1ff0b82b8	delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete tableName=USER_SESSION; createTable tableName=ADMI...		\N	4.23.2	\N	\N	9192879576
1.4.0	bburke@redhat.com	META-INF/jpa-changelog-1.4.0.xml	2026-01-23 18:28:04.359627	11	EXECUTED	9:6122efe5f090e41a85c0f1c9e52cbb62	delete tableName=CLIENT_SESSION_AUTH_STATUS; delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete table...		\N	4.23.2	\N	\N	9192879576
1.4.0	bburke@redhat.com	META-INF/db2-jpa-changelog-1.4.0.xml	2026-01-23 18:28:04.420017	12	MARK_RAN	9:e1ff28bf7568451453f844c5d54bb0b5	delete tableName=CLIENT_SESSION_AUTH_STATUS; delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete table...		\N	4.23.2	\N	\N	9192879576
1.5.0	bburke@redhat.com	META-INF/jpa-changelog-1.5.0.xml	2026-01-23 18:28:04.569852	13	EXECUTED	9:7af32cd8957fbc069f796b61217483fd	delete tableName=CLIENT_SESSION_AUTH_STATUS; delete tableName=CLIENT_SESSION_ROLE; delete tableName=CLIENT_SESSION_PROT_MAPPER; delete tableName=CLIENT_SESSION_NOTE; delete tableName=CLIENT_SESSION; delete tableName=USER_SESSION_NOTE; delete table...		\N	4.23.2	\N	\N	9192879576
1.6.1_from15	mposolda@redhat.com	META-INF/jpa-changelog-1.6.1.xml	2026-01-23 18:28:04.699799	14	EXECUTED	9:6005e15e84714cd83226bf7879f54190	addColumn tableName=REALM; addColumn tableName=KEYCLOAK_ROLE; addColumn tableName=CLIENT; createTable tableName=OFFLINE_USER_SESSION; createTable tableName=OFFLINE_CLIENT_SESSION; addPrimaryKey constraintName=CONSTRAINT_OFFL_US_SES_PK2, tableName=...		\N	4.23.2	\N	\N	9192879576
1.6.1_from16-pre	mposolda@redhat.com	META-INF/jpa-changelog-1.6.1.xml	2026-01-23 18:28:04.706387	15	MARK_RAN	9:bf656f5a2b055d07f314431cae76f06c	delete tableName=OFFLINE_CLIENT_SESSION; delete tableName=OFFLINE_USER_SESSION		\N	4.23.2	\N	\N	9192879576
1.6.1_from16	mposolda@redhat.com	META-INF/jpa-changelog-1.6.1.xml	2026-01-23 18:28:04.717617	16	MARK_RAN	9:f8dadc9284440469dcf71e25ca6ab99b	dropPrimaryKey constraintName=CONSTRAINT_OFFLINE_US_SES_PK, tableName=OFFLINE_USER_SESSION; dropPrimaryKey constraintName=CONSTRAINT_OFFLINE_CL_SES_PK, tableName=OFFLINE_CLIENT_SESSION; addColumn tableName=OFFLINE_USER_SESSION; update tableName=OF...		\N	4.23.2	\N	\N	9192879576
1.6.1	mposolda@redhat.com	META-INF/jpa-changelog-1.6.1.xml	2026-01-23 18:28:04.725638	17	EXECUTED	9:d41d8cd98f00b204e9800998ecf8427e	empty		\N	4.23.2	\N	\N	9192879576
1.7.0	bburke@redhat.com	META-INF/jpa-changelog-1.7.0.xml	2026-01-23 18:28:04.886236	18	EXECUTED	9:3368ff0be4c2855ee2dd9ca813b38d8e	createTable tableName=KEYCLOAK_GROUP; createTable tableName=GROUP_ROLE_MAPPING; createTable tableName=GROUP_ATTRIBUTE; createTable tableName=USER_GROUP_MEMBERSHIP; createTable tableName=REALM_DEFAULT_GROUPS; addColumn tableName=IDENTITY_PROVIDER; ...		\N	4.23.2	\N	\N	9192879576
1.8.0	mposolda@redhat.com	META-INF/jpa-changelog-1.8.0.xml	2026-01-23 18:28:05.029787	19	EXECUTED	9:8ac2fb5dd030b24c0570a763ed75ed20	addColumn tableName=IDENTITY_PROVIDER; createTable tableName=CLIENT_TEMPLATE; createTable tableName=CLIENT_TEMPLATE_ATTRIBUTES; createTable tableName=TEMPLATE_SCOPE_MAPPING; dropNotNullConstraint columnName=CLIENT_ID, tableName=PROTOCOL_MAPPER; ad...		\N	4.23.2	\N	\N	9192879576
1.8.0-2	keycloak	META-INF/jpa-changelog-1.8.0.xml	2026-01-23 18:28:05.045989	20	EXECUTED	9:f91ddca9b19743db60e3057679810e6c	dropDefaultValue columnName=ALGORITHM, tableName=CREDENTIAL; update tableName=CREDENTIAL		\N	4.23.2	\N	\N	9192879576
1.8.0	mposolda@redhat.com	META-INF/db2-jpa-changelog-1.8.0.xml	2026-01-23 18:28:05.071744	21	MARK_RAN	9:831e82914316dc8a57dc09d755f23c51	addColumn tableName=IDENTITY_PROVIDER; createTable tableName=CLIENT_TEMPLATE; createTable tableName=CLIENT_TEMPLATE_ATTRIBUTES; createTable tableName=TEMPLATE_SCOPE_MAPPING; dropNotNullConstraint columnName=CLIENT_ID, tableName=PROTOCOL_MAPPER; ad...		\N	4.23.2	\N	\N	9192879576
1.8.0-2	keycloak	META-INF/db2-jpa-changelog-1.8.0.xml	2026-01-23 18:28:05.08089	22	MARK_RAN	9:f91ddca9b19743db60e3057679810e6c	dropDefaultValue columnName=ALGORITHM, tableName=CREDENTIAL; update tableName=CREDENTIAL		\N	4.23.2	\N	\N	9192879576
1.9.0	mposolda@redhat.com	META-INF/jpa-changelog-1.9.0.xml	2026-01-23 18:28:05.161643	23	EXECUTED	9:bc3d0f9e823a69dc21e23e94c7a94bb1	update tableName=REALM; update tableName=REALM; update tableName=REALM; update tableName=REALM; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=REALM; update tableName=REALM; customChange; dr...		\N	4.23.2	\N	\N	9192879576
1.9.1	keycloak	META-INF/jpa-changelog-1.9.1.xml	2026-01-23 18:28:05.178101	24	EXECUTED	9:c9999da42f543575ab790e76439a2679	modifyDataType columnName=PRIVATE_KEY, tableName=REALM; modifyDataType columnName=PUBLIC_KEY, tableName=REALM; modifyDataType columnName=CERTIFICATE, tableName=REALM		\N	4.23.2	\N	\N	9192879576
1.9.1	keycloak	META-INF/db2-jpa-changelog-1.9.1.xml	2026-01-23 18:28:05.184484	25	MARK_RAN	9:0d6c65c6f58732d81569e77b10ba301d	modifyDataType columnName=PRIVATE_KEY, tableName=REALM; modifyDataType columnName=CERTIFICATE, tableName=REALM		\N	4.23.2	\N	\N	9192879576
1.9.2	keycloak	META-INF/jpa-changelog-1.9.2.xml	2026-01-23 18:28:05.279029	26	EXECUTED	9:fc576660fc016ae53d2d4778d84d86d0	createIndex indexName=IDX_USER_EMAIL, tableName=USER_ENTITY; createIndex indexName=IDX_USER_ROLE_MAPPING, tableName=USER_ROLE_MAPPING; createIndex indexName=IDX_USER_GROUP_MAPPING, tableName=USER_GROUP_MEMBERSHIP; createIndex indexName=IDX_USER_CO...		\N	4.23.2	\N	\N	9192879576
authz-2.0.0	psilva@redhat.com	META-INF/jpa-changelog-authz-2.0.0.xml	2026-01-23 18:28:05.531704	27	EXECUTED	9:43ed6b0da89ff77206289e87eaa9c024	createTable tableName=RESOURCE_SERVER; addPrimaryKey constraintName=CONSTRAINT_FARS, tableName=RESOURCE_SERVER; addUniqueConstraint constraintName=UK_AU8TT6T700S9V50BU18WS5HA6, tableName=RESOURCE_SERVER; createTable tableName=RESOURCE_SERVER_RESOU...		\N	4.23.2	\N	\N	9192879576
authz-2.5.1	psilva@redhat.com	META-INF/jpa-changelog-authz-2.5.1.xml	2026-01-23 18:28:05.553974	28	EXECUTED	9:44bae577f551b3738740281eceb4ea70	update tableName=RESOURCE_SERVER_POLICY		\N	4.23.2	\N	\N	9192879576
2.1.0-KEYCLOAK-5461	bburke@redhat.com	META-INF/jpa-changelog-2.1.0.xml	2026-01-23 18:28:05.921442	29	EXECUTED	9:bd88e1f833df0420b01e114533aee5e8	createTable tableName=BROKER_LINK; createTable tableName=FED_USER_ATTRIBUTE; createTable tableName=FED_USER_CONSENT; createTable tableName=FED_USER_CONSENT_ROLE; createTable tableName=FED_USER_CONSENT_PROT_MAPPER; createTable tableName=FED_USER_CR...		\N	4.23.2	\N	\N	9192879576
2.2.0	bburke@redhat.com	META-INF/jpa-changelog-2.2.0.xml	2026-01-23 18:28:05.966354	30	EXECUTED	9:a7022af5267f019d020edfe316ef4371	addColumn tableName=ADMIN_EVENT_ENTITY; createTable tableName=CREDENTIAL_ATTRIBUTE; createTable tableName=FED_CREDENTIAL_ATTRIBUTE; modifyDataType columnName=VALUE, tableName=CREDENTIAL; addForeignKeyConstraint baseTableName=FED_CREDENTIAL_ATTRIBU...		\N	4.23.2	\N	\N	9192879576
2.3.0	bburke@redhat.com	META-INF/jpa-changelog-2.3.0.xml	2026-01-23 18:28:06.014401	31	EXECUTED	9:fc155c394040654d6a79227e56f5e25a	createTable tableName=FEDERATED_USER; addPrimaryKey constraintName=CONSTR_FEDERATED_USER, tableName=FEDERATED_USER; dropDefaultValue columnName=TOTP, tableName=USER_ENTITY; dropColumn columnName=TOTP, tableName=USER_ENTITY; addColumn tableName=IDE...		\N	4.23.2	\N	\N	9192879576
2.4.0	bburke@redhat.com	META-INF/jpa-changelog-2.4.0.xml	2026-01-23 18:28:06.024718	32	EXECUTED	9:eac4ffb2a14795e5dc7b426063e54d88	customChange		\N	4.23.2	\N	\N	9192879576
2.5.0	bburke@redhat.com	META-INF/jpa-changelog-2.5.0.xml	2026-01-23 18:28:06.039762	33	EXECUTED	9:54937c05672568c4c64fc9524c1e9462	customChange; modifyDataType columnName=USER_ID, tableName=OFFLINE_USER_SESSION		\N	4.23.2	\N	\N	9192879576
2.5.0-unicode-oracle	hmlnarik@redhat.com	META-INF/jpa-changelog-2.5.0.xml	2026-01-23 18:28:06.049943	34	MARK_RAN	9:3a32bace77c84d7678d035a7f5a8084e	modifyDataType columnName=DESCRIPTION, tableName=AUTHENTICATION_FLOW; modifyDataType columnName=DESCRIPTION, tableName=CLIENT_TEMPLATE; modifyDataType columnName=DESCRIPTION, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=DESCRIPTION,...		\N	4.23.2	\N	\N	9192879576
2.5.0-unicode-other-dbs	hmlnarik@redhat.com	META-INF/jpa-changelog-2.5.0.xml	2026-01-23 18:28:06.139857	35	EXECUTED	9:33d72168746f81f98ae3a1e8e0ca3554	modifyDataType columnName=DESCRIPTION, tableName=AUTHENTICATION_FLOW; modifyDataType columnName=DESCRIPTION, tableName=CLIENT_TEMPLATE; modifyDataType columnName=DESCRIPTION, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=DESCRIPTION,...		\N	4.23.2	\N	\N	9192879576
2.5.0-duplicate-email-support	slawomir@dabek.name	META-INF/jpa-changelog-2.5.0.xml	2026-01-23 18:28:06.156132	36	EXECUTED	9:61b6d3d7a4c0e0024b0c839da283da0c	addColumn tableName=REALM		\N	4.23.2	\N	\N	9192879576
2.5.0-unique-group-names	hmlnarik@redhat.com	META-INF/jpa-changelog-2.5.0.xml	2026-01-23 18:28:06.175018	37	EXECUTED	9:8dcac7bdf7378e7d823cdfddebf72fda	addUniqueConstraint constraintName=SIBLING_NAMES, tableName=KEYCLOAK_GROUP		\N	4.23.2	\N	\N	9192879576
2.5.1	bburke@redhat.com	META-INF/jpa-changelog-2.5.1.xml	2026-01-23 18:28:06.187384	38	EXECUTED	9:a2b870802540cb3faa72098db5388af3	addColumn tableName=FED_USER_CONSENT		\N	4.23.2	\N	\N	9192879576
3.0.0	bburke@redhat.com	META-INF/jpa-changelog-3.0.0.xml	2026-01-23 18:28:06.198944	39	EXECUTED	9:132a67499ba24bcc54fb5cbdcfe7e4c0	addColumn tableName=IDENTITY_PROVIDER		\N	4.23.2	\N	\N	9192879576
3.2.0-fix	keycloak	META-INF/jpa-changelog-3.2.0.xml	2026-01-23 18:28:06.204879	40	MARK_RAN	9:938f894c032f5430f2b0fafb1a243462	addNotNullConstraint columnName=REALM_ID, tableName=CLIENT_INITIAL_ACCESS		\N	4.23.2	\N	\N	9192879576
3.2.0-fix-with-keycloak-5416	keycloak	META-INF/jpa-changelog-3.2.0.xml	2026-01-23 18:28:06.212255	41	MARK_RAN	9:845c332ff1874dc5d35974b0babf3006	dropIndex indexName=IDX_CLIENT_INIT_ACC_REALM, tableName=CLIENT_INITIAL_ACCESS; addNotNullConstraint columnName=REALM_ID, tableName=CLIENT_INITIAL_ACCESS; createIndex indexName=IDX_CLIENT_INIT_ACC_REALM, tableName=CLIENT_INITIAL_ACCESS		\N	4.23.2	\N	\N	9192879576
3.2.0-fix-offline-sessions	hmlnarik	META-INF/jpa-changelog-3.2.0.xml	2026-01-23 18:28:06.225777	42	EXECUTED	9:fc86359c079781adc577c5a217e4d04c	customChange		\N	4.23.2	\N	\N	9192879576
3.2.0-fixed	keycloak	META-INF/jpa-changelog-3.2.0.xml	2026-01-23 18:28:06.623849	43	EXECUTED	9:59a64800e3c0d09b825f8a3b444fa8f4	addColumn tableName=REALM; dropPrimaryKey constraintName=CONSTRAINT_OFFL_CL_SES_PK2, tableName=OFFLINE_CLIENT_SESSION; dropColumn columnName=CLIENT_SESSION_ID, tableName=OFFLINE_CLIENT_SESSION; addPrimaryKey constraintName=CONSTRAINT_OFFL_CL_SES_P...		\N	4.23.2	\N	\N	9192879576
3.3.0	keycloak	META-INF/jpa-changelog-3.3.0.xml	2026-01-23 18:28:06.648889	44	EXECUTED	9:d48d6da5c6ccf667807f633fe489ce88	addColumn tableName=USER_ENTITY		\N	4.23.2	\N	\N	9192879576
authz-3.4.0.CR1-resource-server-pk-change-part1	glavoie@gmail.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-01-23 18:28:06.66674	45	EXECUTED	9:dde36f7973e80d71fceee683bc5d2951	addColumn tableName=RESOURCE_SERVER_POLICY; addColumn tableName=RESOURCE_SERVER_RESOURCE; addColumn tableName=RESOURCE_SERVER_SCOPE		\N	4.23.2	\N	\N	9192879576
authz-3.4.0.CR1-resource-server-pk-change-part2-KEYCLOAK-6095	hmlnarik@redhat.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-01-23 18:28:06.685009	46	EXECUTED	9:b855e9b0a406b34fa323235a0cf4f640	customChange		\N	4.23.2	\N	\N	9192879576
authz-3.4.0.CR1-resource-server-pk-change-part3-fixed	glavoie@gmail.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-01-23 18:28:06.691718	47	MARK_RAN	9:51abbacd7b416c50c4421a8cabf7927e	dropIndex indexName=IDX_RES_SERV_POL_RES_SERV, tableName=RESOURCE_SERVER_POLICY; dropIndex indexName=IDX_RES_SRV_RES_RES_SRV, tableName=RESOURCE_SERVER_RESOURCE; dropIndex indexName=IDX_RES_SRV_SCOPE_RES_SRV, tableName=RESOURCE_SERVER_SCOPE		\N	4.23.2	\N	\N	9192879576
authz-3.4.0.CR1-resource-server-pk-change-part3-fixed-nodropindex	glavoie@gmail.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-01-23 18:28:06.94212	48	EXECUTED	9:bdc99e567b3398bac83263d375aad143	addNotNullConstraint columnName=RESOURCE_SERVER_CLIENT_ID, tableName=RESOURCE_SERVER_POLICY; addNotNullConstraint columnName=RESOURCE_SERVER_CLIENT_ID, tableName=RESOURCE_SERVER_RESOURCE; addNotNullConstraint columnName=RESOURCE_SERVER_CLIENT_ID, ...		\N	4.23.2	\N	\N	9192879576
authn-3.4.0.CR1-refresh-token-max-reuse	glavoie@gmail.com	META-INF/jpa-changelog-authz-3.4.0.CR1.xml	2026-01-23 18:28:06.963602	49	EXECUTED	9:d198654156881c46bfba39abd7769e69	addColumn tableName=REALM		\N	4.23.2	\N	\N	9192879576
3.4.0	keycloak	META-INF/jpa-changelog-3.4.0.xml	2026-01-23 18:28:07.223955	50	EXECUTED	9:cfdd8736332ccdd72c5256ccb42335db	addPrimaryKey constraintName=CONSTRAINT_REALM_DEFAULT_ROLES, tableName=REALM_DEFAULT_ROLES; addPrimaryKey constraintName=CONSTRAINT_COMPOSITE_ROLE, tableName=COMPOSITE_ROLE; addPrimaryKey constraintName=CONSTR_REALM_DEFAULT_GROUPS, tableName=REALM...		\N	4.23.2	\N	\N	9192879576
3.4.0-KEYCLOAK-5230	hmlnarik@redhat.com	META-INF/jpa-changelog-3.4.0.xml	2026-01-23 18:28:07.362508	51	EXECUTED	9:7c84de3d9bd84d7f077607c1a4dcb714	createIndex indexName=IDX_FU_ATTRIBUTE, tableName=FED_USER_ATTRIBUTE; createIndex indexName=IDX_FU_CONSENT, tableName=FED_USER_CONSENT; createIndex indexName=IDX_FU_CONSENT_RU, tableName=FED_USER_CONSENT; createIndex indexName=IDX_FU_CREDENTIAL, t...		\N	4.23.2	\N	\N	9192879576
3.4.1	psilva@redhat.com	META-INF/jpa-changelog-3.4.1.xml	2026-01-23 18:28:07.372329	52	EXECUTED	9:5a6bb36cbefb6a9d6928452c0852af2d	modifyDataType columnName=VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	9192879576
3.4.2	keycloak	META-INF/jpa-changelog-3.4.2.xml	2026-01-23 18:28:07.379294	53	EXECUTED	9:8f23e334dbc59f82e0a328373ca6ced0	update tableName=REALM		\N	4.23.2	\N	\N	9192879576
3.4.2-KEYCLOAK-5172	mkanis@redhat.com	META-INF/jpa-changelog-3.4.2.xml	2026-01-23 18:28:07.387195	54	EXECUTED	9:9156214268f09d970cdf0e1564d866af	update tableName=CLIENT		\N	4.23.2	\N	\N	9192879576
4.0.0-KEYCLOAK-6335	bburke@redhat.com	META-INF/jpa-changelog-4.0.0.xml	2026-01-23 18:28:07.410877	55	EXECUTED	9:db806613b1ed154826c02610b7dbdf74	createTable tableName=CLIENT_AUTH_FLOW_BINDINGS; addPrimaryKey constraintName=C_CLI_FLOW_BIND, tableName=CLIENT_AUTH_FLOW_BINDINGS		\N	4.23.2	\N	\N	9192879576
4.0.0-CLEANUP-UNUSED-TABLE	bburke@redhat.com	META-INF/jpa-changelog-4.0.0.xml	2026-01-23 18:28:07.461443	56	EXECUTED	9:229a041fb72d5beac76bb94a5fa709de	dropTable tableName=CLIENT_IDENTITY_PROV_MAPPING		\N	4.23.2	\N	\N	9192879576
4.0.0-KEYCLOAK-6228	bburke@redhat.com	META-INF/jpa-changelog-4.0.0.xml	2026-01-23 18:28:07.681895	57	EXECUTED	9:079899dade9c1e683f26b2aa9ca6ff04	dropUniqueConstraint constraintName=UK_JKUWUVD56ONTGSUHOGM8UEWRT, tableName=USER_CONSENT; dropNotNullConstraint columnName=CLIENT_ID, tableName=USER_CONSENT; addColumn tableName=USER_CONSENT; addUniqueConstraint constraintName=UK_JKUWUVD56ONTGSUHO...		\N	4.23.2	\N	\N	9192879576
4.0.0-KEYCLOAK-5579-fixed	mposolda@redhat.com	META-INF/jpa-changelog-4.0.0.xml	2026-01-23 18:28:08.086375	58	EXECUTED	9:139b79bcbbfe903bb1c2d2a4dbf001d9	dropForeignKeyConstraint baseTableName=CLIENT_TEMPLATE_ATTRIBUTES, constraintName=FK_CL_TEMPL_ATTR_TEMPL; renameTable newTableName=CLIENT_SCOPE_ATTRIBUTES, oldTableName=CLIENT_TEMPLATE_ATTRIBUTES; renameColumn newColumnName=SCOPE_ID, oldColumnName...		\N	4.23.2	\N	\N	9192879576
authz-4.0.0.CR1	psilva@redhat.com	META-INF/jpa-changelog-authz-4.0.0.CR1.xml	2026-01-23 18:28:08.251918	59	EXECUTED	9:b55738ad889860c625ba2bf483495a04	createTable tableName=RESOURCE_SERVER_PERM_TICKET; addPrimaryKey constraintName=CONSTRAINT_FAPMT, tableName=RESOURCE_SERVER_PERM_TICKET; addForeignKeyConstraint baseTableName=RESOURCE_SERVER_PERM_TICKET, constraintName=FK_FRSRHO213XCX4WNKOG82SSPMT...		\N	4.23.2	\N	\N	9192879576
authz-4.0.0.Beta3	psilva@redhat.com	META-INF/jpa-changelog-authz-4.0.0.Beta3.xml	2026-01-23 18:28:08.295042	60	EXECUTED	9:e0057eac39aa8fc8e09ac6cfa4ae15fe	addColumn tableName=RESOURCE_SERVER_POLICY; addColumn tableName=RESOURCE_SERVER_PERM_TICKET; addForeignKeyConstraint baseTableName=RESOURCE_SERVER_PERM_TICKET, constraintName=FK_FRSRPO2128CX4WNKOG82SSRFY, referencedTableName=RESOURCE_SERVER_POLICY		\N	4.23.2	\N	\N	9192879576
authz-4.2.0.Final	mhajas@redhat.com	META-INF/jpa-changelog-authz-4.2.0.Final.xml	2026-01-23 18:28:08.355866	61	EXECUTED	9:42a33806f3a0443fe0e7feeec821326c	createTable tableName=RESOURCE_URIS; addForeignKeyConstraint baseTableName=RESOURCE_URIS, constraintName=FK_RESOURCE_SERVER_URIS, referencedTableName=RESOURCE_SERVER_RESOURCE; customChange; dropColumn columnName=URI, tableName=RESOURCE_SERVER_RESO...		\N	4.23.2	\N	\N	9192879576
authz-4.2.0.Final-KEYCLOAK-9944	hmlnarik@redhat.com	META-INF/jpa-changelog-authz-4.2.0.Final.xml	2026-01-23 18:28:08.389886	62	EXECUTED	9:9968206fca46eecc1f51db9c024bfe56	addPrimaryKey constraintName=CONSTRAINT_RESOUR_URIS_PK, tableName=RESOURCE_URIS		\N	4.23.2	\N	\N	9192879576
4.2.0-KEYCLOAK-6313	wadahiro@gmail.com	META-INF/jpa-changelog-4.2.0.xml	2026-01-23 18:28:08.412162	63	EXECUTED	9:92143a6daea0a3f3b8f598c97ce55c3d	addColumn tableName=REQUIRED_ACTION_PROVIDER		\N	4.23.2	\N	\N	9192879576
4.3.0-KEYCLOAK-7984	wadahiro@gmail.com	META-INF/jpa-changelog-4.3.0.xml	2026-01-23 18:28:08.432916	64	EXECUTED	9:82bab26a27195d889fb0429003b18f40	update tableName=REQUIRED_ACTION_PROVIDER		\N	4.23.2	\N	\N	9192879576
4.6.0-KEYCLOAK-7950	psilva@redhat.com	META-INF/jpa-changelog-4.6.0.xml	2026-01-23 18:28:08.453625	65	EXECUTED	9:e590c88ddc0b38b0ae4249bbfcb5abc3	update tableName=RESOURCE_SERVER_RESOURCE		\N	4.23.2	\N	\N	9192879576
4.6.0-KEYCLOAK-8377	keycloak	META-INF/jpa-changelog-4.6.0.xml	2026-01-23 18:28:08.537904	66	EXECUTED	9:5c1f475536118dbdc38d5d7977950cc0	createTable tableName=ROLE_ATTRIBUTE; addPrimaryKey constraintName=CONSTRAINT_ROLE_ATTRIBUTE_PK, tableName=ROLE_ATTRIBUTE; addForeignKeyConstraint baseTableName=ROLE_ATTRIBUTE, constraintName=FK_ROLE_ATTRIBUTE_ID, referencedTableName=KEYCLOAK_ROLE...		\N	4.23.2	\N	\N	9192879576
4.6.0-KEYCLOAK-8555	gideonray@gmail.com	META-INF/jpa-changelog-4.6.0.xml	2026-01-23 18:28:08.567372	67	EXECUTED	9:e7c9f5f9c4d67ccbbcc215440c718a17	createIndex indexName=IDX_COMPONENT_PROVIDER_TYPE, tableName=COMPONENT		\N	4.23.2	\N	\N	9192879576
4.7.0-KEYCLOAK-1267	sguilhen@redhat.com	META-INF/jpa-changelog-4.7.0.xml	2026-01-23 18:28:08.595558	68	EXECUTED	9:88e0bfdda924690d6f4e430c53447dd5	addColumn tableName=REALM		\N	4.23.2	\N	\N	9192879576
4.7.0-KEYCLOAK-7275	keycloak	META-INF/jpa-changelog-4.7.0.xml	2026-01-23 18:28:08.652849	69	EXECUTED	9:f53177f137e1c46b6a88c59ec1cb5218	renameColumn newColumnName=CREATED_ON, oldColumnName=LAST_SESSION_REFRESH, tableName=OFFLINE_USER_SESSION; addNotNullConstraint columnName=CREATED_ON, tableName=OFFLINE_USER_SESSION; addColumn tableName=OFFLINE_USER_SESSION; customChange; createIn...		\N	4.23.2	\N	\N	9192879576
4.8.0-KEYCLOAK-8835	sguilhen@redhat.com	META-INF/jpa-changelog-4.8.0.xml	2026-01-23 18:28:08.679422	70	EXECUTED	9:a74d33da4dc42a37ec27121580d1459f	addNotNullConstraint columnName=SSO_MAX_LIFESPAN_REMEMBER_ME, tableName=REALM; addNotNullConstraint columnName=SSO_IDLE_TIMEOUT_REMEMBER_ME, tableName=REALM		\N	4.23.2	\N	\N	9192879576
authz-7.0.0-KEYCLOAK-10443	psilva@redhat.com	META-INF/jpa-changelog-authz-7.0.0.xml	2026-01-23 18:28:08.699701	71	EXECUTED	9:fd4ade7b90c3b67fae0bfcfcb42dfb5f	addColumn tableName=RESOURCE_SERVER		\N	4.23.2	\N	\N	9192879576
8.0.0-adding-credential-columns	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-01-23 18:28:08.73439	72	EXECUTED	9:aa072ad090bbba210d8f18781b8cebf4	addColumn tableName=CREDENTIAL; addColumn tableName=FED_USER_CREDENTIAL		\N	4.23.2	\N	\N	9192879576
8.0.0-updating-credential-data-not-oracle-fixed	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-01-23 18:28:08.777618	73	EXECUTED	9:1ae6be29bab7c2aa376f6983b932be37	update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL		\N	4.23.2	\N	\N	9192879576
8.0.0-updating-credential-data-oracle-fixed	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-01-23 18:28:08.79002	74	MARK_RAN	9:14706f286953fc9a25286dbd8fb30d97	update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL; update tableName=FED_USER_CREDENTIAL		\N	4.23.2	\N	\N	9192879576
8.0.0-credential-cleanup-fixed	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-01-23 18:28:08.937941	75	EXECUTED	9:2b9cc12779be32c5b40e2e67711a218b	dropDefaultValue columnName=COUNTER, tableName=CREDENTIAL; dropDefaultValue columnName=DIGITS, tableName=CREDENTIAL; dropDefaultValue columnName=PERIOD, tableName=CREDENTIAL; dropDefaultValue columnName=ALGORITHM, tableName=CREDENTIAL; dropColumn ...		\N	4.23.2	\N	\N	9192879576
8.0.0-resource-tag-support	keycloak	META-INF/jpa-changelog-8.0.0.xml	2026-01-23 18:28:08.972862	76	EXECUTED	9:91fa186ce7a5af127a2d7a91ee083cc5	addColumn tableName=MIGRATION_MODEL; createIndex indexName=IDX_UPDATE_TIME, tableName=MIGRATION_MODEL		\N	4.23.2	\N	\N	9192879576
9.0.0-always-display-client	keycloak	META-INF/jpa-changelog-9.0.0.xml	2026-01-23 18:28:08.995656	77	EXECUTED	9:6335e5c94e83a2639ccd68dd24e2e5ad	addColumn tableName=CLIENT		\N	4.23.2	\N	\N	9192879576
9.0.0-drop-constraints-for-column-increase	keycloak	META-INF/jpa-changelog-9.0.0.xml	2026-01-23 18:28:09.007055	78	MARK_RAN	9:6bdb5658951e028bfe16fa0a8228b530	dropUniqueConstraint constraintName=UK_FRSR6T700S9V50BU18WS5PMT, tableName=RESOURCE_SERVER_PERM_TICKET; dropUniqueConstraint constraintName=UK_FRSR6T700S9V50BU18WS5HA6, tableName=RESOURCE_SERVER_RESOURCE; dropPrimaryKey constraintName=CONSTRAINT_O...		\N	4.23.2	\N	\N	9192879576
9.0.0-increase-column-size-federated-fk	keycloak	META-INF/jpa-changelog-9.0.0.xml	2026-01-23 18:28:09.112504	79	EXECUTED	9:d5bc15a64117ccad481ce8792d4c608f	modifyDataType columnName=CLIENT_ID, tableName=FED_USER_CONSENT; modifyDataType columnName=CLIENT_REALM_CONSTRAINT, tableName=KEYCLOAK_ROLE; modifyDataType columnName=OWNER, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=CLIENT_ID, ta...		\N	4.23.2	\N	\N	9192879576
9.0.0-recreate-constraints-after-column-increase	keycloak	META-INF/jpa-changelog-9.0.0.xml	2026-01-23 18:28:09.125208	80	MARK_RAN	9:077cba51999515f4d3e7ad5619ab592c	addNotNullConstraint columnName=CLIENT_ID, tableName=OFFLINE_CLIENT_SESSION; addNotNullConstraint columnName=OWNER, tableName=RESOURCE_SERVER_PERM_TICKET; addNotNullConstraint columnName=REQUESTER, tableName=RESOURCE_SERVER_PERM_TICKET; addNotNull...		\N	4.23.2	\N	\N	9192879576
9.0.1-add-index-to-client.client_id	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-01-23 18:28:09.142985	81	EXECUTED	9:be969f08a163bf47c6b9e9ead8ac2afb	createIndex indexName=IDX_CLIENT_ID, tableName=CLIENT		\N	4.23.2	\N	\N	9192879576
9.0.1-KEYCLOAK-12579-drop-constraints	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-01-23 18:28:09.148361	82	MARK_RAN	9:6d3bb4408ba5a72f39bd8a0b301ec6e3	dropUniqueConstraint constraintName=SIBLING_NAMES, tableName=KEYCLOAK_GROUP		\N	4.23.2	\N	\N	9192879576
9.0.1-KEYCLOAK-12579-add-not-null-constraint	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-01-23 18:28:09.162909	83	EXECUTED	9:966bda61e46bebf3cc39518fbed52fa7	addNotNullConstraint columnName=PARENT_GROUP, tableName=KEYCLOAK_GROUP		\N	4.23.2	\N	\N	9192879576
9.0.1-KEYCLOAK-12579-recreate-constraints	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-01-23 18:28:09.169348	84	MARK_RAN	9:8dcac7bdf7378e7d823cdfddebf72fda	addUniqueConstraint constraintName=SIBLING_NAMES, tableName=KEYCLOAK_GROUP		\N	4.23.2	\N	\N	9192879576
9.0.1-add-index-to-events	keycloak	META-INF/jpa-changelog-9.0.1.xml	2026-01-23 18:28:09.186575	85	EXECUTED	9:7d93d602352a30c0c317e6a609b56599	createIndex indexName=IDX_EVENT_TIME, tableName=EVENT_ENTITY		\N	4.23.2	\N	\N	9192879576
map-remove-ri	keycloak	META-INF/jpa-changelog-11.0.0.xml	2026-01-23 18:28:09.208079	86	EXECUTED	9:71c5969e6cdd8d7b6f47cebc86d37627	dropForeignKeyConstraint baseTableName=REALM, constraintName=FK_TRAF444KK6QRKMS7N56AIWQ5Y; dropForeignKeyConstraint baseTableName=KEYCLOAK_ROLE, constraintName=FK_KJHO5LE2C0RAL09FL8CM9WFW9		\N	4.23.2	\N	\N	9192879576
map-remove-ri	keycloak	META-INF/jpa-changelog-12.0.0.xml	2026-01-23 18:28:09.241145	87	EXECUTED	9:a9ba7d47f065f041b7da856a81762021	dropForeignKeyConstraint baseTableName=REALM_DEFAULT_GROUPS, constraintName=FK_DEF_GROUPS_GROUP; dropForeignKeyConstraint baseTableName=REALM_DEFAULT_ROLES, constraintName=FK_H4WPD7W4HSOOLNI3H0SW7BTJE; dropForeignKeyConstraint baseTableName=CLIENT...		\N	4.23.2	\N	\N	9192879576
12.1.0-add-realm-localization-table	keycloak	META-INF/jpa-changelog-12.0.0.xml	2026-01-23 18:28:09.268228	88	EXECUTED	9:fffabce2bc01e1a8f5110d5278500065	createTable tableName=REALM_LOCALIZATIONS; addPrimaryKey tableName=REALM_LOCALIZATIONS		\N	4.23.2	\N	\N	9192879576
default-roles	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-01-23 18:28:09.286283	89	EXECUTED	9:fa8a5b5445e3857f4b010bafb5009957	addColumn tableName=REALM; customChange		\N	4.23.2	\N	\N	9192879576
default-roles-cleanup	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-01-23 18:28:09.338448	90	EXECUTED	9:67ac3241df9a8582d591c5ed87125f39	dropTable tableName=REALM_DEFAULT_ROLES; dropTable tableName=CLIENT_DEFAULT_ROLES		\N	4.23.2	\N	\N	9192879576
13.0.0-KEYCLOAK-16844	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-01-23 18:28:09.373525	91	EXECUTED	9:ad1194d66c937e3ffc82386c050ba089	createIndex indexName=IDX_OFFLINE_USS_PRELOAD, tableName=OFFLINE_USER_SESSION		\N	4.23.2	\N	\N	9192879576
map-remove-ri-13.0.0	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-01-23 18:28:09.461903	92	EXECUTED	9:d9be619d94af5a2f5d07b9f003543b91	dropForeignKeyConstraint baseTableName=DEFAULT_CLIENT_SCOPE, constraintName=FK_R_DEF_CLI_SCOPE_SCOPE; dropForeignKeyConstraint baseTableName=CLIENT_SCOPE_CLIENT, constraintName=FK_C_CLI_SCOPE_SCOPE; dropForeignKeyConstraint baseTableName=CLIENT_SC...		\N	4.23.2	\N	\N	9192879576
13.0.0-KEYCLOAK-17992-drop-constraints	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-01-23 18:28:09.471405	93	MARK_RAN	9:544d201116a0fcc5a5da0925fbbc3bde	dropPrimaryKey constraintName=C_CLI_SCOPE_BIND, tableName=CLIENT_SCOPE_CLIENT; dropIndex indexName=IDX_CLSCOPE_CL, tableName=CLIENT_SCOPE_CLIENT; dropIndex indexName=IDX_CL_CLSCOPE, tableName=CLIENT_SCOPE_CLIENT		\N	4.23.2	\N	\N	9192879576
13.0.0-increase-column-size-federated	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-01-23 18:28:09.540747	94	EXECUTED	9:43c0c1055b6761b4b3e89de76d612ccf	modifyDataType columnName=CLIENT_ID, tableName=CLIENT_SCOPE_CLIENT; modifyDataType columnName=SCOPE_ID, tableName=CLIENT_SCOPE_CLIENT		\N	4.23.2	\N	\N	9192879576
13.0.0-KEYCLOAK-17992-recreate-constraints	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-01-23 18:28:09.562242	95	MARK_RAN	9:8bd711fd0330f4fe980494ca43ab1139	addNotNullConstraint columnName=CLIENT_ID, tableName=CLIENT_SCOPE_CLIENT; addNotNullConstraint columnName=SCOPE_ID, tableName=CLIENT_SCOPE_CLIENT; addPrimaryKey constraintName=C_CLI_SCOPE_BIND, tableName=CLIENT_SCOPE_CLIENT; createIndex indexName=...		\N	4.23.2	\N	\N	9192879576
json-string-accomodation-fixed	keycloak	META-INF/jpa-changelog-13.0.0.xml	2026-01-23 18:28:09.607743	96	EXECUTED	9:e07d2bc0970c348bb06fb63b1f82ddbf	addColumn tableName=REALM_ATTRIBUTE; update tableName=REALM_ATTRIBUTE; dropColumn columnName=VALUE, tableName=REALM_ATTRIBUTE; renameColumn newColumnName=VALUE, oldColumnName=VALUE_NEW, tableName=REALM_ATTRIBUTE		\N	4.23.2	\N	\N	9192879576
14.0.0-KEYCLOAK-11019	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-01-23 18:28:09.676386	97	EXECUTED	9:24fb8611e97f29989bea412aa38d12b7	createIndex indexName=IDX_OFFLINE_CSS_PRELOAD, tableName=OFFLINE_CLIENT_SESSION; createIndex indexName=IDX_OFFLINE_USS_BY_USER, tableName=OFFLINE_USER_SESSION; createIndex indexName=IDX_OFFLINE_USS_BY_USERSESS, tableName=OFFLINE_USER_SESSION		\N	4.23.2	\N	\N	9192879576
14.0.0-KEYCLOAK-18286	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-01-23 18:28:09.691269	98	MARK_RAN	9:259f89014ce2506ee84740cbf7163aa7	createIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	9192879576
14.0.0-KEYCLOAK-18286-revert	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-01-23 18:28:09.765695	99	MARK_RAN	9:04baaf56c116ed19951cbc2cca584022	dropIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	9192879576
14.0.0-KEYCLOAK-18286-supported-dbs	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-01-23 18:28:09.795853	100	EXECUTED	9:60ca84a0f8c94ec8c3504a5a3bc88ee8	createIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	9192879576
14.0.0-KEYCLOAK-18286-unsupported-dbs	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-01-23 18:28:09.802647	101	MARK_RAN	9:d3d977031d431db16e2c181ce49d73e9	createIndex indexName=IDX_CLIENT_ATT_BY_NAME_VALUE, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	9192879576
KEYCLOAK-17267-add-index-to-user-attributes	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-01-23 18:28:09.825627	102	EXECUTED	9:0b305d8d1277f3a89a0a53a659ad274c	createIndex indexName=IDX_USER_ATTRIBUTE_NAME, tableName=USER_ATTRIBUTE		\N	4.23.2	\N	\N	9192879576
KEYCLOAK-18146-add-saml-art-binding-identifier	keycloak	META-INF/jpa-changelog-14.0.0.xml	2026-01-23 18:28:09.83852	103	EXECUTED	9:2c374ad2cdfe20e2905a84c8fac48460	customChange		\N	4.23.2	\N	\N	9192879576
15.0.0-KEYCLOAK-18467	keycloak	META-INF/jpa-changelog-15.0.0.xml	2026-01-23 18:28:09.856806	104	EXECUTED	9:47a760639ac597360a8219f5b768b4de	addColumn tableName=REALM_LOCALIZATIONS; update tableName=REALM_LOCALIZATIONS; dropColumn columnName=TEXTS, tableName=REALM_LOCALIZATIONS; renameColumn newColumnName=TEXTS, oldColumnName=TEXTS_NEW, tableName=REALM_LOCALIZATIONS; addNotNullConstrai...		\N	4.23.2	\N	\N	9192879576
17.0.0-9562	keycloak	META-INF/jpa-changelog-17.0.0.xml	2026-01-23 18:28:09.871772	105	EXECUTED	9:a6272f0576727dd8cad2522335f5d99e	createIndex indexName=IDX_USER_SERVICE_ACCOUNT, tableName=USER_ENTITY		\N	4.23.2	\N	\N	9192879576
18.0.0-10625-IDX_ADMIN_EVENT_TIME	keycloak	META-INF/jpa-changelog-18.0.0.xml	2026-01-23 18:28:09.885337	106	EXECUTED	9:015479dbd691d9cc8669282f4828c41d	createIndex indexName=IDX_ADMIN_EVENT_TIME, tableName=ADMIN_EVENT_ENTITY		\N	4.23.2	\N	\N	9192879576
19.0.0-10135	keycloak	META-INF/jpa-changelog-19.0.0.xml	2026-01-23 18:28:09.89557	107	EXECUTED	9:9518e495fdd22f78ad6425cc30630221	customChange		\N	4.23.2	\N	\N	9192879576
20.0.0-12964-supported-dbs	keycloak	META-INF/jpa-changelog-20.0.0.xml	2026-01-23 18:28:09.912181	108	EXECUTED	9:e5f243877199fd96bcc842f27a1656ac	createIndex indexName=IDX_GROUP_ATT_BY_NAME_VALUE, tableName=GROUP_ATTRIBUTE		\N	4.23.2	\N	\N	9192879576
20.0.0-12964-unsupported-dbs	keycloak	META-INF/jpa-changelog-20.0.0.xml	2026-01-23 18:28:09.918764	109	MARK_RAN	9:1a6fcaa85e20bdeae0a9ce49b41946a5	createIndex indexName=IDX_GROUP_ATT_BY_NAME_VALUE, tableName=GROUP_ATTRIBUTE		\N	4.23.2	\N	\N	9192879576
client-attributes-string-accomodation-fixed	keycloak	META-INF/jpa-changelog-20.0.0.xml	2026-01-23 18:28:09.934879	110	EXECUTED	9:3f332e13e90739ed0c35b0b25b7822ca	addColumn tableName=CLIENT_ATTRIBUTES; update tableName=CLIENT_ATTRIBUTES; dropColumn columnName=VALUE, tableName=CLIENT_ATTRIBUTES; renameColumn newColumnName=VALUE, oldColumnName=VALUE_NEW, tableName=CLIENT_ATTRIBUTES		\N	4.23.2	\N	\N	9192879576
21.0.2-17277	keycloak	META-INF/jpa-changelog-21.0.2.xml	2026-01-23 18:28:09.944209	111	EXECUTED	9:7ee1f7a3fb8f5588f171fb9a6ab623c0	customChange		\N	4.23.2	\N	\N	9192879576
21.1.0-19404	keycloak	META-INF/jpa-changelog-21.1.0.xml	2026-01-23 18:28:10.020078	112	EXECUTED	9:3d7e830b52f33676b9d64f7f2b2ea634	modifyDataType columnName=DECISION_STRATEGY, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=LOGIC, tableName=RESOURCE_SERVER_POLICY; modifyDataType columnName=POLICY_ENFORCE_MODE, tableName=RESOURCE_SERVER		\N	4.23.2	\N	\N	9192879576
21.1.0-19404-2	keycloak	META-INF/jpa-changelog-21.1.0.xml	2026-01-23 18:28:10.031407	113	MARK_RAN	9:627d032e3ef2c06c0e1f73d2ae25c26c	addColumn tableName=RESOURCE_SERVER_POLICY; update tableName=RESOURCE_SERVER_POLICY; dropColumn columnName=DECISION_STRATEGY, tableName=RESOURCE_SERVER_POLICY; renameColumn newColumnName=DECISION_STRATEGY, oldColumnName=DECISION_STRATEGY_NEW, tabl...		\N	4.23.2	\N	\N	9192879576
22.0.0-17484-updated	keycloak	META-INF/jpa-changelog-22.0.0.xml	2026-01-23 18:28:10.064233	114	EXECUTED	9:90af0bfd30cafc17b9f4d6eccd92b8b3	customChange		\N	4.23.2	\N	\N	9192879576
22.0.5-24031	keycloak	META-INF/jpa-changelog-22.0.0.xml	2026-01-23 18:28:10.075455	115	MARK_RAN	9:a60d2d7b315ec2d3eba9e2f145f9df28	customChange		\N	4.23.2	\N	\N	9192879576
23.0.0-12062	keycloak	META-INF/jpa-changelog-23.0.0.xml	2026-01-23 18:28:10.121387	116	EXECUTED	9:2168fbe728fec46ae9baf15bf80927b8	addColumn tableName=COMPONENT_CONFIG; update tableName=COMPONENT_CONFIG; dropColumn columnName=VALUE, tableName=COMPONENT_CONFIG; renameColumn newColumnName=VALUE, oldColumnName=VALUE_NEW, tableName=COMPONENT_CONFIG		\N	4.23.2	\N	\N	9192879576
23.0.0-17258	keycloak	META-INF/jpa-changelog-23.0.0.xml	2026-01-23 18:28:10.142384	117	EXECUTED	9:36506d679a83bbfda85a27ea1864dca8	addColumn tableName=EVENT_ENTITY		\N	4.23.2	\N	\N	9192879576
\.


--
-- Data for Name: databasechangeloglock; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.databasechangeloglock (id, locked, lockgranted, lockedby) FROM stdin;
1	f	\N	\N
1000	f	\N	\N
1001	f	\N	\N
\.


--
-- Data for Name: default_client_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.default_client_scope (realm_id, scope_id, default_scope) FROM stdin;
05d66952-1021-4a4e-9cfb-23359432e8cf	4f88b18b-890c-4680-9eb3-e407b1953d06	f
05d66952-1021-4a4e-9cfb-23359432e8cf	a77d876d-38c1-48cd-a4a2-a37bb5e7a475	t
05d66952-1021-4a4e-9cfb-23359432e8cf	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195	t
05d66952-1021-4a4e-9cfb-23359432e8cf	af682952-a51c-4f04-b21a-a8bf7f328b19	t
05d66952-1021-4a4e-9cfb-23359432e8cf	c052ad27-964d-4311-8d58-a54fe2754004	f
05d66952-1021-4a4e-9cfb-23359432e8cf	ff0752e3-6652-443c-9750-3ebf753ac0eb	f
05d66952-1021-4a4e-9cfb-23359432e8cf	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce	t
05d66952-1021-4a4e-9cfb-23359432e8cf	9a796082-2534-4c5c-8927-ab2275db62f9	t
05d66952-1021-4a4e-9cfb-23359432e8cf	8cbed7b3-664c-4a6b-ae42-201ddfc78501	f
05d66952-1021-4a4e-9cfb-23359432e8cf	158d6470-ca16-4a90-b441-79a10b337639	t
01494400-afb0-4083-bb7d-02b8ec093758	edd0b505-3d58-4f72-a7f0-b7f5832d8518	f
01494400-afb0-4083-bb7d-02b8ec093758	3c6772a6-c5c4-431f-9813-097eb581627b	t
01494400-afb0-4083-bb7d-02b8ec093758	e902eeb1-53e6-4540-8187-5488a320ce60	t
01494400-afb0-4083-bb7d-02b8ec093758	9e6ee896-a73d-45c9-9810-011909a7d7a8	t
01494400-afb0-4083-bb7d-02b8ec093758	3ba36fa1-6d7c-4344-9f25-78ff541f1cab	f
01494400-afb0-4083-bb7d-02b8ec093758	74fad21c-6cf3-45ac-a7ee-da2be746831e	f
01494400-afb0-4083-bb7d-02b8ec093758	2f908bff-dd50-4d89-a2d1-e2eae47cff3b	t
01494400-afb0-4083-bb7d-02b8ec093758	95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87	t
01494400-afb0-4083-bb7d-02b8ec093758	75d794d1-c1f6-4dc0-8df8-8a282a67fd98	f
01494400-afb0-4083-bb7d-02b8ec093758	504042e6-b3d0-4cca-a1a9-a2d37986fd33	t
\.


--
-- Data for Name: event_entity; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.event_entity (id, client_id, details_json, error, ip_address, realm_id, session_id, event_time, type, user_id, details_json_long_value) FROM stdin;
\.


--
-- Data for Name: fed_user_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.fed_user_attribute (id, name, user_id, realm_id, storage_provider_id, value) FROM stdin;
\.


--
-- Data for Name: fed_user_consent; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.fed_user_consent (id, client_id, user_id, realm_id, storage_provider_id, created_date, last_updated_date, client_storage_provider, external_client_id) FROM stdin;
\.


--
-- Data for Name: fed_user_consent_cl_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.fed_user_consent_cl_scope (user_consent_id, scope_id) FROM stdin;
\.


--
-- Data for Name: fed_user_credential; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.fed_user_credential (id, salt, type, created_date, user_id, realm_id, storage_provider_id, user_label, secret_data, credential_data, priority) FROM stdin;
\.


--
-- Data for Name: fed_user_group_membership; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.fed_user_group_membership (group_id, user_id, realm_id, storage_provider_id) FROM stdin;
\.


--
-- Data for Name: fed_user_required_action; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.fed_user_required_action (required_action, user_id, realm_id, storage_provider_id) FROM stdin;
\.


--
-- Data for Name: fed_user_role_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.fed_user_role_mapping (role_id, user_id, realm_id, storage_provider_id) FROM stdin;
\.


--
-- Data for Name: federated_identity; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.federated_identity (identity_provider, realm_id, federated_user_id, federated_username, token, user_id) FROM stdin;
google	01494400-afb0-4083-bb7d-02b8ec093758	115165689888528005465	gustavoe.dev@gmail.com	\N	f5f3da10-2693-4499-b547-d21b2a472556
google	01494400-afb0-4083-bb7d-02b8ec093758	100976939886989467955	gustavo.q@escolar.ifrn.edu.br	\N	643c733b-81e3-41b0-8c66-2070bb435267
\.


--
-- Data for Name: federated_user; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.federated_user (id, storage_provider_id, realm_id) FROM stdin;
\.


--
-- Data for Name: group_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.group_attribute (id, name, value, group_id) FROM stdin;
\.


--
-- Data for Name: group_role_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.group_role_mapping (role_id, group_id) FROM stdin;
\.


--
-- Data for Name: identity_provider; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.identity_provider (internal_id, enabled, provider_alias, provider_id, store_token, authenticate_by_default, realm_id, add_token_role, trust_email, first_broker_login_flow_id, post_broker_login_flow_id, provider_display_name, link_only) FROM stdin;
88638bb8-77e8-4e24-ab7f-e03e06f47bc5	t	google	google	f	f	01494400-afb0-4083-bb7d-02b8ec093758	f	t	a90ec092-c3dd-4560-a516-4000cb404429	\N	\N	f
\.


--
-- Data for Name: identity_provider_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.identity_provider_config (identity_provider_id, value, name) FROM stdin;
88638bb8-77e8-4e24-ab7f-e03e06f47bc5	false	hideOnLoginPage
88638bb8-77e8-4e24-ab7f-e03e06f47bc5	false	acceptsPromptNoneForwardFromClient
88638bb8-77e8-4e24-ab7f-e03e06f47bc5	"GOOGLE_CLIENT_ID_AQUI"	clientId
88638bb8-77e8-4e24-ab7f-e03e06f47bc5	false	disableUserInfo
88638bb8-77e8-4e24-ab7f-e03e06f47bc5	false	filteredByClaim
88638bb8-77e8-4e24-ab7f-e03e06f47bc5	IMPORT	syncMode
88638bb8-77e8-4e24-ab7f-e03e06f47bc5	"GOOGLE_CLIENT_SECRET_AQUI"	clientSecret
\.


--
-- Data for Name: identity_provider_mapper; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.identity_provider_mapper (id, name, idp_alias, idp_mapper_name, realm_id) FROM stdin;
77db94f9-a86e-44c0-a23e-72b9f01d8d8d	google-avatar	google	google-user-attribute-mapper	01494400-afb0-4083-bb7d-02b8ec093758
\.


--
-- Data for Name: idp_mapper_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.idp_mapper_config (idp_mapper_id, value, name) FROM stdin;
77db94f9-a86e-44c0-a23e-72b9f01d8d8d	IMPORT	syncMode
77db94f9-a86e-44c0-a23e-72b9f01d8d8d	picture	jsonField
77db94f9-a86e-44c0-a23e-72b9f01d8d8d	picture	userAttribute
\.


--
-- Data for Name: keycloak_group; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.keycloak_group (id, name, parent_group, realm_id) FROM stdin;
\.


--
-- Data for Name: keycloak_role; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.keycloak_role (id, client_realm_constraint, client_role, description, name, realm_id, client, realm) FROM stdin;
db257eaa-4c5f-405d-9a98-b03d69f838f4	05d66952-1021-4a4e-9cfb-23359432e8cf	f	${role_default-roles}	default-roles-master	05d66952-1021-4a4e-9cfb-23359432e8cf	\N	\N
201d4990-7f3f-4ba4-b343-5d960b8475e8	05d66952-1021-4a4e-9cfb-23359432e8cf	f	${role_create-realm}	create-realm	05d66952-1021-4a4e-9cfb-23359432e8cf	\N	\N
b191d06c-173e-4d20-985f-a175e2a7af84	05d66952-1021-4a4e-9cfb-23359432e8cf	f	${role_admin}	admin	05d66952-1021-4a4e-9cfb-23359432e8cf	\N	\N
0b205bcf-3d4a-4484-a9da-2e7ed19b543b	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_create-client}	create-client	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
c4c1a917-15cd-48c2-904f-9e5e86590202	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_view-realm}	view-realm	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
28c81855-de3b-4d1c-9afd-06ab574c3d45	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_view-users}	view-users	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
361dfc04-6040-4874-8a6d-3de6040d69db	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_view-clients}	view-clients	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
3f9672ad-f625-4ba4-99ac-a9c9f7fa9bc5	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_view-events}	view-events	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
ac374305-2426-4f66-a911-fb60267aa311	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_view-identity-providers}	view-identity-providers	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
834b8842-8f8c-43a5-8ef7-e0ca5a3ae49f	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_view-authorization}	view-authorization	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
c7a607da-9115-4dfe-89f5-d6cebcf47744	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_manage-realm}	manage-realm	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
e6f9ddda-115d-4819-aaff-39c19bde713b	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_manage-users}	manage-users	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
18c72e76-b38a-4878-911c-43f6f942dc59	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_manage-clients}	manage-clients	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
2a0fed2f-d0c1-4b3a-b8a5-fb51df89f700	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_manage-events}	manage-events	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
1fbd46c1-fdc1-4fee-bf95-0c722b16c24b	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_manage-identity-providers}	manage-identity-providers	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
a4c7f2f6-1401-455a-b58f-4e3ad8ebd6cf	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_manage-authorization}	manage-authorization	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
3e51a5c8-9801-42fd-a9fa-984b17da4dec	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_query-users}	query-users	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
504eff3f-d3e5-4b1d-8b92-9473d677d98b	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_query-clients}	query-clients	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
4ef6a4c8-18ed-438f-b753-da43fb3bd146	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_query-realms}	query-realms	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
da66f5ae-c0fa-4947-b1be-15ea3c8bb0ee	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_query-groups}	query-groups	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
8bed2006-49a1-479a-be2c-da8ae1c35799	5ab11789-449d-4d65-9b20-694103d445f3	t	${role_view-profile}	view-profile	05d66952-1021-4a4e-9cfb-23359432e8cf	5ab11789-449d-4d65-9b20-694103d445f3	\N
2b960113-dc6f-4441-93f8-aa8203d03a32	5ab11789-449d-4d65-9b20-694103d445f3	t	${role_manage-account}	manage-account	05d66952-1021-4a4e-9cfb-23359432e8cf	5ab11789-449d-4d65-9b20-694103d445f3	\N
e317d2dc-07ea-4f18-bc2b-07a2badf4e1f	5ab11789-449d-4d65-9b20-694103d445f3	t	${role_manage-account-links}	manage-account-links	05d66952-1021-4a4e-9cfb-23359432e8cf	5ab11789-449d-4d65-9b20-694103d445f3	\N
6d7e85b8-708a-4b91-b0b5-ce411f7764d1	5ab11789-449d-4d65-9b20-694103d445f3	t	${role_view-applications}	view-applications	05d66952-1021-4a4e-9cfb-23359432e8cf	5ab11789-449d-4d65-9b20-694103d445f3	\N
242f003b-1054-4814-aaad-d1fa23d30829	5ab11789-449d-4d65-9b20-694103d445f3	t	${role_view-consent}	view-consent	05d66952-1021-4a4e-9cfb-23359432e8cf	5ab11789-449d-4d65-9b20-694103d445f3	\N
eadf9d70-0b13-4475-9ca0-509f2afb5fd6	5ab11789-449d-4d65-9b20-694103d445f3	t	${role_manage-consent}	manage-consent	05d66952-1021-4a4e-9cfb-23359432e8cf	5ab11789-449d-4d65-9b20-694103d445f3	\N
9838e74b-379c-4363-8000-52d2edec9b87	5ab11789-449d-4d65-9b20-694103d445f3	t	${role_view-groups}	view-groups	05d66952-1021-4a4e-9cfb-23359432e8cf	5ab11789-449d-4d65-9b20-694103d445f3	\N
a19a3fbb-161a-48e9-b151-595df6221b61	5ab11789-449d-4d65-9b20-694103d445f3	t	${role_delete-account}	delete-account	05d66952-1021-4a4e-9cfb-23359432e8cf	5ab11789-449d-4d65-9b20-694103d445f3	\N
bc2251be-fa31-41cd-8203-002324a20dbf	bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	t	${role_read-token}	read-token	05d66952-1021-4a4e-9cfb-23359432e8cf	bb8e2256-5650-4b9f-a7ce-ed18f4d4d11f	\N
f10501dd-ca25-42aa-8d06-4397af5b02d9	9f3a1353-e07c-4736-ab29-2712088465fa	t	${role_impersonation}	impersonation	05d66952-1021-4a4e-9cfb-23359432e8cf	9f3a1353-e07c-4736-ab29-2712088465fa	\N
03b15308-3f69-45b2-94d5-1770bb169820	05d66952-1021-4a4e-9cfb-23359432e8cf	f	${role_offline-access}	offline_access	05d66952-1021-4a4e-9cfb-23359432e8cf	\N	\N
0ad7d013-124a-46bc-85b9-9d4fb62019e2	05d66952-1021-4a4e-9cfb-23359432e8cf	f	${role_uma_authorization}	uma_authorization	05d66952-1021-4a4e-9cfb-23359432e8cf	\N	\N
4184f4a1-ef85-40e5-b9f8-e71c5cd938a5	01494400-afb0-4083-bb7d-02b8ec093758	f	${role_default-roles}	default-roles-athlos	01494400-afb0-4083-bb7d-02b8ec093758	\N	\N
45bc9ee4-8374-4c5d-a918-ee4357358122	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_create-client}	create-client	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
e62e7f2d-e5ef-478c-a9d5-b74df315862b	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_view-realm}	view-realm	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
9ad84872-36dd-43bb-8cc0-8197b74f964a	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_view-users}	view-users	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
5903645f-21e7-443e-9d18-b1ea7676d9eb	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_view-clients}	view-clients	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
9a9c1e8c-c921-41bc-84c1-21492da7f433	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_view-events}	view-events	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
101c7960-7c76-4cb9-9152-e6432daa8e60	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_view-identity-providers}	view-identity-providers	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
39f288d5-cd1d-4376-a9d6-667565540ed8	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_view-authorization}	view-authorization	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
8362020c-bf62-466e-8aec-e06c6eed1fad	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_manage-realm}	manage-realm	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
2037cdec-2aab-453e-ad70-b4213c8878d9	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_manage-users}	manage-users	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
1842e66a-1138-42d6-84ef-5d3167938ca0	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_manage-clients}	manage-clients	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
68e3ce88-300e-4808-a9a1-e90c4d081331	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_manage-events}	manage-events	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
95cced90-4f34-4efd-934c-8860d922b7f6	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_manage-identity-providers}	manage-identity-providers	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
2341f5e1-c24c-4e51-a7aa-ff651b2301fe	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_manage-authorization}	manage-authorization	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
5253fa4a-aefa-4a08-9880-6bf9d8355581	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_query-users}	query-users	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
ccbc7fa2-2a4d-4643-afa2-d077c734e12c	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_query-clients}	query-clients	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
aaae2708-1219-4b84-8c97-98e0c2a641cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_query-realms}	query-realms	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
d103b704-d45e-427c-b2f5-c75086fe5fa7	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_query-groups}	query-groups	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
291221ab-6fab-4e9e-9b15-48ae841d5d87	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_realm-admin}	realm-admin	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
40824a82-1477-4da7-917c-aacb6a9ba298	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_create-client}	create-client	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
97fd48d8-24a6-4caf-a755-9e65b065d428	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_view-realm}	view-realm	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
8188fc29-cba5-4bad-b5d7-dda3b87b8947	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_view-users}	view-users	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
bbe8d0b1-ea88-4918-b5d1-98d3c8b814d8	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_view-clients}	view-clients	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
ca4f9691-7b76-4c9a-96d0-b47f09556c8e	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_view-events}	view-events	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
99aeb260-f28c-4156-b1e2-ad3e31a1183e	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_view-identity-providers}	view-identity-providers	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
ff6ed0bf-a8b5-4e7c-b275-1ca17a3fb37f	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_view-authorization}	view-authorization	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
e8be7efe-8ca2-41e3-834c-8f447553c414	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_manage-realm}	manage-realm	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
f774867a-67e8-450f-b242-5ad9de8ac8b6	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_manage-users}	manage-users	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
7319d1d4-caeb-453c-8bbf-ad732d2a53b1	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_manage-clients}	manage-clients	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
95fb059e-7b91-4201-b3ea-a0c29390311b	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_manage-events}	manage-events	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
4a18c505-aa5e-4582-b1b6-c87e97ec2de6	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_manage-identity-providers}	manage-identity-providers	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
a44b73bc-e048-4443-935b-40d4200c7c05	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_manage-authorization}	manage-authorization	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
594ebf5a-e119-4f48-872a-487b036ab547	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_query-users}	query-users	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
53093b88-438a-450f-8556-96281f0a5fb4	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_query-clients}	query-clients	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
16d49972-b3d1-4bf1-af7a-0ed58d87f806	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_query-realms}	query-realms	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
a9e5bf04-c2d7-4403-abec-b7bdc19e81e9	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_query-groups}	query-groups	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
441e2e47-453a-4296-aabd-d81ab9021804	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	t	${role_view-profile}	view-profile	01494400-afb0-4083-bb7d-02b8ec093758	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	\N
9778725f-eab5-44d8-bd7a-9f2ed2d2ab21	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	t	${role_manage-account}	manage-account	01494400-afb0-4083-bb7d-02b8ec093758	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	\N
518935dd-cddf-4fc4-8dd1-327af57ac5d5	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	t	${role_manage-account-links}	manage-account-links	01494400-afb0-4083-bb7d-02b8ec093758	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	\N
75820bb0-acbf-4292-b2a7-59b30346186b	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	t	${role_view-applications}	view-applications	01494400-afb0-4083-bb7d-02b8ec093758	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	\N
b8e3ce2c-cb33-463c-95c7-efdf421f3a4d	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	t	${role_view-consent}	view-consent	01494400-afb0-4083-bb7d-02b8ec093758	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	\N
31ef3486-4cb8-4efa-a264-821a0b98ebf1	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	t	${role_manage-consent}	manage-consent	01494400-afb0-4083-bb7d-02b8ec093758	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	\N
4f3d1eba-a2e9-4a18-a5e3-393c31caed63	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	t	${role_view-groups}	view-groups	01494400-afb0-4083-bb7d-02b8ec093758	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	\N
64ff0314-aee4-4772-b515-619cd70ca631	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	t	${role_delete-account}	delete-account	01494400-afb0-4083-bb7d-02b8ec093758	ffa49a4f-a149-4610-af7d-8fc7f8db10e3	\N
64910855-1919-45d1-9d87-d2d549d571cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	t	${role_impersonation}	impersonation	05d66952-1021-4a4e-9cfb-23359432e8cf	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	\N
da2ecdcc-71b2-44af-885f-9f242807be8e	60585280-8aef-4444-aa67-c0f8c7d711f1	t	${role_impersonation}	impersonation	01494400-afb0-4083-bb7d-02b8ec093758	60585280-8aef-4444-aa67-c0f8c7d711f1	\N
b588e246-4c8f-41ef-a1e9-f2c8b2a6e4cb	e523c7a5-c1e4-4029-94f1-64168993bc9c	t	${role_read-token}	read-token	01494400-afb0-4083-bb7d-02b8ec093758	e523c7a5-c1e4-4029-94f1-64168993bc9c	\N
8955aec5-e951-46b8-ab6b-ac846f173c59	01494400-afb0-4083-bb7d-02b8ec093758	f	${role_offline-access}	offline_access	01494400-afb0-4083-bb7d-02b8ec093758	\N	\N
3cef1892-cfe2-40df-9da5-6bbe37702a97	01494400-afb0-4083-bb7d-02b8ec093758	f	${role_uma_authorization}	uma_authorization	01494400-afb0-4083-bb7d-02b8ec093758	\N	\N
2e2d89a3-92dd-4bfa-b65d-b61393985154	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	t	\N	uma_protection	01494400-afb0-4083-bb7d-02b8ec093758	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	\N
dc9ac524-b966-4c4b-96e5-e621d81c0699	01494400-afb0-4083-bb7d-02b8ec093758	f		player	01494400-afb0-4083-bb7d-02b8ec093758	\N	\N
0b8553fc-a52a-4553-8833-a081ee00111e	01494400-afb0-4083-bb7d-02b8ec093758	f		admin	01494400-afb0-4083-bb7d-02b8ec093758	\N	\N
\.


--
-- Data for Name: migration_model; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.migration_model (id, version, update_time) FROM stdin;
qeltc	23.0.0	1769192891
\.


--
-- Data for Name: offline_client_session; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.offline_client_session (user_session_id, client_id, offline_flag, "timestamp", data, client_storage_provider, external_client_id) FROM stdin;
\.


--
-- Data for Name: offline_user_session; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.offline_user_session (user_session_id, user_id, realm_id, created_on, offline_flag, data, last_session_refresh) FROM stdin;
\.


--
-- Data for Name: policy_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.policy_config (policy_id, name, value) FROM stdin;
2eefe5b2-25c3-4079-b8b9-040ad96e203b	code	// by default, grants any permission associated with this policy\n$evaluation.grant();\n
785961f5-0d1d-419d-9909-b6c8612adc5b	defaultResourceType	urn:auth-client:resources:default
\.


--
-- Data for Name: protocol_mapper; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.protocol_mapper (id, name, protocol, protocol_mapper_name, client_id, client_scope_id) FROM stdin;
1166592e-5256-4f24-8b74-ad2c79c1e897	audience resolve	openid-connect	oidc-audience-resolve-mapper	1634cea3-037e-4cb9-a1f7-6d06c149bc95	\N
783033e8-9b7d-49ad-b6f3-2f9d4d0abef3	locale	openid-connect	oidc-usermodel-attribute-mapper	9b7cea44-6a22-443a-b194-5b9f52bd3a67	\N
285c31ce-7239-4245-ae58-e7aecb232a86	role list	saml	saml-role-list-mapper	\N	a77d876d-38c1-48cd-a4a2-a37bb5e7a475
99087487-8a09-40ca-a619-da7e6e13ceff	full name	openid-connect	oidc-full-name-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
ba599e54-98f9-4891-b5f2-5e08826f9ede	family name	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
1ad4cc5d-fd46-4ffa-8805-e6347a42d231	given name	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
c998a1b0-31e1-40fa-948c-c88fa55bbcee	middle name	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
0408bfa9-6ad1-40b7-b392-efeb67651ce5	nickname	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
69a73858-9702-4710-9f06-e77ca7ed9533	username	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
d3077563-af55-4d53-a5da-e416ae60fb9d	profile	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
127d34bb-b487-45dd-9fc2-73d620276d32	picture	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
f1c7078d-37e5-447f-aa51-8a7240f07343	website	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
1d4c9599-0289-43fa-af4e-378466ebd909	gender	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
ea549762-b57e-41ac-8689-7b62cf9f612a	birthdate	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
0eafcfc3-b749-4357-b2d2-b8b96b578be9	zoneinfo	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
039d91af-dbd0-4fc4-9e7b-6d173c01e5fe	locale	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
0c05b672-6937-444f-a799-870eab35eb5e	updated at	openid-connect	oidc-usermodel-attribute-mapper	\N	1a7c157b-ddd6-4bc2-9956-6dc6c77c7195
e3172778-c9e8-4675-9e46-49506ef3674b	email	openid-connect	oidc-usermodel-attribute-mapper	\N	af682952-a51c-4f04-b21a-a8bf7f328b19
96e8e7fa-5da8-45f6-abd0-c527bcf6efb8	email verified	openid-connect	oidc-usermodel-property-mapper	\N	af682952-a51c-4f04-b21a-a8bf7f328b19
ee88c678-9f35-4e7d-b056-d8fabff734db	address	openid-connect	oidc-address-mapper	\N	c052ad27-964d-4311-8d58-a54fe2754004
b0443dc6-935f-441c-b463-64bc644cb54e	phone number	openid-connect	oidc-usermodel-attribute-mapper	\N	ff0752e3-6652-443c-9750-3ebf753ac0eb
7e8d94c7-d545-4bfc-b1c7-01520f6602c6	phone number verified	openid-connect	oidc-usermodel-attribute-mapper	\N	ff0752e3-6652-443c-9750-3ebf753ac0eb
b9943252-ce93-4197-a80f-43c35f24c431	realm roles	openid-connect	oidc-usermodel-realm-role-mapper	\N	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce
be7a94db-bf8f-456b-b652-aca2f8de9bd6	client roles	openid-connect	oidc-usermodel-client-role-mapper	\N	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce
720bd9da-75d7-4dff-9748-ee8b3522633e	audience resolve	openid-connect	oidc-audience-resolve-mapper	\N	a54f96b3-232f-41cd-b714-3ed9b8a5e3ce
9f6ba73f-a904-4856-bdd5-96e5242bbb20	allowed web origins	openid-connect	oidc-allowed-origins-mapper	\N	9a796082-2534-4c5c-8927-ab2275db62f9
f1d69ecf-5645-4dc8-8282-73aad4d9ffed	upn	openid-connect	oidc-usermodel-attribute-mapper	\N	8cbed7b3-664c-4a6b-ae42-201ddfc78501
1a0252fb-e606-464b-b637-b012cb111baf	groups	openid-connect	oidc-usermodel-realm-role-mapper	\N	8cbed7b3-664c-4a6b-ae42-201ddfc78501
bf6a4c13-8bc9-47d4-baca-0dacfc6bab20	acr loa level	openid-connect	oidc-acr-mapper	\N	158d6470-ca16-4a90-b441-79a10b337639
b6a6c02b-08fe-41ff-bec3-9f0be2e165e2	audience resolve	openid-connect	oidc-audience-resolve-mapper	7e6a9f09-5438-43c6-9f97-325c10d4271b	\N
ef1a5373-aafe-49ee-8c0a-f3e8bb2cd830	role list	saml	saml-role-list-mapper	\N	3c6772a6-c5c4-431f-9813-097eb581627b
94636202-1631-4e8d-9442-c48c64b0526e	full name	openid-connect	oidc-full-name-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
91e7816a-f2e5-49fb-a076-b4a355daccb4	family name	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
15fc14e9-3a61-4576-8ae6-ec7b3f7f979d	given name	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
280e6289-9b25-4770-92a0-003d335bbb9e	middle name	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
d28e1a4e-b294-417e-bd57-f563a7b2a4e9	nickname	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
67c7aafe-1b71-4ada-bc7c-c0510a9421cf	username	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
d4e781b3-891e-4bb4-ad71-1c104a603533	profile	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
5c5898a7-7151-4b9a-b962-2457bb3e6406	picture	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
9bce6d91-ca7c-4917-9ac8-b6454b9d1e72	website	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
76781de9-41be-4d50-8c81-462e833a1a9d	gender	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
00198cb0-d6b0-467c-abed-2483bfa62d78	birthdate	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
dbb219ed-00f7-4917-958d-f71008881a28	zoneinfo	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
7499e564-c8dd-4eab-a174-767412aefba1	locale	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
9764cb15-0bea-4e07-b54c-f06a2a14a6b4	updated at	openid-connect	oidc-usermodel-attribute-mapper	\N	e902eeb1-53e6-4540-8187-5488a320ce60
e5365824-b66a-4c03-ba3f-f5582818ffc2	email	openid-connect	oidc-usermodel-attribute-mapper	\N	9e6ee896-a73d-45c9-9810-011909a7d7a8
8ca9abf4-a512-49d6-be9c-9aad35c21551	email verified	openid-connect	oidc-usermodel-property-mapper	\N	9e6ee896-a73d-45c9-9810-011909a7d7a8
6612948f-e38b-4668-84a7-34f5fb4f9987	address	openid-connect	oidc-address-mapper	\N	3ba36fa1-6d7c-4344-9f25-78ff541f1cab
13fd31f1-9995-4f24-aeae-f995a762cc93	phone number	openid-connect	oidc-usermodel-attribute-mapper	\N	74fad21c-6cf3-45ac-a7ee-da2be746831e
9d8f7d35-7bef-44f7-af86-ea5d036da164	phone number verified	openid-connect	oidc-usermodel-attribute-mapper	\N	74fad21c-6cf3-45ac-a7ee-da2be746831e
766bbbc1-1d5c-4c79-b064-6cf7a54f5c75	realm roles	openid-connect	oidc-usermodel-realm-role-mapper	\N	2f908bff-dd50-4d89-a2d1-e2eae47cff3b
b3170c28-741f-4bc3-939e-76adec09dc05	client roles	openid-connect	oidc-usermodel-client-role-mapper	\N	2f908bff-dd50-4d89-a2d1-e2eae47cff3b
973e1e96-cf4d-4e91-8c07-c970d9cca93b	audience resolve	openid-connect	oidc-audience-resolve-mapper	\N	2f908bff-dd50-4d89-a2d1-e2eae47cff3b
552e8421-a5b3-423d-863d-2e34260cf360	allowed web origins	openid-connect	oidc-allowed-origins-mapper	\N	95b8f14d-f76c-4c1a-9ab4-79cbb9b58f87
5d03ce18-185c-4266-aed3-0dcc60712f4b	upn	openid-connect	oidc-usermodel-attribute-mapper	\N	75d794d1-c1f6-4dc0-8df8-8a282a67fd98
26e034ad-3cd6-4d47-a1c6-5717e615eae0	groups	openid-connect	oidc-usermodel-realm-role-mapper	\N	75d794d1-c1f6-4dc0-8df8-8a282a67fd98
b97a77a7-661e-4925-8079-4d61b003b435	acr loa level	openid-connect	oidc-acr-mapper	\N	504042e6-b3d0-4cca-a1a9-a2d37986fd33
e4e03499-3a60-4c39-9c10-75294580716d	locale	openid-connect	oidc-usermodel-attribute-mapper	fd6bf04d-2664-4c42-9218-89b926ab62ef	\N
5385fcea-ddec-43af-a5c4-548a2845adbc	Client ID	openid-connect	oidc-usersessionmodel-note-mapper	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	\N
c0aa439b-08e8-4648-9383-7123f1932217	Client Host	openid-connect	oidc-usersessionmodel-note-mapper	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	\N
e4f38ed0-6de5-4e41-83f3-5305a5d019e1	Client IP Address	openid-connect	oidc-usersessionmodel-note-mapper	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	\N
\.


--
-- Data for Name: protocol_mapper_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.protocol_mapper_config (protocol_mapper_id, value, name) FROM stdin;
783033e8-9b7d-49ad-b6f3-2f9d4d0abef3	true	introspection.token.claim
783033e8-9b7d-49ad-b6f3-2f9d4d0abef3	true	userinfo.token.claim
783033e8-9b7d-49ad-b6f3-2f9d4d0abef3	locale	user.attribute
783033e8-9b7d-49ad-b6f3-2f9d4d0abef3	true	id.token.claim
783033e8-9b7d-49ad-b6f3-2f9d4d0abef3	true	access.token.claim
783033e8-9b7d-49ad-b6f3-2f9d4d0abef3	locale	claim.name
783033e8-9b7d-49ad-b6f3-2f9d4d0abef3	String	jsonType.label
285c31ce-7239-4245-ae58-e7aecb232a86	false	single
285c31ce-7239-4245-ae58-e7aecb232a86	Basic	attribute.nameformat
285c31ce-7239-4245-ae58-e7aecb232a86	Role	attribute.name
039d91af-dbd0-4fc4-9e7b-6d173c01e5fe	true	introspection.token.claim
039d91af-dbd0-4fc4-9e7b-6d173c01e5fe	true	userinfo.token.claim
039d91af-dbd0-4fc4-9e7b-6d173c01e5fe	locale	user.attribute
039d91af-dbd0-4fc4-9e7b-6d173c01e5fe	true	id.token.claim
039d91af-dbd0-4fc4-9e7b-6d173c01e5fe	true	access.token.claim
039d91af-dbd0-4fc4-9e7b-6d173c01e5fe	locale	claim.name
039d91af-dbd0-4fc4-9e7b-6d173c01e5fe	String	jsonType.label
0408bfa9-6ad1-40b7-b392-efeb67651ce5	true	introspection.token.claim
0408bfa9-6ad1-40b7-b392-efeb67651ce5	true	userinfo.token.claim
0408bfa9-6ad1-40b7-b392-efeb67651ce5	nickname	user.attribute
0408bfa9-6ad1-40b7-b392-efeb67651ce5	true	id.token.claim
0408bfa9-6ad1-40b7-b392-efeb67651ce5	true	access.token.claim
0408bfa9-6ad1-40b7-b392-efeb67651ce5	nickname	claim.name
0408bfa9-6ad1-40b7-b392-efeb67651ce5	String	jsonType.label
0c05b672-6937-444f-a799-870eab35eb5e	true	introspection.token.claim
0c05b672-6937-444f-a799-870eab35eb5e	true	userinfo.token.claim
0c05b672-6937-444f-a799-870eab35eb5e	updatedAt	user.attribute
0c05b672-6937-444f-a799-870eab35eb5e	true	id.token.claim
0c05b672-6937-444f-a799-870eab35eb5e	true	access.token.claim
0c05b672-6937-444f-a799-870eab35eb5e	updated_at	claim.name
0c05b672-6937-444f-a799-870eab35eb5e	long	jsonType.label
0eafcfc3-b749-4357-b2d2-b8b96b578be9	true	introspection.token.claim
0eafcfc3-b749-4357-b2d2-b8b96b578be9	true	userinfo.token.claim
0eafcfc3-b749-4357-b2d2-b8b96b578be9	zoneinfo	user.attribute
0eafcfc3-b749-4357-b2d2-b8b96b578be9	true	id.token.claim
0eafcfc3-b749-4357-b2d2-b8b96b578be9	true	access.token.claim
0eafcfc3-b749-4357-b2d2-b8b96b578be9	zoneinfo	claim.name
0eafcfc3-b749-4357-b2d2-b8b96b578be9	String	jsonType.label
127d34bb-b487-45dd-9fc2-73d620276d32	true	introspection.token.claim
127d34bb-b487-45dd-9fc2-73d620276d32	true	userinfo.token.claim
127d34bb-b487-45dd-9fc2-73d620276d32	picture	user.attribute
127d34bb-b487-45dd-9fc2-73d620276d32	true	id.token.claim
127d34bb-b487-45dd-9fc2-73d620276d32	true	access.token.claim
127d34bb-b487-45dd-9fc2-73d620276d32	picture	claim.name
127d34bb-b487-45dd-9fc2-73d620276d32	String	jsonType.label
1ad4cc5d-fd46-4ffa-8805-e6347a42d231	true	introspection.token.claim
1ad4cc5d-fd46-4ffa-8805-e6347a42d231	true	userinfo.token.claim
1ad4cc5d-fd46-4ffa-8805-e6347a42d231	firstName	user.attribute
1ad4cc5d-fd46-4ffa-8805-e6347a42d231	true	id.token.claim
1ad4cc5d-fd46-4ffa-8805-e6347a42d231	true	access.token.claim
1ad4cc5d-fd46-4ffa-8805-e6347a42d231	given_name	claim.name
1ad4cc5d-fd46-4ffa-8805-e6347a42d231	String	jsonType.label
1d4c9599-0289-43fa-af4e-378466ebd909	true	introspection.token.claim
1d4c9599-0289-43fa-af4e-378466ebd909	true	userinfo.token.claim
1d4c9599-0289-43fa-af4e-378466ebd909	gender	user.attribute
1d4c9599-0289-43fa-af4e-378466ebd909	true	id.token.claim
1d4c9599-0289-43fa-af4e-378466ebd909	true	access.token.claim
1d4c9599-0289-43fa-af4e-378466ebd909	gender	claim.name
1d4c9599-0289-43fa-af4e-378466ebd909	String	jsonType.label
69a73858-9702-4710-9f06-e77ca7ed9533	true	introspection.token.claim
69a73858-9702-4710-9f06-e77ca7ed9533	true	userinfo.token.claim
69a73858-9702-4710-9f06-e77ca7ed9533	username	user.attribute
69a73858-9702-4710-9f06-e77ca7ed9533	true	id.token.claim
69a73858-9702-4710-9f06-e77ca7ed9533	true	access.token.claim
69a73858-9702-4710-9f06-e77ca7ed9533	preferred_username	claim.name
69a73858-9702-4710-9f06-e77ca7ed9533	String	jsonType.label
99087487-8a09-40ca-a619-da7e6e13ceff	true	introspection.token.claim
99087487-8a09-40ca-a619-da7e6e13ceff	true	userinfo.token.claim
99087487-8a09-40ca-a619-da7e6e13ceff	true	id.token.claim
99087487-8a09-40ca-a619-da7e6e13ceff	true	access.token.claim
ba599e54-98f9-4891-b5f2-5e08826f9ede	true	introspection.token.claim
ba599e54-98f9-4891-b5f2-5e08826f9ede	true	userinfo.token.claim
ba599e54-98f9-4891-b5f2-5e08826f9ede	lastName	user.attribute
ba599e54-98f9-4891-b5f2-5e08826f9ede	true	id.token.claim
ba599e54-98f9-4891-b5f2-5e08826f9ede	true	access.token.claim
ba599e54-98f9-4891-b5f2-5e08826f9ede	family_name	claim.name
ba599e54-98f9-4891-b5f2-5e08826f9ede	String	jsonType.label
c998a1b0-31e1-40fa-948c-c88fa55bbcee	true	introspection.token.claim
c998a1b0-31e1-40fa-948c-c88fa55bbcee	true	userinfo.token.claim
c998a1b0-31e1-40fa-948c-c88fa55bbcee	middleName	user.attribute
c998a1b0-31e1-40fa-948c-c88fa55bbcee	true	id.token.claim
c998a1b0-31e1-40fa-948c-c88fa55bbcee	true	access.token.claim
c998a1b0-31e1-40fa-948c-c88fa55bbcee	middle_name	claim.name
c998a1b0-31e1-40fa-948c-c88fa55bbcee	String	jsonType.label
d3077563-af55-4d53-a5da-e416ae60fb9d	true	introspection.token.claim
d3077563-af55-4d53-a5da-e416ae60fb9d	true	userinfo.token.claim
d3077563-af55-4d53-a5da-e416ae60fb9d	profile	user.attribute
d3077563-af55-4d53-a5da-e416ae60fb9d	true	id.token.claim
d3077563-af55-4d53-a5da-e416ae60fb9d	true	access.token.claim
d3077563-af55-4d53-a5da-e416ae60fb9d	profile	claim.name
d3077563-af55-4d53-a5da-e416ae60fb9d	String	jsonType.label
ea549762-b57e-41ac-8689-7b62cf9f612a	true	introspection.token.claim
ea549762-b57e-41ac-8689-7b62cf9f612a	true	userinfo.token.claim
ea549762-b57e-41ac-8689-7b62cf9f612a	birthdate	user.attribute
ea549762-b57e-41ac-8689-7b62cf9f612a	true	id.token.claim
ea549762-b57e-41ac-8689-7b62cf9f612a	true	access.token.claim
ea549762-b57e-41ac-8689-7b62cf9f612a	birthdate	claim.name
ea549762-b57e-41ac-8689-7b62cf9f612a	String	jsonType.label
f1c7078d-37e5-447f-aa51-8a7240f07343	true	introspection.token.claim
f1c7078d-37e5-447f-aa51-8a7240f07343	true	userinfo.token.claim
f1c7078d-37e5-447f-aa51-8a7240f07343	website	user.attribute
f1c7078d-37e5-447f-aa51-8a7240f07343	true	id.token.claim
f1c7078d-37e5-447f-aa51-8a7240f07343	true	access.token.claim
f1c7078d-37e5-447f-aa51-8a7240f07343	website	claim.name
f1c7078d-37e5-447f-aa51-8a7240f07343	String	jsonType.label
96e8e7fa-5da8-45f6-abd0-c527bcf6efb8	true	introspection.token.claim
96e8e7fa-5da8-45f6-abd0-c527bcf6efb8	true	userinfo.token.claim
96e8e7fa-5da8-45f6-abd0-c527bcf6efb8	emailVerified	user.attribute
96e8e7fa-5da8-45f6-abd0-c527bcf6efb8	true	id.token.claim
96e8e7fa-5da8-45f6-abd0-c527bcf6efb8	true	access.token.claim
96e8e7fa-5da8-45f6-abd0-c527bcf6efb8	email_verified	claim.name
96e8e7fa-5da8-45f6-abd0-c527bcf6efb8	boolean	jsonType.label
e3172778-c9e8-4675-9e46-49506ef3674b	true	introspection.token.claim
e3172778-c9e8-4675-9e46-49506ef3674b	true	userinfo.token.claim
e3172778-c9e8-4675-9e46-49506ef3674b	email	user.attribute
e3172778-c9e8-4675-9e46-49506ef3674b	true	id.token.claim
e3172778-c9e8-4675-9e46-49506ef3674b	true	access.token.claim
e3172778-c9e8-4675-9e46-49506ef3674b	email	claim.name
e3172778-c9e8-4675-9e46-49506ef3674b	String	jsonType.label
ee88c678-9f35-4e7d-b056-d8fabff734db	formatted	user.attribute.formatted
ee88c678-9f35-4e7d-b056-d8fabff734db	country	user.attribute.country
ee88c678-9f35-4e7d-b056-d8fabff734db	true	introspection.token.claim
ee88c678-9f35-4e7d-b056-d8fabff734db	postal_code	user.attribute.postal_code
ee88c678-9f35-4e7d-b056-d8fabff734db	true	userinfo.token.claim
ee88c678-9f35-4e7d-b056-d8fabff734db	street	user.attribute.street
ee88c678-9f35-4e7d-b056-d8fabff734db	true	id.token.claim
ee88c678-9f35-4e7d-b056-d8fabff734db	region	user.attribute.region
ee88c678-9f35-4e7d-b056-d8fabff734db	true	access.token.claim
ee88c678-9f35-4e7d-b056-d8fabff734db	locality	user.attribute.locality
7e8d94c7-d545-4bfc-b1c7-01520f6602c6	true	introspection.token.claim
7e8d94c7-d545-4bfc-b1c7-01520f6602c6	true	userinfo.token.claim
7e8d94c7-d545-4bfc-b1c7-01520f6602c6	phoneNumberVerified	user.attribute
7e8d94c7-d545-4bfc-b1c7-01520f6602c6	true	id.token.claim
7e8d94c7-d545-4bfc-b1c7-01520f6602c6	true	access.token.claim
7e8d94c7-d545-4bfc-b1c7-01520f6602c6	phone_number_verified	claim.name
7e8d94c7-d545-4bfc-b1c7-01520f6602c6	boolean	jsonType.label
b0443dc6-935f-441c-b463-64bc644cb54e	true	introspection.token.claim
b0443dc6-935f-441c-b463-64bc644cb54e	true	userinfo.token.claim
b0443dc6-935f-441c-b463-64bc644cb54e	phoneNumber	user.attribute
b0443dc6-935f-441c-b463-64bc644cb54e	true	id.token.claim
b0443dc6-935f-441c-b463-64bc644cb54e	true	access.token.claim
b0443dc6-935f-441c-b463-64bc644cb54e	phone_number	claim.name
b0443dc6-935f-441c-b463-64bc644cb54e	String	jsonType.label
720bd9da-75d7-4dff-9748-ee8b3522633e	true	introspection.token.claim
720bd9da-75d7-4dff-9748-ee8b3522633e	true	access.token.claim
b9943252-ce93-4197-a80f-43c35f24c431	true	introspection.token.claim
b9943252-ce93-4197-a80f-43c35f24c431	true	multivalued
b9943252-ce93-4197-a80f-43c35f24c431	foo	user.attribute
b9943252-ce93-4197-a80f-43c35f24c431	true	access.token.claim
b9943252-ce93-4197-a80f-43c35f24c431	realm_access.roles	claim.name
b9943252-ce93-4197-a80f-43c35f24c431	String	jsonType.label
be7a94db-bf8f-456b-b652-aca2f8de9bd6	true	introspection.token.claim
be7a94db-bf8f-456b-b652-aca2f8de9bd6	true	multivalued
be7a94db-bf8f-456b-b652-aca2f8de9bd6	foo	user.attribute
be7a94db-bf8f-456b-b652-aca2f8de9bd6	true	access.token.claim
be7a94db-bf8f-456b-b652-aca2f8de9bd6	resource_access.${client_id}.roles	claim.name
be7a94db-bf8f-456b-b652-aca2f8de9bd6	String	jsonType.label
9f6ba73f-a904-4856-bdd5-96e5242bbb20	true	introspection.token.claim
9f6ba73f-a904-4856-bdd5-96e5242bbb20	true	access.token.claim
1a0252fb-e606-464b-b637-b012cb111baf	true	introspection.token.claim
1a0252fb-e606-464b-b637-b012cb111baf	true	multivalued
1a0252fb-e606-464b-b637-b012cb111baf	foo	user.attribute
1a0252fb-e606-464b-b637-b012cb111baf	true	id.token.claim
1a0252fb-e606-464b-b637-b012cb111baf	true	access.token.claim
1a0252fb-e606-464b-b637-b012cb111baf	groups	claim.name
1a0252fb-e606-464b-b637-b012cb111baf	String	jsonType.label
f1d69ecf-5645-4dc8-8282-73aad4d9ffed	true	introspection.token.claim
f1d69ecf-5645-4dc8-8282-73aad4d9ffed	true	userinfo.token.claim
f1d69ecf-5645-4dc8-8282-73aad4d9ffed	username	user.attribute
f1d69ecf-5645-4dc8-8282-73aad4d9ffed	true	id.token.claim
f1d69ecf-5645-4dc8-8282-73aad4d9ffed	true	access.token.claim
f1d69ecf-5645-4dc8-8282-73aad4d9ffed	upn	claim.name
f1d69ecf-5645-4dc8-8282-73aad4d9ffed	String	jsonType.label
bf6a4c13-8bc9-47d4-baca-0dacfc6bab20	true	introspection.token.claim
bf6a4c13-8bc9-47d4-baca-0dacfc6bab20	true	id.token.claim
bf6a4c13-8bc9-47d4-baca-0dacfc6bab20	true	access.token.claim
ef1a5373-aafe-49ee-8c0a-f3e8bb2cd830	false	single
ef1a5373-aafe-49ee-8c0a-f3e8bb2cd830	Basic	attribute.nameformat
ef1a5373-aafe-49ee-8c0a-f3e8bb2cd830	Role	attribute.name
00198cb0-d6b0-467c-abed-2483bfa62d78	true	introspection.token.claim
00198cb0-d6b0-467c-abed-2483bfa62d78	true	userinfo.token.claim
00198cb0-d6b0-467c-abed-2483bfa62d78	birthdate	user.attribute
00198cb0-d6b0-467c-abed-2483bfa62d78	true	id.token.claim
00198cb0-d6b0-467c-abed-2483bfa62d78	true	access.token.claim
00198cb0-d6b0-467c-abed-2483bfa62d78	birthdate	claim.name
00198cb0-d6b0-467c-abed-2483bfa62d78	String	jsonType.label
15fc14e9-3a61-4576-8ae6-ec7b3f7f979d	true	introspection.token.claim
15fc14e9-3a61-4576-8ae6-ec7b3f7f979d	true	userinfo.token.claim
15fc14e9-3a61-4576-8ae6-ec7b3f7f979d	firstName	user.attribute
15fc14e9-3a61-4576-8ae6-ec7b3f7f979d	true	id.token.claim
15fc14e9-3a61-4576-8ae6-ec7b3f7f979d	true	access.token.claim
15fc14e9-3a61-4576-8ae6-ec7b3f7f979d	given_name	claim.name
15fc14e9-3a61-4576-8ae6-ec7b3f7f979d	String	jsonType.label
280e6289-9b25-4770-92a0-003d335bbb9e	true	introspection.token.claim
280e6289-9b25-4770-92a0-003d335bbb9e	true	userinfo.token.claim
280e6289-9b25-4770-92a0-003d335bbb9e	middleName	user.attribute
280e6289-9b25-4770-92a0-003d335bbb9e	true	id.token.claim
280e6289-9b25-4770-92a0-003d335bbb9e	true	access.token.claim
280e6289-9b25-4770-92a0-003d335bbb9e	middle_name	claim.name
280e6289-9b25-4770-92a0-003d335bbb9e	String	jsonType.label
5c5898a7-7151-4b9a-b962-2457bb3e6406	true	introspection.token.claim
5c5898a7-7151-4b9a-b962-2457bb3e6406	true	userinfo.token.claim
5c5898a7-7151-4b9a-b962-2457bb3e6406	picture	user.attribute
5c5898a7-7151-4b9a-b962-2457bb3e6406	true	id.token.claim
5c5898a7-7151-4b9a-b962-2457bb3e6406	true	access.token.claim
5c5898a7-7151-4b9a-b962-2457bb3e6406	picture	claim.name
5c5898a7-7151-4b9a-b962-2457bb3e6406	String	jsonType.label
67c7aafe-1b71-4ada-bc7c-c0510a9421cf	true	introspection.token.claim
67c7aafe-1b71-4ada-bc7c-c0510a9421cf	true	userinfo.token.claim
67c7aafe-1b71-4ada-bc7c-c0510a9421cf	username	user.attribute
67c7aafe-1b71-4ada-bc7c-c0510a9421cf	true	id.token.claim
67c7aafe-1b71-4ada-bc7c-c0510a9421cf	true	access.token.claim
67c7aafe-1b71-4ada-bc7c-c0510a9421cf	preferred_username	claim.name
67c7aafe-1b71-4ada-bc7c-c0510a9421cf	String	jsonType.label
7499e564-c8dd-4eab-a174-767412aefba1	true	introspection.token.claim
7499e564-c8dd-4eab-a174-767412aefba1	true	userinfo.token.claim
7499e564-c8dd-4eab-a174-767412aefba1	locale	user.attribute
7499e564-c8dd-4eab-a174-767412aefba1	true	id.token.claim
7499e564-c8dd-4eab-a174-767412aefba1	true	access.token.claim
7499e564-c8dd-4eab-a174-767412aefba1	locale	claim.name
7499e564-c8dd-4eab-a174-767412aefba1	String	jsonType.label
76781de9-41be-4d50-8c81-462e833a1a9d	true	introspection.token.claim
76781de9-41be-4d50-8c81-462e833a1a9d	true	userinfo.token.claim
76781de9-41be-4d50-8c81-462e833a1a9d	gender	user.attribute
76781de9-41be-4d50-8c81-462e833a1a9d	true	id.token.claim
76781de9-41be-4d50-8c81-462e833a1a9d	true	access.token.claim
76781de9-41be-4d50-8c81-462e833a1a9d	gender	claim.name
76781de9-41be-4d50-8c81-462e833a1a9d	String	jsonType.label
91e7816a-f2e5-49fb-a076-b4a355daccb4	true	introspection.token.claim
91e7816a-f2e5-49fb-a076-b4a355daccb4	true	userinfo.token.claim
91e7816a-f2e5-49fb-a076-b4a355daccb4	lastName	user.attribute
91e7816a-f2e5-49fb-a076-b4a355daccb4	true	id.token.claim
91e7816a-f2e5-49fb-a076-b4a355daccb4	true	access.token.claim
91e7816a-f2e5-49fb-a076-b4a355daccb4	family_name	claim.name
91e7816a-f2e5-49fb-a076-b4a355daccb4	String	jsonType.label
94636202-1631-4e8d-9442-c48c64b0526e	true	introspection.token.claim
94636202-1631-4e8d-9442-c48c64b0526e	true	userinfo.token.claim
94636202-1631-4e8d-9442-c48c64b0526e	true	id.token.claim
94636202-1631-4e8d-9442-c48c64b0526e	true	access.token.claim
9764cb15-0bea-4e07-b54c-f06a2a14a6b4	true	introspection.token.claim
9764cb15-0bea-4e07-b54c-f06a2a14a6b4	true	userinfo.token.claim
9764cb15-0bea-4e07-b54c-f06a2a14a6b4	updatedAt	user.attribute
9764cb15-0bea-4e07-b54c-f06a2a14a6b4	true	id.token.claim
9764cb15-0bea-4e07-b54c-f06a2a14a6b4	true	access.token.claim
9764cb15-0bea-4e07-b54c-f06a2a14a6b4	updated_at	claim.name
9764cb15-0bea-4e07-b54c-f06a2a14a6b4	long	jsonType.label
9bce6d91-ca7c-4917-9ac8-b6454b9d1e72	true	introspection.token.claim
9bce6d91-ca7c-4917-9ac8-b6454b9d1e72	true	userinfo.token.claim
9bce6d91-ca7c-4917-9ac8-b6454b9d1e72	website	user.attribute
9bce6d91-ca7c-4917-9ac8-b6454b9d1e72	true	id.token.claim
9bce6d91-ca7c-4917-9ac8-b6454b9d1e72	true	access.token.claim
9bce6d91-ca7c-4917-9ac8-b6454b9d1e72	website	claim.name
9bce6d91-ca7c-4917-9ac8-b6454b9d1e72	String	jsonType.label
d28e1a4e-b294-417e-bd57-f563a7b2a4e9	true	introspection.token.claim
d28e1a4e-b294-417e-bd57-f563a7b2a4e9	true	userinfo.token.claim
d28e1a4e-b294-417e-bd57-f563a7b2a4e9	nickname	user.attribute
d28e1a4e-b294-417e-bd57-f563a7b2a4e9	true	id.token.claim
d28e1a4e-b294-417e-bd57-f563a7b2a4e9	true	access.token.claim
d28e1a4e-b294-417e-bd57-f563a7b2a4e9	nickname	claim.name
d28e1a4e-b294-417e-bd57-f563a7b2a4e9	String	jsonType.label
d4e781b3-891e-4bb4-ad71-1c104a603533	true	introspection.token.claim
d4e781b3-891e-4bb4-ad71-1c104a603533	true	userinfo.token.claim
d4e781b3-891e-4bb4-ad71-1c104a603533	profile	user.attribute
d4e781b3-891e-4bb4-ad71-1c104a603533	true	id.token.claim
d4e781b3-891e-4bb4-ad71-1c104a603533	true	access.token.claim
d4e781b3-891e-4bb4-ad71-1c104a603533	profile	claim.name
d4e781b3-891e-4bb4-ad71-1c104a603533	String	jsonType.label
dbb219ed-00f7-4917-958d-f71008881a28	true	introspection.token.claim
dbb219ed-00f7-4917-958d-f71008881a28	true	userinfo.token.claim
dbb219ed-00f7-4917-958d-f71008881a28	zoneinfo	user.attribute
dbb219ed-00f7-4917-958d-f71008881a28	true	id.token.claim
dbb219ed-00f7-4917-958d-f71008881a28	true	access.token.claim
dbb219ed-00f7-4917-958d-f71008881a28	zoneinfo	claim.name
dbb219ed-00f7-4917-958d-f71008881a28	String	jsonType.label
8ca9abf4-a512-49d6-be9c-9aad35c21551	true	introspection.token.claim
8ca9abf4-a512-49d6-be9c-9aad35c21551	true	userinfo.token.claim
8ca9abf4-a512-49d6-be9c-9aad35c21551	emailVerified	user.attribute
8ca9abf4-a512-49d6-be9c-9aad35c21551	true	id.token.claim
8ca9abf4-a512-49d6-be9c-9aad35c21551	true	access.token.claim
8ca9abf4-a512-49d6-be9c-9aad35c21551	email_verified	claim.name
8ca9abf4-a512-49d6-be9c-9aad35c21551	boolean	jsonType.label
e5365824-b66a-4c03-ba3f-f5582818ffc2	true	introspection.token.claim
e5365824-b66a-4c03-ba3f-f5582818ffc2	true	userinfo.token.claim
e5365824-b66a-4c03-ba3f-f5582818ffc2	email	user.attribute
e5365824-b66a-4c03-ba3f-f5582818ffc2	true	id.token.claim
e5365824-b66a-4c03-ba3f-f5582818ffc2	true	access.token.claim
e5365824-b66a-4c03-ba3f-f5582818ffc2	email	claim.name
e5365824-b66a-4c03-ba3f-f5582818ffc2	String	jsonType.label
6612948f-e38b-4668-84a7-34f5fb4f9987	formatted	user.attribute.formatted
6612948f-e38b-4668-84a7-34f5fb4f9987	country	user.attribute.country
6612948f-e38b-4668-84a7-34f5fb4f9987	true	introspection.token.claim
6612948f-e38b-4668-84a7-34f5fb4f9987	postal_code	user.attribute.postal_code
6612948f-e38b-4668-84a7-34f5fb4f9987	true	userinfo.token.claim
6612948f-e38b-4668-84a7-34f5fb4f9987	street	user.attribute.street
6612948f-e38b-4668-84a7-34f5fb4f9987	true	id.token.claim
6612948f-e38b-4668-84a7-34f5fb4f9987	region	user.attribute.region
6612948f-e38b-4668-84a7-34f5fb4f9987	true	access.token.claim
6612948f-e38b-4668-84a7-34f5fb4f9987	locality	user.attribute.locality
13fd31f1-9995-4f24-aeae-f995a762cc93	true	introspection.token.claim
13fd31f1-9995-4f24-aeae-f995a762cc93	true	userinfo.token.claim
13fd31f1-9995-4f24-aeae-f995a762cc93	phoneNumber	user.attribute
13fd31f1-9995-4f24-aeae-f995a762cc93	true	id.token.claim
13fd31f1-9995-4f24-aeae-f995a762cc93	true	access.token.claim
13fd31f1-9995-4f24-aeae-f995a762cc93	phone_number	claim.name
13fd31f1-9995-4f24-aeae-f995a762cc93	String	jsonType.label
9d8f7d35-7bef-44f7-af86-ea5d036da164	true	introspection.token.claim
9d8f7d35-7bef-44f7-af86-ea5d036da164	true	userinfo.token.claim
9d8f7d35-7bef-44f7-af86-ea5d036da164	phoneNumberVerified	user.attribute
9d8f7d35-7bef-44f7-af86-ea5d036da164	true	id.token.claim
9d8f7d35-7bef-44f7-af86-ea5d036da164	true	access.token.claim
9d8f7d35-7bef-44f7-af86-ea5d036da164	phone_number_verified	claim.name
9d8f7d35-7bef-44f7-af86-ea5d036da164	boolean	jsonType.label
766bbbc1-1d5c-4c79-b064-6cf7a54f5c75	true	introspection.token.claim
766bbbc1-1d5c-4c79-b064-6cf7a54f5c75	true	multivalued
766bbbc1-1d5c-4c79-b064-6cf7a54f5c75	foo	user.attribute
766bbbc1-1d5c-4c79-b064-6cf7a54f5c75	true	access.token.claim
766bbbc1-1d5c-4c79-b064-6cf7a54f5c75	realm_access.roles	claim.name
766bbbc1-1d5c-4c79-b064-6cf7a54f5c75	String	jsonType.label
973e1e96-cf4d-4e91-8c07-c970d9cca93b	true	introspection.token.claim
973e1e96-cf4d-4e91-8c07-c970d9cca93b	true	access.token.claim
b3170c28-741f-4bc3-939e-76adec09dc05	true	introspection.token.claim
b3170c28-741f-4bc3-939e-76adec09dc05	true	multivalued
b3170c28-741f-4bc3-939e-76adec09dc05	foo	user.attribute
b3170c28-741f-4bc3-939e-76adec09dc05	true	access.token.claim
b3170c28-741f-4bc3-939e-76adec09dc05	resource_access.${client_id}.roles	claim.name
b3170c28-741f-4bc3-939e-76adec09dc05	String	jsonType.label
552e8421-a5b3-423d-863d-2e34260cf360	true	introspection.token.claim
552e8421-a5b3-423d-863d-2e34260cf360	true	access.token.claim
26e034ad-3cd6-4d47-a1c6-5717e615eae0	true	introspection.token.claim
26e034ad-3cd6-4d47-a1c6-5717e615eae0	true	multivalued
26e034ad-3cd6-4d47-a1c6-5717e615eae0	foo	user.attribute
26e034ad-3cd6-4d47-a1c6-5717e615eae0	true	id.token.claim
26e034ad-3cd6-4d47-a1c6-5717e615eae0	true	access.token.claim
26e034ad-3cd6-4d47-a1c6-5717e615eae0	groups	claim.name
26e034ad-3cd6-4d47-a1c6-5717e615eae0	String	jsonType.label
5d03ce18-185c-4266-aed3-0dcc60712f4b	true	introspection.token.claim
5d03ce18-185c-4266-aed3-0dcc60712f4b	true	userinfo.token.claim
5d03ce18-185c-4266-aed3-0dcc60712f4b	username	user.attribute
5d03ce18-185c-4266-aed3-0dcc60712f4b	true	id.token.claim
5d03ce18-185c-4266-aed3-0dcc60712f4b	true	access.token.claim
5d03ce18-185c-4266-aed3-0dcc60712f4b	upn	claim.name
5d03ce18-185c-4266-aed3-0dcc60712f4b	String	jsonType.label
b97a77a7-661e-4925-8079-4d61b003b435	true	introspection.token.claim
b97a77a7-661e-4925-8079-4d61b003b435	true	id.token.claim
b97a77a7-661e-4925-8079-4d61b003b435	true	access.token.claim
e4e03499-3a60-4c39-9c10-75294580716d	true	introspection.token.claim
e4e03499-3a60-4c39-9c10-75294580716d	true	userinfo.token.claim
e4e03499-3a60-4c39-9c10-75294580716d	locale	user.attribute
e4e03499-3a60-4c39-9c10-75294580716d	true	id.token.claim
e4e03499-3a60-4c39-9c10-75294580716d	true	access.token.claim
e4e03499-3a60-4c39-9c10-75294580716d	locale	claim.name
e4e03499-3a60-4c39-9c10-75294580716d	String	jsonType.label
5385fcea-ddec-43af-a5c4-548a2845adbc	client_id	user.session.note
5385fcea-ddec-43af-a5c4-548a2845adbc	true	introspection.token.claim
5385fcea-ddec-43af-a5c4-548a2845adbc	true	id.token.claim
5385fcea-ddec-43af-a5c4-548a2845adbc	true	access.token.claim
5385fcea-ddec-43af-a5c4-548a2845adbc	client_id	claim.name
5385fcea-ddec-43af-a5c4-548a2845adbc	String	jsonType.label
c0aa439b-08e8-4648-9383-7123f1932217	clientHost	user.session.note
c0aa439b-08e8-4648-9383-7123f1932217	true	introspection.token.claim
c0aa439b-08e8-4648-9383-7123f1932217	true	id.token.claim
c0aa439b-08e8-4648-9383-7123f1932217	true	access.token.claim
c0aa439b-08e8-4648-9383-7123f1932217	clientHost	claim.name
c0aa439b-08e8-4648-9383-7123f1932217	String	jsonType.label
e4f38ed0-6de5-4e41-83f3-5305a5d019e1	clientAddress	user.session.note
e4f38ed0-6de5-4e41-83f3-5305a5d019e1	true	introspection.token.claim
e4f38ed0-6de5-4e41-83f3-5305a5d019e1	true	id.token.claim
e4f38ed0-6de5-4e41-83f3-5305a5d019e1	true	access.token.claim
e4f38ed0-6de5-4e41-83f3-5305a5d019e1	clientAddress	claim.name
e4f38ed0-6de5-4e41-83f3-5305a5d019e1	String	jsonType.label
\.


--
-- Data for Name: realm; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.realm (id, access_code_lifespan, user_action_lifespan, access_token_lifespan, account_theme, admin_theme, email_theme, enabled, events_enabled, events_expiration, login_theme, name, not_before, password_policy, registration_allowed, remember_me, reset_password_allowed, social, ssl_required, sso_idle_timeout, sso_max_lifespan, update_profile_on_soc_login, verify_email, master_admin_client, login_lifespan, internationalization_enabled, default_locale, reg_email_as_username, admin_events_enabled, admin_events_details_enabled, edit_username_allowed, otp_policy_counter, otp_policy_window, otp_policy_period, otp_policy_digits, otp_policy_alg, otp_policy_type, browser_flow, registration_flow, direct_grant_flow, reset_credentials_flow, client_auth_flow, offline_session_idle_timeout, revoke_refresh_token, access_token_life_implicit, login_with_email_allowed, duplicate_emails_allowed, docker_auth_flow, refresh_token_max_reuse, allow_user_managed_access, sso_max_lifespan_remember_me, sso_idle_timeout_remember_me, default_role) FROM stdin;
01494400-afb0-4083-bb7d-02b8ec093758	60	300	1800	\N	\N	\N	t	f	0	\N	athlos	0	\N	f	f	f	f	NONE	86400	604800	f	f	dcdfaf5d-c440-4ccf-bd1a-9172e85ba498	1800	f	\N	f	f	f	f	0	1	30	6	HmacSHA1	totp	f0a7be98-b19c-46d3-97fe-af26126c56fc	53205125-e64d-4a36-8e45-95f125a50a75	36201bf4-ef4a-4134-881b-ed9f87ccf96d	126db41d-ac2c-4ba3-a4e3-3c5b2ec41ad9	dfc1905b-7145-4ef6-afdc-76e2e2db6441	2592000	f	900	t	f	5e179490-eb3e-4bfd-9f70-c874225230a3	0	f	0	0	4184f4a1-ef85-40e5-b9f8-e71c5cd938a5
05d66952-1021-4a4e-9cfb-23359432e8cf	60	300	60	\N	\N	\N	t	f	0	\N	master	0	\N	f	f	f	f	EXTERNAL	1800	36000	f	f	9f3a1353-e07c-4736-ab29-2712088465fa	1800	f	\N	f	f	f	f	0	1	30	6	HmacSHA1	totp	38efa76e-489f-4f4b-ad15-aba94fc563d5	e63370d0-076e-442b-bf08-21a45d497a22	c3006417-0e12-4549-a115-d80cdf598649	21ad0893-b321-4e44-a563-e73fb9c587e1	f022d5ca-ebf1-4b8b-9970-ccb106e926ec	2592000	f	900	t	f	1adda8e9-9834-4e62-b114-035cee377c16	0	f	0	0	db257eaa-4c5f-405d-9a98-b03d69f838f4
\.


--
-- Data for Name: realm_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.realm_attribute (name, realm_id, value) FROM stdin;
_browser_header.contentSecurityPolicyReportOnly	05d66952-1021-4a4e-9cfb-23359432e8cf	
_browser_header.xContentTypeOptions	05d66952-1021-4a4e-9cfb-23359432e8cf	nosniff
_browser_header.referrerPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	no-referrer
_browser_header.xRobotsTag	05d66952-1021-4a4e-9cfb-23359432e8cf	none
_browser_header.xFrameOptions	05d66952-1021-4a4e-9cfb-23359432e8cf	SAMEORIGIN
_browser_header.contentSecurityPolicy	05d66952-1021-4a4e-9cfb-23359432e8cf	frame-src 'self'; frame-ancestors 'self'; object-src 'none';
_browser_header.xXSSProtection	05d66952-1021-4a4e-9cfb-23359432e8cf	1; mode=block
_browser_header.strictTransportSecurity	05d66952-1021-4a4e-9cfb-23359432e8cf	max-age=31536000; includeSubDomains
bruteForceProtected	05d66952-1021-4a4e-9cfb-23359432e8cf	false
permanentLockout	05d66952-1021-4a4e-9cfb-23359432e8cf	false
maxFailureWaitSeconds	05d66952-1021-4a4e-9cfb-23359432e8cf	900
minimumQuickLoginWaitSeconds	05d66952-1021-4a4e-9cfb-23359432e8cf	60
waitIncrementSeconds	05d66952-1021-4a4e-9cfb-23359432e8cf	60
quickLoginCheckMilliSeconds	05d66952-1021-4a4e-9cfb-23359432e8cf	1000
maxDeltaTimeSeconds	05d66952-1021-4a4e-9cfb-23359432e8cf	43200
failureFactor	05d66952-1021-4a4e-9cfb-23359432e8cf	30
realmReusableOtpCode	05d66952-1021-4a4e-9cfb-23359432e8cf	false
displayName	05d66952-1021-4a4e-9cfb-23359432e8cf	Keycloak
displayNameHtml	05d66952-1021-4a4e-9cfb-23359432e8cf	<div class="kc-logo-text"><span>Keycloak</span></div>
defaultSignatureAlgorithm	05d66952-1021-4a4e-9cfb-23359432e8cf	RS256
offlineSessionMaxLifespanEnabled	05d66952-1021-4a4e-9cfb-23359432e8cf	false
offlineSessionMaxLifespan	05d66952-1021-4a4e-9cfb-23359432e8cf	5184000
shortVerificationUri	01494400-afb0-4083-bb7d-02b8ec093758	
actionTokenGeneratedByUserLifespan-verify-email	01494400-afb0-4083-bb7d-02b8ec093758	
actionTokenGeneratedByUserLifespan-idp-verify-account-via-email	01494400-afb0-4083-bb7d-02b8ec093758	
actionTokenGeneratedByUserLifespan-reset-credentials	01494400-afb0-4083-bb7d-02b8ec093758	
actionTokenGeneratedByUserLifespan-execute-actions	01494400-afb0-4083-bb7d-02b8ec093758	
realmReusableOtpCode	01494400-afb0-4083-bb7d-02b8ec093758	false
oauth2DeviceCodeLifespan	01494400-afb0-4083-bb7d-02b8ec093758	600
oauth2DevicePollingInterval	01494400-afb0-4083-bb7d-02b8ec093758	5
cibaBackchannelTokenDeliveryMode	01494400-afb0-4083-bb7d-02b8ec093758	poll
cibaExpiresIn	01494400-afb0-4083-bb7d-02b8ec093758	120
cibaInterval	01494400-afb0-4083-bb7d-02b8ec093758	5
cibaAuthRequestedUserHint	01494400-afb0-4083-bb7d-02b8ec093758	login_hint
parRequestUriLifespan	01494400-afb0-4083-bb7d-02b8ec093758	60
frontendUrl	01494400-afb0-4083-bb7d-02b8ec093758	
acr.loa.map	01494400-afb0-4083-bb7d-02b8ec093758	{}
clientSessionIdleTimeout	01494400-afb0-4083-bb7d-02b8ec093758	0
clientSessionMaxLifespan	01494400-afb0-4083-bb7d-02b8ec093758	0
clientOfflineSessionIdleTimeout	01494400-afb0-4083-bb7d-02b8ec093758	0
clientOfflineSessionMaxLifespan	01494400-afb0-4083-bb7d-02b8ec093758	0
displayName	01494400-afb0-4083-bb7d-02b8ec093758	
displayNameHtml	01494400-afb0-4083-bb7d-02b8ec093758	
bruteForceProtected	01494400-afb0-4083-bb7d-02b8ec093758	true
permanentLockout	01494400-afb0-4083-bb7d-02b8ec093758	false
maxFailureWaitSeconds	01494400-afb0-4083-bb7d-02b8ec093758	900
minimumQuickLoginWaitSeconds	01494400-afb0-4083-bb7d-02b8ec093758	60
waitIncrementSeconds	01494400-afb0-4083-bb7d-02b8ec093758	60
quickLoginCheckMilliSeconds	01494400-afb0-4083-bb7d-02b8ec093758	1000
maxDeltaTimeSeconds	01494400-afb0-4083-bb7d-02b8ec093758	43200
failureFactor	01494400-afb0-4083-bb7d-02b8ec093758	30
actionTokenGeneratedByAdminLifespan	01494400-afb0-4083-bb7d-02b8ec093758	43200
actionTokenGeneratedByUserLifespan	01494400-afb0-4083-bb7d-02b8ec093758	300
defaultSignatureAlgorithm	01494400-afb0-4083-bb7d-02b8ec093758	RS256
offlineSessionMaxLifespanEnabled	01494400-afb0-4083-bb7d-02b8ec093758	false
offlineSessionMaxLifespan	01494400-afb0-4083-bb7d-02b8ec093758	5184000
webAuthnPolicyRpEntityName	01494400-afb0-4083-bb7d-02b8ec093758	keycloak
webAuthnPolicySignatureAlgorithms	01494400-afb0-4083-bb7d-02b8ec093758	ES256
webAuthnPolicyRpId	01494400-afb0-4083-bb7d-02b8ec093758	
webAuthnPolicyAttestationConveyancePreference	01494400-afb0-4083-bb7d-02b8ec093758	not specified
webAuthnPolicyAuthenticatorAttachment	01494400-afb0-4083-bb7d-02b8ec093758	not specified
webAuthnPolicyRequireResidentKey	01494400-afb0-4083-bb7d-02b8ec093758	not specified
webAuthnPolicyUserVerificationRequirement	01494400-afb0-4083-bb7d-02b8ec093758	not specified
webAuthnPolicyCreateTimeout	01494400-afb0-4083-bb7d-02b8ec093758	0
webAuthnPolicyAvoidSameAuthenticatorRegister	01494400-afb0-4083-bb7d-02b8ec093758	false
webAuthnPolicyRpEntityNamePasswordless	01494400-afb0-4083-bb7d-02b8ec093758	keycloak
webAuthnPolicySignatureAlgorithmsPasswordless	01494400-afb0-4083-bb7d-02b8ec093758	ES256
webAuthnPolicyRpIdPasswordless	01494400-afb0-4083-bb7d-02b8ec093758	
webAuthnPolicyAttestationConveyancePreferencePasswordless	01494400-afb0-4083-bb7d-02b8ec093758	not specified
webAuthnPolicyAuthenticatorAttachmentPasswordless	01494400-afb0-4083-bb7d-02b8ec093758	not specified
webAuthnPolicyRequireResidentKeyPasswordless	01494400-afb0-4083-bb7d-02b8ec093758	not specified
webAuthnPolicyUserVerificationRequirementPasswordless	01494400-afb0-4083-bb7d-02b8ec093758	not specified
webAuthnPolicyCreateTimeoutPasswordless	01494400-afb0-4083-bb7d-02b8ec093758	0
webAuthnPolicyAvoidSameAuthenticatorRegisterPasswordless	01494400-afb0-4083-bb7d-02b8ec093758	false
client-policies.profiles	01494400-afb0-4083-bb7d-02b8ec093758	{"profiles":[]}
client-policies.policies	01494400-afb0-4083-bb7d-02b8ec093758	{"policies":[]}
_browser_header.contentSecurityPolicyReportOnly	01494400-afb0-4083-bb7d-02b8ec093758	
_browser_header.xContentTypeOptions	01494400-afb0-4083-bb7d-02b8ec093758	nosniff
_browser_header.referrerPolicy	01494400-afb0-4083-bb7d-02b8ec093758	no-referrer
_browser_header.xRobotsTag	01494400-afb0-4083-bb7d-02b8ec093758	none
_browser_header.xFrameOptions	01494400-afb0-4083-bb7d-02b8ec093758	SAMEORIGIN
_browser_header.contentSecurityPolicy	01494400-afb0-4083-bb7d-02b8ec093758	frame-src 'self'; frame-ancestors 'self'; object-src 'none';
_browser_header.xXSSProtection	01494400-afb0-4083-bb7d-02b8ec093758	1; mode=block
_browser_header.strictTransportSecurity	01494400-afb0-4083-bb7d-02b8ec093758	max-age=31536000; includeSubDomains
\.


--
-- Data for Name: realm_default_groups; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.realm_default_groups (realm_id, group_id) FROM stdin;
\.


--
-- Data for Name: realm_enabled_event_types; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.realm_enabled_event_types (realm_id, value) FROM stdin;
\.


--
-- Data for Name: realm_events_listeners; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.realm_events_listeners (realm_id, value) FROM stdin;
05d66952-1021-4a4e-9cfb-23359432e8cf	jboss-logging
01494400-afb0-4083-bb7d-02b8ec093758	jboss-logging
\.


--
-- Data for Name: realm_localizations; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.realm_localizations (realm_id, locale, texts) FROM stdin;
\.


--
-- Data for Name: realm_required_credential; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.realm_required_credential (type, form_label, input, secret, realm_id) FROM stdin;
password	password	t	t	05d66952-1021-4a4e-9cfb-23359432e8cf
password	password	t	t	01494400-afb0-4083-bb7d-02b8ec093758
\.


--
-- Data for Name: realm_smtp_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.realm_smtp_config (realm_id, value, name) FROM stdin;
\.


--
-- Data for Name: realm_supported_locales; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.realm_supported_locales (realm_id, value) FROM stdin;
\.


--
-- Data for Name: redirect_uris; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.redirect_uris (client_id, value) FROM stdin;
5ab11789-449d-4d65-9b20-694103d445f3	/realms/master/account/*
1634cea3-037e-4cb9-a1f7-6d06c149bc95	/realms/master/account/*
9b7cea44-6a22-443a-b194-5b9f52bd3a67	/admin/master/console/*
ffa49a4f-a149-4610-af7d-8fc7f8db10e3	/realms/athlos/account/*
7e6a9f09-5438-43c6-9f97-325c10d4271b	/realms/athlos/account/*
fd6bf04d-2664-4c42-9218-89b926ab62ef	/admin/athlos/console/*
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	http://athloshub.com.br/*
\.


--
-- Data for Name: required_action_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.required_action_config (required_action_id, value, name) FROM stdin;
\.


--
-- Data for Name: required_action_provider; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.required_action_provider (id, alias, name, realm_id, enabled, default_action, provider_id, priority) FROM stdin;
6d44e295-1828-439f-afbf-30d5e5b593e1	VERIFY_EMAIL	Verify Email	05d66952-1021-4a4e-9cfb-23359432e8cf	t	f	VERIFY_EMAIL	50
3837a409-d452-4215-aa07-a95aa5a2fe6c	UPDATE_PROFILE	Update Profile	05d66952-1021-4a4e-9cfb-23359432e8cf	t	f	UPDATE_PROFILE	40
823f1307-718a-4258-b5aa-d5e1e70808d7	CONFIGURE_TOTP	Configure OTP	05d66952-1021-4a4e-9cfb-23359432e8cf	t	f	CONFIGURE_TOTP	10
0767ba0e-642f-4ae7-a6b7-cb640ae29c9b	UPDATE_PASSWORD	Update Password	05d66952-1021-4a4e-9cfb-23359432e8cf	t	f	UPDATE_PASSWORD	30
8bd95f1c-4a1b-4d45-868a-04d01c456b74	TERMS_AND_CONDITIONS	Terms and Conditions	05d66952-1021-4a4e-9cfb-23359432e8cf	f	f	TERMS_AND_CONDITIONS	20
e0cefc31-d30f-4f45-a17c-f2f867913e56	delete_account	Delete Account	05d66952-1021-4a4e-9cfb-23359432e8cf	f	f	delete_account	60
aac22ac4-42cd-4f53-ac9f-8e73392d2186	update_user_locale	Update User Locale	05d66952-1021-4a4e-9cfb-23359432e8cf	t	f	update_user_locale	1000
226d82dc-c070-4fd7-8a6b-7794e8361a74	webauthn-register	Webauthn Register	05d66952-1021-4a4e-9cfb-23359432e8cf	t	f	webauthn-register	70
0e0d7732-4112-446f-b332-a6699c691e6b	webauthn-register-passwordless	Webauthn Register Passwordless	05d66952-1021-4a4e-9cfb-23359432e8cf	t	f	webauthn-register-passwordless	80
4e4dbf13-ab9e-4017-b246-78d5cb1c6085	UPDATE_PROFILE	Update Profile	01494400-afb0-4083-bb7d-02b8ec093758	t	f	UPDATE_PROFILE	40
c89aaa44-a956-4e5b-8d41-5bca1878dfa7	CONFIGURE_TOTP	Configure OTP	01494400-afb0-4083-bb7d-02b8ec093758	t	f	CONFIGURE_TOTP	10
ba824c1b-f3b2-4bc1-a41d-cad263525ba3	UPDATE_PASSWORD	Update Password	01494400-afb0-4083-bb7d-02b8ec093758	t	f	UPDATE_PASSWORD	30
c3c5973b-64d4-4aaf-84d8-5b610cc37d84	TERMS_AND_CONDITIONS	Terms and Conditions	01494400-afb0-4083-bb7d-02b8ec093758	f	f	TERMS_AND_CONDITIONS	20
f2671adf-7382-4b9e-8be2-ae88512950c8	delete_account	Delete Account	01494400-afb0-4083-bb7d-02b8ec093758	f	f	delete_account	60
abb43e9a-3fe4-43f3-a0ea-afc693fd6b66	update_user_locale	Update User Locale	01494400-afb0-4083-bb7d-02b8ec093758	t	f	update_user_locale	1000
43dab44c-fde2-49bd-bf19-3d1040f4ac6b	webauthn-register	Webauthn Register	01494400-afb0-4083-bb7d-02b8ec093758	t	f	webauthn-register	70
204cc970-e46b-4b0b-b012-4a237a86fa20	webauthn-register-passwordless	Webauthn Register Passwordless	01494400-afb0-4083-bb7d-02b8ec093758	t	f	webauthn-register-passwordless	80
77787259-7be7-4f5a-8b50-9831c1dfc845	VERIFY_EMAIL	Verify Email	01494400-afb0-4083-bb7d-02b8ec093758	t	f	VERIFY_EMAIL	50
\.


--
-- Data for Name: resource_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.resource_attribute (id, name, value, resource_id) FROM stdin;
\.


--
-- Data for Name: resource_policy; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.resource_policy (resource_id, policy_id) FROM stdin;
\.


--
-- Data for Name: resource_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.resource_scope (resource_id, scope_id) FROM stdin;
\.


--
-- Data for Name: resource_server; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.resource_server (id, allow_rs_remote_mgmt, policy_enforce_mode, decision_strategy) FROM stdin;
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	t	0	1
\.


--
-- Data for Name: resource_server_perm_ticket; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.resource_server_perm_ticket (id, owner, requester, created_timestamp, granted_timestamp, resource_id, scope_id, resource_server_id, policy_id) FROM stdin;
\.


--
-- Data for Name: resource_server_policy; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.resource_server_policy (id, name, description, type, decision_strategy, logic, resource_server_id, owner) FROM stdin;
2eefe5b2-25c3-4079-b8b9-040ad96e203b	Default Policy	A policy that grants access only for users within this realm	js	0	0	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	\N
785961f5-0d1d-419d-9909-b6c8612adc5b	Default Permission	A permission that applies to the default resource type	resource	1	0	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	\N
\.


--
-- Data for Name: resource_server_resource; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.resource_server_resource (id, name, type, icon_uri, owner, resource_server_id, owner_managed_access, display_name) FROM stdin;
48d9f96d-a95d-4e2d-9518-402959be2fd4	Default Resource	urn:auth-client:resources:default	\N	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	f	\N
\.


--
-- Data for Name: resource_server_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.resource_server_scope (id, name, icon_uri, resource_server_id, display_name) FROM stdin;
\.


--
-- Data for Name: resource_uris; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.resource_uris (resource_id, value) FROM stdin;
48d9f96d-a95d-4e2d-9518-402959be2fd4	/*
\.


--
-- Data for Name: role_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.role_attribute (id, role_id, name, value) FROM stdin;
\.


--
-- Data for Name: scope_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.scope_mapping (client_id, role_id) FROM stdin;
1634cea3-037e-4cb9-a1f7-6d06c149bc95	2b960113-dc6f-4441-93f8-aa8203d03a32
1634cea3-037e-4cb9-a1f7-6d06c149bc95	9838e74b-379c-4363-8000-52d2edec9b87
7e6a9f09-5438-43c6-9f97-325c10d4271b	9778725f-eab5-44d8-bd7a-9f2ed2d2ab21
7e6a9f09-5438-43c6-9f97-325c10d4271b	4f3d1eba-a2e9-4a18-a5e3-393c31caed63
\.


--
-- Data for Name: scope_policy; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.scope_policy (scope_id, policy_id) FROM stdin;
\.


--
-- Data for Name: user_attribute; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_attribute (name, value, user_id, id) FROM stdin;
picture	https://lh3.googleusercontent.com/a/ACg8ocLhjoHeP0r21C7MNvS30xVnVOHJ7p5qzDR1nIjHTP-ITpgrag=s96-c	643c733b-81e3-41b0-8c66-2070bb435267	35adeb06-4bfe-4c9e-a329-ac6724663eff
avatar_url	https://athloshub-media.s3.us-east-2.amazonaws.com/avatars/f5f3da10-2693-4499-b547-d21b2a472556/1a72f117-36f4-4bf6-ba49-a79aec3d4aeb_foto.jpeg	f5f3da10-2693-4499-b547-d21b2a472556	62b41fc7-9cda-4fd1-91ef-a1bcf057ae2d
\.


--
-- Data for Name: user_consent; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_consent (id, client_id, user_id, created_date, last_updated_date, client_storage_provider, external_client_id) FROM stdin;
\.


--
-- Data for Name: user_consent_client_scope; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_consent_client_scope (user_consent_id, scope_id) FROM stdin;
\.


--
-- Data for Name: user_entity; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_entity (id, email, email_constraint, email_verified, enabled, federation_link, first_name, last_name, realm_id, username, created_timestamp, service_account_client_link, not_before) FROM stdin;
ce1d92bf-aa46-484c-9dad-6e9d87836a65	\N	34017ccc-99a4-4ed0-b317-1c7be5544f15	f	t	\N	\N	\N	05d66952-1021-4a4e-9cfb-23359432e8cf	admin	1769192895472	\N	0
8b61bfd5-7020-4f95-beb7-e5119d31361b	\N	5590eec7-8f24-4ce0-8179-dbb2ab4f06bf	f	t	\N	\N	\N	01494400-afb0-4083-bb7d-02b8ec093758	service-account-auth-client	1769224778416	de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	0
1a8900ff-32e9-4b6e-8f4d-14127363e431	gustavoemanuel00@hotmail.com	gustavoemanuel00@hotmail.com	t	t	\N	Gustavo	Silva	01494400-afb0-4083-bb7d-02b8ec093758	gustavoemanuel00	1769271265097	\N	0
f5f3da10-2693-4499-b547-d21b2a472556	gustavoe.dev@gmail.com	gustavoe.dev@gmail.com	t	t	\N	Gustavo	Emanuel	01494400-afb0-4083-bb7d-02b8ec093758	gustavoe.dev@gmail.com	1769275497983	\N	0
643c733b-81e3-41b0-8c66-2070bb435267	gustavo.q@escolar.ifrn.edu.br	gustavo.q@escolar.ifrn.edu.br	t	t	\N	GUSTAVO	EMANUEL SILVA QUEIROZ	01494400-afb0-4083-bb7d-02b8ec093758	gustavo.q@escolar.ifrn.edu.br	1769278210485	\N	0
\.


--
-- Data for Name: user_federation_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_federation_config (user_federation_provider_id, value, name) FROM stdin;
\.


--
-- Data for Name: user_federation_mapper; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_federation_mapper (id, name, federation_provider_id, federation_mapper_type, realm_id) FROM stdin;
\.


--
-- Data for Name: user_federation_mapper_config; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_federation_mapper_config (user_federation_mapper_id, value, name) FROM stdin;
\.


--
-- Data for Name: user_federation_provider; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_federation_provider (id, changed_sync_period, display_name, full_sync_period, last_sync, priority, provider_name, realm_id) FROM stdin;
\.


--
-- Data for Name: user_group_membership; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_group_membership (group_id, user_id) FROM stdin;
\.


--
-- Data for Name: user_required_action; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_required_action (user_id, required_action) FROM stdin;
\.


--
-- Data for Name: user_role_mapping; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_role_mapping (role_id, user_id) FROM stdin;
db257eaa-4c5f-405d-9a98-b03d69f838f4	ce1d92bf-aa46-484c-9dad-6e9d87836a65
b191d06c-173e-4d20-985f-a175e2a7af84	ce1d92bf-aa46-484c-9dad-6e9d87836a65
45bc9ee4-8374-4c5d-a918-ee4357358122	ce1d92bf-aa46-484c-9dad-6e9d87836a65
e62e7f2d-e5ef-478c-a9d5-b74df315862b	ce1d92bf-aa46-484c-9dad-6e9d87836a65
9ad84872-36dd-43bb-8cc0-8197b74f964a	ce1d92bf-aa46-484c-9dad-6e9d87836a65
5903645f-21e7-443e-9d18-b1ea7676d9eb	ce1d92bf-aa46-484c-9dad-6e9d87836a65
9a9c1e8c-c921-41bc-84c1-21492da7f433	ce1d92bf-aa46-484c-9dad-6e9d87836a65
101c7960-7c76-4cb9-9152-e6432daa8e60	ce1d92bf-aa46-484c-9dad-6e9d87836a65
39f288d5-cd1d-4376-a9d6-667565540ed8	ce1d92bf-aa46-484c-9dad-6e9d87836a65
8362020c-bf62-466e-8aec-e06c6eed1fad	ce1d92bf-aa46-484c-9dad-6e9d87836a65
2037cdec-2aab-453e-ad70-b4213c8878d9	ce1d92bf-aa46-484c-9dad-6e9d87836a65
1842e66a-1138-42d6-84ef-5d3167938ca0	ce1d92bf-aa46-484c-9dad-6e9d87836a65
68e3ce88-300e-4808-a9a1-e90c4d081331	ce1d92bf-aa46-484c-9dad-6e9d87836a65
95cced90-4f34-4efd-934c-8860d922b7f6	ce1d92bf-aa46-484c-9dad-6e9d87836a65
2341f5e1-c24c-4e51-a7aa-ff651b2301fe	ce1d92bf-aa46-484c-9dad-6e9d87836a65
5253fa4a-aefa-4a08-9880-6bf9d8355581	ce1d92bf-aa46-484c-9dad-6e9d87836a65
ccbc7fa2-2a4d-4643-afa2-d077c734e12c	ce1d92bf-aa46-484c-9dad-6e9d87836a65
aaae2708-1219-4b84-8c97-98e0c2a641cf	ce1d92bf-aa46-484c-9dad-6e9d87836a65
d103b704-d45e-427c-b2f5-c75086fe5fa7	ce1d92bf-aa46-484c-9dad-6e9d87836a65
4184f4a1-ef85-40e5-b9f8-e71c5cd938a5	8b61bfd5-7020-4f95-beb7-e5119d31361b
2e2d89a3-92dd-4bfa-b65d-b61393985154	8b61bfd5-7020-4f95-beb7-e5119d31361b
291221ab-6fab-4e9e-9b15-48ae841d5d87	8b61bfd5-7020-4f95-beb7-e5119d31361b
4184f4a1-ef85-40e5-b9f8-e71c5cd938a5	1a8900ff-32e9-4b6e-8f4d-14127363e431
dc9ac524-b966-4c4b-96e5-e621d81c0699	1a8900ff-32e9-4b6e-8f4d-14127363e431
4184f4a1-ef85-40e5-b9f8-e71c5cd938a5	f5f3da10-2693-4499-b547-d21b2a472556
dc9ac524-b966-4c4b-96e5-e621d81c0699	f5f3da10-2693-4499-b547-d21b2a472556
4184f4a1-ef85-40e5-b9f8-e71c5cd938a5	643c733b-81e3-41b0-8c66-2070bb435267
dc9ac524-b966-4c4b-96e5-e621d81c0699	643c733b-81e3-41b0-8c66-2070bb435267
0b8553fc-a52a-4553-8833-a081ee00111e	1a8900ff-32e9-4b6e-8f4d-14127363e431
\.


--
-- Data for Name: user_session; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_session (id, auth_method, ip_address, last_session_refresh, login_username, realm_id, remember_me, started, user_id, user_session_state, broker_session_id, broker_user_id) FROM stdin;
\.


--
-- Data for Name: user_session_note; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.user_session_note (user_session, name, value) FROM stdin;
\.


--
-- Data for Name: username_login_failure; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.username_login_failure (realm_id, username, failed_login_not_before, last_failure, last_ip_failure, num_failures) FROM stdin;
\.


--
-- Data for Name: web_origins; Type: TABLE DATA; Schema: public; Owner: keycloak
--

COPY public.web_origins (client_id, value) FROM stdin;
9b7cea44-6a22-443a-b194-5b9f52bd3a67	+
fd6bf04d-2664-4c42-9218-89b926ab62ef	+
de22f44a-5fa1-43e4-8d8d-6ffaff3b78ca	http://athloshub.com.br
\.


--
-- Name: username_login_failure CONSTRAINT_17-2; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.username_login_failure
    ADD CONSTRAINT "CONSTRAINT_17-2" PRIMARY KEY (realm_id, username);


--
-- Name: keycloak_role UK_J3RWUVD56ONTGSUHOGM184WW2-2; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_role
    ADD CONSTRAINT "UK_J3RWUVD56ONTGSUHOGM184WW2-2" UNIQUE (name, client_realm_constraint);


--
-- Name: client_auth_flow_bindings c_cli_flow_bind; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_auth_flow_bindings
    ADD CONSTRAINT c_cli_flow_bind PRIMARY KEY (client_id, binding_name);


--
-- Name: client_scope_client c_cli_scope_bind; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_client
    ADD CONSTRAINT c_cli_scope_bind PRIMARY KEY (client_id, scope_id);


--
-- Name: client_initial_access cnstr_client_init_acc_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_initial_access
    ADD CONSTRAINT cnstr_client_init_acc_pk PRIMARY KEY (id);


--
-- Name: realm_default_groups con_group_id_def_groups; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_default_groups
    ADD CONSTRAINT con_group_id_def_groups UNIQUE (group_id);


--
-- Name: broker_link constr_broker_link_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.broker_link
    ADD CONSTRAINT constr_broker_link_pk PRIMARY KEY (identity_provider, user_id);


--
-- Name: client_user_session_note constr_cl_usr_ses_note; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_user_session_note
    ADD CONSTRAINT constr_cl_usr_ses_note PRIMARY KEY (client_session, name);


--
-- Name: component_config constr_component_config_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.component_config
    ADD CONSTRAINT constr_component_config_pk PRIMARY KEY (id);


--
-- Name: component constr_component_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.component
    ADD CONSTRAINT constr_component_pk PRIMARY KEY (id);


--
-- Name: fed_user_required_action constr_fed_required_action; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_required_action
    ADD CONSTRAINT constr_fed_required_action PRIMARY KEY (required_action, user_id);


--
-- Name: fed_user_attribute constr_fed_user_attr_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_attribute
    ADD CONSTRAINT constr_fed_user_attr_pk PRIMARY KEY (id);


--
-- Name: fed_user_consent constr_fed_user_consent_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_consent
    ADD CONSTRAINT constr_fed_user_consent_pk PRIMARY KEY (id);


--
-- Name: fed_user_credential constr_fed_user_cred_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_credential
    ADD CONSTRAINT constr_fed_user_cred_pk PRIMARY KEY (id);


--
-- Name: fed_user_group_membership constr_fed_user_group; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_group_membership
    ADD CONSTRAINT constr_fed_user_group PRIMARY KEY (group_id, user_id);


--
-- Name: fed_user_role_mapping constr_fed_user_role; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_role_mapping
    ADD CONSTRAINT constr_fed_user_role PRIMARY KEY (role_id, user_id);


--
-- Name: federated_user constr_federated_user; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.federated_user
    ADD CONSTRAINT constr_federated_user PRIMARY KEY (id);


--
-- Name: realm_default_groups constr_realm_default_groups; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_default_groups
    ADD CONSTRAINT constr_realm_default_groups PRIMARY KEY (realm_id, group_id);


--
-- Name: realm_enabled_event_types constr_realm_enabl_event_types; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_enabled_event_types
    ADD CONSTRAINT constr_realm_enabl_event_types PRIMARY KEY (realm_id, value);


--
-- Name: realm_events_listeners constr_realm_events_listeners; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_events_listeners
    ADD CONSTRAINT constr_realm_events_listeners PRIMARY KEY (realm_id, value);


--
-- Name: realm_supported_locales constr_realm_supported_locales; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_supported_locales
    ADD CONSTRAINT constr_realm_supported_locales PRIMARY KEY (realm_id, value);


--
-- Name: identity_provider constraint_2b; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider
    ADD CONSTRAINT constraint_2b PRIMARY KEY (internal_id);


--
-- Name: client_attributes constraint_3c; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_attributes
    ADD CONSTRAINT constraint_3c PRIMARY KEY (client_id, name);


--
-- Name: event_entity constraint_4; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.event_entity
    ADD CONSTRAINT constraint_4 PRIMARY KEY (id);


--
-- Name: federated_identity constraint_40; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.federated_identity
    ADD CONSTRAINT constraint_40 PRIMARY KEY (identity_provider, user_id);


--
-- Name: realm constraint_4a; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm
    ADD CONSTRAINT constraint_4a PRIMARY KEY (id);


--
-- Name: client_session_role constraint_5; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_role
    ADD CONSTRAINT constraint_5 PRIMARY KEY (client_session, role_id);


--
-- Name: user_session constraint_57; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_session
    ADD CONSTRAINT constraint_57 PRIMARY KEY (id);


--
-- Name: user_federation_provider constraint_5c; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_provider
    ADD CONSTRAINT constraint_5c PRIMARY KEY (id);


--
-- Name: client_session_note constraint_5e; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_note
    ADD CONSTRAINT constraint_5e PRIMARY KEY (client_session, name);


--
-- Name: client constraint_7; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT constraint_7 PRIMARY KEY (id);


--
-- Name: client_session constraint_8; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session
    ADD CONSTRAINT constraint_8 PRIMARY KEY (id);


--
-- Name: scope_mapping constraint_81; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_mapping
    ADD CONSTRAINT constraint_81 PRIMARY KEY (client_id, role_id);


--
-- Name: client_node_registrations constraint_84; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_node_registrations
    ADD CONSTRAINT constraint_84 PRIMARY KEY (client_id, name);


--
-- Name: realm_attribute constraint_9; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_attribute
    ADD CONSTRAINT constraint_9 PRIMARY KEY (name, realm_id);


--
-- Name: realm_required_credential constraint_92; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_required_credential
    ADD CONSTRAINT constraint_92 PRIMARY KEY (realm_id, type);


--
-- Name: keycloak_role constraint_a; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_role
    ADD CONSTRAINT constraint_a PRIMARY KEY (id);


--
-- Name: admin_event_entity constraint_admin_event_entity; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.admin_event_entity
    ADD CONSTRAINT constraint_admin_event_entity PRIMARY KEY (id);


--
-- Name: authenticator_config_entry constraint_auth_cfg_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authenticator_config_entry
    ADD CONSTRAINT constraint_auth_cfg_pk PRIMARY KEY (authenticator_id, name);


--
-- Name: authentication_execution constraint_auth_exec_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_execution
    ADD CONSTRAINT constraint_auth_exec_pk PRIMARY KEY (id);


--
-- Name: authentication_flow constraint_auth_flow_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_flow
    ADD CONSTRAINT constraint_auth_flow_pk PRIMARY KEY (id);


--
-- Name: authenticator_config constraint_auth_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authenticator_config
    ADD CONSTRAINT constraint_auth_pk PRIMARY KEY (id);


--
-- Name: client_session_auth_status constraint_auth_status_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_auth_status
    ADD CONSTRAINT constraint_auth_status_pk PRIMARY KEY (client_session, authenticator);


--
-- Name: user_role_mapping constraint_c; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_role_mapping
    ADD CONSTRAINT constraint_c PRIMARY KEY (role_id, user_id);


--
-- Name: composite_role constraint_composite_role; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.composite_role
    ADD CONSTRAINT constraint_composite_role PRIMARY KEY (composite, child_role);


--
-- Name: client_session_prot_mapper constraint_cs_pmp_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_prot_mapper
    ADD CONSTRAINT constraint_cs_pmp_pk PRIMARY KEY (client_session, protocol_mapper_id);


--
-- Name: identity_provider_config constraint_d; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider_config
    ADD CONSTRAINT constraint_d PRIMARY KEY (identity_provider_id, name);


--
-- Name: policy_config constraint_dpc; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.policy_config
    ADD CONSTRAINT constraint_dpc PRIMARY KEY (policy_id, name);


--
-- Name: realm_smtp_config constraint_e; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_smtp_config
    ADD CONSTRAINT constraint_e PRIMARY KEY (realm_id, name);


--
-- Name: credential constraint_f; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT constraint_f PRIMARY KEY (id);


--
-- Name: user_federation_config constraint_f9; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_config
    ADD CONSTRAINT constraint_f9 PRIMARY KEY (user_federation_provider_id, name);


--
-- Name: resource_server_perm_ticket constraint_fapmt; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT constraint_fapmt PRIMARY KEY (id);


--
-- Name: resource_server_resource constraint_farsr; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_resource
    ADD CONSTRAINT constraint_farsr PRIMARY KEY (id);


--
-- Name: resource_server_policy constraint_farsrp; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_policy
    ADD CONSTRAINT constraint_farsrp PRIMARY KEY (id);


--
-- Name: associated_policy constraint_farsrpap; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.associated_policy
    ADD CONSTRAINT constraint_farsrpap PRIMARY KEY (policy_id, associated_policy_id);


--
-- Name: resource_policy constraint_farsrpp; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_policy
    ADD CONSTRAINT constraint_farsrpp PRIMARY KEY (resource_id, policy_id);


--
-- Name: resource_server_scope constraint_farsrs; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_scope
    ADD CONSTRAINT constraint_farsrs PRIMARY KEY (id);


--
-- Name: resource_scope constraint_farsrsp; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_scope
    ADD CONSTRAINT constraint_farsrsp PRIMARY KEY (resource_id, scope_id);


--
-- Name: scope_policy constraint_farsrsps; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_policy
    ADD CONSTRAINT constraint_farsrsps PRIMARY KEY (scope_id, policy_id);


--
-- Name: user_entity constraint_fb; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT constraint_fb PRIMARY KEY (id);


--
-- Name: user_federation_mapper_config constraint_fedmapper_cfg_pm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper_config
    ADD CONSTRAINT constraint_fedmapper_cfg_pm PRIMARY KEY (user_federation_mapper_id, name);


--
-- Name: user_federation_mapper constraint_fedmapperpm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper
    ADD CONSTRAINT constraint_fedmapperpm PRIMARY KEY (id);


--
-- Name: fed_user_consent_cl_scope constraint_fgrntcsnt_clsc_pm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.fed_user_consent_cl_scope
    ADD CONSTRAINT constraint_fgrntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- Name: user_consent_client_scope constraint_grntcsnt_clsc_pm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent_client_scope
    ADD CONSTRAINT constraint_grntcsnt_clsc_pm PRIMARY KEY (user_consent_id, scope_id);


--
-- Name: user_consent constraint_grntcsnt_pm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent
    ADD CONSTRAINT constraint_grntcsnt_pm PRIMARY KEY (id);


--
-- Name: keycloak_group constraint_group; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_group
    ADD CONSTRAINT constraint_group PRIMARY KEY (id);


--
-- Name: group_attribute constraint_group_attribute_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.group_attribute
    ADD CONSTRAINT constraint_group_attribute_pk PRIMARY KEY (id);


--
-- Name: group_role_mapping constraint_group_role; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.group_role_mapping
    ADD CONSTRAINT constraint_group_role PRIMARY KEY (role_id, group_id);


--
-- Name: identity_provider_mapper constraint_idpm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider_mapper
    ADD CONSTRAINT constraint_idpm PRIMARY KEY (id);


--
-- Name: idp_mapper_config constraint_idpmconfig; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.idp_mapper_config
    ADD CONSTRAINT constraint_idpmconfig PRIMARY KEY (idp_mapper_id, name);


--
-- Name: migration_model constraint_migmod; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.migration_model
    ADD CONSTRAINT constraint_migmod PRIMARY KEY (id);


--
-- Name: offline_client_session constraint_offl_cl_ses_pk3; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.offline_client_session
    ADD CONSTRAINT constraint_offl_cl_ses_pk3 PRIMARY KEY (user_session_id, client_id, client_storage_provider, external_client_id, offline_flag);


--
-- Name: offline_user_session constraint_offl_us_ses_pk2; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.offline_user_session
    ADD CONSTRAINT constraint_offl_us_ses_pk2 PRIMARY KEY (user_session_id, offline_flag);


--
-- Name: protocol_mapper constraint_pcm; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper
    ADD CONSTRAINT constraint_pcm PRIMARY KEY (id);


--
-- Name: protocol_mapper_config constraint_pmconfig; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper_config
    ADD CONSTRAINT constraint_pmconfig PRIMARY KEY (protocol_mapper_id, name);


--
-- Name: redirect_uris constraint_redirect_uris; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.redirect_uris
    ADD CONSTRAINT constraint_redirect_uris PRIMARY KEY (client_id, value);


--
-- Name: required_action_config constraint_req_act_cfg_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.required_action_config
    ADD CONSTRAINT constraint_req_act_cfg_pk PRIMARY KEY (required_action_id, name);


--
-- Name: required_action_provider constraint_req_act_prv_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.required_action_provider
    ADD CONSTRAINT constraint_req_act_prv_pk PRIMARY KEY (id);


--
-- Name: user_required_action constraint_required_action; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_required_action
    ADD CONSTRAINT constraint_required_action PRIMARY KEY (required_action, user_id);


--
-- Name: resource_uris constraint_resour_uris_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_uris
    ADD CONSTRAINT constraint_resour_uris_pk PRIMARY KEY (resource_id, value);


--
-- Name: role_attribute constraint_role_attribute_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.role_attribute
    ADD CONSTRAINT constraint_role_attribute_pk PRIMARY KEY (id);


--
-- Name: user_attribute constraint_user_attribute_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_attribute
    ADD CONSTRAINT constraint_user_attribute_pk PRIMARY KEY (id);


--
-- Name: user_group_membership constraint_user_group; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_group_membership
    ADD CONSTRAINT constraint_user_group PRIMARY KEY (group_id, user_id);


--
-- Name: user_session_note constraint_usn_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_session_note
    ADD CONSTRAINT constraint_usn_pk PRIMARY KEY (user_session, name);


--
-- Name: web_origins constraint_web_origins; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.web_origins
    ADD CONSTRAINT constraint_web_origins PRIMARY KEY (client_id, value);


--
-- Name: databasechangeloglock databasechangeloglock_pkey; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.databasechangeloglock
    ADD CONSTRAINT databasechangeloglock_pkey PRIMARY KEY (id);


--
-- Name: client_scope_attributes pk_cl_tmpl_attr; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_attributes
    ADD CONSTRAINT pk_cl_tmpl_attr PRIMARY KEY (scope_id, name);


--
-- Name: client_scope pk_cli_template; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope
    ADD CONSTRAINT pk_cli_template PRIMARY KEY (id);


--
-- Name: resource_server pk_resource_server; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server
    ADD CONSTRAINT pk_resource_server PRIMARY KEY (id);


--
-- Name: client_scope_role_mapping pk_template_scope; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_role_mapping
    ADD CONSTRAINT pk_template_scope PRIMARY KEY (scope_id, role_id);


--
-- Name: default_client_scope r_def_cli_scope_bind; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.default_client_scope
    ADD CONSTRAINT r_def_cli_scope_bind PRIMARY KEY (realm_id, scope_id);


--
-- Name: realm_localizations realm_localizations_pkey; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_localizations
    ADD CONSTRAINT realm_localizations_pkey PRIMARY KEY (realm_id, locale);


--
-- Name: resource_attribute res_attr_pk; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_attribute
    ADD CONSTRAINT res_attr_pk PRIMARY KEY (id);


--
-- Name: keycloak_group sibling_names; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_group
    ADD CONSTRAINT sibling_names UNIQUE (realm_id, parent_group, name);


--
-- Name: identity_provider uk_2daelwnibji49avxsrtuf6xj33; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider
    ADD CONSTRAINT uk_2daelwnibji49avxsrtuf6xj33 UNIQUE (provider_alias, realm_id);


--
-- Name: client uk_b71cjlbenv945rb6gcon438at; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client
    ADD CONSTRAINT uk_b71cjlbenv945rb6gcon438at UNIQUE (realm_id, client_id);


--
-- Name: client_scope uk_cli_scope; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope
    ADD CONSTRAINT uk_cli_scope UNIQUE (realm_id, name);


--
-- Name: user_entity uk_dykn684sl8up1crfei6eckhd7; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT uk_dykn684sl8up1crfei6eckhd7 UNIQUE (realm_id, email_constraint);


--
-- Name: resource_server_resource uk_frsr6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_resource
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5ha6 UNIQUE (name, owner, resource_server_id);


--
-- Name: resource_server_perm_ticket uk_frsr6t700s9v50bu18ws5pmt; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT uk_frsr6t700s9v50bu18ws5pmt UNIQUE (owner, requester, resource_server_id, resource_id, scope_id);


--
-- Name: resource_server_policy uk_frsrpt700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_policy
    ADD CONSTRAINT uk_frsrpt700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- Name: resource_server_scope uk_frsrst700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_scope
    ADD CONSTRAINT uk_frsrst700s9v50bu18ws5ha6 UNIQUE (name, resource_server_id);


--
-- Name: user_consent uk_jkuwuvd56ontgsuhogm8uewrt; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent
    ADD CONSTRAINT uk_jkuwuvd56ontgsuhogm8uewrt UNIQUE (client_id, client_storage_provider, external_client_id, user_id);


--
-- Name: realm uk_orvsdmla56612eaefiq6wl5oi; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm
    ADD CONSTRAINT uk_orvsdmla56612eaefiq6wl5oi UNIQUE (name);


--
-- Name: user_entity uk_ru8tt6t700s9v50bu18ws5ha6; Type: CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_entity
    ADD CONSTRAINT uk_ru8tt6t700s9v50bu18ws5ha6 UNIQUE (realm_id, username);


--
-- Name: idx_admin_event_time; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_admin_event_time ON public.admin_event_entity USING btree (realm_id, admin_event_time);


--
-- Name: idx_assoc_pol_assoc_pol_id; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_assoc_pol_assoc_pol_id ON public.associated_policy USING btree (associated_policy_id);


--
-- Name: idx_auth_config_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_auth_config_realm ON public.authenticator_config USING btree (realm_id);


--
-- Name: idx_auth_exec_flow; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_auth_exec_flow ON public.authentication_execution USING btree (flow_id);


--
-- Name: idx_auth_exec_realm_flow; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_auth_exec_realm_flow ON public.authentication_execution USING btree (realm_id, flow_id);


--
-- Name: idx_auth_flow_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_auth_flow_realm ON public.authentication_flow USING btree (realm_id);


--
-- Name: idx_cl_clscope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_cl_clscope ON public.client_scope_client USING btree (scope_id);


--
-- Name: idx_client_id; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_client_id ON public.client USING btree (client_id);


--
-- Name: idx_client_init_acc_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_client_init_acc_realm ON public.client_initial_access USING btree (realm_id);


--
-- Name: idx_client_session_session; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_client_session_session ON public.client_session USING btree (session_id);


--
-- Name: idx_clscope_attrs; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_clscope_attrs ON public.client_scope_attributes USING btree (scope_id);


--
-- Name: idx_clscope_cl; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_clscope_cl ON public.client_scope_client USING btree (client_id);


--
-- Name: idx_clscope_protmap; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_clscope_protmap ON public.protocol_mapper USING btree (client_scope_id);


--
-- Name: idx_clscope_role; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_clscope_role ON public.client_scope_role_mapping USING btree (scope_id);


--
-- Name: idx_compo_config_compo; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_compo_config_compo ON public.component_config USING btree (component_id);


--
-- Name: idx_component_provider_type; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_component_provider_type ON public.component USING btree (provider_type);


--
-- Name: idx_component_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_component_realm ON public.component USING btree (realm_id);


--
-- Name: idx_composite; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_composite ON public.composite_role USING btree (composite);


--
-- Name: idx_composite_child; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_composite_child ON public.composite_role USING btree (child_role);


--
-- Name: idx_defcls_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_defcls_realm ON public.default_client_scope USING btree (realm_id);


--
-- Name: idx_defcls_scope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_defcls_scope ON public.default_client_scope USING btree (scope_id);


--
-- Name: idx_event_time; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_event_time ON public.event_entity USING btree (realm_id, event_time);


--
-- Name: idx_fedidentity_feduser; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fedidentity_feduser ON public.federated_identity USING btree (federated_user_id);


--
-- Name: idx_fedidentity_user; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fedidentity_user ON public.federated_identity USING btree (user_id);


--
-- Name: idx_fu_attribute; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_attribute ON public.fed_user_attribute USING btree (user_id, realm_id, name);


--
-- Name: idx_fu_cnsnt_ext; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_cnsnt_ext ON public.fed_user_consent USING btree (user_id, client_storage_provider, external_client_id);


--
-- Name: idx_fu_consent; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_consent ON public.fed_user_consent USING btree (user_id, client_id);


--
-- Name: idx_fu_consent_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_consent_ru ON public.fed_user_consent USING btree (realm_id, user_id);


--
-- Name: idx_fu_credential; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_credential ON public.fed_user_credential USING btree (user_id, type);


--
-- Name: idx_fu_credential_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_credential_ru ON public.fed_user_credential USING btree (realm_id, user_id);


--
-- Name: idx_fu_group_membership; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_group_membership ON public.fed_user_group_membership USING btree (user_id, group_id);


--
-- Name: idx_fu_group_membership_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_group_membership_ru ON public.fed_user_group_membership USING btree (realm_id, user_id);


--
-- Name: idx_fu_required_action; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_required_action ON public.fed_user_required_action USING btree (user_id, required_action);


--
-- Name: idx_fu_required_action_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_required_action_ru ON public.fed_user_required_action USING btree (realm_id, user_id);


--
-- Name: idx_fu_role_mapping; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_role_mapping ON public.fed_user_role_mapping USING btree (user_id, role_id);


--
-- Name: idx_fu_role_mapping_ru; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_fu_role_mapping_ru ON public.fed_user_role_mapping USING btree (realm_id, user_id);


--
-- Name: idx_group_att_by_name_value; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_group_att_by_name_value ON public.group_attribute USING btree (name, ((value)::character varying(250)));


--
-- Name: idx_group_attr_group; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_group_attr_group ON public.group_attribute USING btree (group_id);


--
-- Name: idx_group_role_mapp_group; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_group_role_mapp_group ON public.group_role_mapping USING btree (group_id);


--
-- Name: idx_id_prov_mapp_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_id_prov_mapp_realm ON public.identity_provider_mapper USING btree (realm_id);


--
-- Name: idx_ident_prov_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_ident_prov_realm ON public.identity_provider USING btree (realm_id);


--
-- Name: idx_keycloak_role_client; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_keycloak_role_client ON public.keycloak_role USING btree (client);


--
-- Name: idx_keycloak_role_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_keycloak_role_realm ON public.keycloak_role USING btree (realm);


--
-- Name: idx_offline_css_preload; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_css_preload ON public.offline_client_session USING btree (client_id, offline_flag);


--
-- Name: idx_offline_uss_by_user; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_uss_by_user ON public.offline_user_session USING btree (user_id, realm_id, offline_flag);


--
-- Name: idx_offline_uss_by_usersess; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_uss_by_usersess ON public.offline_user_session USING btree (realm_id, offline_flag, user_session_id);


--
-- Name: idx_offline_uss_createdon; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_uss_createdon ON public.offline_user_session USING btree (created_on);


--
-- Name: idx_offline_uss_preload; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_offline_uss_preload ON public.offline_user_session USING btree (offline_flag, created_on, user_session_id);


--
-- Name: idx_protocol_mapper_client; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_protocol_mapper_client ON public.protocol_mapper USING btree (client_id);


--
-- Name: idx_realm_attr_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_attr_realm ON public.realm_attribute USING btree (realm_id);


--
-- Name: idx_realm_clscope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_clscope ON public.client_scope USING btree (realm_id);


--
-- Name: idx_realm_def_grp_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_def_grp_realm ON public.realm_default_groups USING btree (realm_id);


--
-- Name: idx_realm_evt_list_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_evt_list_realm ON public.realm_events_listeners USING btree (realm_id);


--
-- Name: idx_realm_evt_types_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_evt_types_realm ON public.realm_enabled_event_types USING btree (realm_id);


--
-- Name: idx_realm_master_adm_cli; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_master_adm_cli ON public.realm USING btree (master_admin_client);


--
-- Name: idx_realm_supp_local_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_realm_supp_local_realm ON public.realm_supported_locales USING btree (realm_id);


--
-- Name: idx_redir_uri_client; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_redir_uri_client ON public.redirect_uris USING btree (client_id);


--
-- Name: idx_req_act_prov_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_req_act_prov_realm ON public.required_action_provider USING btree (realm_id);


--
-- Name: idx_res_policy_policy; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_policy_policy ON public.resource_policy USING btree (policy_id);


--
-- Name: idx_res_scope_scope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_scope_scope ON public.resource_scope USING btree (scope_id);


--
-- Name: idx_res_serv_pol_res_serv; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_serv_pol_res_serv ON public.resource_server_policy USING btree (resource_server_id);


--
-- Name: idx_res_srv_res_res_srv; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_srv_res_res_srv ON public.resource_server_resource USING btree (resource_server_id);


--
-- Name: idx_res_srv_scope_res_srv; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_res_srv_scope_res_srv ON public.resource_server_scope USING btree (resource_server_id);


--
-- Name: idx_role_attribute; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_role_attribute ON public.role_attribute USING btree (role_id);


--
-- Name: idx_role_clscope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_role_clscope ON public.client_scope_role_mapping USING btree (role_id);


--
-- Name: idx_scope_mapping_role; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_scope_mapping_role ON public.scope_mapping USING btree (role_id);


--
-- Name: idx_scope_policy_policy; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_scope_policy_policy ON public.scope_policy USING btree (policy_id);


--
-- Name: idx_update_time; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_update_time ON public.migration_model USING btree (update_time);


--
-- Name: idx_us_sess_id_on_cl_sess; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_us_sess_id_on_cl_sess ON public.offline_client_session USING btree (user_session_id);


--
-- Name: idx_usconsent_clscope; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_usconsent_clscope ON public.user_consent_client_scope USING btree (user_consent_id);


--
-- Name: idx_user_attribute; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_attribute ON public.user_attribute USING btree (user_id);


--
-- Name: idx_user_attribute_name; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_attribute_name ON public.user_attribute USING btree (name, value);


--
-- Name: idx_user_consent; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_consent ON public.user_consent USING btree (user_id);


--
-- Name: idx_user_credential; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_credential ON public.credential USING btree (user_id);


--
-- Name: idx_user_email; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_email ON public.user_entity USING btree (email);


--
-- Name: idx_user_group_mapping; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_group_mapping ON public.user_group_membership USING btree (user_id);


--
-- Name: idx_user_reqactions; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_reqactions ON public.user_required_action USING btree (user_id);


--
-- Name: idx_user_role_mapping; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_role_mapping ON public.user_role_mapping USING btree (user_id);


--
-- Name: idx_user_service_account; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_user_service_account ON public.user_entity USING btree (realm_id, service_account_client_link);


--
-- Name: idx_usr_fed_map_fed_prv; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_usr_fed_map_fed_prv ON public.user_federation_mapper USING btree (federation_provider_id);


--
-- Name: idx_usr_fed_map_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_usr_fed_map_realm ON public.user_federation_mapper USING btree (realm_id);


--
-- Name: idx_usr_fed_prv_realm; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_usr_fed_prv_realm ON public.user_federation_provider USING btree (realm_id);


--
-- Name: idx_web_orig_client; Type: INDEX; Schema: public; Owner: keycloak
--

CREATE INDEX idx_web_orig_client ON public.web_origins USING btree (client_id);


--
-- Name: client_session_auth_status auth_status_constraint; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_auth_status
    ADD CONSTRAINT auth_status_constraint FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- Name: identity_provider fk2b4ebc52ae5c3b34; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider
    ADD CONSTRAINT fk2b4ebc52ae5c3b34 FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: client_attributes fk3c47c64beacca966; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_attributes
    ADD CONSTRAINT fk3c47c64beacca966 FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: federated_identity fk404288b92ef007a6; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.federated_identity
    ADD CONSTRAINT fk404288b92ef007a6 FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- Name: client_node_registrations fk4129723ba992f594; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_node_registrations
    ADD CONSTRAINT fk4129723ba992f594 FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: client_session_note fk5edfb00ff51c2736; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_note
    ADD CONSTRAINT fk5edfb00ff51c2736 FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- Name: user_session_note fk5edfb00ff51d3472; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_session_note
    ADD CONSTRAINT fk5edfb00ff51d3472 FOREIGN KEY (user_session) REFERENCES public.user_session(id);


--
-- Name: client_session_role fk_11b7sgqw18i532811v7o2dv76; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_role
    ADD CONSTRAINT fk_11b7sgqw18i532811v7o2dv76 FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- Name: redirect_uris fk_1burs8pb4ouj97h5wuppahv9f; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.redirect_uris
    ADD CONSTRAINT fk_1burs8pb4ouj97h5wuppahv9f FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: user_federation_provider fk_1fj32f6ptolw2qy60cd8n01e8; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_provider
    ADD CONSTRAINT fk_1fj32f6ptolw2qy60cd8n01e8 FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: client_session_prot_mapper fk_33a8sgqw18i532811v7o2dk89; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session_prot_mapper
    ADD CONSTRAINT fk_33a8sgqw18i532811v7o2dk89 FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- Name: realm_required_credential fk_5hg65lybevavkqfki3kponh9v; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_required_credential
    ADD CONSTRAINT fk_5hg65lybevavkqfki3kponh9v FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: resource_attribute fk_5hrm2vlf9ql5fu022kqepovbr; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu022kqepovbr FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- Name: user_attribute fk_5hrm2vlf9ql5fu043kqepovbr; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_attribute
    ADD CONSTRAINT fk_5hrm2vlf9ql5fu043kqepovbr FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- Name: user_required_action fk_6qj3w1jw9cvafhe19bwsiuvmd; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_required_action
    ADD CONSTRAINT fk_6qj3w1jw9cvafhe19bwsiuvmd FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- Name: keycloak_role fk_6vyqfe4cn4wlq8r6kt5vdsj5c; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.keycloak_role
    ADD CONSTRAINT fk_6vyqfe4cn4wlq8r6kt5vdsj5c FOREIGN KEY (realm) REFERENCES public.realm(id);


--
-- Name: realm_smtp_config fk_70ej8xdxgxd0b9hh6180irr0o; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_smtp_config
    ADD CONSTRAINT fk_70ej8xdxgxd0b9hh6180irr0o FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: realm_attribute fk_8shxd6l3e9atqukacxgpffptw; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_attribute
    ADD CONSTRAINT fk_8shxd6l3e9atqukacxgpffptw FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: composite_role fk_a63wvekftu8jo1pnj81e7mce2; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.composite_role
    ADD CONSTRAINT fk_a63wvekftu8jo1pnj81e7mce2 FOREIGN KEY (composite) REFERENCES public.keycloak_role(id);


--
-- Name: authentication_execution fk_auth_exec_flow; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_execution
    ADD CONSTRAINT fk_auth_exec_flow FOREIGN KEY (flow_id) REFERENCES public.authentication_flow(id);


--
-- Name: authentication_execution fk_auth_exec_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_execution
    ADD CONSTRAINT fk_auth_exec_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: authentication_flow fk_auth_flow_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authentication_flow
    ADD CONSTRAINT fk_auth_flow_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: authenticator_config fk_auth_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.authenticator_config
    ADD CONSTRAINT fk_auth_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: client_session fk_b4ao2vcvat6ukau74wbwtfqo1; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_session
    ADD CONSTRAINT fk_b4ao2vcvat6ukau74wbwtfqo1 FOREIGN KEY (session_id) REFERENCES public.user_session(id);


--
-- Name: user_role_mapping fk_c4fqv34p1mbylloxang7b1q3l; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_role_mapping
    ADD CONSTRAINT fk_c4fqv34p1mbylloxang7b1q3l FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- Name: client_scope_attributes fk_cl_scope_attr_scope; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_attributes
    ADD CONSTRAINT fk_cl_scope_attr_scope FOREIGN KEY (scope_id) REFERENCES public.client_scope(id);


--
-- Name: client_scope_role_mapping fk_cl_scope_rm_scope; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_scope_role_mapping
    ADD CONSTRAINT fk_cl_scope_rm_scope FOREIGN KEY (scope_id) REFERENCES public.client_scope(id);


--
-- Name: client_user_session_note fk_cl_usr_ses_note; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_user_session_note
    ADD CONSTRAINT fk_cl_usr_ses_note FOREIGN KEY (client_session) REFERENCES public.client_session(id);


--
-- Name: protocol_mapper fk_cli_scope_mapper; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper
    ADD CONSTRAINT fk_cli_scope_mapper FOREIGN KEY (client_scope_id) REFERENCES public.client_scope(id);


--
-- Name: client_initial_access fk_client_init_acc_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.client_initial_access
    ADD CONSTRAINT fk_client_init_acc_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: component_config fk_component_config; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.component_config
    ADD CONSTRAINT fk_component_config FOREIGN KEY (component_id) REFERENCES public.component(id);


--
-- Name: component fk_component_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.component
    ADD CONSTRAINT fk_component_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: realm_default_groups fk_def_groups_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_default_groups
    ADD CONSTRAINT fk_def_groups_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: user_federation_mapper_config fk_fedmapper_cfg; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper_config
    ADD CONSTRAINT fk_fedmapper_cfg FOREIGN KEY (user_federation_mapper_id) REFERENCES public.user_federation_mapper(id);


--
-- Name: user_federation_mapper fk_fedmapperpm_fedprv; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_fedprv FOREIGN KEY (federation_provider_id) REFERENCES public.user_federation_provider(id);


--
-- Name: user_federation_mapper fk_fedmapperpm_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_mapper
    ADD CONSTRAINT fk_fedmapperpm_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: associated_policy fk_frsr5s213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.associated_policy
    ADD CONSTRAINT fk_frsr5s213xcx4wnkog82ssrfy FOREIGN KEY (associated_policy_id) REFERENCES public.resource_server_policy(id);


--
-- Name: scope_policy fk_frsrasp13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_policy
    ADD CONSTRAINT fk_frsrasp13xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog82sspmt; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82sspmt FOREIGN KEY (resource_server_id) REFERENCES public.resource_server(id);


--
-- Name: resource_server_resource fk_frsrho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_resource
    ADD CONSTRAINT fk_frsrho213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES public.resource_server(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog83sspmt; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog83sspmt FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- Name: resource_server_perm_ticket fk_frsrho213xcx4wnkog84sspmt; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrho213xcx4wnkog84sspmt FOREIGN KEY (scope_id) REFERENCES public.resource_server_scope(id);


--
-- Name: associated_policy fk_frsrpas14xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.associated_policy
    ADD CONSTRAINT fk_frsrpas14xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- Name: scope_policy fk_frsrpass3xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_policy
    ADD CONSTRAINT fk_frsrpass3xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES public.resource_server_scope(id);


--
-- Name: resource_server_perm_ticket fk_frsrpo2128cx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_perm_ticket
    ADD CONSTRAINT fk_frsrpo2128cx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- Name: resource_server_policy fk_frsrpo213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_policy
    ADD CONSTRAINT fk_frsrpo213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES public.resource_server(id);


--
-- Name: resource_scope fk_frsrpos13xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_scope
    ADD CONSTRAINT fk_frsrpos13xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- Name: resource_policy fk_frsrpos53xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_policy
    ADD CONSTRAINT fk_frsrpos53xcx4wnkog82ssrfy FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- Name: resource_policy fk_frsrpp213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_policy
    ADD CONSTRAINT fk_frsrpp213xcx4wnkog82ssrfy FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- Name: resource_scope fk_frsrps213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_scope
    ADD CONSTRAINT fk_frsrps213xcx4wnkog82ssrfy FOREIGN KEY (scope_id) REFERENCES public.resource_server_scope(id);


--
-- Name: resource_server_scope fk_frsrso213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_server_scope
    ADD CONSTRAINT fk_frsrso213xcx4wnkog82ssrfy FOREIGN KEY (resource_server_id) REFERENCES public.resource_server(id);


--
-- Name: composite_role fk_gr7thllb9lu8q4vqa4524jjy8; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.composite_role
    ADD CONSTRAINT fk_gr7thllb9lu8q4vqa4524jjy8 FOREIGN KEY (child_role) REFERENCES public.keycloak_role(id);


--
-- Name: user_consent_client_scope fk_grntcsnt_clsc_usc; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent_client_scope
    ADD CONSTRAINT fk_grntcsnt_clsc_usc FOREIGN KEY (user_consent_id) REFERENCES public.user_consent(id);


--
-- Name: user_consent fk_grntcsnt_user; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_consent
    ADD CONSTRAINT fk_grntcsnt_user FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- Name: group_attribute fk_group_attribute_group; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.group_attribute
    ADD CONSTRAINT fk_group_attribute_group FOREIGN KEY (group_id) REFERENCES public.keycloak_group(id);


--
-- Name: group_role_mapping fk_group_role_group; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.group_role_mapping
    ADD CONSTRAINT fk_group_role_group FOREIGN KEY (group_id) REFERENCES public.keycloak_group(id);


--
-- Name: realm_enabled_event_types fk_h846o4h0w8epx5nwedrf5y69j; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_enabled_event_types
    ADD CONSTRAINT fk_h846o4h0w8epx5nwedrf5y69j FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: realm_events_listeners fk_h846o4h0w8epx5nxev9f5y69j; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_events_listeners
    ADD CONSTRAINT fk_h846o4h0w8epx5nxev9f5y69j FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: identity_provider_mapper fk_idpm_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider_mapper
    ADD CONSTRAINT fk_idpm_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: idp_mapper_config fk_idpmconfig; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.idp_mapper_config
    ADD CONSTRAINT fk_idpmconfig FOREIGN KEY (idp_mapper_id) REFERENCES public.identity_provider_mapper(id);


--
-- Name: web_origins fk_lojpho213xcx4wnkog82ssrfy; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.web_origins
    ADD CONSTRAINT fk_lojpho213xcx4wnkog82ssrfy FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: scope_mapping fk_ouse064plmlr732lxjcn1q5f1; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.scope_mapping
    ADD CONSTRAINT fk_ouse064plmlr732lxjcn1q5f1 FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: protocol_mapper fk_pcm_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper
    ADD CONSTRAINT fk_pcm_realm FOREIGN KEY (client_id) REFERENCES public.client(id);


--
-- Name: credential fk_pfyr0glasqyl0dei3kl69r6v0; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.credential
    ADD CONSTRAINT fk_pfyr0glasqyl0dei3kl69r6v0 FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- Name: protocol_mapper_config fk_pmconfig; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.protocol_mapper_config
    ADD CONSTRAINT fk_pmconfig FOREIGN KEY (protocol_mapper_id) REFERENCES public.protocol_mapper(id);


--
-- Name: default_client_scope fk_r_def_cli_scope_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.default_client_scope
    ADD CONSTRAINT fk_r_def_cli_scope_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: required_action_provider fk_req_act_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.required_action_provider
    ADD CONSTRAINT fk_req_act_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: resource_uris fk_resource_server_uris; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.resource_uris
    ADD CONSTRAINT fk_resource_server_uris FOREIGN KEY (resource_id) REFERENCES public.resource_server_resource(id);


--
-- Name: role_attribute fk_role_attribute_id; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.role_attribute
    ADD CONSTRAINT fk_role_attribute_id FOREIGN KEY (role_id) REFERENCES public.keycloak_role(id);


--
-- Name: realm_supported_locales fk_supported_locales_realm; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.realm_supported_locales
    ADD CONSTRAINT fk_supported_locales_realm FOREIGN KEY (realm_id) REFERENCES public.realm(id);


--
-- Name: user_federation_config fk_t13hpu1j94r2ebpekr39x5eu5; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_federation_config
    ADD CONSTRAINT fk_t13hpu1j94r2ebpekr39x5eu5 FOREIGN KEY (user_federation_provider_id) REFERENCES public.user_federation_provider(id);


--
-- Name: user_group_membership fk_user_group_user; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.user_group_membership
    ADD CONSTRAINT fk_user_group_user FOREIGN KEY (user_id) REFERENCES public.user_entity(id);


--
-- Name: policy_config fkdc34197cf864c4e43; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.policy_config
    ADD CONSTRAINT fkdc34197cf864c4e43 FOREIGN KEY (policy_id) REFERENCES public.resource_server_policy(id);


--
-- Name: identity_provider_config fkdc4897cf864c4e43; Type: FK CONSTRAINT; Schema: public; Owner: keycloak
--

ALTER TABLE ONLY public.identity_provider_config
    ADD CONSTRAINT fkdc4897cf864c4e43 FOREIGN KEY (identity_provider_id) REFERENCES public.identity_provider(internal_id);


--
-- PostgreSQL database dump complete
--

\unrestrict jWWKPqraIvQu4JhijmWz4aIl1N77GY2Uib6PtE6jF1PidxZjA42Si2FA4WVqKhn

