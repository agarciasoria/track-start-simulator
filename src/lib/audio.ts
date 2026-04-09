let sharedCtx: AudioContext | null = null;

export const initAudio = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedCtx) {
      sharedCtx = new AudioContextClass();
    }

    // Resume context if suspended (iOS requirement)
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume();
    }

    // Play a silent buffer to unlock audio on iOS
    const buffer = sharedCtx.createBuffer(1, 1, 22050);
    const source = sharedCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(sharedCtx.destination);
    source.start(0);
  } catch (e) {
    console.error("Audio init error:", e);
  }
};

export const initSpeech = () => {
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(" ");
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech init error:", e);
    }
  }
};

export const speak = (text: string) => {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }
    
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      // Fallback timeout for iOS Safari where onend sometimes fails
      const fallback = setTimeout(() => {
        resolve();
      }, 3000);

      utterance.onend = () => {
        clearTimeout(fallback);
        resolve();
      };
      
      utterance.onerror = () => {
        clearTimeout(fallback);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech error:", e);
      resolve();
    }
  });
};

export const playGunSound = () => {
  if (!sharedCtx) return;
  
  const ctx = sharedCtx;
  
  // Create an oscillator for the low frequency "thump"
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  oscGain.gain.setValueAtTime(1, ctx.currentTime);
  oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  
  // Create noise for the "crack"
  const bufferSize = ctx.sampleRate * 0.5; // 0.5 seconds of noise
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

  const fireGun = (startTime: number) => {
    // Create an oscillator for the low frequency "thump"
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    
    oscGain.gain.setValueAtTime(1, startTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    
    // Create noise for the "crack"
    const bufferSize = ctx.sampleRate * 0.5; // 0.5 seconds of noise
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
  fireGun(ctx.currentTime + 0.4); // Second shot 400ms later
};
