import { useCallback, useRef } from 'react';
import { NotificationType } from './useNotifications';
import { PersonalityType } from '@/lib/personalities';

// Personality-specific sound profiles
interface SoundProfile {
  baseFrequency: number;
  waveType: OscillatorType;
  volume: number;
  attackTime: number;
  releaseMultiplier: number;
  gapMs: number;
}

const personalitySounds: Record<PersonalityType, SoundProfile> = {
  chill: {
    baseFrequency: 350, // Lower, mellow
    waveType: 'sine',
    volume: 0.12,
    attackTime: 0.03, // Slower attack
    releaseMultiplier: 1.2, // Longer fade
    gapMs: 120 // More space between notes
  },
  hype: {
    baseFrequency: 550, // Higher, energetic
    waveType: 'square',
    volume: 0.15,
    attackTime: 0.005, // Punchy attack
    releaseMultiplier: 0.7, // Snappy
    gapMs: 60 // Rapid-fire
  },
  straight: {
    baseFrequency: 440, // Clean A4
    waveType: 'sine',
    volume: 0.1,
    attackTime: 0.01,
    releaseMultiplier: 0.8,
    gapMs: 0 // Single clean tone
  },
  supportive: {
    baseFrequency: 420, // Warm frequency
    waveType: 'triangle',
    volume: 0.11,
    attackTime: 0.02, // Gentle
    releaseMultiplier: 1.0,
    gapMs: 100
  }
};

// Notification type patterns (frequency multipliers)
const typePatterns: Record<NotificationType, number[]> = {
  budget_alert: [1, 0.75, 1], // Warning pattern
  warning: [1, 0.5, 1, 0.5, 1], // Urgent triple
  subscription: [1, 1.1, 1.2], // Ascending reminder
  achievement: [1, 1.25, 1.5, 2], // Victory fanfare
  tip: [1, 1.15], // Gentle double
  system: [1] // Simple blip
};

// Duration adjustments by type (in ms)
const typeDurations: Record<NotificationType, number> = {
  budget_alert: 140,
  warning: 120,
  subscription: 130,
  achievement: 100,
  tip: 110,
  system: 80
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
    waveType: OscillatorType,
    startTime: number,
    volume: number,
    attackTime: number,
    releaseMultiplier: number
  ) => {
    const ctx = getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    
    const durationSec = (duration * releaseMultiplier) / 1000;
    
    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + durationSec);
    
    return durationSec;
  }, [getAudioContext]);

  const playNotificationSound = useCallback((
    type: NotificationType,
    personality: PersonalityType = 'chill'
  ) => {
    if (isPlayingRef.current) return;
    
    try {
      const profile = personalitySounds[personality] || personalitySounds.chill;
      const pattern = typePatterns[type] || typePatterns.system;
      const baseDuration = typeDurations[type] || 100;
      
      const ctx = getAudioContext();
      
      // Resume audio context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      isPlayingRef.current = true;
      const now = ctx.currentTime;
      let offset = 0;
      
      // For "straight" personality, only play first note
      const notesToPlay = personality === 'straight' ? pattern.slice(0, 1) : pattern;
      
      notesToPlay.forEach((multiplier) => {
        const freq = profile.baseFrequency * multiplier;
        const durationSec = playTone(
          freq,
          baseDuration,
          profile.waveType,
          now + offset,
          profile.volume,
          profile.attackTime,
          profile.releaseMultiplier
        );
        offset += durationSec + (profile.gapMs / 1000);
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
