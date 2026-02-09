
import React from 'react';
import { ModulationType, WaveformType, SignalParams } from '../types.ts';

interface ControlPanelProps {
  params: SignalParams;
  setParams: (p: SignalParams) => void;
  onRegenerate: () => void;
  isAnalyzing: boolean;
}

const WaveformIcon: React.FC<{ type: WaveformType; className?: string }> = ({ type, className = "w-4 h-4" }) => {
  switch (type) {
    case WaveformType.SINE:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
          <path d="M2 12C2 12 5 4 12 12C19 20 22 12 22 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case WaveformType.SQUARE:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
          <path d="M2 12H6V4H18V20H22" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case WaveformType.TRIANGLE:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
          <path d="M2 16L12 4L22 16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case WaveformType.SAWTOOTH:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
          <path d="M2 16L18 4V16L22 16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case WaveformType.PULSE:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
          <path d="M2 16H8V8H10V16H22" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
          <path d="M4 12H20" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
};

const ControlPanel: React.FC<ControlPanelProps> = ({ params, setParams, onRegenerate, isAnalyzing }) => {
  
  const handleChange = (key: keyof SignalParams, value: any) => {
    setParams({ ...params, [key]: value });
  };

  const waveformOptions = [
    WaveformType.SINE, 
    WaveformType.SQUARE, 
    WaveformType.TRIANGLE, 
    WaveformType.SAWTOOTH, 
    WaveformType.PULSE
  ];

  return (
    <div className="w-full md:w-80 bg-[#0a0f1e] p-6 border-r border-slate-800/80 flex flex-col gap-6 h-full overflow-y-auto z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3 pb-6 border-b border-slate-800/60">
        <div className="w-2.5 h-8 bg-gradient-to-b from-violet-500 to-indigo-600 rounded-full shadow-[0_0_15px_rgba(139,92,246,0.4)]"></div>
        <div>
           <h2 className="text-xl font-black tracking-tighter text-white uppercase italic leading-none">System</h2>
           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 block">Laboratory Node</span>
        </div>
      </div>

      {/* 1. SOURCE MESSAGE */}
      <div className="space-y-5">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-violet-400 font-black flex justify-between items-center bg-violet-400/5 px-2 py-1 rounded">
          <span>01. Source Message</span>
          <span className="text-slate-600 font-mono italic">m(t)</span>
        </h3>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
             <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Function Shape</label>
             <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/40">
               {waveformOptions.map(w => (
                 <button
                   key={w}
                   title={w}
                   onClick={() => handleChange('messageWaveform', w)}
                   className={`p-2 rounded-lg transition-all flex items-center justify-center group ${
                     params.messageWaveform === w 
                     ? 'bg-violet-600 text-white shadow-lg ring-1 ring-violet-400' 
                     : 'text-slate-600 hover:text-slate-400 hover:bg-slate-900'
                   }`}
                 >
                   <WaveformIcon type={w} />
                 </button>
               ))}
             </div>
          </div>
          
          <div className="flex flex-col gap-2">
             <div className="flex justify-between items-center">
               <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Frequency</label>
               <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md">{params.messageFreq} Hz</span>
             </div>
             <input type="range" min="100" max="5000" step="100" 
                value={params.messageFreq}
                onChange={(e) => handleChange('messageFreq', Number(e.target.value))}
                className="accent-violet-500 h-1 mt-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
             />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
               <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Amplitude</label>
               <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md">{params.messageAmp.toFixed(1)}V</span>
             </div>
            <input type="range" min="0.1" max="2" step="0.1" 
               value={params.messageAmp}
               onChange={(e) => handleChange('messageAmp', Number(e.target.value))}
               className="accent-violet-500 h-1 mt-1 appearance-none cursor-pointer bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 2. TRANSMITTER */}
      <div className="space-y-5 pt-6 border-t border-slate-800/60">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-black flex justify-between items-center bg-indigo-400/5 px-2 py-1 rounded">
          <span>02. RF Pipeline</span>
          <span className="text-slate-600 font-mono italic">s(t)</span>
        </h3>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Modulation Scheme</label>
            <select 
              className="bg-[#020617] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer hover:bg-slate-900 shadow-inner"
              value={params.modulation}
              onChange={(e) => handleChange('modulation', e.target.value)}
            >
              {Object.values(ModulationType).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Enhanced Visual Carrier Waveform Selector */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Carrier Oscillator</label>
              <button 
                onClick={() => handleChange('carrierWaveform', WaveformType.SINE)}
                className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-tighter transition-colors"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800/40">
               {waveformOptions.map(w => (
                 <button
                   key={w}
                   title={w}
                   onClick={() => handleChange('carrierWaveform', w)}
                   className={`p-2.5 rounded-lg transition-all flex items-center justify-center group relative ${
                     (params.carrierWaveform || WaveformType.SINE) === w 
                     ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] ring-1 ring-indigo-400' 
                     : 'text-slate-600 hover:text-slate-400 hover:bg-slate-900'
                   }`}
                 >
                   <WaveformIcon type={w} className="w-5 h-5" />
                   {/* Tiny dot indicator for active state */}
                   {(params.carrierWaveform || WaveformType.SINE) === w && (
                     <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>
                   )}
                 </button>
               ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Carrier Freq</label>
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{(params.carrierFreq / 1000).toFixed(1)} kHz</span>
              </div>
              <input type="range" min="5000" max="40000" step="1000"
                value={params.carrierFreq}
                onChange={(e) => handleChange('carrierFreq', Number(e.target.value))}
                className="accent-indigo-500 h-1 mt-1 appearance-none bg-slate-800 rounded-lg"
              />
          </div>

          <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Carrier Amplitude</label>
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{params.carrierAmp.toFixed(1)}V</span>
              </div>
              <input type="range" min="0.5" max="5.0" step="0.1"
                value={params.carrierAmp}
                onChange={(e) => handleChange('carrierAmp', Number(e.target.value))}
                className="accent-indigo-500 h-1 mt-1 appearance-none bg-slate-800 rounded-lg"
              />
          </div>
        </div>
      </div>

      {/* 3. CHANNEL */}
      <div className="space-y-5 pt-6 border-t border-slate-800/60">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-black flex justify-between items-center bg-amber-400/5 px-2 py-1 rounded">
          <span>03. Environment</span>
          <span className="text-slate-600 font-mono italic">y(t)</span>
        </h3>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Distance (Range)</label>
            <div className="flex justify-between items-center">
               <span className="text-[10px] font-mono text-slate-500">0.1 km</span>
               <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">{params.distanceKm.toFixed(1)} km</span>
               <span className="text-[10px] font-mono text-slate-500">10 km</span>
            </div>
            <input 
              type="range" min="0.1" max="10" step="0.1"
              value={params.distanceKm}
              onChange={(e) => handleChange('distanceKm', Number(e.target.value))}
              className="accent-amber-500 h-1 mt-1 appearance-none bg-slate-800 rounded-lg"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider">SNR Bias</label>
              <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">{params.snrDb} dB</span>
            </div>
            <input 
              type="range" min="-10" max="40" step="1"
              value={params.snrDb}
              onChange={(e) => handleChange('snrDb', Number(e.target.value))}
              className="accent-amber-500 h-1 mt-1 appearance-none bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex-grow"></div>

      <button
        onClick={onRegenerate}
        disabled={isAnalyzing}
        className={`w-full py-5 rounded-2xl font-black text-white shadow-2xl transition-all text-[11px] uppercase tracking-[0.25em] border border-white/5 active:scale-[0.97]
          ${isAnalyzing ? 'bg-slate-800 cursor-not-allowed opacity-50' : 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 hover:shadow-indigo-500/30'}
        `}
      >
        {isAnalyzing ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            <span>Running Inference</span>
          </div>
        ) : 'Execute Link Simulation'}
      </button>
    </div>
  );
};

export default ControlPanel;
