export const SAMPLE_FIXTURE_VERSION = '2026-10-02-v1';

export type SampleTombSweepingEvent = {
  id: string;
  date: string;
  location: string;
  branch: string;
  note: string;
  repeatYearly: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
};

export type SampleFamilyWorkEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  note: string;
  repeatYearly: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
};

export type SampleMaterialItem = {
  id: string;
  parent_id: string | null;
  kind: 'folder' | 'note' | 'link';
  title: string;
  content: string;
  created_by_username: string;
  updated_by_username: string;
  created_at: number;
  updated_at: number;
};

const BASE_TIME = Date.UTC(2026, 0, 1, 8, 0, 0);

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function sampleTombSweepingEvents(anchor = new Date()): SampleTombSweepingEvent[] {
  const year = anchor.getFullYear();
  const rows = [
    ['01', 1, 18, 'Nghĩa trang gia tộc', 'Chi 1', 'Chạp mộ đầu năm, kiểm tra bia mộ và vệ sinh khuôn viên.', true],
    ['02', 3, 12, 'Khu mộ tổ', 'Toàn họ', 'Dâng hương và chỉnh trang phần mộ Thủy tổ.', true],
    ['03', 5, 24, 'Nghĩa trang quê nhà', 'Chi 2', 'Phân công con cháu chuẩn bị dụng cụ và hoa lễ.', true],
    ['04', 7, 6, 'Khu mộ phía Đông', 'Chi 3', 'Kiểm tra thoát nước mùa mưa, bổ sung đất và cây xanh.', false],
    ['05', 9, 15, 'Khu mộ tổ', 'Toàn họ', 'Chạp mộ trước mùa lễ cuối năm.', true],
    ['06', 10, 2, 'Nghĩa trang gia tộc', 'Chi 1', 'Mốc thử nghiệm đúng ngày 02/10 để kiểm tra trạng thái sự kiện.', false],
    ['07', 11, 20, 'Khu mộ phía Tây', 'Chi 2', 'Vệ sinh, thay chân hương và rà soát danh sách phần mộ.', true],
    ['08', 12, 27, 'Khu mộ tổ', 'Toàn họ', 'Chạp mộ cuối năm, tổng hợp phần việc cần tu sửa.', true],
  ] as const;
  return rows.map(([suffix, month, day, location, branch, note, repeatYearly], index) => ({
    id: `sample-chapa-${suffix}`,
    date: isoDate(year, month, day),
    location,
    branch,
    note,
    repeatYearly,
    createdAt: BASE_TIME + index * 60_000,
    updatedAt: BASE_TIME + index * 60_000,
    createdBy: 'sample',
  }));
}

export function sampleFamilyWorkEvents(anchor = new Date()): SampleFamilyWorkEvent[] {
  const year = anchor.getFullYear();
  const rows = [
    ['01', 'Họp Hội đồng gia tộc', 1, 10, 'Từ đường họ Phạm', 'Tổng kết năm trước, phân công công việc và thống nhất lịch sinh hoạt.', true],
    ['02', 'Lễ dâng hương đầu xuân', 2, 16, 'Từ đường họ Phạm', 'Con cháu tập trung dâng hương, tưởng niệm tổ tiên.', true],
    ['03', 'Trao học bổng khuyến học', 4, 21, 'Nhà sinh hoạt gia tộc', 'Tuyên dương con cháu có thành tích học tập tốt.', true],
    ['04', 'Họp Chi 1', 6, 8, 'Nhà Trưởng chi 1', 'Rà soát thông tin thành viên và bổ sung tư liệu của chi.', false],
    ['05', 'Họp Chi 2', 7, 19, 'Nhà Trưởng chi 2', 'Đối chiếu dữ liệu gia phả, ngày sinh và ngày kỵ.', false],
    ['06', 'Họp Chi 3', 8, 23, 'Nhà Trưởng chi 3', 'Cập nhật kế hoạch Chạp mộ và công việc cuối năm.', false],
    ['07', 'Tu sửa từ đường', 9, 28, 'Từ đường họ Phạm', 'Kiểm tra mái, hệ thống điện và khu vực thờ tự.', false],
    ['08', 'Ngày hội gia đình', 10, 18, 'Nhà sinh hoạt gia tộc', 'Gặp mặt sáu thế hệ, chụp ảnh và bổ sung tư liệu.', true],
    ['09', 'Kiểm kê tư liệu gia phả', 11, 11, 'Phòng lưu trữ', 'Đối chiếu văn bản, hình ảnh và liên kết đã số hóa.', true],
    ['10', 'Tổng kết hoạt động năm', 12, 22, 'Từ đường họ Phạm', 'Tổng hợp hoạt động, tài liệu mới và kế hoạch năm sau.', true],
  ] as const;
  return rows.map(([suffix, title, month, day, location, note, repeatYearly], index) => ({
    id: `sample-family-work-${suffix}`,
    title,
    date: isoDate(year, month, day),
    location,
    note,
    repeatYearly,
    createdAt: BASE_TIME + (index + 20) * 60_000,
    updatedAt: BASE_TIME + (index + 20) * 60_000,
    createdBy: 'sample',
  }));
}

export const sampleMaterialItems: SampleMaterialItem[] = [
  {
    id: 'sample-folder-pha-he', parent_id: null, kind: 'folder', title: 'Phả hệ & gia phả', content: '',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME, updated_at: BASE_TIME,
  },
  {
    id: 'sample-folder-van-ban', parent_id: null, kind: 'folder', title: 'Văn bản dòng họ', content: '',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 1, updated_at: BASE_TIME + 1,
  },
  {
    id: 'sample-folder-hinh-anh', parent_id: null, kind: 'folder', title: 'Hình ảnh & kỷ niệm', content: '',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 2, updated_at: BASE_TIME + 2,
  },
  {
    id: 'sample-folder-chi-1', parent_id: 'sample-folder-pha-he', kind: 'folder', title: 'Chi 1 · Phạm Văn Bình', content: '',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 3, updated_at: BASE_TIME + 3,
  },
  {
    id: 'sample-note-nguon-goc', parent_id: 'sample-folder-pha-he', kind: 'note', title: 'Ghi chép nguồn gốc dòng họ',
    content: 'Bản ghi thử nghiệm dùng để kiểm tra hiển thị nội dung dài, chỉnh sửa, tìm kiếm và phân loại tư liệu. Nội dung chính thức sẽ được thay bằng thông tin đã được gia tộc xác minh.',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 4, updated_at: BASE_TIME + 4,
  },
  {
    id: 'sample-note-chi-1', parent_id: 'sample-folder-chi-1', kind: 'note', title: 'Danh mục tư liệu Chi 1',
    content: 'Danh sách mẫu: gia phả giấy, ảnh từ đường, biên bản họp chi, tài liệu ngày kỵ và Chạp mộ.',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 5, updated_at: BASE_TIME + 5,
  },
  {
    id: 'sample-note-noi-quy', parent_id: 'sample-folder-van-ban', kind: 'note', title: 'Nội quy lưu trữ tư liệu',
    content: 'Tư liệu trước khi công bố cần ghi rõ nguồn, người cung cấp và thời điểm đối chiếu. Không đưa thông tin riêng tư chưa được phép vào phần công khai.',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 6, updated_at: BASE_TIME + 6,
  },
  {
    id: 'sample-note-bien-ban', parent_id: 'sample-folder-van-ban', kind: 'note', title: 'Biên bản họp gia tộc mẫu',
    content: 'Mẫu nội dung dùng để thử thao tác mở, sửa, đổi thư mục và xóa tư liệu.',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 7, updated_at: BASE_TIME + 7,
  },
  {
    id: 'sample-link-tham-khao', parent_id: 'sample-folder-pha-he', kind: 'link', title: 'Liên kết tham khảo về gia phả',
    content: 'https://vi.wikipedia.org/wiki/Gia_ph%E1%BA%A3',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 8, updated_at: BASE_TIME + 8,
  },
  {
    id: 'sample-link-luu-tru', parent_id: 'sample-folder-van-ban', kind: 'link', title: 'Kho lưu trữ tham khảo',
    content: 'https://www.archives.gov/',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 9, updated_at: BASE_TIME + 9,
  },
  {
    id: 'sample-note-anh-cu', parent_id: 'sample-folder-hinh-anh', kind: 'note', title: 'Mô tả album ảnh cũ',
    content: 'Mục mẫu để thử gắn ảnh/video từ R2, chỉnh tiêu đề và kiểm tra danh sách media.',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 10, updated_at: BASE_TIME + 10,
  },
  {
    id: 'sample-link-ban-do', parent_id: 'sample-folder-hinh-anh', kind: 'link', title: 'Bản đồ khu mộ tham khảo',
    content: 'https://www.openstreetmap.org/',
    created_by_username: 'sample', updated_by_username: 'sample', created_at: BASE_TIME + 11, updated_at: BASE_TIME + 11,
  },
];
