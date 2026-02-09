
import { GoogleGenAI, Type } from "@google/genai";
import { SignalFeatures, AIAnalysisResult, SignalParams } from '../types.ts';

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const status = error?.status || (error?.message?.includes('429') ? 429 : 500);
      
      if (status === 429 || status >= 500) {
        if (i < maxRetries) {
          const backoffMultiplier = status === 429 ? 4 : 2;
          const delay = (initialDelay * Math.pow(backoffMultiplier, i)) + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
}

export async function analyzeSignalWithGemini(
  features: SignalFeatures, 
  params: SignalParams,
  language: 'en' | 'am' = 'en'
): Promise<AIAnalysisResult> {
  
  const fallback = (reason: string): AIAnalysisResult => ({
    classifiedModulation: params.modulation,
    confidence: 0.5,
    reasoning: reason,
    suggestedDenoisingMethod: features.snrEstimate < 10 ? "Median Filter" : "Moving Average",
    estimatedSNR: features.snrEstimate,
    spectralHealth: features.snrEstimate > 20 ? 'Excellent' : 'Degraded'
  });

  const apiKey = process.env.API_KEY;
  if (!apiKey) return fallback(language === 'am' ? "የኤፒአይ ቁልፍ የለም" : "API Key Missing");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Advanced Wireless Signal Intelligence Task:
    INPUT METRICS:
    - Modulation Target: ${params.modulation}
    - Carrier: ${params.carrierWaveform}
    - Variance: ${features.variance.toExponential(4)}
    - Kurtosis: ${features.kurtosis.toFixed(4)}
    - Local SNR Estimate: ${features.snrEstimate.toFixed(2)} dB

    TASKS:
    1. Identify if signal is stable or distorted.
    2. Spectral Health (Excellent, Good, Degraded, Critical).
    3. Suggest DSP strategy.
    
    IMPORTANT: Provide reasoning in ${language === 'am' ? 'Amharic' : 'English'}.
    Return strict JSON.
  `;

  try {
    return await retryWithBackoff(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              classifiedModulation: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              reasoning: { type: Type.STRING },
              suggestedDenoisingMethod: { type: Type.STRING },
              estimatedSNR: { type: Type.NUMBER },
              spectralHealth: { type: Type.STRING, enum: ['Excellent', 'Good', 'Degraded', 'Critical'] }
            },
            required: ["classifiedModulation", "confidence", "reasoning", "suggestedDenoisingMethod", "estimatedSNR", "spectralHealth"]
          }
        }
      });

      const text = response.text;
      if (text) return JSON.parse(text) as AIAnalysisResult;
      throw new Error("Empty Response");
    });
  } catch (error: any) {
    console.warn("Intelligence unit reporting network interference (XHR/RPC Error handled).");
    return fallback(language === 'am' ? "የሲስተም ግንኙነት ተቋርጧል።" : "Neural Link Interrupted (Local DSP active)");
  }
}

export async function explainSignalToBeginner(
  params: SignalParams,
  snr: number,
  health: string
): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Neural Tutor offline. Adjust parameters to see local DSP behavior.";

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    You are an expert Signal Processing teacher explaining to a 10-year-old.
    Explain what is happening in this wireless simulation using this structure:
    1. The Idea: Explain ${params.modulation} modulation as a way of "hiding a message inside a wave" (like changing a light's color to send a code).
    2. The Obstacle: Explain how ${params.distanceKm}km of distance and "Static/Noise" (SNR: ${snr}dB) are like wind blowing a sandcastle away.
    3. The Solution: Explain how the computer is "squinting" (Denoising) to find the original message.

    Use simple, exciting words. No math terms like "amplitude" or "frequency" unless you define them simply (e.g., 'Frequency is the speed of the wiggle').
    Keep it to one cohesive, friendly paragraph.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Your message is riding on a radio wave! It's battling static and distance, but our digital brain is working hard to clean it up and read it for you.";
  } catch (e) {
    return "Think of your signal as a faint shout across a very noisy room. The farther away you go (Distance), the harder it is to hear. Our computer uses special filters to 'listen' better and hear the hidden message!";
  }
}
