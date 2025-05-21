--
-- PostgreSQL database dump
--

-- Dumped from database version 17.0
-- Dumped by pg_dump version 17.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: bozos
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO bozos;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: bozos
--

COMMENT ON SCHEMA public IS '';


--
-- Name: SenderType; Type: TYPE; Schema: public; Owner: bozos
--

CREATE TYPE public."SenderType" AS ENUM (
    'member',
    'admin',
    'superuser'
);


ALTER TYPE public."SenderType" OWNER TO bozos;

--
-- Name: notify_card_number_change(); Type: FUNCTION; Schema: public; Owner: bozos
--

CREATE FUNCTION public.notify_card_number_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          -- If card_number was changed
          IF (TG_OP = 'UPDATE' AND OLD.card_number IS DISTINCT FROM NEW.card_number) OR 
             (TG_OP = 'INSERT' AND NEW.card_number IS NOT NULL) THEN
              
              -- Insert into queue for password update
              INSERT INTO password_update_queue (member_id, card_number) 
              VALUES (NEW.member_id, NEW.card_number);
              
              -- Add a log to the audit_logs table if it exists
              BEGIN
                  INSERT INTO audit_logs (action_type, performed_by, action_details, ip_address, status, affected_member)
                  VALUES ('CARD_NUMBER_UPDATED', NULL, format('Card number updated for member ID %s, needs password update', NEW.member_id), 
                         'Trigger', 'notification', NEW.member_id);
              EXCEPTION WHEN OTHERS THEN
                  -- If audit table doesn't exist or insertion fails, continue anyway
              END;
          END IF;
          
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.notify_card_number_change() OWNER TO bozos;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Hours; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public."Hours" (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    date timestamp(6) with time zone NOT NULL,
    hours integer NOT NULL,
    verified boolean DEFAULT false,
    "createdAt" timestamp(6) with time zone NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);


ALTER TABLE public."Hours" OWNER TO bozos;

--
-- Name: Hours_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public."Hours_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Hours_id_seq" OWNER TO bozos;

--
-- Name: Hours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public."Hours_id_seq" OWNED BY public."Hours".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO bozos;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.activities (
    activity_id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    start_date timestamp(6) without time zone NOT NULL,
    end_date timestamp(6) without time zone NOT NULL,
    location character varying(100),
    difficulty_level character varying(20),
    max_participants integer,
    created_by integer,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    activity_type_id integer
);


ALTER TABLE public.activities OWNER TO bozos;

--
-- Name: activities_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.activities_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activities_activity_id_seq OWNER TO bozos;

--
-- Name: activities_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.activities_activity_id_seq OWNED BY public.activities.activity_id;


--
-- Name: activity_participants; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.activity_participants (
    participation_id integer NOT NULL,
    activity_id integer,
    member_id integer,
    hours_spent numeric(5,2) NOT NULL,
    role character varying(50),
    notes text,
    verified_by integer,
    verified_at timestamp(6) without time zone,
    verified_by_member_id integer
);


ALTER TABLE public.activity_participants OWNER TO bozos;

--
-- Name: activity_participants_participation_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.activity_participants_participation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_participants_participation_id_seq OWNER TO bozos;

--
-- Name: activity_participants_participation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.activity_participants_participation_id_seq OWNED BY public.activity_participants.participation_id;


--
-- Name: activity_types; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.activity_types (
    type_id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_types OWNER TO bozos;

--
-- Name: activity_types_type_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.activity_types_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_types_type_id_seq OWNER TO bozos;

--
-- Name: activity_types_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.activity_types_type_id_seq OWNED BY public.activity_types.type_id;


--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.admin_permissions (
    permission_id integer NOT NULL,
    member_id integer,
    can_manage_end_reasons boolean DEFAULT false,
    granted_by integer,
    granted_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_permissions OWNER TO bozos;

--
-- Name: admin_permissions_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.admin_permissions_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_permissions_permission_id_seq OWNER TO bozos;

--
-- Name: admin_permissions_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.admin_permissions_permission_id_seq OWNED BY public.admin_permissions.permission_id;


--
-- Name: annual_statistics; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.annual_statistics (
    stat_id integer NOT NULL,
    member_id integer,
    year integer NOT NULL,
    total_hours numeric(7,2) NOT NULL,
    total_activities integer NOT NULL,
    membership_status character varying(20) NOT NULL,
    calculated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.annual_statistics OWNER TO bozos;

--
-- Name: annual_statistics_stat_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.annual_statistics_stat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.annual_statistics_stat_id_seq OWNER TO bozos;

--
-- Name: annual_statistics_stat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.annual_statistics_stat_id_seq OWNED BY public.annual_statistics.stat_id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.audit_logs (
    log_id integer NOT NULL,
    action_type character varying(50) NOT NULL,
    performed_by integer,
    action_details text NOT NULL,
    ip_address character varying(45),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20),
    affected_member integer
);


ALTER TABLE public.audit_logs OWNER TO bozos;

--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.audit_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_log_id_seq OWNER TO bozos;

--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.audit_logs_log_id_seq OWNED BY public.audit_logs.log_id;


--
-- Name: card_numbers; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.card_numbers (
    id integer NOT NULL,
    card_number character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_at timestamp(6) with time zone,
    member_id integer
);


ALTER TABLE public.card_numbers OWNER TO bozos;

--
-- Name: card_numbers_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.card_numbers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.card_numbers_id_seq OWNER TO bozos;

--
-- Name: card_numbers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.card_numbers_id_seq OWNED BY public.card_numbers.id;


--
-- Name: member_messages; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.member_messages (
    message_id integer NOT NULL,
    member_id integer,
    message_text text NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp(6) without time zone,
    status character varying(20) DEFAULT 'unread'::character varying,
    sender_id integer,
    recipient_id integer,
    recipient_type character varying(10) DEFAULT 'admin'::character varying,
    sender_type public."SenderType" DEFAULT 'member'::public."SenderType" NOT NULL
);


ALTER TABLE public.member_messages OWNER TO bozos;

--
-- Name: member_messages_message_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.member_messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.member_messages_message_id_seq OWNER TO bozos;

--
-- Name: member_messages_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.member_messages_message_id_seq OWNED BY public.member_messages.message_id;


--
-- Name: members; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.members (
    status character varying(50) DEFAULT 'pending'::character varying,
    date_of_birth date,
    oib character varying(11) NOT NULL,
    cell_phone character varying(20) NOT NULL,
    city character varying(100) NOT NULL,
    street_address character varying(200) NOT NULL,
    email character varying(255),
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    member_id integer NOT NULL,
    password_hash character varying(255),
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    last_login timestamp(6) without time zone,
    full_name character varying(100) NOT NULL,
    life_status character varying(25),
    tshirt_size character varying(4),
    shell_jacket_size character varying(4),
    total_hours numeric(10,2) DEFAULT 0,
    gender character varying(6),
    registration_completed boolean DEFAULT false,
    profile_image_path character varying(255),
    profile_image_updated_at timestamp(6) without time zone,
    membership_type character varying(20) DEFAULT 'regular'::character varying,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    nickname character varying(50),
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    last_failed_login timestamp(6) without time zone,
    locked_until timestamp(6) without time zone
);


ALTER TABLE public.members OWNER TO bozos;

--
-- Name: members_backup; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.members_backup (
    id integer,
    name character varying(255),
    status character varying(50),
    date_of_birth date,
    oib character varying(13),
    cell_phone character varying(20),
    city character varying(100),
    street_address character varying(200),
    email character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    member_id character varying(1000)
);


ALTER TABLE public.members_backup OWNER TO bozos;

--
-- Name: members_member_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.members_member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.members_member_id_seq OWNER TO bozos;

--
-- Name: members_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.members_member_id_seq OWNED BY public.members.member_id;


--
-- Name: membership_details; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.membership_details (
    member_id integer NOT NULL,
    card_number character varying(50),
    fee_payment_year integer,
    card_stamp_issued boolean DEFAULT false,
    fee_payment_date timestamp(6) without time zone,
    next_year_stamp_issued boolean DEFAULT false,
    status character varying(20) DEFAULT 'active'::character varying,
    active_until timestamp(6) without time zone
);


ALTER TABLE public.membership_details OWNER TO bozos;

--
-- Name: membership_periods; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.membership_periods (
    period_id integer NOT NULL,
    member_id integer,
    start_date timestamp(6) without time zone NOT NULL,
    end_date timestamp(6) without time zone,
    end_reason character varying(20),
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    is_test_data boolean DEFAULT false
);


ALTER TABLE public.membership_periods OWNER TO bozos;

--
-- Name: membership_periods_period_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.membership_periods_period_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.membership_periods_period_id_seq OWNER TO bozos;

--
-- Name: membership_periods_period_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.membership_periods_period_id_seq OWNED BY public.membership_periods.period_id;


--
-- Name: password_update_queue; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.password_update_queue (
    queue_id integer NOT NULL,
    member_id integer NOT NULL,
    card_number character varying(20) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    processed boolean DEFAULT false
);


ALTER TABLE public.password_update_queue OWNER TO bozos;

--
-- Name: password_update_queue_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.password_update_queue_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_update_queue_queue_id_seq OWNER TO bozos;

--
-- Name: password_update_queue_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.password_update_queue_queue_id_seq OWNED BY public.password_update_queue.queue_id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    token text NOT NULL,
    member_id integer NOT NULL,
    expires_at timestamp(6) without time zone NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO bozos;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.refresh_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_id_seq OWNER TO bozos;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.refresh_tokens_id_seq OWNED BY public.refresh_tokens.id;


--
-- Name: stamp_history; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.stamp_history (
    id integer NOT NULL,
    year integer NOT NULL,
    stamp_type character varying(50) NOT NULL,
    initial_count integer NOT NULL,
    issued_count integer NOT NULL,
    reset_date timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reset_by integer,
    notes text,
    stamp_year integer NOT NULL
);


ALTER TABLE public.stamp_history OWNER TO bozos;

--
-- Name: stamp_history_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.stamp_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stamp_history_id_seq OWNER TO bozos;

--
-- Name: stamp_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.stamp_history_id_seq OWNED BY public.stamp_history.id;


--
-- Name: stamp_inventory; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.stamp_inventory (
    id integer NOT NULL,
    stamp_type character varying(20) NOT NULL,
    initial_count integer DEFAULT 0 NOT NULL,
    issued_count integer DEFAULT 0,
    remaining integer,
    last_updated timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    stamp_year integer
);


ALTER TABLE public.stamp_inventory OWNER TO bozos;

--
-- Name: stamp_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.stamp_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stamp_inventory_id_seq OWNER TO bozos;

--
-- Name: stamp_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.stamp_inventory_id_seq OWNED BY public.stamp_inventory.id;


--
-- Name: system_admin; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.system_admin (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    display_name character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp(6) without time zone
);


ALTER TABLE public.system_admin OWNER TO bozos;

--
-- Name: system_admin_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.system_admin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_admin_id_seq OWNER TO bozos;

--
-- Name: system_admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.system_admin_id_seq OWNED BY public.system_admin.id;


--
-- Name: system_admins; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.system_admins (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    display_name character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login timestamp(6) without time zone
);


ALTER TABLE public.system_admins OWNER TO bozos;

--
-- Name: system_admins_id_seq; Type: SEQUENCE; Schema: public; Owner: bozos
--

CREATE SEQUENCE public.system_admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_admins_id_seq OWNER TO bozos;

--
-- Name: system_admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: bozos
--

ALTER SEQUENCE public.system_admins_id_seq OWNED BY public.system_admins.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: bozos
--

CREATE TABLE public.system_settings (
    id text DEFAULT 'default'::text NOT NULL,
    card_number_length integer DEFAULT 5,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    renewal_start_day integer DEFAULT 1,
    updated_by character varying(255) DEFAULT 'system'::character varying NOT NULL,
    renewal_start_month integer DEFAULT 11,
    time_zone text DEFAULT 'Europe/Zagreb'::text
);


ALTER TABLE public.system_settings OWNER TO bozos;

--
-- Name: Hours id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public."Hours" ALTER COLUMN id SET DEFAULT nextval('public."Hours_id_seq"'::regclass);


--
-- Name: activities activity_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.activities ALTER COLUMN activity_id SET DEFAULT nextval('public.activities_activity_id_seq'::regclass);


--
-- Name: activity_participants participation_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.activity_participants ALTER COLUMN participation_id SET DEFAULT nextval('public.activity_participants_participation_id_seq'::regclass);


--
-- Name: activity_types type_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.activity_types ALTER COLUMN type_id SET DEFAULT nextval('public.activity_types_type_id_seq'::regclass);


--
-- Name: admin_permissions permission_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.admin_permissions ALTER COLUMN permission_id SET DEFAULT nextval('public.admin_permissions_permission_id_seq'::regclass);


--
-- Name: annual_statistics stat_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.annual_statistics ALTER COLUMN stat_id SET DEFAULT nextval('public.annual_statistics_stat_id_seq'::regclass);


--
-- Name: audit_logs log_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN log_id SET DEFAULT nextval('public.audit_logs_log_id_seq'::regclass);


--
-- Name: card_numbers id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.card_numbers ALTER COLUMN id SET DEFAULT nextval('public.card_numbers_id_seq'::regclass);


--
-- Name: member_messages message_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.member_messages ALTER COLUMN message_id SET DEFAULT nextval('public.member_messages_message_id_seq'::regclass);


--
-- Name: members member_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.members ALTER COLUMN member_id SET DEFAULT nextval('public.members_member_id_seq'::regclass);


--
-- Name: membership_periods period_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.membership_periods ALTER COLUMN period_id SET DEFAULT nextval('public.membership_periods_period_id_seq'::regclass);


--
-- Name: password_update_queue queue_id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.password_update_queue ALTER COLUMN queue_id SET DEFAULT nextval('public.password_update_queue_queue_id_seq'::regclass);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('public.refresh_tokens_id_seq'::regclass);


--
-- Name: stamp_history id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.stamp_history ALTER COLUMN id SET DEFAULT nextval('public.stamp_history_id_seq'::regclass);


--
-- Name: stamp_inventory id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.stamp_inventory ALTER COLUMN id SET DEFAULT nextval('public.stamp_inventory_id_seq'::regclass);


--
-- Name: system_admin id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.system_admin ALTER COLUMN id SET DEFAULT nextval('public.system_admin_id_seq'::regclass);


--
-- Name: system_admins id; Type: DEFAULT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.system_admins ALTER COLUMN id SET DEFAULT nextval('public.system_admins_id_seq'::regclass);


--
-- Data for Name: Hours; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public."Hours" (id, activity_id, date, hours, verified, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c5f93db1-a7df-409f-9c6b-530af919981b	f30acd06f63c46a3be77f46d387ba1389d233f58b20aebad159fff9c66fda232	2025-05-14 14:21:27.002638+00	20250514142126_init	\N	\N	2025-05-14 14:21:26.89086+00	1
5b44ab6b-b421-4d7c-bd36-7ad4bde94225	fb489649e50fba2eca0da11aaa6976690645680b118042f27ca18c9c39ad7081	2025-05-20 08:21:52.376457+00	20250520082151_add_account_lockout	\N	\N	2025-05-20 08:21:52.369013+00	1
\.


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.activities (activity_id, title, description, start_date, end_date, location, difficulty_level, max_participants, created_by, created_at, activity_type_id) FROM stdin;
\.


--
-- Data for Name: activity_participants; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.activity_participants (participation_id, activity_id, member_id, hours_spent, role, notes, verified_by, verified_at, verified_by_member_id) FROM stdin;
\.


--
-- Data for Name: activity_types; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.activity_types (type_id, name, description, created_at) FROM stdin;
32	Test Type	Tip za testiranje	2025-05-20 05:18:20.068
33	hiking	Mountain hiking activities	2025-05-20 05:20:25.299466
34	climbing	Rock climbing activities	2025-05-20 05:20:25.299466
35	training	Training and educational activities	2025-05-20 05:20:25.299466
36	maintenance	Trail and equipment maintenance	2025-05-20 05:20:25.299466
37	social	Social gatherings and meetings	2025-05-20 05:20:25.299466
\.


--
-- Data for Name: admin_permissions; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.admin_permissions (permission_id, member_id, can_manage_end_reasons, granted_by, granted_at) FROM stdin;
\.


--
-- Data for Name: annual_statistics; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.annual_statistics (stat_id, member_id, year, total_hours, total_activities, membership_status, calculated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.audit_logs (log_id, action_type, performed_by, action_details, ip_address, created_at, status, affected_member) FROM stdin;
3	SYSTEM_SETTINGS_UPDATED	\N	{"settings":{"cardNumberLength":6,"renewalStartMonth":11,"renewalStartDay":1,"timeZone":"Europe/Zagreb"},"updated_by":17}	::1	2025-05-20 14:17:15.874462+00	success	\N
4	MEMBER_ACTIVATED	\N	System Admin activated member account for Anđa Anđelić (andja@andja.com)	::1	2025-05-20 17:58:08.038535+00	success	\N
5	MEMBER_ACTIVATED	\N	System Admin activated member account for Pero Perić (pero@pero.com)	::1	2025-05-20 18:16:30.325098+00	success	\N
6	LOGIN_SUCCESS	29	User pero@pero.com logged in	::1	2025-05-20 18:18:10.806693+00	success	\N
7	LOGIN_SUCCESS	29	User pero@pero.com logged in	::1	2025-05-20 18:22:07.527707+00	success	\N
8	LOGIN_SUCCESS	29	User pero@pero.com logged in	::1	2025-05-20 18:34:10.101375+00	success	\N
9	SYSTEM_ADMIN_LOGIN	\N	{"username":"System Administrator","admin_id":17}	::1	2025-05-20 20:45:09.774619+00	success	\N
10	SYSTEM_ADMIN_LOGIN	\N	{"username":"System Administrator","admin_id":17}	::1	2025-05-20 20:47:35.09042+00	success	\N
11	LOGIN_SUCCESS	29	User pero@pero.com logged in	::1	2025-05-20 21:01:48.576501+00	success	\N
\.


--
-- Data for Name: card_numbers; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.card_numbers (id, card_number, status, created_at, assigned_at, member_id) FROM stdin;
\.


--
-- Data for Name: member_messages; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.member_messages (message_id, member_id, message_text, created_at, read_at, status, sender_id, recipient_id, recipient_type, sender_type) FROM stdin;
\.


--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.members (status, date_of_birth, oib, cell_phone, city, street_address, email, first_name, last_name, member_id, password_hash, role, last_login, full_name, life_status, tshirt_size, shell_jacket_size, total_hours, gender, registration_completed, profile_image_path, profile_image_updated_at, membership_type, created_at, updated_at, nickname, failed_login_attempts, last_failed_login, locked_until) FROM stdin;
pending	1970-11-10	12233344445	098122334	Matin Grad	Matina 8	mate@mate.com	Mate	Matić	28	\N	member	\N	Mate Matić	child/pupil/student	L	L	0.00	male	f	\N	\N	regular	2025-05-20 05:22:16.499+00	2025-05-20 05:22:16.499+00	\N	0	\N	\N
pending	1986-07-04	33344445555	0993334444	Super Grad	Super ulica 5	super@super.com	Super	User	30	\N	member	\N	Super User	pensioner	XXXL	XXXL	0.00	female	f	\N	\N	regular	2025-05-20 12:14:43.62+00	2025-05-20 12:14:43.62+00	\N	0	\N	\N
pending	1999-10-11	55555666666	0985555566	Admigrad	Adminova 5	admin@admin.com	Admin	User	31	\N	member	\N	Admin User	employed/unemployed	M	M	0.00	male	f	\N	\N	regular	2025-05-20 12:19:00.208+00	2025-05-20 12:19:00.208+00	\N	0	\N	\N
pending	1983-08-17	77777774444	0987777774	Juringrad	Jurina 10	jure@jure.com	Jure	Jurić	32	\N	member	\N	Jure Jurić	child/pupil/student	L	L	0.00	male	f	\N	\N	regular	2025-05-20 12:22:00.228+00	2025-05-20 12:22:00.228+00	\N	0	\N	\N
registered	2012-12-12	55555444432	0985555555	Anđelgrad	Anđina 3	andja@andja.com	Anđa	Anđelić	33	$2b$10$A0QG5H4wLrRYRe8YzJ7Mee2DYf8wD7mxTcfUTUN0SRe9jkA9TbT2u	member	\N	Anđa Anđelić	child/pupil/student	S	S	0.00	female	t	\N	\N	regular	2025-05-20 14:09:27.182+00	2025-05-20 14:09:27.182+00	\N	0	\N	\N
registered	1980-10-11	22223333444	0982222333	Perin Grad	Perina 9	pero@pero.com	Pero	Perić	29	$2b$10$SvLHZA2lG7XeIKKMGgO.GeSR.kTRHcmR0Wf0TPys008LokO0K0qiu	superuser	2025-05-20 21:01:48.568	Pero Perić	employed/unemployed	M	M	0.00	male	t	\N	\N	regular	2025-05-20 12:01:19.839+00	2025-05-20 12:01:19.839+00	\N	0	\N	\N
\.


--
-- Data for Name: members_backup; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.members_backup (id, name, status, date_of_birth, oib, cell_phone, city, street_address, email, first_name, last_name, member_id) FROM stdin;
\.


--
-- Data for Name: membership_details; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.membership_details (member_id, card_number, fee_payment_year, card_stamp_issued, fee_payment_date, next_year_stamp_issued, status, active_until) FROM stdin;
29	\N	2025	f	2025-05-20 18:16:30.31	f	active	\N
\.


--
-- Data for Name: membership_periods; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.membership_periods (period_id, member_id, start_date, end_date, end_reason, created_at, is_test_data) FROM stdin;
\.


--
-- Data for Name: password_update_queue; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.password_update_queue (queue_id, member_id, card_number, created_at, processed) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.refresh_tokens (id, token, member_id, expires_at, created_at) FROM stdin;
1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjksInJvbGUiOiJzdXBlcnVzZXIiLCJpYXQiOjE3NDc4MDkwMjcsImV4cCI6MTc0ODQxMzgyN30._lLsn62epp9fb2mMp0QK8oj3YP9F3lPx-_FzsPWh_jQ	29	2025-05-28 06:30:27.86	2025-05-20 18:18:10.792
\.


--
-- Data for Name: stamp_history; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.stamp_history (id, year, stamp_type, initial_count, issued_count, reset_date, reset_by, notes, stamp_year) FROM stdin;
\.


--
-- Data for Name: stamp_inventory; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.stamp_inventory (id, stamp_type, initial_count, issued_count, remaining, last_updated, stamp_year) FROM stdin;
19	employed	0	0	\N	2025-05-20 05:20:25.299466	2025
20	student	0	0	\N	2025-05-20 05:20:25.299466	2025
21	pensioner	0	0	\N	2025-05-20 05:20:25.299466	2025
\.


--
-- Data for Name: system_admin; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.system_admin (id, username, email, display_name, password_hash, created_at, updated_at, last_login) FROM stdin;
17	System Administrator	admin@promina-drnis.hr	System Administrator	$2b$10$X7L5.RWzqedF/wL1Q.UEDePU0u7IxZOEgSYuUA7Z0wCTk2bfk83De	2025-05-19 20:21:59.579	2025-05-19 20:21:59.579	2025-05-20 20:47:35.078
\.


--
-- Data for Name: system_admins; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.system_admins (id, username, email, display_name, password_hash, created_at, updated_at, last_login) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: bozos
--

COPY public.system_settings (id, card_number_length, updated_at, renewal_start_day, updated_by, renewal_start_month, time_zone) FROM stdin;
default	6	2025-05-20 14:17:15.861	1	system	11	Europe/Zagreb
\.


--
-- Name: Hours_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public."Hours_id_seq"', 1, false);


--
-- Name: activities_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.activities_activity_id_seq', 6, true);


--
-- Name: activity_participants_participation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.activity_participants_participation_id_seq', 1, false);


--
-- Name: activity_types_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.activity_types_type_id_seq', 137, true);


--
-- Name: admin_permissions_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.admin_permissions_permission_id_seq', 1, true);


--
-- Name: annual_statistics_stat_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.annual_statistics_stat_id_seq', 1, false);


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.audit_logs_log_id_seq', 11, true);


--
-- Name: card_numbers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.card_numbers_id_seq', 1, false);


--
-- Name: member_messages_message_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.member_messages_message_id_seq', 27, true);


--
-- Name: members_member_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.members_member_id_seq', 33, true);


--
-- Name: membership_periods_period_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.membership_periods_period_id_seq', 1, false);


--
-- Name: password_update_queue_queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.password_update_queue_queue_id_seq', 1, false);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 1, true);


--
-- Name: stamp_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.stamp_history_id_seq', 1, false);


--
-- Name: stamp_inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.stamp_inventory_id_seq', 81, true);


--
-- Name: system_admin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.system_admin_id_seq', 25, true);


--
-- Name: system_admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: bozos
--

SELECT pg_catalog.setval('public.system_admins_id_seq', 1, true);


--
-- Name: Hours Hours_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public."Hours"
    ADD CONSTRAINT "Hours_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (activity_id);


--
-- Name: activity_participants activity_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.activity_participants
    ADD CONSTRAINT activity_participants_pkey PRIMARY KEY (participation_id);


--
-- Name: activity_types activity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.activity_types
    ADD CONSTRAINT activity_types_pkey PRIMARY KEY (type_id);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (permission_id);


--
-- Name: annual_statistics annual_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.annual_statistics
    ADD CONSTRAINT annual_statistics_pkey PRIMARY KEY (stat_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: card_numbers card_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.card_numbers
    ADD CONSTRAINT card_numbers_pkey PRIMARY KEY (id);


--
-- Name: member_messages member_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.member_messages
    ADD CONSTRAINT member_messages_pkey PRIMARY KEY (message_id);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (member_id);


--
-- Name: membership_details membership_details_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.membership_details
    ADD CONSTRAINT membership_details_pkey PRIMARY KEY (member_id);


--
-- Name: membership_periods membership_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.membership_periods
    ADD CONSTRAINT membership_periods_pkey PRIMARY KEY (period_id);


--
-- Name: password_update_queue password_update_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.password_update_queue
    ADD CONSTRAINT password_update_queue_pkey PRIMARY KEY (queue_id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: stamp_history stamp_history_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.stamp_history
    ADD CONSTRAINT stamp_history_pkey PRIMARY KEY (id);


--
-- Name: stamp_inventory stamp_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.stamp_inventory
    ADD CONSTRAINT stamp_inventory_pkey PRIMARY KEY (id);


--
-- Name: system_admin system_admin_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.system_admin
    ADD CONSTRAINT system_admin_pkey PRIMARY KEY (id);


--
-- Name: system_admins system_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.system_admins
    ADD CONSTRAINT system_admins_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: activity_types_name_key; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX activity_types_name_key ON public.activity_types USING btree (name);


--
-- Name: admin_permissions_member_id_key; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX admin_permissions_member_id_key ON public.admin_permissions USING btree (member_id);


--
-- Name: card_number_unique; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX card_number_unique ON public.card_numbers USING btree (card_number);


--
-- Name: idx_activities_date; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_activities_date ON public.activities USING btree (start_date);


--
-- Name: idx_activities_start_date; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_activities_start_date ON public.activities USING btree (start_date);


--
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_activities_type ON public.activities USING btree (activity_type_id);


--
-- Name: idx_activity_participants_activity; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_activity_participants_activity ON public.activity_participants USING btree (activity_id);


--
-- Name: idx_activity_participants_hours; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_activity_participants_hours ON public.activity_participants USING btree (hours_spent);


--
-- Name: idx_activity_participants_member; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_activity_participants_member ON public.activity_participants USING btree (member_id);


--
-- Name: idx_admin_permissions_granted_by; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_admin_permissions_granted_by ON public.admin_permissions USING btree (granted_by);


--
-- Name: idx_admin_permissions_member; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_admin_permissions_member ON public.admin_permissions USING btree (member_id);


--
-- Name: idx_annual_statistics_member_year; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_annual_statistics_member_year ON public.annual_statistics USING btree (member_id, year);


--
-- Name: idx_card_numbers_member_id; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_card_numbers_member_id ON public.card_numbers USING btree (member_id);


--
-- Name: idx_card_numbers_status; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_card_numbers_status ON public.card_numbers USING btree (status);


--
-- Name: idx_members_full_name; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_members_full_name ON public.members USING btree (full_name);


--
-- Name: idx_members_oib; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_members_oib ON public.members USING btree (oib);


--
-- Name: idx_members_total_hours; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_members_total_hours ON public.members USING btree (total_hours);


--
-- Name: idx_membership_periods_test_data; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_membership_periods_test_data ON public.membership_periods USING btree (is_test_data);


--
-- Name: idx_refresh_tokens_member_id; Type: INDEX; Schema: public; Owner: bozos
--

CREATE INDEX idx_refresh_tokens_member_id ON public.refresh_tokens USING btree (member_id);


--
-- Name: members_oib_key; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX members_oib_key ON public.members USING btree (oib);


--
-- Name: membership_details_card_number_key; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX membership_details_card_number_key ON public.membership_details USING btree (card_number);


--
-- Name: refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);


--
-- Name: stamp_type_year_unique; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX stamp_type_year_unique ON public.stamp_inventory USING btree (stamp_type, stamp_year);


--
-- Name: system_admin_email_key; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX system_admin_email_key ON public.system_admin USING btree (email);


--
-- Name: system_admin_username_key; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX system_admin_username_key ON public.system_admin USING btree (username);


--
-- Name: system_admins_email_key; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX system_admins_email_key ON public.system_admins USING btree (email);


--
-- Name: system_admins_username_key; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX system_admins_username_key ON public.system_admins USING btree (username);


--
-- Name: unique_member_year; Type: INDEX; Schema: public; Owner: bozos
--

CREATE UNIQUE INDEX unique_member_year ON public.annual_statistics USING btree (member_id, year);


--
-- Name: membership_details trigger_card_number_change; Type: TRIGGER; Schema: public; Owner: bozos
--

CREATE TRIGGER trigger_card_number_change AFTER INSERT OR UPDATE ON public.membership_details FOR EACH ROW EXECUTE FUNCTION public.notify_card_number_change();


--
-- Name: activities activities_activity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_activity_type_id_fkey FOREIGN KEY (activity_type_id) REFERENCES public.activity_types(type_id);


--
-- Name: activity_participants activity_participants_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.activity_participants
    ADD CONSTRAINT activity_participants_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(activity_id);


--
-- Name: admin_permissions admin_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.members(member_id);


--
-- Name: admin_permissions admin_permissions_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id);


--
-- Name: annual_statistics annual_statistics_member_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.annual_statistics
    ADD CONSTRAINT annual_statistics_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_affected_member_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_affected_member_fkey FOREIGN KEY (affected_member) REFERENCES public.members(member_id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.members(member_id) ON DELETE SET NULL;


--
-- Name: card_numbers member_fk; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.card_numbers
    ADD CONSTRAINT member_fk FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE SET NULL;


--
-- Name: member_messages member_messages_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.member_messages
    ADD CONSTRAINT member_messages_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE CASCADE;


--
-- Name: membership_details membership_details_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.membership_details
    ADD CONSTRAINT membership_details_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE CASCADE;


--
-- Name: membership_periods membership_periods_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.membership_periods
    ADD CONSTRAINT membership_periods_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE CASCADE;


--
-- Name: password_update_queue password_update_queue_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.password_update_queue
    ADD CONSTRAINT password_update_queue_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id);


--
-- Name: refresh_tokens refresh_tokens_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE CASCADE;


--
-- Name: stamp_history stamp_history_reset_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bozos
--

ALTER TABLE ONLY public.stamp_history
    ADD CONSTRAINT stamp_history_reset_by_fkey FOREIGN KEY (reset_by) REFERENCES public.members(member_id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: bozos
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

