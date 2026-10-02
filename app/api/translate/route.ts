import { env } from 'cloudflare:workers';

const TRANSLATION_MODEL = '@cf/meta/m2m100-1.2b';
const SOURCE_LANGUAGE = 'vi';
const TARGET_LANGUAGES = new Set(['en', 'fr', 'zh', 'ru', 'ja', 'de']);
const MAX_TEXTS = 12;
const MAX_TEXT_LENGTH = 700;
const MAX_TOTAL_LENGTH = 5_000;

type AiTranslationResult = { translated_text?: string };
type AiBinding = {
  run: (
    model: string,
    input: { text: string; source_lang: string; target_lang: string },
  ) => Promise<AiTranslationResult>;
};

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return json({ message: 'Yêu cầu dịch phải dùng JSON.' }, 415);
  }

  let payload: { target?: unknown; texts?: unknown };
  try {
    payload = await request.json() as { target?: unknown; texts?: unknown };
  } catch {
    return json({ message: 'Dữ liệu dịch không hợp lệ.' }, 400);
  }

  const target = typeof payload.target === 'string' ? payload.target.trim().toLowerCase() : '';
  if (!TARGET_LANGUAGES.has(target)) {
    return json({ message: 'Ngôn ngữ đích không được hỗ trợ.' }, 400);
  }

  if (!Array.isArray(payload.texts) || payload.texts.length === 0 || payload.texts.length > MAX_TEXTS) {
    return json({ message: `Mỗi lần chỉ dịch từ 1 đến ${MAX_TEXTS} đoạn.` }, 400);
  }

  const texts = payload.texts.map((value) => typeof value === 'string' ? value.trim() : '');
  if (texts.some((value) => !value || value.length > MAX_TEXT_LENGTH)) {
    return json({ message: `Mỗi đoạn dịch phải có từ 1 đến ${MAX_TEXT_LENGTH} ký tự.` }, 400);
  }
  if (texts.reduce((total, value) => total + value.length, 0) > MAX_TOTAL_LENGTH) {
    return json({ message: 'Tổng dữ liệu dịch trong một lần quá lớn.' }, 400);
  }

  const uniqueTexts = [...new Set(texts)];
  const ai = (env as unknown as { AI?: AiBinding }).AI;
  if (!ai) return json({ message: 'Workers AI chưa được cấu hình cho hệ thống.' }, 503);

  const translatedEntries = await Promise.all(uniqueTexts.map(async (source) => {
    try {
      const result = await ai.run(TRANSLATION_MODEL, {
        text: source,
        source_lang: SOURCE_LANGUAGE,
        target_lang: target,
      });
      const translated = result?.translated_text?.trim();
      return translated ? [source, translated] as const : null;
    } catch {
      return null;
    }
  }));

  const translations: Record<string, string> = {};
  for (const entry of translatedEntries) {
    if (entry) translations[entry[0]] = entry[1];
  }

  return json({ target, translations });
}
