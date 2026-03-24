import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured. Add it to .env.local' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { image, lang } = body;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Remove data URL prefix if present
    const base64Data = image.replace(/^data:image\/[^;]+;base64,/, '');

    // Detect mime type from data URL
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

    // Try multiple models in order of preference
    const models = ['gemini-2.5-flash-preview-05-20', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest'];

    let lastError = '';

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Model ${model} error (${response.status}):`, errorText.substring(0, 200));
          lastError = `${model}: HTTP ${response.status}`;
          continue; // Try next model
        }

        const data = await response.json();
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`Model ${model} response:`, textContent.substring(0, 200));

        // Extract JSON from the response
        const jsonMatch = textContent.match(/\[[\s\S]*?\]/);
        if (!jsonMatch) {
          console.error('No JSON found in response:', textContent.substring(0, 200));
          lastError = 'No tasks found in AI response';
          continue;
        }

        const tasks = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(tasks) || tasks.length === 0) {
          lastError = 'Empty task list';
          continue;
        }

        return NextResponse.json({ tasks });
      } catch (modelError) {
        console.error(`Model ${model} failed:`, modelError);
        lastError = `${model}: ${String(modelError)}`;
        continue;
      }
    }

    return NextResponse.json(
      { error: lang === 'ru' ? `Не удалось распознать: ${lastError}` : `Recognition failed: ${lastError}` },
      { status: 500 }
    );
  } catch (error) {
    console.error('Photo parse error:', error);
    return NextResponse.json(
      { error: `Server error: ${String(error)}` },
      { status: 500 }
    );
  }
}
