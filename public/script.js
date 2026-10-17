const defaults = {
  homeName: 'ESTRELLA', awayName: 'VISITA', homeScore: '--', awayScore: '--',
  homeLogo: '', awayLogo: '', period: '--', clock: '--:--', shotClock: '',
  tournament: 'CLUB ESTRELLA', category: '',
};
const liveKeys = ['clock','homeScore','awayScore','period'];
const params = new URLSearchParams(location.search);
const liveMode = params.get('live') !== '0';
const storageKey = 'club-estrella-settings-v1';
function savedSettings() { try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; } }
const state = {...defaults, ...savedSettings()};
for (const [key,value] of params) if (key in defaults && (!liveMode || !liveKeys.includes(key))) state[key] = value;
if (liveMode) for (const key of liveKeys) state[key] = defaults[key];
let lastFeed = null, lastEvent = 0, polling = false;

function render() {
  document.querySelectorAll('[data-bind]').forEach(node => {
    const value = state[node.dataset.bind] || '';
    if (node.textContent !== value) node.textContent = value;
  });
  document.querySelectorAll('[data-logo]').forEach(img => {
    const value = state[img.dataset.logo] || '';
    img.hidden = !value;
    if (value && img.getAttribute('src') !== value) img.src = value;
    img.closest('.team-logo').hidden = false;
  });
  document.querySelectorAll('input:not([type=file])').forEach(input => {
    if (input.id in state && document.activeElement !== input) input.value = state[input.id];
    if (liveMode && liveKeys.includes(input.id)) {input.readOnly = true; input.title = 'Lectura automática del tablero';}
  });
  const link = document.getElementById('rendererLink');
  if (link) {
    const query = new URLSearchParams(Object.fromEntries(Object.entries(state).filter(([k,v]) => v && v.length < 1000 && !liveKeys.includes(k))));
    query.set('live', liveMode ? '1' : '0');
    link.href = 'graphics.html?' + query;
  }
}
function showHealth() {
  if (!liveMode) return;
  const elapsed = Date.now() - lastEvent;
  const healthy = lastFeed && elapsed < 4000 && lastFeed.connected && lastFeed.ocrStatus === 'ok';
  document.body.classList.toggle('feed-stale', !healthy);
  const status = document.getElementById('liveStatus');
  if (status) {
    status.textContent = elapsed > 4000 ? 'Sin actualización del lector' : (lastFeed?.status || 'Esperando lectura del tablero');
    status.dataset.ok = String(Boolean(healthy));
  }
  document.querySelectorAll('[data-bind]').forEach(node => {
    const key = node.dataset.bind;
    if (liveKeys.includes(key)) node.classList.toggle('value-stale', !lastFeed?.fields?.[key]?.valid || elapsed > 4000);
  });
  const stamp = document.getElementById('lastCapture');
  if (stamp) stamp.textContent = lastFeed?.updatedAt ? 'Captura: ' + new Date(lastFeed.updatedAt).toLocaleTimeString('es-AR') : 'Sin capturas';
}
function acceptFeed(live) {
  if (!liveMode || live.service !== 'club-estrella') return;
  lastFeed = live; lastEvent = Date.now();
  for (const key of liveKeys) if (typeof live[key] === 'string') state[key] = live[key];
  render(); showHealth();
  for (const [key,id] of Object.entries({clock:'liveClock',homeScore:'liveHome',awayScore:'liveAway',period:'livePeriod'})) {
    const node = document.getElementById(id);
    if (node) {node.textContent = state[key];node.classList.toggle('value-stale',!live.fields?.[key]?.valid);}
  }
  const preview = document.getElementById('boardPreview');
  if (preview && live.updatedAt && preview.dataset.revision !== String(live.revision)) {
    preview.hidden = false;preview.src = 'board.png?t=' + live.revision;preview.dataset.revision = live.revision;
  }
}
async function poll() {
  if (polling || !liveMode) return;
  polling = true;
  try {
    const r = await fetch('api/state', {cache:'no-store',signal:AbortSignal.timeout(2500)});
    if (r.ok) acceptFeed(await r.json());
  } catch {showHealth();} finally {polling = false;}
}
function persist() {
  const config = Object.fromEntries(Object.entries(state).filter(([key]) => !liveKeys.includes(key)));
  if (!liveMode) Object.assign(config, Object.fromEntries(liveKeys.map(k => [k,state[k]])));
  localStorage.setItem(storageKey, JSON.stringify(config));
}
document.querySelectorAll('[data-scorebug]').forEach(target => target.replaceChildren(document.getElementById('scorebugTemplate').content.cloneNode(true)));
document.querySelectorAll('input:not([type=file])').forEach(input => input.addEventListener('input', () => {
  if (input.id in state && !(liveMode && liveKeys.includes(input.id))) {state[input.id] = input.value.trim();persist();render();}
}));
for (const [id,key] of Object.entries({homeLogoFile:'homeLogo',awayLogoFile:'awayLogo'})) {
  document.getElementById(id)?.addEventListener('change', e => {
    if (!e.target.files?.[0]) return;
    const reader = new FileReader();reader.onload = () => {state[key] = reader.result;persist();render();};reader.readAsDataURL(e.target.files[0]);
  });
}
window.addEventListener('storage', e => {if (e.key === storageKey) {Object.assign(state,savedSettings());render();}});
function fitStage() {
  document.querySelectorAll('.stage-preview,.stage-render').forEach(stage => {
    const parent = stage.classList.contains('stage-render') ? document.documentElement : stage.parentElement;
    const width = parent.clientWidth, height = stage.classList.contains('stage-render') ? innerHeight : Math.min(500, width*1080/1920);
    const scale = Math.min(width/1920,height/1080);
    stage.style.transform = stage.classList.contains('stage-render') ? `translate(-50%,-50%) scale(${scale})` : `scale(${scale})`;
    if (stage.classList.contains('stage-preview')) stage.parentElement.style.height = `${1080*scale}px`;
  });
}
render();fitStage();window.addEventListener('resize',fitStage);
if (liveMode) {
  poll();
  const events = new EventSource('api/events');
  events.onmessage = event => {try {acceptFeed(JSON.parse(event.data));} catch {}};
  setInterval(() => {if (Date.now()-lastEvent > 2000) poll();showHealth();},1000);
} else {
  document.getElementById('liveStatus')?.replaceChildren('Modo manual');
}
