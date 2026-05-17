import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30; // seconds
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey && !openrouterKey) {
    return NextResponse.json(
      { error: 'No AI API key configured' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { image, lang } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/[^;]+;base64,/, '');
    const mimeMatch = image.match(/^data:(image\/[^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const prompt = lang === 'ru'
      ? `Это фото рукописных заметок или планов. Извлеки из фото список задач.
Верни ТОЛЬКО JSON-массив без каких-либо пояснений. Формат:
[{"text": "текст задачи", "priority": "normal", "timeHint": null}]
Поле priority: "critical", "important" или "normal".
Поле timeHint: строка "HH:MM" если указано время, иначе null.`
      : `This is a photo of handwritten notes or plans. Extract tasks from the photo.
Return ONLY a JSON array with no explanations. Format:
[{"text": "task text", "priority": "normal", "timeHint": null}]
priority field: "critical", "important" or "normal".
timeHint field: string "HH:MM" if time is mentioned, otherwise null.`;

    let lastError = '';

    // --- Try Gemini Direct API FIRST (Vercel servers are not geo-blocked) ---
    if (apiKey) {
      const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
      for (const model of models) {
        try {
          console.log(`[photo] Trying Gemini Direct: ${model}`);
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: base64Data } },
                ]}],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
              }),
            }
          );

          if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            lastError = `${model}: HTTP ${response.status} - ${errBody.substring(0, 200)}`;
            console.error('[photo]', lastError);
            continue;
          }

          const data = await response.json();
          const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          console.log('[photo] Gemini response:', textContent.substring(0, 200));
          const result = parseTasksFromText(textContent);
          if (result) return NextResponse.json({ tasks: result });
          lastError = `${model}: no tasks parsed from: ${textContent.substring(0, 100)}`;
        } catch (e) {
          lastError = `${model}: ${String(e)}`;
          continue;
        }
      }
    }

    // --- Fallback: OpenRouter ---
    if (openrouterKey) {
      try {
        console.log('[photo] Trying OpenRouter fallback...');
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-001',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
              ],
            }],
            temperature: 0.1,
            max_tokens: 1024,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const textContent = data.choices?.[0]?.message?.content || '';
          console.log('[photo] OpenRouter response:', textContent.substring(0, 200));
          const result = parseTasksFromText(textContent);
          if (result) return NextResponse.json({ tasks: result });
          lastError = 'OpenRouter: no tasks parsed';
        } else {
          const errBody = await response.text().catch(() => '');
          lastError = `OpenRouter: HTTP ${response.status} - ${errBody.substring(0, 200)}`;
          console.error('[photo]', lastError);
        }
      } catch (e) {
        lastError = `OpenRouter: ${String(e)}`;
      }
    }


    return NextResponse.json(
      { error: lang === 'ru' ? `Не удалось распознать: ${lastError}` : `Recognition failed: ${lastError}` },
      { status: 500 }
    );
  } catch (error) {
    console.error('Photo parse error:', error);
    return NextResponse.json({ error: `Server error: ${String(error)}` }, { status: 500 });
  }
}

function parseTasksFromText(text: string): Array<{text: string; priority: string; timeHint: string | null}> | null {
  try {
    // Strip markdown code block wrappers
    let cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();
    
    // Find the JSON array - use greedy match to get the full array
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    
    const tasks = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(tasks) || tasks.length === 0) return null;
    return tasks;
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
}
