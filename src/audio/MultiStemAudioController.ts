import { FrequencyAnalyzer, type FrequencyBands } from './FrequencyAnalyzer';
import { STEMS } from './playlist';

export interface StemData {
  frequencyBands: FrequencyBands;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  volume: number;
}

export class MultiStemAudioController {
  private audioContext: AudioContext;
  
  // Main audible track
  private mainAudio: HTMLAudioElement | null = null;
  private mainSource: MediaElementAudioSourceNode | null = null;
  private mainAnalyser: AnalyserNode;
  
  // Stem tracks (silent)
  private stemAudios: Map<string, HTMLAudioElement> = new Map();
  private stemSources: Map<string, MediaElementAudioSourceNode> = new Map();
  private stemAnalysers: Map<string, AnalyserNode> = new Map();
  private stemAnalyzers: Map<string, FrequencyAnalyzer> = new Map();
  
  // Data arrays
  private mainFrequencyData: Uint8Array;
  private stemFrequencyData: Map<string, Uint8Array> = new Map();
  private stemTimeDomainData: Map<string, Uint8Array> = new Map();
  
  // Callbacks
  private onTrackChangeCallback?: (trackName: string) => void;
  private onDurationChangeCallback?: (duration: number) => void;
  
  // Sync management
  private syncInterval: number | null = null;
  private readonly SYNC_INTERVAL_MS = 100; // Sync every 100ms to prevent drift
  private lastSyncRun: number = 0;

  // Resolved when all stems are loaded; play() awaits this so SERUM_3 etc. are in stemAudios before we start
  private loadPromise: Promise<void>;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Setup main analyser
      this.mainAnalyser = this.audioContext.createAnalyser();
      this.mainAnalyser.fftSize = 2048;
      this.mainAnalyser.smoothingTimeConstant = 0.8;
    
    const bufferLength = this.mainAnalyser.frequencyBinCount;
    this.mainFrequencyData = new Uint8Array(bufferLength);
    
    // Setup stem analysers
    const stemNames = ['SYNTH', 'VOCALS', 'DRUMS', 'BASS', 'AUX_FX', 'SERUM_1', 'SERUM_3'];
    stemNames.forEach(stemName => {
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      
      const stemBufferLength = analyser.frequencyBinCount;
      this.stemAnalysers.set(stemName, analyser);
      this.stemFrequencyData.set(stemName, new Uint8Array(stemBufferLength));
      this.stemTimeDomainData.set(stemName, new Uint8Array(stemBufferLength));
      this.stemAnalyzers.set(stemName, new FrequencyAnalyzer());
    });
    
    // Also create analyzer for main track
    this.stemAnalyzers.set('MAIN', new FrequencyAnalyzer());
    
    this.loadPromise = this.loadAllStems();
    } catch (error) {
      throw error;
    }
  }

  /** Resolves when all stems are loaded. Use before play() to avoid orbit/Serum3 not starting. */
  public whenReady(): Promise<void> {
    return this.loadPromise;
  }

  private async loadAllStems(): Promise<void> {
    // Load main track (audible); encode path to handle spaces in filenames
    try {
      this.mainAudio = new Audio(encodeURI(STEMS.MAIN));
      this.mainAudio.crossOrigin = 'anonymous';
      this.mainAudio.loop = false;
      
      this.mainAudio.onloadedmetadata = () => {
        this.onDurationChangeCallback?.(this.mainAudio?.duration || 0);
      };
      
      this.mainAudio.onerror = (e) => {
        console.error('Main audio load error:', e, STEMS.MAIN);
      };
      
      this.mainSource = this.audioContext.createMediaElementSource(this.mainAudio);
      this.mainSource.connect(this.mainAnalyser);
      this.mainAnalyser.connect(this.audioContext.destination); // Audible
      
      this.onTrackChangeCallback?.(this.getCurrentTrackName());
    } catch (error) {
      console.error('Error loading main audio:', error);
    }
    
    // Load stem tracks (silent) in parallel so SERUM_3 etc. don't wait for others
    const stemNames = ['SYNTH', 'VOCALS', 'DRUMS', 'BASS', 'AUX_FX', 'SERUM_1', 'SERUM_3'];
    const STEM_LOAD_TIMEOUT_MS = 10_000; // 10s per attempt; canplay is enough for analysis (faster than canplaythrough)
    const STEM_LOAD_MAX_ATTEMPTS = 3; // Retry up to 2 extra times if a stem times out with readyState < 2

    const loadStem = async (stemName: string): Promise<void> => {
      const audioPath = STEMS[stemName as keyof typeof STEMS];
      // Encode path (handles spaces in e.g. "Serum 1.mp3") to avoid load failures in some browsers
      const encodedPath = encodeURI(audioPath);

      const analyser = this.stemAnalysers.get(stemName);
      if (!analyser) {
        throw new Error(`No analyser found for ${stemName}`);
      }

      const buildGraph = (a: HTMLAudioElement) => {
        const src = this.audioContext.createMediaElementSource(a);
        src.connect(analyser);
        const silentGain = this.audioContext.createGain();
        silentGain.gain.value = 0;
        analyser.connect(silentGain);
        silentGain.connect(this.audioContext.destination);
        this.stemAudios.set(stemName, a);
        this.stemSources.set(stemName, src);
      };

      for (let attempt = 1; attempt <= STEM_LOAD_MAX_ATTEMPTS; attempt++) {

        const a = new Audio(encodedPath);
        a.crossOrigin = 'anonymous';
        a.loop = false;
        a.preload = 'auto';

        a.onerror = (e) => {
          console.error(`${stemName} audio load error:`, e, audioPath);
        };

        // Wait for canplay or timeout
        const timedOut = await new Promise<boolean>((resolve, reject) => {
          const onReady = () => {
            clearTimeout(timeoutId);
            resolve(false);
          };
          a.oncanplay = onReady;
          a.onerror = (e) => {
            clearTimeout(timeoutId);
            reject(e);
          };

          const timeoutId = setTimeout(() => {
            const notReady = a.readyState < 2;
            resolve(notReady);
          }, STEM_LOAD_TIMEOUT_MS);
        }).catch(() => true); // on error, treat as need retry

        if (!timedOut) {
          buildGraph(a);
          return;
        }

        if (attempt === STEM_LOAD_MAX_ATTEMPTS) {
          buildGraph(a);
          return;
        }
        // Retry: discard this Audio and try again with a fresh element
      }
    };

    try {
      await Promise.all(
        stemNames.map((stemName) =>
          loadStem(stemName).catch(() => {
            return Promise.resolve(); // Continue even if one stem fails
          })
        )
      );
    } catch (error) {
      throw error;
    }
  }

  public async play(): Promise<void> {
    // Ensure all stems (including SERUM_3) are loaded before we play; otherwise stems that
    // load after this forEach are never started and particle orbit / Serum-3 reactivity stays off.
    await this.loadPromise;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Get current time to sync all tracks
    const currentTime = this.getCurrentTime();
    
    // Sync all tracks to the same time first
    if (this.mainAudio) {
      this.mainAudio.currentTime = currentTime;
    }
    this.stemAudios.forEach((audio) => {
      if (audio) {
        audio.currentTime = currentTime;
      }
    });
    
    // Play all tracks simultaneously
    const playPromises: Promise<void>[] = [];
    
    if (this.mainAudio) {
      const mainPlay = this.mainAudio.play().catch(() => {
        // Error handling
      });
      playPromises.push(mainPlay);
    }
    
    // Play all stems - ensure they're loaded first
    this.stemAudios.forEach((audio, stemName) => {
      // Check if audio is ready
      if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        const playPromise = audio.play().catch(() => {
          // Error handling
        });
        playPromises.push(playPromise);
      } else {
        // Wait for audio to be ready, then play. Cap wait so a stem that never loads doesn't block the visualizer.
        const STEM_WAIT_TIMEOUT_MS = 8_000;
        const waitAndPlay = new Promise<void>((resolve) => {
          const start = Date.now();
          const checkReady = () => {
            if (audio.readyState >= 2) {
              audio.currentTime = currentTime;
              audio.play()
                .then(() => {
                  resolve();
                })
                .catch(() => {
                  resolve();
                });
              return;
            }
            if (Date.now() - start >= STEM_WAIT_TIMEOUT_MS) {
              resolve();
              return;
            }
            setTimeout(checkReady, 100);
          };
          audio.addEventListener('canplay', checkReady, { once: true });
          checkReady();
        });
        playPromises.push(waitAndPlay);
      }
    });
    
    await Promise.allSettled(playPromises);
    
    // Start periodic sync to prevent drift
    this.startSyncInterval();
  }
  
  private startSyncInterval(): void {
    this.stopSyncInterval();
    this.syncInterval = window.setInterval(() => {
      this.lastSyncRun = performance.now();
      this.syncAllStems();
    }, this.SYNC_INTERVAL_MS);
  }
  
  private stopSyncInterval(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  private syncAllStems(): void {
    // Only sync if main audio is playing
    if (!this.mainAudio || this.mainAudio.paused) {
      return;
    }
    
    const mainTime = this.mainAudio.currentTime;
    const syncThreshold = 0.05; // 50ms threshold
    
    // Sync all stems to main audio time if they drift
    this.stemAudios.forEach((audio) => {
      if (audio && !audio.paused) {
        const timeDiff = Math.abs(audio.currentTime - mainTime);
        if (timeDiff > syncThreshold) {
          audio.currentTime = mainTime;
        }
      }
    });
  }

  public pause(): void {
    if (this.mainAudio) {
      this.mainAudio.pause();
    }
    this.stemAudios.forEach(audio => audio.pause());
    
    // Stop sync interval when paused
    this.stopSyncInterval();
  }

  public seekTo(time: number): void {
    // Sync all tracks to the same time (whether playing or paused)
    if (this.mainAudio) {
      this.mainAudio.currentTime = time;
    }
    this.stemAudios.forEach((audio) => {
      if (audio) {
        audio.currentTime = time;
      }
    });
  }

  public getCurrentTime(): number {
    return this.mainAudio?.currentTime || 0;
  }

  public getDuration(): number {
    return this.mainAudio?.duration || 0;
  }

  public getCurrentTrackName(): string {
    return 'HOLD ME (Palomar Remix)';
  }

  public getMainFrequencyBands(): FrequencyBands {
    if (!this.mainAnalyser) {
      return {
        bass: 0, mid: 0, treble: 0, overall: 0,
        bassRaw: [], midRaw: [], trebleRaw: [],
        kick: 0, snare: 0, hihat: 0, transient: 0
      };
    }
    
    this.mainAnalyser.getByteFrequencyData(this.mainFrequencyData as any);
    const sampleRate = this.audioContext.sampleRate;
    const freqArray = new Uint8Array(this.mainFrequencyData.length);
    freqArray.set(this.mainFrequencyData);
    
    const analyzer = this.stemAnalyzers.get('MAIN');
    if (!analyzer) {
      return {
        bass: 0, mid: 0, treble: 0, overall: 0,
        bassRaw: [], midRaw: [], trebleRaw: [],
        kick: 0, snare: 0, hihat: 0, transient: 0
      };
    }
    
    return analyzer.analyze(freqArray, sampleRate);
  }

  public getStemData(stemName: string): StemData | null {
    const analyser = this.stemAnalysers.get(stemName);
    const analyzer = this.stemAnalyzers.get(stemName);
    const frequencyData = this.stemFrequencyData.get(stemName);
    const timeDomainData = this.stemTimeDomainData.get(stemName);
    const audio = this.stemAudios.get(stemName);
    
    if (!analyser || !analyzer || !frequencyData || !timeDomainData) {
      return null;
    }
    
    // Ensure audio context is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(err => console.error('Failed to resume audio context:', err));
    }
    
    // Check if audio is actually playing
    if (!audio || audio.paused || audio.ended) {
      // Audio not playing, return zeros
      return {
        frequencyBands: {
          bass: 0, mid: 0, treble: 0, overall: 0,
          bassRaw: [], midRaw: [], trebleRaw: [],
          kick: 0, snare: 0, hihat: 0, transient: 0
        },
        frequencyData: new Uint8Array(frequencyData.length),
        timeDomainData: new Uint8Array(timeDomainData.length),
        volume: 0
      };
    }
    
    // Get data from analyser
    analyser.getByteFrequencyData(frequencyData as any);
    analyser.getByteTimeDomainData(timeDomainData as any);
    
    // Create new arrays to avoid type issues
    const freqArray = new Uint8Array(frequencyData.length);
    const timeArray = new Uint8Array(timeDomainData.length);
    freqArray.set(frequencyData);
    timeArray.set(timeDomainData);
    
    // Debug: Check if we're getting any data (only log if no data and audio is playing)
    const maxFreq = Math.max(...freqArray);
    const avgFreq = freqArray.reduce((a, b) => a + b, 0) / freqArray.length;
    
    // Log warning if analyser has no data but audio is playing. Can occur under power saver
    // when the browser throttles the media-element → Web Audio pipeline.
    if (maxFreq === 0 && !audio.paused && !audio.ended && audio.readyState >= 2) {
      const now = Date.now();
      const lastLog = (window as any)[`lastStemWarning_${stemName}`] || 0;
      if (now - lastLog > 5000) {
        console.warn(
          `[Stem:${stemName}] analyser has no data (can occur under power saver when media pipeline is throttled) - maxFreq: ${maxFreq}, avgFreq: ${avgFreq.toFixed(2)}, readyState: ${audio.readyState}, currentTime: ${audio.currentTime.toFixed(2)}, contextState: ${this.audioContext.state}`
        );
        (window as any)[`lastStemWarning_${stemName}`] = now;
      }
    }
    
    const sampleRate = this.audioContext.sampleRate;
    const frequencyBands = analyzer.analyze(freqArray, sampleRate);
    
    // Calculate volume from time domain
    let sum = 0;
    for (let i = 0; i < timeArray.length; i++) {
      const normalized = (timeArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const volume = Math.sqrt(sum / timeArray.length);
    
    return {
      frequencyBands,
      frequencyData: freqArray,
      timeDomainData: timeArray,
      volume: Math.min(1, volume)
    };
  }

  public getAllStemData(): Map<string, StemData> {
    const result = new Map<string, StemData>();
    
    // Add main track data
    if (this.mainAnalyser) {
      const mainBands = this.getMainFrequencyBands();
      const mainTimeData = new Uint8Array(this.mainAnalyser.frequencyBinCount);
      this.mainAnalyser.getByteTimeDomainData(mainTimeData as any);
      
      let sum = 0;
      for (let i = 0; i < mainTimeData.length; i++) {
        const normalized = (mainTimeData[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const volume = Math.sqrt(sum / mainTimeData.length);
      
      const mainFreqData = new Uint8Array(this.mainFrequencyData.length);
      mainFreqData.set(this.mainFrequencyData);
      
      result.set('MAIN', {
        frequencyBands: mainBands,
        frequencyData: mainFreqData,
        timeDomainData: mainTimeData,
        volume: Math.min(1, volume)
      });
    }
    
    // Add stem data
    const stemNames = ['SYNTH', 'VOCALS', 'DRUMS', 'BASS', 'AUX_FX', 'SERUM_1', 'SERUM_3'];
    stemNames.forEach(stemName => {
      const data = this.getStemData(stemName);
      if (data) {
        result.set(stemName, data);
      }
    });
    
    return result;
  }

  public setOnTrackChange(callback: (trackName: string) => void): void {
    this.onTrackChangeCallback = callback;
  }

  public setOnDurationChange(callback: (duration: number) => void): void {
    this.onDurationChangeCallback = callback;
  }


  public dispose(): void {
    // Stop sync interval
    this.stopSyncInterval();
    
    if (this.mainAudio) {
      this.mainAudio.pause();
      this.mainAudio.src = '';
      this.mainAudio = null;
    }
    
    if (this.mainSource) {
      this.mainSource.disconnect();
      this.mainSource = null;
    }
    
    this.stemAudios.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.stemAudios.clear();
    
    this.stemSources.forEach(source => {
      source.disconnect();
    });
    this.stemSources.clear();
    
    this.audioContext.close();
  }
}

