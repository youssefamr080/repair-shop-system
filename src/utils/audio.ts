/**
 * Audio Manager - Mayo Fix
 * 
 * Simple notification sounds for inventory operations.
 */

export type NotificationSound = 'success' | 'error' | 'warning' | 'info';

class AudioManager {
  private static instance: AudioManager | null = null;
  private context: AudioContext | null = null;
  private _volume: number = 1.0;

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = Math.max(0, Math.min(1, value));
  }

  private constructor() {
    if (typeof window === 'undefined') return;

    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextCtor) {
      try {
        this.context = new AudioContextCtor();
      } catch {
        this.context = null;
      }
    }
  }

  static getInstance(): AudioManager | null {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance.context ? AudioManager.instance : null;
  }

  private getContext(): AudioContext | null {
    if (!this.context) return null;
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => { });
    }
    return this.context;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    const ctx = this.getContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    const adjustedGain = 0.3 * this._volume;
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(adjustedGain, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  play(sound: NotificationSound) {
    switch (sound) {
      case 'success':
        this.playTone(523, 0.15);
        setTimeout(() => this.playTone(659, 0.15), 100);
        setTimeout(() => this.playTone(784, 0.2), 200);
        break;

      case 'error':
        this.playTone(349, 0.15, 'sawtooth');
        setTimeout(() => this.playTone(293, 0.15, 'sawtooth'), 100);
        setTimeout(() => this.playTone(220, 0.2, 'sawtooth'), 200);
        break;

      case 'warning':
        this.playTone(440, 0.15, 'triangle');
        setTimeout(() => this.playTone(349, 0.15, 'triangle'), 100);
        setTimeout(() => this.playTone(440, 0.2, 'triangle'), 200);
        break;

      case 'info':
        this.playTone(523, 0.1);
        setTimeout(() => this.playTone(659, 0.15), 80);
        break;
    }
  }
}

// Public API
export function playNotificationSound(sound: NotificationSound) {
  const manager = AudioManager.getInstance();
  manager?.play(sound);
}

export function setNotificationVolume(volume: number): void {
  const manager = AudioManager.getInstance();
  if (manager) {
    manager.volume = volume;
  }
}

export function getNotificationVolume(): number {
  const manager = AudioManager.getInstance();
  return manager?.volume ?? 1.0;
}
