'use client';

import { useLayoutEffect } from 'react';

const STORAGE_KEY = 'gia-pha-device-settings-v1';

type SettingsRecord = Record<string, unknown>;

function readDeviceSettings(): SettingsRecord {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as SettingsRecord : {};
  } catch {
    return {};
  }
}

function writeDeviceSettings(settings: SettingsRecord) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // The current React state still keeps the change for this session when storage is unavailable.
  }
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase();
  return 'GET';
}

export default function DeviceLocalSettings() {
  useLayoutEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const patchedFetch: typeof window.fetch = async (input, init) => {
      let url: URL;
      try {
        url = new URL(requestUrl(input), window.location.origin);
      } catch {
        return originalFetch(input, init);
      }

      if (url.origin !== window.location.origin || url.pathname !== '/api/admin/settings') {
        return originalFetch(input, init);
      }

      const method = requestMethod(input, init);

      if (method === 'PATCH') {
        let changes: SettingsRecord = {};
        try {
          if (typeof init?.body === 'string') {
            const parsed = JSON.parse(init.body);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) changes = parsed as SettingsRecord;
          }
        } catch {
          return new Response(JSON.stringify({ message: 'Dữ liệu cài đặt không hợp lệ.' }), {
            status: 400,
            headers: { 'content-type': 'application/json; charset=utf-8' },
          });
        }

        const settings = { ...readDeviceSettings(), ...changes };
        writeDeviceSettings(settings);
        return new Response(JSON.stringify({
          message: 'Đã lưu cài đặt trên thiết bị này.',
          settings,
          scope: 'device',
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'x-gia-pha-settings-scope': 'device',
          },
        });
      }

      if (method === 'GET') {
        const response = await originalFetch(input, init);
        if (!response.ok) return response;
        try {
          const payload = await response.clone().json() as { settings?: SettingsRecord } & SettingsRecord;
          const settings = { ...(payload.settings ?? {}), ...readDeviceSettings() };
          const headers = new Headers(response.headers);
          headers.set('content-type', 'application/json; charset=utf-8');
          headers.set('x-gia-pha-settings-scope', 'device');
          return new Response(JSON.stringify({ ...payload, settings, scope: 'device' }), {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        } catch {
          return response;
        }
      }

      return originalFetch(input, init);
    };

    window.fetch = patchedFetch;
    return () => {
      if (window.fetch === patchedFetch) window.fetch = originalFetch;
    };
  }, []);

  return null;
}
