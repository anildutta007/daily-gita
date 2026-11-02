import json
import asyncio
import os
import re
import edge_tts

def is_meaningful_commentary(text):
    if not text:
        return False
    clean = text.strip()
    lower = clean.lower()
    if (lower.startswith('no commentary') or 
        lower.startswith('there is no purport') or 
        lower.startswith('no purport') or 
        'no commentary for this verse' in lower):
        return False
    stripped = re.sub(r'[\s।.,:;_\-~`!]', '', clean)
    return len(stripped) > 3

async def generate_verse_audio(shloka, out_dir="public/audio/verses"):
    os.makedirs(out_dir, exist_ok=True)
    ch = shloka['chapter']
    v = shloka['verse']
    
    # 1. Hindi audio: Sanskrit + Hindi Bhavarth + Chintan (if present)
    hi_filename = f"{out_dir}/ch{ch}_v{v}_hi.mp3"
    if not os.path.exists(hi_filename):
        hi_parts = [shloka['sanskrit'], shloka['hindiMeaning']]
        if is_meaningful_commentary(shloka.get('commentaryHindi')):
            hi_parts.append(f"चिन्तन: {shloka['commentaryHindi']}")
        hi_text = "\n\n".join(hi_parts)
        
        try:
            comm_hi = edge_tts.Communicate(text=hi_text, voice="hi-IN-SwaraNeural", rate="-4%")
            await comm_hi.save(hi_filename)
            print(f"[HI] Saved {hi_filename}")
        except Exception as e:
            print(f"[HI Error] ch{ch}_v{v}: {e}")

    # 2. English audio: Sanskrit + English Translation + Inner Reflection (if present)
    en_filename = f"{out_dir}/ch{ch}_v{v}_en.mp3"
    if not os.path.exists(en_filename):
        en_parts = [shloka['sanskrit'], shloka['englishMeaning']]
        if is_meaningful_commentary(shloka.get('commentaryEnglish')):
            en_parts.append(f"Inner Reflection: {shloka['commentaryEnglish']}")
        en_text = "\n\n".join(en_parts)
        
        try:
            comm_en = edge_tts.Communicate(text=en_text, voice="en-IN-NeerjaExpressiveNeural", rate="-2%")
            await comm_en.save(en_filename)
            print(f"[EN] Saved {en_filename}")
        except Exception as e:
            print(f"[EN Error] ch{ch}_v{v}: {e}")

async def main(start_ch=1, end_ch=1):
    with open('src/data/shlokas.json', 'r', encoding='utf-8') as f:
        shlokas = json.load(f)
    print(f"Loaded {len(shlokas)} total shlokas.")
    
    filtered = [s for s in shlokas if start_ch <= s['chapter'] <= end_ch]
    print(f"Processing {len(filtered)} shlokas for Chapter {start_ch} to {end_ch}...")
    
    for idx, s in enumerate(filtered, 1):
        print(f"Generating ({idx}/{len(filtered)}): Ch {s['chapter']} Verse {s['verse']}...")
        await generate_verse_audio(s)
        await asyncio.sleep(0.2)

if __name__ == '__main__':
    # Generate Chapter 1 (47 verses)
    asyncio.run(main(1, 1))
