'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileArchive, FilePenLine, FileText, Folder, FolderPlus, Link2, Pencil, RefreshCw, Save, Trash2, Users, X } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const members = useMemo(() => flattenFamily(family), [family]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/materials');
      const data = await response.json() as { items?: MaterialItem[]; message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Không thể tải tư liệu.');
      setItems(Array.isArray(data.items) ? data.items : []);
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

  const startCreate = (kind: MaterialKind) => { setEditor(emptyEditor(kind)); setMessage(''); setError(''); };
  const startEdit = (item: MaterialItem) => { setEditor({ id: item.id, kind: item.kind, title: item.title, content: item.content, parentId: item.parent_id ?? '' }); setMessage(''); setError(''); };

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
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? 'Không thể lưu tư liệu.');
      setEditor(null);
      setMessage(editor.id ? 'Đã cập nhật tư liệu.' : 'Đã thêm tư liệu mới.');
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu tư liệu.');
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
      setMessage('Đã xóa tư liệu.');
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

  const renderBranch = (parentId: string | null, depth = 0): React.ReactNode => childrenOf(parentId).map((item) => <li className={`material-entry ${item.kind}`} key={item.id}>
    <article>
      <span className="material-entry-icon"><KindIcon kind={item.kind} /></span>
      <div className="material-entry-copy">
        <div className="material-entry-title"><strong>{item.title}</strong><em>{kindLabel(item.kind)}</em></div>
        {item.kind === 'link' ? <a href={item.content} target="_blank" rel="noreferrer"><span>{item.content}</span><ExternalLink /></a> : item.content ? <p>{item.content}</p> : <p className="empty-material-content">{item.kind === 'folder' ? 'Chưa có mô tả cho thư mục này.' : 'Chưa có nội dung.'}</p>}
        <small>Cập nhật bởi @{item.updated_by_username} · {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(item.updated_at))}</small>
      </div>
      {canEdit && <div className="material-entry-actions"><button type="button" onClick={() => startEdit(item)} aria-label={`Sửa ${item.title}`} disabled={busy}><Pencil /></button><button type="button" className="material-delete" onClick={() => void remove(item)} aria-label={`Xóa ${item.title}`} disabled={busy}><Trash2 /></button></div>}
    </article>
    {item.kind === 'folder' && childrenOf(item.id).length > 0 && <ul className="material-nested" data-depth={depth + 1}>{renderBranch(item.id, depth + 1)}</ul>}
  </li>);

  return <section className="materials-workspace">
    <header className="materials-heading"><div><h2>{tx('Tư liệu gia phả')}</h2><p>{tx('Không gian tư liệu chung, độc lập với cây gia phả và cài đặt hệ thống.')}</p></div><div className="view-chip"><FileArchive /> {items.length}</div></header>
    <aside className="materials-isolation"><FilePenLine /><div><strong>Kho tư liệu dùng chung</strong><p>Thành viên có thể thêm và sửa thư mục, nội dung ghi chép và liên kết. Các thay đổi tại đây không làm thay đổi thành viên, gia phả hoặc các tab khác.</p></div></aside>
    {canEdit ? <div className="materials-toolbar"><div><strong>Tạo tư liệu</strong><small>Chọn loại nội dung cần thêm vào kho chung.</small></div><div><button type="button" onClick={() => startCreate('folder')}><FolderPlus />Thư mục</button><button type="button" onClick={() => startCreate('note')}><FileText />Nội dung</button><button type="button" onClick={() => startCreate('link')}><Link2 />Liên kết</button></div></div> : <div className="materials-readonly"><Users /><span>Khách tham quan chỉ có thể xem tư liệu. Hãy đăng nhập bằng tài khoản nội bộ để thêm hoặc sửa.</span></div>}
    {editor && <form className="material-editor" onSubmit={submit}>
      <div className="material-editor-heading"><span><KindIcon kind={editor.kind} /></span><div><strong>{editor.id ? `Sửa ${kindLabel(editor.kind).toLocaleLowerCase('vi')}` : `Tạo ${kindLabel(editor.kind).toLocaleLowerCase('vi')}`}</strong><small>Nội dung này chỉ thuộc tab Tư liệu.</small></div><button type="button" onClick={() => setEditor(null)} aria-label="Đóng biểu mẫu" disabled={busy}><X /></button></div>
      <div className="material-form-grid"><label>Loại tư liệu<select value={editor.kind} disabled={Boolean(editor.id)} onChange={(event) => setEditor((current) => current ? { ...current, kind: event.target.value as MaterialKind, content: current.kind === 'link' && event.target.value !== 'link' ? '' : current.content } : current)}><option value="folder">Thư mục</option><option value="note">Nội dung</option><option value="link">Liên kết</option></select></label><label>Thư mục chứa<select value={editor.parentId} onChange={(event) => setEditor((current) => current ? { ...current, parentId: event.target.value } : current)}><option value="">Thư mục gốc</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.label}</option>)}</select></label><label className="material-title-field">Tiêu đề<input value={editor.title} onChange={(event) => setEditor((current) => current ? { ...current, title: event.target.value } : current)} maxLength={120} required placeholder={editor.kind === 'folder' ? 'Ví dụ: Gia phả đời thứ 3' : editor.kind === 'link' ? 'Ví dụ: Thư viện ảnh của dòng họ' : 'Ví dụ: Ghi chép về nguồn gốc dòng họ'} /></label>
        {editor.kind === 'link' ? <label className="material-content-field">Địa chỉ liên kết<input value={editor.content} onChange={(event) => setEditor((current) => current ? { ...current, content: event.target.value } : current)} type="url" inputMode="url" placeholder="https://…" required /></label> : <label className="material-content-field">{editor.kind === 'folder' ? 'Mô tả thư mục' : 'Nội dung'}<textarea value={editor.content} onChange={(event) => setEditor((current) => current ? { ...current, content: event.target.value } : current)} maxLength={12000} placeholder={editor.kind === 'folder' ? 'Mô tả ngắn để mọi người dễ tìm tư liệu.' : 'Nhập nội dung ghi chép, dẫn giải hoặc thông tin muốn lưu.'} /></label>}
      </div>
      <div className="material-editor-actions"><button type="submit" disabled={busy}><Save />{busy ? 'Đang lưu…' : editor.id ? 'Lưu thay đổi' : 'Tạo tư liệu'}</button><button type="button" onClick={() => setEditor(null)} disabled={busy}>Hủy</button></div>
    </form>}
    {(message || error) && <output className={`materials-feedback ${error ? 'error' : ''}`}>{error || message}</output>}
    <section className="materials-library" aria-label="Kho tư liệu chung"><div className="materials-library-heading"><div><h3>Kho tư liệu chung</h3><p>{loading ? 'Đang tải tư liệu…' : items.length ? `${items.length} mục đang được sắp xếp theo thư mục.` : 'Chưa có tư liệu nào. Hãy tạo thư mục hoặc nội dung đầu tiên.'}</p></div><button type="button" onClick={() => void refresh()} disabled={loading || busy} aria-label="Tải lại tư liệu"><RefreshCw /></button></div>{!loading && items.length > 0 && <ul className="materials-tree">{renderBranch(null)}</ul>}</section>
    <section className="materials-reference"><header><div><span>THAM CHIẾU</span><h3>Hồ sơ gia phả hiện có</h3><p>{dataMode === 'sample' ? 'Dữ liệu thử nghiệm được giữ riêng để tham khảo bố cục.' : 'Chọn thành viên để mở hồ sơ gia phả.'}</p></div><div className="view-chip"><Users /> {members.length}</div></header><div>{members.map((member) => <button type="button" key={member.id} onClick={() => onSelect(member)}><span className="material-reference-avatar">{member.avatar ? <>{/* oxlint-disable-next-line next/no-img-element -- validated member avatar data is rendered as a small reference image. */}<img src={member.avatar} alt="" /></> : initials(member)}</span><span><strong>{member.name}</strong><small>Đời thứ {member.generation}{member.role ? ` · ${member.role}` : ''}</small></span></button>)}</div></section>
  </section>;
}
