export type LoginNoticeSettings = {
  enabled: boolean;
  showOnLogin: boolean;
  showOnMain: boolean;
  title: string;
  content: string;
};

export const DEFAULT_LOGIN_NOTICE: LoginNoticeSettings = {
  enabled: true,
  showOnLogin: true,
  showOnMain: false,
  title: 'Ghi chú',
  content: 'Ứng dụng hiện đang trong giai đoạn thử nghiệm. Khi phát hành chính thức, tài khoản cần hoàn tất Xác minh danh tính để mở khóa toàn bộ chức năng.',
};

export function isValidLoginNotice(value: unknown): value is LoginNoticeSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const notice = value as Record<string, unknown>;
  return typeof notice.enabled === 'boolean'
    && (notice.showOnLogin === undefined || typeof notice.showOnLogin === 'boolean')
    && (notice.showOnMain === undefined || typeof notice.showOnMain === 'boolean')
    && typeof notice.title === 'string' && notice.title.trim().length >= 1 && notice.title.trim().length <= 120
    && typeof notice.content === 'string' && notice.content.trim().length >= 1 && notice.content.trim().length <= 1_000;
}

export function normalizeLoginNotice(value: unknown): LoginNoticeSettings {
  if (!isValidLoginNotice(value)) return { ...DEFAULT_LOGIN_NOTICE };
  const notice = value as Record<string, unknown>;
  return {
    enabled: notice.enabled as boolean,
    showOnLogin: typeof notice.showOnLogin === 'boolean' ? notice.showOnLogin : DEFAULT_LOGIN_NOTICE.showOnLogin,
    showOnMain: typeof notice.showOnMain === 'boolean' ? notice.showOnMain : DEFAULT_LOGIN_NOTICE.showOnMain,
    title: (notice.title as string).trim(),
    content: (notice.content as string).trim(),
  };
}
