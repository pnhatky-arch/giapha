# GIA PHẢ HỌ PHẠM VĂN — Chạy thử trên máy

Gói này dùng để chạy ứng dụng trên máy cục bộ. Dữ liệu thử nghiệm được lưu trong thư mục `.wrangler` cạnh mã nguồn, hoàn toàn không kết nối Cloudflare hay cơ sở dữ liệu thật.

## Yêu cầu

- macOS, Windows hoặc Linux.
- Node.js 22.13 trở lên (khuyến nghị Node.js 22 LTS).
- Kết nối Internet ở lần chạy đầu để cài thư viện bằng `npm ci`.

## Cách chạy nhanh

### macOS

Giải nén, sau đó nhấp đúp `CHAY-THU.command`. Nếu macOS hỏi quyền chạy, mở Terminal tại thư mục này và chạy:

```bash
chmod +x CHAY-THU.command
./CHAY-THU.command
```

### Mọi hệ điều hành

Mở Terminal tại thư mục đã giải nén và chạy:

```bash
npm ci
npm run test:local
```

Sau khi server sẵn sàng, truy cập địa chỉ hiện trên Terminal (mặc định là `http://localhost:3000`).

Lần chạy đầu tự tạo cơ sở dữ liệu D1 cục bộ và áp dụng các migration. Tài khoản quản trị thử nghiệm là `devphamgia`; mật khẩu mặc định nằm trong `.dev.vars` và chỉ dùng cho máy cục bộ. Hãy đổi giá trị này trước khi chia sẻ gói với người khác.

## Lưu ý

- Không dùng gói này để triển khai Internet hoặc dữ liệu thật.
- Dữ liệu thử nghiệm được giữ lại giữa các lần chạy. Muốn làm lại từ đầu, xóa thư mục `.wrangler` trong thư mục đã giải nén rồi chạy lại `npm run test:local`.
- Để triển khai thật lên Cloudflare, dùng gói `GIA-PHA-HO-PHAM-VAN-cloudflare-final.zip` riêng.
