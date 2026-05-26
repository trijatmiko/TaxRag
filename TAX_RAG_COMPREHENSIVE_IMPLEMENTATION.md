# Tax RAG Komprehensif — Implementation Guide
## Upgrade: Ingestion V13 → V14 & Query Pipeline V7 → V8

**Status pipeline saat ini:** Production-grade, enterprise-ready  
**Tujuan upgrade:** Tax avoidance analysis engine dengan client profiling  
**Strategi:** Additive update — tidak ada node yang dirombak total  
**Estimasi waktu:** 4 minggu (bisa paralel setelah Week 1)

---

## Daftar Isi

1. [Gambaran Perubahan](#1-gambaran-perubahan)  
2. [Week 1 — Database Schema Migration](#2-week-1--database-schema-migration)  
3. [Week 2 — Ingestion Pipeline V14](#3-week-2--ingestion-pipeline-v14)  
4. [Week 3 — Query Pipeline V8](#4-week-3--query-pipeline-v8)  
5. [Week 4 — Re-ingest & Tuning](#5-week-4--re-ingest--tuning)  
6. [Referensi Lengkap Node](#6-referensi-lengkap-node)

---

## 1. Gambaran Perubahan

### Ringkasan node per pipeline

| Pipeline | Keep | Modify | New | Schema |
|---|---|---|---|---|
| Ingestion V13 → V14 | 14 node | 5 node | 2 node | 1 ALTER TABLE |
| Query V7 → V8 | 8 node | 7 node | 3 node | 2 (ALTER + CREATE) |

### Node yang TIDAK DISENTUH sama sekali

**Ingestion:** `Google Sheets Trigger`, `ParseJDIHURL`, `GetAPIDataJDIH`, `GetPDF`, `GetHTML`, `ExtractPDF`, `ExtractHTML`, `MergeBestSource`, `ParseJDIHResponse`, `ParseRiwayatDoc`, `Regex Cleanup`, `Legal AST Parser V6`, `Adaptive Token Chunker V6`, `Quality Gate V2`, `FINGERPRINT HASH`, `Embedding Quality Validator`, `Reconstruction Test`, semua error handler dan log nodes.

**Query:** `Embed User Query`, `Merge Multi Embeddings`, `OpenRouter Rerank`, `Parse Rerank Results`, `Cek Relevance Score`, semua Respond to Webhook nodes, `If`, `If1`, `If2`.

---

## 2. Week 1 — Database Schema Migration

> Jalankan semua SQL ini **sebelum** menyentuh pipeline manapun. Semua `DEFAULT NULL` sehingga data lama tidak terpengaruh.

### 2.1 ALTER TABLE tax_documents — kolom baru

```sql
-- Jalankan satu per satu, cek error per statement

-- Kolom sinyal tax avoidance
ALTER TABLE tax_documents
  ADD COLUMN IF NOT EXISTS avoidance_signals    JSONB    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS thresholds           JSONB    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exception_refs       TEXT[]   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS conflict_refs        JSONB    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS applicable_entity_types TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gaar_exposure_level  TEXT     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS effective_date_end   DATE     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sunset_clause        BOOLEAN  DEFAULT FALSE;
```

**Penjelasan kolom:**

| Kolom | Tipe | Isi |
|---|---|---|
| `avoidance_signals` | JSONB | `{"threshold_arbitrage": true, "entity_exception": true, "timing_window": false}` |
| `thresholds` | JSONB | `{"omzet_max": 4800000000, "tarif": 0.005, "der_max": 4}` — angka batas yang jadi titik perencanaan |
| `exception_refs` | TEXT[] | Pasal/ayat yang dikecualikan, misal `["Pasal 3 ayat 2", "Pasal 7"]` |
| `conflict_refs` | JSONB | Referensi ke regulasi lain yang mengatur hal sama: `[{"doc_type":"PMK","doc_number":"169","doc_year":"2015","conflict_type":"rate_mismatch"}]` |
| `applicable_entity_types` | TEXT[] | `["PT","CV"]` — entitas yang bisa memanfaatkan pasal ini |
| `gaar_exposure_level` | TEXT | `"LOW"` / `"MEDIUM"` / `"HIGH"` — risiko General Anti-Avoidance Rule |
| `effective_date_end` | DATE | Tanggal berakhirnya regulasi jika ada sunset clause |
| `sunset_clause` | BOOLEAN | True jika ada tanggal berakhir eksplisit |

### 2.2 Index baru untuk performa query

```sql
-- GIN index untuk JSONB query cepat
CREATE INDEX IF NOT EXISTS idx_tax_docs_avoidance_signals
  ON tax_documents USING GIN (avoidance_signals);

CREATE INDEX IF NOT EXISTS idx_tax_docs_thresholds
  ON tax_documents USING GIN (thresholds);

-- GIN index untuk array filter entitas
CREATE INDEX IF NOT EXISTS idx_tax_docs_entity_types
  ON tax_documents USING GIN (applicable_entity_types);

-- Index untuk pencarian dokumen dengan celah
CREATE INDEX IF NOT EXISTS idx_tax_docs_gaar_exposure
  ON tax_documents (gaar_exposure_level)
  WHERE gaar_exposure_level IS NOT NULL;
```

### 2.3 CREATE TABLE client_profiles

```sql
CREATE TABLE IF NOT EXISTS client_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code           TEXT UNIQUE NOT NULL,        -- kode unik klien, buat sendiri
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Tier 1: Wajib (filter regulasi dasar)
  entity_type           TEXT NOT NULL,               -- PT | CV | UD | Perorangan | BUT | Koperasi | Yayasan
  klu_code              TEXT,                        -- 5 digit KLU (Klasifikasi Lapangan Usaha)
  klu_description       TEXT,
  omzet_setahun         BIGINT,                      -- dalam Rupiah
  is_pkp                BOOLEAN DEFAULT FALSE,
  npwp                  TEXT,
  domisili_provinsi     TEXT,
  tahun_berdiri         INTEGER,

  -- Tier 2: Analisis mendalam
  laba_sebelum_pajak    BIGINT,
  total_aset            BIGINT,
  total_hutang          BIGINT,
  total_ekuitas         BIGINT,
  der_ratio             NUMERIC(5,2),                -- Debt to Equity Ratio (otomatis hitung: hutang/ekuitas)
  komponen_biaya        JSONB,                       -- {"royalti": 500000000, "bunga": 200000000, "mgmt_fee": 100000000}
  penghasilan_pasif     JSONB,                       -- {"dividen": 300000000, "bunga_terima": 50000000}
  nilai_aset_tetap      BIGINT,
  penyertaan_saham      JSONB,                       -- [{"nama": "PT ABC", "persentase": 25}]
  kredit_pajak          JSONB,                       -- {"pph21": 0, "pph22": 5000000, "pph23": 2000000}

  -- Tier 2: Struktur kepemilikan
  ada_pemegang_asing    BOOLEAN DEFAULT FALSE,
  persentase_asing      NUMERIC(5,2),
  negara_pemegang_asing TEXT[],                      -- untuk cek P3B yang berlaku
  ada_afiliasi          BOOLEAN DEFAULT FALSE,
  daftar_afiliasi       JSONB,                       -- [{"nama": "PT XYZ", "hubungan": "induk", "negara": "SG"}]

  -- Tier 3: Opsional
  spt_history           JSONB,                       -- [{"tahun": 2023, "status": "lebih_bayar", "nilai": 50000000}]
  transaksi_afiliasi    JSONB,                       -- detail untuk TP assessment
  rencana_bisnis        TEXT,                        -- narasi singkat rencana 3 tahun ke depan
  sengketa_aktif        BOOLEAN DEFAULT FALSE,
  detail_sengketa       JSONB
);

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_client_profiles_entity_type
  ON client_profiles (entity_type);

CREATE INDEX IF NOT EXISTS idx_client_profiles_omzet
  ON client_profiles (omzet_setahun);
```

### 2.4 Verifikasi schema

```sql
-- Verifikasi kolom baru di tax_documents
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tax_documents'
  AND column_name IN (
    'avoidance_signals', 'thresholds', 'exception_refs',
    'conflict_refs', 'applicable_entity_types',
    'gaar_exposure_level', 'sunset_clause'
  );

-- Verifikasi tabel client_profiles
SELECT COUNT(*) FROM client_profiles; -- harus 0, tabel baru

-- Verifikasi index
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('tax_documents', 'client_profiles')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

---

## 3. Week 2 — Ingestion Pipeline V14

> Buat **duplicate** dari workflow Ingestion V13 dulu di n8n. Rename jadi "Ingestion V14". Jangan edit V13 langsung sampai V14 sudah ditest.

### 3.1 Node: Semantic Analyzer V6 → V7 (MODIFY)

**Lokasi di workflow:** Setelah `Adaptive Token Chunker`

**Apa yang ditambah:** Deteksi pola celah hukum — keyword exception clause, threshold angka, scope gap.

**Cara edit:** Buka node `Semantic Analyzer`, tambahkan blok kode berikut **setelah** function `analyzeSemantic` yang sudah ada, **sebelum** `return items.map(...)`:

```javascript
// ════════════════════════════════════════
// AVOIDANCE SIGNAL DETECTOR (TAMBAHAN V7)
// Deteksi pola celah hukum pada teks pasal
// ════════════════════════════════════════

function detectAvoidanceSignals(text) {
  const t = text.toLowerCase();
  const signals = {};

  // --- Threshold Arbitrage ---
  // Pasal yang menyebut angka batas — ini titik perencanaan utama
  const thresholdPatterns = [
    /paling tinggi\s+rp[\s.]*([\d.,]+)/gi,
    /tidak melebihi\s+rp[\s.]*([\d.,]+)/gi,
    /paling banyak\s+rp[\s.]*([\d.,]+)/gi,
    /kurang dari\s+rp[\s.]*([\d.,]+)/gi,
    /tidak lebih dari\s+rp[\s.]*([\d.,]+)/gi,
    /sampai dengan\s+rp[\s.]*([\d.,]+)/gi,
    /omzet[\s\w]*tidak melebihi/gi,
    /peredaran bruto[\s\w]*tidak melebihi/gi,
    /\b4[\.,]8\s*miliar\b/gi,
    /\b4\.800\.000\.000\b/gi,
  ];
  signals.threshold_arbitrage = thresholdPatterns.some(p => p.test(t));

  // --- Exception Clause ---
  // Pasal pengecualian — celah paling eksplisit
  const exceptionPatterns = [
    /dikecualikan dari/gi,
    /tidak dikenakan/gi,
    /tidak termasuk/gi,
    /sepanjang memenuhi/gi,
    /dengan syarat/gi,
    /kecuali[\s\w]*yang/gi,
    /tidak berlaku bagi/gi,
    /dibebaskan dari/gi,
    /mendapat fasilitas/gi,
    /tidak dikenai pajak/gi,
    /bukan objek pajak/gi,
  ];
  signals.exception_clause = exceptionPatterns.some(p => p.test(t));

  // --- Entity Type Exception ---
  // Pasal yang spesifik untuk jenis entitas tertentu
  const entityPatterns = [
    /badan usaha milik negara/gi,
    /\bbumn\b/gi,
    /usaha mikro/gi,
    /usaha kecil/gi,
    /koperasi[\s\w]*yang/gi,
    /yayasan[\s\w]*yang/gi,
    /wajib pajak badan/gi,
    /orang pribadi/gi,
    /wajib pajak luar negeri/gi,
    /bentuk usaha tetap/gi,
    /\bbut\b/gi,
  ];
  signals.entity_type_exception = entityPatterns.some(p => p.test(t));

  // --- Timing Window ---
  // Pasal dengan masa transisi atau window waktu yang bisa dimanfaatkan
  const timingPatterns = [
    /masa transisi/gi,
    /berlaku sampai dengan/gi,
    /paling lama[\s\w]*tahun/gi,
    /dalam jangka waktu[\s\w]*tahun/gi,
    /sebelum[\s\w]*berlaku/gi,
    /mulai berlaku pada/gi,
    /sejak[\s\w]*diundangkan/gi,
    /ketentuan lama/gi,
  ];
  signals.timing_window = timingPatterns.some(p => p.test(t));

  // --- Cross Border Gap ---
  // Potensi eksploitasi treaty atau aturan internasional
  const crossBorderPatterns = [
    /perjanjian penghindaran pajak berganda/gi,
    /\bp3b\b/gi,
    /tax treaty/gi,
    /luar negeri/gi,
    /bersumber dari luar negeri/gi,
    /hubungan istimewa/gi,
    /transfer pricing/gi,
    /harga transfer/gi,
    /deemed dividend/gi,
    /controlled foreign/gi,
    /\bcfc\b/gi,
  ];
  signals.cross_border_gap = crossBorderPatterns.some(p => p.test(t));

  // --- Rate Differential ---
  // Perbedaan tarif yang bisa dimanfaatkan
  const ratePatterns = [
    /tarif[\s\w]*lebih rendah/gi,
    /tarif[\s\w]*\d+%/gi,
    /tarif final/gi,
    /dikenakan tarif/gi,
    /0%|nol persen/gi,
    /tarif khusus/gi,
    /tarif pajak ditanggung pemerintah/gi,
    /\bdtp\b/gi,
  ];
  signals.rate_differential = ratePatterns.some(p => p.test(t));

  // Hanya return jika ada minimal 1 sinyal
  const hasAnySignal = Object.values(signals).some(v => v === true);
  return hasAnySignal ? signals : null;
}

// ════════════════════════════════════════
// THRESHOLD EXTRACTOR (TAMBAHAN V7)
// Ekstrak angka threshold aktual dari teks
// ════════════════════════════════════════

function extractThresholds(text) {
  const thresholds = {};

  // Ekstrak nilai Rupiah
  const rupiahRe = /(?:rp\.?\s*|rupiah\s*)([\d.,]+(?:\s*(?:juta|miliar|triliun))?)/gi;
  const rupiahMatches = [...text.matchAll(rupiahRe)];
  if (rupiahMatches.length > 0) {
    thresholds.nilai_rupiah = rupiahMatches.map(m => m[0].trim()).slice(0, 5);
  }

  // Ekstrak persentase tarif
  const pctRe = /(\d+(?:[.,]\d+)?)\s*%/g;
  const pctMatches = [...text.matchAll(pctRe)];
  if (pctMatches.length > 0) {
    thresholds.tarif_persen = [...new Set(pctMatches.map(m => parseFloat(m[1])))].slice(0, 5);
  }

  // Ekstrak batas hari
  const hariRe = /(\d+)\s*hari(?:\s*kerja)?/gi;
  const hariMatches = [...text.matchAll(hariRe)];
  if (hariMatches.length > 0) {
    thresholds.batas_hari = hariMatches.map(m => parseInt(m[1])).slice(0, 3);
  }

  // Flag PP 23/2018 UMKM secara khusus
  if (/4[\.,]8\s*miliar|4\.800\.000\.000/.test(text)) {
    thresholds.umkm_threshold = 4800000000;
  }

  // Flag thin cap DER 4:1
  if (/4\s*:\s*1|debt.{1,20}equity\s*ratio/i.test(text)) {
    thresholds.der_max = 4;
  }

  return Object.keys(thresholds).length > 0 ? thresholds : null;
}

// ════════════════════════════════════════
// APPLICABLE ENTITY EXTRACTOR (TAMBAHAN V7)
// Tentukan jenis entitas yang relevan
// ════════════════════════════════════════

function extractApplicableEntities(text) {
  const t = text.toUpperCase();
  const entities = [];

  if (/\bPT\b|PERSEROAN TERBATAS/.test(t)) entities.push('PT');
  if (/\bCV\b|COMMANDITAIRE VENNOOTSCHAP|PERSEKUTUAN KOMANDITER/.test(t)) entities.push('CV');
  if (/USAHA DAGANG|PERUSAHAAN PERSEORANGAN/.test(t)) entities.push('UD');
  if (/ORANG PRIBADI|WAJIB PAJAK ORANG/.test(t)) entities.push('Perorangan');
  if (/BENTUK USAHA TETAP|\bBUT\b/.test(t)) entities.push('BUT');
  if (/KOPERASI/.test(t)) entities.push('Koperasi');
  if (/YAYASAN/.test(t)) entities.push('Yayasan');
  if (/BADAN USAHA MILIK NEGARA|\bBUMN\b/.test(t)) entities.push('BUMN');
  if (/USAHA MIKRO|USAHA KECIL|USAHA MENENGAH|\bUMKM\b/.test(t)) entities.push('UMKM');

  return entities.length > 0 ? entities : ['SEMUA'];
}
```

Lalu **modifikasi bagian output** di dalam `return items.map(item => {...})` — tambahkan field baru ke `item.json`:

```javascript
// Di dalam return items.map(item => {
//   const j = item.json;
//   ... kode lama ...

  // Tambahkan setelah semua kode existing:
  const chunkText = j.chunk_text || '';
  j.avoidance_signals       = detectAvoidanceSignals(chunkText);
  j.thresholds              = extractThresholds(chunkText);
  j.applicable_entity_types = extractApplicableEntities(chunkText);

  return { json: j };
// });
```

### 3.2 Node: Domain Scoring Engine V2 → V3 (MODIFY)

**Apa yang ditambah:** Domain baru: `TRANSFER_PRICING`, `P3B`, `GAAR`, `TAX_FACILITY`.

**Edit `DOMAIN_PATTERNS` object** — tambahkan entry baru setelah `"Pajak Karbon"`:

```javascript
// Tambahkan ke dalam DOMAIN_PATTERNS:

  TRANSFER_PRICING: [
    /transfer pricing/gi,
    /harga transfer/gi,
    /hubungan istimewa/gi,
    /arm.{1,5}length/gi,
    /prinsip kewajaran/gi,
    /dokumen transfer pricing/gi,
    /country.{1,10}country reporting/gi,
    /\bcbcr\b/gi,
    /advance pricing agreement/gi,
    /\bapa\b/gi,
  ],

  P3B: [
    /perjanjian penghindaran pajak berganda/gi,
    /\bp3b\b/gi,
    /tax treaty/gi,
    /bentuk usaha tetap/gi,
    /\bbut\b/gi,
    /controlled foreign corporation/gi,
    /\bcfc\b/gi,
    /deemed dividend/gi,
  ],

  GAAR: [
    /ketentuan anti penghindaran/gi,
    /general anti.avoidance/gi,
    /\bgaar\b/gi,
    /substansi ekonomi/gi,
    /economic substance/gi,
    /rekarakterisasi/gi,
    /penyalahgunaan perjanjian/gi,
    /treaty abuse/gi,
    /pasal 18/gi,
  ],

  TAX_FACILITY: [
    /fasilitas pajak/gi,
    /tax holiday/gi,
    /pembebasan pajak/gi,
    /pengurangan pajak/gi,
    /insentif pajak/gi,
    /kawasan ekonomi khusus/gi,
    /\bkek\b/gi,
    /kawasan berikat/gi,
    /\bkib\b/gi,
    /kemudahan investasi/gi,
  ],
```

**Tambahkan GAAR exposure assessment** di akhir node, setelah scoring domain selesai:

```javascript
// Tambahkan setelah return items.map(...) selesai:
// Di dalam map, tambahkan field gaar_exposure:

function assessGaarExposure(j) {
  const signals = j.avoidance_signals || {};
  const domain  = j.primary_domain || '';

  // Exposure tinggi jika menyentuh GAAR/TP domain atau cross-border
  if (
    domain === 'GAAR' ||
    domain === 'TRANSFER_PRICING' ||
    signals.cross_border_gap === true
  ) return 'HIGH';

  // Exposure sedang jika ada exception/timing/rate game
  if (
    signals.exception_clause === true ||
    signals.timing_window === true ||
    signals.rate_differential === true
  ) return 'MEDIUM';

  // Exposure rendah jika hanya threshold biasa
  if (signals.threshold_arbitrage === true) return 'LOW';

  return null;
}

// Di dalam map: tambahkan
j.gaar_exposure_level = assessGaarExposure(j);
```

### 3.3 Node: MetadataHub V12 → V13 (MODIFY)

**Apa yang ditambah:** Pass-through field baru dari Semantic Analyzer V7 ke Upsert.

Tambahkan di bagian **output object** MetadataHub, setelah field-field V12 yang sudah ada:

```javascript
// Tambahkan ke dalam output object MetadataHub:

// [V14] Avoidance fields — dari Semantic Analyzer V7
avoidance_signals:        $('Semantic Analyzer').first().json.avoidance_signals        || null,
thresholds:               $('Semantic Analyzer').first().json.thresholds               || null,
exception_refs:           $('Semantic Analyzer').first().json.exception_refs           || null,
applicable_entity_types:  $('Semantic Analyzer').first().json.applicable_entity_types  || null,
gaar_exposure_level:      $('Domain Scoring Engine').first().json.gaar_exposure_level  || null,
```

### 3.4 Node BARU: Avoidance Signal Extractor (NEW)

**Posisi:** Tambahkan node Code baru **setelah** `Metadata Enricher`, **sebelum** `Quality Gate`.

**Fungsi:** Cross-reference dengan DB — cek apakah ada regulasi lain yang mengatur topik sama (conflict detection saat ingest).

**Tambahkan node Code baru dengan kode:**

```javascript
// ════════════════════════════════════════════════════════════════════════
// AVOIDANCE SIGNAL EXTRACTOR — V1
// Finalizer sinyal celah sebelum masuk Quality Gate.
// Fungsi: 1) Validasi & standardisasi signals dari Semantic Analyzer
//         2) Build exception_refs dari breadcrumb + contains_exception
//         3) Set sunset_clause dari effective_date_end
// ════════════════════════════════════════════════════════════════════════

const items = $input.all();

return items.map(item => {
  const j = { ...item.json };

  // 1. Validasi avoidance_signals — pastikan format benar
  if (j.avoidance_signals && typeof j.avoidance_signals !== 'object') {
    j.avoidance_signals = null;
  }

  // 2. Build exception_refs dari pasal yang contains_exception = true
  if (j.contains_exception === true && j.pasal_number) {
    const ref = [j.doc_type, j.doc_number, 'Tahun', j.doc_year, '-', j.pasal_number]
      .filter(Boolean).join(' ');
    j.exception_refs = j.exception_refs
      ? [...new Set([...j.exception_refs, ref])]
      : [ref];
  }

  // 3. Deteksi sunset clause dari teks
  const text = (j.chunk_text || '').toLowerCase();
  if (
    /berlaku sampai dengan|masa berlaku|dicabut pada|berakhir pada/.test(text)
  ) {
    j.sunset_clause = true;

    // Coba ekstrak tanggal berakhir
    const dateRe = /(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})/gi;
    const dateMatch = dateRe.exec(text);
    if (dateMatch) {
      const bulanMap = {
        januari:'01', februari:'02', maret:'03', april:'04',
        mei:'05', juni:'06', juli:'07', agustus:'08',
        september:'09', oktober:'10', november:'11', desember:'12'
      };
      const tgl = dateMatch[1].padStart(2,'0');
      const bln = bulanMap[dateMatch[2].toLowerCase()] || '01';
      const thn = dateMatch[3];
      j.effective_date_end = `${thn}-${bln}-${tgl}`;
    }
  } else {
    j.sunset_clause = j.sunset_clause || false;
  }

  // 4. Enrich applicable_entity_types dengan default jika kosong
  if (!j.applicable_entity_types || j.applicable_entity_types.length === 0) {
    j.applicable_entity_types = ['SEMUA'];
  }

  // 5. Log summary untuk debug
  const hasSignals = j.avoidance_signals && Object.values(j.avoidance_signals).some(v => v);
  if (hasSignals) {
    console.log(`[AvoidanceExtractor] ${j.relational_id} — signals: ${JSON.stringify(j.avoidance_signals)}`);
  }

  return { json: j };
});
```

### 3.5 Node BARU: Conflict Mapper (NEW)

**Posisi:** Tambahkan node Postgres baru **setelah** `Avoidance Signal Extractor`, **sebelum** `Quality Gate`.

**Fungsi:** Query DB untuk deteksi regulasi lain yang mengatur topik sama — populasi `conflict_refs`.

**Tambahkan node Postgres (Execute Query):**

```sql
-- Cek apakah ada chunk lain di DB yang membahas topik sama
-- dengan doc_type berbeda atau tahun berbeda
SELECT
  doc_type,
  doc_number,
  doc_year,
  pasal_number,
  primary_domain,
  status_hukum,
  1 - (embedding <=> (
    SELECT embedding FROM tax_documents
    WHERE relational_id = $1
    LIMIT 1
  )) AS similarity
FROM tax_documents
WHERE
  relational_id    != $1
  AND primary_domain = $2
  AND status_hukum   = 'BERLAKU'
  AND (
    1 - (embedding <=> (
      SELECT embedding FROM tax_documents WHERE relational_id = $1 LIMIT 1
    ))
  ) > 0.85
  AND (
    doc_type != $3
    OR (doc_type = $3 AND doc_year != $4)
  )
ORDER BY similarity DESC
LIMIT 5;
```

**Parameters:** `[$relational_id, $primary_domain, $doc_type, $doc_year]`

Lalu tambahkan node Code setelah query tersebut untuk build `conflict_refs`:

```javascript
// Node: Build Conflict Refs
const conflicts = $input.all();
const original  = $('Avoidance Signal Extractor').first().json;

if (conflicts.length === 0) {
  return [{ json: { ...original, conflict_refs: null } }];
}

const conflictRefs = conflicts.map(c => ({
  doc_type:      c.json.doc_type,
  doc_number:    c.json.doc_number,
  doc_year:      c.json.doc_year,
  pasal_number:  c.json.pasal_number,
  similarity:    parseFloat(c.json.similarity.toFixed(3)),
  conflict_type: c.json.doc_type !== original.doc_type
    ? 'different_regulation'
    : 'different_version',
  status_hukum: c.json.status_hukum,
}));

return [{
  json: {
    ...original,
    conflict_refs: conflictRefs,
  }
}];
```

### 3.6 Node: Embedding Builder (MODIFY)

**Apa yang ditambah:** Sertakan `avoidance_signals` dalam teks embedding agar retrieval celah lebih akurat.

Tambahkan ke dalam function `buildVectorReadyText` yang sudah ada:

```javascript
// Tambahkan di dalam buildVectorReadyText, setelah sections.push(chunk.chunk_text):

// [V14] Tambahkan sinyal avoidance ke embedding text
if (chunk.avoidance_signals) {
  const signalLabels = Object.entries(chunk.avoidance_signals)
    .filter(([_, v]) => v === true)
    .map(([k]) => k.replace(/_/g, ' '))
    .join(', ');

  if (signalLabels) {
    sections.push(`Celah pajak: ${signalLabels}`);
  }
}

if (chunk.applicable_entity_types && chunk.applicable_entity_types[0] !== 'SEMUA') {
  sections.push(`Berlaku untuk: ${chunk.applicable_entity_types.join(', ')}`);
}

if (chunk.thresholds) {
  const thr = JSON.stringify(chunk.thresholds);
  sections.push(`Threshold: ${thr}`);
}
```

### 3.7 Node: Upsert + Audit Log (MODIFY)

**Apa yang ditambah:** Insert kolom-kolom baru ke SQL.

Tambahkan kolom di bagian **INSERT column list** setelah baris `_rt_similarity, _rt_note, _rt_neighbor_flags`:

```sql
  -- [V14] Avoidance columns
  avoidance_signals,
  thresholds,
  exception_refs,
  conflict_refs,
  applicable_entity_types,
  gaar_exposure_level,
  sunset_clause,
  effective_date_end
```

Tambahkan di **VALUES** setelah `$63::jsonb` (sesuaikan nomor parameter):

```sql
  $64::jsonb,   -- avoidance_signals
  $65::jsonb,   -- thresholds
  $66::text[],  -- exception_refs
  $67::jsonb,   -- conflict_refs
  $68::text[],  -- applicable_entity_types
  $69,          -- gaar_exposure_level
  $70::boolean, -- sunset_clause
  $71::date     -- effective_date_end
```

Tambahkan di **ON CONFLICT DO UPDATE SET**:

```sql
  avoidance_signals        = EXCLUDED.avoidance_signals,
  thresholds               = EXCLUDED.thresholds,
  exception_refs           = EXCLUDED.exception_refs,
  conflict_refs            = EXCLUDED.conflict_refs,
  applicable_entity_types  = EXCLUDED.applicable_entity_types,
  gaar_exposure_level      = EXCLUDED.gaar_exposure_level,
  sunset_clause            = EXCLUDED.sunset_clause,
  effective_date_end       = EXCLUDED.effective_date_end,
```

---

## 4. Week 3 — Query Pipeline V8

> Buat duplicate dari Query Pipeline V7. Rename jadi "Query V8 - Tax Avoidance". Jangan nonaktifkan V7 sampai V8 sudah ditest penuh.

### 4.1 Node: Webhook (MODIFY)

**Apa yang ditambah:** Terima field `client_profile` dan `analysis_mode` di request body.

Tidak ada perubahan konfigurasi n8n — hanya dokumentasikan contract input yang baru:

```json
// Contoh request body V8 (backward compatible — semua field baru opsional)
{
  "query": "bagaimana cara efisiensi pajak dividen antar perusahaan?",
  "jenis_pajak": null,
  "doc_type": null,
  "primary_domain": null,

  // Field BARU — opsional, jika null sistem berjalan seperti V7
  "analysis_mode": "avoidance_analysis",

  "client_profile": {
    "entity_type": "PT",
    "klu_code": "46100",
    "omzet_setahun": 3200000000,
    "is_pkp": true,
    "ada_pemegang_asing": false,
    "ada_afiliasi": true,
    "der_ratio": 2.5,
    "komponen_biaya": {
      "bunga_pinjaman": 150000000,
      "management_fee": 80000000
    },
    "penghasilan_pasif": {
      "dividen": 200000000
    }
  },

  // Opsional: pakai profil tersimpan (lookup ke client_profiles table)
  "client_code": "KLIEN-001"
}
```

### 4.2 Node BARU: Client Context Injector (NEW)

**Posisi:** Tambahkan node Code baru **setelah** `Webhook`, **sebelum** `Pre-FilterAI`.

**Fungsi:** Parse `client_profile` → compute derived fields → build context string yang akan digunakan semua node selanjutnya.

```javascript
// ════════════════════════════════════════════════════════════════════════
// CLIENT CONTEXT INJECTOR — V1
// Node pertama setelah Webhook.
// Fungsi: parse profil klien → compute derived metrics → siapkan context.
// Output tersedia untuk semua node berikut via $('Client Context Injector')
// ════════════════════════════════════════════════════════════════════════

const body          = $input.first().json.body;
const clientProfile = body.client_profile || null;
const analysisMode  = body.analysis_mode  || 'general';

// Jika tidak ada profil, pass-through dengan mode general
if (!clientProfile) {
  return [{
    json: {
      query:          body.query,
      analysis_mode:  'general',
      has_profile:    false,
      client_context: null,
      client_filters: {
        entity_type:    null,
        omzet_bracket:  null,
        jenis_pajak_hint: null,
      }
    }
  }];
}

// ── 1. Computed Metrics ───────────────────────────────────────────────

const omzet   = clientProfile.omzet_setahun || 0;
const hutang  = clientProfile.total_hutang  || 0;
const ekuitas = clientProfile.total_ekuitas || 1;

const isUmkm          = omzet > 0 && omzet <= 4_800_000_000;
const isPP23Eligible  = isUmkm && ['PT','CV','UD','Perorangan'].includes(clientProfile.entity_type);
const computedDer     = clientProfile.der_ratio || (ekuitas > 0 ? hutang / ekuitas : null);
const isThinCapRisk   = computedDer !== null && computedDer > 4.0;
const hasTpRisk       = clientProfile.ada_afiliasi === true || clientProfile.ada_pemegang_asing === true;
const hasP3bOpportunity = clientProfile.ada_pemegang_asing === true &&
                          Array.isArray(clientProfile.negara_pemegang_asing) &&
                          clientProfile.negara_pemegang_asing.length > 0;

// ── 2. Tax Domain Hints (untuk Query Intelligence) ───────────────────

const jenisPajakHints = [];
if (isUmkm || isPP23Eligible)   jenisPajakHints.push('PPh');
if (clientProfile.is_pkp)        jenisPajakHints.push('PPN');
if (hasTpRisk)                   jenisPajakHints.push('PPh');
if (clientProfile.penghasilan_pasif) jenisPajakHints.push('PPh');
const uniqueHints = [...new Set(jenisPajakHints)];

// ── 3. Entity Filter untuk Vector Search ─────────────────────────────

const entityTypeFilters = [clientProfile.entity_type, 'SEMUA'];
if (isUmkm) entityTypeFilters.push('UMKM');
if (hasTpRisk) entityTypeFilters.push('BUT');

// ── 4. Build Client Context String untuk LLM ─────────────────────────

const contextLines = [
  `=== PROFIL KLIEN ===`,
  `Jenis entitas    : ${clientProfile.entity_type}`,
  `KLU              : ${clientProfile.klu_code || 'tidak diisi'} — ${clientProfile.klu_description || ''}`,
  `Omzet setahun    : Rp ${omzet.toLocaleString('id-ID')}`,
  `Status PKP       : ${clientProfile.is_pkp ? 'Ya' : 'Tidak'}`,
  `UMKM eligible    : ${isUmkm ? 'YA — PP 23/2018 tarif 0.5% berlaku' : 'TIDAK — di atas Rp 4,8 Miliar'}`,
  `PP 23 eligible   : ${isPP23Eligible ? 'YA' : 'TIDAK'}`,
  `DER ratio        : ${computedDer !== null ? computedDer.toFixed(2) : 'tidak diketahui'}`,
  `Thin cap risk    : ${isThinCapRisk ? 'YA — DER > 4:1, PMK-169/2015 berlaku' : 'TIDAK'}`,
  `Ada pihak afiliasi: ${clientProfile.ada_afiliasi ? 'YA — Transfer Pricing rules berlaku' : 'Tidak'}`,
  `Ada pemegang asing: ${clientProfile.ada_pemegang_asing ? `YA — Negara: ${(clientProfile.negara_pemegang_asing || []).join(', ')}` : 'Tidak'}`,
  `P3B opportunity  : ${hasP3bOpportunity ? 'YA — cek treaty dengan negara pemegang' : 'Tidak relevan'}`,
];

if (clientProfile.komponen_biaya) {
  const biaya = clientProfile.komponen_biaya;
  contextLines.push(`Komponen biaya besar:`);
  Object.entries(biaya).forEach(([k, v]) => {
    contextLines.push(`  - ${k}: Rp ${Number(v).toLocaleString('id-ID')}`);
  });
}

if (clientProfile.penghasilan_pasif) {
  const pasif = clientProfile.penghasilan_pasif;
  contextLines.push(`Penghasilan pasif:`);
  Object.entries(pasif).forEach(([k, v]) => {
    contextLines.push(`  - ${k}: Rp ${Number(v).toLocaleString('id-ID')}`);
  });
}

contextLines.push(`=== AKHIR PROFIL KLIEN ===`);

// ── 5. Output ─────────────────────────────────────────────────────────

return [{
  json: {
    query:         body.query,
    analysis_mode: analysisMode,
    has_profile:   true,

    // Dipakai oleh Query Intelligence
    client_context_string: contextLines.join('\n'),

    // Dipakai oleh Postgres Vector Search sebagai filter
    client_filters: {
      entity_type:         clientProfile.entity_type,
      entity_type_filters: entityTypeFilters,
      omzet_bracket:       isUmkm ? 'UMKM' : 'NON_UMKM',
      jenis_pajak_hint:    uniqueHints.join(','),
      is_umkm:             isUmkm,
      is_pp23_eligible:    isPP23Eligible,
      has_tp_risk:         hasTpRisk,
      is_thin_cap_risk:    isThinCapRisk,
      has_p3b_opportunity: hasP3bOpportunity,
      computed_der:        computedDer,
    },

    // Untuk Avoidance Matcher
    client_computed: {
      omzet,
      is_umkm:          isUmkm,
      is_pp23_eligible: isPP23Eligible,
      computed_der:     computedDer,
      is_thin_cap:      isThinCapRisk,
      has_tp_risk:      hasTpRisk,
    },

    raw_profile: clientProfile,
  }
}];
```

### 4.3 Node: Query Intelligence (MODIFY)

**Apa yang ditambah:** Mode avoidance — expand query ke terminologi celah hukum, sertakan profil klien.

Edit `jsonBody` pada HTTP Request node. Ganti bagian `content` di system prompt dan user message:

```javascript
// System prompt baru (replace yang lama sepenuhnya):
const systemPrompt = `Kamu adalah analis query hukum pajak Indonesia. Tugasmu menganalisis pertanyaan user dan mengembalikan JSON murni tanpa preamble, tanpa backtick.

Struktur output WAJIB:
{
  "jenis_pajak": "PPh|PPN|PPnBM|PBB|Bea_Cukai|KUP|Umum|null",
  "doc_type": "UU|PP|PMK|PER|KMK|SE|null",
  "primary_domain": "PPh|PPN|PPnBM|Bea Meterai|PBB|KUP|Cukai|TRANSFER_PRICING|P3B|GAAR|TAX_FACILITY|UMUM|null",
  "expanded_queries": ["reformulasi 1", "reformulasi 2", "reformulasi 3"],
  "avoidance_keywords": ["kata kunci celah 1", "kata kunci celah 2"]
}

Panduan avoidance_keywords (WAJIB jika mode=avoidance_analysis):
- Tambahkan terminologi celah hukum: "dikecualikan dari", "tidak dikenakan", "tidak termasuk objek pajak"
- Tambahkan terminologi threshold: "peredaran bruto", "tidak melebihi", "tarif final"
- Tambahkan terminologi entitas: jenis entitas yang relevan untuk celah tersebut
- Tambahkan terminologi GAAR jika relevan: "substansi ekonomi", "hubungan istimewa"
- Minimum 3 keywords, maksimum 7`;

// User message baru:
const userMsg = `Mode analisis: ${$('Client Context Injector').first().json.analysis_mode}

Pertanyaan: "${$('Webhook').first().json.body.query}"

${$('Client Context Injector').first().json.has_profile
  ? 'Profil klien:\n' + $('Client Context Injector').first().json.client_context_string
  : 'Tidak ada profil klien.'}

Filter eksplisit dari user (jika ada, set field terkait = null):
- jenis_pajak: ${$('Webhook').first().json.body.jenis_pajak || 'tidak ada'}
- doc_type: ${$('Webhook').first().json.body.doc_type || 'tidak ada'}
- primary_domain: ${$('Webhook').first().json.body.primary_domain || 'tidak ada'}`;
```

### 4.4 Node: Postgres Vector Search (MODIFY)

**Apa yang ditambah:** Filter berdasarkan `applicable_entity_types` dan `avoidance_signals` jika mode avoidance. Tambah kolom baru di SELECT.

```sql
SET LOCAL hnsw.ef_search = 200;

WITH client_info AS (
  -- Parse mode dan filter klien dari parameter
  SELECT
    $5::text AS analysis_mode,
    $6::text AS entity_type,
    $7::boolean AS is_avoidance_mode
),
vector_candidates AS (
  SELECT
    id,
    doc_type, doc_number, doc_year, pasal_number,
    chunk_text, chunk_summary, source_url, doc_title,
    status_hukum, jenis_pajak, chunk_index, total_chunks,
    hierarchy_level, semantic_type, semantic_types,
    primary_domain, domain_tags,
    contains_definition, contains_sanction, contains_obligation,
    contains_procedure, contains_exception, contains_timeline,
    retrieval_boost, semantic_importance, quality_score,
    relational_id, breadcrumb,
    -- [V14] Kolom baru
    avoidance_signals, thresholds, exception_refs,
    conflict_refs, applicable_entity_types, gaar_exposure_level,
    sunset_clause, effective_date_end,
    1 - (embedding <=> $1::vector) AS similarity
  FROM tax_documents
  WHERE
    status_hukum     = 'BERLAKU'
    AND embedding_validated = true
    AND embedding_ready     = true
    AND quality_score      >= 0.5
    AND (1 - (embedding <=> $1::vector)) >= 0.25
    -- Filter jenis_pajak (existing)
    AND ($2::text IS NULL OR jenis_pajak = $2 OR jenis_pajak = 'Umum')
    -- Filter doc_type (existing)
    AND ($3::text IS NULL OR doc_type = $3)
    -- Filter primary_domain (existing)
    AND ($4::text IS NULL OR primary_domain = $4 OR primary_domain = 'UMUM' OR primary_domain = 'MULTI_DOMAIN')
    -- [V14] Filter entity type jika ada profil klien
    AND (
      $6::text IS NULL
      OR applicable_entity_types IS NULL
      OR applicable_entity_types @> ARRAY[$6::text]
      OR applicable_entity_types @> ARRAY['SEMUA']
    )
    -- [V14] Prioritas dokumen dengan avoidance signals jika mode avoidance
    -- (bukan hard filter — dokumen tanpa signals tetap masuk, tapi di-boost)
  LIMIT 60
),
scored AS (
  SELECT
    *,
    (
      similarity
      * COALESCE(retrieval_boost, 1.0)
      * COALESCE(quality_score, 0.8)
      -- [V14] Boost dokumen dengan avoidance signals saat mode avoidance
      * CASE
          WHEN (SELECT is_avoidance_mode FROM client_info) = true
               AND avoidance_signals IS NOT NULL
               AND avoidance_signals != '{}'::jsonb
          THEN 1.25
          ELSE 1.0
        END
      -- Boost dokumen dengan GAAR exposure yang diketahui (lebih informatif)
      * CASE WHEN gaar_exposure_level IS NOT NULL THEN 1.10 ELSE 1.0 END
    ) AS hybrid_score
  FROM vector_candidates
)
SELECT *
FROM scored
ORDER BY hybrid_score DESC, doc_year DESC
LIMIT 25;
```

**Parameters yang dikirim (update di node settings):**
```
$1 = embedding vector
$2 = jenis_pajak filter
$3 = doc_type filter
$4 = primary_domain filter
$5 = analysis_mode (dari Client Context Injector)
$6 = entity_type klien (dari Client Context Injector)
$7 = is_avoidance_mode boolean
```

### 4.5 Node: Format Context for LLM (MODIFY)

**Apa yang ditambah:** Tampilkan avoidance_signals, thresholds, conflict_refs, dan client profile summary di context yang masuk ke LLM.

Tambahkan di **awal** function, setelah `const originalQuery = ...`:

```javascript
// [V8] Ambil client context
const clientContextStr = $('Client Context Injector').first().json.client_context_string || null;
const analysisMode     = $('Client Context Injector').first().json.analysis_mode || 'general';
```

Tambahkan di dalam loop `contextParts` mapping, setelah `semanticBadges`:

```javascript
// [V8] Avoidance info
const avoidanceParts = [];
if (d.avoidance_signals) {
  const signals = Object.entries(d.avoidance_signals)
    .filter(([_, v]) => v === true)
    .map(([k]) => k.replace(/_/g, ' '));
  if (signals.length > 0) {
    avoidanceParts.push(`Sinyal Celah: ${signals.join(' | ')}`);
  }
}
if (d.thresholds) {
  avoidanceParts.push(`Threshold: ${JSON.stringify(d.thresholds)}`);
}
if (d.gaar_exposure_level) {
  avoidanceParts.push(`Risiko GAAR: ${d.gaar_exposure_level}`);
}
if (d.conflict_refs && d.conflict_refs.length > 0) {
  const conflictList = d.conflict_refs
    .map(c => `${c.doc_type} ${c.doc_number}/${c.doc_year} (${c.conflict_type})`)
    .join(', ');
  avoidanceParts.push(`KONFLIK: Ada regulasi lain: ${conflictList}`);
}
if (d.applicable_entity_types && d.applicable_entity_types[0] !== 'SEMUA') {
  avoidanceParts.push(`Berlaku untuk: ${d.applicable_entity_types.join(', ')}`);
}
```

Tambahkan `avoidanceParts.join('\n')` ke dalam `parts` array di contextParts.

Tambahkan **sebelum** `return [{json: {...}}]`:

```javascript
// [V8] Prepend profil klien ke context jika ada
const clientPrefix = clientContextStr
  ? `${clientContextStr}\n\n${'='.repeat(60)}\nDOKUMEN REGULASI RELEVAN:\n${'='.repeat(60)}\n\n`
  : '';
```

Ubah `context: contextText + conflictSummary` menjadi:
```javascript
context: clientPrefix + contextText + conflictSummary,
```

### 4.6 Node BARU: Avoidance Matcher (NEW)

**Posisi:** Tambahkan node Code baru **setelah** `Format Context for LLM`, **sebelum** `LLM Synthesis`.

**Fungsi:** Match thresholds dari dokumen yang ditemukan vs angka aktual klien. Output: daftar celah yang sudah dikonfirmasi applicable.

```javascript
// ════════════════════════════════════════════════════════════════════════
// AVOIDANCE MATCHER — V1
// Match sinyal celah dari regulasi terhadap profil aktual klien.
// Output: applicable_gaps[] — celah yang SUDAH dikonfirmasi berlaku.
// ════════════════════════════════════════════════════════════════════════

const contextData   = $('Format Context for LLM').first().json;
const clientComputed = $('Client Context Injector').first().json.client_computed || null;
const analysisMode  = $('Client Context Injector').first().json.analysis_mode;
const chunks        = $('Parse Rerank Results').all();

// Jika bukan mode avoidance atau tidak ada profil, skip
if (analysisMode !== 'avoidance_analysis' || !clientComputed) {
  return [{
    json: {
      ...contextData,
      applicable_gaps: [],
      avoidance_summary: null,
    }
  }];
}

const gaps = [];

for (const chunk of chunks) {
  const d = chunk.json;
  if (!d.avoidance_signals) continue;

  const sig = d.avoidance_signals;
  const thr = d.thresholds || {};
  const ref = `${d.doc_type} ${d.doc_number} Tahun ${d.doc_year} ${d.pasal_number || ''}`.trim();

  // ── PP 23/2018 UMKM Gap ──────────────────────────────────────────────
  if (
    sig.threshold_arbitrage &&
    clientComputed.is_pp23_eligible &&
    (thr.umkm_threshold || thr.nilai_rupiah)
  ) {
    gaps.push({
      gap_type:     'PP_23_UMKM_TARIF',
      description:  'Tarif PPh final 0,5% dari peredaran bruto (PP 23/2018) berlaku',
      dasar_hukum:  ref,
      applicable:   true,
      kalkulasi: thr.umkm_threshold
        ? `Omzet klien Rp ${clientComputed.omzet.toLocaleString('id-ID')} < threshold Rp ${thr.umkm_threshold.toLocaleString('id-ID')}`
        : null,
      gaar_exposure: d.gaar_exposure_level || 'LOW',
    });
  }

  // ── Thin Cap Risk ────────────────────────────────────────────────────
  if (
    sig.threshold_arbitrage &&
    clientComputed.is_thin_cap !== undefined &&
    thr.der_max
  ) {
    gaps.push({
      gap_type:    'THIN_CAP_DER',
      description: `DER klien ${clientComputed.computed_der?.toFixed(2) || 'n/a'} vs batas ${thr.der_max}:1 (PMK-169/2015)`,
      dasar_hukum: ref,
      applicable:  clientComputed.is_thin_cap,
      kalkulasi:   clientComputed.computed_der
        ? `DER ${clientComputed.computed_der.toFixed(2)}:1 — ${clientComputed.is_thin_cap ? 'MELEBIHI batas, bunga tidak dapat dikurangkan penuh' : 'masih dalam batas aman'}`
        : null,
      gaar_exposure: 'MEDIUM',
    });
  }

  // ── Exception Clause Gap ─────────────────────────────────────────────
  if (sig.exception_clause && d.applicable_entity_types) {
    const isRelevant =
      d.applicable_entity_types.includes('SEMUA') ||
      d.applicable_entity_types.includes(clientComputed.entity_type);
    if (isRelevant) {
      gaps.push({
        gap_type:    'EXCEPTION_CLAUSE',
        description: `Pengecualian dari ${d.primary_domain} berlaku untuk ${d.applicable_entity_types.join('/')}`,
        dasar_hukum: ref,
        applicable:  true,
        kalkulasi:   null,
        gaar_exposure: d.gaar_exposure_level || 'LOW',
        note:        d.exception_refs ? `Lihat: ${d.exception_refs.join(', ')}` : null,
      });
    }
  }

  // ── Transfer Pricing Risk ────────────────────────────────────────────
  if (sig.cross_border_gap && clientComputed.has_tp_risk) {
    gaps.push({
      gap_type:    'TRANSFER_PRICING',
      description: 'Aturan transfer pricing berlaku — dokumentasi TP wajib disiapkan',
      dasar_hukum: ref,
      applicable:  true,
      kalkulasi:   null,
      gaar_exposure: 'HIGH',
      note:        'Risiko koreksi DJP tinggi tanpa dokumentasi arm\'s length yang memadai',
    });
  }
}

// Deduplicate by gap_type + dasar_hukum
const seen = new Set();
const uniqueGaps = gaps.filter(g => {
  const key = `${g.gap_type}|${g.dasar_hukum}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

return [{
  json: {
    ...contextData,
    applicable_gaps: uniqueGaps,
    avoidance_summary: uniqueGaps.length > 0
      ? `Ditemukan ${uniqueGaps.length} celah potensial untuk profil klien ini.`
      : 'Tidak ditemukan celah spesifik berdasarkan profil klien.',
  }
}];
```

### 4.7 Node BARU: Risk Scorer (NEW)

**Posisi:** Tambahkan node Code baru **setelah** `Avoidance Matcher`, **sebelum** `LLM Synthesis`.

```javascript
// ════════════════════════════════════════════════════════════════════════
// RISK SCORER — V1
// Hitung risk score per celah: GAAR exposure + conflict refs + substance.
// ════════════════════════════════════════════════════════════════════════

const matcherData  = $('Avoidance Matcher').first().json;
const gaps         = matcherData.applicable_gaps || [];
const chunks       = $('Parse Rerank Results').all();

// Build lookup: dasar_hukum → chunk data
const chunkLookup = {};
for (const c of chunks) {
  const key = `${c.json.doc_type} ${c.json.doc_number} Tahun ${c.json.doc_year}`.trim();
  chunkLookup[key] = c.json;
}

// GAAR exposure → numeric score
const gaarScore = { LOW: 10, MEDIUM: 45, HIGH: 80 };

const scoredGaps = gaps.map(gap => {
  let score = gaarScore[gap.gaar_exposure] || 20;

  // Cari chunk yang relevan
  const refKey = gap.dasar_hukum.replace(/\s+Pasal.*$/, '').trim();
  const chunk  = chunkLookup[refKey];

  let riskFactors   = [];
  let mitigations   = [];

  if (chunk) {
    // Faktor risiko dari conflict_refs
    if (chunk.conflict_refs && chunk.conflict_refs.length > 0) {
      score += 10;
      riskFactors.push('Ada regulasi lain yang mengatur hal sama — posisi hukum belum final');
    }

    // Faktor risiko dari sunset clause
    if (chunk.sunset_clause && chunk.effective_date_end) {
      const endDate = new Date(chunk.effective_date_end);
      const now     = new Date();
      if (endDate > now) {
        riskFactors.push(`Regulasi berakhir pada ${chunk.effective_date_end} — segera manfaatkan sebelum expired`);
      }
    }

    // Mitigasi jika ada precedent (from yurisprudensi)
    if (chunk.doc_type === 'PUTUSAN') {
      score -= 15;
      mitigations.push('Ada putusan pengadilan pajak yang mendukung posisi ini');
    }
  }

  // Faktor risiko berdasarkan tipe celah
  if (gap.gap_type === 'TRANSFER_PRICING') {
    score = Math.min(score + 20, 100);
    riskFactors.push('DJP aktif memeriksa transaksi afiliasi — dokumentasi TP wajib');
    mitigations.push('Siapkan Transfer Pricing Documentation sesuai PMK-172/2023');
  }

  if (gap.gap_type === 'EXCEPTION_CLAUSE') {
    riskFactors.push('Pastikan memenuhi SEMUA syarat pengecualian — partial compliance = tidak eligible');
  }

  if (gap.gap_type === 'PP_23_UMKM_TARIF') {
    mitigations.push('Tarif eksplisit dalam PP — risiko rekarakterisasi sangat rendah');
    mitigations.push('Hitung agregat omzet dari SEMUA sumber usaha, bukan per-entitas');
  }

  // Risk label
  const riskLabel = score >= 70 ? 'TINGGI' : score >= 40 ? 'SEDANG' : 'RENDAH';

  return {
    ...gap,
    risk_score:   Math.min(Math.max(score, 0), 100),
    risk_label:   riskLabel,
    risk_factors: riskFactors,
    mitigations:  mitigations,
  };
});

// Sort by risk score ascending (celah paling aman dulu)
scoredGaps.sort((a, b) => a.risk_score - b.risk_score);

return [{
  json: {
    ...matcherData,
    applicable_gaps: scoredGaps,
    risk_summary: {
      total_gaps:  scoredGaps.length,
      low_risk:    scoredGaps.filter(g => g.risk_label === 'RENDAH').length,
      medium_risk: scoredGaps.filter(g => g.risk_label === 'SEDANG').length,
      high_risk:   scoredGaps.filter(g => g.risk_label === 'TINGGI').length,
    }
  }
}];
```

### 4.8 Node: LLM Synthesis (MODIFY)

**Apa yang ditambah:** System prompt baru dengan mode `avoidance_analysis`. Ganti `jsonBody` sepenuhnya:

```javascript
// Ambil data dari pipeline
const riskData      = $('Risk Scorer').first().json;
const analysisMode  = $('Client Context Injector').first().json.analysis_mode || 'general';
const hasProfile    = $('Client Context Injector').first().json.has_profile;
const applicableGaps = riskData.applicable_gaps || [];

// System prompt berdasarkan mode
const systemPromptGeneral = `Kamu adalah asisten hukum pajak Indonesia yang sangat presisi. Tugasmu HANYA menjawab berdasarkan dokumen peraturan yang diberikan.

ATURAN MUTLAK:
1. HANYA gunakan informasi yang ADA di konteks. DILARANG menggunakan pengetahuan internal LLM.
2. Jika informasi tidak tersedia, jawab: "Informasi ini tidak tersedia dalam basis data peraturan."
3. SETIAP klaim hukum WAJIB disertai: nama peraturan, nomor, tahun, pasal/ayat.
4. Jika ada konflik antar sumber: sebutkan konflik, gunakan hierarki (UU > PP > PMK > PER > KMK > SE), dan tahun terbaru.
5. DILARANG menyimpulkan atau mengekstrapolasi aturan yang tidak eksplisit tertulis.
6. Akhiri SELALU dengan: "Jawaban ini hanya berdasarkan dokumen dalam database. Konsultasikan dengan konsultan pajak berlisensi untuk keputusan bisnis."`;

const systemPromptAvoidance = `Kamu adalah tax consultant senior Indonesia yang menganalisis peluang efisiensi pajak secara legal. Tugasmu mengidentifikasi celah, strategi, dan risiko berdasarkan dokumen regulasi yang diberikan DAN profil klien yang tersedia.

FORMAT OUTPUT WAJIB untuk setiap celah/strategi yang ditemukan:

**[Nama Strategi]**
- Mekanisme: [jelaskan cara kerjanya]
- Dasar Hukum: [nama regulasi, nomor, tahun, pasal yang EKSPLISIT mendukung]
- Applicable untuk klien ini karena: [hubungkan dengan kondisi spesifik klien]
- Estimasi dampak: [hitung berdasarkan angka klien jika memungkinkan]
- Level risiko: [RENDAH/SEDANG/TINGGI] — [jelaskan faktor risiko spesifik]
- Syarat & kondisi: [apa yang harus dipenuhi agar celah ini valid]
- Action items: [langkah konkret yang perlu dilakukan]

ATURAN KHUSUS MODE AVOIDANCE:
1. Prioritaskan celah yang sudah di-highlight di bagian "Sinyal Celah" di setiap sumber.
2. Gunakan angka aktual dari profil klien untuk kalkulasi — bukan angka ilustrasi.
3. WAJIB sebutkan risiko GAAR (General Anti-Avoidance Rule Pasal 18 UU PPh) jika relevan.
4. Jika ada conflict_refs pada sumber, nyatakan posisi hukum "belum final" untuk celah tersebut.
5. Urutkan rekomendasi dari risiko paling rendah ke tertinggi.
6. DILARANG merekomendasikan celah yang tidak memiliki dasar hukum eksplisit di konteks.
7. Akhiri dengan disclaimer wajib.`;

// Pre-analyzed gaps sebagai context tambahan
const gapContext = applicableGaps.length > 0
  ? `\n\n=== PRE-ANALYZED GAPS (dari sistem) ===\n` +
    applicableGaps.map((g, i) =>
      `${i+1}. [${g.risk_label} - Score ${g.risk_score}] ${g.gap_type}: ${g.description}\n   Dasar: ${g.dasar_hukum}\n   ${g.kalkulasi || ''}`
    ).join('\n') +
    `\n=== GUNAKAN SEBAGAI REFERENSI, KONFIRMASI DENGAN DOKUMEN DI ATAS ===`
  : '';

return {
  model:       $env.OPENROUTER_INGESTION_MODEL,
  temperature: 0.0,
  max_tokens:  3000,
  messages: [
    {
      role:    'system',
      content: analysisMode === 'avoidance_analysis' ? systemPromptAvoidance : systemPromptGeneral,
    },
    {
      role: 'user',
      content: `Pertanyaan: ${riskData.query}

Tingkat Kepercayaan Sumber: ${riskData.confidence}

${riskData.context}
${gapContext}

${analysisMode === 'avoidance_analysis'
  ? 'Berikan analisis tax planning komprehensif berdasarkan profil klien dan regulasi di atas.'
  : 'Berikan jawaban berdasarkan HANYA peraturan di atas.'
}`,
    }
  ]
};
```

### 4.9 Node: Format Final Output (MODIFY)

**Apa yang ditambah:** Field baru di response JSON.

```javascript
return [{
  json: {
    // Field existing
    answer:       $json.choices[0].message.content,
    sources:      $('Format Context for LLM').first().json.sources,
    query:        $('Format Context for LLM').first().json.query,
    confidence:   $('Format Context for LLM').first().json.confidence,
    rerank_score: $('Parse Rerank Results').first().json.rerank_score,

    // [V8] Field baru
    analysis_mode:    $('Client Context Injector').first().json.analysis_mode,
    has_client_profile: $('Client Context Injector').first().json.has_profile,
    applicable_gaps:  $('Risk Scorer').first().json.applicable_gaps || [],
    risk_summary:     $('Risk Scorer').first().json.risk_summary    || null,
    avoidance_summary: $('Avoidance Matcher').first().json.avoidance_summary || null,

    // Metadata
    timestamp:    new Date().toISOString(),
    pipeline_version: 'V8',
  }
}];
```

---

## 5. Week 4 — Re-ingest & Tuning

### 5.1 Re-ingest corpus

Setelah Ingestion V14 aktif, semua dokumen lama perlu di-re-ingest agar kolom `avoidance_signals` dan `thresholds` terisi.

```sql
-- Reset status untuk trigger re-ingest
-- Jalankan per batch 50 dokumen, bukan sekaligus

-- Cek berapa dokumen yang perlu di-re-ingest
SELECT COUNT(DISTINCT source_url)
FROM tax_documents
WHERE avoidance_signals IS NULL
  AND ingestion_status = 'COMPLETE';

-- Update status untuk trigger re-ingest (batch pertama - uji dengan 10 dulu)
UPDATE tax_documents
SET ingestion_status = 'PENDING_REINGEST'
WHERE source_url IN (
  SELECT DISTINCT source_url
  FROM tax_documents
  WHERE avoidance_signals IS NULL
    AND ingestion_status = 'COMPLETE'
  LIMIT 10
);
```

### 5.2 Dokumen prioritas untuk ingest baru

Ingest dokumen-dokumen ini (belum ada di corpus lama) untuk melengkapi kemampuan analisis:

| Prioritas | Jenis | Contoh |
|---|---|---|
| Kritis | PP 23/2018 | Tarif PPh UMKM |
| Kritis | PMK-169/PMK.010/2015 | Thin capitalization |
| Kritis | PMK-172/PMK.03/2023 | Transfer Pricing baru |
| Kritis | UU HPP (UU 7/2021) | Harmonisasi Peraturan Pajak |
| Tinggi | Putusan Pengadilan Pajak | Yurisprudensi celah TP |
| Tinggi | 68 P3B Indonesia | Treaty shopping analysis |
| Sedang | SE-DJP tentang hubungan istimewa | Penegasan interpretasi |
| Sedang | PMK tentang tax holiday | Fasilitas sektoral |
| Opsional | APA (Advance Pricing Agreement) | Ruling TP |

### 5.3 Test cases untuk validasi

```bash
# Test 1: General mode (backward compatibility)
curl -X POST https://your-n8n.com/webhook/tax-query-v8 \
  -H "Content-Type: application/json" \
  -d '{"query": "apa itu pajak penghasilan badan?"}'

# Expected: jawaban seperti V7, analysis_mode=general, applicable_gaps=[]

# Test 2: Avoidance mode tanpa profil
curl -X POST https://your-n8n.com/webhook/tax-query-v8 \
  -H "Content-Type: application/json" \
  -d '{"query": "bagaimana cara hemat pajak UMKM?", "analysis_mode": "avoidance_analysis"}'

# Expected: analisis umum, has_client_profile=false

# Test 3: Avoidance mode dengan profil UMKM
curl -X POST https://your-n8n.com/webhook/tax-query-v8 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "bagaimana efisiensi pajak untuk usaha perdagangan kami?",
    "analysis_mode": "avoidance_analysis",
    "client_profile": {
      "entity_type": "PT",
      "omzet_setahun": 3200000000,
      "is_pkp": false
    }
  }'

# Expected: applicable_gaps dengan PP_23_UMKM_TARIF, risk_label=RENDAH

# Test 4: Avoidance mode dengan TP risk
curl -X POST https://your-n8n.com/webhook/tax-query-v8 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "bagaimana mengelola biaya management fee ke induk perusahaan?",
    "analysis_mode": "avoidance_analysis",
    "client_profile": {
      "entity_type": "PT",
      "omzet_setahun": 50000000000,
      "is_pkp": true,
      "ada_afiliasi": true,
      "ada_pemegang_asing": true,
      "negara_pemegang_asing": ["SG"],
      "total_hutang": 8000000000,
      "total_ekuitas": 2000000000,
      "komponen_biaya": {"management_fee": 2000000000}
    }
  }'

# Expected: TRANSFER_PRICING gap dengan risk_label=TINGGI, THIN_CAP gap MEDIUM
```

### 5.4 Monitoring queries berguna

```sql
-- Cek distribusi avoidance signals setelah re-ingest
SELECT
  (avoidance_signals->>'threshold_arbitrage')::boolean AS threshold,
  (avoidance_signals->>'exception_clause')::boolean    AS exception,
  (avoidance_signals->>'cross_border_gap')::boolean    AS cross_border,
  COUNT(*) AS total_chunks
FROM tax_documents
WHERE avoidance_signals IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY total_chunks DESC;

-- Cek distribusi GAAR exposure
SELECT gaar_exposure_level, COUNT(*) AS total
FROM tax_documents
WHERE gaar_exposure_level IS NOT NULL
GROUP BY 1 ORDER BY 2 DESC;

-- Dokumen dengan konflik (conflict_refs terisi)
SELECT doc_type, doc_number, doc_year, pasal_number,
       jsonb_array_length(conflict_refs) AS conflict_count
FROM tax_documents
WHERE conflict_refs IS NOT NULL
  AND jsonb_array_length(conflict_refs) > 0
ORDER BY conflict_count DESC
LIMIT 20;

-- Quality check: berapa chunk yang applicable untuk 'PT'
SELECT COUNT(*) FROM tax_documents
WHERE applicable_entity_types @> ARRAY['PT']
  AND avoidance_signals IS NOT NULL;
```

---

## 6. Referensi Lengkap Node

### Flow diagram Ingestion V14

```
Google Sheets Trigger
  → ParseJDIHURL
  → Early Check → Early Gate
  → Set Ingestion In Progress
  → [GetAPIDataJDIH | GetPDF | GetHTML]
  → [ExtractPDF | ExtractHTML]
  → MergeBestSource
  → ParseJDIHResponse
  → ParseRiwayatDoc
  → MetadataHub V13          ← MODIFIED
  → Regex Cleanup
  → Legal AST Parser V6      ← KEEP
  → Adaptive Token Chunker V6 ← KEEP
  → Semantic Analyzer V7     ← MODIFIED (+ avoidance detection)
  → Domain Scoring Engine V3 ← MODIFIED (+ TP/P3B/GAAR domains)
  → Metadata Enricher V4     ← KEEP
  → Avoidance Signal Extractor V1  ← NEW
  → Conflict Mapper V1             ← NEW (Postgres + Code)
  → Quality Gate V2          ← KEEP
  → Embedding Builder V14    ← MODIFIED (+ avoidance in embedding)
  → FINGERPRINT HASH         ← KEEP
  → Embedding (API Call)     ← KEEP
  → Embedding Quality Validator ← KEEP
  → Reconstruction Test      ← KEEP
  → Quality check?           ← KEEP
  → Upsert + Audit Log V14  ← MODIFIED (+ new columns)
  → Finalizer                ← KEEP
  → UpdateStatusGS           ← KEEP
```

### Flow diagram Query V8

```
Webhook (expanded body)
  → Client Context Injector V1    ← NEW
  → Pre-FilterAI: Cek Relevansi   ← KEEP
  → [If1 → Format Off-Topic]      ← KEEP
  → Query Intelligence V8         ← MODIFIED
  → Parse Query Intelligence V8   ← MODIFIED
  → Embed User Query              ← KEEP
  → Merge Multi Embeddings        ← KEEP
  → Postgres Vector Search V8     ← MODIFIED (new columns + filter)
  → [If → Format No Data]         ← KEEP
  → OpenRouter Rerank             ← KEEP
  → Parse Rerank Results          ← KEEP
  → Format Context for LLM V8    ← MODIFIED (avoidance context)
  → Avoidance Matcher V1          ← NEW
  → Risk Scorer V1                ← NEW
  → Cek Relevance Score           ← KEEP
  → [False → Format Bypass Output] ← KEEP
  → [True → LLM Synthesis V8]     ← MODIFIED (new prompt)
  → Format Final Output V8        ← MODIFIED (new fields)
  → Respond to Webhook            ← KEEP
```

### Environment variables yang dibutuhkan

```bash
# Existing (tidak berubah)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_EMBEDDING_MODEL=text-embedding-3-large
OPENROUTER_INGESTION_MODEL=anthropic/claude-sonnet-4-5

# Tidak ada env var baru yang dibutuhkan
# Semua konfigurasi baru di-hardcode di node atau diterima via webhook body
```

### Struktur response V8 lengkap

```json
{
  "answer": "string — analisis naratif dari LLM",
  "sources": [
    {
      "doc_type": "PP",
      "doc_number": "23",
      "doc_year": "2018",
      "pasal_number": "Pasal 2",
      "doc_title": "..."
    }
  ],
  "query": "string — query original",
  "confidence": "HIGH|MEDIUM|LOW",
  "rerank_score": 0.87,
  "analysis_mode": "avoidance_analysis",
  "has_client_profile": true,
  "applicable_gaps": [
    {
      "gap_type": "PP_23_UMKM_TARIF",
      "description": "Tarif PPh final 0,5% berlaku",
      "dasar_hukum": "PP 23 Tahun 2018 Pasal 2",
      "applicable": true,
      "kalkulasi": "Omzet Rp 3,2M < Rp 4,8M",
      "gaar_exposure": "LOW",
      "risk_score": 8,
      "risk_label": "RENDAH",
      "risk_factors": [],
      "mitigations": ["Tarif eksplisit dalam PP — risiko sangat rendah"]
    }
  ],
  "risk_summary": {
    "total_gaps": 2,
    "low_risk": 1,
    "medium_risk": 1,
    "high_risk": 0
  },
  "avoidance_summary": "Ditemukan 2 celah potensial untuk profil klien ini.",
  "timestamp": "2026-05-26T10:00:00.000Z",
  "pipeline_version": "V8"
}
```

---

*Implementation guide ini dibuat berdasarkan analisis kode aktual dari Ingestion Pipeline V13 dan Query Pipeline V7. Semua node reference menggunakan nama exact dari workflow yang ada.*
