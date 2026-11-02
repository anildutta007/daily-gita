import React, { useState, useEffect } from 'react';
import { ElevenLabsVoice } from '../types';
import { CURATED_ELEVENLABS_VOICES, fetchUserElevenLabsVoices } from '../data/elevenlabsVoices';
import { gitaSpeech } from '../utils/speech';
import { Sparkles, Key, Play, Pause, Check, Volume2, Shield } from 'lucide-react';

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKey?: string;
  currentVoiceId?: string;
  onSavePreferences: (apiKey: string, voiceId: string, engine: 'elevenlabs' | 'native') => void;
}

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  isOpen,
  onClose,
  currentApiKey = '',
  currentVoiceId = 'pNInz6obpgDQGcFmaJgB',
  onSavePreferences
}) => {
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [selectedVoiceId, setSelectedVoiceId] = useState(currentVoiceId);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>(CURATED_ELEVENLABS_VOICES);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [useElevenLabs, setUseElevenLabs] = useState(Boolean(currentApiKey));

  useEffect(() => {
    if (isOpen && currentApiKey) {
      loadCustomVoices(currentApiKey);
    }
  }, [isOpen]);

  const loadCustomVoices = async (key: string) => {
    if (!key.trim()) return;
    setIsLoadingVoices(true);
    try {
      const fetched = await fetchUserElevenLabsVoices(key);
      if (fetched.length > 0) {
        setVoices(fetched);
      }
    } finally {
      setIsLoadingVoices(false);
    }
  };

  if (!isOpen) return null;

  const handlePreviewVoice = async (voice: ElevenLabsVoice) => {
    if (previewingVoiceId === voice.id) {
      gitaSpeech.cancel();
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);

    try {
      if (voice.previewUrl) {
        await gitaSpeech.playAudioSample(voice.previewUrl);
      } else if (apiKey.trim()) {
        // Generate live sample from ElevenLabs
        await gitaSpeech.speak({
          text: `Om Namo Bhagavate Vasudevaya. Welcome to the Bhagavad Gita. I am ${voice.name}, reciting sacred wisdom for you.`,
          lang: 'en',
          elevenLabsApiKey: apiKey,
          elevenLabsVoiceId: voice.id
        });
      } else {
        // Fallback local sample
        await gitaSpeech.speak({
          text: `This is a preview of the ${voice.name} voice. Please add your ElevenLabs API key to enable high-fidelity generation.`,
          lang: 'en',
          gender: voice.gender
        });
      }
    } catch (e) {
      console.warn('Voice preview error:', e);
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  const handleSave = () => {
    gitaSpeech.cancel();
    onSavePreferences(
      apiKey.trim(),
      selectedVoiceId,
      useElevenLabs && apiKey.trim() ? 'elevenlabs' : 'native'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#220a0a] to-[#140505] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-amber-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 shadow-md shadow-amber-500/20">
              <div className="w-full h-full bg-[#1b0707] rounded-[14px] flex items-center justify-center text-amber-300">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-amber-200">
                ElevenLabs Studio Audio Voices
              </h2>
              <p className="text-xs text-amber-300/70">
                Choose ultra-realistic human voices for sacred shloka recitation and reflection
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              gitaSpeech.cancel();
              onClose();
            }}
            className="text-amber-400/80 hover:text-amber-200 text-xl font-bold p-2"
          >
            ✕
          </button>
        </div>

        {/* API Key Input Section */}
        <div className="pt-4 pb-2">
          <div className="p-4 rounded-2xl bg-[#190606] border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>Your ElevenLabs API Key</span>
              </label>
              <span className="text-[10px] text-amber-400/70 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Stored locally in your browser
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#280c0c] border border-amber-700/60 text-xs text-amber-100 placeholder-amber-400/30 focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                type="button"
                onClick={() => loadCustomVoices(apiKey)}
                disabled={isLoadingVoices || !apiKey.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-40"
              >
                {isLoadingVoices ? 'Loading...' : 'Load My Voices'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useElevenLabsToggle"
                checked={useElevenLabs}
                onChange={(e) => setUseElevenLabs(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <label htmlFor="useElevenLabsToggle" className="text-xs text-amber-200/90 cursor-pointer">
                Enable ElevenLabs voices for recitation (Unchecked uses fast built-in neural voice)
              </label>
            </div>
          </div>
        </div>

        {/* Voice Selection List with Preview Audio Buttons */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400/80 mb-1">
            Select Voice & Listen to Sample ({voices.length} Available):
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {voices.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              const isPreviewing = previewingVoiceId === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoiceId(voice.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 shadow-md'
                      : 'bg-[#180505] border-amber-900/60 hover:border-amber-700/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-amber-200 flex items-center gap-1.5">
                        {voice.gender === 'male' ? '🧔' : '👩'} {voice.name}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40">
                        {voice.category}
                      </span>
                    </div>

                    <p className="text-xs text-amber-300/70 line-clamp-2 leading-relaxed">
                      {voice.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-900/40">
                    {/* Listen preview button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewVoice(voice);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        isPreviewing
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {isPreviewing ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen Sample</span>
                        </>
                      )}
                    </button>

                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                        <Check className="w-3.5 h-3.5" /> Active Voice
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-amber-900/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              gitaSpeech.cancel();
              onClose();
            }}
            className="px-5 py-2.5 rounded-full border border-amber-700/50 text-amber-300 text-xs font-semibold hover:bg-[#200808]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-7 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/30 transition-all transform active:scale-95"
          >
            Save & Apply Voice
          </button>
        </div>

      </div>
    </div>
  );
};
