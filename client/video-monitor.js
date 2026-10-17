import {VideoRTC} from './vendor/video-rtc.js';

class ClubGame extends VideoRTC {
  constructor() {
    super();
    this.mode = 'mse';
    this.media = 'video';
    this.background = false;
    this.visibilityCheck = false;
    this.RECONNECT_TIMEOUT = 2000;
    this.DISCONNECT_TIMEOUT = 0;
    this.lastFrames = 0;
    this.lastSample = 0;
  }
  connectedCallback() {
    super.connectedCallback();
    if (!this.wsURL && this.dataset.enabled === 'true') this.src = '/video/ws';
    if (!this.statsTimer) this.statsTimer = setInterval(() => this.sample(), 1000);
  }
  disconnectedCallback() {
    clearInterval(this.statsTimer);this.statsTimer = null;
    super.disconnectedCallback();
  }
  oninit() {
    super.oninit();
    this.video.muted = true;
    this.video.controls = true;
    this.video.style.objectFit = 'contain';
    if (this.dataset.enabled === 'true') this.status('Conectando video continuo');
    this.video.addEventListener('playing', () => this.status('Video continuo activo'));
    this.video.addEventListener('waiting', () => this.status('Esperando señal de video'));
    this.video.addEventListener('error', () => this.status('No se pudo reproducir el video'));
  }
  onopen() {
    const result = super.onopen();
    this.onmessage['error'] = () => this.status('Sin señal de la cámara; reintentando');
    return result;
  }
  onclose() {
    this.status('Video desconectado; reintentando');
    return super.onclose();
  }
  status(message) {
    this.dataset.status = message;
    const label = document.getElementById('gameStatus');
    if (label) label.textContent = message;
  }
  sample() {
    if (!this.video || !this.wsURL) return;
    const now = performance.now();
    const frames = this.video.getVideoPlaybackQuality?.().totalVideoFrames || 0;
    const delta = frames - this.lastFrames;
    if (this.lastSample && delta > 0) {
      const fps = Math.round(delta * 1000 / (now - this.lastSample));
      this.dataset.fps = String(fps);
      this.status(`Video continuo · ${fps} fps`);
    } else if (this.lastSample && !delta) {
      this.dataset.fps = '0';
      this.status(this.wsState === WebSocket.OPEN ? 'Esperando señal de video' : 'Video desconectado; reintentando');
    }
    this.lastFrames = frames;this.lastSample = now;
  }
}
customElements.define('club-game', ClubGame);
