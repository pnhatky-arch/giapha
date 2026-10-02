'use client';

import { useEffect } from 'react';
import { SAMPLE_GENERATION_COUNTS, SAMPLE_MEMBER_COUNT } from '@/lib/family-tree';

export default function SampleFixtureEnhancements() {
  useEffect(() => {
    let frame = 0;

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        document.querySelectorAll<HTMLElement>('.sample-data-banner strong').forEach((node) => {
          if ((node.textContent ?? '').includes('Dữ liệu thử nghiệm')) {
            node.textContent = `Dữ liệu thử nghiệm · ${SAMPLE_MEMBER_COUNT} thành viên · ${SAMPLE_GENERATION_COUNTS.length} đời`;
          }
        });

        document.querySelectorAll<HTMLElement>('.sample-member-notice p').forEach((node) => {
          if (/\d+ thành viên này chỉ dùng để tham khảo/.test(node.textContent ?? '')) {
            node.textContent = `${SAMPLE_MEMBER_COUNT} thành viên này chỉ dùng để tham khảo. Quản trị cấp cao cần vào Cài đặt và chọn “Bắt đầu nhập dữ liệu chính thức” trước khi thêm hoặc sửa thành viên.`;
          }
        });
      });
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
