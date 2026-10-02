'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CalendarDays, ChevronDown, Database, Eye, FileArchive, Home, KeyRound, Languages, Laptop, LockKeyhole, LogIn, LogOut, Maximize, Menu, Minus, Monitor, Plus, Search, Settings, ShieldCheck, Smartphone, Sparkles, UserRoundPlus, Users, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdminSettings from '@/components/admin-settings';
import MaterialsWorkspace from '@/components/materials-workspace';
import { languageNames, supportedLanguages, systemNames, text, translate, translateTab, type Language } from '@/lib/i18n';
import { cloneFamily, flattenFamily, initialFamily, officialFamilyTemplate, SAMPLE_MEMBER_COUNT, type FamilyDataMode, type FamilyPerson } from '@/lib/family-tree';
import { DEFAULT_LOGIN_NOTICE, type LoginNoticeSettings } from '@/lib/login-notice';

type Person = FamilyPerson;

function ProjectLogo() {
  return <>{/* oxlint-disable-next-line next/no-img-element -- final logo is a local static project asset. */}<img className="project-logo-image" src="/logofinal/logo-pham-van.png?v=transparent-20260907" alt="" /></>;
}

function TabBrandIcon() {
  return <>{/* oxlint-disable-next-line next/no-img-element -- tab emblem is a local static project asset. */}<img className="tab-brand-image" src="/iconfinal/tab-book-ribbon.png?v=transparent-20260907" alt="" /></>;
}

const tabs = [
  { label: 'Tổng quan', icon: Home }, { label: 'Cây gia phả', icon: Users },
  { label: 'Thành viên', icon: Users }, { label: 'Sự kiện', icon: CalendarDays },
  { label: 'Tư liệu', icon: FileArchive },
  { label: 'Cài đặt', icon: Settings },
];

function PersonAvatar({ person, className = '' }: { person: Person; className?: string }) {
  const fallback = person.generation === 1 ? '祖' : person.name.split(' ').at(-1)?.charAt(0);
  return <span className={`avatar-mark ${className}`}>{person.avatar ? <>{/* oxlint-disable-next-line next/no-img-element -- avatars can be user-provided data URLs. */}<img src={person.avatar} alt={`Ảnh đại diện ${person.name}`} /></> : fallback}</span>;
}

function PersonCard({ person, query, language, onSelect }: { person: Person; query: string; language: Language; onSelect?: (person: Person) => void }) {
  const matched = query.length > 0 && person.name.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'));
  return <button className={`person-card ${person.generation === 1 ? 'root-card' : ''} ${matched ? 'matched' : ''}`} onClick={() => onSelect?.(person)}>
    <PersonAvatar person={person} />
    <span className="person-copy"><strong>{person.name}</strong><small>{person.role ? `${person.role} · ` : ''}{text(language,'Đời thứ')} {person.generation}</small></span>
  </button>;
}

function DescendantBranches({ person, query, generation, language, onSelect }: { person: Person; query: string; generation: number | null; language: Language; onSelect: (person: Person) => void }) {
  const visible = (member: Person) => generation === null || member.generation <= generation;
  const children = person.children?.filter(visible) ?? [];
  if (!children.length) return null;
  return <div className="descendant-branches"><div className="descendant-row">{children.map((child) => <div className="descendant-stack" key={child.id}><PersonCard person={child} query={query} language={language} onSelect={onSelect} /><DescendantBranches person={child} query={query} generation={generation} language={language} onSelect={onSelect} /></div>)}</div></div>;
}

function Tree({ family, query, generation, language, onSelect }: { family: Person; query: string; generation: number | null; language: Language; onSelect: (person: Person) => void }) {
  const visible = (person: Person) => generation === null || person.generation <= generation;
  return <div className="tree" aria-label={translate(language,27)}>
    <div className="tree-root"><PersonCard person={family} query={query} language={language} onSelect={onSelect} /></div>
    {family.children?.[0] && visible(family.children[0]) && <div className="branches generation-two">
      {family.children?.map((parent) => <div className="branch" key={parent.id}>
        <PersonCard person={parent} query={query} language={language} onSelect={onSelect} />
        {parent.children?.[0] && visible(parent.children[0]) && <div className="children-row">
          {parent.children?.map((child) => <div className="child-stack" key={child.id}>
            <PersonCard person={child} query={query} language={language} onSelect={onSelect} />
            {child.children?.[0] && visible(child.children[0]) && child.children?.map((grandchild) => <div className="grandchild-stack" key={grandchild.id}><PersonCard person={grandchild} query={query} language={language} onSelect={onSelect} /><DescendantBranches person={grandchild} query={query} generation={generation} language={language} onSelect={onSelect} /></div>)}
          </div>)}
        </div>}
      </div>)}
    </div>}
  </div>;
}

type MemberDetails = Pick<Person, 'name' | 'role' | 'avatar' | 'relationship' | 'identityNumber' | 'birthDate' | 'deathDate' | 'memorialDate'>;
type FamilyActivity = { action: string; details: string };

function replacePerson(root: Person, id: number, details: MemberDetails) {
  const copy = cloneFamily(root);
  const visit = (person: Person): boolean => {
    if (person.id === id) { Object.assign(person, details); return true; }
    return person.children?.some(visit) ?? false;
  };
  visit(copy);
  return copy;
}

function appendMember(root: Person, parentId: number, details: MemberDetails) {
  const copy = cloneFamily(root);
  const nextId = Math.max(...flattenFamily(copy).map((person) => person.id)) + 1;
  const visit = (person: Person): boolean => {
    if (person.id === parentId) {
      person.children = [...(person.children ?? []), { id: nextId, generation: person.generation + 1, ...details }];
      return true;
    }
    return person.children?.some(visit) ?? false;
  };
  visit(copy);
  return copy;
}

function countMatchingMembers(root: Person, query: string): number {
  const normalizedQuery = query.toLocaleLowerCase('vi');
  return (root.name.toLocaleLowerCase('vi').includes(normalizedQuery) ? 1 : 0) + (root.children?.reduce((sum, child) => sum + countMatchingMembers(child, query), 0) ?? 0);
}

function MemberManager({ family, language, maxGeneration, dataMode, onSave, requestedEditId, onEditRequestHandled }: { family: Person; language: Language; maxGeneration: number; dataMode: FamilyDataMode; onSave: (nextFamily: Person, activity: FamilyActivity) => Promise<void>; requestedEditId: number | null; onEditRequestHandled: () => void }) {
  const tx = (value: string) => text(language, value);
  const members = useMemo(() => flattenFamily(family), [family]);
  const availableParents = members.filter((member) => member.generation < maxGeneration);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [relationship, setRelationship] = useState('');
  const [identityNumber, setIdentityNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [memorialDate, setMemorialDate] = useState('');
  const [avatar, setAvatar] = useState('');
  const [parentId, setParentId] = useState(String(family.id));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const isEditing = editingId !== null;
  const isSampleData = dataMode === 'sample';
  const reset = () => { setEditingId(null); setName(''); setRole(''); setRelationship(''); setIdentityNumber(''); setBirthDate(''); setDeathDate(''); setMemorialDate(''); setAvatar(''); setParentId(String(family.id)); setMessage(''); };
  const beginEdit = (member: Person) => { setEditingId(member.id); setName(member.name); setRole(member.role ?? ''); setRelationship(member.relationship ?? ''); setIdentityNumber(member.identityNumber ?? ''); setBirthDate(member.birthDate ?? ''); setDeathDate(member.deathDate ?? ''); setMemorialDate(member.memorialDate ?? ''); setAvatar(member.avatar ?? ''); setMessage(''); };
  useEffect(() => {
    if (requestedEditId === null) return;
    const member = members.find((item) => item.id === requestedEditId);
    const frame = window.requestAnimationFrame(() => {
      if (member) beginEdit(member);
      onEditRequestHandled();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [members, onEditRequestHandled, requestedEditId]);
  const chooseAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 240_000) { setMessage(tx('Ảnh đại diện cần là ảnh dưới 240 KB.')); event.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setAvatar(reader.result); };
    reader.readAsDataURL(file);
  };
  const submit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    const parent = availableParents.find((member) => member.id === Number(parentId));
    if (!isEditing && !parent) { setMessage(tx('Vui lòng chọn một người thuộc gia phả.')); return; }
    const details: MemberDetails = { name: cleanName, role: role.trim() || undefined, relationship: relationship.trim() || undefined, identityNumber: identityNumber.trim() || undefined, birthDate: birthDate || undefined, deathDate: deathDate || undefined, memorialDate: deathDate && memorialDate ? memorialDate : undefined, avatar: avatar || undefined };
    const next = isEditing ? replacePerson(family, editingId, details) : appendMember(family, parent!.id, details);
    setBusy(true); setMessage('');
    const activity = isEditing ? { action: 'Sửa thành viên', details: `Đã sửa hồ sơ thành viên ${cleanName}` } : { action: 'Thêm thành viên', details: `Đã thêm thành viên ${cleanName} vào nhánh ${parent!.name}` };
    try { await onSave(next, activity); reset(); } catch (error) { setMessage(error instanceof Error ? error.message : tx('Không thể lưu thay đổi.')); } finally { setBusy(false); }
  };
  return <div className="member-manager">
    <div className="member-heading"><div><h2>{tx('Quản lý thành viên')}</h2><p>{tx('Mọi tài khoản nội bộ đều có thể thêm và sửa thành viên trong gia phả.')}</p></div><div className="view-chip"><Users /> {members.length}</div></div>
    {isSampleData ? <aside className="sample-member-notice"><ShieldCheck /><div><strong>Dữ liệu thử nghiệm đang được bảo vệ</strong><p>68 thành viên này chỉ dùng để tham khảo. Quản trị cấp cao cần vào Cài đặt và chọn “Bắt đầu nhập dữ liệu chính thức” trước khi thêm hoặc sửa thành viên.</p></div></aside> : <div className="member-editor-card">
      <div className="member-editor-copy"><UserRoundPlus /><div><h3>{isEditing ? tx('Sửa thành viên') : tx('Thêm thành viên')}</h3><p>{isEditing ? tx('Cập nhật thông tin hiển thị của thành viên.') : tx('Thành viên mới sẽ được thêm vào nhánh đã chọn.')}</p></div></div>
      <form onSubmit={submit} className="member-form">
        <label>{tx('Họ và tên thành viên')}<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required placeholder="Phạm Gia An" /></label>
        <label>{tx('Vai trò / chú thích')}<input value={role} onChange={(event) => setRole(event.target.value)} maxLength={80} placeholder={tx('Ví dụ: Trưởng chi')} /></label>
        <label>{tx('Quan hệ')}<input value={relationship} onChange={(event) => setRelationship(event.target.value)} maxLength={80} placeholder={tx('Ví dụ: Con trai trưởng')} /></label>
        <label>{tx('Số căn cước')}<input value={identityNumber} onChange={(event) => setIdentityNumber(event.target.value)} maxLength={32} inputMode="numeric" placeholder="012345678901" /></label>
        <label>{tx('Ngày sinh')}<input value={birthDate} onChange={(event) => setBirthDate(event.target.value)} type="date" /></label>
        <label>{tx('Ngày mất')}<input value={deathDate} onChange={(event) => setDeathDate(event.target.value)} type="date" /></label>
        <label>{tx('Ngày dỗ')}<input value={memorialDate} onChange={(event) => setMemorialDate(event.target.value)} type="date" disabled={!deathDate} /></label>
        <label className="avatar-upload">{tx('Ảnh đại diện')}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseAvatar} /><span>{avatar ? tx('Đã chọn ảnh') : tx('Chọn ảnh dưới 240 KB')}</span></label>
        {!isEditing && <label>{tx('Thêm vào nhánh của')}<select value={parentId} onChange={(event) => setParentId(event.target.value)}>{availableParents.map((member) => <option value={member.id} key={member.id}>{member.name} · {tx('Đời thứ')} {member.generation}</option>)}</select></label>}
        <div className="member-form-actions"><button type="submit" disabled={busy}>{isEditing ? tx('Lưu thay đổi') : tx('Thêm vào gia phả')}</button>{isEditing && <button type="button" className="member-cancel" onClick={reset}>{tx('Hủy')}</button>}</div>
        {message && <p className="member-message" role="alert">{message}</p>}
      </form>
    </div>}
    <div className="member-list">{members.map((member) => <article className="member-row" key={member.id}><PersonAvatar person={member} className="member-avatar" /><div><strong>{member.name}</strong><small>{tx('Đời thứ')} {member.generation}{member.role ? ` · ${member.role}` : ''}</small></div>{!isSampleData && <button type="button" onClick={() => beginEdit(member)}>{tx('Sửa')}</button>}</article>)}</div>
  </div>;
}

type FamilyEvent = { member: Person; kind: 'birthday' | 'memorial'; date: string; month: number; day: number; daysUntil: number };

function recurringDateParts(value?: string) {
  const matched = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return null;
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (month < 1 || month > 12 || day < 1 || day > new Date(2000, month, 0).getDate()) return null;
  return { month, day };
}

function daysUntilRecurringDate(month: number, day: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const makeOccurrence = (year: number) => new Date(year, month - 1, Math.min(day, new Date(year, month, 0).getDate()));
  let occurrence = makeOccurrence(now.getFullYear());
  if (occurrence < today) occurrence = makeOccurrence(now.getFullYear() + 1);
  return Math.round((occurrence.getTime() - today.getTime()) / 86_400_000);
}

function EventsView({ family, language, onSelect }: { family: Person; language: Language; onSelect: (person: Person) => void }) {
  const tx = (value: string) => text(language, value);
  const events = useMemo(() => flattenFamily(family).flatMap((member): FamilyEvent[] => {
    const birthday = recurringDateParts(member.birthDate);
    const memorial = recurringDateParts(member.memorialDate);
    const list: FamilyEvent[] = [];
    if (birthday && !member.deathDate) list.push({ member, kind: 'birthday', date: member.birthDate!, ...birthday, daysUntil: daysUntilRecurringDate(birthday.month, birthday.day) });
    if (member.deathDate && memorial) list.push({ member, kind: 'memorial', date: member.memorialDate!, ...memorial, daysUntil: daysUntilRecurringDate(memorial.month, memorial.day) });
    return list;
  }).sort((left, right) => left.daysUntil - right.daysUntil || left.month - right.month || left.day - right.day || left.member.name.localeCompare(right.member.name, 'vi')), [family]);
  const formatter = useMemo(() => new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : language, { day: '2-digit', month: 'long' }), [language]);
  const displayDate = (event: FamilyEvent) => formatter.format(new Date(2000, event.month - 1, event.day));

  return <section className="events-view">
    <header className="events-heading"><div><h2>{tx('Sự kiện gia đình')}</h2><p>{tx('Ngày sinh nhật và ngày dỗ được lấy từ thông tin hồ sơ thành viên.')}</p></div><div className="view-chip"><CalendarDays /> {events.length}</div></header>
    {events.length ? <div className="events-list">{events.map((event) => <button type="button" className={`family-event ${event.kind}`} key={`${event.kind}-${event.member.id}`} onClick={() => onSelect(event.member)}>
      <PersonAvatar person={event.member} className="event-avatar" />
      <span className="event-copy"><em>{event.kind === 'birthday' ? tx('Sinh nhật') : tx('Ngày dỗ')}</em><strong>{event.member.name}</strong><small>{tx('Đời thứ')} {event.member.generation} · {tx('Lặp lại hằng năm')}</small></span>
      <time dateTime={event.date}>{displayDate(event)}</time>
    </button>)}</div> : <div className="events-empty"><CalendarDays /><h3>{tx('Chưa có sự kiện nào được cập nhật.')}</h3><p>{tx('Hãy thêm ngày sinh hoặc ngày mất và ngày dỗ trong hồ sơ thành viên.')}</p></div>}
  </section>;
}

function findParent(root: Person, id: number): Person | null {
  if (root.children?.some((child) => child.id === id)) return root;
  for (const child of root.children ?? []) { const parent = findParent(child, id); if (parent) return parent; }
  return null;
}

function MemberProfile({ person, family, language, isInternalUser, onClose, onEdit, onOpenChild, onBack }: { person: Person; family: Person; language: Language; isInternalUser: boolean; onClose: () => void; onEdit: () => void; onOpenChild: (person: Person) => void; onBack?: () => void }) {
  const tx = (value: string) => text(language, value);
  const parent = findParent(family, person.id);
  const children = person.children ?? [];
  return <div className="member-profile-backdrop">
    <dialog open className="member-profile" aria-label={tx('Hồ sơ thành viên')}>
      <button className="member-profile-close" type="button" onClick={onClose} aria-label={tx('Đóng')}><X /></button>
      {onBack && <button className="member-profile-back" type="button" onClick={onBack}>{tx('← Quay lại hồ sơ trước')}</button>}
      <div className="member-profile-header"><PersonAvatar person={person} className="member-profile-avatar" /><div><span>PHẠM</span><h2>{person.name}</h2><p>{person.role || tx('Thành viên dòng họ')}</p></div></div>
      <div className="member-profile-facts"><div><span>{tx('Đời thứ')}</span><strong>{person.generation}</strong></div><div><span>{tx('Quan hệ')}</span><strong>{person.relationship || (parent ? `${tx('Con của')} ${parent.name}` : tx('Thủy tổ'))}</strong></div>{person.birthDate && <div><span>{tx('Ngày sinh')}</span><strong>{person.birthDate}</strong></div>}{person.deathDate && <div><span>{tx('Ngày mất')}</span><strong>{person.deathDate}</strong></div>}{person.deathDate && person.memorialDate && <div><span>{tx('Ngày dỗ')}</span><strong>{person.memorialDate}</strong></div>}{isInternalUser && person.identityNumber && <div><span>{tx('Số căn cước')}</span><strong>{person.identityNumber}</strong></div>}</div>
      <div className="member-children"><h3>{tx('Con cái')} <span>{children.length}</span></h3>{children.length ? <div>{children.map((child) => <button type="button" key={child.id} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onOpenChild(child); }} aria-label={`${tx('Xem hồ sơ')} ${child.name}`}><PersonAvatar person={child} /><span><strong>{child.name}</strong><small>{tx('Đời thứ')} {child.generation}</small></span></button>)}</div> : <p>{tx('Chưa có thông tin con cái.')}</p>}</div>
      {isInternalUser && <button className="member-profile-edit" type="button" onClick={onEdit}>{tx('Sửa hồ sơ thành viên')}</button>}
    </dialog>
  </div>;
}

function LogoMeaningDialog({ open, onOpenChange, language }: { open: boolean; onOpenChange: (open: boolean) => void; language: Language }) {
  const tx = (value: string) => text(language, value);
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);
  const [selectedMeaningIndex, setSelectedMeaningIndex] = useState<number | null>(null);
  const meanings = [
    [tx('Cây cổ thụ và bộ rễ'), tx('Gợi nhắc cội nguồn bền vững, sự tiếp nối của các thế hệ và tinh thần gìn giữ gốc rễ gia tộc.')],
    [tx('Cuốn gia phả và sơ đồ trên trang sách'), tx('Là nơi lưu truyền tên tuổi, quan hệ và những câu chuyện của dòng họ qua từng đời.')],
    [tx('Ngọ Môn Huế'), tx('Tượng trưng cho chiều sâu văn hóa, lịch sử và sự trang nghiêm trong truyền thống Việt Nam.')],
    [tx('Mặt trời, núi và mây'), tx('Gợi một tương lai sáng, nền tảng vững chãi và sự thuận hòa của các thành viên.')],
    [tx('Khung tròn và các cuộn thư'), tx('Thể hiện sự đoàn kết, tính trọn vẹn và việc trân trọng gia huấn, tư liệu của tổ tiên.')],
    [tx('Ruy băng PHẠM VĂN'), tx('Khẳng định tên gọi của dòng họ; sắc đỏ son và vàng kim biểu trưng cho phúc lành, sự tôn quý và trường tồn.')],
    [tx('Biểu tượng Thọ ở chân logo'), tx('Chữ Thọ cách điệu biểu trưng cho sức khỏe, tuổi thọ và sự hưng thịnh lâu dài của gia đình.')],
  ] as const;
  const selectedMeaning = selectedMeaningIndex === null ? null : meanings[selectedMeaningIndex];
  const handleMeaningOpenChange = (nextOpen: boolean, eventDetails: { reason: string }) => {
    if (!nextOpen && selectedMeaning && (eventDetails.reason === 'outside-press' || eventDetails.reason === 'escape-key')) {
      setSelectedMeaningIndex(null);
      return;
    }
    if (!nextOpen) setSelectedMeaningIndex(null);
    onOpenChange(nextOpen);
  };

  return <>
    <Dialog open={open} onOpenChange={handleMeaningOpenChange}>
      <DialogContent className="logo-meaning-dialog">
        <DialogHeader>
          <span className="logo-meaning-kicker">PHẠM VĂN</span>
          <DialogTitle>{tx('Ý nghĩa biểu trưng')}</DialogTitle>
          <DialogDescription>{tx('Biểu trưng ghi lại hành trình gìn giữ cội nguồn, kết nối các thế hệ và hướng tới tương lai bền vững.')}</DialogDescription>
        </DialogHeader>
        <button type="button" className="logo-view-action" onClick={() => { setSelectedMeaningIndex(null); onOpenChange(false); setLogoPreviewOpen(true); }}><Maximize />{tx('Xem logo kích thước lớn')}</button>
        <div className="logo-meaning-list">
          {meanings.map(([title, description], index) => <button type="button" className="logo-meaning-item" key={title} onClick={() => setSelectedMeaningIndex(index)} aria-label={`${tx('Xem chi tiết')}: ${title}`}>
            <span aria-hidden="true">✦</span><div><h3>{title}</h3><p>{description}</p></div>
          </button>)}
        </div>
        {selectedMeaning && <div className="logo-meaning-focus-layer">
          <button type="button" className="logo-meaning-focus-backdrop" onClick={() => setSelectedMeaningIndex(null)} aria-label={tx('Quay lại danh sách')} />
          <article className="logo-meaning-focus-card" aria-label={selectedMeaning[0]}>
            <button type="button" className="logo-meaning-focus-close" onClick={() => setSelectedMeaningIndex(null)} aria-label={tx('Quay lại danh sách')}><X /></button>
            <span aria-hidden="true">✦</span><div><p>{tx('Ý nghĩa biểu trưng')}</p><h3>{selectedMeaning[0]}</h3><p>{selectedMeaning[1]}</p></div>
          </article>
        </div>}
      </DialogContent>
    </Dialog>
    <Dialog open={logoPreviewOpen} onOpenChange={setLogoPreviewOpen}>
      <DialogContent className="logo-preview-dialog">
        <DialogHeader><DialogTitle>{tx('Logo PHẠM VĂN')}</DialogTitle><DialogDescription>{tx('Biểu trưng chính thức của GIA PHẢ HỌ PHẠM VĂN.')}</DialogDescription></DialogHeader>
        <div className="logo-preview-image-wrap">{/* oxlint-disable-next-line next/no-img-element -- final logo is a local static project asset. */}<img src="/logofinal/logo-pham-van.png?v=transparent-20260907" alt={tx('Logo PHẠM VĂN')} /></div>
      </DialogContent>
    </Dialog>
  </>;
}

function TabBrand({ language, projectName, onLogoClick }: { language: Language; projectName: string; onLogoClick: () => void }) {
  const tx = (value: string) => text(language, value);
  return <div className="tab-brand">
    <button type="button" className="project-logo-button tab-brand-logo logo-meaning-trigger" onClick={onLogoClick} aria-label={tx('Xem ý nghĩa biểu trưng')}><TabBrandIcon /></button>
    <h2 className="system-name">{projectName}</h2>
    <p>{tx('Gìn giữ cội nguồn · Kết nối thế hệ')}</p>
  </div>;
}

function TabFallbackBrand({ language, projectName }: { language: Language; projectName: string }) {
  const tx = (value: string) => text(language, value);
  return <div className="tab-fallback-brand">
    <h2 className="system-name">{projectName}</h2>
    <p>{tx('Gìn giữ cội nguồn · Kết nối thế hệ')}</p>
  </div>;
}

function ProjectOverview({ language, memberCount, generationCount, onOpenTree }: { language: Language; memberCount: number; generationCount: number; onOpenTree: () => void }) {
  const tx = (value: string) => text(language, value);
  return <div className="overview-view">
    <div className="overview-stats"><div><strong>{memberCount}</strong><span>{tx('thành viên')}</span></div><div><strong>{generationCount}</strong><span>{tx('thế hệ')}</span></div><div><strong>PHẠM VĂN</strong><span>{tx('Gia phả')}</span></div></div>
    <button onClick={onOpenTree}>{translate(language, 27)}</button>
  </div>;
}

type Permission = 'manage_accounts' | 'project_name' | 'generations' | 'legends' | 'menus' | 'notifications';
type AppSettings = { project_name: string; show_brand_banner: boolean; generations: string[]; legends: string[]; menu_tabs: string[]; login_notice: LoginNoticeSettings; enabled_languages: Language[] };
type BackupPayload = { application: string; exportedAt: string; version: number; family: Person };

export default function FamilyApp({ user }: { user: { displayName: string; username: string; role: 'super_admin' | 'member'; permissions: Permission[] } | null }) {
  const [activeTab, setActiveTab] = useState('Cây gia phả');
  const [query, setQuery] = useState('');
  const [generation, setGeneration] = useState<number | null>(null);
  const [zoom, setZoom] = useState(82);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dataAvailable, setDataAvailable] = useState(true);
  const [dataMode, setDataMode] = useState<FamilyDataMode>('sample');
  const [displayMode, setDisplayMode] = useState<'auto' | 'desktop' | 'mobile'>('auto');
  const [guestStarted, setGuestStarted] = useState(false);
  const [restrictedOpen, setRestrictedOpen] = useState(false);
  const [authPanel, setAuthPanel] = useState(!user);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loginNoticeOpen, setLoginNoticeOpen] = useState(true);
  const [mainNoticeOpen, setMainNoticeOpen] = useState(true);
  const [logoMeaningOpen, setLogoMeaningOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rememberedUsername, setRememberedUsername] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Person | null>(null);
  const [memberProfileTrail, setMemberProfileTrail] = useState<Person[]>([]);
  const [memberToEdit, setMemberToEdit] = useState<number | null>(null);
  const [familyTree, setFamilyTree] = useState<Person>(() => cloneFamily(initialFamily));
  const [appSettings, setAppSettings] = useState<AppSettings>({ project_name: systemNames.vi, show_brand_banner: true, generations: ['Đời thứ 1', 'Đời thứ 2', 'Đời thứ 3', 'Đời thứ 4', 'Đời thứ 5'], legends: ['Thủy tổ', 'Thành viên dòng họ'], menu_tabs: tabs.map((tab) => tab.label), login_notice: DEFAULT_LOGIN_NOTICE, enabled_languages: supportedLanguages });
  const [language, setLanguage] = useState<Language>('vi');
  const languageRef = useRef(language);
  const treeViewportRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const members = useMemo(() => flattenFamily(familyTree), [familyTree]);
  const enabledLanguages = useMemo(() => {
    const configured = supportedLanguages.filter((code) => appSettings.enabled_languages.includes(code));
    return configured.length && configured.includes('vi') ? configured : supportedLanguages;
  }, [appSettings.enabled_languages]);
  const menuTabs = useMemo(() => appSettings.menu_tabs.includes('Thành viên') ? appSettings.menu_tabs : [...appSettings.menu_tabs, 'Thành viên'], [appSettings.menu_tabs]);
  const projectName = language === 'vi' ? appSettings.project_name : systemNames[language];
  const memberCount = dataAvailable ? members.length : 0;
  const generationCount = dataAvailable ? Math.max(...members.map((member) => member.generation)) : 0;
  const generationLabels = useMemo(() => Array.from({ length: Math.max(appSettings.generations.length, generationCount) }, (_, index) => appSettings.generations[index] ?? `Đời thứ ${index + 1}`), [appSettings.generations, generationCount]);
  const accountInitials = user ? user.displayName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part.charAt(0)).join('').toLocaleUpperCase('vi') : 'KH';
  const resultCount = dataAvailable && query ? countMatchingMembers(familyTree, query) : memberCount;
  const ensureEnabledLanguage = useCallback((availableLanguages: Language[]) => {
    if (availableLanguages.includes(languageRef.current)) return;
    setLanguage('vi');
    localStorage.setItem('gia-pha-language', 'vi');
  }, []);

  const fitTree = useCallback(() => {
    const viewport = treeViewportRef.current;
    if (!viewport) return;
    const widthScale = (viewport.clientWidth - 28) / 1450;
    const heightScale = (viewport.clientHeight - 28) / 800;
    setZoom(Math.max(24, Math.min(100, Math.floor(Math.min(widthScale, heightScale) * 100))));
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedMode = localStorage.getItem('gia-pha-display-mode');
      if (savedMode === 'auto' || savedMode === 'desktop' || savedMode === 'mobile') setDisplayMode(savedMode);
      const savedLanguage = localStorage.getItem('gia-pha-language') as Language | null;
      if (savedLanguage && savedLanguage in languageNames) setLanguage(savedLanguage);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => { languageRef.current = language; document.documentElement.lang = language; }, [language]);

  useEffect(() => {
    fetch('/api/login-notice').then((response) => response.json() as Promise<{ notice?: LoginNoticeSettings; showBrandBanner?: boolean; enabledLanguages?: Language[] }>).then((data) => {
      const notice = data.notice;
      if (Array.isArray(data.enabledLanguages)) ensureEnabledLanguage(data.enabledLanguages);
      if (notice || typeof data.showBrandBanner === 'boolean' || Array.isArray(data.enabledLanguages)) setAppSettings((settings) => ({ ...settings, ...(notice ? { login_notice: notice } : {}), ...(typeof data.showBrandBanner === 'boolean' ? { show_brand_banner: data.showBrandBanner } : {}), ...(Array.isArray(data.enabledLanguages) ? { enabled_languages: data.enabledLanguages } : {}) }));
    }).catch(() => undefined);
  }, [ensureEnabledLanguage]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/admin/settings').then((response) => response.json() as Promise<{ settings?: AppSettings }>).then((data) => { if (data.settings) { ensureEnabledLanguage(data.settings.enabled_languages); setAppSettings((settings) => ({ ...settings, ...data.settings })); } }).catch(() => undefined);
  }, [ensureEnabledLanguage, user]);

  useEffect(() => {
    if (user) return;
    let active = true;
    fetch('/api/auth/remember').then((response) => response.ok ? response.json() as Promise<{ available?: boolean; username?: string }> : null).then((data) => {
      if (!active || !data?.available || typeof data.username !== 'string') return;
      setRememberedUsername(data.username);
      setAuthMode('login');
      setAuthPanel(true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    fetch('/api/family').then((response) => response.json() as Promise<{ family?: Person | null; dataMode?: FamilyDataMode }>).then((data) => {
      if (data.dataMode === 'sample' || data.dataMode === 'official' || data.dataMode === 'empty') setDataMode(data.dataMode);
      if (data.family) { setFamilyTree(data.family); setDataAvailable(true); }
      if (data.family === null) { setFamilyTree(cloneFamily(officialFamilyTemplate)); setDataAvailable(false); }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (activeTab !== 'Cây gia phả') return;
    fitTree();
    const observer = new ResizeObserver(fitTree);
    if (treeViewportRef.current) observer.observe(treeViewportRef.current);
    return () => observer.disconnect();
  }, [activeTab, displayMode, generation, fitTree]);

  useEffect(() => {
    if (!profileOpen) return;
    const closeProfileOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountMenuRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const closeProfileOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('pointerdown', closeProfileOnOutsideClick);
    document.addEventListener('keydown', closeProfileOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeProfileOnOutsideClick);
      document.removeEventListener('keydown', closeProfileOnEscape);
    };
  }, [profileOpen]);

  const changeDisplayMode = (mode: 'auto' | 'desktop' | 'mobile') => {
    setDisplayMode(mode);
    localStorage.setItem('gia-pha-display-mode', mode);
  };

  const changeLanguage = (value: Language) => {
    if (!enabledLanguages.includes(value)) return;
    setLanguage(value);
    localStorage.setItem('gia-pha-language', value);
  };
  const t = (index: number) => translate(language, index);
  const tx = (value: string) => text(language, value);

  const downloadBackup = () => {
    const payload: BackupPayload = { application: systemNames.vi, exportedAt: new Date().toISOString(), version: 1, family: familyTree };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `gia-pha-ho-pham-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteData = async () => {
    const response = await fetch('/api/family', { method: 'DELETE' });
    const data = await response.json() as { message?: string };
    if (!response.ok) throw new Error(data.message ?? tx('Không thể xóa dữ liệu.'));
    setFamilyTree(cloneFamily(officialFamilyTemplate));
    setDataAvailable(false);
    setDataMode('empty');
    setQuery('');
    setGeneration(null);
  };

  const restoreData = async (data: unknown) => {
    const backup = data as Partial<BackupPayload>;
    if (!backup || typeof backup !== 'object' || !backup.family) throw new Error(tx('Tệp sao lưu không hợp lệ hoặc đã bị hỏng.'));
    await saveFamily(backup.family, { action: 'Phục hồi dữ liệu', details: 'Đã phục hồi dữ liệu gia phả từ bản sao lưu' }, 'official');
    setDataAvailable(true);
  };

  const saveFamily = async (nextFamily: Person, activity: FamilyActivity, nextDataMode?: FamilyDataMode) => {
    if (dataMode === 'sample' && nextDataMode === undefined) throw new Error('Dữ liệu thử nghiệm chỉ để tham khảo. Hãy bắt đầu dữ liệu chính thức trong tab Cài đặt trước khi chỉnh sửa.');
    const response = await fetch('/api/family', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ family: nextFamily, activity, dataMode: nextDataMode }) });
    const data = await response.json() as { family?: Person; dataMode?: FamilyDataMode; message?: string };
    if (!response.ok) throw new Error(data.message ?? tx('Không thể lưu thay đổi.'));
    setFamilyTree(data.family ?? nextFamily);
    if (data.dataMode === 'sample' || data.dataMode === 'official' || data.dataMode === 'empty') setDataMode(data.dataMode);
    setDataAvailable(true);
  };

  const startOfficialData = async () => {
    await saveFamily(cloneFamily(officialFamilyTemplate), { action: 'Bắt đầu dữ liệu chính thức', details: 'Đã xóa 68 thành viên dữ liệu thử nghiệm và tạo khung gia phả trống.' }, 'official');
    setQuery('');
    setGeneration(null);
  };

  const restoreSampleData = async () => {
    await saveFamily(cloneFamily(initialFamily), { action: 'Phục hồi dữ liệu thử nghiệm', details: 'Đã khôi phục bộ dữ liệu thử nghiệm gồm 68 thành viên, 5 đời.' }, 'sample');
    setQuery('');
    setGeneration(null);
  };

  const submitAuth = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    const data = new FormData(event.currentTarget);
    const payload = { fullName: data.get('fullName'), username: data.get('username'), password: data.get('password'), remember: data.get('remember') === 'on' };
    try {
      const response = await fetch(`/api/auth/${authMode === 'signup' ? 'signup' : 'login'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok) throw new Error(result.message ?? 'Không thể tiếp tục.');
      window.location.reload();
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Không thể tiếp tục.'); setAuthBusy(false); }
  };

  const resumeRememberedLogin = async () => {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/remember', { method: 'POST' });
      const result = await response.json() as { ok: boolean; message?: string };
      if (!response.ok) throw new Error(result.message ?? 'Không thể đăng nhập bằng thông tin đã lưu.');
      window.location.reload();
    } catch (error) {
      setRememberedUsername(null);
      setAuthError(error instanceof Error ? error.message : 'Không thể đăng nhập bằng thông tin đã lưu.');
      setAuthBusy(false);
    }
  };

  const logout = async () => { setProfileOpen(false); await fetch('/api/auth/logout', { method: 'POST' }); window.location.reload(); };

  const openMemberProfile = (person: Person) => { setSelectedMember(person); setMemberProfileTrail([]); };
  const openChildProfile = (person: Person) => {
    if (selectedMember) setMemberProfileTrail((trail) => [...trail, selectedMember]);
    setSelectedMember(person);
  };
  const closeMemberProfile = () => { setSelectedMember(null); setMemberProfileTrail([]); };
  const returnToPreviousProfile = () => {
    const previous = memberProfileTrail.at(-1);
    if (!previous) return;
    setMemberProfileTrail((trail) => trail.slice(0, -1));
    setSelectedMember(previous);
  };

  if (!user && !guestStarted) return <main className="access-page">
    <div className="access-ornament" />
    {appSettings.login_notice.enabled && appSettings.login_notice.showOnLogin && loginNoticeOpen && <output className="login-push-notice" aria-live="polite">
      <span className="notice-icon"><BellRing /></span>
      <div><strong>{appSettings.login_notice.title}</strong><p>{appSettings.login_notice.content}</p></div>
      <button type="button" onClick={() => setLoginNoticeOpen(false)} aria-label={tx('Đóng')}><X /></button>
    </output>}
    <section className="access-panel">
      <label className="access-language"><Languages /><select value={language} onChange={(e) => changeLanguage(e.target.value as Language)}>{enabledLanguages.map((code) => <option value={code} key={code}>{languageNames[code]}</option>)}</select></label>
      <div className="access-brand"><button type="button" className="project-logo-button access-project-logo logo-meaning-trigger" onClick={() => setLogoMeaningOpen(true)} aria-label={tx('Xem ý nghĩa biểu trưng')}><ProjectLogo /></button><h1 className="system-name">{systemNames[language]}</h1><span>{tx('Gìn giữ cội nguồn · Kết nối thế hệ')}</span></div>
      <div className="access-copy"><span className="access-welcome-medallion" aria-hidden="true">{/* oxlint-disable-next-line next/no-img-element -- local ornament stays lightweight at its fixed display size. */}<img src="/logofinal/welcome-lotus-medallion.png" alt="" /></span><span>{t(0)}</span><h2>{t(1)}</h2><p>{t(2)}</p></div>
      <div className="access-options">
        <button className="access-option account-option" onClick={() => { setAuthMode('signup'); setAuthPanel(true); }}><span className="option-icon"><UserRoundPlus /></span><strong>{t(3)}</strong><small>{t(4)}</small><em>{t(5)}</em></button>
        <AlertDialog><AlertDialogTrigger render={<button className="access-option guest-option"><span className="option-icon"><Eye /></span><strong>{t(6)}</strong><small>{t(7)}</small><em>{t(8)}</em></button>} />
          <AlertDialogContent className="guest-dialog"><AlertDialogHeader><AlertDialogMedia><Eye /></AlertDialogMedia><AlertDialogTitle>{t(9)}</AlertDialogTitle><AlertDialogDescription>{t(10)}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t(11)}</AlertDialogCancel><AlertDialogAction className="guest-confirm" onClick={() => setGuestStarted(true)}>{t(12)}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </div>
      {authPanel && <form className="auth-form" onSubmit={submitAuth}>
        <button type="button" className="auth-close" onClick={() => setAuthPanel(false)} aria-label={tx('Đóng')}><X /></button>
        <div className="auth-form-heading"><span className="option-icon">{authMode === 'signup' ? <UserRoundPlus /> : <LogIn />}</span><div><p>{t(13)}</p><h3>{authMode === 'signup' ? t(14) : t(15)}</h3></div></div>
        {authMode === 'login' && rememberedUsername && <button type="button" className="auth-remembered-login" onClick={resumeRememberedLogin} disabled={authBusy}><LogIn /><span><strong>{authBusy ? t(19) : tx('Đăng nhập')}</strong><small>@{rememberedUsername} · {tx('Đã lưu trên thiết bị này')}</small></span></button>}
        {authMode === 'signup' && <label>{t(16)}<input name="fullName" autoComplete="name" minLength={2} maxLength={80} required placeholder="Phạm Văn" /></label>}
        <label>{t(17)}<input name="username" autoComplete="username" minLength={3} maxLength={30} pattern="[a-z0-9._-]+" required placeholder="phamvan" /></label>
        <label>{t(18)}<input name="password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required placeholder="••••••••••••" /></label>
        {authMode === 'login' && <label className="auth-remember"><input name="remember" type="checkbox" defaultChecked /><span>{tx('Ghi nhớ đăng nhập trên thiết bị này')}</span></label>}
        {authError && <p className="auth-error" role="alert">{authError}</p>}
        <button className="auth-submit" disabled={authBusy}><KeyRound />{authBusy ? t(19) : authMode === 'signup' ? t(14) : t(15)}</button>
        <button type="button" className="auth-switch" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthError(''); }}>{authMode === 'signup' ? t(20) : t(21)}</button>
      </form>}
      <p className="access-note"><ShieldCheck /> {tx('Mật khẩu được mã hóa một chiều và không được lưu dưới dạng có thể đọc lại.')}</p>
    </section>
    <LogoMeaningDialog open={logoMeaningOpen} onOpenChange={setLogoMeaningOpen} language={language} />
  </main>;

  return <main className={`app-shell mode-${displayMode}`}>
    {appSettings.login_notice.enabled && appSettings.login_notice.showOnMain && mainNoticeOpen && <output className="login-push-notice main-push-notice" aria-live="polite">
      <span className="notice-icon"><BellRing /></span>
      <div><strong>{appSettings.login_notice.title}</strong><p>{appSettings.login_notice.content}</p></div>
      <button type="button" onClick={() => setMainNoticeOpen(false)} aria-label={tx('Đóng')}><X /></button>
    </output>}
    <header className="topbar">
      <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label={tx('Mở bộ lọc')}><Menu /></button>
      <div className="brand"><button type="button" className="project-logo-button logo-meaning-trigger" onClick={() => setLogoMeaningOpen(true)} aria-label={tx('Xem ý nghĩa biểu trưng')}><ProjectLogo /></button><div className="brand-copy"><h1 className="system-name">{projectName}</h1><p>{tx('Gìn giữ cội nguồn · Kết nối thế hệ')}</p></div></div>
      <nav className="tabs" aria-label={t(27)}>{menuTabs.map((label) => { const Icon = tabs.find((tab) => tab.label === label)?.icon ?? Menu; return (
        <button key={label} className={`${activeTab === label ? 'active' : ''} ${!user && label === 'Cài đặt' ? 'guest-locked' : ''}`} onClick={() => { if (!user && label === 'Cài đặt') { setRestrictedOpen(true); return; } setActiveTab(label); }}><Icon /><span>{translateTab(language, label)}</span>{!user && label === 'Cài đặt' && <LockKeyhole className="tab-lock" />}</button>
      ); })}</nav>
      <label className="language-select"><Languages /><select value={language} onChange={(e) => changeLanguage(e.target.value as Language)} aria-label={t(36)}>{enabledLanguages.map((code) => <option value={code} key={code}>{languageNames[code]}</option>)}</select></label>
      <div className="account-menu" ref={accountMenuRef}>
        <button className={`profile ${profileOpen ? 'open' : ''}`} onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-label={user ? tx('Hồ sơ tài khoản') : tx('Khách tham quan')} title={user ? user.displayName : tx('Khách tham quan')}>{accountInitials}</button>
        {profileOpen && <section className="profile-popover" aria-label={user ? tx('Hồ sơ tài khoản') : tx('Khách tham quan')}>
          <div className="profile-popover-heading"><span className="profile-avatar">{accountInitials}</span><div>{user ? <><strong>{user.displayName}</strong><small>@{user.username}</small></> : <><strong>{tx('Khách tham quan')}</strong><small>{tx('Chế độ chỉ xem')}</small></>}</div></div>
          {user ? <><div className="profile-details"><span>{user.role === 'super_admin' ? tx('Quản trị cấp cao') : tx('Thành viên')}</span><small>{tx('Quyền truy cập đầy đủ')}</small></div><button className="profile-logout" onClick={logout}><LogOut />{tx('Đăng xuất')}</button></> : <><p className="guest-profile-note">{tx('Khách tham quan không thể chỉnh sửa hoặc cài đặt.')}</p><button className="profile-login" onClick={() => { setProfileOpen(false); setGuestStarted(false); setAuthMode('login'); setAuthPanel(true); }}><LogIn />{tx('Đăng nhập hoặc tạo tài khoản')}</button></>}
        </section>}
      </div>
    </header>

    <div className="workspace">
      {!user && <div className="guest-banner"><Eye />{t(22)}</div>}
      <aside className={`filter-panel ${menuOpen ? 'open' : ''}`}>
        <button className="close-menu" onClick={() => setMenuOpen(false)} aria-label={tx('Đóng bộ lọc')}><X /></button>
        <label className="search-box"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(23)} />{query && <button onClick={() => setQuery('')} aria-label={tx('Xóa')}><X /></button>}</label>
        <p className="result-note">{query ? `${resultCount} ${tx('kết quả phù hợp')}` : `${memberCount} ${tx('thành viên')} · ${generationCount} ${tx('thế hệ')}`}</p>
        <div className="filter-title"><span>{t(24)}</span><ChevronDown /></div>
        <div className="generation-list">
          <button className={generation === null ? 'selected' : ''} onClick={() => setGeneration(null)}><Users />{t(25)}<span>{memberCount}</span></button>
          {generationLabels.map((label, index) => { const level = index + 1; const count = dataAvailable ? members.filter((member) => member.generation === level).length : 0; return <button className={generation === level ? 'selected' : ''} onClick={() => setGeneration(level)} key={label}><span className="generation-dot">{level}</span>{language === 'vi' ? label : `${tx('Đời thứ')} ${level}`}<span>{count}</span></button>; })}
        </div>
        <div className="legend"><p>{t(26)}</p>{appSettings.legends.map((label, index) => <span key={label}><i className={index === 0 ? 'legend-root' : ''} />{language === 'vi' ? label : tx(index === 0 ? 'Thủy tổ' : 'Thành viên dòng họ')}</span>)}</div>
      </aside>
      {menuOpen && <button className="backdrop" onClick={() => setMenuOpen(false)} aria-label={tx('Đóng bộ lọc')} />}

      <section className="content">
        {appSettings.show_brand_banner ? <TabBrand language={language} projectName={projectName} onLogoClick={() => setLogoMeaningOpen(true)} /> : <TabFallbackBrand language={language} projectName={projectName} />}
        {dataMode === 'sample' && <output className="sample-data-banner"><Database /><div className="sample-data-copy"><strong>Dữ liệu thử nghiệm · {SAMPLE_MEMBER_COUNT} thành viên · 5 đời</strong><p>Khi bắt đầu nhập dữ liệu chính thức, toàn bộ dữ liệu thử nghiệm sẽ bị xóa.</p></div></output>}
        {activeTab === 'Cây gia phả' ? <>
        <div className="content-heading"><div><h2>{t(27)}</h2></div><div className="view-chip"><Users /> {resultCount}</div></div>
        <div className="tree-viewport" ref={treeViewportRef}><div className="cloud cloud-one" /><div className="cloud cloud-two" />{dataAvailable ? <div className="tree-scale" style={{ transform: `scale(${zoom / 100})` }}><Tree family={familyTree} query={query} generation={generation} language={language} onSelect={openMemberProfile} /></div> : <div className="empty-data"><Database /><h3>{tx('Chưa có dữ liệu gia phả')}</h3><p>{tx('Dữ liệu trên thiết bị này đã được xóa.')}</p></div>}
          <div className="zoom-controls"><button onClick={() => setZoom(Math.max(24, zoom - 10))} aria-label={tx('Thu nhỏ')}><Minus /></button><output>{zoom}%</output><button onClick={() => setZoom(Math.min(120, zoom + 10))} aria-label={tx('Phóng to')}><Plus /></button><button onClick={fitTree} aria-label={tx('Tự động vừa màn hình')}><Maximize /></button></div>
        </div>
      </> : activeTab === 'Cài đặt' ? <div className="settings-view">
        <div className="settings-heading"><span>{t(29)}</span><h2>{t(28)}</h2><p>{t(30)}</p></div>
        <div className="settings-grid">
          <article className="setting-card display-card"><div className="setting-icon"><Monitor /></div><div className="setting-copy"><h3>{t(31)}</h3><p>{t(32)}</p><div className="setting-meta"><Sparkles /><span>Auto Scale</span></div></div>
            <div className="display-switch" aria-label={t(31)}>
              <button className={displayMode === 'auto' ? 'selected' : ''} onClick={() => changeDisplayMode('auto')}><Sparkles />{t(33)}</button>
              <button className={displayMode === 'desktop' ? 'selected' : ''} onClick={() => changeDisplayMode('desktop')}><Laptop />{t(34)}</button>
              <button className={displayMode === 'mobile' ? 'selected' : ''} onClick={() => changeDisplayMode('mobile')}><Smartphone />{t(35)}</button>
            </div>
          </article>
          {user && <AdminSettings language={language} user={user} settings={appSettings} onSettings={(nextSettings) => { ensureEnabledLanguage(nextSettings.enabled_languages); setAppSettings(nextSettings); }} dataAvailable={dataAvailable} dataMode={dataMode} memberCount={memberCount} generationCount={generationCount} onBackup={downloadBackup} onRestore={restoreData} onDelete={deleteData} onStartOfficial={startOfficialData} onRestoreSample={restoreSampleData} />}
        </div>
      </div> : activeTab === 'Tổng quan' ? <ProjectOverview language={language} memberCount={memberCount} generationCount={generationCount} onOpenTree={() => setActiveTab('Cây gia phả')} /> : activeTab === 'Sự kiện' ? <EventsView family={familyTree} language={language} onSelect={openMemberProfile} /> : activeTab === 'Tư liệu' ? <MaterialsWorkspace family={familyTree} language={language} dataMode={dataMode} canEdit={Boolean(user)} onSelect={openMemberProfile} /> : activeTab === 'Thành viên' && user ? <MemberManager family={familyTree} language={language} maxGeneration={Math.max(5, appSettings.generations.length)} dataMode={dataMode} onSave={saveFamily} requestedEditId={memberToEdit} onEditRequestHandled={() => setMemberToEdit(null)} /> : <div className="secondary-view"><span className="secondary-icon" aria-hidden="true">{/* oxlint-disable-next-line next/no-img-element -- welcome emblem is a local static project asset. */}<img className="secondary-welcome-medallion" src="/logofinal/welcome-lotus-medallion.png" alt="" /></span><p>PHẠM</p><h2>{translateTab(language,activeTab)}</h2><p>{activeTab === 'Thành viên' && !user ? tx('Khách tham quan chỉ có thể xem thông tin thành viên trong cây gia phả.') : language === 'vi' ? `Nội dung ${activeTab.toLocaleLowerCase('vi')} đang được tổng hợp trong phiên bản đầu tiên.` : t(2)}</p><button onClick={() => setActiveTab('Cây gia phả')}>{t(27)}</button></div>}</section>
    </div>
    <AlertDialog open={restrictedOpen} onOpenChange={setRestrictedOpen}><AlertDialogContent className="guest-dialog"><AlertDialogHeader><AlertDialogMedia><LockKeyhole /></AlertDialogMedia><AlertDialogTitle>{t(38)}</AlertDialogTitle><AlertDialogDescription>{t(39)}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t(40)}</AlertDialogCancel><AlertDialogAction onClick={() => { setRestrictedOpen(false); setGuestStarted(false); setAuthMode('signup'); setAuthPanel(true); }}>{t(3)}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <LogoMeaningDialog open={logoMeaningOpen} onOpenChange={setLogoMeaningOpen} language={language} />
    {selectedMember && <MemberProfile person={selectedMember} family={familyTree} language={language} isInternalUser={Boolean(user)} onClose={closeMemberProfile} onOpenChild={openChildProfile} onBack={memberProfileTrail.length ? returnToPreviousProfile : undefined} onEdit={() => { setMemberToEdit(selectedMember.id); closeMemberProfile(); setActiveTab('Thành viên'); }} />}
  </main>;
}
