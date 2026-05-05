# 🧾 RAG Tax Indonesia — Blueprint MVP dengan n8n

> **Tujuan:** Membangun sistem Retrieval-Augmented Generation (RAG) untuk hukum perpajakan Indonesia (UU, PP, PMK, dll.) menggunakan n8n sebagai orchestrator, PostgreSQL + pgvector sebagai vector store, dan Gemini Flash 2.5 sebagai engine pembersih dokumen.
> 
> **Exit Strategy:** Setelah database vector matang di PostgreSQL, backend akan dimigrasi ke **Go (Gofiber)** — n8n hanya dipakai di fase MVP.

---

## 📐 Arsitektur Sistem (High-Level)

```
┌─────────────────────────────────────────────────────────────────┐
│                        FASE MVP (n8n)                           │
│                                                                 │
│  [PDF JDIH Kemenkeu]                                            │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  Clean      │───▶│  Chunking &      │───▶│  Embedding    │  │
│  │  Ingestion  │    │  Structuring     │    │  (OpenAI /    │  │
│  │ (Gemini     │    │                  │    │   Cohere)     │  │
│  │  Flash 2.5) │    └──────────────────┘    └───────┬───────┘  │
│  └─────────────┘                                    │          │
│                                                     ▼          │
│                                          ┌──────────────────┐  │
│                                          │  PostgreSQL       │  │
│                                          │  + pgvector       │  │
│                                          └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                    (Migration setelah MVP matang)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FASE PRODUKSI (Go + Gofiber)                   │
│                                                                 │
│  [User Query] ──▶ [Gofiber API] ──▶ [PostgreSQL pgvector]      │
│                        │                                        │
│                        ▼                                        │
│                  [LLM Response]                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Struktur Pipeline n8n

Pipeline dibagi menjadi **2 workflow utama**:

| Workflow | Fungsi |
|---|---|
| `1. Ingestion Pipeline` | Ambil PDF → Bersihkan → Chunk → Embed → Simpan ke DB |
| `2. Query / RAG Pipeline` | Terima query → Embed → Similarity search → **Reranking** → LLM → Response |

---

## ⚙️ WORKFLOW 1: Ingestion Pipeline

### Overview Flow

```
[Trigger: Manual / Webhook / Schedule]
        │
        ▼
[Node: HTTP Request — Download PDF dari JDIH]
        │
        ▼
[Node: Extract Binary Data — Baca file PDF]
        │
        ▼
[Node: Gemini Flash 2.5 — Clean Ingestion]
        │  → Konversi PDF ke Markdown
        │  → Hapus noise (TTD pejabat, nomor halaman, header/footer berulang)
        │  → Normalisasi format pasal, ayat, huruf
        │
        ▼
[Node: Code — Chunking Logic]
        │  → Split per pasal / per blok tematik
        │  → Tambahkan metadata (nama UU, nomor pasal, tanggal, dll.)
        │
        ▼
[Node: OpenAI / Cohere — Generate Embedding]
        │
        ▼
[Node: PostgreSQL — Upsert ke tabel vector]
```

---

### 1.1 Node: Trigger

**Tipe:** `Manual Trigger` (MVP) atau `Webhook` (untuk batch otomatis)

Untuk MVP, gunakan **Manual Trigger** agar bisa dikontrol satu per satu.

---

### 1.2 Node: HTTP Request — Download PDF

```
Method  : GET
URL     : https://jdih.kemenkeu.go.id/fullText/[path-file].pdf
Response Format : File (Binary)
```

> **Tip:** Buat spreadsheet daftar URL PDF dari JDIH, lalu gunakan node `Read/Write Files from Disk` atau `Split In Batches` untuk memproses batch.

---

### 1.3 Node: Extract Binary / Convert PDF

Gunakan node **Extract From File** (tipe: PDF) untuk mengekstrak teks mentah dari PDF.

> ⚠️ Teks mentah PDF dari JDIH sering berantakan — inilah alasan mengapa kita kirim ke Gemini untuk dibersihkan, bukan langsung di-chunk.

---

### 1.4 Node: Gemini Flash 2.5 — Clean Ingestion (INTI)

**Tipe Node:** `HTTP Request` ke Gemini API

**Endpoint:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={{$env.GEMINI_API_KEY}}
```

**Request Body (JSON):**
```json
{
  "contents": [
    {
      "parts": [
        {
          "text": "Kamu adalah asisten pengolah dokumen hukum Indonesia. Tugasmu adalah membersihkan dan mengkonversi teks dokumen hukum berikut ke format Markdown yang bersih dan terstruktur.\n\nAturan pembersihan:\n1. HAPUS semua tanda tangan pejabat, cap/stempel, dan blok pengesahan\n2. HAPUS nomor halaman (contoh: '- 1 -', 'Halaman 1 dari 10', dll.)\n3. HAPUS header dan footer berulang (nama kementerian, tanggal cetak, dll.)\n4. HAPUS teks watermark atau keterangan 'Salinan'\n5. PERTAHANKAN dan FORMAT struktur pasal: `## Pasal 1`, `### Ayat (1)`, `#### Huruf a`\n6. PERTAHANKAN semua konten hukum substantif\n7. NORMALISASI spasi ganda, karakter aneh hasil OCR\n8. Output HANYA berisi Markdown, tanpa penjelasan tambahan\n\nDokumen yang akan diproses:\n\n{{ $json.text }}"
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.1,
    "maxOutputTokens": 8192
  }
}
```

> **Catatan:** Gunakan `temperature: 0.1` agar output deterministik dan konsisten.

---

### 1.4.1 Node: Edit Fields (Set) — Ekstrak Output Gemini

Untuk mengambil output dari Node HTTP Request (Gemini) agar dapat digunakan di Node Code selanjutnya, gunakan Node **Edit Fields (Set)**.

**Tipe Node:** `Edit Fields (Set)`

**Konfigurasi Assignment:**
- **Name**: `cleanedMarkdown`
- **Type**: `String`
- **Value** (Expression):
  ```
  {{ $json.candidates[0].content.parts[0].text }}
  ```

Dengan konfigurasi di atas, teks hasil pembersihan akan tersimpan dalam properti `cleanedMarkdown`.

---

### 1.5 Node: Code — Chunking Logic

**Tipe Node:** `Code` (JavaScript)

```javascript
// ============================================================
// CHUNKING STRATEGY: Per-Pasal dengan Overlap Metadata
// ============================================================

const markdownText = $input.first().json.cleanedMarkdown;
const docMetadata = $input.first().json.metadata; // dari node sebelumnya

// Konfigurasi chunking
const CHUNK_SIZE = 1000;       // karakter per chunk
const CHUNK_OVERLAP = 150;     // overlap antar chunk
const MIN_CHUNK_SIZE = 100;    // buang chunk terlalu kecil

// ---- Strategi 1: Split per Pasal (Prioritas) ----
function splitByPasal(text) {
  // Regex untuk menangkap Pasal, Bagian, BAB
  const pasalPattern = /(?=##\s+(?:Pasal|BAB|Bagian|Paragraf)\s+\d+)/gi;
  const chunks = text.split(pasalPattern).filter(c => c.trim().length > MIN_CHUNK_SIZE);
  return chunks;
}

// ---- Strategi 2: Fallback sliding window jika chunk terlalu besar ----
function slidingWindow(text, size, overlap) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }
  return chunks;
}

// Proses chunking
let rawChunks = splitByPasal(markdownText);
const finalChunks = [];

for (const chunk of rawChunks) {
  if (chunk.length <= CHUNK_SIZE) {
    finalChunks.push(chunk);
  } else {
    // Chunk terlalu besar → gunakan sliding window
    const subChunks = slidingWindow(chunk, CHUNK_SIZE, CHUNK_OVERLAP);
    finalChunks.push(...subChunks);
  }
}

// Ekstrak nomor pasal dari tiap chunk untuk metadata
function extractPasalNumber(chunkText) {
  const match = chunkText.match(/##\s+Pasal\s+(\d+[A-Z]?)/i);
  return match ? match[1] : null;
}

// Build output dengan metadata lengkap
const output = finalChunks.map((chunk, index) => ({
  json: {
    chunk_text: chunk.trim(),
    chunk_index: index,
    total_chunks: finalChunks.length,
    pasal_number: extractPasalNumber(chunk),
    metadata: {
      source_url: docMetadata.sourceUrl,
      doc_type: docMetadata.docType,       // UU / PP / PMK / PER
      doc_number: docMetadata.docNumber,   // Contoh: "36"
      doc_year: docMetadata.docYear,       // Contoh: "2008"
      doc_title: docMetadata.docTitle,
      jenis_pajak: docMetadata.jenisPajak, // PPh / PPN / Bea Cukai / dll.
      ingested_at: new Date().toISOString(),
    }
  }
}));

return output;
```

---

### 1.6 Node: Embedding — OpenAI atau Cohere

**Pilihan A: OpenAI `text-embedding-3-small`**

```
Endpoint : POST https://api.openai.com/v1/embeddings
Header   : Authorization: Bearer {{$env.OPENAI_API_KEY}}

Body:
{
  "input": "{{ $json.chunk_text }}",
  "model": "text-embedding-3-small"
}

Dimensi : 1536
```

**Pilihan B: Cohere `embed-multilingual-v3.0`** *(Rekomendasi untuk teks Indonesia)*

```
Endpoint : POST https://api.cohere.com/v2/embed
Header   : Authorization: Bearer {{$env.COHERE_API_KEY}}

Body:
{
  "texts": ["{{ $json.chunk_text }}"],
  "model": "embed-multilingual-v3.0",
  "input_type": "search_document",
  "embedding_types": ["float"]
}

Dimensi : 1024
```

> **Rekomendasi:** Gunakan **Cohere `embed-multilingual-v3.0`** karena dilatih pada teks multibahasa termasuk Bahasa Indonesia. Kualitas embedding untuk teks UU lebih baik dibanding OpenAI yang dominan English.

---

### 1.7 Node: PostgreSQL — Upsert Data

**Tipe Node:** `Postgres`

**Query:**
```sql
INSERT INTO tax_documents (
  id,
  chunk_text,
  chunk_index,
  pasal_number,
  doc_type,
  doc_number,
  doc_year,
  doc_title,
  jenis_pajak,
  source_url,
  ingested_at,
  embedding
)
VALUES (
  gen_random_uuid(),
  $1, $2, $3, $4, $5, $6, $7, $8, $9,
  NOW(),
  $10::vector
)
ON CONFLICT (source_url, chunk_index) 
DO UPDATE SET
  chunk_text = EXCLUDED.chunk_text,
  embedding = EXCLUDED.embedding,
  ingested_at = NOW();
```

---

## 🗄️ Database Schema — PostgreSQL + pgvector

### Setup pgvector

```sql
-- Aktifkan ekstensi
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### DDL: Tabel Utama

```sql
CREATE TABLE tax_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Konten
  chunk_text      TEXT NOT NULL,
  chunk_index     INTEGER NOT NULL,
  pasal_number    VARCHAR(20),
  
  -- Metadata Dokumen
  doc_type        VARCHAR(50) NOT NULL,   -- 'UU', 'PP', 'PMK', 'PER', 'KMK'
  doc_number      VARCHAR(20),
  doc_year        VARCHAR(10),
  doc_title       TEXT,
  jenis_pajak     VARCHAR(100),           -- 'PPh', 'PPN', 'PPnBM', 'Bea Cukai', dll.
  source_url      TEXT,
  
  -- Timestamp
  ingested_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  
  -- Vector Embedding
  -- Ganti dimensi sesuai model yang dipilih:
  -- OpenAI text-embedding-3-small : 1536
  -- Cohere embed-multilingual-v3.0 : 1024
  embedding       vector(1024),
  
  -- Constraint untuk hindari duplikat chunk
  UNIQUE (source_url, chunk_index)
);

-- Index untuk pencarian semantik (IVFFlat - cocok untuk MVP)
CREATE INDEX ON tax_documents 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index standar untuk filter metadata
CREATE INDEX idx_tax_doc_type     ON tax_documents (doc_type);
CREATE INDEX idx_tax_jenis_pajak  ON tax_documents (jenis_pajak);
CREATE INDEX idx_tax_doc_year     ON tax_documents (doc_year);
CREATE INDEX idx_tax_ingested_at  ON tax_documents (ingested_at);
```

### DDL: Tabel Log Ingestion *(Opsional tapi disarankan untuk MVP)*

```sql
CREATE TABLE ingestion_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url    TEXT NOT NULL,
  doc_title     TEXT,
  status        VARCHAR(20) NOT NULL,  -- 'success', 'failed', 'skipped'
  chunks_created INTEGER,
  error_message TEXT,
  processed_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ⚙️ WORKFLOW 2: Query / RAG Pipeline

### Overview Flow

```
[Trigger: Webhook — POST /query]
        │
        ▼
[Node: Set — Validasi & ekstrak query]
        │
        ▼
[Node: OpenAI / Cohere — Embed Query]
        │
        ▼
[Node: PostgreSQL — Similarity Search]
        │  → Vector search top-20 kandidat dengan filter metadata (opsional)
        │
        ▼
[Node: Cohere Rerank — Reranking]
        │  → Reorder top-20 → ambil top-5 yang paling relevan
        │
        ▼
[Node: Code — Format Context]
        │  → Gabungkan chunks menjadi context string
        │
        ▼
[Node: Gemini / OpenAI — LLM Generate Answer]
        │
        ▼
[Node: Respond to Webhook — Return JSON]
```

---

### 2.1 Node: Embed Query

Sama seperti embedding dokumen, gunakan **model yang sama** dengan saat ingestion.

```
Input : {{ $json.body.query }}
Model : embed-multilingual-v3.0 (Cohere) atau text-embedding-3-small (OpenAI)
```

---

### 2.2 Node: PostgreSQL — Similarity Search

> **Catatan:** LIMIT dinaikkan menjadi **20** karena hasil ini akan difilter ulang oleh Reranker. Ambil lebih banyak kandidat di tahap ini agar reranker punya cukup bahan untuk memilih yang benar-benar relevan.

```sql
SELECT
  chunk_text,
  pasal_number,
  doc_type,
  doc_number,
  doc_year,
  doc_title,
  jenis_pajak,
  source_url,
  1 - (embedding <=> $1::vector) AS similarity_score
FROM tax_documents
WHERE
  -- Filter opsional berdasarkan metadata dari query
  ($2::text IS NULL OR jenis_pajak = $2)
  AND ($3::text IS NULL OR doc_type = $3)
ORDER BY embedding <=> $1::vector
LIMIT 20;  -- Ambil top-20 kandidat untuk di-rerank

-- Parameter:
-- $1 : query embedding vector
-- $2 : jenis_pajak filter (null = semua)
-- $3 : doc_type filter (null = semua)
```

---

### 2.3 Node: Cohere Rerank

**Tipe Node:** `HTTP Request`

**Endpoint:**
```
POST https://api.cohere.com/v2/rerank
Header : Authorization: Bearer {{$env.COHERE_API_KEY}}
```

**Kenapa Reranking diperlukan?**

Vector similarity search bekerja berdasarkan kedekatan embedding di ruang vektor — ini cepat tapi tidak selalu menangkap relevansi semantik yang dalam. Reranker menggunakan **Cross-Encoder model** yang membandingkan query dan setiap dokumen secara langsung (bukan representasi vektor), sehingga menghasilkan skor relevansi yang jauh lebih akurat. Untuk teks hukum yang punya nuansa spesifik (pasal, ayat, pengecualian), reranking sangat membantu menghindari konteks yang "mirip tapi salah".

**Request Body:**
```json
{
  "model": "rerank-multilingual-v3.0",
  "query": "{{ $('Webhook').first().json.body.query }}",
  "documents": "={{ $input.all().map(item => item.json.chunk_text) }}",
  "top_n": 5,
  "return_documents": true
}
```

**Output yang diambil (node Code setelahnya):**

```javascript
// Parse hasil reranking dari Cohere
const rerankResults = $input.first().json.results;
const originalChunks = $('PostgreSQL Similarity Search').all();

// Map rerank results kembali ke data lengkap dengan metadata
const rerankedChunks = rerankResults.map(result => {
  const originalIndex = result.index; // index dari array dokumen yang dikirim
  const original = originalChunks[originalIndex].json;
  return {
    json: {
      ...original,
      rerank_score: result.relevance_score,
    }
  };
});

return rerankedChunks;
```

> **Model:** `rerank-multilingual-v3.0` mendukung Bahasa Indonesia dan merupakan pasangan alami dari `embed-multilingual-v3.0`. Jika pakai OpenAI embedding, tetap bisa pakai Cohere Rerank karena reranker bekerja pada level teks, bukan vektor.

---

### 2.4 Node: Code — Format Context

```javascript
const chunks = $input.all(); // hasil dari Cohere Rerank
const originalQuery = $('Webhook').first().json.body.query;

// Gabungkan top-5 chunks (sudah diurutkan oleh reranker) menjadi context
const contextParts = chunks.map((item, i) => {
  const d = item.json;
  return `--- Sumber ${i+1}: ${d.doc_type} No. ${d.doc_number} Tahun ${d.doc_year}, Pasal ${d.pasal_number || 'N/A'} ---\n${d.chunk_text}`;
});

const context = contextParts.join('\n\n');

return [{
  json: {
    query: originalQuery,
    context: context,
    sources: chunks.map(c => ({
      doc_title: c.json.doc_title,
      doc_type: c.json.doc_type,
      doc_number: c.json.doc_number,
      doc_year: c.json.doc_year,
      pasal_number: c.json.pasal_number,
      source_url: c.json.source_url,
      similarity_score: c.json.similarity_score,
      rerank_score: c.json.rerank_score,         // tambahan dari reranker
    }))
  }
}];
```

---

### 2.5 Node: LLM — Generate Answer (Gemini / OpenAI)

**System Prompt:**
```
Kamu adalah asisten hukum pajak Indonesia yang ahli. 
Tugasmu adalah menjawab pertanyaan berdasarkan HANYA konteks peraturan perpajakan yang diberikan.

Aturan:
1. Jawab berdasarkan konteks yang diberikan saja. Jangan menambahkan informasi di luar konteks.
2. Sebutkan sumber (nama UU/PP/PMK dan nomor pasal) untuk setiap klaim hukum.
3. Jika pertanyaan tidak dapat dijawab dari konteks, katakan dengan jelas: "Informasi ini tidak tersedia dalam database peraturan yang ada."
4. Gunakan Bahasa Indonesia formal dan jelas.
5. Jika ada ketentuan yang saling berkaitan, jelaskan hubungannya.
```

**User Prompt:**
```
Pertanyaan: {{ $json.query }}

Konteks Peraturan Perpajakan:
{{ $json.context }}

Berikan jawaban yang komprehensif berdasarkan peraturan di atas.
```

---

### 2.6 Node: Respond to Webhook

**Response Body (JSON):**
```json
{
  "answer": "{{ $json.answer }}",
  "sources": "{{ $json.sources }}",
  "query": "{{ $json.query }}"
}
```

---

## 🔑 Environment Variables (n8n Credentials)

| Variable | Deskripsi |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio API Key |
| `OPENAI_API_KEY` | OpenAI API Key (jika pakai OpenAI embedding) |
| `COHERE_API_KEY` | Cohere API Key (embedding + **reranking**) |
| `POSTGRES_HOST` | Host PostgreSQL |
| `POSTGRES_PORT` | Port (default: 5432) |
| `POSTGRES_DB` | Nama database |
| `POSTGRES_USER` | Username |
| `POSTGRES_PASSWORD` | Password |

> Semua variabel ini di-set di **n8n Credentials** atau **Environment Variables** pada instance n8n.

---

## 📦 Metadata Dokumen JDIH — Panduan Pengisian

Setiap PDF yang diingest harus memiliki metadata berikut. Ini bisa diisi manual di node `Set` atau diekstrak otomatis dari URL/halaman JDIH.

| Field | Contoh | Sumber |
|---|---|---|
| `doc_type` | `UU`, `PP`, `PMK`, `PER`, `KMK` | Nama file / URL |
| `doc_number` | `36` | Nama file / URL |
| `doc_year` | `2008` | Nama file / URL |
| `doc_title` | `Pajak Penghasilan` | Halaman JDIH |
| `jenis_pajak` | `PPh` | Manual / klasifikasi |
| `source_url` | `https://jdih.kemenkeu.go.id/...` | URL asli |

### Contoh `jenis_pajak` yang disarankan:

```
PPh          → Pajak Penghasilan
PPN          → Pajak Pertambahan Nilai
PPnBM        → Pajak Penjualan atas Barang Mewah
PBB          → Pajak Bumi dan Bangunan
Bea_Cukai    → Bea dan Cukai
KUP          → Ketentuan Umum Perpajakan
Transfer_Pricing
BPHTB
Umum         → Peraturan yang lintas jenis pajak
```

---

## 🧪 Testing & Validasi MVP

### Cek kualitas embedding setelah ingestion:

```sql
-- Lihat distribusi dokumen
SELECT doc_type, jenis_pajak, COUNT(*) as total_chunks
FROM tax_documents
GROUP BY doc_type, jenis_pajak
ORDER BY total_chunks DESC;

-- Test similarity search manual
SELECT chunk_text, pasal_number, doc_title,
       1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as score
FROM tax_documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;

-- Cek apakah ada chunk kosong atau terlalu pendek
SELECT id, LENGTH(chunk_text) as len, doc_title
FROM tax_documents
WHERE LENGTH(chunk_text) < 100
ORDER BY len;
```

### Checklist MVP:

- [ ] Minimal 10 PDF berhasil diingest tanpa error
- [ ] Setiap chunk memiliki metadata lengkap (doc_type, doc_year, jenis_pajak)
- [ ] Similarity search mengembalikan hasil relevan untuk query "tarif PPh badan"
- [ ] LLM menyebutkan sumber pasal dalam jawaban
- [ ] Tidak ada embedding NULL di database
- [ ] Ingestion log mencatat semua proses

---

## 🐳 Docker Compose Setup

Semua service dijalankan dalam satu stack Docker Compose: **n8n** sebagai orchestrator dan **PostgreSQL + pgvector** sebagai vector store.

### Struktur Direktori

```
rag-tax/
├── docker-compose.yml
├── .env                    # ← kredensial aktif, JANGAN di-commit
├── .env.example            # ← template kosong, aman di-commit ke Git
├── .gitignore
├── init-db/
│   └── 01_setup.sql        # DDL otomatis saat container pertama kali naik
└── n8n-data/               # Volume persisten untuk workflow n8n
```

### File: `.env`

```env
# PostgreSQL
POSTGRES_DB=rag_tax
POSTGRES_USER=raguser
POSTGRES_PASSWORD=ganti_dengan_password_kuat

# n8n
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=ganti_dengan_password_kuat
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678/

# ─────────────────────────────────────────
# API Keys — semua kredensial eksternal
# ─────────────────────────────────────────

# Google Gemini (document cleaning & LLM answering)
GEMINI_API_KEY=your_gemini_api_key_here

# Cohere (embedding + reranking)
COHERE_API_KEY=your_cohere_api_key_here

# OpenAI — opsional, jika memilih OpenAI sebagai embedding provider
OPENAI_API_KEY=your_openai_api_key_here
```

> ⚠️ **Jangan pernah commit file `.env` ke Git.** Pastikan sudah masuk ke `.gitignore`:
> ```bash
> echo ".env" >> .gitignore
> ```

### File: `.env.example` *(commit ini ke Git)*

Template kosong yang aman untuk disimpan di repository. Developer baru cukup copy file ini lalu isi nilainya.

```env
# ─────────────────────────────────────────
# PostgreSQL
# ─────────────────────────────────────────
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=

# ─────────────────────────────────────────
# n8n Auth & Host
# ─────────────────────────────────────────
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=
N8N_BASIC_AUTH_PASSWORD=
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678/

# ─────────────────────────────────────────
# API Keys
# ─────────────────────────────────────────
GEMINI_API_KEY=
COHERE_API_KEY=
OPENAI_API_KEY=
```

```bash
# Setup awal untuk developer baru:
cp .env.example .env
# lalu edit .env dan isi semua nilai yang kosong
```

---

### File: `.gitignore`

```gitignore
# Kredensial — WAJIB diabaikan
.env

# Volume data lokal
n8n-data/
postgres-data/

# OS & editor
.DS_Store
*.swp
.idea/
.vscode/
```

---

### File: `docker-compose.yml`

```yaml
version: '3.8'

services:

  # ─────────────────────────────────────────
  # PostgreSQL + pgvector
  # ─────────────────────────────────────────
  postgres:
    image: pgvector/pgvector:pg16
    container_name: rag_tax_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d   # auto-run DDL saat init
    ports:
      - "5432:5432"                              # expose untuk akses lokal / DBeaver
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ─────────────────────────────────────────
  # n8n
  # ─────────────────────────────────────────
  n8n:
    image: n8nio/n8n:latest
    container_name: rag_tax_n8n
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      # Auth
      N8N_BASIC_AUTH_ACTIVE: ${N8N_BASIC_AUTH_ACTIVE}
      N8N_BASIC_AUTH_USER: ${N8N_BASIC_AUTH_USER}
      N8N_BASIC_AUTH_PASSWORD: ${N8N_BASIC_AUTH_PASSWORD}

      # Host & Webhook
      N8N_HOST: ${N8N_HOST}
      N8N_PORT: ${N8N_PORT}
      N8N_PROTOCOL: ${N8N_PROTOCOL}
      WEBHOOK_URL: ${WEBHOOK_URL}

      # Timezone
      GENERIC_TIMEZONE: Asia/Jakarta
      TZ: Asia/Jakarta

      # Pakai PostgreSQL sebagai database internal n8n
      # (terpisah dari database RAG — gunakan DB name berbeda)
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n_internal
      DB_POSTGRESDB_USER: ${POSTGRES_USER}
      DB_POSTGRESDB_PASSWORD: ${POSTGRES_PASSWORD}

      # API Keys — diteruskan dari .env ke dalam container n8n
      # Dipanggil di node n8n via: {{ $env.GEMINI_API_KEY }}, dst.
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      COHERE_API_KEY: ${COHERE_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}

    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  postgres_data:
  n8n_data:
```

### File: `init-db/01_setup.sql`

Script ini dijalankan **otomatis** oleh PostgreSQL saat container pertama kali diinisialisasi.

```sql
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
```

### Perintah Dasar

```bash
# Jalankan seluruh stack (pertama kali)
docker compose up -d

# Lihat log semua service
docker compose logs -f

# Lihat log n8n saja
docker compose logs -f n8n

# Masuk ke PostgreSQL via CLI
docker exec -it rag_tax_postgres psql -U raguser -d rag_tax

# Stop stack (data tetap aman di volume)
docker compose down

# Stop + hapus semua volume (HATI-HATI: data hilang)
docker compose down -v

# Update n8n ke versi terbaru
docker compose pull n8n && docker compose up -d n8n
```

### Konfigurasi Koneksi PostgreSQL di n8n

Setelah stack naik, buka n8n di `http://localhost:5678` dan buat credential baru:

```
Type     : PostgreSQL
Host     : postgres          ← nama service di Docker network, bukan localhost
Port     : 5432
Database : rag_tax
User     : raguser
Password : (sesuai .env)
SSL      : false             ← internal Docker network, tidak perlu SSL
```

> **Penting:** Gunakan nama service `postgres` (bukan `localhost`) sebagai host karena n8n dan PostgreSQL berada dalam Docker network yang sama.

---

## 🚀 Roadmap: Migrasi ke Go Gofiber

Setelah database vector di PostgreSQL matang:

```
FASE PRODUKSI
├── Backend: Go + Gofiber
│   ├── Endpoint POST /api/v1/query
│   ├── Embedding: Panggil Cohere/OpenAI API langsung dari Go
│   ├── Vector Search: Query pgvector via pgx driver
│   └── LLM: Panggil Gemini API dari Go
│
├── Database: PostgreSQL + pgvector (SAMA, tidak berubah)
│   └── Cukup pindahkan connection string ke config Go
│
└── n8n: Tetap dipakai HANYA untuk ingestion pipeline baru
    (saat ada peraturan pajak baru yang perlu dimasukkan)
```

> **Keuntungan desain ini:** Karena n8n hanya dipakai untuk ingestion dan semua data tersimpan di PostgreSQL standar, migrasi backend tidak memerlukan perubahan apapun pada data. Cukup arahkan Go ke database yang sama.

---

## 📋 Ringkasan Tech Stack

| Komponen | Teknologi | Keterangan |
|---|---|---|
| Container Orchestration | Docker Compose | Self-hosted, semua service dalam 1 stack |
| Orchestrator MVP | n8n | Self-hosted via Docker |
| Document Cleaning | Gemini Flash 2.5 API | Temperature 0.1 |
| Embedding | Cohere `embed-multilingual-v3.0` | Atau OpenAI `text-embedding-3-small` |
| Reranking | Cohere `rerank-multilingual-v3.0` | Cross-encoder, pasangan embed multilingual |
| Vector Database | PostgreSQL + pgvector | Self-hosted via Docker |
| LLM Answering | Gemini Flash 2.5 / GPT-4o | Fleksibel |
| Data Source | JDIH Kemenkeu | PDF UU, PP, PMK, PER |
| Backend (Post-MVP) | Go + Gofiber | Konsumsi DB yang sama |

---

*Dokumen ini adalah living document. Update setiap kali ada perubahan spesifikasi atau temuan saat pengembangan MVP.*
