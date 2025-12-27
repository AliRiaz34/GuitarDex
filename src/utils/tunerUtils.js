import { useState, useRef, useEffect, useCallback } from 'react';
import { YIN } from 'pitchfinder';

// Chromatic scale (matches EditView.jsx pattern)
export const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Standard tuning base frequencies (open strings, no capo)
const STANDARD_TUNING_BASE = {
  0: { note: 'E', octave: 2, freq: 82.41 },   // Low E (6th string)
  1: { note: 'A', octave: 2, freq: 110.00 },  // A (5th string)
  2: { note: 'D', octave: 3, freq: 146.83 },  // D (4th string)
  3: { note: 'G', octave: 3, freq: 196.00 },  // G (3rd string)
  4: { note: 'B', octave: 3, freq: 246.94 },  // B (2nd string)
  5: { note: 'E', octave: 4, freq: 329.63 },  // High E (1st string)
};

/**
 * Calculate semitone difference between two notes
 */
export function getSemitoneDifference(fromNote, toNote) {
  const fromIndex = CHROMATIC_SCALE.indexOf(fromNote);
  const toIndex = CHROMATIC_SCALE.indexOf(toNote);

  if (fromIndex === -1 || toIndex === -1) return 0;

  let diff = toIndex - fromIndex;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;

  return diff;
}

/**
 * Calculate target frequency for a string with custom tuning and capo
 */
export function calculateStringFrequency(stringIndex, targetNote, capo = 0) {
  const standardString = STANDARD_TUNING_BASE[stringIndex];
  const tuningShift = getSemitoneDifference(standardString.note, targetNote);
  const totalShift = tuningShift + capo;
  const frequency = standardString.freq * Math.pow(2, totalShift / 12);

  return {
    frequency: Math.round(frequency * 100) / 100,
    note: targetNote,
    stringIndex,
  };
}

/**
 * Generate all target frequencies for a song's tuning with capo
 */
export function calculateTargetFrequencies(tuning, capo = 0) {
  if (!tuning || tuning.length !== 6) {
    tuning = ['E', 'A', 'D', 'G', 'B', 'E'];
  }

  return tuning.map((note, index) => calculateStringFrequency(index, note, capo));
}

/**
 * Calculate cents difference between detected and target frequency
 */
export function calculateCents(detected, target) {
  if (!detected || !target || target === 0) return 0;
  return Math.round(1200 * Math.log2(detected / target));
}

/**
 * Find the closest target string to a detected frequency
 */
export function findClosestString(detectedFreq, targetFrequencies) {
  if (!detectedFreq || !targetFrequencies?.length) {
    return { closest: null, centsOff: 0 };
  }

  let closest = null;
  let minCentsDiff = Infinity;

  for (const target of targetFrequencies) {
    const cents = Math.abs(calculateCents(detectedFreq, target.frequency));
    if (cents < minCentsDiff) {
      minCentsDiff = cents;
      closest = target;
    }
  }

  const centsOff = closest ? calculateCents(detectedFreq, closest.frequency) : 0;
  return { closest, centsOff };
}

/**
 * Get tuning status based on cents off
 */
export function getTuningStatus(centsOff) {
  const absCents = Math.abs(centsOff);
  if (absCents <= 5) return 'in-tune';
  if (absCents <= 15) return 'close';
  return 'out-of-tune';
}

/**
 * Convert frequency to note name (e.g., 440 -> 'A')
 */
export function frequencyToNote(frequency) {
  if (!frequency || frequency <= 0) return null;

  // A4 = 440 Hz, MIDI note 69
  const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
  const noteIndex = ((midiNote % 12) + 12) % 12; // Handle negative modulo
  return CHROMATIC_SCALE[noteIndex];
}

/**
 * Custom hook for pitch detection using microphone
 */
export function useTuner(targetFrequencies) {
  const [isListening, setIsListening] = useState(false);
  const [detectedFrequency, setDetectedFrequency] = useState(null);
  const [detectedNote, setDetectedNote] = useState(null); // Actual note being played
  const [closestString, setClosestString] = useState(null); // Target string from song tuning
  const [centsOff, setCentsOff] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('checking'); // 'checking' | 'granted' | 'prompt' | 'denied'

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const rafIdRef = useRef(null);
  const detectPitchRef = useRef(null);

  const detectorRef = useRef(null);

  // Smoothing: keep last N frequency readings for averaging
  const frequencyHistoryRef = useRef([]);
  const SMOOTHING_SAMPLES = 10;
  const silenceCountRef = useRef(0);
  const SILENCE_THRESHOLD = 30; // Frames of silence before clearing display (~0.5 second)

  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !detectorRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(buffer);

    const frequency = detectorRef.current(buffer);

    if (frequency && frequency > 60 && frequency < 500) {
      // Reset silence counter on valid frequency
      silenceCountRef.current = 0;

      // Add to history for smoothing
      frequencyHistoryRef.current.push(frequency);
      if (frequencyHistoryRef.current.length > SMOOTHING_SAMPLES) {
        frequencyHistoryRef.current.shift();
      }

      // Calculate smoothed frequency (average of recent readings)
      const smoothedFreq = frequencyHistoryRef.current.reduce((a, b) => a + b, 0)
        / frequencyHistoryRef.current.length;

      setDetectedFrequency(Math.round(smoothedFreq));

      // Get the actual note being played from frequency
      const actualNote = frequencyToNote(smoothedFreq);
      setDetectedNote(actualNote);

      const { closest, centsOff: cents } = findClosestString(smoothedFreq, targetFrequencies);
      setClosestString(closest);
      // Round cents to nearest integer to reduce jitter
      setCentsOff(Math.round(cents));
    } else {
      // Increment silence counter
      silenceCountRef.current++;

      // Only clear display after sustained silence
      if (silenceCountRef.current > SILENCE_THRESHOLD) {
        frequencyHistoryRef.current = [];
        setDetectedFrequency(null);
        setDetectedNote(null);
        setClosestString(null);
        setCentsOff(0);
      }
    }

    rafIdRef.current = requestAnimationFrame(detectPitch);
  }, [targetFrequencies]);

  detectPitchRef.current = detectPitch;

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true, // Enable to boost weak signals on iOS
        }
      });

      mediaStreamRef.current = stream;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();

      // iOS Safari requires explicit resume after user interaction
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096; // Larger buffer for better low-freq detection on iOS

      // Initialize detector with actual sample rate
      detectorRef.current = YIN({
        sampleRate: audioContextRef.current.sampleRate,
        threshold: 0.05, // Lower threshold = more sensitive
      });

      // Add gain node to amplify weak signals (especially on iOS)
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 30; // Boost signal 30x for iOS

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(gainNode);
      gainNode.connect(analyserRef.current);

      setIsListening(true);
      setPermissionDenied(false);

      // Start detection loop
      rafIdRef.current = requestAnimationFrame(detectPitchRef.current);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setPermissionDenied(true);
      }
      console.error('Error accessing microphone:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // Clear frequency history
    frequencyHistoryRef.current = [];
    setIsListening(false);
    setDetectedFrequency(null);
    setClosestString(null);
    setCentsOff(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Stop when tab goes to background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isListening) {
        stopListening();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isListening, stopListening]);

  // Check permission status on mount
  useEffect(() => {
    async function checkPermission() {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' });
          setPermissionStatus(result.state); // 'granted', 'denied', or 'prompt'

          // Listen for permission changes
          result.onchange = () => {
            setPermissionStatus(result.state);
          };
        } else {
          // Permissions API not supported, assume we need to prompt
          setPermissionStatus('prompt');
        }
      } catch (err) {
        // Some browsers don't support microphone permission query
        setPermissionStatus('prompt');
      }
    }
    checkPermission();
  }, []);

  return {
    isListening,
    detectedFrequency,
    detectedNote,
    closestString,
    centsOff,
    permissionDenied,
    permissionStatus,
    startListening,
    stopListening,
  };
}
