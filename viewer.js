'use strict';

const PS3_PLATFORM_IDS = 2147483648;
const GB = 1024 ** 3;
const $ = (id) => document.getElementById(id);
let items = [];
let meta = null;
let rawEntitlements = null;
let visible = [];
let selected = null;
let currentPage = 1;
let pageSize = 100;
let sortState = { key: 'title', direction: 'asc' };

function firstValue(obj, paths) {
  for (const path of paths) {
    let cur = obj;
    for (const part of path.split('.')) {
      if (cur == null || typeof cur !== 'object') { cur = undefined; break; }
      cur = cur[part];
    }
    if (cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return '';
}
function toArray(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]); }
function getDrmContents(e) {
  const out = [];
  for (const drm of [e?.drmdef, e?.drmDef, e?.drm_def, e?.drmDefinition].filter(Boolean)) {
    out.push(...toArray(drm.drmContents), ...toArray(drm.drm_contents), ...toArray(drm.contents));
  }
  return out.filter(x => x && typeof x === 'object');
}
function normalizeUrl(c) {
  return String(firstValue(c, ['contentUrl','contentURL','content_url','packageUrl','packageURL','package_url','referencePackageUrl','reference_package_url']) || '').trim();
}
function extractPs3(entitlements) {
  const result = [], seen = new Set();
  for (const e of entitlements) {
    for (const c of getDrmContents(e)) {
      const platformIds = Number(firstValue(c, ['platformIds','platform_ids']));
      const downloadType = Number(firstValue(c, ['downloadType','download_type']));
      if (platformIds !== PS3_PLATFORM_IDS || downloadType !== 0) continue;
      const contentId = String(firstValue(c, ['contentId','contentID','content_id']) || e.id || '').trim();
      const contentUrl = normalizeUrl(c);
      const entitlementId = String(e.id || firstValue(c, ['entitlementId','entitlement_id']) || '').trim();
      const key = `${contentId}|${contentUrl}|${entitlementId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const contentName = String(firstValue(c, ['contentName','content_name']) || '').trim();
      const titleName = String(firstValue(c, ['titleName','title_name']) || '').trim();
      const gameName = String(firstValue(e, ['gameMeta.name','game_meta.name','productMeta.name','product_meta.name','titleMeta.name','title_meta.name']) || '').trim();
      const size = Number(firstValue(c, ['contentSize','content_size','size']));
      result.push({
        title: titleName || gameName || contentName || contentId,
        contentName, gameName, contentId, entitlementId,
        productId: String(firstValue(e, ['productId','product_id']) || '').trim(),
        skuId: String(firstValue(e, ['skuId','sku_id']) || '').trim(),
        activeDate: String(firstValue(e, ['activeDate','active_date','license.startDate','license.start_date']) || '').trim(),
        publisher: String(firstValue(c, ['spName','sp_name','publisher']) || '').trim(),
        contentSize: Number.isFinite(size) && size >= 0 ? size : null,
        contentUrl,
        downloadType,
        drmContentType: firstValue(c, ['drmContentType','drm_content_type']),
        drmType: firstValue(c, ['drmType','drm_type']),
        platformIds
      });
    }
  }
  return result;
}
function bytes(value) {
  const n = Number(value); if (!Number.isFinite(n) || n < 0) return 'Unknown';
  if (n === 0) return '0 B';
  const units = ['B','KB','MB','GB','TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(v >= 10 ? 1 : 2)} ${units[i]}`;
}
function esc(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function displayDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}
function cmpText(a, b) { return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity:'base', numeric:true }); }
function getSortValue(item, key) {
  if (key === 'size') return Number(item.contentSize) || 0;
  if (key === 'activeDate') return item.activeDate ? Date.parse(item.activeDate) || 0 : 0;
  return item[key] || '';
}
function sortItems(list) {
  const dir = sortState.direction === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    const av = getSortValue(a, sortState.key), bv = getSortValue(b, sortState.key);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return cmpText(av, bv) * dir;
  });
}
function isSizeMatch(item, filter) {
  const n = item.contentSize;
  if (filter === 'all') return true;
  if (filter === 'unknown') return !Number.isFinite(n);
  if (!Number.isFinite(n)) return false;
  if (filter === 'small') return n < GB;
  if (filter === 'medium') return n >= GB && n < 5 * GB;
  if (filter === 'large') return n >= 5 * GB;
  return true;
}
function applyFilter(resetPage = true) {
  const q = $('search').value.trim().toLowerCase();
  const urlsOnly = $('withUrl').checked;
  const publisher = $('publisherFilter').value;
  const sizeFilter = $('sizeFilter').value;
  visible = items.filter(item => {
    if (urlsOnly && !item.contentUrl) return false;
    if (publisher && item.publisher !== publisher) return false;
    if (!isSizeMatch(item, sizeFilter)) return false;
    if (!q) return true;
    return [item.title,item.contentName,item.gameName,item.contentId,item.entitlementId,item.productId,item.skuId,item.publisher,item.contentUrl]
      .some(v => String(v || '').toLowerCase().includes(q));
  });
  sortItems(visible);
  if (resetPage) currentPage = 1;
  updateActiveFilters();
  render();
}
function pageItems() {
  const start = (currentPage - 1) * pageSize;
  return visible.slice(start, start + pageSize);
}
function render() {
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const page = pageItems();
  const start = visible.length ? ((currentPage - 1) * pageSize) + 1 : 0;
  const end = visible.length ? start + page.length - 1 : 0;
  $('shownCount').textContent = `${visible.length.toLocaleString()} shown`;
  $('pageInfo').textContent = `${start.toLocaleString()}–${end.toLocaleString()} of ${visible.length.toLocaleString()}`;
  $('prevPage').disabled = currentPage <= 1;
  $('nextPage').disabled = currentPage >= totalPages;
  $('pager').classList.toggle('hidden', items.length === 0 || visible.length === 0);

  $('rows').innerHTML = page.map((item, idx) => {
    const absoluteIdx = (currentPage - 1) * pageSize + idx;
    return `<tr data-idx="${absoluteIdx}">
      <td class="title-cell"><span class="title">${esc(item.title || item.contentName || item.contentId || 'Untitled')}</span>${item.contentName && item.contentName !== item.title ? `<span class="subtle">${esc(item.contentName)}</span>` : ''}${item.productId ? `<span class="subtle">Product: ${esc(item.productId)}</span>` : ''}</td>
      <td class="mono">${esc(item.contentId || '—')}</td>
      <td class="num-cell">${esc(bytes(item.contentSize))}</td>
      <td>${esc(item.publisher || '—')}</td>
      <td>${esc(displayDate(item.activeDate))}</td>
      <td class="url-cell">${item.contentUrl ? `<div class="pkg-link" title="${esc(item.contentUrl)}"><span class="pkg-dot"></span><span class="pkg-url">Available</span></div>` : '<span class="no-url">Not exposed</span>'}</td>
      <td><div class="row-actions"><button class="secondary copy-id" type="button" data-action="copy-id" title="Copy Content ID">Copy ID</button>${item.contentUrl ? '<button type="button" data-action="copy-url" title="Copy package URL">Copy URL</button>' : ''}</div></td>
    </tr>`;
  }).join('');

  for (const row of $('rows').querySelectorAll('tr')) {
    row.addEventListener('click', (event) => {
      const item = visible[Number(row.dataset.idx)];
      const action = event.target.closest('button')?.dataset.action;
      if (action === 'copy-id') { event.stopPropagation(); copy(item.contentId, 'Content ID copied.'); return; }
      if (action === 'copy-url') { event.stopPropagation(); copy(item.contentUrl, 'Package URL copied.'); return; }
      openDetail(item);
    });
  }

  const hasItems = items.length > 0;
  const hasMatches = visible.length > 0;
  $('empty').classList.toggle('hidden', hasItems);
  $('noMatches').classList.toggle('hidden', !hasItems || hasMatches);
  $('tableWrap').classList.toggle('hidden', !hasItems || !hasMatches);
  updateSortHeaders();
}
function updateSortHeaders() {
  for (const th of document.querySelectorAll('th.sortable')) {
    const active = th.dataset.sort === sortState.key;
    th.querySelector('.sort-indicator').textContent = active ? (sortState.direction === 'asc' ? '▲' : '▼') : '';
    th.setAttribute('aria-sort', active ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none');
  }
}
function setSort(key) {
  if (sortState.key === key) sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
  else sortState = { key, direction: key === 'size' || key === 'activeDate' ? 'desc' : 'asc' };
  applyFilter(false);
}
function populatePublishers() {
  const publishers = [...new Set(items.map(x => x.publisher).filter(Boolean))].sort((a,b) => cmpText(a,b));
  $('publisherFilter').innerHTML = '<option value="">All publishers</option>' + publishers.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
}
function updateActiveFilters() {
  const chips = [];
  const q = $('search').value.trim();
  if (q) chips.push(`Search: ${q}`);
  if ($('publisherFilter').value) chips.push(`Publisher: ${$('publisherFilter').value}`);
  if ($('sizeFilter').value !== 'all') chips.push(`Size: ${$('sizeFilter').options[$('sizeFilter').selectedIndex].text}`);
  if ($('withUrl').checked) chips.push('Package URLs only');
  $('activeFilters').innerHTML = chips.map(c => `<span class="filter-chip">${esc(c)}</span>`).join('');
  $('activeFilters').classList.toggle('hidden', chips.length === 0);
}
function clearFilters() {
  $('search').value = '';
  $('publisherFilter').value = '';
  $('sizeFilter').value = 'all';
  $('withUrl').checked = false;
  applyFilter();
}
function openDetail(item) {
  selected = item;
  $('detailTitle').textContent = item.title || item.contentName || 'PS3 item';
  $('detailContentId').textContent = item.contentId || 'No Content ID';
  $('detailPkgBadge').textContent = item.contentUrl ? 'PKG URL available' : 'PS3';
  $('detailPkgBadge').classList.toggle('has-url', Boolean(item.contentUrl));
  const fields = [
    ['Publisher', item.publisher || '—'],
    ['Package size', bytes(item.contentSize)],
    ['Product ID', item.productId || '—', true],
    ['SKU ID', item.skuId || '—', true],
    ['Entitlement ID', item.entitlementId || '—', true],
    ['Active date', displayDate(item.activeDate)],
    ['DRM type', item.drmType ?? '—'],
    ['DRM content type', item.drmContentType ?? '—'],
    ['Package URL', item.contentUrl || 'Not exposed by Sony', true, true]
  ];
  $('detailFields').innerHTML = fields.map(([label, value, mono, wide]) => `<div class="detail-field${wide ? ' wide' : ''}"><span class="detail-field-label">${esc(label)}</span><span class="detail-field-value${mono ? ' mono' : ''}">${esc(value)}</span></div>`).join('');
  $('detailJson').textContent = JSON.stringify(item, null, 2);
  $('copyUrl').disabled = !item.contentUrl;
  $('copyId').disabled = !item.contentId;
  $('copyProductId').disabled = !item.productId;
  $('detailDialog').showModal();
}
function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type:`${mime};charset=utf-8` }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function csvEscape(v) { return `"${String(v ?? '').replaceAll('"','""')}"`; }
function exportCsv() {
  const cols = [['Title','title'],['Content Name','contentName'],['Game Name','gameName'],['Content ID','contentId'],['Entitlement ID','entitlementId'],['Product ID','productId'],['SKU ID','skuId'],['Publisher','publisher'],['Content Size','contentSize'],['Active Date','activeDate'],['Package URL','contentUrl'],['Download Type','downloadType'],['DRM Content Type','drmContentType'],['DRM Type','drmType'],['Platform IDs','platformIds']];
  const lines = [cols.map(x => csvEscape(x[0])).join(',')];
  for (const item of visible) lines.push(cols.map(x => csvEscape(item[x[1]])).join(','));
  downloadText(`psdle-ps3-${new Date().toISOString().slice(0,10)}.csv`, '\ufeff' + lines.join('\r\n'), 'text/csv');
  closeExportMenu();
}
function exportJson() { downloadText(`psdle-ps3-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({meta,items:visible},null,2), 'application/json'); closeExportMenu(); }
function exportRaw() { if (!rawEntitlements) return toast('No raw entitlement data loaded.'); downloadText(`psn-entitlements-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(rawEntitlements,null,2), 'application/json'); closeExportMenu(); }
async function copy(text, message) {
  if (!text) return;
  try { await navigator.clipboard.writeText(text); toast(message); }
  catch { toast('Clipboard access failed.'); }
}
let toastTimer = null;
function toast(text) { const el = $('toast'); el.textContent = text; el.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 1800); }
function updateStats(entitlements) {
  const urlCount = items.filter(x => x.contentUrl).length;
  const knownSize = items.reduce((sum, x) => sum + (Number.isFinite(x.contentSize) ? x.contentSize : 0), 0);
  $('statItems').textContent = items.length.toLocaleString();
  $('statUrls').textContent = urlCount.toLocaleString();
  $('statUrlPct').textContent = `${items.length ? Math.round(urlCount / items.length * 100) : 0}% of PS3 items`;
  $('statSize').textContent = bytes(knownSize);
  $('statEntitlements').textContent = entitlements.length.toLocaleString();
}
function loadTheme() {
  const saved = localStorage.getItem('psdle-theme');
  const theme = saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.dataset.theme = theme;
}
function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('psdle-theme', next);
}
function toggleExportMenu(force) {
  const menu = $('exportMenu');
  const open = typeof force === 'boolean' ? force : menu.classList.contains('hidden');
  menu.classList.toggle('hidden', !open);
  $('exportMenuButton').setAttribute('aria-expanded', String(open));
}
function closeExportMenu() { toggleExportMenu(false); }
function load() {
  loadTheme();
  rawEntitlements = window.PSDLE_RAW || null;
  const ents = Array.isArray(rawEntitlements?.entitlements) ? rawEntitlements.entitlements : [];
  items = extractPs3(ents);
  meta = { fetchedAt:new Date().toISOString(), totalEntitlements:ents.length, ps3Items:items.length, ps3ItemsWithUrl:items.filter(x=>x.contentUrl).length, classification:'Strict PS3: platformIds=2147483648 and downloadType=0' };
  $('summary').textContent = rawEntitlements ? `${items.length.toLocaleString()} PS3 items · ${meta.ps3ItemsWithUrl.toLocaleString()} with package URLs · ${ents.length.toLocaleString()} total entitlements loaded` : 'No entitlement data loaded. Run Run-PSDLE-PS3.cmd first.';
  populatePublishers();
  updateStats(ents);
  applyFilter();
}

$('search').addEventListener('input', () => applyFilter());
$('withUrl').addEventListener('change', () => applyFilter());
$('publisherFilter').addEventListener('change', () => applyFilter());
$('sizeFilter').addEventListener('change', () => applyFilter());
$('clearFilters').addEventListener('click', clearFilters);
$('clearFiltersEmpty').addEventListener('click', clearFilters);
$('pageSize').addEventListener('change', () => { pageSize = Number($('pageSize').value) || 100; currentPage = 1; render(); });
$('prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; render(); $('tableWrap').scrollTo({top:0, behavior:'smooth'}); } });
$('nextPage').addEventListener('click', () => { const totalPages = Math.ceil(visible.length / pageSize); if (currentPage < totalPages) { currentPage++; render(); $('tableWrap').scrollTo({top:0, behavior:'smooth'}); } });
for (const th of document.querySelectorAll('th.sortable')) th.querySelector('button').addEventListener('click', () => setSort(th.dataset.sort));
$('exportMenuButton').addEventListener('click', (e) => { e.stopPropagation(); toggleExportMenu(); });
$('exportMenu').addEventListener('click', e => e.stopPropagation());
document.addEventListener('click', closeExportMenu);
$('exportCsv').addEventListener('click', exportCsv);
$('exportJson').addEventListener('click', exportJson);
$('exportRaw').addEventListener('click', exportRaw);
$('themeToggle').addEventListener('click', toggleTheme);
$('closeDialog').addEventListener('click', () => $('detailDialog').close());
$('copyUrl').addEventListener('click', () => copy(selected?.contentUrl, 'Package URL copied.'));
$('copyId').addEventListener('click', () => copy(selected?.contentId, 'Content ID copied.'));
$('copyProductId').addEventListener('click', () => copy(selected?.productId, 'Product ID copied.'));
$('detailDialog').addEventListener('click', e => { if (e.target === $('detailDialog')) $('detailDialog').close(); });
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('search').focus(); $('search').select(); }
  if (e.key === 'Escape') closeExportMenu();
});

load();
