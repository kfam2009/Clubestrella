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
  const game = document.getElementById('gamePreview');
  const gameStatus = document.getElementById('gameStatus');
  const gameLabel = document.getElementById('gameLabel'); if (gameLabel) gameLabel.textContent = live.gameView === 'program' ? '02 / Salida de OBS' : '02 / Cancha';
  const continuous = live.gameMode === 'continuous';
  const player = document.getElementById('gameVideo');
  if (player) player.hidden = !continuous;
  if (player && continuous && player.dataset.enabled !== 'true') {
    player.dataset.enabled = 'true';
    customElements.whenDefined('club-game').then(() => { player.src = '/video/ws'; });
  }
  if (continuous && game) game.hidden = true;
  if (gameStatus && !continuous) gameStatus.textContent = live.gameConnected ? (live.gameView === 'program' ? 'Programa · sin audio' : 'Capturas de respaldo') : 'Sin actualización';
  if (gameStatus && continuous && !live.gameReady) gameStatus.textContent = live.gameStatus || 'Preparando video continuo';
  if (game && !continuous) {
    game.classList.toggle('value-stale', !live.gameConnected);
    if (live.gameImage && live.gameRevision && game.dataset.revision !== String(live.gameRevision)) {
      game.hidden = false; game.src = live.gameImage + '?r=' + live.gameRevision; game.dataset.revision = live.gameRevision;
    }
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
  scheduleOBSSettings();
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
    if (stage.classList.contains('stage-preview')) { stage.style.top = `${-820*scale}px`; stage.parentElement.style.height = `${260*scale}px`; }
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

// Responsive settings drawer keeps desktop controls visible and small screens compact.
const settingsDrawer = document.querySelector('.settings-drawer');
function fitSettingsDrawer() { if (settingsDrawer) settingsDrawer.open = innerWidth > 700; }
fitSettingsDrawer(); window.addEventListener('resize',fitSettingsDrawer);

// Dedicated OBS graphic control: initial reads never change visibility.
const obsGraphicButton=document.getElementById('obsGraphicButton');
const obsGraphicStatus=document.getElementById('obsGraphicStatus');
let obsGraphicToken='',obsGraphicState=null,obsGraphicBusy=false;
async function refreshOBSGraphic() {
 if (!obsGraphicButton || obsGraphicBusy) return;
 try {
  const r=await fetch('http://127.0.0.1:8774/state',{cache:'no-store',signal:AbortSignal.timeout(2500)});
  if(!r.ok)throw Error(); const s=await r.json();obsGraphicState=s;obsGraphicToken=s.token;
  if(s.safetyLocked&&!s.enabled){obsGraphicButton.disabled=true;obsGraphicButton.textContent='Prueba pausada';obsGraphicStatus.textContent='APAGADO EN OBS';return;}
  obsGraphicButton.disabled=false;
  obsGraphicButton.textContent=!s.ready?'Preparar en OBS':s.enabled?'Ocultar de OBS':'Mostrar en OBS';
  obsGraphicButton.dataset.on=String(s.enabled);obsGraphicButton.setAttribute('aria-pressed',String(s.enabled));
  obsGraphicStatus.textContent=!s.ready?'Sin agregar':s.enabled?'VISIBLE EN OBS':'APAGADO EN OBS';
  obsGraphicStatus.dataset.on=String(s.enabled);
 } catch {obsGraphicButton.disabled=true;obsGraphicStatus.textContent='Control OBS sin conexión';}
}
obsGraphicButton?.addEventListener('click',async()=>{
 if(obsGraphicBusy)return;
 await refreshOBSGraphic();if(!obsGraphicState||!obsGraphicToken)return;
 obsGraphicBusy=true;obsGraphicButton.disabled=true;
 try{
  if (!obsGraphicState.enabled && !(await syncOBSSettings())) throw Error();
  const route=obsGraphicState.ready?'visibility':'install';
  const r=await fetch('http://127.0.0.1:8774/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-Panel-Token':obsGraphicToken},body:JSON.stringify({enabled:!obsGraphicState.enabled}),signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error();
 }catch{obsGraphicStatus.textContent='No se pudo cambiar en OBS';}
 finally{obsGraphicBusy=false;await refreshOBSGraphic();}
});
if(obsGraphicButton){refreshOBSGraphic();setInterval(refreshOBSGraphic,3000);}

// Names and logos are explicitly shared with the OBS renderer, not only localStorage.
const obsSettingsButton=document.getElementById('obsSettingsButton');
let obsSettingsTimer=0;
async function syncOBSSettings() {
 if(!obsSettingsButton)return false;
 if(!obsGraphicToken)await refreshOBSGraphic();
 if(!obsGraphicToken){obsSettingsButton.textContent='Sin conexión con OBS';return false;}
 obsSettingsButton.disabled=true;
 try{
  const settings=Object.fromEntries(['homeName','awayName','homeLogo','awayLogo','tournament','category'].map(k=>[k,state[k]||'']));
  const r=await fetch('http://127.0.0.1:8774/settings',{method:'POST',headers:{'Content-Type':'application/json','X-Panel-Token':obsGraphicToken},body:JSON.stringify(settings),signal:AbortSignal.timeout(5000)});
  if(!r.ok)throw Error();
  localStorage.setItem('club-estrella-obs-linked','1');obsSettingsButton.textContent='Datos enviados a OBS ✓';return true;
 }catch{obsSettingsButton.textContent='No se pudieron enviar los datos';return false;}
 finally{obsSettingsButton.disabled=false;}
}
function scheduleOBSSettings(){
 if(localStorage.getItem('club-estrella-obs-linked')!=='1')return;
 clearTimeout(obsSettingsTimer);obsSettingsTimer=setTimeout(syncOBSSettings,350);
}
obsSettingsButton?.addEventListener('click',syncOBSSettings);
