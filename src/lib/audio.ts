// Create a single shared context outside the functions
let sharedCtx: AudioContext | null = null;

export const initAudio = () => {
  if (sharedCtx) return;
  
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  
  sharedCtx = new AudioContextClass();
  
  // iOS needs us to play a completely silent sound on the very first tap to "unlock" the audio engine
  const buffer = sharedCtx.createBuffer(1, 1, 22050);
  const source = sharedCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(sharedCtx.destination);
  source.start(0);
  sharedCtx.resume();
};

export const speak = (text: string) => {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
};

export const playGunSound = () => {
  if (!sharedCtx) return;
  const ctx = sharedCtx;
  
  // Make sure it's awake
  if (ctx.state === 'suspended') ctx.resume();
  
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  oscGain.gain.setValueAtTime(1, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  
  const bufferSize = ctx.sampleRate * 0.5;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(1, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
  
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + 0.2);
};

export const playDoubleGunSound = () => {
  if (!sharedCtx) return;
  const ctx = sharedCtx;
  
  if (ctx.state === 'suspended') ctx.resume();

  const fireGun = (startTime: number) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    
    oscGain.gain.setValueAtTime(1, startTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1, startTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + 0.5);
    
    noise.start(startTime);
    noise.stop(startTime + 0.2);
  };

  fireGun(ctx.currentTime);
  fireGun(ctx.currentTime + 0.4);
};