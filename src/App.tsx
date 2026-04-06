import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Play, RotateCcw, AlertTriangle, Activity, Smartphone, History } from 'lucide-react';
import { speak, playGunSound, playDoubleGunSound } from './lib/audio';
import { useAccelerometer } from './hooks/useAccelerometer';
import { cn } from './lib/utils';

type RaceState = 'IDLE' | 'WAITING_FOR_MARKS' | 'ON_YOUR_MARKS' | 'SET' | 'GUN' | 'FALSE_START' | 'FINISHED';

export default function App() {
  const { data: accelData, permissionGranted, requestPermission, isSupported } = useAccelerometer();
  
  const [raceState, setRaceState] = useState<RaceState>('IDLE');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  
  // Settings
  const [marksDelay, setMarksDelay] = useState(3);
  const [setDelay, setSetDelay] = useState(2);
  const [gunMinDelay, setGunMinDelay] = useState(1.5);
  const [gunMaxDelay, setGunMaxDelay] = useState(2.5);
  const [sensitivity, setSensitivity] = useState(0.8); // Lowered default for better responsiveness
  const [currentVibration, setCurrentVibration] = useState(0);

  // Refs for timing and baseline
  const baselineMagnitude = useRef<number | null>(null);
  const gunTime = useRef<number | null>(null);
  const stateRef = useRef<RaceState>('IDLE');
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const monitoringActive = useRef(false);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = raceState;
  }, [raceState]);

  const clearAllTimeouts = () => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  const addTimeout = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutRefs.current.push(id);
    return id;
  };

  const handleStart = async () => {
    if (!permissionGranted) {
      const granted = await requestPermission();
      if (!granted) {
        alert("Accelerometer permission is required to measure reaction time.");
        return;
      }
    }

    // Initialize audio context (requires user gesture)
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      ctx.resume();
    }
    // Initialize speech synthesis
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance("");
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
    }

    resetRace();
    setRaceState('WAITING_FOR_MARKS');
    
    // Establish baseline accelerometer reading
    baselineMagnitude.current = accelData.magnitude;

    addTimeout(async () => {
      if (stateRef.current !== 'WAITING_FOR_MARKS') return;
      
      setRaceState('ON_YOUR_MARKS');
      await speak("On your marks");
      
      addTimeout(async () => {
        if (stateRef.current !== 'ON_YOUR_MARKS') return;
        
        setRaceState('SET');
        await speak("Set");
        
        if (stateRef.current !== 'SET') return;
        
        baselineMagnitude.current = null;
        monitoringActive.current = true;
        
        const randomGunDelay = gunMinDelay + Math.random() * (gunMaxDelay - gunMinDelay);
        
        addTimeout(() => {
          if (stateRef.current !== 'SET') return;
          
          setRaceState('GUN');
          playGunSound();
          gunTime.current = performance.now();
          
        }, randomGunDelay * 1000);
        
      }, setDelay * 1000);
      
    }, marksDelay * 1000);
  };

  const resetRace = useCallback(() => {
    clearAllTimeouts();
    setRaceState('IDLE');
    setReactionTime(null);
    baselineMagnitude.current = null;
    gunTime.current = null;
    monitoringActive.current = false;
  }, []);

  // Monitor accelerometer for movement
  useEffect(() => {
    if (!monitoringActive.current) return;

    if (baselineMagnitude.current === null) {
      baselineMagnitude.current = accelData.magnitude;
      return;
    }

    const diff = Math.abs(accelData.magnitude - baselineMagnitude.current);
    setCurrentVibration(diff);
    
    if (diff > sensitivity) {
      if (raceState === 'SET') {
        // False start!
        monitoringActive.current = false;
        clearAllTimeouts();
        setRaceState('FALSE_START');
        playDoubleGunSound();
      } else if (raceState === 'GUN' && gunTime.current) {
        // Valid start!
        monitoringActive.current = false;
        const rTime = performance.now() - gunTime.current;
        setReactionTime(rTime);
        setHistory(prev => [rTime, ...prev]);
        setRaceState('FINISHED');
      }
    }
  }, [accelData, raceState, sensitivity]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-orange-500" />
          <h1 className="font-bold text-xl tracking-tight">Track Start</h1>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-zinc-400" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Background decorative elements */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
          <div className="w-[150vw] h-[1px] bg-white rotate-45"></div>
          <div className="w-[150vw] h-[1px] bg-white -rotate-45"></div>
        </div>

        {showSettings ? (
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-500" />
              Timing Settings
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-zinc-400">
                  <span>Delay before "On your marks"</span>
                  <span className="text-zinc-50">{marksDelay}s</span>
                </label>
                <input 
                  type="range" min="1" max="20" step="0.5" 
                  value={marksDelay} onChange={(e) => setMarksDelay(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-zinc-400">
                  <span>"On your marks" to "Set"</span>
                  <span className="text-zinc-50">{setDelay}s</span>
                </label>
                <input 
                  type="range" min="1" max="10" step="0.5" 
                  value={setDelay} onChange={(e) => setSetDelay(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-zinc-400">
                  <span>Min "Set" to Gun</span>
                  <span className="text-zinc-50">{gunMinDelay}s</span>
                </label>
                <input 
                  type="range" min="0.5" max="5" step="0.1" 
                  value={gunMinDelay} onChange={(e) => {
                    const val = Number(e.target.value);
                    setGunMinDelay(val);
                    if (val > gunMaxDelay) setGunMaxDelay(val);
                  }}
                  className="w-full accent-orange-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex justify-between text-sm font-medium text-zinc-400">
                  <span>Max "Set" to Gun</span>
                  <span className="text-zinc-50">{gunMaxDelay}s</span>
                </label>
                <input 
                  type="range" min="0.5" max="5" step="0.1" 
                  value={gunMaxDelay} onChange={(e) => {
                    const val = Number(e.target.value);
                    setGunMaxDelay(val);
                    if (val < gunMinDelay) setGunMinDelay(val);
                  }}
                  className="w-full accent-orange-500"
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-zinc-800">
                <label className="flex justify-between text-sm font-medium text-zinc-400">
                  <span>Sensor Sensitivity</span>
                  <span className="text-zinc-50">{sensitivity.toFixed(1)}</span>
                </label>
                <p className="text-xs text-zinc-500 mb-2">Lower value = more sensitive to movement</p>
                <input 
                  type="range" min="0.5" max="10" step="0.1" 
                  value={sensitivity} onChange={(e) => setSensitivity(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>
            
            <button 
              onClick={() => setShowSettings(false)}
              className="mt-8 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full max-w-md z-10">
            
            {/* Status Display */}
            <div className="h-40 flex items-center justify-center mb-8 w-full">
              {raceState === 'IDLE' && (
                <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
                    <Smartphone className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-400 text-lg">Place phone behind block<br/>and tap Start</p>
                </div>
              )}
              
              {raceState === 'WAITING_FOR_MARKS' && (
                <h2 className="text-4xl font-bold text-zinc-500 animate-pulse">Get Ready...</h2>
              )}
              
              {raceState === 'ON_YOUR_MARKS' && (
                <h2 className="text-5xl font-bold text-orange-500">On your marks</h2>
              )}
              
              {raceState === 'SET' && (
                <h2 className="text-6xl font-bold text-yellow-500">Set</h2>
              )}
              
              {raceState === 'GUN' && (
                <h2 className="text-7xl font-black text-green-500 italic tracking-tighter">BANG!</h2>
              )}
              
              {raceState === 'FALSE_START' && (
                <div className="text-center animate-in zoom-in duration-300">
                  <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-5xl font-black text-red-500 uppercase tracking-tight">False Start</h2>
                </div>
              )}
              
              {raceState === 'FINISHED' && reactionTime !== null && (
                <div className="text-center animate-in slide-in-from-bottom-8 fade-in duration-500">
                  <p className="text-zinc-400 text-lg uppercase tracking-widest mb-2 font-semibold">Reaction Time</p>
                  <div className="text-7xl font-black text-white font-mono tracking-tighter">
                    {(reactionTime / 1000).toFixed(3)}<span className="text-3xl text-zinc-500 ml-2">s</span>
                  </div>
                  {reactionTime < 100 && (
                    <p className="text-red-400 text-sm mt-2 font-medium">Warning: Likely a flyer (under 0.100s)</p>
                  )}
                </div>
              )}
            </div>

            {/* Vibration Meter */}
            {(raceState === 'SET' || raceState === 'GUN') && (
              <div className="w-full max-w-[200px] mb-8 space-y-2">
                <div className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  <span>Sensor Activity</span>
                  <span>{currentVibration.toFixed(2)}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className={cn(
                      "h-full transition-all duration-75",
                      currentVibration > sensitivity ? "bg-red-500" : "bg-orange-500"
                    )}
                    style={{ width: `${Math.min(100, (currentVibration / (sensitivity * 2)) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Main Action Button */}
            <div className="w-full px-4">
              {raceState === 'IDLE' ? (
                <button
                  onClick={handleStart}
                  disabled={!isSupported}
                  className={cn(
                    "w-full aspect-square max-h-80 rounded-full flex flex-col items-center justify-center gap-4 transition-all duration-300",
                    isSupported 
                      ? "bg-orange-500 hover:bg-orange-400 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(249,115,22,0.3)]" 
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  <Play className="w-16 h-16 fill-current" />
                  <span className="text-2xl font-bold tracking-widest uppercase">Start</span>
                </button>
              ) : (
                <button
                  onClick={resetRace}
                  className="w-full py-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <RotateCcw className="w-6 h-6" />
                  <span className="text-xl font-semibold">Reset</span>
                </button>
              )}
            </div>

            {history.length > 0 && (raceState === 'IDLE' || raceState === 'FINISHED' || raceState === 'FALSE_START') && (
              <div className="mt-8 w-full bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-zinc-400 font-medium flex items-center gap-2">
                    <History className="w-4 h-4" /> Session History
                  </h3>
                  <button onClick={() => setHistory([])} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Clear</button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {history.map((time, i) => (
                    <div key={i} className="flex justify-between items-center bg-zinc-800/30 p-3 rounded-lg border border-zinc-800/50">
                      <span className="text-zinc-500 text-sm font-medium">Attempt #{history.length - i}</span>
                      <span className="text-zinc-50 font-mono font-medium">{(time / 1000).toFixed(3)}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isSupported && (
              <p className="mt-8 text-red-400 text-center text-sm px-6 bg-red-500/10 py-3 rounded-lg border border-red-500/20">
                Device motion is not supported on this device. Please use a smartphone with an accelerometer.
              </p>
            )}
            
            {/* Debug info (optional, can be hidden in prod) */}
            {/* <div className="fixed bottom-4 left-4 text-xs font-mono text-zinc-600">
              Mag: {accelData.magnitude.toFixed(2)} | Base: {baselineMagnitude.current?.toFixed(2)}
            </div> */}
          </div>
        )}
      </main>
    </div>
  );
}
