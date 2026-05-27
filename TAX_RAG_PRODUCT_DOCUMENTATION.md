# Tax RAG — Dokumentasi Produk
## Fungsi Saat Ini & Roadmap Masa Depan

**Versi sistem:** Ingestion V14 · Query V8  
**Dibuat:** Mei 2026  
**Tujuan dokumen:** Referensi produk — apa yang sudah bisa dilakukan sistem ini hari ini, dan ke mana sistem ini akan berkembang.

---

## Daftar Isi

1. [Apa Sistem Ini](#1-apa-sistem-ini)
2. [Fungsi yang Berjalan Saat Ini](#2-fungsi-yang-berjalan-saat-ini)
3. [Keterbatasan Saat Ini](#3-keterbatasan-saat-ini)
4. [Roadmap Masa Depan](#4-roadmap-masa-depan)
5. [Nilai Bisnis](#5-nilai-bisnis)

---

## 1. Apa Sistem Ini

Tax RAG adalah sistem kecerdasan buatan berbasis Retrieval-Augmented Generation yang dirancang khusus untuk domain perpajakan Indonesia. Sistem ini menggabungkan dua kemampuan utama: memahami struktur hukum pajak secara mendalam, dan mencocokkan regulasi tersebut dengan situasi spesifik seorang klien.

Berbeda dengan chatbot pajak biasa yang menjawab berdasarkan pengetahuan umum LLM, sistem ini **hanya menjawab berdasarkan dokumen hukum yang sudah diverifikasi** — setiap jawaban selalu disertai referensi pasal dan hierarki regulasi yang jelas. Ini yang membuat jawabannya dapat dipertanggungjawabkan secara hukum.

Sistem berjalan di atas tiga komponen utama: **n8n** sebagai workflow engine, **PostgreSQL + pgvector** sebagai database dokumen hukum, dan **OpenRouter** sebagai gateway ke model LLM dan embedding.

---

## 2. Fungsi yang Berjalan Saat Ini

### 2.1 Ingestion Pipeline — Memahami Dokumen Hukum

Ini adalah "otak" yang membaca dan memahami dokumen sebelum disimpan. Bukan sekadar menyimpan teks — sistem ini membedah setiap dokumen hingga level semantik.

---

**Pengambilan Dokumen Otomatis**

Sistem dapat mengambil dokumen dari tiga sumber secara otomatis berdasarkan input di Google Sheets: API JDIH Kemenkeu, file PDF langsung, dan halaman HTML regulasi. Ketiga jalur ini berjalan paralel dengan fallback otomatis — jika satu sumber gagal, sistem mencoba sumber lain. Ini artinya tim tidak perlu meng-upload dokumen satu per satu secara manual.

---

**Legal AST Parser — Pembedahan Struktur Hukum**

Dokumen hukum Indonesia memiliki hierarki yang sangat spesifik: Bab → Pasal → Ayat → Huruf → Angka. Parser ini memahami hierarki tersebut dan memotong dokumen bukan berdasarkan jumlah karakter, melainkan berdasarkan unit makna hukum.

Hasilnya, setiap potongan teks (chunk) yang masuk ke database selalu merupakan satu unit hukum yang utuh — tidak pernah memotong di tengah pasal atau memisahkan ayat dari pasalnya. Ini fondasi yang membuat retrieval akurat.

---

**Semantic Analyzer — Mengenali Isi Pasal**

Setiap pasal secara otomatis diklasifikasikan berdasarkan jenis isinya: apakah ini pasal yang mendefinisikan sesuatu, mewajibkan sesuatu, melarang sesuatu, memberikan sanksi, menjelaskan prosedur, atau memberikan pengecualian. Klasifikasi ini digunakan untuk memprioritaskan dokumen yang relevan saat pencarian.

Dalam versi V7 yang sudah berjalan, analyzer ini juga mendeteksi enam jenis sinyal celah hukum:

- **Threshold arbitrage** — pasal yang menyebut angka batas seperti Rp 4,8 miliar atau tarif tertentu
- **Exception clause** — pasal yang menggunakan frasa "dikecualikan dari", "tidak dikenakan", "tidak termasuk"
- **Entity type exception** — pengecualian yang berlaku untuk jenis entitas tertentu (PT, CV, UMKM, BUT)
- **Timing window** — pasal dengan masa transisi atau ketentuan peralihan yang bisa dimanfaatkan
- **Cross border gap** — pasal yang bersentuhan dengan P3B, transfer pricing, atau entitas asing
- **Rate differential** — pasal yang menyebut tarif berbeda dari tarif umum (tarif final, tarif 0%, fasilitas)

---

**Domain Scoring Engine — Mengenali Bidang Pajak**

Setiap chunk secara otomatis diberi label domain: PPh, PPN, KUP, Transfer Pricing, P3B, GAAR, atau Tax Facility. Pelabelan ini dilakukan berdasarkan pola kata kunci yang spesifik untuk setiap domain, bukan hanya metadata dokumen sumber.

Artinya, sebuah PMK yang secara resmi tentang PPN bisa memiliki chunk-chunk yang di-label sebagai Transfer Pricing jika isinya membahas hal tersebut — retrieval menjadi lebih presisi.

---

**Conflict Mapper — Mendeteksi Konflik Regulasi**

Saat sebuah dokumen baru diingest, sistem secara otomatis memeriksa apakah ada regulasi lain dalam database yang mengatur hal yang sama. Konflik yang terdeteksi disimpan bersama dokumen, sehingga saat query pipeline menemukan pasal tersebut, LLM sudah diberi tahu bahwa ada potensi konflik dan harus berhati-hati dalam sintesisnya.

---

**Quality Gate — Penyaringan Kualitas**

Sebelum masuk ke database, setiap chunk melewati serangkaian pemeriksaan: skor kualitas minimal 0.5, validasi embedding (tidak NaN, norm L2 valid), dan reconstruction test yang memastikan embedding bisa merepresentasikan teks aslinya dengan benar. Chunk yang tidak lulus tidak disimpan.

---

**Audit Trail Lengkap**

Setiap dokumen yang diingest dicatat dengan lengkap: kapan masuk, versi pipeline apa, skor kualitasnya berapa, apakah ada konflik yang ditemukan. Status di Google Sheets juga diupdate otomatis setelah proses selesai.

---

### 2.2 Query Pipeline — Menjawab Pertanyaan

Ini adalah sistem yang bekerja setiap kali ada pertanyaan masuk, baik dari aplikasi frontend maupun API langsung.

---

**Pre-Filter Relevansi**

Sebelum melakukan pencarian apapun, sistem terlebih dahulu memeriksa apakah pertanyaan memang berkaitan dengan pajak Indonesia. Pertanyaan di luar domain (misalnya tentang hukum perdata atau akuntansi umum) langsung dikembalikan dengan jawaban bahwa pertanyaan di luar cakupan sistem. Ini mencegah LLM memberikan jawaban yang terlihat meyakinkan padahal tidak berdasar.

---

**Query Intelligence — Ekspansi Terminologi**

Pengguna sering bertanya dengan bahasa sehari-hari: "bagaimana cara hemat pajak". Sistem secara otomatis mengekspansi query ini menjadi tiga reformulasi dengan terminologi hukum formal: "pengurangan pajak penghasilan", "efisiensi PPh badan", "perencanaan pajak yang diperkenankan". Ketiga reformulasi ini digunakan bersamaan saat pencarian, sehingga dokumen relevan tidak terlewat hanya karena perbedaan istilah.

Dalam mode avoidance, ekspansi juga menambahkan terminologi celah: "dikecualikan dari", "tidak dikenakan", "tarif lebih rendah dari", "peredaran bruto tidak melebihi".

---

**Hybrid Vector Search — Pencarian Cerdas**

Pencarian dilakukan menggunakan dua pendekatan secara bersamaan: similarity semantik berbasis embedding (menemukan dokumen yang maknanya mirip) dan filter metadata (jenis pajak, jenis dokumen, domain). Keduanya digabungkan dengan formula scoring yang memperhitungkan kualitas dokumen dan relevansi domain.

Dokumen dengan sinyal celah hukum mendapat boost tambahan saat mode avoidance aktif — mereka naik ke posisi lebih atas dalam hasil pencarian.

---

**Client Context Injector — Personalisasi Berbasis Profil**

Ketika profil klien disertakan dalam request, sistem melakukan serangkaian kalkulasi otomatis sebelum pencarian dimulai: apakah klien eligible PP 23/2018, berapa DER ratio-nya, apakah ada risiko thin cap, apakah TP rules berlaku, apakah ada P3B opportunity. Hasil kalkulasi ini digunakan untuk memfilter dan memprioritaskan dokumen yang benar-benar relevan dengan situasi klien.

---

**Avoidance Matcher — Mencocokkan Celah dengan Klien**

Setelah dokumen ditemukan, sistem mencocokkan threshold dalam dokumen dengan angka aktual klien. Contoh: jika dokumen menyebut batas Rp 4,8 miliar dan omzet klien Rp 3,2 miliar, sistem secara otomatis mengkonfirmasi bahwa celah PP 23/2018 ini applicable untuk klien ini — lengkap dengan kalkulasi selisih pajak.

Ini yang membedakan sistem dari sekadar search engine: sistem tidak hanya menemukan regulasi relevan, tetapi juga memverifikasi apakah regulasi tersebut benar-benar berlaku untuk kondisi spesifik klien.

---

**Risk Scorer — Penilaian Risiko Per Celah**

Setiap celah yang ditemukan diberi risk score (0–100) berdasarkan empat faktor: tingkat eksposur GAAR, ada tidaknya conflict references, apakah ada putusan pengadilan yang mendukung atau menolak posisi serupa, dan domain risiko (transfer pricing selalu lebih tinggi dari threshold biasa). Celah diurutkan dari yang paling aman ke yang paling berisiko.

---

**LLM Synthesis — Sintesis Berdasarkan Bukti**

LLM hanya boleh menjawab berdasarkan dokumen yang ditemukan. Setiap klaim hukum wajib disertai nama regulasi, nomor, tahun, dan pasal. Jika ada konflik antar sumber, LLM wajib menyebutkannya dan menggunakan hierarki (UU > PP > PMK > PER > SE) sebagai penentu. Dalam mode avoidance, output mengikuti format terstruktur: celah → dasar hukum → applicable ke klien → estimasi → risiko → action items.

---

### 2.3 Database — Apa yang Tersimpan

Setiap chunk dokumen yang masuk ke `tax_documents` menyimpan informasi berikut:

**Metadata dokumen:** jenis regulasi, nomor, tahun, judul, URL sumber, status hukum (berlaku/dicabut/diubah), tanggal berlaku.

**Metadata hukum:** nomor pasal, nomor ayat, hierarki posisi dalam dokumen, breadcrumb lengkap dari Bab hingga Ayat, referensi ke dokumen yang mengubah atau mencabut regulasi ini.

**Metadata semantik:** jenis isi pasal (definisi/kewajiban/sanksi/prosedur/pengecualian/timeline), domain pajak, skor kualitas, sinyal celah hukum, threshold angka yang terdeteksi, jenis entitas yang applicable.

**Data teknis:** vector embedding 3072 dimensi, fingerprint hash untuk deduplication, skor retrieval boost, tanggal ingest, versi pipeline.

---

## 3. Keterbatasan Saat Ini

Memahami batas sistem sama pentingnya dengan memahami kemampuannya.

**Corpus belum lengkap.** Kualitas jawaban berbanding lurus dengan kelengkapan dokumen yang sudah diingest. Jika sebuah PMK belum masuk ke database, sistem akan menyatakan tidak menemukan informasi — yang lebih baik daripada mengarang, tapi tetap merupakan keterbatasan.

**Tidak ada memori antar sesi.** Setiap query berdiri sendiri. Sistem tidak ingat percakapan sebelumnya atau konteks dari query sebelumnya dalam sesi yang sama (kecuali profil klien diinputkan ulang).

**Profil klien diinput manual.** Saat ini profil klien harus diinputkan melalui API atau form. Sistem belum bisa membaca laporan keuangan secara otomatis dan mengekstrak angka-angka relevan sendiri.

**Putusan pengadilan belum diingest.** Sistem saat ini belum memiliki basis data putusan pengadilan pajak, sehingga belum bisa memberikan informasi apakah sebuah posisi hukum pernah diuji dan dimenangkan di persidangan.

**Tidak ada kalkulasi pajak otomatis.** Sistem dapat mengestimasi dampak berdasarkan angka klien yang diinputkan, tetapi bukan tax calculator yang sesungguhnya — angka estimasi harus diverifikasi oleh konsultan.

**Tidak real-time terhadap perubahan regulasi.** Ingest dokumen baru dilakukan secara manual dengan trigger Google Sheets. Jika ada PMK baru terbit hari ini, sistem baru akan mengetahuinya setelah ada yang mengingest dokumen tersebut.

---

## 4. Roadmap Masa Depan

### Fase 1 — Penguatan Corpus (3–6 bulan ke depan)

Prioritas pertama adalah melengkapi basis data dokumen hukum agar cakupannya benar-benar komprehensif untuk semua skenario tax planning yang umum.

**Putusan Pengadilan Pajak yang dikurasi.** Target 1.500–2.000 putusan berkualitas tinggi dari total puluhan ribu yang ada, dipilih berdasarkan relevansi isu (transfer pricing, treaty abuse, thin cap, restrukturisasi), hasil putusan (dikabulkan atau ditolak), dan tahun (2015 ke atas). Kehadiran putusan akan mengaktifkan Risk Scorer secara penuh — setiap celah bisa divalidasi apakah pernah diuji di pengadilan.

**68 Perjanjian P3B Indonesia.** Seluruh tax treaty yang aktif diingest agar analisis cross-border menjadi akurat. Saat ini potensi P3B terdeteksi oleh sistem, tapi belum bisa diverifikasi dengan isi perjanjiannya.

**SE dan Surat Penegasan DJP.** Surat Edaran DJP sering menjadi dokumen paling kontroversial — posisinya di bawah PMK dalam hierarki, tapi seringkali menjadi acuan pemeriksaan di lapangan. Memasukkan SE akan membuat analisis risiko menjadi jauh lebih realistis.

**Ruling dan APA.** Advance Pricing Agreement dan ruling DJP yang dipublikasi memberikan gambaran tentang bagaimana DJP menginterpretasikan grey area. Ini sangat berharga untuk transfer pricing.

---

### Fase 2 — Peningkatan Kecerdasan (6–12 bulan)

**Document Upload untuk Analisis Klien.**
Pengguna dapat mengupload laporan keuangan (PDF atau Excel) dan sistem secara otomatis mengekstrak angka-angka kunci: omzet, laba, komponen biaya, nilai aset, DER ratio. Angka-angka ini langsung mengisi profil klien tanpa input manual. Ini memangkas 80% waktu persiapan sebelum analisis.

**Multi-turn Conversation.**
Sistem mampu mengingat konteks percakapan dalam satu sesi. Pengguna bisa mengajukan pertanyaan lanjutan seperti "bagaimana jika omzetnya turun 20%?" atau "apa implikasinya jika kita tambah pinjaman?" tanpa harus mengulang seluruh profil klien.

**Scenario Comparison.**
Pengguna bisa meminta sistem membandingkan dua atau tiga skenario perencanaan pajak secara berdampingan — misalnya: "bandingkan konsekuensi pajak jika struktur usahanya PT vs CV vs UD untuk bisnis dengan omzet Rp 5 miliar". Output berupa tabel perbandingan dengan estimasi pajak, risiko, dan rekomendasi untuk setiap skenario.

**Tax Calendar & Deadline Tracker.**
Berdasarkan profil klien (jenis entitas, kewajiban perpajakan), sistem secara otomatis menghasilkan kalender kewajiban pajak: kapan SPT Tahunan, kapan PPh 25 bulanan, kapan PKP harus lapor PPN. Kalender ini bersumber langsung dari ketentuan KUP dalam database.

---

### Fase 3 — Ekspansi Kapabilitas (12–24 bulan)

**Tax Planning Report Generator.**
Dari satu sesi analisis, sistem menghasilkan laporan PDF profesional yang bisa langsung diserahkan ke klien: ringkasan profil, celah yang teridentifikasi, strategi yang direkomendasikan, estimasi penghematan, risk matrix, dan action items dengan timeline. Laporan ini memiliki format yang konsisten dan sudah menyertakan disclaimer hukum yang diperlukan.

**Monitoring Perubahan Regulasi.**
Sistem memantau JDIH Kemenkeu secara otomatis. Ketika ada PMK atau PP baru yang terbit dan relevan dengan klien-klien yang sudah ada dalam sistem, notifikasi otomatis dikirimkan beserta summary implikasinya. Konsultan tidak perlu lagi memantau secara manual.

**Due Diligence Tax Assistant.**
Untuk keperluan M&A atau akuisisi, pengguna bisa menginputkan informasi target perusahaan dan sistem melakukan preliminary tax due diligence: mengidentifikasi potensi kewajiban tersembunyi, risiko transfer pricing, posisi sengketa yang mungkin ada, dan eksposur GAAR dari struktur yang ada.

**API Terbuka untuk Integrasi.**
Sistem membuka API yang bisa diintegrasikan ke aplikasi pihak ketiga: software akuntansi, ERP, atau platform konsultasi pajak. Integrasi ini memungkinkan analisis pajak real-time langsung dari dalam tools yang sudah digunakan klien.

**Knowledge Base Konsultan.**
Di samping melayani klien, sistem berkembang menjadi platform knowledge management untuk tim konsultan itu sendiri: tempat menyimpan memo internal, posisi hukum yang sudah diambil untuk kasus-kasus sebelumnya, dan lesson learned dari pemeriksaan yang pernah dijalani. Pengetahuan institusional ini menjadi bagian dari konteks retrieval.

---

### Fase 4 — Visi Jangka Panjang (24 bulan ke atas)

**Prediksi Risiko Pemeriksaan.**
Berdasarkan pola historis pemeriksaan DJP, profil industri, dan karakteristik transaksi klien, sistem memberikan probabilistic assessment: seberapa besar kemungkinan transaksi atau posisi hukum tertentu akan menjadi objek koreksi saat pemeriksaan. Ini memungkinkan konsultan untuk mempersiapkan dokumentasi defensif secara proaktif.

**Simulasi Sengketa.**
Untuk posisi hukum yang berisiko, sistem mensimulasikan argumen yang kemungkinan akan digunakan DJP dalam surat ketetapan, dan menyiapkan counter-argument berbasis regulasi dan yurisprudensi. Konsultan mendapatkan "preview" dari sengketa yang mungkin terjadi sebelum klien mengambil posisi tersebut.

**Benchmark Industri.**
Sistem menganalisis pola umum dari kasus-kasus yang sudah ada dalam corpus untuk mengidentifikasi benchmark industri: berapa effective tax rate yang umum untuk sektor tertentu, biaya apa yang paling sering dikoreksi DJP, dan strategi apa yang paling sering berhasil dipertahankan di pengadilan.

---

## 5. Nilai Bisnis

### Yang Berubah Bagi Konsultan

Seorang tax consultant senior menghabiskan rata-rata 3–6 jam untuk mengerjakan analisis tax planning awal untuk satu klien baru: membaca profil bisnis, memeriksa regulasi yang berlaku, mengidentifikasi celah, menilai risikonya, dan menyusun rekomendasi. Dengan sistem ini, analisis awal tersebut tersedia dalam hitungan detik — lengkap dengan referensi pasal, estimasi angka, dan risk scoring.

Waktu konsultan yang dibebaskan bisa dialokasikan ke hal yang tidak bisa dilakukan mesin: membangun hubungan dengan klien, negosiasi dengan DJP, pengambilan keputusan strategis, dan penanganan sengketa yang kompleks.

### Yang Berubah Bagi Klien

Klien tidak lagi harus menunggu berminggu-minggu untuk mendapatkan gambaran awal tentang potensi efisiensi pajak mereka. Analisis berbasis profil mereka tersedia segera. Lebih penting lagi, setiap rekomendasi selalu disertai dasar hukumnya — klien tidak perlu "percaya buta" pada rekomendasi konsultan, mereka bisa memverifikasi dasarnya sendiri.

### Batasan yang Tidak Berubah

Sistem ini adalah alat bantu, bukan pengganti konsultan berlisensi. Keputusan akhir tentang posisi pajak yang diambil, penandatanganan SPT, dan representasi di hadapan DJP tetap memerlukan konsultan atau kuasa hukum yang bertanggung jawab secara profesional. Sistem ini mempercepat dan memperkuat pekerjaan mereka — bukan menggantikannya.

---

*Dokumen ini adalah referensi produk yang hidup. Akan diperbarui seiring dengan perkembangan sistem.*
