-- =========================================================================
-- LANGKAH 03: INISIALISASI DATABASE ENGLISH_AI (UPDATED)
-- =========================================================================

\c english_ai;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Buat Tabel: Users
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(100) NOT NULL,
    "level" varchar(20) DEFAULT 'beginner'::character varying NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    email varchar(255) NULL,
    google_sub varchar(255) NULL,
    avatar_url text NULL,
    is_active bool DEFAULT true NULL,
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_google_sub_key UNIQUE (google_sub),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 4. Buat Tabel: Vocabularies (KOLOM BARU SUDAH DIMASUKKAN DI SINI)
CREATE TABLE IF NOT EXISTS public.vocabularies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vocab_word varchar(100) NOT NULL,
    part_of_speech varchar(20) NOT NULL,
    "level" varchar(10) NOT NULL,
    definition text NULL,
    pronunciation varchar(100) NULL, -- Kolom Baru
    meaning_id text NULL,            -- Kolom Baru
    created_at timestamptz DEFAULT now() NULL,
    CONSTRAINT chk_part_of_speech CHECK (((part_of_speech)::text = ANY ((ARRAY['NOUN'::character varying, 'VERB'::character varying, 'ADJECTIVE'::character varying, 'ADVERB'::character varying, 'PRONOUN'::character varying, 'PREPOSITION'::character varying])::text[]))),
    CONSTRAINT vocabularies_pkey PRIMARY KEY (id),
    CONSTRAINT vocabularies_vocab_word_key UNIQUE (vocab_word)
);
CREATE INDEX IF NOT EXISTS idx_vocabularies_vocab_word ON public.vocabularies USING btree (vocab_word);

-- NEW: Buat Tabel: Word Details (1-to-1 dengan Vocabularies)
CREATE TABLE IF NOT EXISTS public.word_details (
    id              uuid DEFAULT gen_random_uuid() NOT NULL,
    vocabulary_id   uuid NOT NULL,
    pronunciation   varchar(100) NULL,
    meaning_id      text NULL,
    created_at      timestamptz DEFAULT now() NOT NULL,
    updated_at      timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT word_details_pkey PRIMARY KEY (id),
    CONSTRAINT word_details_vocab_fkey FOREIGN KEY (vocabulary_id)
        REFERENCES public.vocabularies(id) ON DELETE CASCADE,
    CONSTRAINT word_details_vocab_unique UNIQUE (vocabulary_id)
);
CREATE INDEX IF NOT EXISTS idx_word_details_vocab_id ON public.word_details USING btree (vocabulary_id);

-- 5. Buat Tabel: Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NULL,
    topic varchar(100) DEFAULT 'Daily Life'::character varying NOT NULL,
    "level" varchar(20) DEFAULT 'beginner'::character varying NOT NULL,
    started_at timestamp DEFAULT now() NOT NULL,
    ended_at timestamp NULL,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions USING btree (user_id);

-- 6. Buat Tabel: User Vocabularies
CREATE TABLE IF NOT EXISTS public.user_vocabularies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    vocabulary_id uuid NOT NULL,
    session_id uuid NOT NULL,
    is_mastered bool DEFAULT false NULL,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
    CONSTRAINT unique_user_session_vocab UNIQUE (user_id, session_id, vocabulary_id),
    CONSTRAINT user_vocabularies_pkey PRIMARY KEY (id),
    CONSTRAINT fk_vocabulary FOREIGN KEY (vocabulary_id) REFERENCES public.vocabularies(id) ON DELETE CASCADE
);

-- 7. Buat Tabel: Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NULL,
    "role" varchar(20) NOT NULL,
    message text NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    topic text NULL,
    vocabulary_id uuid NULL,
    CONSTRAINT conversations_pkey PRIMARY KEY (id),
    CONSTRAINT conversations_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[]))),
    CONSTRAINT conversations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversations_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversations_vocab FOREIGN KEY (vocabulary_id) REFERENCES public.vocabularies(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON public.conversations USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_vocab ON public.conversations USING btree (vocabulary_id);

-- 8. Buat Tabel: Corrections
CREATE TABLE IF NOT EXISTS public.corrections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NULL,
    wrong_text text NOT NULL,
    correct_text text NOT NULL,
    reason text NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    user_id uuid NOT NULL,
    topic text NULL,
    vocabulary_id uuid NULL,
    CONSTRAINT corrections_pkey PRIMARY KEY (id),
    CONSTRAINT corrections_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_corrections_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_corrections_vocab FOREIGN KEY (vocabulary_id) REFERENCES public.vocabularies(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_corrections_session ON public.corrections USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_corrections_user ON public.corrections USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_corrections_vocab ON public.corrections USING btree (vocabulary_id);