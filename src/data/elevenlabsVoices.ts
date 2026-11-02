import { ElevenLabsVoice } from '../types';

export const CURATED_ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    gender: 'male',
    category: 'Deep / Resonant Narration',
    description: 'Deep, serene, authoritative masculine voice. Ideal for philosophical scriptures and solemn chants.'
  },
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    gender: 'female',
    category: 'Calm & Meditative',
    description: 'Gentle, balanced, comforting feminine voice with a warm and peaceful cadence.'
  },
  {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    gender: 'male',
    category: 'Warm Spiritual Storyteller',
    description: 'Distinguished, warm British-accented voice that gives profound weight to inner reflection.'
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    gender: 'female',
    category: 'Devotional & Melodic',
    description: 'Soft, lyrical voice, beautifully suited for Sanskrit chants and poetic translations.'
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    gender: 'male',
    category: 'Clear & Focused Guide',
    description: 'Clear, modern, engaging voice with excellent diction for complex philosophical ideas.'
  },
  {
    id: 'XB0fDUnXU5powFXDhCwa',
    name: 'Charlotte',
    gender: 'female',
    category: 'Graceful & Mindful',
    description: 'Graceful, calming tone that fosters deep stillness and contemplation.'
  }
];

export async function fetchUserElevenLabsVoices(apiKey: string): Promise<ElevenLabsVoice[]> {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey.trim()
      }
    });
    if (!res.ok) {
      throw new Error(`ElevenLabs API error: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.voices && Array.isArray(data.voices)) {
      return data.voices.map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        gender: (v.labels?.gender?.toLowerCase() === 'female' ? 'female' : 'male') as 'male' | 'female',
        category: v.category || 'Custom / Cloned',
        previewUrl: v.preview_url,
        description: v.labels?.accent || v.labels?.description || `${v.labels?.gender || 'Voice'} • ${v.labels?.age || 'Standard'}`
      }));
    }
    return CURATED_ELEVENLABS_VOICES;
  } catch (err) {
    console.warn('Failed to fetch ElevenLabs voices with provided API key, falling back to curated voices', err);
    return CURATED_ELEVENLABS_VOICES;
  }
}
