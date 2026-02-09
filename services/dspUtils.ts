
import { ModulationType, NoiseType, ChannelType, WaveformType, SignalParams, SignalData, SignalFeatures, PowerMetrics } from '../types.ts';

/**
 * Basic FFT implementation (Cooley-Tukey)
 */
function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + len / 2] * wRe - im[i + j + len / 2] * wIm;
        const vIm = re[i + j + len / 2] * wIm + im[i + j + len / 2] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + len / 2] = uRe - vRe;
        im[i + j + len / 2] = uIm - vIm;
        const tmpRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = tmpRe;
      }
    }
  }
}

export function computeFFT(signal: number[], sampleRate: number): { freq: number[], mag: number[] } {
  const N = 1024;
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  
  // Fill with signal and window
  for (let i = 0; i < N; i++) {
    if (i < signal.length) {
      // Hamming window
      const win = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
      re[i] = signal[i] * win;
    }
  }

  fft(re, im);

  const freq = [];
  const mag = [];
  const df = sampleRate / N;

  // Only return positive frequencies (up to Nyquist)
  for (let i = 0; i < N / 2; i++) {
    freq.push(i * df);
    // Convert to dB scale
    const m = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / (N / 2);
    mag.push(20 * Math.log10(Math.max(m, 1e-6)));
  }

  return { freq, mag };
}

export function downsample(data: any[], targetPoints: number): any[] {
  if (!data || data.length <= targetPoints) return data;
  const sampled: any[] = [];
  const step = data.length / targetPoints;
  for (let i = 0; i < targetPoints; i++) {
    const index = Math.floor(i * step);
    if (index < data.length) {
      sampled.push(data[index]);
    }
  }
  return sampled;
}

export const randomGaussian = (): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export function processAudioWithNoise(input: Float32Array, snrDb: number): Float32Array {
  const output = new Float32Array(input.length);
  let sigPower = 0;
  for (let i = 0; i < input.length; i++) sigPower += input[i] * input[i];
  sigPower /= (input.length || 1);
  const noisePower = sigPower / Math.pow(10, snrDb / 10);
  const noiseStd = Math.sqrt(noisePower);
  for (let i = 0; i < input.length; i++) {
    output[i] = Math.max(-1, Math.min(1, input[i] + randomGaussian() * noiseStd));
  }
  return output;
}

export function applyMovingAverage(data: number[] | Float32Array, windowSize: number = 5): number[] {
  const result = new Array(data.length).fill(0);
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < data.length; i++) {
    let sum = 0, count = 0;
    for (let j = -half; j <= half; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < data.length) {
        sum += data[idx];
        count++;
      }
    }
    result[i] = sum / (count || 1);
  }
  return result;
}

export function applyMedianFilter(data: number[] | Float32Array, windowSize: number = 3): number[] {
  const result = new Array(data.length).fill(0);
  const half = Math.floor(windowSize / 2);
  for (let i = 0; i < data.length; i++) {
    const window = [];
    for (let j = -half; j <= half; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < data.length) window.push(data[idx]);
    }
    window.sort((a, b) => a - b);
    result[i] = window[Math.floor(window.length / 2)];
  }
  return result;
}

function getWaveformValue(type: WaveformType, freq: number, amp: number, t: number): number {
  const phi = 2 * Math.PI * freq * t;
  const normalizedT = (t * freq) % 1; 
  
  switch (type) {
    case WaveformType.SINE: 
      return amp * Math.sin(phi);
    case WaveformType.SQUARE: 
      return amp * (Math.sin(phi) >= 0 ? 1 : -1);
    case WaveformType.TRIANGLE: 
      return amp * (2 / Math.PI) * Math.asin(Math.sin(phi));
    case WaveformType.SAWTOOTH:
      return amp * (2 * normalizedT - 1);
    case WaveformType.PULSE:
      return amp * (normalizedT < 0.15 ? 1 : -1); 
    case WaveformType.SINC:
      const period = 1 / freq;
      const x = 12 * Math.PI * freq * ((t % period) - period/2);
      return amp * (Math.abs(x) < 1e-9 ? 1 : Math.sin(x)/x);
    case WaveformType.RANDOM: 
      return amp * (Math.random() * 2 - 1);
    default: 
      return amp * Math.sin(phi);
  }
}

export function generateSignalData(params: SignalParams): SignalData {
  const { modulation, snrDb, carrierFreq, carrierAmp, carrierWaveform, sampleRate, duration, messageFreq, messageAmp, messageWaveform, distanceKm } = params;
  const numSamples = Math.floor(sampleRate * duration);
  const dt = 1 / sampleRate;
  const time = new Float32Array(numSamples);
  const originalMessage = new Float32Array(numSamples);
  const carrierWave = new Float32Array(numSamples);
  const transmittedSignal = new Float32Array(numSamples);
  const receivedSignal = new Float32Array(numSamples);
  const rawI = new Float32Array(numSamples);
  const rawQ = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i * dt;
    time[i] = t;
    carrierWave[i] = getWaveformValue(carrierWaveform || WaveformType.SINE, carrierFreq, carrierAmp, t);
    originalMessage[i] = getWaveformValue(messageWaveform, messageFreq, messageAmp, t);
  }

  const fc = carrierFreq;
  const Ac = carrierAmp;
  for (let i = 0; i < numSamples; i++) {
    const t = time[i];
    const m = originalMessage[i];
    const carVal = carrierWave[i];
    const cosVal = Math.cos(2 * Math.PI * fc * t);
    const sinVal = Math.sin(2 * Math.PI * fc * t);

    switch (modulation) {
      case ModulationType.AM: 
        transmittedSignal[i] = (Ac + m) * (carVal / (Ac || 1)); 
        break;
      case ModulationType.FM: 
        const kf = 2 * Math.PI * (carrierFreq * 0.4);
        const phase = 2 * Math.PI * fc * t + kf * (m / messageFreq) * Math.sin(2 * Math.PI * messageFreq * t);
        transmittedSignal[i] = getWaveformValue(carrierWaveform || WaveformType.SINE, 1, Ac, phase / (2 * Math.PI));
        break;
      case ModulationType.PM: 
        const phasePM = 2 * Math.PI * fc * t + (Math.PI/2) * (m / (messageAmp || 1));
        transmittedSignal[i] = getWaveformValue(carrierWaveform || WaveformType.SINE, 1, Ac, phasePM / (2 * Math.PI));
        break;
      case ModulationType.BPSK: 
        transmittedSignal[i] = (m >= 0 ? 1 : -1) * carVal; 
        break;
      case ModulationType.QAM16:
        const iLev = Math.sign(m) * (Math.abs(m) > 0.5 * messageAmp ? 3 : 1);
        const qLev = Math.sign(Math.sin(2*Math.PI*messageFreq*t)) * (Math.abs(Math.sin(2*Math.PI*messageFreq*t)) > 0.5 ? 3 : 1);
        transmittedSignal[i] = (Ac/3) * (iLev * cosVal - qLev * sinVal);
        break;
    }
  }

  const distanceRef = 0.1; 
  const distanceSafe = Math.max(distanceRef, distanceKm);
  const pathLossFactor = 1 / Math.pow(distanceSafe / distanceRef, 1);
  const pathLossDb = 20 * Math.log10(distanceSafe / distanceRef);

  const txPower = (Ac * Ac) / 2;
  const rxPower = txPower * (pathLossFactor * pathLossFactor);
  const noisePower = rxPower / Math.pow(10, snrDb / 10);
  const noiseStd = Math.sqrt(noisePower);

  for (let i = 0; i < numSamples; i++) {
    const t = time[i];
    receivedSignal[i] = (transmittedSignal[i] * pathLossFactor) + randomGaussian() * noiseStd;
    rawI[i] = receivedSignal[i] * Math.cos(2 * Math.PI * fc * t) * 2;
    rawQ[i] = receivedSignal[i] * -Math.sin(2 * Math.PI * fc * t) * 2;
  }

  const filterSize = [ModulationType.AM, ModulationType.FM, ModulationType.PM].includes(modulation) ? 45 : 12;
  const filteredI = applyMovingAverage(rawI, filterSize);
  const filteredQ = applyMovingAverage(rawQ, filterSize);

  return {
    time: Array.from(time),
    originalMessage: Array.from(originalMessage),
    carrierWave: Array.from(carrierWave),
    transmittedSignal: Array.from(transmittedSignal),
    receivedSignal: Array.from(receivedSignal),
    receivedI: filteredI,
    receivedQ: filteredQ,
    denoisedSignal: Array.from(receivedSignal),
    demodulatedSignal: new Array(numSamples).fill(0),
    powerMetrics: { 
      signalPower: rxPower, 
      noisePower: noisePower, 
      totalPower: rxPower + noisePower, 
      measuredSNR: snrDb, 
      paprDb: 3,
      sourcePowerWatts: txPower,
      receivedPowerWatts: rxPower,
      pathLossDb: pathLossDb
    }
  };
}

export function demodulateSignal(received: number[], modulation: ModulationType, carrierFreq: number, sampleRate: number): number[] {
  const n = received.length;
  let demod = new Array(n).fill(0);
  
  if (modulation === ModulationType.AM) {
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const env = Math.abs(received[i]);
      demod[i] = prev * 0.9 + env * 0.1;
      prev = demod[i];
    }
    const avg = demod.reduce((a, b) => a + b, 0) / n;
    demod = demod.map(v => (v - avg));
    
    // Normalize amplitude to match standard message range
    const maxVal = Math.max(...demod.map(Math.abs)) || 1;
    return demod.map(v => v * (1.0 / maxVal));
    
  } else if (modulation === ModulationType.FM) {
    for (let i = 1; i < n; i++) {
      demod[i] = (received[i] - received[i-1]);
    }
    const avg = demod.reduce((a, b) => a + b, 0) / n;
    demod = demod.map(v => (v - avg));
    
    // Normalize amplitude
    const maxVal = Math.max(...demod.map(Math.abs)) || 1;
    return demod.map(v => v * (1.0 / maxVal));
  } else if (modulation === ModulationType.BPSK) {
    // Basic BPSK hard decision for simulation
    return received.map(v => v > 0 ? 1 : -1);
  }
  
  return demod;
}

export function calculateFeatures(data: number[], sampleRate: number): SignalFeatures {
  const n = data.length;
  const mean = data.reduce((a,b) => a+b, 0) / n;
  const variance = data.reduce((a,b) => a + (b-mean)**2, 0) / n;
  const std = Math.sqrt(variance) || 1e-6;
  const skewness = data.reduce((a,b) => a + ((b-mean)/std)**3, 0) / n;
  const kurtosis = data.reduce((a,b) => a + ((b-mean)/std)**4, 0) / n;
  
  let zc = 0;
  for (let i = 1; i < n; i++) {
    if ((data[i] >= 0 && data[i-1] < 0) || (data[i] < 0 && data[i-1] >= 0)) zc++;
  }

  return { 
    variance, 
    skewness, 
    kurtosis, 
    snrEstimate: 10 * Math.log10(1/(variance || 1e-12)), 
    spectralFlatness: 0.5, 
    peakFrequency: 20000, 
    zeroCrossingRate: zc / n 
  };
}
