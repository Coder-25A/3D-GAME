export class AudioManager {
  constructor() {
    this.sounds = {};
    this.bgm = null;
    this.initialized = false;
    this.isMuted = false;
  }

  loadSound(name, path, volume = 1.0) {
    console.log(`[AUDIO] Attempting to load: ${name} from ${path}`);
    const audio = new Audio();
    audio.src = path;
    audio.volume = volume;
    
    // Aggressive error tracking
    audio.onerror = (e) => {
      console.error(`[AUDIO ERROR] Failed to load ${name} at ${path}. Check the file path and ensure the file is inside the 'public' folder!`, e);
    };
    audio.oncanplaythrough = () => {
      console.log(`[AUDIO SUCCESS] ${name} is fully loaded and ready to play!`);
    };
    
    this.sounds[name] = audio;
  }

  loadBGM(path, volume = 0.5) {
    this.bgm = new Audio(path);
    this.bgm.volume = volume;
    this.bgm.loop = true;
  }

  init() {
    if (this.initialized) return;
    console.log("[AUDIO] Audio context initialized via user click.");
    if (this.bgm) {
      this.bgm.play().catch(e => console.warn('[AUDIO] BGM blocked by browser', e));
    }
    this.initialized = true;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.bgm) {
      this.bgm.muted = this.isMuted;
    }
    return this.isMuted;
  }

  play(name) {
    if (!this.initialized) {
      console.warn(`[AUDIO WARNING] Tried to play '${name}' before user clicked Start!`);
      return;
    }
    if (this.isMuted) return;

    if (this.sounds[name]) {
      const clone = this.sounds[name].cloneNode();
      clone.volume = this.sounds[name].volume;
      clone.play()
        .then(() => console.log(`[AUDIO] Playing: ${name}`))
        .catch(e => console.error(`[AUDIO FATAL] Browser actively blocked playing '${name}':`, e));
    } else {
      console.error(`[AUDIO FATAL] Sound '${name}' does not exist in the manager!`);
    }
  }
}

export const audioManager = new AudioManager();
