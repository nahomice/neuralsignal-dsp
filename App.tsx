
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ModulationType, NoiseType, ChannelType, WaveformType, SignalParams, SignalData, AIAnalysisResult } from './types.ts';
import { generateSignalData, calculateFeatures, demodulateSignal, randomGaussian, applyMovingAverage, applyMedianFilter } from './services/dspUtils.ts';
import { analyzeSignalWithGemini, explainSignalToBeginner } from './services/geminiService.ts';
import ControlPanel from './components/ControlPanel.tsx';
import { TimeDomainChart, FrequencyDomainChart, DemodulationChart, PowerMetricChart, TransmittedSignalChart, CarrierWaveformChart, MessageSignalChart } from './components/SignalCharts.tsx';

type TabType = 'dashboard' | 'spectrum' | 'oscilloscope' | 'audio';
type Language = 'en' | 'am';

const TRANSLATIONS = {
  am: {
    title: "የሲግናል ምርምር ላቦራቶሪ",
    ready: "የሲስተም ዝግጁነት // ዝግጁ",
    analyzing: "የሞገዶች ትንታኔ በመካሄድ ላይ ነው...",
    throttled: "የሲስተም አቅም ተሟጧል // ትንሽ ይጠብቁ",
    unitTitle: "የሲግናል ብልህነት ክፍል",
    evaluating: "በመገምገም ላይ...",
    health: "ጤና",
    confidence: "እርግጠኝነት",
    placeholder: "የሲስተም ሁኔታዎችን በመቀየር የትንታኔ ውጤቶችን ይመልከቱ።",
    mode: "የሲስተም ሁኔታ",
    tabs: { 
      dashboard: "ዋና ዳሽቦርድ", 
      spectrum: "የሞገድ መጠን", 
      oscilloscope: "ኦሲሎስኮፕ",
      audio: "ድምጽ እና ጫጫታ" 
    },
    filter: "ማጣሪያ",
    audio: {
      upload: "ፋይል ይጫኑ",
      playing: "ድምጹ እየተሰማ ነው...",
      stop: "አቁም",
      original: "ኦሪጅናል",
      noisy: "የተበላሸ",
      desc: "በሲግናል እና ጫጫታ መጠን (SNR) መካከል ያለውን ልዩነት በድምጽ ይረዱ።"
    }
  },
  en: {
    title: "NEURAL SIGNAL LAB v8.5",
    ready: "NEURAL KERNEL // ONLINE",
    analyzing: "PROCESSING RF STREAM...",
    throttled: "QUOTA EXHAUSTED // RETRYING...",
    unitTitle: "Neural Intelligence Unit",
    evaluating: "Analyzing Statistics...",
    health: "Signal Integrity",
    confidence: "AI Confidence",
    placeholder: "Neural engine ready. Interactive diagnostic modules active.",
    mode: "Mode",
    tabs: { 
      dashboard: "Summary", 
      spectrum: "Spectrum Lab", 
      oscilloscope: "Oscilloscope",
      audio: "Aural Lab" 
    },
    filter: "Denoising",
    audio: {
      upload: "Load Audio File",
      playing: "Transmitting Stream...",
      stop: "Halt Stream",
      original: "Original Baseband",
      noisy: "Noisy Radio Path",
      desc: "Experience how noise affects audio fidelity in real-time as you adjust SNR."
    }
  }
};

const App: React.FC = () => {
  const [params, setParams] = useState<SignalParams>({
    messageFreq: 400,
    messageAmp: 1.0,
    messageWaveform: WaveformType.SINE,
    modulation: ModulationType.AM,
    carrierFreq: 20000,
    carrierAmp: 1.5,
    carrierWaveform: WaveformType.SINE,
    distanceKm: 0.1,
    channelType: ChannelType.LOS,
    noiseType: NoiseType.AWGN,
    snrDb: 25,
    sampleRate: 80000,
    duration: 0.1
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [language, setLanguage] = useState<Language>('en');
  const [signalData, setSignalData] = useState<SignalData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isThrottled, setIsThrottled] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [beginnerExplainer, setBeginnerExplainer] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioMode, setAudioMode] = useState<'original' | 'noisy'>('noisy');

  const t = useMemo(() => TRANSLATIONS[language], [language]);

  const refreshLocalDSP = useCallback(() => {
    const data = generateSignalData(params);
    data.denoisedSignal = params.snrDb < 12 ? applyMedianFilter(data.receivedSignal, 5) : applyMovingAverage(data.receivedSignal, 5);
    data.demodulatedSignal = demodulateSignal(data.denoisedSignal, params.modulation, params.carrierFreq, params.sampleRate);
    setSignalData(data);
  }, [params]);

  useEffect(() => {
    refreshLocalDSP();
    
    const debounceTimer = setTimeout(async () => {
      if (!signalData) return;
      
      setIsAnalyzing(true);
      setIsThrottled(false);
      
      try {
        const features = calculateFeatures(signalData.receivedSignal, params.sampleRate);
        const result = await analyzeSignalWithGemini(features, params, language);
        
        if (result.reasoning && (result.reasoning.includes("429") || result.reasoning.toLowerCase().includes("quota"))) {
          setIsThrottled(true);
        }
        
        setAiResult(result);

        // Fetch beginner-friendly explanation
        const simpleExplainer = await explainSignalToBeginner(params, result.estimatedSNR, result.spectralHealth);
        setBeginnerExplainer(simpleExplainer);

      } catch (err) {
        setIsThrottled(true);
      } finally {
        setIsAnalyzing(false);
      }
    }, 800);

    return () => clearTimeout(debounceTimer);
  }, [params, language, refreshLocalDSP]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioContextRef.current.decodeAudioData(arrayBuffer);
    setAudioBuffer(decoded);
  };

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current) return;
    stopAudio();
    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      const currentSNR = params.snrDb;
      for (let i = 0; i < input.length; i++) {
        if (audioMode === 'original') {
          output[i] = input[i];
        } else {
          const framePower = 0.05; 
          const noiseStd = Math.sqrt(framePower / Math.pow(10, currentSNR / 10));
          output[i] = Math.max(-1, Math.min(1, input[i] + randomGaussian() * noiseStd));
        }
      }
    };
    source.connect(processor); processor.connect(ctx.destination);
    source.start(); setIsPlayingAudio(true);
    audioSourceRef.current = source; scriptProcessorRef.current = processor;
    source.onended = () => setIsPlayingAudio(false);
  };

  const stopAudio = () => {
    if (audioSourceRef.current) { try { audioSourceRef.current.stop(); } catch(e){} audioSourceRef.current.disconnect(); }
    if (scriptProcessorRef.current) { scriptProcessorRef.current.disconnect(); }
    setIsPlayingAudio(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#020617] text-slate-200">
      <ControlPanel params={params} setParams={setParams} onRegenerate={refreshLocalDSP} isAnalyzing={isAnalyzing} />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-slate-900/40 backdrop-blur-2xl border-b border-slate-800/60 p-5 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-indigo-400/30">
               <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
               <h1 className="text-base font-black text-white tracking-[0.25em] uppercase italic">{t.title}</h1>
               <div className="flex items-center gap-3 mt-1">
                  <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${isThrottled ? 'bg-amber-500 shadow-amber-600/50' : isAnalyzing ? 'bg-indigo-400 shadow-indigo-500/50' : 'bg-emerald-400 shadow-emerald-500/50'}`}></div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                    {isThrottled ? t.throttled : isAnalyzing ? t.analyzing : t.ready}
                  </span>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner">
              {(Object.keys(t.tabs) as TabType[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xl scale-[1.05]' : 'text-slate-500 hover:text-slate-300'}`}>
                  {t.tabs[tab]}
                </button>
              ))}
            </nav>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setLanguage(language === 'en' ? 'am' : 'en')} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[11px] uppercase font-black tracking-widest transition-all border border-slate-700 shadow-lg flex items-center gap-2">
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                {language === 'en' ? 'AM' : 'EN'}
              </button>
              <button onClick={toggleFullscreen} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-300 transition-all border border-slate-700 shadow-lg active:scale-95 group">
                {isFullscreen ? (
                   <svg className="w-5 h-5 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9L4 4m0 0l0 5m0-5l5 0m6 0l5 5m0-5l-5 0m0 0l0 5m-6 6l-5 5m0 0l5 0m-5 0l0-5m11 0l5 5m0-5l-5 0m5 0l0-5"/></svg>
                ) : (
                   <svg className="w-5 h-5 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-10 space-y-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent">
          <div className="max-w-7xl mx-auto space-y-10">
            {/* ENHANCED NEURAL INTELLIGENCE UNIT */}
            <div className="grid grid-cols-1 gap-8">
              <div className={`bg-slate-900/40 rounded-[3.5rem] border-2 p-12 backdrop-blur-3xl shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative overflow-hidden transition-all duration-700 ${isThrottled ? 'border-amber-600/50' : 'border-indigo-500/30'}`}>
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none -ml-48 -mb-48"></div>
                
                <div className="flex flex-col gap-12 relative z-10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="flex items-center gap-6">
                      <div className={`w-20 h-20 rounded-[2rem] border-2 flex items-center justify-center transition-all ${isAnalyzing ? 'border-indigo-400 bg-indigo-500/20 animate-pulse' : 'border-indigo-500/40 bg-indigo-500/10'}`}>
                        <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                      </div>
                      <div>
                        <h2 className="text-[14px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-2">{t.unitTitle}</h2>
                        <div className="flex items-center gap-4">
                           <span className={`text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${isThrottled ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {isThrottled ? 'Neural Link Throttled' : 'AI Analysis: Online'}
                           </span>
                           {aiResult && <span className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-tighter">Confidence Index: {Math.round(aiResult.confidence * 100)}%</span>}
                        </div>
                      </div>
                    </div>

                    {aiResult && !isThrottled && (
                      <div className="flex gap-10 bg-slate-950/40 px-8 py-4 rounded-3xl border border-white/5 backdrop-blur-md">
                        <div className="text-center">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Signal Quality</p>
                           <p className={`text-xl font-black italic tracking-tighter ${aiResult.spectralHealth === 'Excellent' ? 'text-emerald-400' : 'text-amber-400'}`}>{aiResult.spectralHealth}</p>
                        </div>
                        <div className="w-[1px] h-10 bg-slate-800"></div>
                        <div className="text-center">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Denoising Method</p>
                           <p className="text-xl font-black italic tracking-tighter text-indigo-400">{aiResult.suggestedDenoisingMethod}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* The Beginner Explanation Block */}
                    <div className="lg:col-span-8 space-y-8">
                       <div className="space-y-4">
                          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]"></div>
                             The Simulation Story
                          </h3>
                          <p className={`text-2xl font-medium leading-[1.6] italic transition-all ${isAnalyzing ? 'text-slate-500 opacity-50 blur-[2px]' : 'text-slate-100'}`}>
                            {isThrottled ? 'The neural processing unit is currently overwhelmed by high-frequency requests. Recalibrating link...' : (beginnerExplainer || "Adjust the transmitter parameters to start the story.")}
                          </p>
                       </div>

                       {/* Process Roadmap Visual */}
                       <div className="pt-8 grid grid-cols-3 gap-4 border-t border-slate-800/40">
                          <div className="space-y-2">
                             <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">01. Encoder</span>
                             <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-500 animate-[pulse_2s_infinite]" style={{ width: '100%' }}></div>
                             </div>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Hiding the data</p>
                          </div>
                          <div className="space-y-2">
                             <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">02. Channel</span>
                             <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500/40" style={{ width: `${100 - params.snrDb * 2}%` }}></div>
                             </div>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Traveling the air</p>
                          </div>
                          <div className="space-y-2">
                             <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">03. Neural Lab</span>
                             <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: isAnalyzing ? '30%' : '100%' }}></div>
                             </div>
                             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Cleaning & Reading</p>
                          </div>
                       </div>
                    </div>

                    {/* Pro Summary / Technical Detail */}
                    <div className="lg:col-span-4 bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/5 shadow-inner flex flex-col justify-center">
                       <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 border-b border-slate-800 pb-4">Internal Reasoning</h3>
                       <p className="text-sm font-mono text-indigo-300 leading-relaxed font-bold italic">
                          {isAnalyzing ? "Computing statistical probability maps..." : (aiResult?.reasoning || "Kernel idle. Awaiting user input parameters.")}
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {signalData && (
              <div className="space-y-12">
                {activeTab === 'dashboard' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-4 space-y-10">
                        <PowerMetricChart data={signalData} />
                    </div>
                    <div className="lg:col-span-8 space-y-10">
                        <DemodulationChart data={signalData} />
                        <div className="p-10 bg-slate-900/30 rounded-[2.5rem] border border-slate-800/40 text-center shadow-inner">
                          <p className="text-slate-400 text-sm font-semibold leading-relaxed">
                            <span className="text-indigo-400 font-black uppercase block mb-2">Simulation Status: Operational</span>
                            Link budget calculated at <b>{params.distanceKm.toFixed(1)} km</b> range. Use laboratory modules to inspect carrier stability and receiver attenuation effects.
                          </p>
                        </div>
                    </div>
                  </div>
                )}
                
                {activeTab === 'spectrum' && (
                  <div className="grid grid-cols-1">
                    <FrequencyDomainChart data={signalData} />
                  </div>
                )}

                {activeTab === 'oscilloscope' && (
                  <div className="grid grid-cols-1 gap-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                       <MessageSignalChart data={signalData} />
                       <CarrierWaveformChart data={signalData} />
                    </div>
                    <TransmittedSignalChart data={signalData} />
                    <TimeDomainChart data={signalData} showDenoised={true} />
                  </div>
                )}

                {activeTab === 'audio' && (
                  <div className="bg-slate-900/30 rounded-[4rem] p-16 border border-slate-800/60 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-16 items-center relative z-10">
                      <div className="w-full md:w-1/3 space-y-10">
                        <div className="p-12 bg-[#020617] rounded-[3.5rem] border border-slate-800/80 shadow-2xl">
                          <h3 className="text-lg font-black text-white uppercase tracking-widest mb-4">{t.audio.upload}</h3>
                          <p className="text-[11px] text-slate-500 mb-10 leading-relaxed font-bold italic">{t.audio.desc}</p>
                          <input type="file" accept="audio/*" onChange={handleFileUpload} className="w-full text-xs text-slate-400 file:mr-6 file:py-3 file:px-6 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer transition-all" />
                          
                          {audioBuffer && (
                            <div className="mt-12 space-y-8">
                              <div className="flex gap-3 p-2 bg-slate-950 rounded-[2rem] border border-slate-800/60 shadow-inner">
                                 <button onClick={() => setAudioMode('original')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${audioMode === 'original' ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}>{t.audio.original}</button>
                                 <button onClick={() => setAudioMode('noisy')} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase transition-all ${audioMode === 'noisy' ? 'bg-rose-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}>{t.audio.noisy}</button>
                              </div>
                              <button onClick={isPlayingAudio ? stopAudio : playAudio} className={`w-full py-6 rounded-3xl font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98] ${isPlayingAudio ? 'bg-slate-800 border border-slate-700 text-white' : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-emerald-500/20'}`}>
                                {isPlayingAudio ? (
                                  <div className="flex items-center justify-center gap-4">
                                     <div className="w-3 h-3 bg-white animate-pulse rounded-sm"></div>
                                     <span>{t.audio.stop}</span>
                                  </div>
                                ) : t.audio.playing}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 w-full h-[450px] bg-[#020617] rounded-[4rem] border border-slate-800/80 flex flex-col items-center justify-center overflow-hidden shadow-inner group relative">
                         <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent"></div>
                         <div className="flex items-end gap-2.5 h-64 w-full px-24">
                            {[...Array(64)].map((_, i) => (
                              <div key={i} className={`flex-1 rounded-full transition-all duration-100 ${isPlayingAudio ? 'bg-gradient-to-t from-indigo-600 via-indigo-400 to-violet-300' : 'bg-slate-800'}`} style={{ height: isPlayingAudio ? `${20 + Math.random() * 80}%` : '8px', opacity: 0.3 + (i/64)*0.7 }} />
                            ))}
                         </div>
                         <div className="mt-16 flex items-center gap-16 relative z-10">
                            <div className="flex flex-col items-center gap-2">
                               <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Aural Stream</span>
                               <span className={`text-[12px] font-mono font-bold tracking-tighter ${isPlayingAudio ? 'text-emerald-500' : 'text-slate-700'}`}>{isPlayingAudio ? 'BROADCASTING' : 'IDLE'}</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                               <span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">Physical SNR</span>
                               <span className="text-[12px] font-mono font-bold text-amber-500 tracking-tighter">{params.snrDb} dB</span>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
