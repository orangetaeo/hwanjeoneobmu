--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

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
-- Name: assets; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.assets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    currency text NOT NULL,
    balance numeric(18,8) DEFAULT '0'::numeric,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.assets OWNER TO neondb_owner;

--
-- Name: exchange_rate_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exchange_rate_history (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    from_currency text NOT NULL,
    to_currency text NOT NULL,
    denomination text,
    gold_shop_rate numeric(18,8),
    my_buy_rate numeric(18,8),
    my_sell_rate numeric(18,8),
    is_active text DEFAULT 'true'::text,
    memo text,
    change_percentage numeric(5,2),
    record_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.exchange_rate_history OWNER TO neondb_owner;

--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exchange_rates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    from_currency text NOT NULL,
    to_currency text NOT NULL,
    denomination text,
    gold_shop_rate numeric(18,8),
    my_buy_rate numeric(18,8),
    my_sell_rate numeric(18,8),
    is_active text DEFAULT 'true'::text,
    memo text,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.exchange_rates OWNER TO neondb_owner;

--
-- Name: rates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rates (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    from_currency text NOT NULL,
    to_currency text NOT NULL,
    rate numeric(18,8) NOT NULL,
    source text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rates OWNER TO neondb_owner;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.transactions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    type text NOT NULL,
    from_asset_type text,
    from_asset_id character varying,
    from_asset_name text NOT NULL,
    to_asset_type text,
    to_asset_id character varying,
    to_asset_name text NOT NULL,
    from_amount numeric(18,8) NOT NULL,
    to_amount numeric(18,8) NOT NULL,
    rate numeric(18,8) NOT NULL,
    fees numeric(18,8) DEFAULT '0'::numeric,
    profit numeric(18,8) DEFAULT '0'::numeric,
    market_price numeric(18,8),
    custom_price numeric(18,8),
    memo text,
    metadata jsonb,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text,
    parent_transaction_id character varying,
    is_main_transaction text DEFAULT 'true'::text
);


ALTER TABLE public.transactions OWNER TO neondb_owner;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying NOT NULL,
    bithumb_fee_rate numeric(5,4) DEFAULT 0.0004,
    bithumb_grade text DEFAULT 'white'::text,
    default_fee_rates jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_settings OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password text NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: exchange_rate_history exchange_rate_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exchange_rate_history
    ADD CONSTRAINT exchange_rate_history_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: rates rates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rates
    ADD CONSTRAINT rates_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

