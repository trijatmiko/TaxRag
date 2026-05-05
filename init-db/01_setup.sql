-- Buat database terpisah untuk n8n internal
CREATE DATABASE n8n_internal;

-- Sambung ke database RAG utama
\c rag_tax;

-- Aktifkan ekstensi
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel utama vector store
CREATE TABLE IF NOT EXISTS tax_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_text      TEXT NOT NULL,
  chunk_index     INTEGER NOT NULL,
  pasal_number    VARCHAR(20),
  doc_type        VARCHAR(50) NOT NULL,
  doc_number      VARCHAR(20),
  doc_year        VARCHAR(10),
  doc_title       TEXT,
  jenis_pajak     VARCHAR(100),
  source_url      TEXT,
  ingested_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  embedding       vector(1024),                  -- Cohere: 1024 | OpenAI: 1536
  UNIQUE (source_url, chunk_index)
);

-- Index vector (IVFFlat — cocok untuk MVP)
CREATE INDEX IF NOT EXISTS idx_tax_embedding
  ON tax_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index metadata
CREATE INDEX IF NOT EXISTS idx_tax_doc_type    ON tax_documents (doc_type);
CREATE INDEX IF NOT EXISTS idx_tax_jenis_pajak ON tax_documents (jenis_pajak);
CREATE INDEX IF NOT EXISTS idx_tax_doc_year    ON tax_documents (doc_year);

-- Tabel log ingestion
CREATE TABLE IF NOT EXISTS ingestion_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url     TEXT NOT NULL,
  doc_title      TEXT,
  status         VARCHAR(20) NOT NULL,
  chunks_created INTEGER,
  error_message  TEXT,
  processed_at   TIMESTAMPTZ DEFAULT NOW()
);
