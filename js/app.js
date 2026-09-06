/* ===========================================================================
   DogDraw
   Static site. Progress + drawings are committed to the GitHub repo that
   serves this page, using a fine-grained personal access token that lives
   only in the visitor's browser.
   =========================================================================== */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const state = {
  artist: null,
  token: null,
  repo: null,
  data: { version: 1, entries: [] },
  sha: null,
  readOnly: true,
  lastRoll: null,
  modalBreed: null
};

/* ------------------------------- helpers ------------------------------- */

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function resolveRepo() {
  if (CONFIG.repo.owner && CONFIG.repo.name) return { ...CONFIG.repo };
  const host = location.hostname;                       // aspen.github.io
  const m = host.match(/^([^.]+)\.github\.io$/i);
  if (!m) return null;
  const seg = location.pathname.split('/').filter(Boolean);
  // project page -> /repo/ ; user page -> /
  const name = seg.length ? seg[0] : `${m[1]}.github.io`;
  return { owner: m[1], name, branch: CONFIG.repo.branch || 'main' };
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function rawUrl(path) {
  if (!state.repo) return path;
  const r = state.repo;
  return `https://raw.githubusercontent.com/${r.owner}/${r.name}/${r.branch}/${path}`;
}

function otherArtist() {
  return CONFIG.artists.find(a => a !== state.artist) || CONFIG.artists[1];
}

function say(msg, ok = false) {
  const bar = $('#syncBar');
  if (!msg) { bar.hidden = true; return; }
  $('#syncMsg').textContent = msg;
  bar.className = 'syncbar' + (ok ? ' ok' : '');
  bar.hidden = false;
}
let sayTimer;
function flash(msg, ok = true, ms = 3600) {
  say(msg, ok);
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => say(null), ms);
}

/* ------------------------------- github -------------------------------- */

function ghHeaders(extra = {}) {
  const h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...extra };
  if (state.token) h['Authorization'] = `Bearer ${state.token}`;
  return h;
}

function contentsUrl(path) {
  const r = state.repo;
  return `https://api.github.com/repos/${r.owner}/${r.name}/contents/${path}?ref=${r.branch}`;
}

function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

/** Read progress.json. Uses the API when a token is present (fresh + gives sha),
 *  otherwise falls back to the raw file so read-only visitors still see things. */
async function fetchProgress() {
  if (state.repo && state.token) {
    const res = await fetch(contentsUrl(CONFIG.dataPath || 'data/progress.json'), { headers: ghHeaders(), cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      return { data: JSON.parse(b64ToUtf8(j.content)), sha: j.sha };
    }
    if (res.status === 404) return { data: { version: 1, entries: [] }, sha: null };
    throw Object.assign(new Error('GitHub read failed: ' + res.status), { status: res.status });
  }
  const url = state.repo ? rawUrl('data/progress.json') : 'data/progress.json';
  const res = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) return { data: { version: 1, entries: [] }, sha: null };
  return { data: await res.json(), sha: null };
}

async function putFile(path, contentB64, message, sha) {
  const r = state.repo;
  const body = { message, content: contentB64, branch: r.branch };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${r.owner}/${r.name}/contents/${path}`, {
    method: 'PUT',
    headers: ghHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch (_) {}
    throw Object.assign(new Error(`${res.status} ${detail}`), { status: res.status });
  }
  return res.json();
}

/** Re-reads, applies `mutate`, writes back. Retries if the other person
 *  committed in between, so nobody's roll gets clobbered. */
async function commitProgress(mutate, message) {
  requireToken();
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, sha } = await fetchProgress();
    mutate(data);
    try {
      const out = await putFile(
        'data/progress.json',
        utf8ToB64(JSON.stringify(data, null, 2) + '\n'),
        message, sha
      );
      state.data = data;
      state.sha = out.content && out.content.sha;
      return data;
    } catch (e) {
      lastErr = e;
      if (e.status === 409 || e.status === 422) { await new Promise(r => setTimeout(r, 400)); continue; }
      throw e;
    }
  }
  throw lastErr;
}

function requireToken() {
  if (!state.token) { openTokenModal(); throw new Error('NO_TOKEN'); }
}

/* ------------------------------- entries ------------------------------- */

function entriesFor(breed) { return state.data.entries.filter(e => e.breed === breed); }
function entryFor(breed, artist) { return state.data.entries.find(e => e.breed === breed && e.artist === artist); }
function myEntries() { return state.data.entries.filter(e => e.artist === state.artist); }
function hasDrawn(breed, artist) { const e = entryFor(breed, artist); return !!(e && e.drawings && e.drawings.length); }

function breedState(name) {
  const me = state.artist, them = otherArtist();
  const mine = entryFor(name, me), theirs = entryFor(name, them);
  const mineDrawn = !!(mine && mine.drawings.length), theirsDrawn = !!(theirs && theirs.drawings.length);
  if (mineDrawn && theirsDrawn) return 'both';
  if (mineDrawn) return 'mine';
  if (theirsDrawn) return 'theirs';
  if (mine || theirs) return 'pending';
  return 'none';
}

function firstThumb(name) {
  for (const e of entriesFor(name)) if (e.drawings && e.drawings.length) return e.drawings[0].path;
  return null;
}

/* -------------------------------- login -------------------------------- */

$('#passForm').addEventListener('submit', async ev => {
  ev.preventDefault();
  const hash = await sha256($('#passInput').value);
  if (hash !== CONFIG.passphraseHash) {
    $('#passError').hidden = false;
    $('#passInput').value = '';
    return;
  }
  sessionStorage.setItem('ddc_ok', '1');
  showArtistPick();
});

function showArtistPick() {
  $('#passError').hidden = true;
  $('#passForm').hidden = true;
  $('#artistPick').hidden = false;
  const wrap = $('#artistButtons');
  wrap.innerHTML = '';
  CONFIG.artists.forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.textContent = a;
    b.onclick = () => enterApp(a);
    wrap.appendChild(b);
  });
}

async function enterApp(artist) {
  state.artist = artist;
  localStorage.setItem('ddc_artist', artist);
  $('#login').hidden = true;
  $('#app').hidden = false;
  $('#whoName').textContent = artist;
  await refresh();
}

$('#switchArtist').onclick = () => {
  localStorage.removeItem('ddc_artist');
  location.reload();
};

/* ------------------------------- refresh ------------------------------- */

async function refresh() {
  try {
    const { data, sha } = await fetchProgress();
    state.data = data && Array.isArray(data.entries) ? data : { version: 1, entries: [] };
    state.sha = sha;
    say(null);
  } catch (e) {
    if (location.protocol === 'file:') {
      say('Opened straight from disk, so saved progress can\u2019t load. Run ' +
          '"python3 -m http.server" in this folder, or push it to GitHub Pages.');
    } else {
      say('Could not load saved progress: ' + e.message);
    }
  }
  renderRoller();
  renderGallery();
}

/* -------------------------------- tabs --------------------------------- */

$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.toggle('active', x === t));
  const v = t.dataset.view;
  $('#view-roller').hidden = v !== 'roller';
  $('#view-gallery').hidden = v !== 'gallery';
  if (v === 'gallery') renderGallery();
});

/* -------------------------------- roller ------------------------------- */

function renderRoller() {
  const mine = myEntries();
  const drawnByMe = mine.filter(e => e.drawings.length).length;
  const both = BREEDS.filter(b => breedState(b.n) === 'both').length;
  $('#statMine').textContent = drawnByMe;
  $('#statBoth').textContent = both;
  $('#statLeft').textContent = BREEDS.length - mine.length;

  const pending = mine.find(e => !e.drawings.length);
  $('#pendingCard').hidden = !pending;
  if (pending) {
    $('#pendingBreed').textContent = pending.breed;
    $('#pendingMeta').textContent = 'Rolled ' + fmtDate(pending.rolledAt);
  }
  $('#rollCta').hidden = !!pending;
  $('#rollIdle').hidden = false;
  $('#rollAnim').hidden = true;
  $('#rollResult').hidden = true;
}

$('#pendingUploadBtn').onclick = () => {
  const pending = myEntries().find(e => !e.drawings.length);
  if (pending) openModal(pending.breed);
};
$('#rollAnywayBtn').onclick = () => doRoll();
$('#rollBtn').onclick = () => doRoll();
$('#rerollBtn').onclick = () => doRoll();

function candidatePool() {
  // Only your own history narrows the pool - you and the other artist can land on
  // the same breed, and that's half the fun.
  const mineNames = new Set(myEntries().map(e => e.breed));
  return BREEDS.filter(b => !mineNames.has(b.n));
}

const ROLL_LINES = [
  'Sniffing out a breed…',
  'Consulting the kennel club…',
  'Shaking the treat jar…',
  'Good boy incoming…',
  'Fetching…'
];

async function doRoll() {
  const pool = candidatePool();
  if (!pool.length) {
    flash('You have rolled every breed. That is the whole American Kennel Club. Go rest your hand.', true, 8000);
    return;
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  state.lastRoll = pick;

  $('#rollIdle').hidden = true;
  $('#rollResult').hidden = true;
  $('#rollAnim').hidden = false;
  $('#rollStatus').textContent = ROLL_LINES[Math.floor(Math.random() * ROLL_LINES.length)];

  await new Promise(r => setTimeout(r, CONFIG.rollDuration || 3200));

  $('#rollAnim').hidden = true;
  $('#resultBreed').textContent = pick.n;
  $('#resultGroup').textContent = pick.g + ' Group';
  $('#rollResult').hidden = false;
}

$('#acceptBtn').onclick = async () => {
  const pick = state.lastRoll;
  if (!pick) return;
  const btn = $('#acceptBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    await commitProgress(data => {
      if (!data.entries.some(e => e.breed === pick.n && e.artist === state.artist)) {
        data.entries.push({
          artist: state.artist,
          breed: pick.n,
          group: pick.g,
          rolledAt: new Date().toISOString(),
          drawings: []
        });
      }
    }, `Roll: ${state.artist} draws the ${pick.n}`);
    flash(`${pick.n} is yours. Go draw.`);
    renderRoller(); renderGallery();
  } catch (e) {
    if (e.message !== 'NO_TOKEN') say('Could not save the roll: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Lock it in';
  }
};

/* ------------------------------- gallery ------------------------------- */

function initFilters() {
  const sel = $('#filterGroup');
  GROUPS.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    sel.appendChild(o);
  });
  ['#search', '#filterGroup', '#filterState'].forEach(s => {
    $(s).addEventListener('input', renderGallery);
  });
}

function renderGallery() {
  const q = $('#search').value.trim().toLowerCase();
  const g = $('#filterGroup').value;
  const st = $('#filterState').value;
  const grid = $('#grid');
  grid.innerHTML = '';

  const shown = BREEDS.filter(b => {
    if (q && !b.n.toLowerCase().includes(q)) return false;
    if (g && b.g !== g) return false;
    if (st && breedState(b.n) !== st) return false;
    return true;
  });

  const frag = document.createDocumentFragment();
  shown.forEach(b => {
    const s = breedState(b.n);
    const thumb = firstThumb(b.n);
    const card = document.createElement('div');
    card.className = 'card ' + s;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const tw = document.createElement('div');
    tw.className = 'thumb-wrap';
    if (thumb) {
      const img = document.createElement('img');
      img.loading = 'lazy'; img.alt = '';
      img.src = rawUrl(thumb);
      img.onerror = () => { img.onerror = null; img.src = thumb; };
      tw.appendChild(img);
    } else {
      const ph = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ph.setAttribute('class', 'ph');
      ph.setAttribute('viewBox', '0 0 120 90');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#dogMark');
      ph.appendChild(use); tw.appendChild(ph);
    }
    card.appendChild(tw);

    if (s === 'both') {
      const c = document.createElement('span');
      c.className = 'crown'; c.textContent = '\u2b50'; card.appendChild(c);
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const name = document.createElement('div');
    name.className = 'cname'; name.textContent = b.n; body.appendChild(name);

    const dots = document.createElement('div');
    dots.className = 'cdots';
    CONFIG.artists.forEach(a => {
      const d = document.createElement('span');
      const e = entryFor(b.n, a);
      d.className = 'cdot' + (e && e.drawings.length ? ' on' : e ? ' pend' : '');
      d.title = a + (e && e.drawings.length ? ' \u2014 drawn' : e ? ' \u2014 claimed' : ' \u2014 not started');
      dots.appendChild(d);
    });
    body.appendChild(dots);

    const grp = document.createElement('div');
    grp.className = 'cgroup'; grp.textContent = b.g; body.appendChild(grp);
    card.appendChild(body);

    card.onclick = () => openModal(b.n);
    card.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openModal(b.n); } };
    frag.appendChild(card);
  });
  grid.appendChild(frag);

  const done = BREEDS.filter(b => breedState(b.n) === 'both').length;
  $('#galleryCount').textContent = `${shown.length} shown · ${done} of ${BREEDS.length} done by both`;
}

/* -------------------------------- modal -------------------------------- */

function openModal(breedName) {
  const b = BREEDS.find(x => x.n === breedName);
  if (!b) return;
  state.modalBreed = breedName;
  $('#modalBreed').textContent = b.n;
  $('#modalGroup').textContent = b.g + ' Group';

  const wrap = $('#modalArtists');
  wrap.innerHTML = '';
  CONFIG.artists.forEach(a => {
    const e = entryFor(b.n, a);
    const block = document.createElement('div');
    block.className = 'artist-block';

    const h = document.createElement('h3');
    h.textContent = a + (a === state.artist ? ' (you)' : ''); block.appendChild(h);

    const st = document.createElement('p');
    st.className = 'status';
    if (!e) st.textContent = 'Hasn’t rolled this breed yet.';
    else if (!e.drawings.length) st.textContent = 'Claimed ' + fmtDate(e.rolledAt) + ' — no drawing yet.';
    else st.textContent = `${e.drawings.length} drawing${e.drawings.length > 1 ? 's' : ''} · claimed ${fmtDate(e.rolledAt)}`;
    block.appendChild(st);

    if (e && e.drawings.length) {
      const dg = document.createElement('div');
      dg.className = 'drawings';
      e.drawings.slice().reverse().forEach(d => {
        const fig = document.createElement('figure');
        fig.className = 'drawing';
        const img = document.createElement('img');
        img.loading = 'lazy'; img.alt = `${a}'s ${b.n}`;
        img.src = rawUrl(d.path);
        img.onerror = () => { img.onerror = null; img.src = d.path; };
        const cap = document.createElement('figcaption');
        cap.textContent = 'Uploaded ' + fmtDate(d.uploadedAt);
        fig.appendChild(img); fig.appendChild(cap); dg.appendChild(fig);
      });
      block.appendChild(dg);
    }
    wrap.appendChild(block);
  });

  $('#uploadNote').textContent = state.readOnly ? 'Add the access key to upload.' : '';
  $('#modal').hidden = false;
}

$('#modalClose').onclick = () => { $('#modal').hidden = true; };
$('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal') $('#modal').hidden = true; });
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { $('#modal').hidden = true; $('#tokenModal').hidden = true; }
});

/* -------------------------------- upload ------------------------------- */

$('#uploadBtn').onclick = () => {
  if (!state.token) { openTokenModal(); return; }
  $('#fileInput').click();
};

$('#fileInput').addEventListener('change', async ev => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file || !state.modalBreed) return;
  const breed = state.modalBreed;
  const btn = $('#uploadBtn');
  btn.disabled = true; btn.textContent = 'Uploading…';
  $('#uploadNote').textContent = 'Shrinking the image…';
  try {
    const { b64, ext } = await prepareImage(file);
    const slug = breedSlug(breed);
    const path = `drawings/${breedSlug(state.artist)}/${slug}-${Date.now()}.${ext}`;
    $('#uploadNote').textContent = 'Committing to GitHub…';
    await putFile(path, b64, `Drawing: ${state.artist}'s ${breed}`);
    await commitProgress(data => {
      let e = data.entries.find(x => x.breed === breed && x.artist === state.artist);
      if (!e) {
        e = { artist: state.artist, breed, group: (BREEDS.find(x => x.n === breed) || {}).g,
              rolledAt: new Date().toISOString(), drawings: [] };
        data.entries.push(e);
      }
      e.drawings.push({ path, uploadedAt: new Date().toISOString() });
    }, `Drawing: ${state.artist}'s ${breed}`);
    $('#uploadNote').textContent = '';
    flash('Uploaded. It may take GitHub a few seconds to serve the image.');
    openModal(breed);
    renderRoller(); renderGallery();
  } catch (e) {
    if (e.message !== 'NO_TOKEN') $('#uploadNote').textContent = 'Upload failed: ' + e.message;
  } finally {
    btn.disabled = false; btn.textContent = 'Add your drawing';
  }
});

function prepareImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = CONFIG.maxImageEdge || 1400;
      let { width: w, height: h } = img;
      const scale = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      let ext = 'jpg';
      let dataUrl = c.toDataURL('image/jpeg', 0.86);
      if (/png$/i.test(file.type)) {
        const png = c.toDataURL('image/png');
        if (png.length < 1_600_000) { dataUrl = png; ext = 'png'; }
      }
      resolve({ b64: dataUrl.split(',')[1], ext });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file did not open as an image.')); };
    img.src = url;
  });
}

/* -------------------------------- token -------------------------------- */

function openTokenModal() {
  const tr = $('#tokenRepo');
  if (tr) tr.textContent = state.repo ? `${state.repo.owner}/${state.repo.name}` : 'your repo';
  $('#tokenError').hidden = true;
  $('#tokenModal').hidden = false;
  $('#tokenInput').focus();
}
$('#tokenCancel').onclick = () => { $('#tokenModal').hidden = true; };
$('#tokenSave').onclick = async () => {
  const t = $('#tokenInput').value.trim();
  if (!t) return;
  const btn = $('#tokenSave');
  btn.disabled = true; btn.textContent = 'Checking…';
  const prev = state.token;
  state.token = t;
  try {
    if (!state.repo) throw new Error('Cannot work out which repo this is. Fill in CONFIG.repo in js/config.js.');
    const res = await fetch(`https://api.github.com/repos/${state.repo.owner}/${state.repo.name}`, { headers: ghHeaders() });
    if (res.status === 401) throw new Error('That key wasn\u2019t accepted. Check you pasted all of it \u2014 they\u2019re long.');
    if (res.status === 404) throw new Error('That key doesn\u2019t reach this site\u2019s repository. It may be scoped to the wrong one.');
    if (!res.ok) throw new Error('Couldn\u2019t check that key (error ' + res.status + '). Try again in a moment.');
    const info = await res.json();
    if (!info.permissions || !info.permissions.push) throw new Error('That key can read but not save. It needs Contents: Read and write.');
    localStorage.setItem('ddc_token', t);
    state.readOnly = false;
    $('#tokenModal').hidden = true;
    $('#tokenInput').value = '';
    flash('Key saved. You can roll and upload now.');
    await refresh();
  } catch (e) {
    state.token = prev;
    $('#tokenError').textContent = e.message;
    $('#tokenError').hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = 'Save token';
  }
};

/* -------------------------------- boot --------------------------------- */

(function boot() {
  state.repo = resolveRepo();

  // A setup link shaped like  https://.../#key=<token>  drops the access key straight
  // into this browser, so someone who isn't going to hand-copy a credential never has to.
  // The fragment never reaches a server; it's stripped from the URL immediately after.
  const keyInUrl = location.hash.match(/[#&]key=([^&]+)/);
  if (keyInUrl) {
    try { localStorage.setItem('ddc_token', decodeURIComponent(keyInUrl[1])); } catch (_) {}
    history.replaceState(null, '', location.pathname + location.search);
  }

  state.token = localStorage.getItem('ddc_token');
  state.readOnly = !state.token;
  initFilters();

  if (sessionStorage.getItem('ddc_ok') === '1') {
    const saved = localStorage.getItem('ddc_artist');
    if (saved && CONFIG.artists.includes(saved)) { enterApp(saved); return; }
    showArtistPick();
  }
})();
