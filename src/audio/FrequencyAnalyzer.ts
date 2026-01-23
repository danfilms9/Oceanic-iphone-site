export interface FrequencyBands {
  bass: number;      // 20-250 Hz (average amplitude 0-1)
  mid: number;       // 250-4000 Hz
  treble: number;    // 4000-20000 Hz
  overall: number;   // Total energy level
  bassRaw: number[]; // Raw FFT data for bass range
  midRaw: number[];  // Raw FFT data for mid range
  trebleRaw: number[]; // Raw FFT data for treble range
  // Percussion detection
  kick: number;      // Kick drum detection (0-1)
  snare: number;     // Snare drum detection (0-1)
  hihat: number;     // Hi-hat detection (0-1)
  transient: number; // General transient/onset detection (0-1)
}

export class FrequencyAnalyzer {
  private smoothingFactor = 0.5; // Increased for less jitter
  private smoothedBass = 0;
  private smoothedMid = 0;
  private smoothedTreble = 0;
  private smoothedOverall = 0;
  
  // Improved detection using spectral flux and peak detection
  private previousSpectrum: number[] = [];
  private kickHistory: number[] = [];
  private snareHistory: number[] = [];
  private hihatHistory: number[] = [];
  private transientHistory: number[] = [];
  // Current values for decay
  private currentKickValue = 0;
  private currentSnareValue = 0;
  private currentHihatValue = 0;
  private currentTransientValue = 0;

  public analyze(frequencyData: Uint8Array | Uint8Array<ArrayBufferLike>, sampleRate: number): FrequencyBands {
    // FFT size is typically 2048, giving us 1024 frequency bins
    // Each bin represents sampleRate / (2 * fftSize) Hz
    const binSize = sampleRate / (2 * frequencyData.length);
    
    // Frequency ranges (approximate bin indices for 44.1kHz sample rate)
    // Bass: 20-250 Hz ≈ bins 0-20
    // Mid: 250-4000 Hz ≈ bins 21-150
    // Treble: 4000-20000 Hz ≈ bins 151-512
    
    const bassStart = 0;
    const bassEnd = Math.floor(250 / binSize);
    const midStart = bassEnd + 1;
    const midEnd = Math.floor(4000 / binSize);
    const trebleStart = midEnd + 1;
    const trebleEnd = Math.min(frequencyData.length - 1, Math.floor(20000 / binSize));

    // Extract raw data
    const bassRaw: number[] = [];
    const midRaw: number[] = [];
    const trebleRaw: number[] = [];

    for (let i = bassStart; i <= bassEnd && i < frequencyData.length; i++) {
      bassRaw.push(frequencyData[i]);
    }

    for (let i = midStart; i <= midEnd && i < frequencyData.length; i++) {
      midRaw.push(frequencyData[i]);
    }

    for (let i = trebleStart; i <= trebleEnd && i < frequencyData.length; i++) {
      trebleRaw.push(frequencyData[i]);
    }

    // Calculate average amplitude for each band (0-255 → 0-1)
    const bassAvg = bassRaw.length > 0
      ? bassRaw.reduce((sum, val) => sum + val, 0) / bassRaw.length / 255
      : 0;
    const midAvg = midRaw.length > 0
      ? midRaw.reduce((sum, val) => sum + val, 0) / midRaw.length / 255
      : 0;
    const trebleAvg = trebleRaw.length > 0
      ? trebleRaw.reduce((sum, val) => sum + val, 0) / trebleRaw.length / 255
      : 0;

    // Apply exponential moving average smoothing
    this.smoothedBass = this.smoothedBass * (1 - this.smoothingFactor) + bassAvg * this.smoothingFactor;
    this.smoothedMid = this.smoothedMid * (1 - this.smoothingFactor) + midAvg * this.smoothingFactor;
    this.smoothedTreble = this.smoothedTreble * (1 - this.smoothingFactor) + trebleAvg * this.smoothingFactor;

    // Calculate overall energy (weighted average)
    const overall = this.smoothedBass * 0.4 + this.smoothedMid * 0.4 + this.smoothedTreble * 0.2;
    this.smoothedOverall = this.smoothedOverall * (1 - this.smoothingFactor) + overall * this.smoothingFactor;

    // Apply compression curve: makes quiet sounds more visible, loud sounds less jarring
    // Uses a power curve: y = x^0.7 (compresses high values, expands low values)
    const compress = (value: number): number => {
      if (value <= 0) return 0;
      // Apply power curve for compression
      const compressed = Math.pow(value, 0.7);
      // Add minimum threshold to make quiet sounds visible
      const threshold = 0.1;
      const expanded = compressed * (1 - threshold) + threshold;
      // Normalize back to 0-1 range
      return Math.min(1, expanded / (1 + threshold));
    };

    // Convert frequency data to normalized array for spectral flux
    const currentSpectrum: number[] = [];
    for (let i = 0; i < frequencyData.length; i++) {
      currentSpectrum.push(frequencyData[i] / 255);
    }

    // Calculate spectral flux (change in frequency content) - better for onset detection
    let spectralFlux = 0;
    if (this.previousSpectrum.length === currentSpectrum.length) {
      for (let i = 0; i < currentSpectrum.length; i++) {
        const diff = currentSpectrum[i] - this.previousSpectrum[i];
        if (diff > 0) {
          spectralFlux += diff; // Only count increases
        }
      }
      spectralFlux /= currentSpectrum.length; // Normalize
    }
    this.previousSpectrum = [...currentSpectrum];

    // Detect KICK using spectral flux in low frequencies (20-80 Hz)
    const kickStart = 0;
    const kickEnd = Math.floor(80 / binSize);
    const kickBins = frequencyData.slice(kickStart, Math.min(kickEnd, frequencyData.length));
    const kickEnergy = kickBins.length > 0
      ? kickBins.reduce((sum, val) => sum + val, 0) / kickBins.length / 255
      : 0;
    
    // Calculate kick spectral flux (change in low frequencies)
    let kickFlux = 0;
    if (this.previousSpectrum.length === currentSpectrum.length && this.previousSpectrum.length > kickEnd) {
      for (let i = kickStart; i < kickEnd && i < this.previousSpectrum.length; i++) {
        const diff = currentSpectrum[i] - this.previousSpectrum[i];
        if (diff > 0) {
          kickFlux += diff;
        }
      }
      if (kickEnd > kickStart) {
        kickFlux /= (kickEnd - kickStart);
      }
    }
    
    // Detect SNARE using spectral flux in mid-high frequencies (200-600 Hz + 3000-8000 Hz)
    const snareLowStart = Math.floor(200 / binSize);
    const snareLowEnd = Math.floor(600 / binSize);
    const snareHighStart = Math.floor(3000 / binSize);
    const snareHighEnd = Math.floor(8000 / binSize);
    const snareLowBins = frequencyData.slice(snareLowStart, Math.min(snareLowEnd, frequencyData.length));
    const snareHighBins = frequencyData.slice(snareHighStart, Math.min(snareHighEnd, frequencyData.length));
    const snareLowEnergy = snareLowBins.length > 0
      ? snareLowBins.reduce((sum, val) => sum + val, 0) / snareLowBins.length / 255
      : 0;
    const snareHighEnergy = snareHighBins.length > 0
      ? snareHighBins.reduce((sum, val) => sum + val, 0) / snareHighBins.length / 255
      : 0;
    const snareEnergy = (snareLowEnergy * 0.6 + snareHighEnergy * 0.4);
    
    // Calculate snare spectral flux
    let snareFlux = 0;
    if (this.previousSpectrum.length === currentSpectrum.length && this.previousSpectrum.length > snareHighEnd) {
      let lowFlux = 0;
      let highFlux = 0;
      for (let i = snareLowStart; i < snareLowEnd && i < this.previousSpectrum.length; i++) {
        const diff = currentSpectrum[i] - this.previousSpectrum[i];
        if (diff > 0) lowFlux += diff;
      }
      for (let i = snareHighStart; i < snareHighEnd && i < this.previousSpectrum.length; i++) {
        const diff = currentSpectrum[i] - this.previousSpectrum[i];
        if (diff > 0) highFlux += diff;
      }
      const lowCount = Math.max(1, snareLowEnd - snareLowStart);
      const highCount = Math.max(1, snareHighEnd - snareHighStart);
      snareFlux = (lowFlux / lowCount) * 0.6 + (highFlux / highCount) * 0.4;
    }

    // Detect HI-HAT using spectral flux in high frequencies (6000-14000 Hz)
    const hihatStart = Math.floor(6000 / binSize);
    const hihatEnd = Math.floor(14000 / binSize);
    const hihatBins = frequencyData.slice(hihatStart, Math.min(hihatEnd, frequencyData.length));
    const hihatEnergy = hihatBins.length > 0
      ? hihatBins.reduce((sum, val) => sum + val, 0) / hihatBins.length / 255
      : 0;
    
    // Calculate hi-hat spectral flux
    let hihatFlux = 0;
    if (this.previousSpectrum.length === currentSpectrum.length && this.previousSpectrum.length > hihatEnd) {
      for (let i = hihatStart; i < hihatEnd && i < this.previousSpectrum.length; i++) {
        const diff = currentSpectrum[i] - this.previousSpectrum[i];
        if (diff > 0) {
          hihatFlux += diff;
        }
      }
      if (hihatEnd > hihatStart) {
        hihatFlux /= (hihatEnd - hihatStart);
      }
    }

    // Transient detection using spectral flux (better than time domain)
    // Spectral flux detects changes in frequency content, which is better for musical onsets
    this.transientHistory.push(spectralFlux);
    if (this.transientHistory.length > 5) this.transientHistory.shift();
    const transientAvg = this.transientHistory.length > 0
      ? this.transientHistory.reduce((a, b) => a + b, 0) / this.transientHistory.length
      : 0;
    
    // Detect transient when spectral flux is significantly above average
    const transientDiff = spectralFlux - transientAvg;
    if (transientDiff > 0.02 && spectralFlux > 0.05) {
      this.currentTransientValue = Math.min(1, transientDiff * 10);
    } else {
      this.currentTransientValue = Math.max(0, this.currentTransientValue * 0.9);
    }
    const transient = this.currentTransientValue;

    // Detect kick using combination of energy and spectral flux
    this.kickHistory.push(kickEnergy);
    if (this.kickHistory.length > 8) this.kickHistory.shift();
    const kickAvg = this.kickHistory.length > 0 
      ? this.kickHistory.reduce((a, b) => a + b, 0) / this.kickHistory.length 
      : 0;
    
    // Use spectral flux as primary indicator, energy as secondary
    // Kick detection: high flux in low frequencies + energy spike
    // Split the difference - less sensitive
    const kickFluxThreshold = 0.0085; // Between 0.007 and 0.01
    const kickEnergySpike = (kickEnergy > kickAvg * 1.28 && kickEnergy > 0.13) || kickEnergy > 0.18;
    const kickFluxSpike = kickFlux > kickFluxThreshold;
    
    // Also check for peak in kick range (max value in kick bins)
    const kickPeak = kickBins.length > 0 ? Math.max(...kickBins) / 255 : 0;
    const hasKickPeak = kickPeak > 0.32;
    
    // Require flux OR peak, AND energy spike
    if ((kickFluxSpike || hasKickPeak) && kickEnergySpike) {
      // Combine flux and energy for detection strength
      const fluxComponent = kickFlux * 10;
      const energyComponent = Math.max(0, (kickEnergy - kickAvg)) * 3.5;
      const peakComponent = hasKickPeak ? 0.35 : 0;
      const detectionStrength = Math.min(1, fluxComponent + energyComponent + peakComponent);
      this.currentKickValue = detectionStrength;
    } else {
      // Decay value when not detected
      this.currentKickValue = Math.max(0, this.currentKickValue * 0.85);
    }
    const kickValue = this.currentKickValue;

    // Detect snare using spectral flux in mid-high frequencies
    this.snareHistory.push(snareEnergy);
    if (this.snareHistory.length > 8) this.snareHistory.shift();
    const snareAvg = this.snareHistory.length > 0
      ? this.snareHistory.reduce((a, b) => a + b, 0) / this.snareHistory.length
      : 0;
    
    // Snare detection: high flux in mid-high frequencies + energy spike
    const snareFluxThreshold = 0.007; // Between 0.006 and 0.008
    const snareEnergySpike = (snareEnergy > snareAvg * 1.27 && snareEnergy > 0.11) || snareEnergy > 0.15;
    const snareFluxSpike = snareFlux > snareFluxThreshold;
    
    // Check for peak in snare range
    const allSnareBins = [...snareLowBins, ...snareHighBins];
    const snarePeak = allSnareBins.length > 0 ? Math.max(...allSnareBins) / 255 : 0;
    const hasSnarePeak = snarePeak > 0.29;
    
    // Require flux OR peak, AND energy spike
    if ((snareFluxSpike || hasSnarePeak) && snareEnergySpike) {
      // Combine flux and energy
      const fluxComponent = snareFlux * 8;
      const energyComponent = Math.max(0, (snareEnergy - snareAvg)) * 4.5;
      const peakComponent = hasSnarePeak ? 0.3 : 0;
      const detectionStrength = Math.min(1, fluxComponent + energyComponent + peakComponent);
      this.currentSnareValue = detectionStrength;
    } else {
      // Decay value when not detected
      this.currentSnareValue = Math.max(0, this.currentSnareValue * 0.85);
    }
    const snareValue = this.currentSnareValue;

    // Detect hi-hat using spectral flux in high frequencies
    this.hihatHistory.push(hihatEnergy);
    if (this.hihatHistory.length > 8) this.hihatHistory.shift();
    const hihatAvg = this.hihatHistory.length > 0
      ? this.hihatHistory.reduce((a, b) => a + b, 0) / this.hihatHistory.length
      : 0;
    
    // Hi-hat detection: high flux in high frequencies + energy spike
    const hihatFluxThreshold = 0.0055; // Between 0.005 and 0.006
    const hihatEnergySpike = (hihatEnergy > hihatAvg * 1.22 && hihatEnergy > 0.09) || hihatEnergy > 0.12;
    const hihatFluxSpike = hihatFlux > hihatFluxThreshold;
    
    // Check for peak in hi-hat range
    const hihatPeak = hihatBins.length > 0 ? Math.max(...hihatBins) / 255 : 0;
    const hasHihatPeak = hihatPeak > 0.23;
    
    // Require flux OR peak, AND energy spike
    if ((hihatFluxSpike || hasHihatPeak) && hihatEnergySpike) {
      // Combine flux and energy
      const fluxComponent = hihatFlux * 7;
      const energyComponent = Math.max(0, (hihatEnergy - hihatAvg)) * 5.5;
      const peakComponent = hasHihatPeak ? 0.25 : 0;
      const detectionStrength = Math.min(1, fluxComponent + energyComponent + peakComponent);
      this.currentHihatValue = detectionStrength;
    } else {
      // Decay value when not detected
      this.currentHihatValue = Math.max(0, this.currentHihatValue * 0.85);
    }
    const hihatValue = this.currentHihatValue;

    return {
      bass: compress(this.smoothedBass),
      mid: compress(this.smoothedMid),
      treble: compress(this.smoothedTreble),
      overall: compress(this.smoothedOverall),
      bassRaw,
      midRaw,
      trebleRaw,
      kick: kickValue,
      snare: snareValue,
      hihat: hihatValue,
      transient: transient,
    };
  }
}

