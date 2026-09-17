# M0 Acceptance

## Bằng chứng người dùng cung cấp trước sửa tối ưu

- GAS và frontend https://phonghop.netlify.app đã được deploy.
- Local từng đạt 4/4 API.
- Production: ping và getSystemInfo thành công; getRooms và getRequirements timeout 30 giây.

Đây là báo cáo người dùng, không phải agent tái hiện lỗi trên trình duyệt. Bản tối ưu bên dưới chưa deploy; chưa xác nhận M0 PASS end-to-end.

## Kiểm tra cục bộ bản tối ưu

Lệnh: `node --test tests/m0.test.cjs`. Bảy test dùng mock, không gọi dịch vụ thật.

- [x] Cú pháp JS/GS và JSON hợp lệ.
- [x] Cold bootstrap đọc ba file qua một batch; warm hit không gọi GitHub; không lộ secret trong response/cache/log.
- [x] Cache mất/hỏng/lỗi đọc vẫn fallback; lỗi GitHub không bị cache.
- [x] Ghi danh mục thành công invalidate; ghi lỗi không invalidate; đọc booking bypass cache.
- [x] Route chẩn đoán cũ còn hoạt động; action ghi/nhạy cảm và clear cache không public.
- [x] Frontend tự gọi một bootstrap, chặn click trùng, xử lý lỗi không fallback sang bốn API.
- [x] Giữ timeout 30 giây; abort lúc đọc response body không bị báo nhầm lỗi JSON.

## Cần kiểm tra sau redeploy

- [ ] GAS deployment hiện có đã cập nhật phiên bản mới, URL /exec giữ nguyên.
- [ ] Netlify đã nhận frontend mới và giữ rule chặn database/gas.
- [ ] Mở trang tạo đúng một POST bootstrap, hiển thị đủ ba danh mục.
- [ ] Sau clearCatalogCacheInternal: miss, một log github_batch với ba status 200.
- [ ] Gọi lại trong TTL: hit, không có GitHub request trong execution đó (trừ cache bị evict).
- [ ] Đo clientMs/serverMs/Network, xác nhận không còn timeout trong các lần thử cold và warm.
- [ ] Local và Netlify chạy cùng code/URL, đều đọc được JSON sau redirect.
- [ ] Test ghi nội bộ được người dùng chủ động chạy và kiểm tra trên GitHub nếu cần; agent chưa chạy ghi thật.
- [ ] Public API không expose users, audit logs, write hoặc clear cache.
- [ ] Netlify trả 404 cho /database/users/users.json, /database/logs/audit_2026.json và /gas/Main.gs.

Ghi ngày kiểm tra, execution và timing thực tế; không ghi token. Cache danh mục không chứng minh booking concurrency an toàn, chưa triển khai booking ở M0.
