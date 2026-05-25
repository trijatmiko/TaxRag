-- =========================================================================
-- LANGKAH 02: INISIALISASI DATABASE RAG_TAX
-- =========================================================================

-- 1. Pindah koneksi secara paksa ke database rag_tax
\c rag_tax;

-- 2. Aktifkan ekstensi yang diperlukan di database rag_tax
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Buat fungsi helper untuk trigger updated_at (WAJIB dibuat di awal)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Buat Tabel: Ingestion Audit Log
CREATE TABLE IF NOT EXISTS public.ingestion_audit_log (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	chunk_fingerprint varchar(32) NOT NULL,
	doc_number varchar(100) NULL,
	doc_year varchar(10) NULL,
	pasal_number varchar(100) NULL,
	pipeline_version varchar(20) DEFAULT 'V7'::character varying NULL,
	ocr_score float8 NULL,
	completeness_score float8 NULL,
	metadata_score float8 NULL,
	final_quality_score float8 NULL,
	passed bool NULL,
	flagged_reason text NULL,
	reconstruction_similarity float8 NULL,
	tested_at timestamp DEFAULT now() NULL,
	neighbor_flags jsonb NULL,
	doc_type text NULL,
	embedding_model text NULL,
	embedding_pipeline_version text NULL,
	CONSTRAINT ingestion_audit_log_chunk_fingerprint_key UNIQUE (chunk_fingerprint),
	CONSTRAINT ingestion_audit_log_pkey PRIMARY KEY (id),
	CONSTRAINT uq_audit_fingerprint UNIQUE (chunk_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_audit_chunk_fingerprint ON public.ingestion_audit_log USING btree (chunk_fingerprint);
CREATE INDEX IF NOT EXISTS idx_audit_doc ON public.ingestion_audit_log USING btree (doc_number, doc_year);
CREATE INDEX IF NOT EXISTS idx_audit_passed ON public.ingestion_audit_log USING btree (passed, tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_score ON public.ingestion_audit_log USING btree (final_quality_score) WHERE (passed = false);


-- 5. Buat Tabel: Ingestion Error Log
CREATE TABLE IF NOT EXISTS public.ingestion_error_log (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	error_source text NOT NULL,
	error_message text NOT NULL,
	execution_id text NULL,
	source_url text NULL,
	doc_number text NULL,
	failed_at timestamptz DEFAULT now() NOT NULL,
	retry_suggested bool DEFAULT true NOT NULL,
	retry_status text DEFAULT 'pending'::text NOT NULL,
	retried_at timestamptz NULL,
	notes text NULL,
	CONSTRAINT ingestion_error_log_pkey PRIMARY KEY (id),
	CONSTRAINT ingestion_error_log_retry_status_check CHECK ((retry_status = ANY (ARRAY['pending'::text, 'retried'::text, 'abandoned'::text])))
);

CREATE INDEX IF NOT EXISTS idx_error_log_doc_number ON public.ingestion_error_log USING btree (doc_number);
CREATE INDEX IF NOT EXISTS idx_error_log_failed_at ON public.ingestion_error_log USING btree (failed_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_retry_status ON public.ingestion_error_log USING btree (retry_status);


-- 6. Buat Tabel: Ingestion Log (Sederhana)
CREATE TABLE IF NOT EXISTS public.ingestion_log (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	source_url text NOT NULL,
	doc_title text NULL,
	status varchar(20) NOT NULL,
	chunks_created int4 NULL,
	error_message text NULL,
	processed_at timestamptz DEFAULT now() NULL,
	CONSTRAINT ingestion_log_pkey PRIMARY KEY (id)
);


-- 7. Buat Tabel Utama: Tax Documents (RAG Dokumen Pajak)
CREATE TABLE IF NOT EXISTS public.tax_documents (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	chunk_text text NOT NULL,
	chunk_index int4 NOT NULL,
	pasal_number varchar(20) NULL,
	doc_type varchar(50) NOT NULL,
	doc_number varchar(20) NULL,
	doc_year varchar(10) NULL,
	doc_title text NULL,
	jenis_pajak varchar(100) NULL,
	source_url text NULL,
	ingested_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	embedding public.vector(1536) NULL,
	status_hukum varchar(20) DEFAULT 'BERLAKU'::character varying NULL,
	berlaku_sejak date NULL,
	doc_category varchar(50) NULL,
	doc_abstrak text NULL,
	total_chunks int4 NULL,
	ingestion_status text DEFAULT 'COMPLETE'::text NULL,
	total_chunks_expected int4 NULL,
	total_chunks_ingested int4 NULL,
	diubah_oleh jsonb NULL,
	mencabut jsonb NULL,
	mengubah jsonb NULL,
	dicabut_oleh jsonb NULL,
	bab text NULL,
	section_type text DEFAULT 'batang_tubuh'::text NULL,
	breadcrumb text NULL,
	is_table bool DEFAULT false NULL,
	doc_keywords _text NULL,
	dasar_hukum _text NULL,
	doc_ringkasan text NULL,
	abstrak_raw text NULL,
	relational_id text NULL,
	internal_references _text NULL,
	pasal_relational_id text NULL,
	"header" text NULL,
	hierarchy_level text NULL,
	semantic_types _text NULL,
	semantic_type text NULL,
	contains_definition bool DEFAULT false NULL,
	contains_sanction bool DEFAULT false NULL,
	contains_exception bool DEFAULT false NULL,
	contains_obligation bool DEFAULT false NULL,
	contains_prohibition bool DEFAULT false NULL,
	contains_procedure bool DEFAULT false NULL,
	contains_timeline bool DEFAULT false NULL,
	outgoing_references _text NULL,
	ayat_numbers _text NULL,
	huruf_references _text NULL,
	citation_graph jsonb NULL,
	legal_entities _text NULL,
	legal_concept_tags _text NULL,
	procedural_stage _text NULL,
	procedural_stage_primary text NULL,
	primary_domain text NULL,
	secondary_domains _text NULL,
	domain_tags _text NULL,
	domain_scores jsonb NULL,
	domain_confidence numeric(4, 2) NULL,
	semantic_importance numeric(4, 2) NULL,
	retrieval_boost numeric(4, 2) NULL,
	chunk_summary text NULL,
	quality_flags _text NULL,
	quality_score numeric(4, 2) NULL,
	embedding_ready bool DEFAULT false NULL,
	embedding_validated bool DEFAULT false NULL,
	l2_norm numeric(8, 4) NULL,
	_rt_similarity numeric(6, 4) NULL,
	_rt_note text NULL,
	_rt_neighbor_flags jsonb NULL,
	document_slug text NULL,
	pasal_title text NULL,
	ast_type text NULL,
	ast_version text NULL,
	definition_number text NULL,
	definition_term text NULL,
	is_definition_chunk bool DEFAULT false NULL,
	semantic_boundary text NULL,
	hierarchy_path jsonb NULL,
	structural_depth int4 NULL,
	parent_relation jsonb NULL,
	chunk_token_estimate int4 NULL,
	chunker_version text NULL,
	embedding_input text NULL,
	chunk_headline text NULL,
	citation_short text NULL,
	citation_path text NULL,
	canonical_aliases _text NULL,
	normalized_terms _text NULL,
	vector_ready_text text NULL,
	search_text text NULL,
	entity_type text NULL,
	effective_status text NULL,
	document_family text NULL,
	legal_domain text NULL,
	effective_year text NULL,
	search_priority int4 NULL,
	chunk_type_priority int4 NULL,
	embedding_builder_version text NULL,
	chunk_hash text NULL,
	embedding_variance numeric NULL,
	embedding_fingerprint text NULL,
	embedding_dimension int4 NULL,
	embedding_model text NULL,
	embedding_pipeline_version text NULL,
	CONSTRAINT tax_documents_pkey PRIMARY KEY (id),
	CONSTRAINT tax_documents_source_url_chunk_index_key UNIQUE (source_url, chunk_index),
	CONSTRAINT unique_source_chunk UNIQUE (source_url, chunk_index)
);

-- 8. Pembuatan Indexing khusus Pencarian Vektor & Metadata Pajak
CREATE INDEX IF NOT EXISTS idx_tax_berlaku ON public.tax_documents USING btree (berlaku_sejak);
CREATE INDEX IF NOT EXISTS idx_tax_doc_type ON public.tax_documents USING btree (doc_type);
CREATE INDEX IF NOT EXISTS idx_tax_doc_year ON public.tax_documents USING btree (doc_year);
CREATE INDEX IF NOT EXISTS idx_tax_docs_domain_scores ON public.tax_documents USING gin (domain_scores) WHERE (domain_scores IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_docs_embedding_ready ON public.tax_documents USING btree (embedding_ready) WHERE (embedding_ready = true);
CREATE INDEX IF NOT EXISTS idx_tax_docs_legal_concept_tags ON public.tax_documents USING gin (legal_concept_tags) WHERE (legal_concept_tags IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_docs_pasal_relational_id ON public.tax_documents USING btree (pasal_relational_id) WHERE (pasal_relational_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_docs_primary_domain ON public.tax_documents USING btree (primary_domain) WHERE (primary_domain IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_docs_quality_flags ON public.tax_documents USING gin (quality_flags) WHERE ((quality_flags IS NOT NULL) AND (array_length(quality_flags, 1) > 0));
CREATE INDEX IF NOT EXISTS idx_tax_docs_relational_id ON public.tax_documents USING btree (relational_id) WHERE (relational_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_docs_semantic_type ON public.tax_documents USING btree (semantic_type) WHERE (semantic_type IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_ast_type ON public.tax_documents USING btree (ast_type) WHERE (ast_type IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_canonical_aliases_gin ON public.tax_documents USING gin (canonical_aliases) WHERE (canonical_aliases IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_chunk_hash ON public.tax_documents USING btree (chunk_hash) WHERE (chunk_hash IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_document_family ON public.tax_documents USING btree (document_family) WHERE (document_family IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_document_slug ON public.tax_documents USING btree (document_slug) WHERE (document_slug IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_effective_year ON public.tax_documents USING btree (effective_year) WHERE (effective_year IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_embedding_hnsw ON public.tax_documents USING hnsw (embedding vector_cosine_ops) WITH (m='16', ef_construction='64');
CREATE INDEX IF NOT EXISTS idx_tax_documents_hierarchy_path_gin ON public.tax_documents USING gin (hierarchy_path) WHERE (hierarchy_path IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_is_definition_chunk ON public.tax_documents USING btree (is_definition_chunk) WHERE (is_definition_chunk = true);
CREATE INDEX IF NOT EXISTS idx_tax_documents_jenis_pajak ON public.tax_documents USING btree (jenis_pajak);
CREATE INDEX IF NOT EXISTS idx_tax_documents_keywords ON public.tax_documents USING gin (doc_keywords);
CREATE INDEX IF NOT EXISTS idx_tax_documents_legal_domain ON public.tax_documents USING btree (legal_domain) WHERE (legal_domain IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_pasal_conflict ON public.tax_documents USING btree (doc_type, pasal_number, doc_year);
CREATE INDEX IF NOT EXISTS idx_tax_documents_query_filter ON public.tax_documents USING btree (status_hukum, jenis_pajak, section_type);
CREATE INDEX IF NOT EXISTS idx_tax_documents_rag_retrieval ON public.tax_documents USING btree (effective_status, status_hukum, primary_domain, retrieval_boost DESC) WHERE (effective_status = 'active'::text);
CREATE INDEX IF NOT EXISTS idx_tax_documents_search_priority ON public.tax_documents USING btree (search_priority DESC) WHERE (search_priority IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_tax_documents_section_type ON public.tax_documents USING btree (section_type);
CREATE INDEX IF NOT EXISTS idx_tax_documents_source_chunk ON public.tax_documents USING btree (source_url, chunk_index);
CREATE INDEX IF NOT EXISTS idx_tax_documents_status_doctype ON public.tax_documents USING btree (status_hukum, doc_type);
CREATE INDEX IF NOT EXISTS idx_tax_documents_status_hukum ON public.tax_documents USING btree (status_hukum);
CREATE INDEX IF NOT EXISTS idx_tax_documents_status_jenis ON public.tax_documents USING btree (status_hukum, jenis_pajak);
CREATE INDEX IF NOT EXISTS idx_tax_embedding ON public.tax_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');
CREATE INDEX IF NOT EXISTS idx_tax_ingested_at ON public.tax_documents USING btree (ingested_at);
CREATE INDEX IF NOT EXISTS idx_tax_jenis_pajak ON public.tax_documents USING btree (jenis_pajak);
CREATE INDEX IF NOT EXISTS idx_tax_status ON public.tax_documents USING btree (status_hukum);
CREATE INDEX IF NOT EXISTS idx_td_doc_type_number_year ON public.tax_documents USING btree (doc_type, doc_number, doc_year);
CREATE INDEX IF NOT EXISTS idx_td_source_url_status ON public.tax_documents USING btree (source_url, ingestion_status);

-- 9. Pasang Trigger Otomatis Updated_at ke tabel tax_documents
CREATE OR REPLACE TRIGGER trg_tax_documents_updated_at 
BEFORE UPDATE ON public.tax_documents 
FOR EACH ROW EXECUTE FUNCTION set_updated_at();