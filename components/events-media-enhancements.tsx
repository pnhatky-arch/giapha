'use client';

import { useEffect } from 'react';

type MediaKind = 'family' | 'tomb';
type EventImage = {
  id: string;
  eventId: string;
  kind: MediaKind;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  createdBy: string;
  url: string;
};

type EditContext = { kind: MediaKind; eventId: string | null };

const MAX_IMAGES = 8;
const MAX_UPLOAD_BYTES = 900_000;

function imageKey(kind: MediaKind, eventId: string) {
  return `${kind}:${eventId}`;
}

async function compressImage(file: File): Promise<File> {
  if (file.size <= 620_000) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Không đọc được ảnh ${file.name}.`));
      img.src = url;
    });
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không thể xử lý ảnh trên thiết bị này.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let quality = 0.82;
    let blob: Blob | null = null;
    while (quality >= 0.48) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= MAX_UPLOAD_BYTES) break;
      quality -= 0.1;
    }
    if (!blob) throw new Error(`Không thể nén ảnh ${file.name}.`);
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error(`Ảnh ${file.name} vẫn quá lớn sau khi nén.`);
    const base = file.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'image';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function EventsMediaEnhancements({ canEdit }: { canEdit: boolean }) {
  useEffect(() => {
    let currentContext: EditContext | null = null;
    let syncFrame = 0;
    let disposed = false;
    const media = new Map<string, EventImage[]>();
    const pending = new WeakMap<HTMLFormElement, File[]>();

    const listFor = (kind: MediaKind, eventId: string) => media.get(imageKey(kind, eventId)) ?? [];

    const setList = (kind: MediaKind, eventId: string, images: EventImage[]) => {
      media.set(imageKey(kind, eventId), images);
    };

    const loadKind = async (kind: MediaKind) => {
      try {
        const response = await fetch(`/api/events/media?kind=${kind}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as { images?: EventImage[] };
        for (const image of Array.isArray(data.images) ? data.images : []) {
          const current = listFor(kind, image.eventId);
          setList(kind, image.eventId, [...current, image]);
        }
      } catch {
        // Image attachment support is additive; event lists must remain usable if media loading fails.
      }
    };

    const cardSelector = (kind: MediaKind) => kind === 'family' ? '.family-work-item[data-event-id]' : '.family-tomb-event[data-event-id]';

    const renderCardImages = () => {
      (['family', 'tomb'] as MediaKind[]).forEach((kind) => {
        document.querySelectorAll<HTMLElement>(cardSelector(kind)).forEach((card) => {
          const eventId = card.dataset.eventId ?? '';
          if (!eventId) return;
          const images = listFor(kind, eventId);
          const signature = images.map((image) => image.id).join('|');
          let strip = card.querySelector<HTMLElement>('.event-image-strip');
          if (!images.length) {
            strip?.remove();
            return;
          }
          if (!strip) {
            strip = document.createElement('div');
            strip.className = 'event-image-strip';
            card.appendChild(strip);
          }
          if (strip.dataset.signature === signature) return;
          strip.dataset.signature = signature;
          strip.innerHTML = images.map((image) => `<a href="${image.url}" target="_blank" rel="noreferrer" aria-label="Mở ${image.name.replace(/"/g, '&quot;')}"><img src="${image.url}" alt="${image.name.replace(/"/g, '&quot;')}" loading="lazy"></a>`).join('');
        });
      });
    };

    const deleteImage = async (kind: MediaKind, eventId: string, image: EventImage) => {
      const response = await fetch('/api/events/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, eventId, imageId: image.id }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || 'Không thể xóa ảnh.');
      setList(kind, eventId, listFor(kind, eventId).filter((entry) => entry.id !== image.id));
      renderCardImages();
    };

    const renderEditorImages = (form: HTMLFormElement, holder: HTMLElement, kind: MediaKind, eventId: string | null) => {
      const existing = holder.querySelector<HTMLElement>('.event-media-existing');
      if (existing) {
        const images = eventId ? listFor(kind, eventId) : [];
        existing.innerHTML = '';
        images.forEach((image) => {
          const row = document.createElement('div');
          row.className = 'event-media-existing-item';
          row.innerHTML = `<img src="${image.url}" alt=""><span>${image.name}</span><button type="button" aria-label="Xóa ${image.name}">×</button>`;
          row.querySelector('button')?.addEventListener('click', async () => {
            if (!eventId || !window.confirm(`Xóa ảnh “${image.name}”?`)) return;
            try {
              await deleteImage(kind, eventId, image);
              renderEditorImages(form, holder, kind, eventId);
            } catch (error) {
              const message = form.querySelector<HTMLElement>('.event-editor-message,.tomb-form-message');
              if (message) message.textContent = error instanceof Error ? error.message : 'Không thể xóa ảnh.';
            }
          });
          existing.appendChild(row);
        });
      }

      const pendingWrap = holder.querySelector<HTMLElement>('.event-media-pending');
      if (pendingWrap) {
        pendingWrap.innerHTML = '';
        (pending.get(form) ?? []).forEach((file, index) => {
          const row = document.createElement('div');
          row.className = 'event-media-pending-item';
          const preview = URL.createObjectURL(file);
          row.innerHTML = `<img src="${preview}" alt=""><span>${file.name}</span><button type="button" aria-label="Bỏ ${file.name}">×</button>`;
          row.querySelector('img')?.addEventListener('load', () => URL.revokeObjectURL(preview), { once: true });
          row.querySelector('button')?.addEventListener('click', () => {
            pending.set(form, (pending.get(form) ?? []).filter((_, fileIndex) => fileIndex !== index));
            renderEditorImages(form, holder, kind, eventId);
          });
          pendingWrap.appendChild(row);
        });
      }
    };

    const injectMediaEditor = (form: HTMLFormElement) => {
      if (!canEdit || form.querySelector('.event-media-editor')) return;
      const kind: MediaKind = form.querySelector('[name="title"]') ? 'family' : 'tomb';
      const context = currentContext?.kind === kind ? currentContext : { kind, eventId: null };
      const eventId = context.eventId;
      form.dataset.mediaKind = kind;
      if (eventId) form.dataset.mediaEventId = eventId;

      const holder = document.createElement('div');
      holder.className = 'event-media-editor';
      holder.innerHTML = `
        <div class="event-media-editor-head"><strong>Hình ảnh</strong><small>Có thể chọn nhiều ảnh. Ảnh sẽ tự nén trước khi lưu.</small></div>
        <label class="event-media-pick"><span>+ Thêm hình ảnh</span><input type="file" accept="image/*" multiple></label>
        <div class="event-media-existing"></div>
        <div class="event-media-pending"></div>`;

      const repeat = form.querySelector('.event-editor-repeat,.tomb-repeat-field');
      if (repeat) repeat.insertAdjacentElement('beforebegin', holder);
      else form.appendChild(holder);

      const input = holder.querySelector<HTMLInputElement>('input[type="file"]');
      input?.addEventListener('change', () => {
        const chosen = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
        const existingCount = eventId ? listFor(kind, eventId).length : 0;
        const current = pending.get(form) ?? [];
        const room = Math.max(0, MAX_IMAGES - existingCount - current.length);
        const accepted = chosen.slice(0, room);
        pending.set(form, [...current, ...accepted]);
        if (chosen.length > accepted.length) {
          const message = form.querySelector<HTMLElement>('.event-editor-message,.tomb-form-message');
          if (message) message.textContent = `Mỗi sự kiện lưu tối đa ${MAX_IMAGES} ảnh.`;
        }
        input.value = '';
        renderEditorImages(form, holder, kind, eventId);
      });
      renderEditorImages(form, holder, kind, eventId);
    };

    const uploadPending = async (kind: MediaKind, eventId: string, files: File[], message: HTMLElement | null) => {
      for (let index = 0; index < files.length; index += 1) {
        if (message) message.textContent = `Đang xử lý ảnh ${index + 1}/${files.length}…`;
        const compressed = await compressImage(files[index]);
        const form = new FormData();
        form.append('kind', kind);
        form.append('eventId', eventId);
        form.append('file', compressed);
        const response = await fetch('/api/events/media', { method: 'POST', body: form });
        const result = await response.json().catch(() => ({})) as { image?: EventImage; message?: string };
        if (!response.ok) throw new Error(result.message || `Không thể tải ảnh ${compressed.name}.`);
        if (result.image) setList(kind, eventId, [...listFor(kind, eventId), result.image]);
      }
    };

    const submitOverride = async (submitEvent: SubmitEvent) => {
      const form = submitEvent.target instanceof HTMLFormElement ? submitEvent.target : null;
      if (!form || (!form.classList.contains('event-editor-form') && !form.classList.contains('tomb-event-form'))) return;
      submitEvent.preventDefault();
      submitEvent.stopImmediatePropagation();

      const kind = (form.dataset.mediaKind || (form.querySelector('[name="title"]') ? 'family' : 'tomb')) as MediaKind;
      const eventId = form.dataset.mediaEventId || '';
      const data = new FormData(form);
      const message = form.querySelector<HTMLElement>('.event-editor-message,.tomb-form-message');
      const save = form.querySelector<HTMLButtonElement>('.event-editor-save,.tomb-save');
      if (save) save.disabled = true;
      if (message) message.textContent = 'Đang lưu sự kiện…';

      const payload = kind === 'family'
        ? {
            ...(eventId ? { id: eventId } : {}),
            title: String(data.get('title') ?? ''),
            date: String(data.get('date') ?? ''),
            location: String(data.get('location') ?? ''),
            note: String(data.get('note') ?? ''),
            repeatYearly: data.get('repeatYearly') === 'on',
          }
        : {
            ...(eventId ? { id: eventId } : {}),
            date: String(data.get('date') ?? ''),
            location: String(data.get('location') ?? ''),
            branch: String(data.get('branch') ?? ''),
            note: String(data.get('note') ?? ''),
            repeatYearly: data.get('repeatYearly') === 'on',
          };

      try {
        const endpoint = kind === 'family' ? '/api/events/family' : '/api/events/chapa';
        const response = await fetch(endpoint, {
          method: eventId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({})) as { event?: { id?: string }; message?: string };
        if (!response.ok) throw new Error(result.message || 'Không thể lưu sự kiện.');
        const savedId = result.event?.id || eventId;
        if (!savedId) throw new Error('Không xác định được sự kiện vừa lưu.');
        await uploadPending(kind, savedId, pending.get(form) ?? [], message);
        if (message) message.textContent = 'Đã lưu sự kiện và hình ảnh.';
        window.setTimeout(() => window.location.reload(), 180);
      } catch (error) {
        if (message) message.textContent = error instanceof Error ? error.message : 'Không thể lưu sự kiện.';
        if (save) save.disabled = false;
      }
    };

    const clickContext = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const familyEdit = target.closest('.family-work-edit');
      if (familyEdit) {
        currentContext = { kind: 'family', eventId: familyEdit.closest<HTMLElement>('.family-work-item')?.dataset.eventId ?? null };
        return;
      }
      const tombEdit = target.closest('.tomb-edit');
      if (tombEdit) {
        currentContext = { kind: 'tomb', eventId: tombEdit.closest<HTMLElement>('.family-tomb-event')?.dataset.eventId ?? null };
        return;
      }
      const add = target.closest<HTMLElement>('.event-context-add,.tomb-event-add');
      if (add) {
        const action = add.dataset.action;
        currentContext = { kind: action === 'family' ? 'family' : 'tomb', eventId: null };
      }
    };

    const sync = () => {
      cancelAnimationFrame(syncFrame);
      syncFrame = requestAnimationFrame(() => {
        if (disposed) return;
        renderCardImages();
        document.querySelectorAll<HTMLFormElement>('.event-editor-form,.tomb-event-form').forEach(injectMediaEditor);
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', clickContext, true);
    document.addEventListener('submit', submitOverride, true);

    void Promise.all([loadKind('family'), loadKind('tomb')]).then(sync);
    sync();

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener('click', clickContext, true);
      document.removeEventListener('submit', submitOverride, true);
      cancelAnimationFrame(syncFrame);
      document.querySelectorAll('.event-image-strip,.event-media-editor').forEach((node) => node.remove());
    };
  }, [canEdit]);

  return <style>{`
    .events-view .event-image-strip{
      grid-column:2 / 4;display:flex;gap:6px;min-width:0;overflow-x:auto;padding-top:2px;scrollbar-width:none
    }
    .events-view .event-image-strip::-webkit-scrollbar{display:none}
    .events-view .event-image-strip a{flex:0 0 54px;width:54px;height:48px;overflow:hidden;border:1px solid #a8793d66;border-radius:7px;background:#240302}
    .events-view .event-image-strip img{display:block;width:100%;height:100%;object-fit:cover}

    .event-media-editor{grid-column:1 / -1;display:grid;gap:9px;padding:11px;border:1px solid #9f71365c;border-radius:10px;background:#21030299}
    .event-media-editor-head{display:grid;gap:3px}
    .event-media-editor-head strong{color:#e4c777;font-size:11px}
    .event-media-editor-head small{color:#9f866d;font-size:9px;line-height:1.4}
    .event-media-pick{display:flex!important;align-items:center!important;justify-content:center!important;min-height:38px!important;border:1px dashed #c9973f!important;border-radius:8px!important;background:#4a0a0770!important;color:#edcf7c!important;cursor:pointer}
    .event-media-pick input{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%)}
    .event-media-existing,.event-media-pending{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
    .event-media-existing:empty,.event-media-pending:empty{display:none}
    .event-media-existing-item,.event-media-pending-item{display:grid;grid-template-columns:44px minmax(0,1fr) 26px;align-items:center;gap:7px;min-width:0;padding:5px;border:1px solid #8c65345c;border-radius:8px;background:#310504}
    .event-media-existing-item img,.event-media-pending-item img{width:44px;height:38px;object-fit:cover;border-radius:5px;background:#180101}
    .event-media-existing-item span,.event-media-pending-item span{overflow:hidden;color:#cdb58a;font-size:9px;text-overflow:ellipsis;white-space:nowrap}
    .event-media-existing-item button,.event-media-pending-item button{display:grid;place-items:center;width:26px;height:26px;padding:0;border:1px solid #854b40;border-radius:6px;background:#420706;color:#e4a59b;font-size:16px}

    @media(max-width:740px){
      .events-view .event-image-strip a{flex-basis:50px;width:50px;height:44px}
      .event-media-existing,.event-media-pending{grid-template-columns:1fr}
    }
  `}</style>;
}
