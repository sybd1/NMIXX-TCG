/**
 * Arcane / Void Synthesizer Sound Engine
 * Built with native Web Audio API - Zero external assets required
 */
import { Rarity } from '../types/card';

class SoundService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private volume: number = 0.4;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted() {
    return this.muted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, delay = 0, gainLevel = 1.0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);

      gain.gain.setValueAtTime(this.volume * gainLevel, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch {
      // Audio context error fallback
    }
  }

  public playClick() {
    this.playTone(700, 'sine', 0.05, 0, 0.3);
  }

  public playPackShake() {
    // 서스펜스 저음 럼블
    this.playTone(80, 'triangle', 0.15, 0, 0.6);
    this.playTone(110, 'sine', 0.18, 0.05, 0.5);
  }

  public playPackGlow() {
    // 웅장한 에너지 차징 상승음
    const notes = [220, 277, 330, 440, 554];
    notes.forEach((f, i) => {
      this.playTone(f, 'sine', 0.3, i * 0.06, 0.4);
    });
  }

  public playPackTear() {
    // 팩이 찢어지는 에너지 방출음
    this.playTone(150, 'sawtooth', 0.25, 0, 0.8);
    this.playTone(350, 'square', 0.2, 0.05, 0.5);
    this.playTone(600, 'sine', 0.35, 0.1, 0.6);
  }

  private lastFlipSoundTime: number = 0;

  public playCardDeal() {
    this.playTone(400, 'triangle', 0.08, 0, 0.4);
  }

  public playCardFlip() {
    const now = Date.now();
    // 50장 등 다중 팩 오픈 시 오디오 스레드 과부하 방지 (70ms 스로틀링)
    if (now - this.lastFlipSoundTime < 70) return;
    this.lastFlipSoundTime = now;

    this.playTone(520, 'sine', 0.12, 0, 0.5);
    this.playTone(780, 'triangle', 0.14, 0.04, 0.4);
  }

  public playRareReveal() {
    const now = Date.now();
    if (now - this.lastFlipSoundTime < 60) return;
    this.lastFlipSoundTime = now;

    // 푸른 에테르 징글
    const notes = [392, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
    notes.forEach((f, i) => {
      this.playTone(f, 'sine', 0.2, i * 0.05, 0.5);
    });
  }

  public playEpicReveal() {
    // 신비로운 보라빛 화음
    const notes = [293.66, 370, 440, 587.33, 740];
    notes.forEach((f, i) => {
      this.playTone(f, 'triangle', 0.35, i * 0.08, 0.7);
    });
  }

  public playLegendaryReveal() {
    // 황금빛 팡파르 & 묵직한 서브베이스
    this.playTone(65, 'sawtooth', 0.6, 0, 0.9);
    const melody = [440, 554.37, 659.25, 880, 1108];
    melody.forEach((f, i) => {
      this.playTone(f, 'triangle', 0.4, i * 0.09, 0.8);
    });
  }

  public playMythicReveal() {
    // 심연의 거대한 진동 & 상승음
    this.playTone(50, 'sawtooth', 0.9, 0, 1.0);
    this.playTone(75, 'square', 0.7, 0.1, 0.7);
    const chords = [330, 392, 493.88, 659.25, 783.99, 987.77];
    chords.forEach((f, i) => {
      this.playTone(f, 'sine', 0.6, 0.2 + i * 0.08, 0.85);
    });
  }

  public playSecretReveal() {
    // 우주적 차원 균열 & 장엄한 충격파
    this.playTone(40, 'sawtooth', 1.5, 0, 1.0);
    this.playTone(55, 'triangle', 1.8, 0.1, 0.9);
    const cosmicNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    cosmicNotes.forEach((f, i) => {
      this.playTone(f, 'triangle', 0.8, 0.4 + i * 0.1, 0.9);
    });
  }

  public playDust() {
    this.playTone(900, 'sine', 0.1, 0, 0.4);
    this.playTone(1200, 'sine', 0.15, 0.06, 0.4);
  }

  public playCraftSuccess() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.playTone(f, 'triangle', 0.25, i * 0.08, 0.6);
    });
  }

  /**
   * 🌟 SR, SSR, UR, LR, MR 스페셜 에디션 전용 엔믹스 은은한 시그니처 멜로디
   * 맑고 신비로운 크리스탈 신스 오르골 아르페지오 사운드
   */
  public playNmixxMelody(rarity: Rarity) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // 엔믹스 멜로디 아르페지오 노트 주파수 (D Major / Pentatonic Synth)
    // D4, F#4, A4, B4, D5, E5, F#5, A5
    const nmixxScale = [293.66, 369.99, 440.00, 493.88, 587.33, 659.25, 739.99, 880.00];

    if (rarity === 'MR') {
      // 코스믹 7음 풀 아르페지오 멜로디 + 에코
      [0, 2, 4, 6, 7, 5, 4, 7].forEach((idx, i) => {
        this.playTone(nmixxScale[idx] * 1.5, 'sine', 0.6, i * 0.12, 0.45);
        this.playTone(nmixxScale[idx] * 0.75, 'triangle', 0.8, i * 0.12 + 0.02, 0.35);
      });
    } else if (rarity === 'LR') {
      // 레전드 골드 6음 멜로디
      [0, 2, 3, 4, 6, 7].forEach((idx, i) => {
        this.playTone(nmixxScale[idx] * 1.5, 'sine', 0.5, i * 0.11, 0.4);
      });
    } else if (rarity === 'UR') {
      // 프리즘 글리터 5음 멜로디
      [0, 2, 4, 5, 7].forEach((idx, i) => {
        this.playTone(nmixxScale[idx] * 1.2, 'sine', 0.45, i * 0.1, 0.38);
      });
    } else if (rarity === 'SSR') {
      // 크랙 4음 멜로디
      [0, 2, 4, 6].forEach((idx, i) => {
        this.playTone(nmixxScale[idx], 'sine', 0.4, i * 0.1, 0.35);
      });
    } else if (rarity === 'SR') {
      // 레인보우 포일 3음 멜로디
      [0, 2, 4].forEach((idx, i) => {
        this.playTone(nmixxScale[idx], 'sine', 0.35, i * 0.1, 0.3);
      });
    }
  }
}

export const sound = new SoundService();
