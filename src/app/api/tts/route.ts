import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Available voices for the app
const VOICES: Record<string, { name: string; lang: string }> = {
  // Russian voices (only 2 available in Edge TTS)
  'ru-svetlana': { name: 'ru-RU-SvetlanaNeural', lang: 'ru-RU' },
  'ru-dmitry': { name: 'ru-RU-DmitryNeural', lang: 'ru-RU' },
  // English voices
  'en-jenny': { name: 'en-US-JennyNeural', lang: 'en-US' },
  'en-guy': { name: 'en-US-GuyNeural', lang: 'en-US' },
  'en-aria': { name: 'en-US-AriaNeural', lang: 'en-US' },
  'en-sara': { name: 'en-GB-SoniaNeural', lang: 'en-GB' },
};

// Simple in-memory cache (survives between requests in dev/prod)
const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 50;

function getCacheKey(text: string, voice: string): string {
  return `${voice}:${text}`;
}

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'ru-svetlana', rate, pitch } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Limit text length for safety
    const cleanText = text.slice(0, 500);

    // Check cache first
    const cacheKey = getCacheKey(cleanText, voice);
    const cached = audioCache.get(cacheKey);
    if (cached) {
      return new NextResponse(new Uint8Array(cached), {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
          'X-Cache': 'HIT',
        },
      });
    }

    // Resolve voice
    const voiceConfig = VOICES[voice] || VOICES['ru-svetlana'];

    // Generate TTS
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voiceConfig.name,
      OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3
    );

    const { audioStream } = tts.toStream(cleanText, {
      rate: rate || '+10%',
      pitch: pitch || '+0Hz',
    });

    // Collect audio data from stream
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      audioStream.on('end', () => resolve());
      audioStream.on('close', () => resolve());
      audioStream.on('error', (err: Error) => reject(err));
    });

    const audioBuffer = Buffer.concat(chunks);

    // Cache the result
    if (audioCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = audioCache.keys().next().value;
      if (firstKey) audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, audioBuffer);

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: 'TTS generation failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET() {
  const voiceList = Object.entries(VOICES).map(([id, config]) => ({
    id,
    name: config.name,
    lang: config.lang,
    label: getVoiceLabel(id),
  }));

  return NextResponse.json({ voices: voiceList });
}

function getVoiceLabel(id: string): { ru: string; en: string } {
  const labels: Record<string, { ru: string; en: string }> = {
    'ru-svetlana': { ru: '🇷🇺 Светлана (жен.)', en: '🇷🇺 Svetlana (female)' },
    'ru-dmitry': { ru: '🇷🇺 Дмитрий (муж.)', en: '🇷🇺 Dmitry (male)' },
    'en-jenny': { ru: '🇺🇸 Дженни (жен.)', en: '🇺🇸 Jenny (female)' },
    'en-guy': { ru: '🇺🇸 Гай (муж.)', en: '🇺🇸 Guy (male)' },
    'en-aria': { ru: '🇺🇸 Ария (жен.)', en: '🇺🇸 Aria (female)' },
    'en-sara': { ru: '🇬🇧 Соня (жен.)', en: '🇬🇧 Sonia (female)' },
  };
  return labels[id] || { ru: id, en: id };
}
