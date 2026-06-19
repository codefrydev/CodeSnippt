const ICONS = {
    Code: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
    Search: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    SearchLarge: `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    Copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
    Check: `<svg class="text-emerald-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    LayoutGrid: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    GitBranch: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>`,
    Terminal: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`,
    Hash: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>`,
    Database: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`,
};

let SNIPPET_COLLECTION = [];
let allSnippetsFlat = [];
const cmInstances = [];

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function modeForCategory(category) {
    switch (category) {
        case 'C#':
            return 'text/x-csharp';
        case 'SQL':
            return 'text/x-sql';
        case 'Git':
        case '.NET CLI':
        case 'Python':
            return 'text/x-sh';
        case 'Web':
            return 'javascript';
        default:
            return null;
    }
}

function mountCodeMirror(host, snippet) {
    if (typeof CodeMirror === 'undefined') return;
    const cm = CodeMirror(host, {
        value: snippet.code || '',
        mode: modeForCategory(snippet.category),
        theme: 'dracula',
        readOnly: 'nocursor',
        lineNumbers: false,
        lineWrapping: true,
        viewportMargin: Infinity,
    });
    cm.setSize('100%', 'auto');
    cm.refresh();
    cmInstances.push(cm);
}

function applySnippetPayload(raw) {
    if (!Array.isArray(raw)) throw new Error('snippets.json must be a JSON array');
    SNIPPET_COLLECTION = raw.map((item) => {
        const key = item.iconKey;
        if (key && !ICONS[key]) console.warn('Unknown iconKey:', key, 'for category', item.category);
        return {
            category: item.category,
            icon: ICONS[key] ?? ICONS.Code,
            snippets: item.snippets ?? [],
        };
    });
    allSnippetsFlat = SNIPPET_COLLECTION.flatMap((collection) =>
        collection.snippets.map((snippet) => ({ ...snippet, category: collection.category }))
    );
}

const LAYOUT_STORAGE_KEY = 'snippet-layout';
const LAYOUT_MODES = ['responsive', '1col', '2col', '3col', 'list', 'masonry'];

let activeCategory = 'All';
let searchQuery = '';
let layoutMode = (() => {
    try {
        const s = localStorage.getItem(LAYOUT_STORAGE_KEY);
        if (s && LAYOUT_MODES.includes(s)) return s;
    } catch (_) {
        /* ignore */
    }
    return '1col';
})();

function collectionCategorySet() {
    return new Set(SNIPPET_COLLECTION.map((c) => c.category));
}

/** Read `cat` query: absent/empty → All; must match a loaded collection category. */
function readCategoryFromLocation() {
    const valid = collectionCategorySet();
    const raw = new URL(window.location.href).searchParams.get('cat');
    if (raw === null || raw === '') return { category: 'All', fixUrl: false };
    if (valid.has(raw)) return { category: raw, fixUrl: false };
    return { category: 'All', fixUrl: true };
}

function syncUrlToCategory(category, mode) {
    const url = new URL(window.location.href);
    if (category === 'All') url.searchParams.delete('cat');
    else url.searchParams.set('cat', category);
    const fn = mode === 'push' ? history.pushState : history.replaceState;
    fn.call(history, null, '', url);
}

const categoryNav = document.getElementById('category-nav');
const snippetsContainer = document.getElementById('snippets-container');
const layoutSelect = document.getElementById('layout-select');
const searchInput = document.getElementById('search-input');
const activeCategoryTitle = document.getElementById('active-category-title');
const emptyState = document.getElementById('empty-state');
const emptyMessage = document.getElementById('empty-message');
const clearSearchBtn = document.getElementById('clear-search-btn');
const navMenuBtn = document.getElementById('nav-menu-btn');
const navCloseBtn = document.getElementById('nav-close-btn');
const navBackdrop = document.getElementById('nav-backdrop');

function syncMobileCategoryLabel() {
    const el = document.getElementById('mobile-category-label');
    if (el) el.textContent = activeCategory;
}

function setDrawerOpen(open) {
    document.documentElement.classList.toggle('drawer-is-open', open);
    if (navMenuBtn) navMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeDrawer() {
    setDrawerOpen(false);
}

function toggleDrawer() {
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    setDrawerOpen(!document.documentElement.classList.contains('drawer-is-open'));
}

function getLayoutContainerClasses() {
    const g = 'gap-6 transition-all duration-200 w-full min-w-0';
    switch (layoutMode) {
        case '1col':
            return `${g} grid grid-cols-1`;
        case '2col':
            return `${g} grid grid-cols-1 md:grid-cols-2`;
        case '3col':
            return `${g} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`;
        case 'list':
            return `${g} flex flex-col`;
        case 'masonry':
            return `${g} snippet-masonry w-full`;
        default:
            return `${g} grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`;
    }
}

function syncSnippetContainerLayout() {
    const hidden = snippetsContainer.classList.contains('hidden');
    snippetsContainer.className = getLayoutContainerClasses();
    if (hidden) snippetsContainer.classList.add('hidden');
}

/** Directory URL where index.html / app.js / snippets.json live (works on GitHub Pages subpaths). */
function appPublicBaseUrl() {
    const script = document.querySelector('script[src*="app.js"]');
    if (script?.src) {
        const u = new URL(script.src);
        const dir = u.pathname.replace(/[^/]*$/, '');
        return `${u.origin}${dir}`;
    }
    let path = window.location.pathname;
    if (path.endsWith('/')) return `${window.location.origin}${path}`;
    if (path.endsWith('.html')) {
        path = path.slice(0, path.lastIndexOf('/') + 1);
        return `${window.location.origin}${path}`;
    }
    return `${window.location.origin}${path}/`;
}

async function loadSnippets() {
    const appStatus = document.getElementById('app-status');
    const appStatusMessage = document.getElementById('app-status-message');
    const snippetsContainerEl = document.getElementById('snippets-container');
    const emptyStateEl = document.getElementById('empty-state');

    appStatus.classList.remove('hidden');
    snippetsContainerEl.classList.add('hidden');
    emptyStateEl.classList.add('hidden');
    appStatusMessage.textContent = 'Loading snippets…';
    appStatusMessage.className = 'text-lg text-gray-400';

    try {
        const snippetsUrl = new URL('snippets.json', appPublicBaseUrl()).href;
        const res = await fetch(snippetsUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        applySnippetPayload(raw);
        const fromUrl = readCategoryFromLocation();
        activeCategory = fromUrl.category;
        activeCategoryTitle.textContent = `${activeCategory} Snippets`;
        syncMobileCategoryLabel();
        if (fromUrl.fixUrl) syncUrlToCategory(activeCategory, 'replace');
        appStatus.classList.add('hidden');
        snippetsContainerEl.classList.remove('hidden');
        layoutSelect.value = layoutMode;
        syncSnippetContainerLayout();
        renderSidebar();
        renderSnippets();
    } catch (err) {
        console.error(err);
        appStatusMessage.textContent =
            'Could not load snippets.json. Serve over http(s), deploy snippets.json next to index.html / app.js, or fix your host base path.';
        appStatusMessage.className = 'text-lg text-red-400 text-center max-w-lg px-4';
    }
}

function renderSidebar() {
    categoryNav.querySelectorAll('button').forEach((btn) => btn.remove());

    const allBtn = document.createElement('button');
    allBtn.className = getCategoryButtonClass('All');
    allBtn.innerHTML = `
                <span class="${activeCategory === 'All' ? 'text-blue-400' : 'text-gray-500'}">${ICONS.LayoutGrid}</span>
                All
                <span class="ml-auto bg-gray-800 text-gray-400 py-0.5 px-2 rounded-full text-xs">${allSnippetsFlat.length}</span>
            `;
    allBtn.addEventListener('click', () => setCategory('All'));
    categoryNav.appendChild(allBtn);

    SNIPPET_COLLECTION.forEach(({ category, icon, snippets }) => {
        const btn = document.createElement('button');
        btn.className = getCategoryButtonClass(category);
        btn.innerHTML = `
                    <span class="${activeCategory === category ? 'text-blue-400' : 'text-gray-500'}">${icon}</span>
                    ${category}
                    <span class="ml-auto bg-gray-800 text-gray-400 py-0.5 px-2 rounded-full text-xs">${snippets.length}</span>
                `;
        btn.addEventListener('click', () => setCategory(category));
        categoryNav.appendChild(btn);
    });
}

function getCategoryButtonClass(categoryName) {
    const baseClass =
        'w-full flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-lg transition-all duration-200 text-sm font-medium border min-h-[44px] sm:min-h-0';
    if (activeCategory === categoryName) {
        return `${baseClass} bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]`;
    }
    return `${baseClass} text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-transparent`;
}

function setCategory(category) {
    activeCategory = category;
    activeCategoryTitle.textContent = `${category} Snippets`;
    syncMobileCategoryLabel();
    syncUrlToCategory(category, 'push');
    closeDrawer();
    renderSidebar();
    renderSnippets();
}

function copyWithExecCommand(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch (err) {
        console.error('execCommand copy failed', err);
    }
    document.body.removeChild(textArea);
    return ok;
}

function copyToClipboard(btn, codeText) {
    const text = codeText == null ? '' : String(codeText);
    const show = () => showCopiedState(btn);
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(show).catch(() => {
            if (copyWithExecCommand(text)) show();
            else
                console.error(
                    'Clipboard copy failed (permission or unsupported context). Serve over http(s) (e.g. Live Server), not file://.'
                );
        });
    } else if (copyWithExecCommand(text)) {
        show();
    } else {
        console.error(
            'Copy unavailable: open this site over http://localhost or https:// (file:// blocks the clipboard API and often execCommand).'
        );
    }
}

function showCopiedState(btn) {
    if (!btn) return;
    btn.innerHTML = ICONS.Check;
    setTimeout(() => {
        btn.innerHTML = ICONS.Copy;
    }, 2000);
}

function cmHostHtml(snippet, padForCopyBtn) {
    const pad = padForCopyBtn ? ' pr-12 sm:pr-10' : '';
    return `<div class="snippet-cm min-h-[2.5rem] w-full text-left${pad}"><div class="snippet-cm-host"></div></div>`;
}

function buildSnippetCard(snippet) {
    const btnId = `copy-btn-${snippet.id}`;
    const card = document.createElement('div');

    if (layoutMode === 'list') {
        card.className =
            'snippet-card bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors flex flex-col md:flex-row md:items-stretch group shadow-sm hover:shadow-xl';
        card.innerHTML = `
                    <div class="p-5 md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col">
                        <div class="flex items-start justify-between gap-2 mb-2">
                            <span class="text-xs font-semibold px-2.5 py-1 bg-gray-800 text-gray-300 rounded-full border border-gray-700">${escapeHtml(snippet.category)}</span>
                            <button type="button" id="${btnId}"
                                class="shrink-0 flex h-11 w-11 items-center justify-center rounded-md bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all focus:outline-none border border-gray-700 hover:border-gray-500 sm:h-auto sm:w-auto sm:p-1.5"
                                title="Copy code">${ICONS.Copy}</button>
                        </div>
                        <h3 class="text-base font-medium text-gray-100 group-hover:text-blue-400 transition-colors">${escapeHtml(snippet.title)}</h3>
                        <p class="text-sm text-gray-500 mt-1 flex-1">${escapeHtml(snippet.desc)}</p>
                    </div>
                    <div class="relative flex-1 min-w-0 bg-[#0d131f] p-5 group-hover:bg-[#111827] transition-colors">
                        ${cmHostHtml(snippet, false)}
                    </div>`;
    } else {
        card.className =
            'snippet-card bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors flex flex-col group shadow-sm hover:shadow-xl';
        card.innerHTML = `
                    <div class="p-5 pb-3 border-b border-gray-800">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-xs font-semibold px-2.5 py-1 bg-gray-800 text-gray-300 rounded-full border border-gray-700">${escapeHtml(snippet.category)}</span>
                        </div>
                        <h3 class="text-base font-medium text-gray-100 group-hover:text-blue-400 transition-colors">${escapeHtml(snippet.title)}</h3>
                        <p class="text-sm text-gray-500 mt-1 line-clamp-2">${escapeHtml(snippet.desc)}</p>
                    </div>
                    <div class="relative flex-1 bg-[#0d131f] p-5 pt-4 group-hover:bg-[#111827] transition-colors">
                        <button type="button" id="${btnId}"
                            class="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-md bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all focus:outline-none border border-gray-700 hover:border-gray-500 sm:top-3 sm:right-3 sm:h-auto sm:w-auto sm:p-1.5"
                            title="Copy code">${ICONS.Copy}</button>
                        ${cmHostHtml(snippet, true)}
                    </div>`;
    }
    const copyBtn = card.querySelector(`#${CSS.escape(btnId)}`);
    if (copyBtn) {
        copyBtn.addEventListener('click', () => copyToClipboard(copyBtn, snippet.code));
    }
    return card;
}

function renderSnippets() {
    cmInstances.length = 0;
    snippetsContainer.innerHTML = '';
    syncSnippetContainerLayout();

    const filtered = allSnippetsFlat.filter((snippet) => {
        const matchesCategory = activeCategory === 'All' || snippet.category === activeCategory;
        const q = searchQuery.toLowerCase();
        return (
            matchesCategory &&
            (snippet.title.toLowerCase().includes(q) ||
                snippet.code.toLowerCase().includes(q) ||
                snippet.desc.toLowerCase().includes(q))
        );
    });

    if (filtered.length === 0) {
        snippetsContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        emptyMessage.textContent = searchQuery ? `No snippets found matching "${searchQuery}"` : 'No snippets found.';
    } else {
        snippetsContainer.classList.remove('hidden');
        emptyState.classList.add('hidden');
        filtered.forEach((snippet) => {
            const card = buildSnippetCard(snippet);
            snippetsContainer.appendChild(card);
            const host = card.querySelector('.snippet-cm-host');
            if (host) mountCodeMirror(host, snippet);
        });
    }
}

document.getElementById('search-icon-container').innerHTML = ICONS.Search;
document.getElementById('empty-icon-container').innerHTML = ICONS.SearchLarge;

layoutSelect.addEventListener('change', () => {
    layoutMode = layoutSelect.value;
    try {
        localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
    } catch (_) {
        /* ignore */
    }
    renderSnippets();
});

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderSnippets();
});

clearSearchBtn.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    renderSnippets();
});

window.addEventListener('popstate', () => {
    const fromUrl = readCategoryFromLocation();
    activeCategory = fromUrl.category;
    activeCategoryTitle.textContent = `${activeCategory} Snippets`;
    syncMobileCategoryLabel();
    if (fromUrl.fixUrl) syncUrlToCategory(activeCategory, 'replace');
    renderSidebar();
    renderSnippets();
});

navMenuBtn?.addEventListener('click', () => toggleDrawer());
navCloseBtn?.addEventListener('click', () => closeDrawer());
navBackdrop?.addEventListener('click', () => closeDrawer());

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
});

window.addEventListener('resize', () => {
    if (window.matchMedia('(min-width: 1024px)').matches) closeDrawer();
});

loadSnippets();
