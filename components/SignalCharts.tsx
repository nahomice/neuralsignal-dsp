
import React, { useMemo, useState, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Brush, CartesianGrid
} from 'recharts';
import { SignalData } from '../types.ts';
import { downsample, computeFFT } from '../services/dspUtils.ts';

const TARGET_POINTS = 2000; // Increased resolution
const V_DIV_OPTIONS = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0];

const COLOR_MAP: Record<string, { border: string, text: string, bg: string, shadow: string, glow: string }> = {
  indigo: { border: 'border-t-indigo-500', text: 'text-indigo-400', bg: 'bg-indigo-500', shadow: 'rgba(99,102,241,0.4)', glow: 'rgba(99,102,241,0.8)' },
  violet: { border: 'border-t-violet-500', text: 'text-violet-400', bg: 'bg-violet-500', shadow: 'rgba(139,92,246,0.4)', glow: 'rgba(139,92,246,0.8)' },
  blue: { border: 'border-t-blue-500', text: 'text-blue-400', bg: 'bg-blue-500', shadow: 'rgba(59,130,246,0.4)', glow: 'rgba(59,130,246,0.8)' },
  cyan: { border: 'border-t-cyan-500', text: 'text-cyan-400', bg: 'bg-cyan-500', shadow: 'rgba(6,182,212,0.4)', glow: 'rgba(6,182,212,0.8)' },
  rose: { border: 'border-t-rose-500', text: 'text-rose-400', bg: 'bg-rose-500', shadow: 'rgba(244,63,94,0.4)', glow: 'rgba(244,63,94,0.8)' },
  emerald: { border: 'border-t-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500', shadow: 'rgba(16,185,129,0.4)', glow: 'rgba(16,185,129,0.8)' },
  amber: { border: 'border-t-amber-500', text: 'text-amber-400', bg: 'bg-amber-500', shadow: 'rgba(245,158,11,0.4)', glow: 'rgba(245,158,11,0.8)' },
};

const ChartWindow: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; color?: string; isOscilloscope?: boolean }> = ({ title, subtitle, children, color = 'indigo', isOscilloscope = false }) => {
  const styles = COLOR_MAP[color] || COLOR_MAP.indigo;
  
  return (
    <div className={`flex flex-col h-full bg-slate-950/60 rounded-[3rem] border border-slate-800/60 shadow-[0_35px_80px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-3xl border-t-4 ${styles.border} transition-all relative group`}>
      {isOscilloscope && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent z-10 opacity-20"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.4)_50%),linear-gradient(90deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01),rgba(255,255,255,0.02))] bg-[length:100%_4px,4px_100%] z-20"></div>
          <div className={`absolute inset-0 ${styles.bg} opacity-[0.03] animate-pulse z-0`}></div>
        </div>
      )}
      
      <div className="px-10 py-8 border-b border-slate-800/40 flex justify-between items-center bg-slate-900/60 relative z-30">
        <div>
          <h3 className={`text-[14px] uppercase tracking-[0.5em] font-black ${styles.text} drop-shadow-[0_0_12px_${styles.shadow}]`}>{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-500 uppercase font-black mt-2 tracking-widest">{subtitle}</p>}
        </div>
        <div className="flex gap-4">
          <div className="px-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-black text-indigo-500 uppercase tracking-tighter shadow-inner">SINUSOID STABILIZED</div>
          <div className={`w-3 h-3 rounded-full ${styles.bg} animate-ping mt-1 shadow-[0_0_15px_${styles.shadow}]`}></div>
        </div>
      </div>
      <div className="flex-1 p-6 md:p-10 relative min-h-[500px] z-20">
        {children}
      </div>
    </div>
  );
};

export const MessageSignalChart: React.FC<{ data: SignalData }> = ({ data }) => {
  const chartData = useMemo(() => {
    const sliceSize = Math.min(200, data.time.length);
    const points = [];
    for (let i = 0; i < sliceSize; i++) {
      points.push({ time: data.time[i] * 1000, msg: data.originalMessage[i] });
    }
    return points;
  }, [data]);

  return (
    <ChartWindow title="Input Transducer" subtitle="Source Signal (m)" color="violet" isOscilloscope={true}>
      <div className="h-64 relative bg-[#01040a] rounded-3xl overflow-hidden border border-slate-800/80 shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 15" stroke="#111827" />
            <XAxis dataKey="time" hide />
            <YAxis domain={[-2.5, 2.5]} hide />
            <Line 
              type="monotone" 
              dataKey="msg" 
              stroke="#8b5cf6" 
              strokeWidth={6} 
              dot={false} 
              isAnimationActive={false}
              style={{ filter: 'drop-shadow(0 0 15px rgba(139, 92, 246, 1))' }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="absolute top-4 left-4 text-[10px] font-mono text-violet-400 font-black uppercase tracking-widest">WAVE VIEW: SINE</div>
      </div>
    </ChartWindow>
  );
};

export const CarrierWaveformChart: React.FC<{ data: SignalData }> = ({ data }) => {
  const chartData = useMemo(() => {
    const sliceSize = Math.min(25, data.time.length);
    const points = [];
    for (let i = 0; i < sliceSize; i++) {
      points.push({ time: data.time[i] * 1000, carrier: data.carrierWave[i] });
    }
    return points;
  }, [data]);

  return (
    <ChartWindow title="RF Oscillator" subtitle="Carrier Frequency (c)" color="blue" isOscilloscope={true}>
      <div className="h-64 relative bg-[#01040a] rounded-3xl overflow-hidden border border-slate-800/80 shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 15" stroke="#111827" />
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Line 
              type="monotone" 
              dataKey="carrier" 
              stroke="#3b82f6" 
              strokeWidth={6} 
              dot={false} 
              isAnimationActive={false} 
              style={{ filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 1))' }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="absolute top-4 left-4 text-[10px] font-mono text-blue-400 font-black uppercase tracking-widest">RF CLOCK: STABLE</div>
      </div>
    </ChartWindow>
  );
};

export const TransmittedSignalChart: React.FC<{ data: SignalData }> = ({ data }) => {
  const chartData = useMemo(() => {
    const sliceSize = Math.min(200, data.time.length);
    const points = [];
    for (let i = 0; i < sliceSize; i++) {
      points.push({ time: data.time[i] * 1000, tx: data.transmittedSignal[i] });
    }
    return points;
  }, [data]);

  return (
    <ChartWindow title="TX Power Monitor" subtitle="Modulated Envelope (s)" color="cyan" isOscilloscope={true}>
      <div className="h-80 relative bg-[#01040a] rounded-[2.5rem] overflow-hidden border border-slate-800/80 shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="1 20" stroke="#111827" />
            <XAxis dataKey="time" hide />
            <YAxis domain={['auto', 'auto']} hide />
            <Line 
              type="monotone" 
              dataKey="tx" 
              stroke="#00f2ff" 
              strokeWidth={4} 
              dot={false} 
              isAnimationActive={false} 
              style={{ filter: 'drop-shadow(0 0 20px rgba(0, 242, 255, 0.9))' }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="absolute top-6 left-6 text-[10px] font-mono text-cyan-400 font-black uppercase tracking-widest">ENVELOPE MONITOR</div>
      </div>
    </ChartWindow>
  );
};

export const TimeDomainChart: React.FC<{ data: SignalData, showDenoised: boolean }> = ({ data, showDenoised }) => {
  const [viewMode, setViewMode] = useState<'CH1' | 'CH2' | 'DUAL'>('DUAL');
  const [timebase, setTimebase] = useState(0.045); // Increased for longer range visibility by default
  const [horizOffset, setHorizOffset] = useState(0); 
  const [ch1Pos, setCh1Pos] = useState(2.2); 
  const [ch2Pos, setCh2Pos] = useState(-2.2); 
  const [ch1VDiv, setCh1VDiv] = useState(1.0); 
  const [ch2VDiv, setCh2VDiv] = useState(1.0); 
  const [isInteracting, setIsInteracting] = useState(false);

  const screenRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; offset: number } | null>(null);

  const chartData = useMemo(() => {
    const totalPoints = data.time.length;
    let triggerIdx = 0;
    for (let i = 1; i < totalPoints / 2; i++) {
        if (data.receivedSignal[i-1] < 0 && data.receivedSignal[i] >= 0) {
            triggerIdx = i;
            break;
        }
    }

    const viewSize = Math.floor(totalPoints * timebase);
    const startIndex = Math.max(0, Math.min(totalPoints - viewSize, triggerIdx + horizOffset));
    const points = [];
    const step = Math.max(1, Math.floor(viewSize / TARGET_POINTS));
    const vScale1 = 1 / ch1VDiv;
    const vScale2 = 1 / ch2VDiv;
    
    for (let i = 0; i < viewSize; i += step) {
      const idx = startIndex + i;
      if (idx >= totalPoints) break;
      points.push({ 
        time: data.time[idx] * 1000,
        rx: (data.receivedSignal[idx] * vScale1) + ch1Pos,
        denoised: (data.denoisedSignal[idx] * vScale2) + ch2Pos
      });
    }
    return points;
  }, [data, timebase, horizOffset, ch1Pos, ch2Pos, ch1VDiv, ch2VDiv]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragStartPos.current = { x: e.clientX, offset: horizOffset };
    setIsInteracting(true);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragStartPos.current) return;
    const dx = e.clientX - dragStartPos.current.x;
    const sensitivity = 800 * timebase; 
    setHorizOffset(dragStartPos.current.offset - (dx * sensitivity));
  };

  const onMouseUp = () => {
    dragStartPos.current = null;
    setIsInteracting(false);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.85;
    setTimebase(prev => Math.max(0.001, Math.min(0.5, prev * factor)));
  };

  return (
    <ChartWindow title="High-Speed Diagnostic Analyzer" subtitle="Long-Range Spectral Trace" color="rose" isOscilloscope={true}>
      <div className="flex flex-col lg:flex-row gap-8 h-full min-h-[700px]">
        <div className="w-full lg:w-72 flex flex-col gap-10 bg-[#0a0f1e]/90 p-8 rounded-[3rem] border border-slate-800/80 shadow-2xl z-40 shrink-0">
          <div className="space-y-6">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-slate-800/40 pb-4">
              CHANNEL INPUT
            </h4>
            <div className="flex flex-col gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800/40">
              {(['CH1', 'CH2', 'DUAL'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`py-3 rounded-xl text-[11px] font-black tracking-tighter uppercase transition-all ${
                    viewMode === mode 
                    ? 'bg-rose-600 text-white shadow-lg border border-rose-400/30' 
                    : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 border-t border-slate-800/40 pt-8">
            <h4 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em]">CH1 GAIN</h4>
            <div className="grid grid-cols-3 gap-2">
              {V_DIV_OPTIONS.map(val => (
                <button
                  key={`ch1-${val}`}
                  onClick={() => setCh1VDiv(val)}
                  className={`py-3 rounded-xl text-[10px] font-mono font-black transition-all border ${
                    ch1VDiv === val 
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300' 
                    : 'bg-slate-950 border-slate-800 text-slate-700'
                  }`}
                >
                  {val >= 1 ? `${val}V` : `${val * 1000}m`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-8 border-t border-slate-800/40 pt-8 flex-grow">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">TRACE VERTICAL</h4>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-black text-rose-500 uppercase"><span>CH1 POS</span><span>{ch1Pos.toFixed(1)}</span></div>
                <input type="range" min="-5" max="5" step="0.1" value={ch1Pos} onChange={(e) => setCh1Pos(Number(e.target.value))} className="accent-rose-500 h-1.5 w-full bg-slate-900 rounded-full appearance-none cursor-pointer" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-black text-emerald-500 uppercase"><span>CH2 POS</span><span>{ch2Pos.toFixed(1)}</span></div>
                <input type="range" min="-5" max="5" step="0.1" value={ch2Pos} onChange={(e) => setCh2Pos(Number(e.target.value))} className="accent-emerald-500 h-1.5 w-full bg-slate-900 rounded-full appearance-none cursor-pointer" />
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => { setHorizOffset(0); setTimebase(0.045); setCh1Pos(2.2); setCh2Pos(-2.2); }}
            className="w-full py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all shadow-lg active:scale-95"
          >
            RESET TRACES
          </button>
        </div>

        <div 
          ref={screenRef}
          onMouseDown={onMouseDown}
          onWheel={onWheel}
          className="flex-1 min-h-[550px] relative bg-[#01040a] rounded-[3.5rem] border-[14px] border-slate-900 overflow-hidden group/screen shadow-[0_0_150px_rgba(0,0,0,1)] cursor-move select-none"
        >
          <div className="absolute inset-0 pointer-events-none z-10 opacity-40">
            <div className="w-full h-full grid grid-cols-10 grid-rows-10">
              {[...Array(100)].map((_, i) => (
                <div key={i} className="border-[0.5px] border-slate-800/40"></div>
              ))}
            </div>
            <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-slate-700/60 shadow-[0_0_10px_rgba(51,65,85,0.5)]"></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-slate-700/60 shadow-[0_0_10px_rgba(51,65,85,0.5)]"></div>
          </div>

          <div className="absolute top-14 left-14 right-14 flex justify-between pointer-events-none z-30">
            <div className="flex gap-16">
               <div className={`transition-all duration-300 ${viewMode === 'CH2' ? 'opacity-20 grayscale' : 'opacity-100'}`}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-5 h-5 rounded-full bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,1)]"></div>
                    <span className="text-[16px] font-black text-rose-400 uppercase tracking-tighter">NODE: RX</span>
                  </div>
                  <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-md">
                    <span className="text-[28px] font-mono text-white font-black tracking-tighter leading-none">{ch1VDiv.toFixed(2)}V/DIV</span>
                  </div>
               </div>
               <div className={`transition-all duration-300 ${viewMode === 'CH1' ? 'opacity-20 grayscale' : 'opacity-100'}`}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)]"></div>
                    <span className="text-[16px] font-black text-emerald-400 uppercase tracking-tighter">NODE: DSP</span>
                  </div>
                  <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-md">
                    <span className="text-[28px] font-mono text-white font-black tracking-tighter leading-none">{ch2VDiv.toFixed(2)}V/DIV</span>
                  </div>
               </div>
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-4 mb-3 bg-slate-950/80 px-6 py-3 rounded-2xl border border-indigo-500/30 backdrop-blur-xl shadow-2xl">
                 <span className="text-[14px] font-black text-indigo-400 uppercase tracking-widest">{isInteracting ? 'LOCKED' : 'SWEEPING'}</span>
                 <div className={`w-4 h-4 rounded-full bg-indigo-500 ${isInteracting ? 'scale-125' : 'animate-pulse'}`}></div>
               </div>
               <div className="bg-slate-900/80 px-6 py-2 rounded-xl border border-white/5 backdrop-blur-md">
                 <span className="text-[32px] font-mono text-indigo-300 font-black tracking-tighter">{(timebase * 10).toFixed(3)}ms/D</span>
               </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 180, right: 100, left: 100, bottom: 150 }}>
              <XAxis dataKey="time" hide />
              <YAxis domain={[-8, 8]} axisLine={false} tickCount={17} hide />
              
              {(viewMode === 'CH1' || viewMode === 'DUAL') && (
                <Line 
                  type="monotone" 
                  dataKey="rx" 
                  stroke="#ff1e6d" 
                  strokeWidth={7} 
                  dot={false} 
                  strokeOpacity={viewMode === 'DUAL' ? 0.8 : 1} 
                  isAnimationActive={false} 
                  style={{ filter: 'drop-shadow(0 0 15px rgba(255, 30, 109, 0.9))' }}
                />
              )}
              
              {(viewMode === 'CH2' || viewMode === 'DUAL') && showDenoised && (
                <Line 
                  type="monotone" 
                  dataKey="denoised" 
                  stroke="#10ffb1" 
                  strokeWidth={8} 
                  dot={false} 
                  isAnimationActive={false} 
                  style={{ filter: 'drop-shadow(0 0 25px rgba(16, 255, 177, 1))' }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>

          <div className="absolute bottom-16 left-16 right-16 flex justify-between items-center pointer-events-none z-30">
            <div className="flex gap-16 bg-slate-900/90 px-12 py-6 rounded-[2.5rem] border border-white/10 backdrop-blur-2xl shadow-2xl">
               <div className="flex flex-col">
                  <span className="text-[12px] text-slate-500 font-black uppercase mb-1 tracking-widest">WAVEFORM PK-PK</span>
                  <span className="text-[26px] font-mono text-rose-400 font-black tracking-tighter">4.02 V</span>
               </div>
               <div className="flex flex-col border-l border-slate-800/80 pl-16">
                  <span className="text-[12px] text-slate-500 font-black uppercase mb-1 tracking-widest">TIME OFFSET</span>
                  <span className="text-[26px] font-mono text-indigo-400 font-black tracking-tighter">{(horizOffset/1000).toFixed(2)} ms</span>
               </div>
            </div>
            <div className="px-10 py-5 rounded-[2rem] bg-slate-950 border border-slate-800 shadow-2xl flex items-center gap-6">
               <span className="text-[16px] font-mono text-slate-100 font-black uppercase tracking-[0.3em]">HIGH-SPEED MONITOR</span>
               <div className="w-5 h-5 bg-emerald-500 rounded-full shadow-[0_0_25px_rgba(16,185,129,1)]"></div>
            </div>
          </div>
        </div>
      </div>
    </ChartWindow>
  );
};

export const PowerMetricChart: React.FC<{ data: SignalData }> = ({ data }) => {
  const chartData = [
    { name: 'Transmitted', power: 10 * Math.log10(data.powerMetrics.sourcePowerWatts + 1e-12), fill: '#6366f1' },
    { name: 'At Receiver', power: 10 * Math.log10(data.powerMetrics.receivedPowerWatts + 1e-12), fill: '#10b981' },
    { name: 'Noise Floor', power: 10 * Math.log10(data.powerMetrics.noisePower + 1e-12), fill: '#f43f5e' },
  ];

  return (
    <ChartWindow title="RF Link Levels" subtitle="Absolute Power Budget (dBW)" color="indigo">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" domain={[-80, 20]} hide />
            <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={100} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b', fontSize: '11px', borderRadius: '12px'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
            <Bar dataKey="power" radius={[0, 10, 10, 0]} barSize={28}>
              {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4">
         <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800/50 shadow-inner space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/40 pb-3">
               <span className="text-[11px] text-slate-400 uppercase font-black tracking-widest">Effective SNR</span>
               <span className={`text-2xl font-mono font-black ${data.powerMetrics.measuredSNR > 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
                 {data.powerMetrics.measuredSNR.toFixed(1)} <span className="text-xs">dB</span>
               </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-black">Path Loss</span>
                  <span className="text-sm font-mono text-slate-200 font-bold">{data.powerMetrics.pathLossDb.toFixed(1)} dB</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[9px] text-slate-500 uppercase font-black">Link Efficiency</span>
                  <span className="text-sm font-mono text-slate-200 font-bold">{(100 / (1 + Math.pow(10, -data.powerMetrics.measuredSNR/10))).toFixed(1)}%</span>
               </div>
            </div>
         </div>
      </div>
    </ChartWindow>
  );
};

export const FrequencyDomainChart: React.FC<{ data: SignalData }> = ({ data }) => {
  const chartData = useMemo(() => {
    const res = computeFFT(data.receivedSignal, 80000);
    return res.freq.map((f, i) => ({ freq: f, mag: res.mag[i] }));
  }, [data]);

  return (
    <ChartWindow title="Spectrum Lab" subtitle="Spectral Power Density" color="emerald" isOscilloscope={true}>
      <div className="h-[500px] relative bg-[#01040a] rounded-[3rem] border border-slate-800/40 overflow-hidden shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 30, right: 40, left: 20, bottom: 30 }}>
            <XAxis dataKey="freq" stroke="#475569" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} axisLine={false} />
            <YAxis stroke="#475569" fontSize={11} domain={[-110, 10]} axisLine={false} />
            <Tooltip contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b', fontSize: '11px', borderRadius: '12px'}} />
            <Line 
              type="step" 
              dataKey="mag" 
              stroke="#10b981" 
              strokeWidth={2} 
              dot={false} 
              isAnimationActive={false} 
              style={{ filter: 'drop-shadow(0 0 12px rgba(16, 185, 129, 0.7))' }}
            />
            <Brush dataKey="freq" height={40} stroke="#1e293b" fill="#020617" travellerWidth={12} gap={1} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartWindow>
  );
};

export const DemodulationChart: React.FC<{ data: SignalData }> = ({ data }) => {
  const chartData = useMemo(() => {
    const points = data.time.map((t, i) => ({ 
      time: t, 
      orig: data.originalMessage[i],
      recovered: data.demodulatedSignal[i]
    }));
    return downsample(points, TARGET_POINTS);
  }, [data]);

  return (
    <ChartWindow title="Link Sink" subtitle="End-to-End Reconstruction" color="amber">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 10" stroke="#161b22" />
            <XAxis dataKey="time" hide />
            <YAxis stroke="#475569" fontSize={11} domain={[-2.5, 2.5]} axisLine={false} />
            <Tooltip contentStyle={{backgroundColor: '#020617', border: '1px solid #1e293b', fontSize: '11px', borderRadius: '12px'}} />
            <Line type="monotone" dataKey="orig" stroke="#475569" strokeWidth={1.5} strokeDasharray="8 8" dot={false} isAnimationActive={false} name="Original" />
            <Line type="monotone" dataKey="recovered" stroke="#f59e0b" strokeWidth={4} dot={false} isAnimationActive={false} name="Recovered" style={{ filter: 'drop-shadow(0 0 12px rgba(245, 158, 11, 0.6))' }} />
            <Brush dataKey="time" height={35} stroke="#1e293b" fill="#020617" travellerWidth={12} gap={1} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartWindow>
  );
};
