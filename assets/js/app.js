/* ============================================================
   Fe'l-atvor tezaurusi — ilova mantig'i
   ============================================================ */
(function () {
    'use strict';

    const DATA = (window.LEKSEMALAR || []).slice();

    /* ---------- Yordamchi funksiyalar ---------- */

    // Qutblilik: salbiy / ijobiy / neytral
    function polarity(o) {
        const t = (o.Giperonimi + ' ' + o.Uslubiy + ' ' + o.Izoh).toLowerCase();
        if (/salbiy|nuqson|\billat\b|qusur|huquqbuzar/.test(t)) return 'neg';
        if (/ijobiy|fazilat|insonparvar|olijanob|insoniylik/.test(t)) return 'pos';
        return 'neg';
    }

    // Birinchi harf (O', G', Sh, Ch digraf emas — oddiy belgi)
    function firstLetter(lemma) {
        const c = lemma.trim().charAt(0).toUpperCase();
        return c;
    }

    // Vergul bo'yicha ajratish, lekin qavs ichidagini buzmasdan
    function splitTop(str) {
        const out = [];
        let depth = 0, cur = '';
        for (const ch of str) {
            if (ch === '(') depth++;
            if (ch === ')') depth = Math.max(0, depth - 1);
            if ((ch === ',' || ch === ';') && depth === 0) {
                if (cur.trim()) out.push(cur.trim());
                cur = '';
            } else cur += ch;
        }
        if (cur.trim()) out.push(cur.trim());
        return out;
    }

    // Bosh so'z (qavsdan oldingi qism)
    function headWord(term) {
        return term.split('(')[0].replace(/[.:;]+$/, '').trim();
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    // Lemma bo'yicha indeks (kichik harfda) — bog'lanish uchun
    const lemmaIndex = new Map();
    DATA.forEach(o => lemmaIndex.set(o.Lemma.toLowerCase(), o));
    function findLemma(word) {
        return lemmaIndex.get(word.toLowerCase().trim());
    }

    /* ---------- Holat ---------- */
    let state = {
        query: '',
        letter: null,
        activeId: null,
    };

    /* ---------- DOM ---------- */
    const $ = sel => document.querySelector(sel);
    const searchInput = $('#searchInput');
    const wordlistEl = $('#wordlist');
    const listEmptyEl = $('#listEmpty');
    const countBadge = $('#countBadge');
    const detailEl = $('#detail');
    const alphabarEl = $('#alphabar');
    const footerStat = $('#footerStat');

    /* ---------- Alifbo paneli ---------- */
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVXYZ'.split("");
    // Mavjud harflar
    const presentLetters = new Set(DATA.map(o => firstLetter(o.Lemma)));

    function buildAlphabar() {
        let html = `<button class="alpha ${state.letter === null ? 'is-active' : ''}" data-letter="">Hammasi</button>`;
        for (const L of ALPHABET) {
            const has = presentLetters.has(L);
            html += `<button class="alpha ${state.letter === L ? 'is-active' : ''}" data-letter="${L}" ${has ? '' : 'disabled'}>${L}</button>`;
        }
        // alifbodan tashqari (masalan, raqamli) harflar
        [...presentLetters].filter(l => !ALPHABET.includes(l)).sort().forEach(L => {
            html += `<button class="alpha ${state.letter === L ? 'is-active' : ''}" data-letter="${L}">${L}</button>`;
        });
        alphabarEl.innerHTML = html;
    }

    /* ---------- Filtrlash ---------- */
    function getFiltered() {
        let list = DATA;
        const q = state.query.toLowerCase().trim();
        if (q) {
            list = list.filter(o =>
                o.Lemma.toLowerCase().includes(q) ||
                o.Izoh.toLowerCase().includes(q) ||
                o.Sinonimi.toLowerCase().includes(q)
            );
        }
        if (state.letter) {
            list = list.filter(o => firstLetter(o.Lemma) === state.letter);
        }
        return list;
    }

    function highlight(text, q) {
        if (!q) return escapeHtml(text);
        const i = text.toLowerCase().indexOf(q.toLowerCase());
        if (i < 0) return escapeHtml(text);
        return escapeHtml(text.slice(0, i)) + '<mark>' +
            escapeHtml(text.slice(i, i + q.length)) + '</mark>' +
            escapeHtml(text.slice(i + q.length));
    }

    /* ---------- So'zlar ro'yxati ---------- */
    function renderList() {
        const list = getFiltered();
        countBadge.textContent = list.length;

        if (!list.length) {
            wordlistEl.innerHTML = '';
            listEmptyEl.hidden = false;
            return;
        }
        listEmptyEl.hidden = true;

        const q = state.query.trim();
        wordlistEl.innerHTML = list.map(o => {
            const pol = polarity(o);
            const active = o.ID === state.activeId ? 'is-active' : '';
            return `<li><button class="${active}" data-id="${o.ID}">
        <span class="dot ${pol === 'pos' ? 'pos' : ''}"></span>
        <span>${highlight(o.Lemma, q)}</span>
      </button></li>`;
        }).join('');
    }

    /* ---------- Detallar ---------- */
    function chip(term, opts) {
        const head = headWord(term);
        const target = findLemma(head);
        const cls = opts.cls || '';
        if (target) {
            return `<button class="chip chip--link ${cls}" data-goto="${target.ID}" title="«${escapeHtml(target.Lemma)}» so'ziga o'tish">
        ${escapeHtml(term)}<span class="chip__arrow">↗</span></button>`;
        }
        return `<span class="chip ${cls}">${escapeHtml(term)}</span>`;
    }

    function chipsBlock(str, cls) {
        const items = splitTop(str);
        if (!items.length) return '';
        return `<div class="chips">${items.map(t => chip(t, { cls })).join('')}</div>`;
    }

    function taxBlock(str) {
        const items = splitTop(str);
        if (!items.length) return '';
        return `<div class="tax">${items.map(t => {
            const head = headWord(t);
            const rest = t.slice(head.length).trim();
            const target = findLemma(head);
            const headHtml = target
                ? `<b class="chip--link" style="cursor:pointer;color:var(--brand)" data-goto="${target.ID}">${escapeHtml(head)}</b>`
                : `<b>${escapeHtml(head)}</b>`;
            return `<div class="tax__item">${headHtml} ${escapeHtml(rest)}</div>`;
        }).join('')}</div>`;
    }

    const ICONS = {
        izoh: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
        namuna: '<path d="M3 21c3-3 6-3 9 0M3 7c3-3 6-3 9 0M12 7c3-3 6-3 9 0M12 21c3-3 6-3 9 0"/>',
        sinonim: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
        antonim: '<path d="M7 17L17 7M7 7l5 5-5 5M17 7v10"/>',
        giponim: '<path d="M12 3v18M5 10l7 7 7-7"/>',
        giperonim: '<path d="M12 21V3M5 14l7-7 7 7"/>',
        uslub: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        kollok: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
    };

    function fieldLabel(text, icon, ico) {
        return `<div class="field__label"><span class="ico ico--${ico}"><svg viewBox="0 0 24 24">${icon}</svg></span>${text}</div>`;
    }

    function renderDetail(o) {
        const pol = polarity(o);
        const polTag = pol === 'pos'
            ? '<span class="tag tag--pos">Ijobiy fe\'l-atvor</span>'
            : '<span class="tag tag--neg">Salbiy fe\'l-atvor</span>';

        let html = `<article class="card">
      <div class="card__head">
        <div class="card__eyebrow">${polTag}<span class="card__id">${o.ID}</span></div>
        <h1 class="card__lemma">${escapeHtml(o.Lemma)}</h1>
        ${o.Model ? `<div class="card__model"><span>Model</span> ${escapeHtml(o.Model)}</div>` : ''}
      </div>
      <div class="card__body">`;

        if (o.Izoh) {
            html += `<div class="field">${fieldLabel('Izoh', ICONS.izoh, 'brand')}
        <div class="field__izoh">${escapeHtml(o.Izoh)}</div></div>`;
        }
        if (o.Namuna) {
            html += `<div class="field">${fieldLabel('Namuna', ICONS.namuna, 'brand')}
        <div class="field__namuna">${escapeHtml(o.Namuna)}</div></div>`;
        }
        if (o.Sinonimi) {
            html += `<div class="field">${fieldLabel('Sinonimlar', ICONS.sinonim, 'pos')}
        ${chipsBlock(o.Sinonimi, 'chip--pos')}</div>`;
        }
        if (o.Antonimi) {
            html += `<div class="field">${fieldLabel('Antonimlar', ICONS.antonim, 'neg')}
        ${chipsBlock(o.Antonimi, 'chip--neg')}</div>`;
        }

        // Giponim / Giperonim yonma-yon
        if (o.Giponimi || o.Giperonimi) {
            html += '<div class="field-grid">';
            if (o.Giponimi) {
                html += `<div class="field">${fieldLabel('Giponimlar', ICONS.giponim, 'cyan')}
          ${taxBlock(o.Giponimi)}</div>`;
            }
            if (o.Giperonimi) {
                html += `<div class="field">${fieldLabel('Giperonimlar', ICONS.giperonim, 'cyan')}
          ${taxBlock(o.Giperonimi)}</div>`;
            }
            html += '</div>';
        }

        if (o.Uslubiy) {
            html += `<div class="field">${fieldLabel('Uslubiy xoslanish', ICONS.uslub, 'amber')}
        <div class="field__text">${escapeHtml(o.Uslubiy)}</div></div>`;
        }
        if (o.Kollokatsiya) {
            html += `<div class="field">${fieldLabel('Kollokatsiya', ICONS.kollok, 'amber')}
        ${chipsBlock(o.Kollokatsiya, '')}</div>`;
        }

        html += '</div></article>';
        detailEl.innerHTML = html;
        detailEl.style.animation = 'none';
        void detailEl.offsetWidth;
        detailEl.style.animation = '';
    }

    /* ---------- Welcome ---------- */
    function renderWelcome() {
        const total = DATA.length;
        const neg = DATA.filter(o => polarity(o) === 'neg').length;
        const pos = total - neg;
        const samples = ['MAG\'RUR', 'BAXIL', 'ADOLATLI', 'ZIYRAK', 'BERAHM']
            .filter(findLemma);

        detailEl.innerHTML = `<div class="welcome">
      <div class="welcome__badge">✦ O'zbek tili elektron tezaurusi</div>
      <h1>Inson <em>fe'l-atvori</em>ni ifodalovchi so'zlar lug'ati</h1>
      <p>Xarakter va xulq-atvorni bildiruvchi so'zlarning izohi, namunalari,
         sinonim-antonimlari, giponim-giperonimlari hamda uslubiy xoslanishi.
         So'zni tanlang yoki yuqoridan qidiring.</p>
      <div class="welcome__stats">
        <div class="stat"><b>${total}</b><span>jami leksema</span></div>
        <div class="stat"><b style="color:var(--neg)">${neg}</b><span>salbiy</span></div>
        <div class="stat"><b style="color:var(--pos)">${pos}</b><span>ijobiy</span></div>
        <div class="stat"><b>${presentLetters.size}</b><span>harf bo'yicha</span></div>
      </div>
      <div class="welcome__samples">
        ${samples.map(s => `<button class="chip chip--link" data-goto-lemma="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}
      </div>
      <p class="welcome__hint" style="margin-top:26px">
        Maslahat: tezkor qidiruv uchun <kbd>/</kbd> tugmasini bosing.
      </p>
    </div>`;
    }

    /* ---------- Navigatsiya ---------- */
    function selectId(id, opts) {
        opts = opts || {};
        const o = DATA.find(x => x.ID === id);
        if (!o) return;
        state.activeId = id;
        renderDetail(o);
        // ro'yxatdagi aktivni yangilash
        wordlistEl.querySelectorAll('button').forEach(b =>
            b.classList.toggle('is-active', b.dataset.id === id));
        // ko'rinishga olib kelish
        const btn = wordlistEl.querySelector(`button[data-id="${id}"]`);
        if (btn) btn.scrollIntoView({ block: 'nearest' });
        if (!opts.silent) location.hash = encodeURIComponent(o.Lemma);
        if (opts.scrollTop) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function selectLemma(lemma, opts) {
        const o = findLemma(lemma);
        if (o) selectId(o.ID, opts);
    }

    /* ---------- Hodisalar ---------- */
    searchInput.addEventListener('input', () => {
        state.query = searchInput.value;
        renderList();
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const first = getFiltered()[0];
            if (first) { selectId(first.ID); searchInput.blur(); }
        } else if (e.key === 'Escape') {
            searchInput.value = ''; state.query = ''; renderList();
        }
    });

    alphabarEl.addEventListener('click', e => {
        const btn = e.target.closest('.alpha');
        if (!btn) return;
        const L = btn.dataset.letter;
        state.letter = L === '' ? null : L;
        buildAlphabar();
        renderList();
    });

    wordlistEl.addEventListener('click', e => {
        const btn = e.target.closest('button[data-id]');
        if (btn) selectId(btn.dataset.id);
    });

    // Detal va welcome ichidagi bog'lanishlar (chiplar)
    document.body.addEventListener('click', e => {
        const goto = e.target.closest('[data-goto]');
        if (goto) { selectId(goto.dataset.goto, { scrollTop: true }); return; }
        const gotoL = e.target.closest('[data-goto-lemma]');
        if (gotoL) { selectLemma(gotoL.dataset.gotoLemma, { scrollTop: true }); return; }
    });

    $('#clearSearch').addEventListener('click', () => {
        searchInput.value = ''; state.query = ''; state.letter = null;
        buildAlphabar(); renderList(); searchInput.focus();
    });

    // Klaviatura: '/' qidiruv, strelkalar bilan ro'yxatda yurish
    document.addEventListener('keydown', e => {
        if (e.key === '/' && document.activeElement !== searchInput) {
            e.preventDefault(); searchInput.focus(); searchInput.select();
            return;
        }
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
            document.activeElement !== searchInput) {
            const list = getFiltered();
            if (!list.length) return;
            let idx = list.findIndex(o => o.ID === state.activeId);
            idx = e.key === 'ArrowDown' ? Math.min(list.length - 1, idx + 1)
                : Math.max(0, idx - 1);
            if (idx < 0) idx = 0;
            e.preventDefault();
            selectId(list[idx].ID);
        }
    });

    /* ---------- Mavzu ---------- */
    const themeToggle = $('#themeToggle');
    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
        try { localStorage.setItem('felatvor-theme', t); } catch (_) { }
    }
    (function initTheme() {
        let t;
        try { t = localStorage.getItem('felatvor-theme'); } catch (_) { }
        if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        applyTheme(t);
    })();
    themeToggle.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        applyTheme(cur === 'dark' ? 'light' : 'dark');
    });

    /* ---------- Footer ---------- */
    footerStat.textContent = `${DATA.length} ta leksema`;

    /* ---------- Ishga tushirish ---------- */
    buildAlphabar();
    renderList();

    // URL hash orqali ochish
    function fromHash() {
        const h = decodeURIComponent(location.hash.replace(/^#/, '')).trim();
        if (h && findLemma(h)) {
            selectLemma(h, { silent: true });
            return true;
        }
        return false;
    }
    if (!fromHash()) renderWelcome();
    window.addEventListener('hashchange', () => { if (!fromHash()) renderWelcome(); });

})();
