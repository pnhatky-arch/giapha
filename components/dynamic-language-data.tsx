'use client';

import { useEffect } from 'react';
import { text, type Language } from '@/lib/i18n';

const TARGET_LANGUAGES = new Set<Language>(['en', 'fr', 'zh', 'ru', 'ja', 'de']);
const CACHE_VERSION = 'v1';
const MAX_CACHE_ENTRIES = 250;
const BATCH_SIZE = 12;

const DYNAMIC_TEXT_SELECTORS = [
  '.system-name',
  '.login-push-notice strong',
  '.login-push-notice p',
  '.person-copy small',
  '.member-row small',
  '.member-profile-header p',
  '.member-profile-facts > div:nth-child(2) strong',
  '.materials-workspace .material-entry-title strong',
  '.materials-workspace .material-entry-copy > p:not(.empty-material-content)',
  '.family-work-item .event-copy strong',
  '.family-work-item .event-copy small',
  '.family-tomb-event .event-copy strong',
  '.family-tomb-event .event-copy small',
].join(',');

const DYNAMIC_ATTRIBUTE_SELECTORS: Array<[string, 'aria-label' | 'title']> = [
  ['.materials-workspace .material-entry-actions button[aria-label]', 'aria-label'],
  ['.material-media-delete[aria-label]', 'aria-label'],
  ['.event-editor-dialog [aria-label]', 'aria-label'],
  ['.tomb-event-dialog [aria-label]', 'aria-label'],
];

const VIETNAMESE_MARKS = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
const VIETNAMESE_WORDS = /\b(họ|hop|họp|ho|đầu|dau|năm|nam|nhà|nha|thờ|tho|mộ|mo|chi|trưởng|truong|con|cháu|chau|ngày|ngay|lễ|le|gia|phả|pha|tư|tu|liệu|lieu|ghi|chú|chu|nội|noi|dung|địa|dia|điểm|diem|sinh|mất|mat|kỵ|ky|chạp|chap|việc|viec|chuẩn|chuan|bị|bi|tập|tap|trung|thành|thanh|viên|vien|dòng|dong)\b/i;
const SKIP_VALUE = /^(?:https?:\/\/|www\.|\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$|[\d\s+().-]+$)/i;

type TranslationResponse = { translations?: Record<string, string> };
type AttributeState = { source: string; rendered?: string };

function currentLanguage(): Language {
  const value = document.documentElement.lang as Language;
  return value === 'vi' || TARGET_LANGUAGES.has(value) ? value : 'vi';
}

function cacheKey(language: Language) {
  return `gia-pha-dynamic-i18n-${CACHE_VERSION}:${language}`;
}

function loadCache(language: Language) {
  try {
    const parsed = JSON.parse(localStorage.getItem(cacheKey(language)) ?? '{}') as Record<string, unknown>;
    return new Map(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
  } catch {
    return new Map<string, string>();
  }
}

function saveCache(language: Language, cache: Map<string, string>) {
  try {
    const entries = [...cache.entries()].slice(-MAX_CACHE_ENTRIES);
    localStorage.setItem(cacheKey(language), JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Translation is an enhancement; storage quota errors must never affect the app.
  }
}

function shouldMachineTranslate(value: string) {
  const clean = value.trim();
  if (clean.length < 2 || clean.length > 700 || SKIP_VALUE.test(clean)) return false;
  return VIETNAMESE_MARKS.test(clean) || VIETNAMESE_WORDS.test(clean);
}

function canonicalSource(element: HTMLElement, value: string) {
  const clean = value.trim();

  if (element.matches('.person-copy small')) {
    const matched = clean.match(/^(.*?)\s*·\s*.*?(\d+)$/);
    if (matched?.[1] && shouldMachineTranslate(matched[1])) {
      return `${matched[1].trim()} · Đời thứ ${matched[2]}`;
    }
  }

  if (element.matches('.member-row small')) {
    const matched = clean.match(/^.*?(\d+)(?:\s*·\s*(.+))?$/);
    if (matched) {
      const role = matched[2]?.trim();
      return `Đời thứ ${matched[1]}${role ? ` · ${role}` : ''}`;
    }
  }

  return clean;
}

export default function DynamicLanguageData() {
  useEffect(() => {
    const textState = new WeakMap<HTMLElement, { source: string; rendered?: string }>();
    const attributeState = new WeakMap<Element, Map<string, AttributeState>>();
    const caches = new Map<Language, Map<string, string>>();
    const inFlight = new Set<string>();
    const retryAfter = new Map<string, number>();
    let frame = 0;
    let disposed = false;

    const cacheFor = (language: Language) => {
      let cache = caches.get(language);
      if (!cache) {
        cache = loadCache(language);
        caches.set(language, cache);
      }
      return cache;
    };

    const requestTranslations = async (language: Language, sources: string[]) => {
      if (!TARGET_LANGUAGES.has(language) || !sources.length) return;
      for (let offset = 0; offset < sources.length; offset += BATCH_SIZE) {
        const batch = sources.slice(offset, offset + BATCH_SIZE);
        const keys = batch.map((source) => `${language}\u0000${source}`);
        keys.forEach((key) => inFlight.add(key));
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ target: language, texts: batch }),
          });
          if (!response.ok) throw new Error(`translation ${response.status}`);
          const result = await response.json() as TranslationResponse;
          const cache = cacheFor(language);
          let changed = false;
          for (const source of batch) {
            const translated = result.translations?.[source]?.trim();
            if (translated && translated !== source) {
              cache.delete(source);
              cache.set(source, translated);
              changed = true;
            }
          }
          if (changed) saveCache(language, cache);
        } catch {
          const until = Date.now() + 30_000;
          keys.forEach((key) => retryAfter.set(key, until));
        } finally {
          keys.forEach((key) => inFlight.delete(key));
        }
      }
      if (!disposed) scheduleScan();
    };

    const unresolved = new Set<string>();

    const applyText = (element: HTMLElement, language: Language) => {
      if (element.children.length > 0) return;
      const current = (element.textContent ?? '').trim();
      if (!current) return;

      let state = textState.get(element);
      if (!state) {
        state = { source: canonicalSource(element, current) };
        textState.set(element, state);
      } else if (language !== 'vi' && current !== state.source && current !== state.rendered) {
        // React or an API refresh replaced the value while a foreign language is active.
        // Treat that as fresh canonical data so edits are translated immediately.
        state.source = canonicalSource(element, current);
        state.rendered = undefined;
      }

      if (language === 'vi') {
        if (state.rendered && current === state.rendered && state.source !== current) element.textContent = state.source;
        else if (current !== state.rendered) state.source = canonicalSource(element, current);
        state.rendered = undefined;
        return;
      }

      const source = state.source.trim();
      if (!source) return;
      const fixed = text(language, source);
      if (fixed !== source) {
        if (current !== fixed) element.textContent = fixed;
        state.rendered = fixed;
        return;
      }
      if (!shouldMachineTranslate(source)) return;

      const cached = cacheFor(language).get(source);
      if (cached) {
        if (current !== cached) element.textContent = cached;
        state.rendered = cached;
        return;
      }

      const key = `${language}\u0000${source}`;
      if (!inFlight.has(key) && (retryAfter.get(key) ?? 0) <= Date.now()) unresolved.add(source);
    };

    const applyAttribute = (element: Element, attribute: string, language: Language) => {
      const current = element.getAttribute(attribute)?.trim() ?? '';
      if (!current) return;
      let states = attributeState.get(element);
      if (!states) {
        states = new Map();
        attributeState.set(element, states);
      }
      let state = states.get(attribute);
      if (!state) {
        state = { source: current };
        states.set(attribute, state);
      } else if (language !== 'vi' && current !== state.source && current !== state.rendered) {
        state.source = current;
        state.rendered = undefined;
      }

      if (language === 'vi') {
        if (state.rendered && current === state.rendered && state.source !== current) element.setAttribute(attribute, state.source);
        else if (current !== state.rendered) state.source = current;
        state.rendered = undefined;
        return;
      }

      const source = state.source.trim();
      const fixed = text(language, source);
      if (fixed !== source) {
        if (current !== fixed) element.setAttribute(attribute, fixed);
        state.rendered = fixed;
        return;
      }
      if (!shouldMachineTranslate(source)) return;
      const cached = cacheFor(language).get(source);
      if (cached) {
        if (current !== cached) element.setAttribute(attribute, cached);
        state.rendered = cached;
        return;
      }
      const key = `${language}\u0000${source}`;
      if (!inFlight.has(key) && (retryAfter.get(key) ?? 0) <= Date.now()) unresolved.add(source);
    };

    const scan = () => {
      frame = 0;
      if (disposed) return;
      const language = currentLanguage();
      unresolved.clear();

      document.querySelectorAll<HTMLElement>(DYNAMIC_TEXT_SELECTORS).forEach((element) => applyText(element, language));
      for (const [selector, attribute] of DYNAMIC_ATTRIBUTE_SELECTORS) {
        document.querySelectorAll(selector).forEach((element) => applyAttribute(element, attribute, language));
      }

      if (language !== 'vi' && unresolved.size) {
        void requestTranslations(language, [...unresolved]);
      }
    };

    function scheduleScan() {
      if (disposed || frame) return;
      frame = window.requestAnimationFrame(scan);
    }

    const bodyObserver = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === 'childList' || mutation.type === 'characterData' || mutation.type === 'attributes')) scheduleScan();
    });
    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title'],
    });

    const languageObserver = new MutationObserver(scheduleScan);
    languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(`gia-pha-dynamic-i18n-${CACHE_VERSION}:`)) {
        caches.clear();
        scheduleScan();
      }
    };
    window.addEventListener('storage', handleStorage);
    scheduleScan();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      bodyObserver.disconnect();
      languageObserver.disconnect();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return null;
}
