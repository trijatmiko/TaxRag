'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserId, useSession } from '@/hooks/useSession';

export default function CorrectionsPage() {
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
    // CONFIG
    // -------------------------------------------------------
    const WEBHOOK_BASE = process.env.NEXT_PUBLIC_N8N_BASE_URL || 'http://localhost:5678/webhook';
    const CORRECTIONS_URL = WEBHOOK_BASE + '/corrections/list';
    const CURRENT_USER_ID = getCurrentUserId() || '86b04bfc-e6b7-4265-bcc9-3ef949eba7c3';
    const MAX_RETRY = 3;

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------
    let allCorrections: any[] = [];
    let filteredCorrections: any[] = [];
    let currentFilter = 'all';
    let currentPage = 1;
    let visibleCount = 5;
    let searchQuery = '';
    let fetchAttempt = 0;

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------
    function fetchTimeout(url: string, opts: any, ms: number) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms || 12000);
      opts.signal = ctrl.signal;
      return fetch(url, opts).finally(() => clearTimeout(t));
    }

    function showError(msg: string) {
      const banner = document.getElementById('errorBanner');
      const msgEl = document.getElementById('errorMsg');
      if (banner && msgEl) {
        banner.classList.remove('hidden');
        msgEl.textContent = msg;
      }
    }
    function hideError() {
      const banner = document.getElementById('errorBanner');
      if (banner) banner.classList.add('hidden');
    }
    function retryFetch() {
      hideError();
      fetchAttempt = 0;
      doFetch();
    }

    // -------------------------------------------------------
    // Categorize correction from reason/topic text
    // -------------------------------------------------------
    function categorize(c: any) {
      const text = ((c.reason || '') + ' ' + (c.topic || '')).toLowerCase();
      if (text.match(/grammar|tense|verb|clause|passive|article|preposition/)) return 'grammar';
      if (text.match(/vocab|word|meaning|synonym|spelling/)) return 'vocabulary';
      if (text.match(/syntax|structure|sentence|order|phrase/)) return 'syntax';
      return 'grammar'; // default
    }

    function categoryBadge(cat: string) {
      const map: Record<string, string> = {
        grammar: 'bg-secondary-container/30 text-on-secondary-container',
        vocabulary: 'bg-tertiary-container/20 text-on-tertiary-container',
        syntax: 'bg-primary/10 text-primary',
      };
      return map[cat] || 'bg-surface-container text-on-surface-variant';
    }

    function escapeHtml(str: string) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Highlight the differing word between wrong and correct text
    function highlightDiff(wrongText: string, correctText: string) {
      const wrongWords = wrongText.split(' ');
      const correctWords = correctText.split(' ');
      const wrongOut = [];
      const correctOut = [];

      const maxLen = Math.max(wrongWords.length, correctWords.length);
      for (let i = 0; i < maxLen; i++) {
        const w = wrongWords[i] || '';
        const c = correctWords[i] || '';
        if (w !== c) {
          wrongOut.push(w ? '<span class="text-error border-b border-error/30 font-bold px-1">' + escapeHtml(w) + '</span>' : '');
          correctOut.push(c ? '<span class="text-tertiary border-b border-tertiary/30 font-bold px-1">' + escapeHtml(c) + '</span>' : '');
        } else {
          wrongOut.push(escapeHtml(w));
          correctOut.push(escapeHtml(c));
        }
      }
      return {
        wrong: wrongOut.join(' '),
        correct: correctOut.join(' ')
      };
    }

    function formatDate(dateStr: string) {
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch (e) { return ''; }
    }

    // -------------------------------------------------------
    // Render one correction card
    // -------------------------------------------------------
    function renderCard(c: any) {
      const cat = categorize(c);
      const diff = highlightDiff(c.wrong_text || '', c.correct_text || '');
      const topic = c.topic || c.session_topic || 'General';
      const reason = c.reason || '';
      const date = formatDate(c.created_at);
      const level = c.user_level || 'Intermediate';

      return '<div class="glass-card p-component-padding rounded-xl group transition-all duration-300 correction-card" data-cat="' + cat + '">' +
        '<div class="flex flex-col md:flex-row justify-between gap-gutter">' +
        '<div class="flex-1 space-y-4">' +
        '<div class="space-y-2">' +
        '<div class="flex items-start gap-3">' +
        '<span class="material-symbols-outlined text-error text-[18px] mt-1">close</span>' +
        '<p class="font-body-large text-on-surface-variant italic">&ldquo;' + diff.wrong + '&rdquo;</p>' +
        '</div>' +
        '<div class="flex items-start gap-3">' +
        '<span class="material-symbols-outlined text-tertiary text-[18px] mt-1" style="font-variation-settings:\'FILL\' 1;">check_circle</span>' +
        '<p class="font-body-large text-on-surface font-medium">&ldquo;' + diff.correct + '&rdquo;</p>' +
        '</div>' +
        '</div>' +
        (reason ? '<div class="bg-surface-container-low p-4 rounded-lg border-l-4 border-primary/40">' +
          '<p class="font-helper-text text-on-surface-variant leading-relaxed">' +
          '<span class="text-primary font-bold">Rule:</span> ' + escapeHtml(reason) +
          '</p></div>' : '') +
        '</div>' +
        '<div class="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0">' +
        '<span class="px-3 py-1 rounded-full font-section-label text-[10px] ' + categoryBadge(cat) + '">' + cat.charAt(0).toUpperCase() + cat.slice(1) + '</span>' +
        '<span class="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full font-section-label text-[10px]">' + escapeHtml(level) + '</span>' +
        (date ? '<span class="text-text-muted font-helper-text text-[10px]">' + date + '</span>' : '') +
        '</div>' +
        '</div>' +
        '</div>';
    }

    // -------------------------------------------------------
    // Apply filter + search
    // -------------------------------------------------------
    function applyFilter() {
      let data = allCorrections.slice();
      if (searchQuery) {
        data = data.filter((c) => {
          return (c.wrong_text + ' ' + c.correct_text + ' ' + (c.reason || '')).toLowerCase().includes(searchQuery);
        });
      }
      if (currentFilter !== 'all') {
        data = data.filter((c) => categorize(c) === currentFilter);
      }
      filteredCorrections = data;
      currentPage = 1;
      visibleCount = 5;
    }

    // -------------------------------------------------------
    // Render page
    // -------------------------------------------------------
    function renderPage() {
      const list = document.getElementById('correctionsList');
      const empty = document.getElementById('emptyState');
      const pagNav = document.getElementById('paginationNav');
      const skeleton = document.getElementById('skeletonList');
      const totalCount = document.getElementById('totalCount');
      if (!list || !empty || !pagNav || !skeleton || !totalCount) return;

      const total = filteredCorrections.length;
      const page = filteredCorrections.slice(0, visibleCount);

      skeleton.classList.add('hidden');
      totalCount.textContent = total > 0 ? '(' + total + ')' : '';

      if (page.length === 0) {
        list.classList.add('hidden');
        empty.classList.remove('hidden');
        pagNav.classList.add('hidden');
        return;
      }

      empty.classList.add('hidden');
      list.classList.remove('hidden');
      list.innerHTML = page.map(renderCard).join('');

      // Load More button
      pagNav.classList.remove('hidden');
      if (visibleCount < total) {
        const remaining = total - visibleCount;
        pagNav.innerHTML =
          '<button onclick="loadMore()" class="flex items-center gap-2 px-6 py-2.5 glass-card border border-border-subtle text-on-surface-variant hover:text-primary hover:border-primary/40 rounded-full font-section-label text-section-label transition-all duration-200 active:scale-95">' +
          '<span class="material-symbols-outlined text-[16px]">expand_more</span>' +
          'Load More <span class="ml-1 text-text-muted">(' + remaining + ' remaining)</span>' +
          '</button>';
      } else {
        pagNav.innerHTML =
          '<p class="font-helper-text text-text-muted text-xs">All ' + total + ' corrections loaded</p>';
      }

      // Glow effects
      document.querySelectorAll('.glass-card').forEach((card: any) => {
        card.addEventListener('mousemove', (e: any) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', (e.clientX - r.left) + 'px');
          card.style.setProperty('--mouse-y', (e.clientY - r.top) + 'px');
        });
      });
    }

    function loadMore() {
      visibleCount += 5;
      renderPage();
    }

    // -------------------------------------------------------
    // Update stats bar
    // -------------------------------------------------------
    function updateStats(stats: any) {
      // Accuracy
      const acc = stats.accuracy_pct || 0;
      const el = document.getElementById('statAccuracy');
      if (el) {
        el.textContent = acc + '% Accuracy';
        el.classList.remove('skeleton', 'w-24', 'h-6');
      }

      // Animate accuracy circle (r=28, circumference=175)
      const offset = 175 - (175 * acc / 100);
      const accCircle = document.getElementById('accuracyCircle');
      if (accCircle) accCircle.setAttribute('stroke-dashoffset', offset.toString());

      const sub = document.getElementById('statSubtitle');
      if (sub) sub.textContent = stats.total_corrections + ' corrections total';

      // Most improved / needs focus
      const imp = document.getElementById('statImproved');
      if (imp) {
        imp.textContent = stats.most_improved || '—';
        imp.classList.remove('skeleton', 'w-20', 'h-6');
      }

      const foc = document.getElementById('statFocus');
      if (foc) {
        foc.textContent = stats.needs_focus || '—';
        foc.classList.remove('skeleton', 'w-20', 'h-6');
      }

      // Mastery circle (r=45, circumference=283)
      const mastery = stats.mastery_pct || 0;
      const masPct = document.getElementById('masteryPct');
      if (masPct) masPct.textContent = mastery + '%';
      const masCircle = document.getElementById('masteryCircle');
      if (masCircle) masCircle.setAttribute('stroke-dashoffset', (283 - (283 * mastery / 100)).toString());

      // Insight text
      const focus = stats.needs_focus || 'grammar';
      const insText = document.getElementById('insightText');
      if (insText) {
        insText.innerHTML =
          'Your <span class="text-secondary font-bold">' + (stats.most_improved || 'Grammar') + '</span> patterns show improvement. ' +
          'Focus area: <span class="text-primary font-bold">' + focus.charAt(0).toUpperCase() + focus.slice(1) + '</span>. ' +
          'Keep practicing to reinforce these patterns.';
        insText.classList.remove('italic', 'text-on-surface-variant');
        insText.classList.add('text-on-surface');
      }
    }

    // -------------------------------------------------------
    // Update user info
    // -------------------------------------------------------
    function updateUser(user: any) {
      if (!user) return;
      const uName = document.getElementById('userName');
      const uLevel = document.getElementById('userLevel');
      const uAvatar = document.getElementById('userAvatar') as HTMLImageElement;
      if (uName) uName.textContent = user.name || '—';
      if (uLevel) uLevel.textContent = user.level || '—';
      
      const avatarUrl = user.avatar_url || user.photo_url || user.picture || null;
      const displayName = user.name || 'User';
      const photoUrl = avatarUrl ? avatarUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f8cff&color=fff&bold=true&size=80&rounded=true`;

      if (uAvatar) {
        uAvatar.src = photoUrl;
        uAvatar.style.display = 'block';
        uAvatar.onerror = () => {
          uAvatar.style.display = 'none';
        };
      }
    }

    // -------------------------------------------------------
    // Fetch with auto-retry
    // -------------------------------------------------------
    function fetchCorrections() {
      fetchAttempt = 0;
      doFetch();
    }

    function doFetch() {
      fetchAttempt++;
      console.log('[corrections] fetch attempt ' + fetchAttempt + '/' + MAX_RETRY);

      fetchTimeout(CORRECTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: CURRENT_USER_ID })
      }, 12000)
        .then((res: any) => {
          if (!res.ok) return res.text().then((t: any) => { throw new Error('HTTP ' + res.status + ': ' + t.substring(0, 100)); });
          return res.json();
        })
        .then((data: any) => {
          fetchAttempt = 0;
          hideError();

          // Support response formats
          let corrections: any[] = [];
          if (Array.isArray(data)) corrections = data;
          else if (Array.isArray(data.corrections)) corrections = data.corrections;
          else if (Array.isArray(data.data)) corrections = data.data;

          if (data.user) updateUser(data.user);
          if (data.stats) updateStats(data.stats);

          allCorrections = corrections;
          applyFilter();
          renderPage();
        })
        .catch((err: any) => {
          console.warn('[corrections] attempt ' + fetchAttempt + ' failed:', err.message);
          if (fetchAttempt < MAX_RETRY) {
            const delay = fetchAttempt === 1 ? 800 : 2500;
            setTimeout(doFetch, delay);
            return;
          }
          showError('Tidak dapat terhubung ke n8n. Periksa koneksi.');
          const skel = document.getElementById('skeletonList');
          const emp = document.getElementById('emptyState');
          if (skel) skel.classList.add('hidden');
          if (emp) emp.classList.remove('hidden');
        });
    }

    function scrollToTop() {
      const scrollBtn = document.getElementById('scrollTopBtn');
      if (scrollBtn) {
        scrollBtn.classList.add('hiding');
        scrollBtn.classList.remove('visible');
      }
      const main = document.querySelector('main');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // -------------------------------------------------------
    // Setup Event Listeners
    // -------------------------------------------------------
    const mainEl = document.querySelector('main');
    const scrollBtnEl = document.getElementById('scrollTopBtn');
    if (mainEl && scrollBtnEl) {
      mainEl.addEventListener('scroll', () => {
        if (mainEl.scrollTop > 120) {
          scrollBtnEl.classList.add('visible');
          scrollBtnEl.classList.remove('hiding');
        }
      });
    }

    const filterBtns = document.getElementById('filterBtns');
    if (filterBtns) {
      filterBtns.addEventListener('click', (e: any) => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        currentFilter = btn.getAttribute('data-filter');
        document.querySelectorAll('.filter-btn').forEach((b: any) => {
          b.classList.remove('bg-surface-container', 'text-on-surface');
          b.classList.add('bg-surface-container-low', 'text-on-surface-variant');
        });
        btn.classList.add('bg-surface-container', 'text-on-surface');
        btn.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
        applyFilter();
        renderPage();
      });
    }

    let searchTimer: any;
    const searchInputEl = document.getElementById('searchInput');
    if (searchInputEl) {
      searchInputEl.addEventListener('input', (e: any) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          searchQuery = e.target.value.toLowerCase().trim();
          applyFilter();
          renderPage();
        }, 300);
      });
    }

    fetchCorrections();

    // Expose functions to window
    (window as any).retryFetch = retryFetch;
    (window as any).loadMore = loadMore;
    (window as any).scrollToTop = scrollToTop;

    const logoutBtns = Array.from(document.querySelectorAll('a')).filter(el => el.textContent?.includes('Logout'));
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
      <style dangerouslySetInnerHTML={{
        __html: `
        body {
            background-color: #0d0f14;
        }

        .glass-card {
            background: rgba(28, 32, 48, 0.4);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            position: relative;
            overflow: hidden;
        }

        .glass-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(800px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(175, 198, 255, 0.06), transparent 40%);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.5s;
        }

        .glass-card:hover::before {
            opacity: 1;
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

        .correction-card {
            animation: fadeIn .3s ease forwards;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(6px)
            }

            to {
                opacity: 1;
                transform: translateY(0)
            }
        }

        #scrollTopBtn {
            opacity: 0;
            transform: translateY(12px) scale(0.9);
            pointer-events: none;
            transition: opacity 0.25s ease, transform 0.25s ease;
        }

        #scrollTopBtn.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }

        #scrollTopBtn.hiding {
            opacity: 0;
            transform: translateY(-8px) scale(0.9);
            pointer-events: none;
        }
      ` }} />

      <div className="flex h-screen overflow-hidden">
        {/* SideNavBar */}
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
            <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-lg group"
              href="/dashboard/vocabulary">
              <span className="material-symbols-outlined">exercise</span>
              <span className="font-section-label text-section-label">Vocabulary Lab</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-primary font-bold bg-secondary-container/20 rounded-lg scale-95 transition-transform group"
              href="/dashboard/corrections">
              <span className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
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
            <button onClick={() => router.push('/dashboard/lesson')}
              className="w-full font-button-text text-button-text py-4 rounded-xl flex items-center justify-center gap-2 mb-6 hover:opacity-90 transition-opacity bg-white text-black active:scale-95">
              Start Lesson
            </button>
            <a className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container transition-colors duration-200 rounded-lg"
              href="#">
              <span className="material-symbols-outlined">logout</span>
              <span className="font-section-label text-section-label">Logout</span>
            </a>
          </div>
        </aside>

        {/* Main Content */}
        <div className={`h-screen flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-sidebar-width' : 'ml-0'} overflow-hidden flex-1`}>

          {/* TopAppBar */}
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
              <div className="relative hidden lg:block">
                <span
                  className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                <input id="searchInput"
                  className="bg-surface-container-low border border-border-subtle rounded-full pl-10 pr-4 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all w-64"
                  placeholder="Search my mistakes..." type="text" />
              </div>
              <button className="text-on-surface-variant hover:text-primary transition-opacity">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="flex items-center gap-3 pl-6 border-l border-border-subtle">
                <div className="text-right">
                  <p id="userName" className="font-button-text text-button-text text-on-surface">—</p>
                  <p id="userLevel" className="font-helper-text text-helper-text text-text-muted">—</p>
                </div>
                <img id="userAvatar" alt="User Avatar"
                  className="w-10 h-10 rounded-full border-2 border-primary object-cover cursor-pointer"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
            </div>
          </header>

          {/* Error Banner */}
          <div id="errorBanner"
            className="hidden bg-error-container/80 text-on-error-container text-center py-2 px-4 text-xs border-b border-error/20 font-helper-text">
            <span id="errorMsg"></span>
            <button onClick={() => (window as any).retryFetch()} className="ml-3 underline font-bold">Retry</button>
          </div>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-container-padding">
            <div className="max-w-7xl mx-auto space-y-section-gap">

              <h1 className="font-headline-modal text-2xl text-on-surface">Corrections</h1>

              {/* Stats Bento */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
                {/* Accuracy Card */}
                <div
                  className="md:col-span-2 glass-card p-component-padding rounded-xl flex items-center gap-gutter">
                  <div
                    className="w-16 h-16 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center relative flex-shrink-0">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" fill="transparent" r="28" stroke="rgba(255,255,255,0.05)"
                        strokeWidth="4" />
                      <circle id="accuracyCircle" cx="32" cy="32" fill="transparent" r="28"
                        stroke="#afc6ff" strokeDasharray="175" strokeDashoffset="175" strokeWidth="4"
                        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
                    </svg>
                    <span className="material-symbols-outlined text-primary text-2xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}>insights</span>
                  </div>
                  <div>
                    <h3 id="statAccuracy"
                      className="font-stat-value text-xl text-primary skeleton inline-block w-24 h-6">&nbsp;
                    </h3>
                    <p id="statSubtitle" className="font-helper-text text-tertiary mt-1">Loading...</p>
                  </div>
                </div>
                <div
                  className="glass-card p-component-padding rounded-xl flex flex-col justify-center items-center text-center">
                  <span className="font-section-label text-tertiary mb-2 uppercase">Most Improved</span>
                  <h4 id="statImproved" className="font-headline-modal text-lg text-on-surface skeleton w-20 h-6">
                    &nbsp;</h4>
                </div>
                <div
                  className="glass-card p-component-padding rounded-xl flex flex-col justify-center items-center text-center">
                  <span className="font-section-label text-secondary mb-2 uppercase">Needs Focus</span>
                  <h4 id="statFocus" className="font-headline-modal text-lg text-on-surface skeleton w-20 h-6">
                    &nbsp;</h4>
                </div>
              </div>

              {/* Corrections Feed */}
              <section className="space-y-gutter">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="font-headline-modal text-lg text-on-surface">Recent Feedback
                    <span id="totalCount" className="text-text-muted font-helper-text text-sm ml-2"></span>
                  </h2>
                  <div className="flex gap-2" id="filterBtns">
                    <button data-filter="all"
                      className="filter-btn active bg-surface-container px-4 py-1.5 rounded-full font-section-label text-on-surface hover:bg-surface-container-high transition-colors">All</button>
                    <button data-filter="grammar"
                      className="filter-btn bg-surface-container-low px-4 py-1.5 rounded-full font-section-label text-on-surface-variant hover:bg-surface-container transition-colors">Grammar</button>
                    <button data-filter="vocabulary"
                      className="filter-btn bg-surface-container-low px-4 py-1.5 rounded-full font-section-label text-on-surface-variant hover:bg-surface-container transition-colors">Vocabulary</button>
                    <button data-filter="syntax"
                      className="filter-btn bg-surface-container-low px-4 py-1.5 rounded-full font-section-label text-on-surface-variant hover:bg-surface-container transition-colors">Syntax</button>
                  </div>
                </div>

                {/* Skeleton loaders */}
                <div id="skeletonList" className="space-y-gutter">
                  <div className="glass-card p-component-padding rounded-xl">
                    <div className="skeleton h-4 w-3/4 mb-3"></div>
                    <div className="skeleton h-4 w-2/3 mb-3"></div>
                    <div className="skeleton h-12 w-full"></div>
                  </div>
                  <div className="glass-card p-component-padding rounded-xl">
                    <div className="skeleton h-4 w-3/4 mb-3"></div>
                    <div className="skeleton h-4 w-2/3 mb-3"></div>
                    <div className="skeleton h-12 w-full"></div>
                  </div>
                  <div className="glass-card p-component-padding rounded-xl">
                    <div className="skeleton h-4 w-3/4 mb-3"></div>
                    <div className="skeleton h-4 w-2/3 mb-3"></div>
                    <div className="skeleton h-12 w-full"></div>
                  </div>
                </div>

                {/* Actual corrections list */}
                <div id="correctionsList" className="space-y-gutter hidden" dangerouslySetInnerHTML={{ __html: '' }}></div>

                {/* Empty state */}
                <div id="emptyState" className="hidden text-center py-16">
                  <span className="material-symbols-outlined text-[48px] text-text-muted">check_circle</span>
                  <p className="font-headline-modal text-base text-on-surface mt-3">No corrections found</p>
                  <p className="font-helper-text text-text-muted">Keep practicing to get feedback!</p>
                </div>

                {/* Pagination */}
                <div id="paginationNav" className="hidden flex items-center justify-center gap-2 py-6" dangerouslySetInnerHTML={{ __html: '' }}></div>
              </section>

              {/* AI Insights Section */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card p-component-padding rounded-xl">
                  <h3 className="font-headline-modal text-lg text-primary mb-6">AI Learning Insights</h3>
                  <div className="flex flex-col md:flex-row gap-gutter">
                    <div className="flex-1 space-y-4">
                      <p id="insightText"
                        className="font-body-large text-on-surface leading-relaxed text-on-surface-variant italic">
                        Analyzing your correction patterns...
                      </p>
                      <div className="flex gap-4">
                        <button
                          className="bg-primary text-on-primary px-6 py-2 rounded-lg font-button-text text-xs hover:opacity-90 transition-all shadow-lg shadow-primary/20">Accept
                          Drills</button>
                        <button
                          className="border border-border-subtle text-on-surface px-6 py-2 rounded-lg font-button-text text-xs hover:bg-surface-container transition-all">Review
                          Later</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  className="glass-card p-component-padding rounded-xl flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.05)"
                        strokeWidth="6" />
                      <circle id="masteryCircle" cx="50" cy="50" fill="none" r="45" stroke="#afc6ff"
                        strokeDasharray="283" strokeDashoffset="283" strokeWidth="6"
                        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s ease" }} />
                    </svg>
                    <span id="masteryPct" className="absolute font-stat-value text-2xl text-primary">—</span>
                  </div>
                  <p className="font-section-label text-text-muted text-center leading-tight">MASTERY
                    LEVEL<br />PROGRESSION</p>
                </div>
              </section>

            </div>
          </main>
        </div>
      </div>

      {/* Mobile Nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl border-t border-border-subtle flex items-center justify-around px-4 z-50">
        <a className="flex flex-col items-center text-on-surface-variant" href="/dashboard/vocabulary">
          <span className="material-symbols-outlined">exercise</span>
          <span className="text-[10px] font-section-label">Lab</span>
        </a>
        <a className="flex flex-col items-center text-primary" href="/dashboard/corrections">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
          <span className="text-[10px] font-section-label">Corrections</span>
        </a>
        <a className="flex flex-col items-center text-on-surface-variant" href="#">
          <span className="material-symbols-outlined">leaderboard</span>
          <span className="text-[10px] font-section-label">Stats</span>
        </a>
        <a className="flex flex-col items-center text-on-surface-variant" href="/dashboard/profile">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-section-label">Profile</span>
        </a>
      </nav>

      {/* Scroll to Top Button */}
      <button id="scrollTopBtn" onClick={() => (window as any).scrollToTop()}
        className="fixed bottom-8 right-8 z-50 w-11 h-11 rounded-full bg-primary/90 text-on-primary shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary transition-colors duration-200 backdrop-blur-sm border border-primary/20">
        <span className="material-symbols-outlined text-[20px]">keyboard_arrow_up</span>
      </button>
    </>
  );
}
