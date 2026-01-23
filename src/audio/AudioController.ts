import { FrequencyAnalyzer, type FrequencyBands } from './FrequencyAnalyzer';

export class AudioController {
  private audioContext: AudioContext;
  private audioElement: HTMLAudioElement | null = null;
  private analyser: AnalyserNode;
  private frequencyData: Uint8Array;
  private timeDomainData: Uint8Array;
  private source: MediaElementAudioSourceNode | OscillatorNode | null = null;
  private frequencyAnalyzer: FrequencyAnalyzer;
  private isUsingFallback: boolean = false;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private playlist: string[] = [];
  private currentTrackIndex: number = 0;
  private onTrackChangeCallback?: (trackName: string) => void;
  private onDurationChangeCallback?: (duration: number) => void;

  constructor(playlist: string[] = []) {
    // Create AudioContext
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create analyser
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    // Create data arrays
    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);
    this.timeDomainData = new Uint8Array(bufferLength);

    // Create frequency analyzer
    this.frequencyAnalyzer = new FrequencyAnalyzer();

    // Set playlist
    this.playlist = playlist;

    // Try to load first track, fallback to oscillator if no tracks
    if (this.playlist.length > 0) {
      this.loadTrack(this.currentTrackIndex);
    } else {
      this.createFallbackOscillator();
    }
  }

  public setOnTrackChange(callback: (trackName: string) => void): void {
    this.onTrackChangeCallback = callback;
  }

  public setOnDurationChange(callback: (duration: number) => void): void {
    this.onDurationChangeCallback = callback;
  }

  public getCurrentTrackName(): string {
    if (this.isUsingFallback) {
      return 'Oscillator (440Hz)';
    }
    if (this.playlist.length === 0) {
      return 'No tracks';
    }
    const trackPath = this.playlist[this.currentTrackIndex];
    // Extract filename from path
    const filename = trackPath.split('/').pop() || trackPath;
    // Remove extension
    return filename.replace(/\.[^/.]+$/, '');
  }

  public getPlaylistLength(): number {
    return this.playlist.length;
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  private async loadTrack(index: number): Promise<void> {
    if (index < 0 || index >= this.playlist.length) {
      this.createFallbackOscillator();
      return;
    }

    this.currentTrackIndex = index;
    const audioFilePath = this.playlist[index];

    // Clean up existing audio element
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    // Disconnect existing source
    if (this.source && this.source instanceof MediaElementAudioSourceNode) {
      this.source.disconnect();
    }

    try {
      this.audioElement = new Audio(audioFilePath);
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.loop = false; // Don't loop individual tracks

      // Handle track end - go to next track
      this.audioElement.addEventListener('ended', () => {
        this.nextTrack();
      });

      // Handle duration change when metadata loads
      this.audioElement.addEventListener('loadedmetadata', () => {
        if (this.audioElement && this.onDurationChangeCallback) {
          const duration = this.audioElement.duration;
          if (isFinite(duration) && duration > 0) {
            this.onDurationChangeCallback(duration);
          }
        }
      });

      // Also check duration on timeupdate in case loadedmetadata doesn't fire
      this.audioElement.addEventListener('durationchange', () => {
        if (this.audioElement && this.onDurationChangeCallback) {
          const duration = this.audioElement.duration;
          if (isFinite(duration) && duration > 0) {
            this.onDurationChangeCallback(duration);
          }
        }
      });

      // Wait for audio to be ready
      await new Promise<void>((resolve, reject) => {
        if (!this.audioElement) {
          reject(new Error('Audio element not created'));
          return;
        }

        this.audioElement.addEventListener('canplaythrough', () => {
          // Check duration after canplaythrough
          if (this.audioElement && this.onDurationChangeCallback) {
            const duration = this.audioElement.duration;
            if (isFinite(duration) && duration > 0) {
              this.onDurationChangeCallback(duration);
            }
          }
          resolve();
        });

        this.audioElement.addEventListener('error', () => {
          console.warn(`Failed to load track: ${audioFilePath}`);
          // Try next track or fallback
          if (this.currentTrackIndex < this.playlist.length - 1) {
            this.nextTrack();
          } else {
            this.createFallbackOscillator();
          }
          reject(new Error('Audio load failed'));
        });

        this.audioElement.load();
      });

      // Create source from audio element
      if (this.audioElement && this.audioContext.state !== 'closed') {
        this.source = this.audioContext.createMediaElementSource(this.audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }

      // Notify track change
      if (this.onTrackChangeCallback) {
        this.onTrackChangeCallback(this.getCurrentTrackName());
      }
    } catch (error) {
      console.warn('Error loading track, trying next or fallback:', error);
      if (this.currentTrackIndex < this.playlist.length - 1) {
        this.nextTrack();
      } else {
        this.createFallbackOscillator();
      }
    }
  }

  private createFallbackOscillator(): void {
    this.isUsingFallback = true;

    // Clean up existing audio
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }

    // Disconnect existing source
    if (this.source && this.source instanceof MediaElementAudioSourceNode) {
      this.source.disconnect();
    }

    // Create oscillator at 440Hz
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = 440;

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.3;

    // Connect: oscillator -> gain -> analyser -> destination
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.source = this.oscillator;
    this.oscillator.start();

    // Notify track change
    if (this.onTrackChangeCallback) {
      this.onTrackChangeCallback(this.getCurrentTrackName());
    }
  }

  public async play(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (this.audioElement && !this.isUsingFallback) {
      try {
        await this.audioElement.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  }

  public pause(): void {
    if (this.audioElement && !this.isUsingFallback) {
      this.audioElement.pause();
    }
  }

  public async nextTrack(): Promise<void> {
    if (this.playlist.length === 0) return;
    const nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    await this.loadTrack(nextIndex);
    // Auto-play if was playing
    if (this.isPlaying()) {
      await this.play();
    }
  }

  public async previousTrack(): Promise<void> {
    if (this.playlist.length === 0) return;
    const prevIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    await this.loadTrack(prevIndex);
    // Auto-play if was playing
    if (this.isPlaying()) {
      await this.play();
    }
  }

  public getFrequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.frequencyData as any);
    return this.frequencyData;
  }

  public getTimeDomainData(): Uint8Array {
    this.analyser.getByteTimeDomainData(this.timeDomainData as any);
    return this.timeDomainData;
  }

  public getFrequencyBands(): FrequencyBands {
    const frequencyData = this.getFrequencyData();
    const sampleRate = this.audioContext.sampleRate;
    return this.frequencyAnalyzer.analyze(frequencyData, sampleRate);
  }

  public isPlaying(): boolean {
    if (this.audioElement && !this.isUsingFallback) {
      return !this.audioElement.paused;
    }
    return this.isUsingFallback; // Oscillator is always "playing"
  }

  public getCurrentTime(): number {
    if (this.audioElement && !this.isUsingFallback) {
      return this.audioElement.currentTime;
    }
    return 0; // Oscillator doesn't have a time concept
  }

  public getDuration(): number {
    if (this.audioElement && !this.isUsingFallback) {
      const duration = this.audioElement.duration;
      if (isFinite(duration) && duration > 0) {
        return duration;
      }
    }
    return 0; // Oscillator doesn't have a duration or duration not loaded yet
  }

  public seekTo(time: number): void {
    if (this.audioElement && !this.isUsingFallback) {
      this.audioElement.currentTime = Math.max(0, Math.min(time, this.getDuration()));
    }
  }

  public dispose(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = null;
    }
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
