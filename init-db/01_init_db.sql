-- 1. Aktifkan ekstensi yang diperlukan di database default
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Buat database internal untuk n8n
-- (Catatan: Database ini akan digunakan oleh n8n untuk menyimpan workflow dan data internalnya)
SELECT 'CREATE DATABASE n8n_internal' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n_internal')\gexec

-- 3. Inisialisasi struktur tabel di database RAG utama
-- Tabel Utama: tax_documents
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
  status_hukum    VARCHAR(20) DEFAULT 'BERLAKU', -- Status hukum peraturan (BERLAKU/DICABUT)
  berlaku_sejak   DATE,
  dicabut_oleh    TEXT,
  doc_category    VARCHAR(50),
  ingested_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  embedding       vector(1536),                  -- Sesuai dimensi text-embedding-3-small
  UNIQUE (source_url, chunk_index)
);

-- Indexing Vector (IVFFlat) untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_tax_embedding 
  ON tax_documents USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- Indexing Metadata untuk filter query
CREATE INDEX IF NOT EXISTS idx_tax_doc_type    ON tax_documents (doc_type);
CREATE INDEX IF NOT EXISTS idx_tax_jenis_pajak ON tax_documents (jenis_pajak);
CREATE INDEX IF NOT EXISTS idx_tax_status      ON tax_documents (status_hukum);
CREATE INDEX IF NOT EXISTS idx_tax_doc_year    ON tax_documents (doc_year);

-- Tabel Log: Memantau riwayat ingesti dokumen
CREATE TABLE IF NOT EXISTS ingestion_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url     TEXT NOT NULL,
  doc_title      TEXT,
  status         VARCHAR(20) NOT NULL,
  chunks_created INTEGER,
  error_message  TEXT,
  processed_at   TIMESTAMPTZ DEFAULT NOW()
);
