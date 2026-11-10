// Forza Horizon Ultra Dynamic Audio Engine
class ForzaAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.oscEngine = null;
    this.gainEngine = null;
    this.oscSub = null;
    this.gainSub = null;
    this.tireGain = null;
    this.turboGain = null;
    this.turboOsc = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Main V8 Engine Oscillator (Sawtooth for growl)
      this.oscEngine = this.ctx.createOscillator();
      this.oscEngine.type = 'sawtooth';
      this.oscEngine.frequency.setValueAtTime(45, this.ctx.currentTime);

      this.gainEngine = this.ctx.createGain();
      this.gainEngine.gain.setValueAtTime(0.09, this.ctx.currentTime);

      // Low rumble sub oscillator
      this.oscSub = this.ctx.createOscillator();
      this.oscSub.type = 'triangle';
      this.oscSub.frequency.setValueAtTime(28, this.ctx.currentTime);

      this.gainSub = this.ctx.createGain();
      this.gainSub.gain.setValueAtTime(0.12, this.ctx.currentTime);

      // Lowpass filter for deep exhaust tone
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, this.ctx.currentTime);

      this.oscEngine.connect(this.gainEngine);
      this.gainEngine.connect(filter);

      this.oscSub.connect(this.gainSub);
      this.gainSub.connect(filter);

      filter.connect(this.ctx.destination);

      this.oscEngine.start();
      this.oscSub.start();

      // Turbo Spool Whine
      this.turboOsc = this.ctx.createOscillator();
      this.turboOsc.type = 'sine';
      this.turboOsc.frequency.setValueAtTime(1000, this.ctx.currentTime);
      this.turboGain = this.ctx.createGain();
      this.turboGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.turboOsc.connect(this.turboGain);
      this.turboGain.connect(this.ctx.destination);
      this.turboOsc.start();

      // Tire Screech Noise
      this.initTireNoise();
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  initTireNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1250, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(3.2, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    whiteNoise.connect(bandpass);
    bandpass.connect(this.tireGain);
    this.tireGain.connect(this.ctx.destination);

    whiteNoise.start();
  }

  update(rpmRatio, isDrifting, isNitro) {
    if (!this.ctx || !this.enabled) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    // RPM mapping (50Hz to 440Hz)
    const baseFreq = 50 + rpmRatio * 340 + (isNitro ? 60 : 0);
    this.oscEngine.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.oscSub.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);

    // Turbo whine
    if (this.turboGain) {
      const targetTurbo = isNitro ? 0.08 : (rpmRatio > 0.6 ? 0.03 : 0);
      this.turboOsc.frequency.setTargetAtTime(1200 + rpmRatio * 1800, now, 0.1);
      this.turboGain.gain.setTargetAtTime(targetTurbo, now, 0.1);
    }

    // Tire Screech
    if (this.tireGain) {
      const targetTire = isDrifting ? 0.16 : 0.0;
      this.tireGain.gain.setTargetAtTime(targetTire, now, 0.08);
    }
  }

  // Gear Shift Exhaust Pop
  playBackfire() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.gainEngine) {
      this.gainEngine.gain.setValueAtTime(this.enabled ? 0.09 : 0.0, this.ctx.currentTime);
      this.gainSub.gain.setValueAtTime(this.enabled ? 0.12 : 0.0, this.ctx.currentTime);
    }
    return this.enabled;
  }
}

const forzaAudio = new ForzaAudioEngine();

