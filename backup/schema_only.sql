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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: authenticate_member(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.authenticate_member(p_full_name character varying, p_password character varying) RETURNS TABLE(member_id integer, full_name character varying, role character varying, last_login timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
   RETURN QUERY
   UPDATE members
   SET last_login = CURRENT_TIMESTAMP
   WHERE full_name = p_full_name
   AND password_hash = p_password
   AND status = 'active'
   RETURNING member_id, full_name, role, last_login;
END;
$$;


--
-- Name: calculate_annual_statistics(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_annual_statistics(p_member_id integer, p_year integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_hours NUMERIC(7,2);
    v_total_activities INTEGER;
    v_membership_status VARCHAR(20);
BEGIN
    -- Calculate total hours and activities
    SELECT 
        COALESCE(SUM(ap.hours_spent), 0),
        COUNT(DISTINCT ap.activity_id)
    INTO 
        v_total_hours,
        v_total_activities
    FROM activity_participants ap
    JOIN activities a ON ap.activity_id = a.activity_id
    WHERE ap.member_id = p_member_id
    AND EXTRACT(YEAR FROM a.start_date) = p_year;

    -- Determine membership status based on hours (Ôëą20 hours = active)
    v_membership_status := CASE 
        WHEN v_total_hours >= 20 THEN 'active'
        ELSE 'passive'
    END;

    -- Insert or update annual statistics
    INSERT INTO annual_statistics (
        member_id,
        year,
        total_hours,
        total_activities,
        membership_status,
        calculated_at
    ) VALUES (
        p_member_id,
        p_year,
        v_total_hours,
        v_total_activities,
        v_membership_status,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (member_id, year) DO UPDATE SET
        total_hours = EXCLUDED.total_hours,
        total_activities = EXCLUDED.total_activities,
        membership_status = EXCLUDED.membership_status,
        calculated_at = CURRENT_TIMESTAMP;

    -- Update member's current status based on current year
    IF p_year = EXTRACT(YEAR FROM CURRENT_DATE) THEN
        UPDATE members
        SET membership_type = v_membership_status
        WHERE member_id = p_member_id;
    END IF;
END;
$$;


--
-- Name: update_member_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_member_statistics() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Calculate statistics for the year of the activity
    PERFORM calculate_annual_statistics(
        NEW.member_id,
        EXTRACT(YEAR FROM (
            SELECT start_date 
            FROM activities 
            WHERE activity_id = NEW.activity_id
        ))::INTEGER
    );
    RETURN NEW;
END;
$$;


--
-- Name: update_member_total_hours(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_member_total_hours() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE members 
        SET total_hours = COALESCE(total_hours, 0) + NEW.hours_spent
        WHERE member_id = NEW.member_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE members 
        SET total_hours = COALESCE(total_hours, 0) - OLD.hours_spent
        WHERE member_id = OLD.member_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE members 
        SET total_hours = COALESCE(total_hours, 0) - OLD.hours_spent + NEW.hours_spent
        WHERE member_id = NEW.member_id;
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Hours" (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    date timestamp with time zone NOT NULL,
    hours integer NOT NULL,
    verified boolean DEFAULT false,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    member_id integer
);


--
-- Name: Hours_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Hours_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Hours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Hours_id_seq" OWNED BY public."Hours".id;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activities (
    activity_id integer NOT NULL,
    title character varying(100) NOT NULL,
    description text,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone NOT NULL,
    location character varying(100),
    difficulty_level character varying(20),
    max_participants integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    activity_type_id integer
);


--
-- Name: activities_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activities_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activities_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activities_activity_id_seq OWNED BY public.activities.activity_id;


--
-- Name: activity_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_participants (
    participation_id integer NOT NULL,
    activity_id integer,
    member_id integer,
    hours_spent numeric(5,2) NOT NULL,
    role character varying(50),
    notes text,
    verified_by integer,
    verified_at timestamp without time zone,
    verified_by_member_id integer
);


--
-- Name: activity_participants_participation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_participants_participation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_participants_participation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_participants_participation_id_seq OWNED BY public.activity_participants.participation_id;


--
-- Name: activity_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_types (
    type_id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: activity_types_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_types_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_types_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_types_type_id_seq OWNED BY public.activity_types.type_id;


--
-- Name: annual_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.annual_statistics (
    stat_id integer NOT NULL,
    member_id integer,
    year integer NOT NULL,
    total_hours numeric(7,2) NOT NULL,
    total_activities integer NOT NULL,
    membership_status character varying(20) NOT NULL,
    calculated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: annual_statistics_stat_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.annual_statistics_stat_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: annual_statistics_stat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.annual_statistics_stat_id_seq OWNED BY public.annual_statistics.stat_id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    log_id integer NOT NULL,
    action_type character varying(50) NOT NULL,
    performed_by integer,
    action_details text NOT NULL,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20),
    affected_member integer
);


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_log_id_seq OWNED BY public.audit_logs.log_id;


--
-- Name: member_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_messages (
    message_id integer NOT NULL,
    member_id integer,
    message_text text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp without time zone,
    status character varying(20) DEFAULT 'unread'::character varying,
    CONSTRAINT status_values CHECK (((status)::text = ANY (ARRAY[('unread'::character varying)::text, ('read'::character varying)::text, ('archived'::character varying)::text])))
);


--
-- Name: member_messages_message_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_messages_message_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: member_messages_message_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_messages_message_id_seq OWNED BY public.member_messages.message_id;


--
-- Name: members; Type: TABLE; Schema: public; Owner: -
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
    last_login timestamp without time zone,
    full_name character varying(100) GENERATED ALWAYS AS ((((first_name)::text || ' '::text) || (last_name)::text)) STORED NOT NULL,
    life_status character varying(25),
    tshirt_size character varying(4),
    shell_jacket_size character varying(4),
    total_hours numeric(10,2) DEFAULT 0,
    gender character varying(6),
    registration_completed boolean DEFAULT false,
    profile_image_path character varying(255),
    profile_image_updated_at timestamp without time zone,
    membership_type character varying(20) DEFAULT 'regular'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT life_status_check CHECK (((life_status)::text = ANY (ARRAY[('employed/unemployed'::character varying)::text, ('child/pupil/student'::character varying)::text, ('pensioner'::character varying)::text]))),
    CONSTRAINT members_gender_check CHECK (((gender)::text = ANY (ARRAY[('male'::character varying)::text, ('female'::character varying)::text]))),
    CONSTRAINT members_membership_type_check CHECK (((membership_type)::text = ANY (ARRAY[('regular'::character varying)::text, ('supporting'::character varying)::text, ('honorary'::character varying)::text]))),
    CONSTRAINT members_role_check CHECK (((role)::text = ANY (ARRAY[('member'::character varying)::text, ('admin'::character varying)::text, ('superuser'::character varying)::text]))),
    CONSTRAINT members_shell_jacket_size_check CHECK (((shell_jacket_size)::text = ANY (ARRAY[('XS'::character varying)::text, ('S'::character varying)::text, ('M'::character varying)::text, ('L'::character varying)::text, ('XL'::character varying)::text, ('XXL'::character varying)::text, ('XXXL'::character varying)::text]))),
    CONSTRAINT members_tshirt_size_check CHECK (((tshirt_size)::text = ANY (ARRAY[('XS'::character varying)::text, ('S'::character varying)::text, ('M'::character varying)::text, ('L'::character varying)::text, ('XL'::character varying)::text, ('XXL'::character varying)::text, ('XXXL'::character varying)::text]))),
    CONSTRAINT oib_check CHECK (((oib)::text ~ '^[0-9]{11}$'::text))
);


--
-- Name: members_backup; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: members_member_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.members_member_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: members_member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.members_member_id_seq OWNED BY public.members.member_id;


--
-- Name: membership_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_details (
    member_id integer NOT NULL,
    card_number character varying(50),
    fee_payment_year integer,
    card_stamp_issued boolean DEFAULT false,
    fee_payment_date timestamp without time zone
);


--
-- Name: membership_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_periods (
    period_id integer NOT NULL,
    member_id integer,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    end_reason character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT membership_periods_end_reason_check CHECK (((end_reason)::text = ANY (ARRAY[('withdrawal'::character varying)::text, ('non_payment'::character varying)::text, ('expulsion'::character varying)::text, ('death'::character varying)::text])))
);


--
-- Name: membership_periods_period_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.membership_periods_period_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: membership_periods_period_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.membership_periods_period_id_seq OWNED BY public.membership_periods.period_id;


--
-- Name: stamp_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stamp_inventory (
    id integer NOT NULL,
    stamp_type character varying(20) NOT NULL,
    initial_count integer DEFAULT 0 NOT NULL,
    issued_count integer DEFAULT 0,
    remaining integer GENERATED ALWAYS AS ((initial_count - issued_count)) STORED,
    last_updated timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT stamp_type_check CHECK (((stamp_type)::text = ANY ((ARRAY['employed'::character varying, 'student'::character varying, 'pensioner'::character varying])::text[])))
);


--
-- Name: stamp_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stamp_inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stamp_inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stamp_inventory_id_seq OWNED BY public.stamp_inventory.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id text DEFAULT 'default'::text NOT NULL,
    card_number_length integer DEFAULT 5,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    renewal_start_day integer DEFAULT 1,
    updated_by character varying(255) DEFAULT 'system'::character varying NOT NULL
);


--
-- Name: Hours id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Hours" ALTER COLUMN id SET DEFAULT nextval('public."Hours_id_seq"'::regclass);


--
-- Name: activities activity_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities ALTER COLUMN activity_id SET DEFAULT nextval('public.activities_activity_id_seq'::regclass);


--
-- Name: activity_participants participation_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_participants ALTER COLUMN participation_id SET DEFAULT nextval('public.activity_participants_participation_id_seq'::regclass);


--
-- Name: activity_types type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_types ALTER COLUMN type_id SET DEFAULT nextval('public.activity_types_type_id_seq'::regclass);


--
-- Name: annual_statistics stat_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_statistics ALTER COLUMN stat_id SET DEFAULT nextval('public.annual_statistics_stat_id_seq'::regclass);


--
-- Name: audit_logs log_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN log_id SET DEFAULT nextval('public.audit_logs_log_id_seq'::regclass);


--
-- Name: member_messages message_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_messages ALTER COLUMN message_id SET DEFAULT nextval('public.member_messages_message_id_seq'::regclass);


--
-- Name: members member_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members ALTER COLUMN member_id SET DEFAULT nextval('public.members_member_id_seq'::regclass);


--
-- Name: membership_periods period_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_periods ALTER COLUMN period_id SET DEFAULT nextval('public.membership_periods_period_id_seq'::regclass);


--
-- Name: stamp_inventory id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stamp_inventory ALTER COLUMN id SET DEFAULT nextval('public.stamp_inventory_id_seq'::regclass);


--
-- Name: Hours Hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Hours"
    ADD CONSTRAINT "Hours_pkey" PRIMARY KEY (id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (activity_id);


--
-- Name: activity_participants activity_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_participants
    ADD CONSTRAINT activity_participants_pkey PRIMARY KEY (participation_id);


--
-- Name: activity_types activity_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_types
    ADD CONSTRAINT activity_types_name_key UNIQUE (name);


--
-- Name: activity_types activity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_types
    ADD CONSTRAINT activity_types_pkey PRIMARY KEY (type_id);


--
-- Name: annual_statistics annual_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_statistics
    ADD CONSTRAINT annual_statistics_pkey PRIMARY KEY (stat_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (log_id);


--
-- Name: member_messages member_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_messages
    ADD CONSTRAINT member_messages_pkey PRIMARY KEY (message_id);


--
-- Name: members members_oib_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_oib_key UNIQUE (oib);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (member_id);


--
-- Name: membership_details membership_details_card_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_details
    ADD CONSTRAINT membership_details_card_number_key UNIQUE (card_number);


--
-- Name: membership_details membership_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_details
    ADD CONSTRAINT membership_details_pkey PRIMARY KEY (member_id);


--
-- Name: membership_periods membership_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_periods
    ADD CONSTRAINT membership_periods_pkey PRIMARY KEY (period_id);


--
-- Name: stamp_inventory stamp_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stamp_inventory
    ADD CONSTRAINT stamp_inventory_pkey PRIMARY KEY (id);


--
-- Name: stamp_inventory stamp_type_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stamp_inventory
    ADD CONSTRAINT stamp_type_unique UNIQUE (stamp_type);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: annual_statistics unique_member_year; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_statistics
    ADD CONSTRAINT unique_member_year UNIQUE (member_id, year);


--
-- Name: idx_activities_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_date ON public.activities USING btree (start_date);


--
-- Name: idx_activities_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activities_type ON public.activities USING btree (activity_type_id);


--
-- Name: idx_activity_participants_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_participants_activity ON public.activity_participants USING btree (activity_id);


--
-- Name: idx_activity_participants_hours; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_participants_hours ON public.activity_participants USING btree (hours_spent);


--
-- Name: idx_activity_participants_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_participants_member ON public.activity_participants USING btree (member_id);


--
-- Name: idx_annual_statistics_member_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_annual_statistics_member_year ON public.annual_statistics USING btree (member_id, year);


--
-- Name: idx_members_full_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_full_name ON public.members USING btree (full_name);


--
-- Name: idx_members_oib; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_oib ON public.members USING btree (oib);


--
-- Name: idx_members_total_hours; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_total_hours ON public.members USING btree (total_hours);


--
-- Name: activity_participants activity_hours_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER activity_hours_update AFTER INSERT OR DELETE OR UPDATE ON public.activity_participants FOR EACH ROW EXECUTE FUNCTION public.update_member_total_hours();


--
-- Name: activity_participants after_activity_participation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER after_activity_participation AFTER INSERT OR UPDATE ON public.activity_participants FOR EACH ROW EXECUTE FUNCTION public.update_member_statistics();


--
-- Name: Hours Hours_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Hours"
    ADD CONSTRAINT "Hours_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.members(member_id);


--
-- Name: activities activities_activity_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_activity_type_id_fkey FOREIGN KEY (activity_type_id) REFERENCES public.activity_types(type_id);


--
-- Name: activity_participants activity_participants_activity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_participants
    ADD CONSTRAINT activity_participants_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(activity_id);


--
-- Name: annual_statistics annual_statistics_member_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_statistics
    ADD CONSTRAINT annual_statistics_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_affected_member_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_affected_member_fkey FOREIGN KEY (affected_member) REFERENCES public.members(member_id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.members(member_id) ON DELETE SET NULL;


--
-- Name: member_messages member_messages_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_messages
    ADD CONSTRAINT member_messages_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE CASCADE;


--
-- Name: membership_details membership_details_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_details
    ADD CONSTRAINT membership_details_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE CASCADE;


--
-- Name: membership_periods membership_periods_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_periods
    ADD CONSTRAINT membership_periods_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(member_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

