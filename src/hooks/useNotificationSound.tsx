import { useCallback, useRef } from 'react';
import { NotificationType } from './useNotifications';

// Sound configurations for different notification types
const soundConfigs: Record<NotificationType, { frequency: number; duration: number; type: OscillatorType; pattern: number[] }> = {
  budget_alert: {
    frequency: 440,
    duration: 150,
    type: 'sine',
    pattern: [1, 0.5, 1] // Two short beeps
  },
  warning: {
    frequency: 330,
    duration: 200,
    type: 'sawtooth',
    pattern: [1, 0.3, 1, 0.3, 1] // Three urgent beeps
  },
  subscription: {
    frequency: 523,
    duration: 120,
    type: 'sine',
    pattern: [1, 0.8, 1.2] // Ascending tones
  },
  achievement: {
    frequency: 659,
    duration: 100,
    type: 'sine',
    pattern: [1, 1.25, 1.5, 2] // Victory fanfare
  },
  tip: {
    frequency: 587,
    duration: 100,
    type: 'triangle',
    pattern: [1, 1.2] // Gentle ping
  },
  system: {
    frequency: 500,
    duration: 80,
    type: 'sine',
    pattern: [1] // Simple blip
  }
};

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType,
    startTime: number,
    volume: number = 0.15
  ) => {
    const ctx = getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    
    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration / 1000);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration / 1000);
  }, [getAudioContext]);

  const playNotificationSound = useCallback((type: NotificationType) => {
    if (isPlayingRef.current) return;
    
    try {
      const config = soundConfigs[type] || soundConfigs.system;
      const ctx = getAudioContext();
      
      // Resume audio context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      isPlayingRef.current = true;
      const now = ctx.currentTime;
      let offset = 0;
      
      config.pattern.forEach((multiplier, index) => {
        const freq = config.frequency * multiplier;
        playTone(freq, config.duration, config.type, now + offset);
        offset += (config.duration + 80) / 1000; // Add gap between notes
      });
      
      // Reset playing state after sound completes
      setTimeout(() => {
        isPlayingRef.current = false;
      }, offset * 1000 + 100);
      
    } catch (error) {
      console.error('Error playing notification sound:', error);
      isPlayingRef.current = false;
    }
  }, [getAudioContext, playTone]);

  return { playNotificationSound };
}
