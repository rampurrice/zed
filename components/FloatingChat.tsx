import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Modality, type LiveSession, type LiveServerMessage, type Blob } from '@google/genai';

import { ChatBubbleOvalLeftEllipsisIcon } from './icons/ChatBubbleOvalLeftEllipsisIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';
import { SparklesIcon } from './icons/SparklesIcon';

// --- Audio Helper Functions (as per @google/genai guidelines) ---
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

interface Transcript {
  id: string;
  user: string;
  ai: string;
}

export const FloatingChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const outputSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartTimeRef = useRef(0);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopSession = useCallback(async () => {
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
        sessionPromiseRef.current = null;
    }
    
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
    }
    
    setIsRecording(false);
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setIsRecording(true);
    
    const ai = new GoogleGenAI({apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY });
    
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    sessionPromiseRef.current = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        systemInstruction: 'You are a friendly and helpful ZED consultancy assistant. Keep your answers concise and to the point.',
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: async () => {
          try {
            if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
              inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            }
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            
            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          } catch (err: any) {
            setError(`Microphone access was denied: ${err.message}`);
            stopSession();
          }
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
          }
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
          }
          if (message.serverContent?.turnComplete) {
            const fullInput = currentInputTranscriptionRef.current;
            const fullOutput = currentOutputTranscriptionRef.current;
            if (fullInput.trim() || fullOutput.trim()) {
                setTranscripts(prev => [...prev, { id: Date.now().toString(), user: fullInput, ai: fullOutput }]);
            }
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
          if (base64Audio && outputAudioContextRef.current) {
            const oac = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, oac.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), oac, 24000, 1);
            const source = oac.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(oac.destination);
            source.addEventListener('ended', () => outputSourcesRef.current.delete(source));
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            outputSourcesRef.current.add(source);
          }
        },
        onerror: (e: ErrorEvent) => {
          setError(`Session error: ${e.message}`);
          stopSession();
        },
        onclose: () => {
          console.debug('Session closed.');
        },
      },
    });
  }, [stopSession]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);
  
  const handleToggleRecording = () => {
    if (isRecording) {
      stopSession();
    } else {
      startSession();
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle AI Assistant"
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={isOpen ? 'close' : 'open'}
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {isOpen ? <XMarkIcon className="h-7 w-7" /> : <ChatBubbleOvalLeftEllipsisIcon className="h-7 w-7" />}
            </motion.div>
          </AnimatePresence>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 right-6 z-40 w-full max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700"
          >
            <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <SparklesIcon className="w-5 h-5 mr-2 text-primary-500"/>
                  AI Voice Assistant
              </h3>
            </header>
            <div className="p-4 h-80 overflow-y-auto space-y-4">
               {transcripts.map(t => (
                <div key={t.id}>
                    {t.user && <div className="text-sm p-3 bg-slate-100 dark:bg-slate-700 rounded-lg max-w-xs ml-auto"><strong className="dark:text-slate-200">You:</strong> {t.user}</div>}
                    {t.ai && <div className="text-sm p-3 bg-primary-50 dark:bg-primary-500/10 rounded-lg max-w-xs mt-2"><strong className="dark:text-slate-200">AI:</strong> {t.ai}</div>}
                </div>
               ))}
               {!isRecording && transcripts.length === 0 && (
                 <div className="text-center text-slate-500 dark:text-slate-400 h-full flex flex-col items-center justify-center">
                    <MicrophoneIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <p className="font-semibold">Press the microphone to start.</p>
                </div>
               )}
            </div>
             {error && <div className="px-4 pb-2 text-xs text-red-600 dark:text-red-400">{error}</div>}
            <footer className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-center items-center">
                <motion.button
                    onClick={handleToggleRecording}
                    className={`p-4 rounded-full transition-colors ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-600 hover:bg-primary-700'} text-white shadow-lg`}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
                >
                    {isRecording ? <StopIcon className="h-6 w-6" /> : <MicrophoneIcon className="h-6 w-6" />}
                </motion.button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};