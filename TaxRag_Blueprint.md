# 🏛️ TaxRag Technical Blueprint (MVP Version)

Dokumen ini berisi dokumentasi teknis menyeluruh untuk sistem **Tax RAG (Retrieval-Augmented Generation)** Indonesia. Gunakan dokumen ini sebagai panduan utama saat melakukan pengembangan fitur atau migrasi sistem di masa depan.

---

## 1. Stack Teknologi
*   **Orchestrator:** n8n (Self-hosted via Docker)
*   **Database:** PostgreSQL 16 + `pgvector` extension
*   **Embeddings:** OpenAI `text-embedding-3-small` (via OpenRouter)
*   **LLM (Inference):** Google `Gemini 2.5 Flash Lite` (via OpenRouter)
*   **Reranker:** Cohere `rerank-v3.5` (via OpenRouter)
*   **Backend Masa Depan:** Go Fiber (Planned)

---

## 2. Arsitektur Infrastruktur (`docker-compose.yml`)
Sistem berjalan menggunakan Docker Compose dengan dua layanan utama:
1.  **`postgres`**: Image `pgvector/pgvector:pg16`. Menyimpan data peraturan dan vektor.
2.  **`n8n`**: Berjalan di port `5678`, terhubung ke `n8n_internal` (DB n8n) dan `rag_tax` (DB Data).

---

## 3. Struktur Database (`init-db/01_init_db.sql`)
Tabel utama yang digunakan untuk pencarian semantik adalah **`tax_documents`**.

### Skema Tabel `tax_documents`
| Kolom | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `chunk_text` | TEXT | Potongan teks peraturan asli |
| `pasal_number`| VARCHAR | Nomor pasal hasil ekstraksi LLM |
| `doc_type` | VARCHAR | Jenis dokumen (UU, PMK, PP, dst) |
| `doc_number` | VARCHAR | Nomor peraturan |
| `doc_year` | VARCHAR | Tahun peraturan |
| `status_hukum`| VARCHAR | `BERLAKU` atau `DICABUT` (Filter Utama) |
| `embedding` | vector(1536)| Vektor representasi semantik |

---

## 4. Workflow 1: Ingesti Dokumen (`Ingestion Pipeline V5.json`)
Pipeline ini bertanggung jawab mengubah PDF mentah menjadi data vektor yang siap dicari.

### Alur Kerja:
1.  **Pembersihan Teks (LLM Step 1):** LLM membersihkan PDF hasil OCR/ekstraksi menjadi format Markdown yang rapi.
2.  **Ekstraksi Metadata (LLM Step 2):** LLM mendeteksi nomor, tahun, judul, dan status hukum dari halaman awal.
3.  **Semantic Chunking:** Teks dipecah berdasarkan "Pasal" menggunakan Regex untuk menjaga konteks hukum tidak terpotong.
4.  **Vector Embedding:** Setiap pasal diubah menjadi vektor 1536-dimensi.
5.  **Upsert SQL:** Data disimpan ke Postgres dengan kunci unik `source_url + chunk_index` untuk mencegah duplikasi.

---

## 5. Workflow 2: Query & Chatbot API (`Query Pipeline V5.json`)
Pipeline ini melayani pertanyaan pengguna melalui API Webhook.

### Mekanisme Pencarian & Sintesis:
1.  **Webhook Trigger:** Menerima POST request berisi `query`. Mendukung filter opsional `doc_type` dan `jenis_pajak`.
2.  **Two-Stage Retrieval:**
    *   **Stage 1 (Vector Search):** Mengambil 20 kandidat teratas dari Postgres menggunakan *Cosine Similarity*.
    *   **Stage 2 (Reranking):** Menggunakan `cohere/rerank-v3.5` untuk menyaring 20 kandidat menjadi 5 hasil paling relevan secara semantik.
3.  **Anti-Hallucination Guardrail:**
    *   Jika skor relevansi tertinggi **< 20%**, sistem langsung menolak menjawab (menghemat token LLM).
4.  **LLM Synthesis:** Gemini membaca 5 sumber terpilih dan memberikan jawaban komprehensif disertai referensi pasal.
5.  **API Response:** Mengembalikan JSON berisi `answer`, `sources` (array objek), dan `query`.

---

## 6. Konfigurasi Lingkungan (`.env`)
Pastikan variabel berikut terisi di file `.env`:
*   `OPENROUTER_API_KEY`: Kunci akses utama untuk model AI.
*   `OPENROUTER_INGESTION_MODEL`: Model untuk cleaning (Flash Lite).
*   `OPENROUTER_EMBEDDING_MODEL`: Model embedding (1536 dim).
*   `POSTGRES_DB`: `rag_tax`.

---

## 7. Roadmap Pengembangan MVP
*   [ ] **Migrasi ke Go Fiber:** Memindahkan logika Query Pipeline ke Go untuk performa konkurensi lebih tinggi.
*   [ ] **Dashboard Ingesti:** UI sederhana untuk mengunggah PDF peraturan tanpa masuk ke n8n.
*   [ ] **Feedback Loop:** Menambahkan tombol "Jawaban Akurat/Tidak Akurat" di API untuk pengumpulan dataset *fine-tuning*.

---
