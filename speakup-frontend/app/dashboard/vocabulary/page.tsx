// @ts-nocheck
'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserId, useSession } from '@/hooks/useSession';

export default function VocabularyPage() {
  const router = useRouter();
  const { clearSession } = useSession();
  const hasMounted = useRef(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    if (!getCurrentUserId()) {
      router.push('/login');
    }

    
        // -------------------------------------------------------
        // CONFIG — sesuaikan URL dan USER_ID
        // -------------------------------------------------------

        const WEBHOOK_BASE = process.env.NEXT_PUBLIC_N8N_BASE_URL || 'http://localhost:5678/webhook';
        const VOCAB_LIST_URL = WEBHOOK_BASE + '/vocabulary/list';
        const VOCAB_MASTER_URL = WEBHOOK_BASE + '/vocabulary/master';
        const VOCAB_ADD_URL = WEBHOOK_BASE + '/vocabulary/add';
        const VOCAB_EDIT_URL = WEBHOOK_BASE + '/vocabulary/edit';
        const VOCAB_DELETE_URL = WEBHOOK_BASE + '/vocabulary/delete';
        const CURRENT_USER_ID = getCurrentUserId() || '86b04bfc-e6b7-4265-bcc9-3ef949eba7c3';
        const PAGE_SIZE = 12;
        const TIMEOUT_MS = 30000;

        // -------------------------------------------------------
        // State
        // -------------------------------------------------------
        let allVocabs = [];
        let filteredVocabs = [];
        let currentPage = 1;
        let currentFilter = 'all';
        let currentSort = 'recent';
        let currentView = 'grid';
        let searchQuery = '';
        let statsCache = null;

        // -------------------------------------------------------
        // Fetch dengan timeout
        // -------------------------------------------------------
        function fetchTimeout(url, opts, ms) {
            const ctrl = new AbortController();
            const t = setTimeout(function () { ctrl.abort(); }, ms || TIMEOUT_MS);
            return fetch(url, Object.assign({}, opts, { signal: ctrl.signal }))
                .then(function (r) { clearTimeout(t); return r; })
                .catch(function (e) { clearTimeout(t); throw e; });
        }

        // -------------------------------------------------------
        // Error banner & retry
        // -------------------------------------------------------
        function showError(msg) {
            var b = document.getElementById('errorBanner');
            if (b) { b.textContent = '\u26a0 ' + msg; b.classList.remove('hidden'); }
            var r = document.getElementById('retryBtn');
            if (r) { r.classList.remove('hidden'); r.classList.add('flex'); }
        }
        function hideError() {
            var b = document.getElementById('errorBanner');
            if (b) b.classList.add('hidden');
            var r = document.getElementById('retryBtn');
            if (r) { r.classList.add('hidden'); r.classList.remove('flex'); }
        }
        function retryFetch() { hideError(); fetchVocabData(); }

        // -------------------------------------------------------
        // Glow mouse effect
        // -------------------------------------------------------
        function attachGlowEffects() {
            document.querySelectorAll('.glass-card').forEach(function (card) {
                card.addEventListener('mousemove', function (e) {
                    var rect = card.getBoundingClientRect();
                    card.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
                    card.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
                });
            });
        }

        // -------------------------------------------------------
        // Helpers
        // -------------------------------------------------------
        function levelBadge(level) {
            var l = (level || '').toUpperCase();
            var map = {
                A1: 'border-tertiary/40 text-tertiary', A2: 'border-tertiary/40 text-tertiary',
                B1: 'border-secondary/40 text-secondary', B2: 'border-secondary/40 text-secondary',
                C1: 'border-primary/40 text-primary', C2: 'border-error/40 text-error'
            };
            var cls = map[l] || 'border-outline text-on-surface-variant';
            return '<div class="px-2 py-0.5 rounded border ' + cls + ' font-section-label text-[10px] font-bold">' + (l || '—') + '</div>';
        }

        function resolveStatus(v) {
            if (v.is_mastered === true || v.is_mastered === 'true') return 'mastered';
            if (v.is_difficult === true || v.is_difficult === 'true') return 'difficult';
            return 'learning';
        }

        function formatDate(iso) {
            if (!iso) return null;
            try { return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
            catch (e) { return null; }
        }

        // -------------------------------------------------------
        // Render: grid card
        // -------------------------------------------------------
        function renderVocabCard(v) {
            var status = resolveStatus(v);
            var word = v.vocab_word || v.word || '—';
            var pos = (v.part_of_speech || v.type || 'WORD').toUpperCase();
            var level = v.level || v.vocab_level || '';
            var def = v.definition || v.meaning || '';
            var phon = v.phonetic || '';
            var id = v.id || '';

            var actionHtml = status === 'mastered'
                ? '<div class="flex items-center gap-2 text-tertiary"><span class="material-symbols-outlined text-[18px]" style="font-variation-settings:\'FILL\' 1;">check_circle</span><span class="font-section-label text-[11px]">Perfect Recall</span></div>'
                : '<button onclick="markMastered(\'' + id + '\')" class="bg-primary text-on-primary font-button-text text-[11px] px-4 py-1.5 rounded hover:opacity-90 transition-opacity">PRACTICE</button>';

            return '<div class="glass-card p-6 rounded-xl border border-border-subtle flex flex-col group transition-all duration-300 hover:scale-[1.01]" data-status="' + status + '" data-id="' + id + '" data-word="' + word.toLowerCase() + '">'
                + '<div class="flex justify-between items-start mb-4">'
                + '<span class="font-section-label text-[10px] text-on-surface-variant bg-surface-container/50 px-2 py-0.5 rounded">' + pos + '</span>'
                + levelBadge(level)
                + '</div>'
                + '<h3 class="font-headline-modal text-xl text-on-surface mb-1">' + word + '</h3>'
                + (phon ? '<p class="font-helper-text text-on-surface-variant text-sm mb-4 italic">' + phon + '</p>' : '<div class="mb-4"></div>')
                + '<p class="font-body-large text-on-surface-variant text-[14px] mb-6 flex-1 leading-relaxed">' + (def || '<span class="italic text-text-muted">No definition available.</span>') + '</p>'
                + '<div class="pt-4 border-t border-border-subtle flex items-center justify-between">'
                + actionHtml
                + '<div class="flex items-center gap-0.5">'
                + '<button onclick="openEditModal(\'' + id + '\')" title="Edit" class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-colors"><span class="material-symbols-outlined text-[17px]">edit</span></button>'
                + '<button onclick="confirmDelete(\'' + id + '\', \'' + word + '\')" title="Delete" class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"><span class="material-symbols-outlined text-[17px]">delete</span></button>'
                + '<button onclick="openDetailModal(\'' + id + '\')" title="Detail" class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"><span class="material-symbols-outlined text-[17px]">info</span></button>'
                + '</div>'
                + '</div></div>';
        }

        // -------------------------------------------------------
        // Render: list row
        // -------------------------------------------------------
        function renderVocabRow(v) {
            var status = resolveStatus(v);
            var word = v.vocab_word || v.word || '—';
            var pos = (v.part_of_speech || v.type || 'WORD').toUpperCase();
            var level = v.level || v.vocab_level || '';
            var def = v.definition || v.meaning || '';
            var id = v.id || '';

            var statusHtml = status === 'mastered'
                ? '<div class="flex items-center gap-1 text-tertiary"><span class="material-symbols-outlined text-[16px]" style="font-variation-settings:\'FILL\' 1;">check_circle</span><span class="font-section-label text-[10px]">Mastered</span></div>'
                : status === 'difficult'
                    ? '<span class="font-section-label text-[10px] text-error">Difficult</span>'
                    : '<button onclick="markMastered(\'' + id + '\')" class="bg-primary text-on-primary font-button-text text-[10px] px-3 py-1 rounded hover:opacity-90 transition-opacity">PRACTICE</button>';

            return '<div class="glass-card px-5 py-4 rounded-xl border border-border-subtle flex items-center gap-4 transition-all duration-200 hover:bg-surface-container/40" data-status="' + status + '" data-id="' + id + '" data-word="' + word.toLowerCase() + '">'
                + '<div class="flex items-center gap-3 flex-shrink-0 w-32"><span class="font-section-label text-[9px] text-on-surface-variant bg-surface-container/50 px-2 py-0.5 rounded">' + pos + '</span>' + levelBadge(level) + '</div>'
                + '<div class="flex-1 min-w-0"><span class="font-headline-modal text-base text-on-surface">' + word + '</span><p class="font-helper-text text-text-muted text-xs mt-0.5 truncate">' + def + '</p></div>'
                + '<div class="flex-shrink-0">' + statusHtml + '</div>'
                + '<div class="flex items-center gap-0.5 flex-shrink-0">'
                + '<button onclick="openEditModal(\'' + id + '\')" title="Edit" class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-colors"><span class="material-symbols-outlined text-[17px]">edit</span></button>'
                + '<button onclick="confirmDelete(\'' + id + '\', \'' + word + '\')" title="Delete" class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"><span class="material-symbols-outlined text-[17px]">delete</span></button>'
                + '<button onclick="openDetailModal(\'' + id + '\')" title="Detail" class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"><span class="material-symbols-outlined text-[17px]">info</span></button>'
                + '</div>'
                + '</div>';
        }

        // -------------------------------------------------------
        // Filter + Sort + Search
        // -------------------------------------------------------
        function applyFilterSort() {
            var data = allVocabs.slice();
            if (searchQuery) {
                data = data.filter(function (v) {
                    return (v.vocab_word || v.word || '').toLowerCase().indexOf(searchQuery) !== -1
                        || (v.definition || v.meaning || '').toLowerCase().indexOf(searchQuery) !== -1;
                });
            }
            if (currentFilter !== 'all') {
                data = data.filter(function (v) { return resolveStatus(v) === currentFilter; });
            }
            if (currentSort === 'alpha') {
                data.sort(function (a, b) { return (a.vocab_word || a.word || '').localeCompare(b.vocab_word || b.word || ''); });
            } else if (currentSort === 'level') {
                var ord = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
                data.sort(function (a, b) { return (ord[(a.level || a.vocab_level || '').toUpperCase()] || 9) - (ord[(b.level || b.vocab_level || '').toUpperCase()] || 9); });
            } else {
                // recent — sort by learned_at / created_at DESC (webhook sudah urut, ini fallback)
                data.sort(function (a, b) { return new Date(b.learned_at || b.created_at || 0) - new Date(a.learned_at || a.created_at || 0); });
            }
            filteredVocabs = data;
            currentPage = 1;
        }

        // -------------------------------------------------------
        // Render page
        // -------------------------------------------------------
        function renderPage() {
            var grid = document.getElementById('vocabulary-grid');
            var pagNav = document.getElementById('paginationNav');
            var total = filteredVocabs.length;
            var start = (currentPage - 1) * PAGE_SIZE;
            var page = filteredVocabs.slice(start, start + PAGE_SIZE);

            grid.className = currentView === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8';

            if (page.length === 0) {
                grid.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined text-[48px]">search_off</span><p class="font-headline-modal text-base">No vocabularies found</p><p class="font-helper-text text-sm">Try adjusting your filter or search query.</p></div>';
                pagNav.classList.add('hidden');
                return;
            }
            grid.innerHTML = page.map(function (v) { return currentView === 'list' ? renderVocabRow(v) : renderVocabCard(v); }).join('');
            attachGlowEffects();
            renderPagination(total);
        }

        // -------------------------------------------------------
        // Pagination
        // -------------------------------------------------------
        function renderPagination(total) {
            var pagNav = document.getElementById('paginationNav');
            var tp = Math.ceil(total / PAGE_SIZE);
            if (tp <= 1) { pagNav.classList.add('hidden'); return; }
            pagNav.classList.remove('hidden');
            var base = 'w-10 h-10 flex items-center justify-center rounded-lg font-section-label text-section-label transition-all';
            var act = base + ' bg-primary text-on-primary';
            var inac = base + ' glass-card border border-border-subtle text-on-surface-variant hover:text-primary';
            var html = '<button class="' + inac + '" onclick="goPage(' + (currentPage - 1) + ')"' + (currentPage === 1 ? ' disabled style="opacity:.4;pointer-events:none"' : '') + '><span class="material-symbols-outlined">chevron_left</span></button>';
            var pages = [];
            for (var i = 1; i <= tp; i++) {
                if (i === 1 || i === tp || (i >= currentPage - 1 && i <= currentPage + 1)) pages.push(i);
                else if (pages[pages.length - 1] !== '...') pages.push('...');
            }
            pages.forEach(function (p) {
                if (p === '...') html += '<span class="px-2 text-text-muted">...</span>';
                else html += '<button class="' + (p === currentPage ? act : inac) + '" onclick="goPage(' + p + ')">' + p + '</button>';
            });
            html += '<button class="' + inac + '" onclick="goPage(' + (currentPage + 1) + ')"' + (currentPage === tp ? ' disabled style="opacity:.4;pointer-events:none"' : '') + '><span class="material-symbols-outlined">chevron_right</span></button>';
            pagNav.innerHTML = html;
        }

        function goPage(n) {
            var tp = Math.ceil(filteredVocabs.length / PAGE_SIZE);
            if (n < 1 || n > tp) return;
            currentPage = n;
            renderPage();
            document.querySelector('main').scrollTo({ top: 0, behavior: 'smooth' });
        }

        // -------------------------------------------------------
        // View mode
        // -------------------------------------------------------
        function setViewMode(mode) {
            currentView = mode;
            var g = document.getElementById('gridViewBtn');
            var l = document.getElementById('listViewBtn');
            var on = 'p-1.5 rounded-md bg-secondary-container/20 text-primary';
            var off = 'p-1.5 rounded-md text-on-surface-variant hover:text-on-surface transition-colors';
            g.className = mode === 'grid' ? on : off;
            l.className = mode === 'list' ? on : off;
            renderPage();
        }

        // -------------------------------------------------------
        // Mark mastered — optimistic + rollback on error
        // FIX: body field sesuai webhook: vocabulary_id (bukan vocab_id)
        // -------------------------------------------------------
        function markMastered(id) {
            if (!id) return;
            var vocab = allVocabs.filter(function (v) { return v.id === id; })[0];
            if (!vocab) return;
            vocab.is_mastered = true;
            applyFilterSort();
            renderPage();
            updateHeader();

            fetchTimeout(VOCAB_MASTER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: CURRENT_USER_ID, vocabulary_id: id })
            }).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
            }).catch(function (err) {
                console.warn('markMastered error:', err);
                vocab.is_mastered = false; // rollback
                applyFilterSort();
                renderPage();
                updateHeader();
                showError('Gagal menyimpan status mastered. Silakan coba lagi.');
            });
        }

        // -------------------------------------------------------
        // Update header count
        // -------------------------------------------------------
        function updateHeader() {
            var el = document.getElementById('totalWordCount');
            if (el) {
                el.textContent = allVocabs.length + ' words';
                el.classList.remove('skeleton', 'w-16', 'h-4');
            }
        }

        // -------------------------------------------------------
        // Update stats bar — dari webhook: { stats.total_words, total_mastered, total_learning }
        // -------------------------------------------------------
        function updateStatsBar(stats) {
            if (!stats) return;
            var t = document.getElementById('statTotal');
            var m = document.getElementById('statMastered');
            var l = document.getElementById('statLearning');
            if (t) t.innerHTML = '<span class="stat-animate">' + (stats.total_words != null ? stats.total_words : allVocabs.length) + '</span>';
            if (m) m.innerHTML = '<span class="stat-animate">' + (stats.total_mastered != null ? stats.total_mastered : 0) + '</span>';
            if (l) l.innerHTML = '<span class="stat-animate">' + (stats.total_learning != null ? stats.total_learning : 0) + '</span>';
        }

        // -------------------------------------------------------
        // Update user info — dari webhook: { user.name, user.level, user.avatar_url }
        // FIX: graceful fallback jika avatar_url null
        // -------------------------------------------------------
        function updateUserInfo(user) {
            if (!user) return;
            var n = document.getElementById('userName');
            var l = document.getElementById('userLevel');
            var a = document.getElementById('userAvatar');
            if (n) n.textContent = user.name || 'Learner';
            if (l) l.textContent = user.level || '—';
            
            const avatarUrl = user.avatar_url || user.photo_url || user.picture || null;
            const displayName = user.name || 'Learner';
            const photoUrl = avatarUrl ? avatarUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f8cff&color=fff&bold=true&size=80&rounded=true`;

            if (a) {
                a.src = photoUrl;
                a.style.display = 'block';
                a.onerror = () => {
                    a.style.display = 'none';
                };
            }
        }

        // -------------------------------------------------------
        // Detail Modal — tambah session_topic & learned_at dari webhook
        // -------------------------------------------------------
        function openDetailModal(id) {
            var v = allVocabs.filter(function (x) { return x.id === id; })[0];
            if (!v) return;
            var word = v.vocab_word || v.word || '—';
            var def = v.definition || v.meaning || '';
            var pos = (v.part_of_speech || v.type || '').toUpperCase();
            var level = v.level || v.vocab_level || '';
            var topic = v.session_topic || null;
            var learned = formatDate(v.learned_at);
            var status = resolveStatus(v);
            var phonetic = v.phonetic || v.pronunciation || '';
            var meaning = v.meaning_id || v.indonesian || '';

            var modal = document.getElementById('detailModal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('detailWord').textContent = word;
            document.getElementById('detailPos').textContent = pos;
            document.getElementById('detailLevel').textContent = level;
            document.getElementById('detailDef').textContent = def || 'No definition.';

            // Pronunciation
            var phonEl = document.getElementById('detailPhonetic');
            if (phonetic) { phonEl.textContent = phonetic; phonEl.classList.remove('hidden'); }
            else { phonEl.classList.add('hidden'); }

            // Indonesian meaning
            var meaningBlock = document.getElementById('detailMeaningBlock');
            var meaningEl = document.getElementById('detailMeaning');
            if (meaning) { meaningEl.textContent = meaning; meaningBlock.classList.remove('hidden'); }
            else { meaningBlock.classList.add('hidden'); }

            // Metadata dari webhook
            var meta = document.getElementById('detailMeta');
            var html = '';
            if (learned) html += '<div class="flex items-center gap-2 text-text-muted text-xs"><span class="material-symbols-outlined text-[14px]">calendar_today</span><span>Learned: ' + learned + '</span></div>';
            if (topic) html += '<div class="flex items-center gap-2 text-text-muted text-xs mt-1"><span class="material-symbols-outlined text-[14px]">topic</span><span>Session: ' + topic + '</span></div>';
            if (status === 'mastered') html += '<div class="flex items-center gap-2 text-tertiary text-xs mt-1"><span class="material-symbols-outlined text-[14px]" style="font-variation-settings:\'FILL\' 1;">check_circle</span><span>Mastered</span></div>';
            if (status === 'difficult') html += '<div class="flex items-center gap-2 text-error text-xs mt-1"><span class="material-symbols-outlined text-[14px]">warning</span><span>Marked as difficult</span></div>';
            if (meta) meta.innerHTML = html;
        }
        function closeDetailModal() {
            var m = document.getElementById('detailModal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }

        // -------------------------------------------------------
        // Add Word Modal
        // -------------------------------------------------------
        function openAddWordModal() {
            var m = document.getElementById('addWordModal');
            m.classList.remove('hidden'); m.classList.add('flex');
            setTimeout(function () { document.getElementById('newWord').focus(); }, 100);
        }
        function closeAddWordModal() {
            var m = document.getElementById('addWordModal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }

        function submitNewWord() {
            var word = document.getElementById('newWord').value.trim();
            var pos = document.getElementById('newPos').value;
            var level = document.getElementById('newLevel').value;
            var def = document.getElementById('newDef').value.trim();
            var pron = document.getElementById('newPronunciation').value.trim();
            var mean = document.getElementById('newMeaningId').value.trim();
            if (!word) { document.getElementById('newWord').focus(); return; }

            var btn = document.getElementById('saveWordBtn');
            btn.disabled = true;
            btn.textContent = 'Saving...';

            fetchTimeout(VOCAB_ADD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: CURRENT_USER_ID,
                    vocab_word: word,
                    part_of_speech: pos,
                    level: level,
                    definition: def,
                    pronunciation: pron,
                    meaning_id: mean
                })
            }).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            }).then(function (data) {
                var entry = Array.isArray(data) ? data[0] : data;
                if (!entry || !entry.id) throw new Error('Response tidak valid dari server');

                allVocabs.unshift(entry);
                if (statsCache) {
                    statsCache.total_words = (statsCache.total_words || 0) + 1;
                    statsCache.total_learning = (statsCache.total_learning || 0) + 1;
                    updateStatsBar(statsCache);
                }
                applyFilterSort();
                renderPage();
                updateHeader();
                closeAddWordModal();
                // Clear all fields
                ['newWord', 'newDef', 'newPronunciation', 'newMeaningId'].forEach(function (id) {
                    document.getElementById(id).value = '';
                });
            }).catch(function (err) {
                console.error('submitNewWord error:', err);
                showError('Gagal menyimpan kata. Pastikan server n8n berjalan dan webhook aktif.');
            }).finally(function () {
                btn.disabled = false;
                btn.textContent = 'Save Word';
            });
        }

        // -------------------------------------------------------
        // Export CSV
        // -------------------------------------------------------
        function exportVocab() {
            var rows = ['word,part_of_speech,level,definition,mastered,session_topic,learned_at'];
            allVocabs.forEach(function (v) {
                rows.push([
                    '"' + (v.vocab_word || v.word || '').replace(/"/g, '""') + '"',
                    v.part_of_speech || v.type || '',
                    v.level || v.vocab_level || '',
                    '"' + (v.definition || v.meaning || '').replace(/"/g, '""') + '"',
                    (v.is_mastered === true || v.is_mastered === 'true') ? 'yes' : 'no',
                    v.session_topic || '',
                    v.learned_at || ''
                ].join(','));
            });
            var a = document.createElement('a');
            a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
            a.download = 'vocabulary-export.csv';
            a.click();
        }

        // -------------------------------------------------------
        // Edit Modal
        // -------------------------------------------------------
        function openEditModal(id) {
            var v = allVocabs.filter(function (x) { return x.id === id; })[0];
            if (!v) return;
            var m = document.getElementById('editWordModal');
            // Populate fields
            document.getElementById('editVocabId').value = v.id || '';
            document.getElementById('editWord').value = v.vocab_word || v.word || '';
            document.getElementById('editPos').value = v.part_of_speech || 'NOUN';
            document.getElementById('editLevel').value = v.level || v.vocab_level || 'B1';
            document.getElementById('editDef').value = v.definition || v.meaning || '';
            document.getElementById('editPronunciation').value = v.pronunciation || v.phonetic || '';
            document.getElementById('editMeaningId').value = v.meaning_id || v.indonesian || '';
            var isMastered = (v.is_mastered === true || v.is_mastered === 'true');
            document.getElementById('editIsMastered').value = isMastered ? 'true' : 'false';
            document.getElementById('editStatusLearning').checked = !isMastered;
            document.getElementById('editStatusMastered').checked = isMastered;
            m.classList.remove('hidden'); m.classList.add('flex');
            setTimeout(function () { document.getElementById('editWord').focus(); }, 100);
        }
        function closeEditModal() {
            var m = document.getElementById('editWordModal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }

        function submitEditWord() {
            var vocabId = document.getElementById('editVocabId').value;
            var word = document.getElementById('editWord').value.trim();
            var pos = document.getElementById('editPos').value;
            var level = document.getElementById('editLevel').value;
            var def = document.getElementById('editDef').value.trim();
            var pron = document.getElementById('editPronunciation').value.trim();
            var meaning = document.getElementById('editMeaningId').value.trim();
            var mastered = document.getElementById('editIsMastered').value === 'true';
            if (!word || !vocabId) return;

            var btn = document.getElementById('saveEditBtn');
            btn.disabled = true; btn.textContent = 'Saving...';

            fetchTimeout(VOCAB_EDIT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: CURRENT_USER_ID,
                    vocabulary_id: vocabId,
                    vocab_word: word,
                    part_of_speech: pos,
                    level: level,
                    definition: def,
                    pronunciation: pron,
                    meaning_id: meaning,
                    is_mastered: mastered
                })
            }).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            }).then(function (data) {
                // Update local state
                var v = allVocabs.filter(function (x) { return x.id === vocabId; })[0];
                if (v) {
                    v.vocab_word = word;
                    v.part_of_speech = pos;
                    v.level = level;
                    v.definition = def;
                    v.pronunciation = pron;
                    v.meaning_id = meaning;
                    v.is_mastered = mastered;
                }
                // Rebuild stats
                if (statsCache) {
                    statsCache.total_mastered = allVocabs.filter(function (x) { return x.is_mastered === true || x.is_mastered === 'true'; }).length;
                    statsCache.total_learning = allVocabs.filter(function (x) { return !(x.is_mastered === true || x.is_mastered === 'true'); }).length;
                    updateStatsBar(statsCache);
                }
                applyFilterSort(); renderPage(); updateHeader();
                closeEditModal();
            }).catch(function (err) {
                console.error('submitEditWord error:', err);
                showError('Gagal memperbarui vocab. Pastikan webhook /vocabulary/edit aktif.');
            }).finally(function () {
                btn.disabled = false; btn.textContent = 'Save Changes';
            });
        }

        // -------------------------------------------------------
        // Delete Confirmation
        // -------------------------------------------------------
        var pendingDeleteId = null;
        var pendingDeleteWord = '';

        function confirmDelete(id, word) {
            pendingDeleteId = id;
            pendingDeleteWord = word;
            var m = document.getElementById('deleteConfirmModal');
            document.getElementById('deleteWordName').textContent = '"' + word + '"';
            m.classList.remove('hidden'); m.classList.add('flex');
        }
        function closeDeleteModal() {
            var m = document.getElementById('deleteConfirmModal');
            m.classList.add('hidden'); m.classList.remove('flex');
            pendingDeleteId = null; pendingDeleteWord = '';
            // Reset tombol delete agar tidak stuck di state "Deleting..."
            var btn = document.getElementById('confirmDeleteBtn');
            if (btn) { btn.disabled = false; btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">delete_forever</span> Delete'; }
        }

        function executeDelete() {
            if (!pendingDeleteId) return;
            var id = pendingDeleteId;
            var btn = document.getElementById('confirmDeleteBtn');
            btn.disabled = true; btn.textContent = 'Deleting...';

            fetchTimeout(VOCAB_DELETE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: CURRENT_USER_ID, vocabulary_id: id })
            }).then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            }).then(function () {
                // Remove from local state
                allVocabs = allVocabs.filter(function (v) { return v.id !== id; });
                if (statsCache) {
                    statsCache.total_words = allVocabs.length;
                    statsCache.total_mastered = allVocabs.filter(function (v) { return v.is_mastered === true || v.is_mastered === 'true'; }).length;
                    statsCache.total_learning = allVocabs.filter(function (v) { return !(v.is_mastered === true || v.is_mastered === 'true'); }).length;
                    updateStatsBar(statsCache);
                }
                applyFilterSort(); renderPage(); updateHeader();
                closeDeleteModal();
            }).catch(function (err) {
                console.error('executeDelete error:', err);
                showError('Gagal menghapus vocab. Pastikan webhook /vocabulary/delete aktif.');
                btn.disabled = false; btn.textContent = 'Delete';
            });
        }

        // -------------------------------------------------------
        // MAIN: Fetch dari webhook /vocabulary/list

        //
        // Struktur response (dari n8n Code: Build Response Payload):
        // {
        //   user:  { id, name, level, avatar_url },
        //   stats: { total_words, total_mastered, total_learning },
        //   vocabs: [{ id, vocab_word, part_of_speech, level, definition,
        //              is_mastered, is_difficult, session_topic,
        //              learned_at, created_at }]
        // }
        // -------------------------------------------------------


        function fetchVocabData() {
            fetchTimeout(VOCAB_LIST_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: CURRENT_USER_ID })
            }).then(function (res) {
                if (!res.ok) { return res.text().then(function (t) { throw new Error('HTTP ' + res.status + ': ' + t.substring(0, 100)); }); }
                return res.json();
            }).then(function (data) {
                // Parse vocabs — support berbagai format
                var vocabs = [];
                if (Array.isArray(data)) vocabs = data;
                else if (Array.isArray(data.vocabs)) vocabs = data.vocabs;
                else if (Array.isArray(data.data)) vocabs = data.data;
                else if (Array.isArray(data.vocabularies)) vocabs = data.vocabularies;
                else vocabs = [data];

                if (data.user) updateUserInfo(data.user);

                if (data.stats) {
                    statsCache = data.stats;
                } else {
                    // Hitung manual jika stats tidak ada di response
                    statsCache = {
                        total_words: vocabs.length,
                        total_mastered: vocabs.filter(function (v) { return v.is_mastered === true || v.is_mastered === 'true'; }).length,
                        total_learning: vocabs.filter(function (v) { return !(v.is_mastered === true || v.is_mastered === 'true'); }).length
                    };
                }
                updateStatsBar(statsCache);

                allVocabs = vocabs;
                applyFilterSort();
                renderPage();
                updateHeader();
                hideError();

            }).catch(function (error) {
                console.error('fetchVocabData error:', error);
                var isTimeout = error.name === 'AbortError';
                showError(isTimeout
                    ? 'Request timeout. Pastikan n8n berjalan di localhost:5678.'
                    : 'Tidak dapat terhubung ke webhook. Menampilkan data demo.');

                // Demo fallback — struktur identik dengan webhook
                allVocabs = [
                    { id: 'v-001', vocab_word: 'Ephemerality', part_of_speech: 'NOUN', level: 'C1', definition: 'The concept of things being transitory, existing only briefly.', is_mastered: true, is_difficult: false, session_topic: 'Advanced Writing', learned_at: '2025-05-10T08:00:00Z' },
                    { id: 'v-002', vocab_word: 'Exacerbate', part_of_speech: 'VERB', level: 'B2', definition: 'Make a problem, bad situation, or negative feeling worse.', is_mastered: false, is_difficult: false, session_topic: 'Business English', learned_at: '2025-05-12T10:00:00Z' },
                    { id: 'v-003', vocab_word: 'Quintessence', part_of_speech: 'NOUN', level: 'C2', definition: 'The most perfect or typical example of a quality or class.', is_mastered: false, is_difficult: true, session_topic: 'Literature Review', learned_at: '2025-05-14T09:30:00Z' },
                    { id: 'v-004', vocab_word: 'Resilient', part_of_speech: 'ADJECTIVE', level: 'B1', definition: 'Able to withstand or recover quickly from difficult conditions.', is_mastered: true, is_difficult: false, session_topic: 'Daily Conversation', learned_at: '2025-05-08T11:00:00Z' },
                    { id: 'v-005', vocab_word: 'Substantiate', part_of_speech: 'VERB', level: 'C1', definition: 'Provide evidence to support or prove the truth of.', is_mastered: false, is_difficult: false, session_topic: 'Academic Writing', learned_at: '2025-05-15T14:00:00Z' },
                    { id: 'v-006', vocab_word: 'Reliable', part_of_speech: 'ADJECTIVE', level: 'A2', definition: 'Consistently good in quality or performance; able to be trusted.', is_mastered: true, is_difficult: false, session_topic: 'Beginner Vocabulary', learned_at: '2025-05-01T08:00:00Z' },
                    { id: 'v-007', vocab_word: 'Ubiquitous', part_of_speech: 'ADJECTIVE', level: 'C1', definition: 'Present, appearing, or found everywhere.', is_mastered: true, is_difficult: false, session_topic: 'Tech Vocabulary', learned_at: '2025-05-11T16:00:00Z' },
                    { id: 'v-008', vocab_word: 'Plethora', part_of_speech: 'NOUN', level: 'B2', definition: 'A large or excessive amount of something.', is_mastered: false, is_difficult: false, session_topic: 'Writing Workshop', learned_at: '2025-05-13T09:00:00Z' },
                    { id: 'v-009', vocab_word: 'Ambiguous', part_of_speech: 'ADJECTIVE', level: 'B2', definition: 'Open to more than one interpretation; not having one obvious meaning.', is_mastered: false, is_difficult: false, session_topic: 'Critical Thinking', learned_at: '2025-05-09T10:00:00Z' },
                    { id: 'v-010', vocab_word: 'Diligent', part_of_speech: 'ADJECTIVE', level: 'B1', definition: "Having or showing care in one's work or duties.", is_mastered: true, is_difficult: false, session_topic: 'Workplace English', learned_at: '2025-05-06T13:00:00Z' },
                    { id: 'v-011', vocab_word: 'Eloquent', part_of_speech: 'ADJECTIVE', level: 'C1', definition: 'Fluent or persuasive in speaking or writing.', is_mastered: false, is_difficult: false, session_topic: 'Public Speaking', learned_at: '2025-05-16T08:00:00Z' },
                    { id: 'v-012', vocab_word: 'Meticulous', part_of_speech: 'ADJECTIVE', level: 'B2', definition: 'Showing great attention to detail or correct behavior.', is_mastered: false, is_difficult: false, session_topic: 'Professional Writing', learned_at: '2025-05-17T07:00:00Z' }
                ];
                updateUserInfo({ name: 'Tri Jatmiko', level: 'Intermediate', avatar_url: null });
                statsCache = {
                    total_words: allVocabs.length,
                    total_mastered: allVocabs.filter(function (v) { return v.is_mastered; }).length,
                    total_learning: allVocabs.filter(function (v) { return !v.is_mastered; }).length
                };
                updateStatsBar(statsCache);
                applyFilterSort();
                renderPage();
                updateHeader();
            });
        }

        // -------------------------------------------------------
        // Event Listeners + Init (Executed immediately in useEffect)
        // -------------------------------------------------------

            // Filter buttons
            var filterContainer = document.getElementById('filter-container');
            if (filterContainer) {
                filterContainer.addEventListener('click', function (e) {
                    var btn = e.target.closest('[data-filter]');
                    if (!btn) return;
                    currentFilter = btn.getAttribute('data-filter');
                    document.querySelectorAll('[data-filter]').forEach(function (b) {
                        b.classList.remove('bg-primary', 'text-on-primary', 'border-primary');
                        b.classList.add('glass-card', 'border-border-subtle', 'text-on-surface-variant');
                    });
                    btn.classList.add('bg-primary', 'text-on-primary', 'border-primary');
                    btn.classList.remove('glass-card', 'border-border-subtle', 'text-on-surface-variant');
                    applyFilterSort(); renderPage();
                });
            }

            // Sort
            var sortSelect = document.getElementById('sortSelect');
            if (sortSelect) {
                sortSelect.addEventListener('change', function (e) {
                    currentSort = e.target.value; applyFilterSort(); renderPage();
                });
            }

            // Search
            var searchTimer;
            var searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.addEventListener('input', function (e) {
                    clearTimeout(searchTimer);
                    searchTimer = setTimeout(function () {
                        searchQuery = e.target.value.toLowerCase().trim();
                        applyFilterSort(); renderPage();
                    }, 300);
                });
            }

            // Modal backdrop click
            var detailModalEl = document.getElementById('detailModal');
            if (detailModalEl) {
                detailModalEl.addEventListener('click', function (e) {
                    if (e.target === e.currentTarget) closeDetailModal();
                });
            }
            var addWordModalEl = document.getElementById('addWordModal');
            if (addWordModalEl) {
                addWordModalEl.addEventListener('click', function (e) {
                    if (e.target === e.currentTarget) closeAddWordModal();
                });
            }
            var importModalEl = document.getElementById('importModal');
            if (importModalEl) {
                importModalEl.addEventListener('click', function (e) {
                    if (e.target === e.currentTarget) closeImportModal();
                });
            }
            var editWordModalEl = document.getElementById('editWordModal');
            if (editWordModalEl) {
                editWordModalEl.addEventListener('click', function (e) {
                    if (e.target === e.currentTarget) closeEditModal();
                });
            }
            var deleteConfirmModalEl = document.getElementById('deleteConfirmModal');
            if (deleteConfirmModalEl) {
                deleteConfirmModalEl.addEventListener('click', function (e) {
                    if (e.target === e.currentTarget) closeDeleteModal();
                });
            }

            // Escape key
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') { closeDetailModal(); closeAddWordModal(); closeImportModal(); closeEditModal(); closeDeleteModal(); }
            });

            // Fetch data dari n8n
            fetchVocabData();


        // -------------------------------------------------------
        // IMPORT ANKI — parse .txt tab-separated ANKI export
        // Format kolom: Indonesian \t English \t Pronunciation \t Example Sentence
        // -------------------------------------------------------
        var importedRows = [];   // array of parsed row objects

        function openImportModal() {
            var m = document.getElementById('importModal');
            m.classList.remove('hidden'); m.classList.add('flex');
            clearImport();
        }
        function closeImportModal() {
            var m = document.getElementById('importModal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }

        function handleAnkiDrop(event) {
            event.preventDefault();
            document.getElementById('importDropZone').classList.remove('border-secondary');
            var file = event.dataTransfer.files[0];
            if (file) handleAnkiFile(file);
        }

        function handleAnkiFile(file) {
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (e) {
                parseAnkiContent(e.target.result);
            };
            reader.readAsText(file, 'UTF-8');
        }

        function parseAnkiContent(text) {
            var lines = text.split('\n');
            importedRows = [];
            lines.forEach(function (line) {
                line = line.trim();
                // Skip metadata lines & empty lines
                if (!line || line.startsWith('#')) return;
                var cols = line.split('\t');
                // Minimal 2 kolom: Indonesian + English
                if (cols.length < 2) return;
                var indonesian = (cols[0] || '').trim();
                var english = (cols[1] || '').trim();
                var pronunciation = (cols[2] || '').trim();
                var example = (cols[3] || '').trim();
                if (!english) return;
                importedRows.push({
                    meaning_id: indonesian,     // bahasa Indonesia
                    vocab_word: english,         // English word → vocab_word di DB
                    pronunciation: pronunciation,  // IPA / phonetic
                    definition: example          // example sentence → definition di DB
                });
            });
            renderImportPreview();
        }

        function renderImportPreview() {
            var preview = document.getElementById('importPreview');
            var options = document.getElementById('importOptions');
            var doBtn = document.getElementById('doImportBtn');
            var tbody = document.getElementById('importTableBody');
            var count = document.getElementById('importCount');

            if (importedRows.length === 0) {
                preview.classList.add('hidden');
                options.classList.add('hidden');
                doBtn.disabled = true;
                return;
            }

            count.textContent = importedRows.length;
            tbody.innerHTML = importedRows.map(function (r) {
                return '<tr>'
                    + '<td class="px-3 py-2 text-on-surface font-medium">' + escHtml(r.vocab_word) + '</td>'
                    + '<td class="px-3 py-2 text-on-surface-variant">' + escHtml(r.meaning_id) + '</td>'
                    + '<td class="px-3 py-2 text-secondary italic">' + escHtml(r.pronunciation) + '</td>'
                    + '<td class="px-3 py-2 text-text-muted truncate max-w-[180px]" title="' + escHtml(r.definition) + '">' + escHtml(r.definition.substring(0, 50)) + (r.definition.length > 50 ? '\u2026' : '') + '</td>'
                    + '</tr>';
            }).join('');

            preview.classList.remove('hidden');
            options.classList.remove('hidden');
            doBtn.disabled = false;
            resetImportProgress();
        }

        function clearImport() {
            importedRows = [];
            document.getElementById('ankiFileInput').value = '';
            document.getElementById('importPreview').classList.add('hidden');
            document.getElementById('importOptions').classList.add('hidden');
            document.getElementById('doImportBtn').disabled = true;
            document.getElementById('doImportBtn').classList.remove('hidden');
            document.getElementById('importCancelBtn').classList.remove('hidden');
            document.getElementById('importDoneBtn').classList.add('hidden');
            resetImportProgress();
        }

        function resetImportProgress() {
            document.getElementById('importProgressWrap').classList.add('hidden');
            document.getElementById('importProgressBar').style.width = '0%';
            document.getElementById('importProgressText').textContent = '0 / 0';
            document.getElementById('importResultMsg').classList.add('hidden');
        }

        // Import semua baris — kirim satu per satu ke webhook /vocabulary/add
        // Webhook add sudah support vocab_word + definition + pronunciation + meaning_id
        function startImport() {
            if (importedRows.length === 0) return;
            var level = document.getElementById('importLevel').value;
            var pos = document.getElementById('importPos').value;
            var btn = document.getElementById('doImportBtn');
            var progWrap = document.getElementById('importProgressWrap');
            var progBar = document.getElementById('importProgressBar');
            var progText = document.getElementById('importProgressText');
            var resultMsg = document.getElementById('importResultMsg');

            btn.disabled = true;
            btn.textContent = 'Importing...';
            progWrap.classList.remove('hidden');
            resultMsg.classList.add('hidden');

            var total = importedRows.length;
            var done = 0;
            var success = 0;
            var failed = 0;

            // Sequential import — hindari flood ke webhook
            function importNext(index) {
                if (index >= total) {
                    resultMsg.textContent = '\u2713 Import selesai: ' + success + ' berhasil, ' + failed + ' gagal dari ' + total + ' kata.';
                    resultMsg.className = 'font-helper-text text-xs rounded-lg px-3 py-2 ' + (failed === 0 ? 'bg-tertiary/10 text-tertiary' : 'bg-status-warning/10 text-status-warning');
                    resultMsg.classList.remove('hidden');
                    // Swap footer: sembunyikan Cancel + Import Semua, tampilkan Done
                    document.getElementById('importCancelBtn').classList.add('hidden');
                    btn.classList.add('hidden');
                    document.getElementById('importDoneBtn').classList.remove('hidden');
                    if (success > 0) { setTimeout(function () { fetchVocabData(); }, 800); }
                    return;
                }

                var row = importedRows[index];
                var payload = {
                    user_id: CURRENT_USER_ID,
                    vocab_word: row.vocab_word,
                    part_of_speech: pos,
                    level: level,
                    definition: row.definition,
                    pronunciation: row.pronunciation,
                    meaning_id: row.meaning_id
                };

                fetchTimeout(VOCAB_ADD_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }, 12000).then(function (res) {
                    if (res.ok) success++; else failed++;
                }).catch(function () {
                    failed++;
                }).finally(function () {
                    done++;
                    var pct = Math.round((done / total) * 100);
                    progBar.style.width = pct + '%';
                    progText.textContent = done + ' / ' + total;
                    importNext(index + 1);
                });
            }

            importNext(0);
        }

        function escHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }
    

    // Expose vanilla-JS functions to window so inline JSX onClick can call them
      if (typeof markMastered !== "undefined") window.markMastered = markMastered;
      if (typeof openDetailModal !== "undefined") window.openDetailModal = openDetailModal;
      if (typeof closeDetailModal !== "undefined") window.closeDetailModal = closeDetailModal;
      if (typeof openAddWordModal !== "undefined") window.openAddWordModal = openAddWordModal;
      if (typeof closeAddWordModal !== "undefined") window.closeAddWordModal = closeAddWordModal;
      if (typeof submitNewWord !== "undefined") window.submitNewWord = submitNewWord;
      if (typeof exportVocab !== "undefined") window.exportVocab = exportVocab;
      if (typeof openEditModal !== "undefined") window.openEditModal = openEditModal;
      if (typeof closeEditModal !== "undefined") window.closeEditModal = closeEditModal;
      if (typeof submitEditWord !== "undefined") window.submitEditWord = submitEditWord;
      if (typeof confirmDelete !== "undefined") window.confirmDelete = confirmDelete;
      if (typeof closeDeleteModal !== "undefined") window.closeDeleteModal = closeDeleteModal;
      if (typeof executeDelete !== "undefined") window.executeDelete = executeDelete;
      if (typeof retryFetch !== "undefined") window.retryFetch = retryFetch;
      if (typeof goPage !== "undefined") window.goPage = goPage;
      if (typeof setViewMode !== "undefined") window.setViewMode = setViewMode;
      if (typeof openImportModal !== "undefined") window.openImportModal = openImportModal;
      if (typeof closeImportModal !== "undefined") window.closeImportModal = closeImportModal;
      if (typeof handleAnkiDrop !== "undefined") window.handleAnkiDrop = handleAnkiDrop;
      if (typeof handleAnkiFile !== "undefined") window.handleAnkiFile = handleAnkiFile;
      if (typeof clearImport !== "undefined") window.clearImport = clearImport;
      if (typeof startImport !== "undefined") window.startImport = startImport;

    // Attach logout link to Next.js router
    const logoutBtns = Array.from(document.querySelectorAll('a')).filter(el => el.textContent.includes('Logout'));
    logoutBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        clearSession();
        router.push('/login');
      });
    });

    return () => {
    };
  }, [router, clearSession]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        body {
            background-color: #0d0f14;
        }

        .glass-card {
            background: rgba(28, 32, 48, 0.4);
            backdrop-filter: blur(8px);
            position: relative;
            overflow: hidden;
        }

        .glass-card::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(175, 198, 255, 0.05) 0%, transparent 80%);
            pointer-events: none;
        }

        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #252a3a;
            border-radius: 10px;
        }

        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }

        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }

        @keyframes shimmer {
            0% {
                background-position: -1000px 0;
            }

            100% {
                background-position: 1000px 0;
            }
        }

        .skeleton {
            background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
            background-size: 1000px 100%;
            animation: shimmer 1.8s infinite linear;
            border-radius: 6px;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 60px 20px;
            grid-column: 1 / -1;
            color: #6b7290;
        }

        @keyframes countUp {
            from {
                opacity: 0;
                transform: translateY(4px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .stat-animate {
            animation: countUp 0.4s ease forwards;
        }
    ` }} />


    
    <aside
        className={`w-sidebar-width h-screen fixed left-0 top-0 border-r border-border-subtle bg-surface flex flex-col py-container-padding px-gutter z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10">
            <h1 className="font-display-brand text-display-brand text-primary tracking-tighter">SpeakUp AI</h1>
            <p className="font-section-label text-section-label text-on-surface-variant mt-1">Fluent Co-pilot</p>
        </div>
        <nav className="flex-1 space-y-2">
            <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-lg group"
                href="/dashboard/profile">
                <span className="material-symbols-outlined">person</span>
                <span className="font-section-label text-section-label">Profile</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-primary font-bold bg-secondary-container/20 rounded-lg scale-95 transition-transform group"
                href="/dashboard/vocabulary">
                <span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>exercise</span>
                <span className="font-section-label text-section-label">Vocabulary Lab</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-lg group"
                href="/dashboard/corrections">
                <span className="material-symbols-outlined">auto_fix_high</span>
                <span className="font-section-label text-section-label">Corrections</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-lg group"
                href="#">
                <span className="material-symbols-outlined">leaderboard</span>
                <span className="font-section-label text-section-label">Progress</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-lg group"
                href="#">
                <span className="material-symbols-outlined">settings</span>
                <span className="font-section-label text-section-label">Settings</span>
            </a>
        </nav>
        <div className="mt-auto pt-6 border-t border-border-subtle">
            <button onClick={(event) => { router.push('/dashboard/lesson') }}
                className="w-full font-button-text text-button-text py-4 rounded-xl flex items-center justify-center gap-2 mb-6 hover:opacity-90 transition-opacity bg-white text-black">
                <span>Start Lesson</span>
            </button>
            <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-lg"
                href="#">
                <span className="material-symbols-outlined">logout</span>
                <span className="font-section-label text-section-label">Logout</span>
            </a>
        </div>
    </aside>

    
    <div className={`h-screen flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-sidebar-width' : 'ml-0'}`}>

        
        <header
            className="flex items-center justify-between px-container-padding w-full sticky top-0 bg-surface/80 backdrop-blur-xl border-b border-border-subtle z-40 h-16 transition-all duration-300">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1 rounded-md hover:bg-surface-container" title="Toggle Sidebar">
                    <span className="material-symbols-outlined">{isSidebarOpen ? 'chevron_left' : 'chevron_right'}</span>
                </button>
                <div className="flex flex-col">
                    <span className="font-headline-modal text-headline-modal text-primary">SpeakUp</span>
                    <span className="font-body-large text-on-surface-variant -mt-1 text-[13px]">Language Mastery
                        Dashboard</span>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="relative w-64 hidden lg:block">
                    <span
                        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                    <input id="searchInput"
                        className="w-full bg-surface-container-low border border-border-subtle rounded-full py-1.5 pl-10 pr-4 text-[13px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                        placeholder="Search vocabulary..." type="text" />
                </div>
                
                <button id="retryBtn" onClick={(event) => { retryFetch() }}
                    className="hidden items-center gap-1 text-status-warning hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    <span className="font-section-label text-[10px]">Retry</span>
                </button>
                <button className="text-on-surface-variant hover:text-primary transition-opacity">
                    <span className="material-symbols-outlined">notifications</span>
                </button>
                <div className="flex items-center gap-3 pl-6 border-l border-border-subtle">
                    <div className="text-right">
                        <p className="font-button-text text-button-text text-on-surface" id="userName">Loading...</p>
                        <p className="font-helper-text text-helper-text text-text-muted" id="userLevel">—</p>
                    </div>
                    <img alt="User profile" id="userAvatar"
                        className="w-10 h-10 rounded-full border-2 border-primary object-cover bg-surface-container"
                        onError={(event) => { event.currentTarget.style.display='none' }} />
                </div>
            </div>
        </header>

        
        <div className="hidden bg-error-container/80 text-on-error-container font-helper-text text-center py-2 px-4 text-xs border-b border-error/20"
            id="errorBanner"></div>

        
        <main className="flex-1 overflow-y-auto custom-scrollbar p-container-padding">
            <div className="max-w-7xl mx-auto space-y-section-gap">

                
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-gutter">
                    <div>
                        <h2 className="font-headline-modal text-3xl text-on-surface tracking-tight">Vocabulary Library</h2>
                        <p className="font-body-large text-on-surface-variant mt-2">
                            Manage and review
                            <span id="totalWordCount"
                                className="text-primary font-bold skeleton inline-block w-16 h-4 align-middle">&nbsp;</span>
                            words in your collection
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={(event) => { exportVocab() }}
                            className="flex items-center gap-2 px-5 py-2.5 glass-card rounded-lg border border-border-subtle text-on-surface-variant hover:text-on-surface transition-all">
                            <span className="material-symbols-outlined text-[20px]">cloud_download</span>
                            <span className="font-button-text text-button-text">Export</span>
                        </button>
                        <button onClick={(event) => { openImportModal() }}
                            className="flex items-center gap-2 px-5 py-2.5 glass-card rounded-lg border border-secondary/40 text-secondary hover:text-on-surface hover:border-secondary transition-all">
                            <span className="material-symbols-outlined text-[20px]">upload_file</span>
                            <span className="font-button-text text-button-text">Import ANKI</span>
                        </button>
                        <button onClick={(event) => { openAddWordModal() }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-bold hover:opacity-90 transition-all">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                            <span className="font-button-text text-button-text">New Word</span>
                        </button>
                    </div>
                </section>

                
                <section className="grid grid-cols-3 gap-4">
                    <div className="glass-card rounded-xl border border-border-subtle px-5 py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-[28px]"
                            style={{"fontVariationSettings":"'FILL' 1"}}>library_books</span>
                        <div>
                            <p className="font-stat-value text-stat-value text-on-surface" id="statTotal"><span
                                    className="skeleton inline-block w-8 h-4">&nbsp;</span></p>
                            <p className="font-section-label text-[10px] text-text-muted mt-0.5">TOTAL WORDS</p>
                        </div>
                    </div>
                    <div className="glass-card rounded-xl border border-border-subtle px-5 py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-tertiary text-[28px]"
                            style={{"fontVariationSettings":"'FILL' 1"}}>check_circle</span>
                        <div>
                            <p className="font-stat-value text-stat-value text-on-surface" id="statMastered"><span
                                    className="skeleton inline-block w-8 h-4">&nbsp;</span></p>
                            <p className="font-section-label text-[10px] text-text-muted mt-0.5">MASTERED</p>
                        </div>
                    </div>
                    <div className="glass-card rounded-xl border border-border-subtle px-5 py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary text-[28px]"
                            style={{"fontVariationSettings":"'FILL' 1"}}>school</span>
                        <div>
                            <p className="font-stat-value text-stat-value text-on-surface" id="statLearning"><span
                                    className="skeleton inline-block w-8 h-4">&nbsp;</span></p>
                            <p className="font-section-label text-[10px] text-text-muted mt-0.5">LEARNING</p>
                        </div>
                    </div>
                </section>

                
                <section className="flex flex-col lg:flex-row gap-6 lg:items-center justify-between">
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" id="filter-container">
                        <button
                            className="px-5 py-2 rounded-full font-section-label text-section-label transition-all bg-primary text-on-primary border border-primary"
                            data-filter="all">ALL</button>
                        <button
                            className="px-5 py-2 rounded-full font-section-label text-section-label transition-all glass-card border border-border-subtle text-on-surface-variant hover:text-on-surface"
                            data-filter="mastered">MASTERED</button>
                        <button
                            className="px-5 py-2 rounded-full font-section-label text-section-label transition-all glass-card border border-border-subtle text-on-surface-variant hover:text-on-surface"
                            data-filter="learning">LEARNING</button>
                        <button
                            className="px-5 py-2 rounded-full font-section-label text-section-label transition-all glass-card border border-border-subtle text-on-surface-variant hover:text-on-surface"
                            data-filter="difficult">DIFFICULT</button>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="relative min-w-[180px]">
                            <select id="sortSelect"
                                className="appearance-none w-full bg-surface-container-low border border-border-subtle rounded-lg py-2 pl-4 pr-10 font-section-label text-section-label text-on-surface focus:ring-1 focus:ring-primary/50 outline-none cursor-pointer">
                                <option value="recent">Sort: Recent</option>
                                <option value="alpha">Sort: Alphabetical</option>
                                <option value="level">Sort: Level</option>
                            </select>
                            <span
                                className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                        </div>
                        <div className="flex glass-card border border-border-subtle rounded-lg p-1">
                            <button id="gridViewBtn" onClick={(event) => { setViewMode('grid') }}
                                className="p-1.5 rounded-md bg-secondary-container/20 text-primary">
                                <span className="material-symbols-outlined text-[20px]">grid_view</span>
                            </button>
                            <button id="listViewBtn" onClick={(event) => { setViewMode('list') }}
                                className="p-1.5 rounded-md text-on-surface-variant hover:text-on-surface transition-colors">
                                <span className="material-symbols-outlined text-[20px]">view_list</span>
                            </button>
                        </div>
                    </div>
                </section>

                
                <section id="vocabulary-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div
                        className="skeleton-card glass-card p-6 rounded-xl border border-border-subtle flex flex-col gap-4">
                        <div className="flex justify-between">
                            <div className="skeleton h-4 w-16"></div>
                            <div className="skeleton h-4 w-8"></div>
                        </div>
                        <div className="skeleton h-6 w-3/4"></div>
                        <div className="skeleton h-3 w-1/2"></div>
                        <div className="skeleton h-12 w-full"></div>
                        <div className="skeleton h-8 w-24 mt-auto"></div>
                    </div>
                    <div
                        className="skeleton-card glass-card p-6 rounded-xl border border-border-subtle flex flex-col gap-4">
                        <div className="flex justify-between">
                            <div className="skeleton h-4 w-16"></div>
                            <div className="skeleton h-4 w-8"></div>
                        </div>
                        <div className="skeleton h-6 w-2/3"></div>
                        <div className="skeleton h-3 w-1/2"></div>
                        <div className="skeleton h-12 w-full"></div>
                        <div className="skeleton h-8 w-24 mt-auto"></div>
                    </div>
                    <div
                        className="skeleton-card glass-card p-6 rounded-xl border border-border-subtle flex flex-col gap-4">
                        <div className="flex justify-between">
                            <div className="skeleton h-4 w-16"></div>
                            <div className="skeleton h-4 w-8"></div>
                        </div>
                        <div className="skeleton h-6 w-4/5"></div>
                        <div className="skeleton h-3 w-1/2"></div>
                        <div className="skeleton h-12 w-full"></div>
                        <div className="skeleton h-8 w-24 mt-auto"></div>
                    </div>
                </section>

                
                <nav id="paginationNav" className="flex items-center justify-center gap-2 py-10 hidden"></nav>

            </div>
        </main>
    </div>

    
    

    
    <div id="detailModal"
        className="fixed inset-0 z-[100] hidden items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
            className="glass-card w-full max-w-lg rounded-2xl flex flex-col overflow-hidden border border-border-subtle shadow-2xl">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                <div>
                    <h2 id="detailWord" className="font-headline-modal text-2xl text-on-surface"></h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span id="detailPos"
                            className="font-section-label text-[10px] text-on-surface-variant bg-surface-container/50 px-2 py-0.5 rounded"></span>
                        <span id="detailLevel"
                            className="font-section-label text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full"></span>
                    </div>
                    
                    <p id="detailPhonetic" className="font-helper-text text-secondary italic mt-1.5 text-sm hidden"></p>
                </div>
                <button onClick={(event) => { closeDetailModal() }}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="p-6 space-y-4">
                
                <div id="detailMeaningBlock" className="hidden">
                    <p className="font-section-label text-section-label text-text-muted mb-1">ARTI (INDONESIA)</p>
                    <p id="detailMeaning" className="font-body-large text-secondary leading-relaxed"></p>
                </div>
                <div>
                    <p className="font-section-label text-section-label text-text-muted mb-1">DEFINITION / EXAMPLE</p>
                    <p id="detailDef" className="font-body-large text-on-surface-variant leading-relaxed"></p>
                </div>
                
                <div id="detailMeta" className="pt-2 space-y-1"></div>
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
                <button onClick={(event) => { closeDetailModal() }}
                    className="px-5 py-2 glass-card rounded-lg border border-border-subtle text-on-surface-variant font-button-text text-[13px] hover:text-on-surface transition-all">Close</button>
            </div>
        </div>
    </div>

    
    <div id="addWordModal"
        className="fixed inset-0 z-[100] hidden items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
            className="glass-card w-full max-w-lg rounded-2xl flex flex-col overflow-hidden border border-border-subtle shadow-2xl">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                <div>
                    <h2 className="font-headline-modal text-xl text-on-surface">Add New Word</h2>
                    <p className="font-helper-text text-text-muted">Add a vocabulary to your collection</p>
                </div>
                <button onClick={(event) => { closeAddWordModal() }}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar" style={{"maxHeight":"72vh"}}>
                
                <div>
                    <label className="font-section-label text-section-label text-text-muted block mb-1">WORD *</label>
                    <input id="newWord" type="text" placeholder="e.g. Ephemeral"
                        className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="font-section-label text-section-label text-text-muted block mb-1">PART OF
                            SPEECH</label>
                        <select id="newPos"
                            className="appearance-none w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none">
                            <option value="NOUN">Noun</option>
                            <option value="VERB">Verb</option>
                            <option value="ADJECTIVE">Adjective</option>
                            <option value="ADVERB">Adverb</option>
                            <option value="PRONOUN">Pronoun</option>
                            <option value="PREPOSITION">Preposition</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-section-label text-section-label text-text-muted block mb-1">LEVEL</label>
                        <select id="newLevel"
                            className="appearance-none w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none">
                            <option value="A1">A1</option>
                            <option value="A2">A2</option>
                            <option value="B1">B1</option>
                            <option value="B2" selected>B2</option>
                            <option value="C1">C1</option>
                            <option value="C2">C2</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label className="font-section-label text-section-label text-text-muted block mb-1">
                        PRONUNCIATION
                        <span className="text-text-muted font-normal normal-case ml-1">(opsional)</span>
                    </label>
                    <div className="relative">
                        <span
                            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">record_voice_over</span>
                        <input id="newPronunciation" type="text" placeholder="e.g. /ɪˈfem.ər.əl/"
                            className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 pl-10 pr-4 text-[14px] text-secondary placeholder:text-text-muted focus:ring-1 focus:ring-secondary/50 outline-none font-mono" />
                    </div>
                </div>
                
                <div>
                    <label className="font-section-label text-section-label text-text-muted block mb-1">
                        ARTI (INDONESIA)
                        <span className="text-text-muted font-normal normal-case ml-1">(opsional)</span>
                    </label>
                    <div className="relative">
                        <span
                            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px] pointer-events-none">translate</span>
                        <input id="newMeaningId" type="text" placeholder="e.g. bersifat sementara"
                            className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 pl-10 pr-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none" />
                    </div>
                </div>
                
                <div>
                    <label className="font-section-label text-section-label text-text-muted block mb-1">
                        DEFINITION / EXAMPLE
                        <span className="text-text-muted font-normal normal-case ml-1">(opsional)</span>
                    </label>
                    <textarea id="newDef" rows="3" placeholder="Tulis definisi atau contoh kalimat..."
                        className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none resize-none"></textarea>
                </div>
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
                <button onClick={(event) => { closeAddWordModal() }}
                    className="px-5 py-2 glass-card rounded-lg border border-border-subtle text-on-surface-variant font-button-text text-[13px] hover:text-on-surface transition-all">Cancel</button>
                <button id="saveWordBtn" onClick={(event) => { submitNewWord() }}
                    className="px-5 py-2 bg-primary text-on-primary font-button-text text-[13px] rounded-lg hover:opacity-90 transition-opacity">Save
                    Word</button>
            </div>
        </div>
    </div>

    
    <div id="importModal"
        className="fixed inset-0 z-[100] hidden items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
            className="glass-card w-full max-w-xl rounded-2xl flex flex-col overflow-hidden border border-border-subtle shadow-2xl">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                <div>
                    <h2 className="font-headline-modal text-xl text-on-surface">Import from ANKI</h2>
                    <p className="font-helper-text text-text-muted mt-0.5">File .txt tab-separated: Indonesian · English ·
                        Pronunciation · Example</p>
                </div>
                <button onClick={(event) => { closeImportModal() }}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="p-6 space-y-5">
                
                <div id="importDropZone"
                    className="border-2 border-dashed border-border-subtle rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-secondary/60 transition-colors group"
                    onClick={(event) => { document.getElementById('ankiFileInput').click() }}
                    onDragOver={(event) => { event.preventDefault();event.currentTarget.classList.add('border-secondary') }}
                    onDragLeave={(event) => { event.currentTarget.classList.remove('border-secondary') }} onDrop={(event) => { handleAnkiDrop(event) }}>
                    <span
                        className="material-symbols-outlined text-[40px] text-on-surface-variant group-hover:text-secondary transition-colors">upload_file</span>
                    <p className="font-body-large text-on-surface-variant text-sm text-center">Drop file ANKI <span
                            className="text-on-surface font-bold">.txt</span> di sini<br />atau <span
                            className="text-secondary underline">browse file</span></p>
                    <input id="ankiFileInput" type="file" accept=".txt" className="hidden"
                        onChange={(event) => { handleAnkiFile(event.currentTarget.files[0]) }} />
                </div>
                
                <div id="importPreview" className="hidden">
                    <div className="flex items-center justify-between mb-2">
                        <p className="font-section-label text-section-label text-text-muted">PREVIEW — <span
                                id="importCount">0</span> KATA TERDETEKSI</p>
                        <button onClick={(event) => { clearImport() }}
                            className="font-helper-text text-xs text-error hover:underline">Hapus</button>
                    </div>
                    <div className="rounded-xl border border-border-subtle overflow-hidden">
                        <div className="overflow-y-auto custom-scrollbar" style={{"maxHeight":"220px"}}>
                            <table className="w-full text-[12px]">
                                <thead className="bg-surface-container sticky top-0">
                                    <tr className="text-left">
                                        <th className="px-3 py-2 font-section-label text-[10px] text-text-muted">ENGLISH
                                        </th>
                                        <th className="px-3 py-2 font-section-label text-[10px] text-text-muted">INDONESIA
                                        </th>
                                        <th className="px-3 py-2 font-section-label text-[10px] text-text-muted">
                                            PRONUNCIATION</th>
                                        <th className="px-3 py-2 font-section-label text-[10px] text-text-muted">EXAMPLE
                                        </th>
                                    </tr>
                                </thead>
                                <tbody id="importTableBody" className="divide-y divide-border-subtle"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div id="importOptions" className="hidden space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="font-section-label text-section-label text-text-muted block mb-1">DEFAULT
                                LEVEL</label>
                            <select id="importLevel"
                                className="appearance-none w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none">
                                <option value="A1">A1</option>
                                <option value="A2" selected>A2</option>
                                <option value="B1">B1</option>
                                <option value="B2">B2</option>
                                <option value="C1">C1</option>
                                <option value="C2">C2</option>
                            </select>
                        </div>
                        <div>
                            <label className="font-section-label text-section-label text-text-muted block mb-1">DEFAULT
                                POS</label>
                            <select id="importPos"
                                className="appearance-none w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none">
                                <option value="NOUN">Noun</option>
                                <option value="VERB">Verb</option>
                                <option value="ADJECTIVE">Adjective</option>
                                <option value="ADVERB">Adverb</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="importProgressWrap" className="hidden">
                        <div className="flex justify-between mb-1">
                            <span className="font-helper-text text-xs text-text-muted">Mengimpor...</span>
                            <span id="importProgressText" className="font-helper-text text-xs text-secondary">0 / 0</span>
                        </div>
                        <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                            <div id="importProgressBar"
                                className="h-full bg-secondary rounded-full transition-all duration-300" style={{"width":"0%"}}>
                            </div>
                        </div>
                    </div>
                    <div id="importResultMsg" className="hidden font-helper-text text-xs rounded-lg px-3 py-2"></div>
                </div>
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
                <button id="importCancelBtn" onClick={(event) => { closeImportModal() }}
                    className="px-5 py-2 glass-card rounded-lg border border-border-subtle text-on-surface-variant font-button-text text-[13px] hover:text-on-surface transition-all">Cancel</button>
                <button id="doImportBtn" onClick={(event) => { window.startImport() }}
                    className="px-5 py-2 bg-secondary text-on-secondary font-button-text text-[13px] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                    Import Semua
                </button>
                <button id="importDoneBtn" onClick={(event) => { closeImportModal() }}
                    className="hidden px-6 py-2 bg-tertiary text-on-tertiary font-button-text text-[13px] rounded-lg hover:opacity-90 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Done
                </button>
            </div>
        </div>
    </div>

    
    <div id="editWordModal"
        className="fixed inset-0 z-[100] hidden items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
            className="glass-card w-full max-w-lg rounded-2xl flex flex-col overflow-hidden border border-border-subtle shadow-2xl">
            <div className="p-6 border-b border-border-subtle flex items-center justify-between">
                <div>
                    <h2 className="font-headline-modal text-xl text-on-surface">Edit Vocabulary</h2>
                    <p className="font-helper-text text-text-muted">Update word data in your collection</p>
                </div>
                <button onClick={(event) => { closeEditModal() }}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface-variant">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar" style={{"maxHeight":"70vh"}}>
                <input type="hidden" id="editVocabId" />
                <div>
                    <label className="font-section-label text-section-label text-text-muted block mb-1">WORD *</label>
                    <input id="editWord" type="text" placeholder="e.g. Ephemeral"
                        className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="font-section-label text-section-label text-text-muted block mb-1">PART OF
                            SPEECH</label>
                        <select id="editPos"
                            className="appearance-none w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none">
                            <option value="NOUN">Noun</option>
                            <option value="VERB">Verb</option>
                            <option value="ADJECTIVE">Adjective</option>
                            <option value="ADVERB">Adverb</option>
                            <option value="PRONOUN">Pronoun</option>
                            <option value="PREPOSITION">Preposition</option>
                        </select>
                    </div>
                    <div>
                        <label className="font-section-label text-section-label text-text-muted block mb-1">LEVEL</label>
                        <select id="editLevel"
                            className="appearance-none w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none">
                            <option value="A1">A1</option>
                            <option value="A2">A2</option>
                            <option value="B1">B1</option>
                            <option value="B2">B2</option>
                            <option value="C1">C1</option>
                            <option value="C2">C2</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="font-section-label text-section-label text-text-muted block mb-1">PRONUNCIATION /
                        PHONETIC</label>
                    <input id="editPronunciation" type="text" placeholder="e.g. /ɪˈfem.ər.əl/"
                        className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none" />
                </div>
                <div>
                    <label className="font-section-label text-section-label text-text-muted block mb-1">ARTI (INDONESIA /
                        MEANING_ID)</label>
                    <input id="editMeaningId" type="text" placeholder="e.g. bersifat sementara"
                        className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none" />
                </div>
                <div>
                    <label className="font-section-label text-section-label text-text-muted block mb-1">DEFINITION /
                        EXAMPLE</label>
                    <textarea id="editDef" rows="3" placeholder="Definition or example sentence..."
                        className="w-full bg-surface-container-low border border-border-subtle rounded-lg py-2.5 px-4 text-[14px] text-on-surface focus:ring-1 focus:ring-primary/50 outline-none resize-none"></textarea>
                </div>
                <div>
                    <label className="font-section-label text-section-label text-text-muted block mb-2">STATUS</label>
                    <div className="flex gap-3">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative">
                                <input type="radio" name="editMasteredRadio" value="false" id="editStatusLearning"
                                    onChange={(event) => { document.getElementById('editIsMastered').value='false' }}
                                    className="peer sr-only" />
                                <div
                                    className="w-4 h-4 rounded-full border-2 border-outline peer-checked:border-secondary peer-checked:bg-secondary transition-colors">
                                </div>
                            </div>
                            <span
                                className="font-section-label text-[11px] text-on-surface-variant group-hover:text-on-surface transition-colors">Learning</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative">
                                <input type="radio" name="editMasteredRadio" value="true" id="editStatusMastered"
                                    onChange={(event) => { document.getElementById('editIsMastered').value='true' }}
                                    className="peer sr-only" />
                                <div
                                    className="w-4 h-4 rounded-full border-2 border-outline peer-checked:border-tertiary peer-checked:bg-tertiary transition-colors">
                                </div>
                            </div>
                            <span
                                className="font-section-label text-[11px] text-on-surface-variant group-hover:text-on-surface transition-colors">Mastered</span>
                        </label>
                    </div>
                    <input type="hidden" id="editIsMastered" value="false" />
                </div>
            </div>
            <div className="p-6 pt-4 flex justify-end gap-3 border-t border-border-subtle">
                <button onClick={(event) => { closeEditModal() }}
                    className="px-5 py-2 glass-card rounded-lg border border-border-subtle text-on-surface-variant font-button-text text-[13px] hover:text-on-surface transition-all">Cancel</button>
                <button id="saveEditBtn" onClick={(event) => { submitEditWord() }}
                    className="px-5 py-2 bg-secondary text-on-secondary font-button-text text-[13px] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Save Changes
                </button>
            </div>
        </div>
    </div>

    
    <div id="deleteConfirmModal"
        className="fixed inset-0 z-[100] hidden items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div
            className="glass-card w-full max-w-sm rounded-2xl flex flex-col overflow-hidden border border-error/30 shadow-2xl">
            <div className="p-6 border-b border-border-subtle flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-error text-[22px]">warning</span>
                </div>
                <div>
                    <h2 className="font-headline-modal text-base text-on-surface">Delete Vocabulary?</h2>
                    <p className="font-helper-text text-text-muted text-xs mt-0.5">This action cannot be undone</p>
                </div>
            </div>
            <div className="p-6">
                <p className="font-body-large text-on-surface-variant text-[14px] leading-relaxed">
                    Kata <span id="deleteWordName" className="text-on-surface font-bold"></span> akan dihapus dari koleksimu
                    secara permanen.
                </p>
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
                <button onClick={(event) => { closeDeleteModal() }}
                    className="px-5 py-2 glass-card rounded-lg border border-border-subtle text-on-surface-variant font-button-text text-[13px] hover:text-on-surface transition-all">Cancel</button>
                <button id="confirmDeleteBtn" onClick={(event) => { executeDelete() }}
                    className="px-5 py-2 bg-error text-on-error font-button-text text-[13px] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    Delete
                </button>
            </div>
        </div>
    </div>


    </>
  );
}
