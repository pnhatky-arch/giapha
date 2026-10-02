'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileArchive, FileText, Folder, FolderPlus, ImagePlus, Link2, Paperclip, Pencil, RefreshCw, Save, Trash2, Users, X } from 'lucide-react';
import { text, type Language } from '@/lib/i18n';
import { flattenFamily, type FamilyDataMode, type FamilyPerson } from '@/lib/family-tree';

type MaterialKind = 'folder' | 'note' | 'link';
type MaterialItem = {
  id: string;
  parent_id: string | null;
  kind: MaterialKind;
  title: string;
  content: string;
  created_by_username: string;
  updated_by_username: string;
  created_at: number;
  updated_at: number;
};

type MaterialMedia = {
  key: string;
  itemId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  uploadedBy: string;
  url: string;
};

type EditorState = { id?: string; kind: MaterialKind; title: string; content: string; parentId: string };
type Person = FamilyPerson;

const emptyEditor = (kind: MaterialKind): EditorState => ({ kind, title: '', content: '', parentId: '' });

function kindLabel(kind: MaterialKind) {
  return kind === 'folder' ? 'Thư mục' : kind === 'note' ? 'Nội dung' : 'Liên kết';
}

function KindIcon({ kind }: { kind: MaterialKind }) {
  return kind === 'folder' ? <Folder /> : kind === 'note' ? <FileText /> : <Link2 />;
}

function initials(person: Person) {
  return person.generation === 1 ? '祖' : person.name.split(' ').at(-1)?.charAt(0) ?? 'P';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function itemDescendants(items: MaterialItem[], rootId: string) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parent_id && ids.has(item.parent_id) && !ids.has(item.id)) {
        ids.add(item.id);
        changed = true;
      }
    }
  }
  return ids;
}

export default function MaterialsWorkspace({ family, language, dataMode, canEdit, onSelect }: { family: Person; language: Language; dataMode: FamilyDataMode; canEdit: boolean; onSelect: (person: Person) => void }) {
  const tx = (value: string) => text(language, value);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [media, setMedia] = useState<MaterialMedia[]>([]);
  const [mediaAvailable, setMediaAvailable] = useState(true);
  const [pendingMedia, setPendingMedia] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const members = useMemo(() => flattenFamily(family), [family]);

  const mediaByItem = useMemo(() => {
    const map = new Map<string, MaterialMedia[]>();
    for (const attachment of media) {
      const current = map.get(attachment.itemId) ?? [];
      current.push(attachment);
      map.set(attachment.itemId, current);
    }
    return map;
  }, [media]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [response, mediaResponse] = await Promise.all([
        fetch('/api/materials'),
        fetch('/api/materials/media', { cache: 'no-store' }),
      ]);
      const data = await response.json() as { items?: MaterialItem[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Không thể tải tư liệu.');
      setItems(Array.isArray(data.items) ? data.items : []);

      const mediaData = await mediaResponse.json().catch(() => ({ media: [] })) as { media?: MaterialMedia[]; message?: string };
      if (mediaResponse.ok) {
        setMedia(Array.isArray(mediaData.media) ? mediaData.media : []);
        setMediaAvailable(true);
      } else {
        setMedia([]);
        setMediaAvailable(false);
      }
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải tư liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const folders = useMemo(() => {
    const result: Array<{ id: string; label: string }> = [];
    const pending: Array<{ parentId: string | null; depth: number }> = [{ parentId: null, depth: 0 }];
    const excluded = editor?.id ? itemDescendants(items, editor.id) : new Set<string>();
    while (pending.length) {
      const current = pending.shift();
      if (!current) continue;
      const children = items.filter((item) => item.parent_id === current.parentId && item.kind === 'folder' && !excluded.has(item.id))
        .sort((left, right) => left.title.localeCompare(right.title, 'vi'));
      for (const folder of children) result.push({ id: folder.id, label: `${'— '.repeat(current.depth)}${folder.title}` });
      pending.unshift(...children.map((folder) => ({ parentId: folder.id, depth: current.depth + 1 })).reverse());
    }
    return result;
  }, [editor, items]);

  const startCreate = (kind: MaterialKind) => {
    setEditor(emptyEditor(kind));
    setPendingMedia([]);
    setMessage('');
    setError('');
  };

  const startEdit = (item: MaterialItem) => {
    setEditor({ id: item.id, kind: item.kind, title: item.title, content: item.content, parentId: item.parent_id ?? '' });
    setPendingMedia([]);
    setMessage('');
    setError('');
  };

  const addPendingMedia = (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (accepted.length !== files.length) setError('Chỉ nhận tệp hình ảnh hoặc video.');
    setPendingMedia((current) => [...current, ...accepted]);
  };

  const uploadPendingMedia = async (itemId: string, files: File[]) => {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setMessage(`Đang tải ${index + 1}/${files.length}: ${file.name}`);
      const form = new FormData();
      form.append('itemId', itemId);
      form.append('file', file);
      const response = await fetch('/api/materials/media', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) {
        setPendingMedia(files.slice(index));
        throw new Error(data.message ?? `Không thể tải ${file.name}.`);
      }
      setPendingMedia(files.slice(index + 1));
    }
  };

  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    const title = editor.title.trim();
    if (!title) { setError('Vui lòng nhập tiêu đề.'); return; }
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/materials', {
        method: editor.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...editor, title, content: editor.content.trim(), parentId: editor.parentId || null }),
      });
      const data = await response.json() as { item?: MaterialItem; message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Không thể lưu tư liệu.');
      const savedId = data.item?.id ?? editor.id;
      if (!savedId) throw new Error('Không xác định được tư liệu vừa lưu.');
      if (!editor.id) setEditor((current) => current ? { ...current, id: savedId } : current);
      if (pendingMedia.length) {
        if (!mediaAvailable) throw new Error('Kho ảnh/video R2 chưa được cấu hình. Tư liệu chữ đã được lưu; ảnh/video chưa được tải lên.');
        await uploadPendingMedia(savedId, pendingMedia);
      }
      setEditor(null);
      setPendingMedia([]);
      setMessage(editor.id ? 'Đã cập nhật tư liệu.' : 'Đã thêm tư liệu mới.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu tư liệu.');
    } finally {
      setBusy(false);
    }
  };

  const removeMedia = async (attachment: MaterialMedia) => {
    if (!window.confirm(`Xóa “${attachment.name}”?`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/materials/media', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: attachment.key, itemId: attachment.itemId }),
      });
      const data = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Không thể xóa ảnh/video.');
      setMedia((current) => current.filter((entry) => entry.key !== attachment.key));
      setMessage('Đã xóa ảnh/video.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể xóa ảnh/video.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: MaterialItem) => {
    const descendants = itemDescendants(items, item.id).size - 1;
    const suffix = descendants ? ` Thư mục này có ${descendants} mục bên trong cũng sẽ bị xóa.` : '';
    if (!window.confirm(`Xóa “${item.title}”?${suffix}`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/materials', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Không thể xóa tư liệu.');
      if (editor?.id === item.id) setEditor(null);
      setMessage('Đã xóa tư liệu và ảnh/video đi kèm.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể xóa tư liệu.');
    } finally {
      setBusy(false);
    }
  };

  const childrenOf = useCallback((parentId: string | null) => items.filter((item) => item.parent_id === parentId).sort((left, right) => {
    if (left.kind === 'folder' && right.kind !== 'folder') return -1;
    if (left.kind !== 'folder' && right.kind === 'folder') return 1;
    return left.title.localeCompare(right.title, 'vi');
  }), [items]);

  const renderMedia = (itemId: string) => {
    const attachments = mediaByItem.get(itemId) ?? [];
    if (!attachments.length) return null;
    return <div className="material-media-grid">{attachments.map((attachment) => <figure className="material-media-item" key={attachment.key}>
      {attachment.type.startsWith('video/') ? <video src={attachment.url} controls playsInline preload="metadata" /> : <a href={attachment.url} target="_blank" rel="noreferrer">{/* oxlint-disable-next-line next/no-img-element -- R2-hosted user material image. */}<img src={attachment.url} loading="lazy" alt={attachment.name} /></a>}
      <figcaption><span title={attachment.name}>{attachment.name}</span><small>{formatBytes(attachment.size)}</small></figcaption>
      {canEdit && <button type="button" className="material-media-delete" onClick={() => void removeMedia(attachment)} aria-label={`Xóa ${attachment.name}`} disabled={busy}><X /></button>}
    </figure>)}</div>;
  };

  const renderBranch = (parentId: string | null, depth = 0): React.ReactNode => childrenOf(parentId).map((item) => {
    const attachmentCount = mediaByItem.get(item.id)?.length ?? 0;
    return <li className={`material-entry ${item.kind}`} key={item.id}>
      <article>
        <span className="material-entry-icon"><KindIcon kind={item.kind} /></span>
        <div className="material-entry-copy">
          <div className="material-entry-title"><strong>{item.title}</strong><em>{kindLabel(item.kind)}</em>{attachmentCount > 0 && <em className="material-media-count"><Paperclip />{attachmentCount}</em>}</div>
          {item.kind === 'link' ? <a href={item.content} target="_blank" rel="noreferrer"><span>{item.content}</span><ExternalLink /></a> : item.content ? <p>{item.content}</p> : <p className="empty-material-content">{item.kind === 'folder' ? 'Chưa có mô tả cho thư mục này.' : 'Chưa có nội dung.'}</p>}
          {renderMedia(item.id)}
          <small>Cập nhật bởi @{item.updated_by_username} · {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(item.updated_at))}</small>
        </div>
        {canEdit && <div className="material-entry-actions"><button type="button" onClick={() => startEdit(item)} aria-label={`Sửa ${item.title}`} disabled={busy}><Pencil /></button><button type="button" className="material-delete" onClick={() => void remove(item)} aria-label={`Xóa ${item.title}`} disabled={busy}><Trash2 /></button></div>}
      </article>
      {item.kind === 'folder' && childrenOf(item.id).length > 0 && <ul className="material-nested" data-depth={depth + 1}>{renderBranch(item.id, depth + 1)}</ul>}
    </li>;
  });

  const editorMedia = editor?.id ? mediaByItem.get(editor.id) ?? [] : [];

  return <section className="materials-workspace">
    <header className="materials-heading"><div><h2>{tx('Tư liệu gia phả')}</h2><p>{tx('Không gian tư liệu chung, độc lập với cây gia phả và cài đặt hệ thống.')}</p></div><div className="view-chip"><FileArchive /> {items.length}</div></header>
    {canEdit ? <div className="materials-toolbar"><div><strong>Tạo tư liệu</strong><small>Chọn loại nội dung cần thêm vào kho chung.</small></div><div><button type="button" onClick={() => startCreate('folder')}><FolderPlus />Thư mục</button><button type="button" onClick={() => startCreate('note')}><FileText />Nội dung</button><button type="button" onClick={() => startCreate('link')}><Link2 />Liên kết</button></div></div> : <div className="materials-readonly"><Users /><span>Khách tham quan chỉ có thể xem tư liệu. Hãy đăng nhập bằng tài khoản nội bộ để thêm hoặc sửa.</span></div>}
    {editor && <form className="material-editor" onSubmit={submit}>
      <div className="material-editor-heading"><span><KindIcon kind={editor.kind} /></span><div><strong>{editor.id ? `Sửa ${kindLabel(editor.kind).toLocaleLowerCase('vi')}` : `Tạo ${kindLabel(editor.kind).toLocaleLowerCase('vi')}`}</strong><small>Có thể đính kèm nhiều ảnh và video.</small></div><button type="button" onClick={() => { setEditor(null); setPendingMedia([]); }} aria-label="Đóng biểu mẫu" disabled={busy}><X /></button></div>
      <div className="material-form-grid"><label>Loại tư liệu<select value={editor.kind} disabled={Boolean(editor.id)} onChange={(event) => setEditor((current) => current ? { ...current, kind: event.target.value as MaterialKind, content: current.kind === 'link' && event.target.value !== 'link' ? '' : current.content } : current)}><option value="folder">Thư mục</option><option value="note">Nội dung</option><option value="link">Liên kết</option></select></label><label>Thư mục chứa<select value={editor.parentId} onChange={(event) => setEditor((current) => current ? { ...current, parentId: event.target.value } : current)}><option value="">Thư mục gốc</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.label}</option>)}</select></label><label className="material-title-field">Tiêu đề<input value={editor.title} onChange={(event) => setEditor((current) => current ? { ...current, title: event.target.value } : current)} maxLength={120} required placeholder={editor.kind === 'folder' ? 'Ví dụ: Gia phả đời thứ 3' : editor.kind === 'link' ? 'Ví dụ: Thư viện ảnh của dòng họ' : 'Ví dụ: Ghi chép về nguồn gốc dòng họ'} /></label>
        {editor.kind === 'link' ? <label className="material-content-field">Địa chỉ liên kết<input value={editor.content} onChange={(event) => setEditor((current) => current ? { ...current, content: event.target.value } : current)} type="url" inputMode="url" placeholder="https://…" required /></label> : <label className="material-content-field">{editor.kind === 'folder' ? 'Mô tả thư mục' : 'Nội dung'}<textarea value={editor.content} onChange={(event) => setEditor((current) => current ? { ...current, content: event.target.value } : current)} maxLength={12000} placeholder={editor.kind === 'folder' ? 'Mô tả ngắn để mọi người dễ tìm tư liệu.' : 'Nhập nội dung ghi chép, dẫn giải hoặc thông tin muốn lưu.'} /></label>}
        <div className="material-media-picker">
          <div><strong>Hình ảnh & video</strong><small>Chọn nhiều file cùng lúc hoặc chọn thêm nhiều lần. Ứng dụng không đặt giới hạn số lượng file trên mỗi tư liệu.</small></div>
          <label className={`material-media-pick-button ${!mediaAvailable ? 'unavailable' : ''}`}><ImagePlus /><span>Thêm ảnh / video</span><input type="file" accept="image/*,video/*" multiple disabled={busy || !mediaAvailable} onChange={(event) => { addPendingMedia(event.currentTarget.files); event.currentTarget.value = ''; }} /></label>
          {!mediaAvailable && <p className="material-media-warning">Kho ảnh/video R2 chưa được cấu hình trên Worker.</p>}
          {editorMedia.length > 0 && <div className="material-editor-existing-media">{editorMedia.map((attachment) => <div key={attachment.key}><Paperclip /><span>{attachment.name}</span><small>{formatBytes(attachment.size)}</small><button type="button" onClick={() => void removeMedia(attachment)} aria-label={`Xóa ${attachment.name}`} disabled={busy}><X /></button></div>)}</div>}
          {pendingMedia.length > 0 && <div className="material-pending-media"><p>{pendingMedia.length} file chờ tải lên</p>{pendingMedia.map((file, index) => <div key={`${file.name}-${file.size}-${file.lastModified}-${index}`}><span>{file.type.startsWith('video/') ? 'VIDEO' : 'ẢNH'}</span><strong>{file.name}</strong><small>{formatBytes(file.size)}</small><button type="button" onClick={() => setPendingMedia((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Bỏ ${file.name}`} disabled={busy}><X /></button></div>)}</div>}
        </div>
      </div>
      <div className="material-editor-actions"><button type="submit" disabled={busy}><Save />{busy ? 'Đang lưu / tải media…' : editor.id ? 'Lưu thay đổi' : 'Tạo tư liệu'}</button><button type="button" onClick={() => { setEditor(null); setPendingMedia([]); }} disabled={busy}>Hủy</button></div>
    </form>}
    {(message || error) && <output className={`materials-feedback ${error ? 'error' : ''}`}>{error || message}</output>}
    <section className="materials-library" aria-label="Kho tư liệu chung"><div className="materials-library-heading"><div><h3>Kho tư liệu chung</h3><p>{loading ? 'Đang tải tư liệu…' : items.length ? `${items.length} mục đang được sắp xếp theo thư mục.` : 'Chưa có tư liệu nào. Hãy tạo thư mục hoặc nội dung đầu tiên.'}</p></div><button type="button" onClick={() => void refresh()} disabled={loading || busy} aria-label="Tải lại tư liệu"><RefreshCw /></button></div>{!loading && items.length > 0 && <ul className="materials-tree">{renderBranch(null)}</ul>}</section>
    <section className="materials-reference"><header><div><span>THAM CHIẾU</span><h3>Hồ sơ gia phả hiện có</h3><p>{dataMode === 'sample' ? 'Dữ liệu thử nghiệm được giữ riêng để tham khảo bố cục.' : 'Chọn thành viên để mở hồ sơ gia phả.'}</p></div><div className="view-chip"><Users /> {members.length}</div></header><div>{members.map((member) => <button type="button" key={member.id} onClick={() => onSelect(member)}><span className="material-reference-avatar">{member.avatar ? <>{/* oxlint-disable-next-line next/no-img-element -- validated member avatar data is rendered as a small reference image. */}<img src={member.avatar} alt="" /></> : initials(member)}</span><span><strong>{member.name}</strong><small>Đời thứ {member.generation}{member.role ? ` · ${member.role}` : ''}</small></span></button>)}</div></section>
    <style>{`
      .material-media-picker{grid-column:1/-1;display:grid;gap:10px;padding:12px;border:1px solid #a879384f;border-radius:11px;background:#21030288}.material-media-picker>div:first-child{display:grid;gap:3px}.material-media-picker>div:first-child strong{color:#e8c875;font-size:12px}.material-media-picker>div:first-child small{color:#a98e72;font-size:10px;line-height:1.45}.material-media-pick-button{display:flex!important;align-items:center;justify-content:center;gap:8px;min-height:40px;border:1px dashed #d4a33f!important;border-radius:9px;background:#5a0c087a;color:#f0d17c!important;cursor:pointer}.material-media-pick-button svg{width:17px}.material-media-pick-button input{display:none}.material-media-pick-button.unavailable{opacity:.5;cursor:not-allowed}.material-media-warning{margin:0;color:#e7a88c;font-size:10px}.material-pending-media,.material-editor-existing-media{display:grid;gap:6px}.material-pending-media>p{margin:0;color:#c2a36e;font-size:10px}.material-pending-media>div,.material-editor-existing-media>div{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:7px;padding:7px 8px;border:1px solid #90642d45;border-radius:8px;background:#310504}.material-pending-media>div>span{padding:3px 5px;border:1px solid #a77836;border-radius:5px;color:#d4af65;font-size:8px}.material-pending-media strong,.material-editor-existing-media span{overflow:hidden;color:#dbc38e;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.material-pending-media small,.material-editor-existing-media small{color:#8f765e;font-size:9px}.material-pending-media button,.material-editor-existing-media button{display:grid;place-items:center;width:25px;height:25px;padding:0;border:1px solid #78453c;border-radius:6px;background:#430705;color:#d99b91}.material-pending-media button svg,.material-editor-existing-media button svg{width:12px}.material-editor-existing-media>div>svg{width:13px;color:#c89d4d}.material-media-count{display:inline-flex!important;align-items:center;gap:3px}.material-media-count svg{width:10px;height:10px}.material-media-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:6px 0 3px}.material-media-item{position:relative;min-width:0;margin:0;overflow:hidden;border:1px solid #9d713a4f;border-radius:8px;background:#180202}.material-media-item>a{display:block!important;padding:0!important;text-decoration:none!important}.material-media-item img,.material-media-item video{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#120101}.material-media-item figcaption{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px;padding:5px 6px}.material-media-item figcaption span{overflow:hidden;color:#cdb486;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.material-media-item figcaption small{color:#806c5a;font-size:8px}.material-media-delete{position:absolute;top:5px;right:5px;display:grid;place-items:center;width:24px;height:24px;padding:0;border:1px solid #b66f63;border-radius:50%;background:#330302d9;color:#efb1a7}.material-media-delete svg{width:12px}.material-media-delete:disabled{opacity:.45}@media(max-width:580px){.material-media-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.material-media-picker{padding:10px}.material-pending-media>div,.material-editor-existing-media>div{grid-template-columns:auto minmax(0,1fr) auto}.material-pending-media small,.material-editor-existing-media small{display:none}}
    `}</style>
  </section>;
}
