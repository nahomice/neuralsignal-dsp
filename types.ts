
export enum ModulationType {
  AM = 'AM',
  FM = 'FM',
  PM = 'PM',
  BPSK = 'BPSK',
  QAM16 = '16-QAM',
}

export enum NoiseType {
  AWGN = 'AWGN',
  IMPULSE = 'IMPULSE',
  SINE_INTERFERENCE = 'SINE_INTERFERENCE',
  MIXED = 'MIXED',
}

export enum ChannelType {
  LOS = 'Line of Sight (Ideal)',
  WALL = 'Through Wall (High Attenuation)',
  MULTIPATH = 'Urban Multipath (Echoes/Fading)',
}

export enum WaveformType {
  SINE = 'Sine',
  SQUARE = 'Square',
  TRIANGLE = 'Triangle',
  SAWTOOTH = 'Sawtooth',
  PULSE = 'Pulse',
  RANDOM = 'Random (Stochastic)',
  SINC = 'Sinc Pulse',
}

export interface SignalParams {
  // Source Message
  messageFreq: number;
  messageAmp: number;
  messageWaveform: WaveformType;

  // Transmitter / Carrier
  modulation: ModulationType;
  carrierFreq: number;
  carrierAmp: number;
  carrierWaveform: WaveformType;
  
  // Channel / Environment
  channelType: ChannelType;
  noiseType: NoiseType;
  snrDb: number;
  distanceKm: number; // Distance parameter
  
  // System
  sampleRate: number;
  duration: number; // in seconds
}

export interface PowerMetrics {
  signalPower: number;
  noisePower: number;
  totalPower: number;
  measuredSNR: number;
  paprDb: number; 
  sourcePowerWatts: number;
  receivedPowerWatts: number;
  pathLossDb: number;
}

export interface SignalData {
  time: number[];
  
  // 1. Source
  originalMessage: number[]; 
  
  // 1.5 Carrier
  carrierWave: number[];

  // 2. Modulated (Transmitted)
  transmittedSignal: number[]; 

  // 3. Received (Channel + Noise + Path Loss)
  receivedSignal: number[]; 
  receivedI: number[];
  receivedQ: number[];

  // 4. Processing
  denoisedSignal: number[];
  
  // 5. Output
  demodulatedSignal: number[]; 

  // 6. Metrics
  powerMetrics: PowerMetrics;
}

export interface SignalFeatures {
  variance: number;
  skewness: number;
  kurtosis: number;
  snrEstimate: number;
  spectralFlatness: number;
  peakFrequency: number;
  zeroCrossingRate: number;
}

export interface AIAnalysisResult {
  classifiedModulation: string;
  confidence: number;
  reasoning: string;
  suggestedDenoisingMethod: string;
  estimatedSNR: number;
  spectralHealth: 'Excellent' | 'Good' | 'Degraded' | 'Critical';
}
