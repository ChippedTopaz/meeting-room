# M0 Acceptance

M0 chưa được xác nhận PASS end-to-end. Checklist deployment dưới đây để trống đến khi có bằng chứng thực tế. Mock cục bộ không thay thế GAS/GitHub/Netlify thật.

## Kiểm tra trên deployment thật

- [ ] GAS doGet hoạt động qua URL /exec.
- [ ] ping hoạt động qua POST JSON.
- [ ] getSystemInfo đọc GitHub thành công, đúng tên hệ thống và timezone.
- [ ] getRooms đọc GitHub thành công, trả rooms rỗng.
- [ ] getRequirements đọc GitHub thành công, trả đủ bốn mục tiếng Việt.
- [ ] testGithubWriteInternal chạy thủ công, ghi GitHub thành công; timestamp và commit được xác minh.
- [ ] Frontend gọi GAS thành công: 4/4 API, response đọc được sau redirect, không lỗi CORS.
- [ ] Netlify deploy thành công và layout dùng được trên desktop/mobile.
- [ ] Netlify trả 404 cho /database/users/users.json, /database/logs/audit_2026.json và /gas/Main.gs.
- [ ] Public API từ chối getUsers, getAuditLogs, testWrite, writeJson, updateJson và testGithubWriteInternal.
- [ ] Response public không chứa password hash, token hoặc secret.

## Ghi nhận bằng chứng

Điền ngày kiểm tra, người thực hiện, URL deployment, kết quả Network/Execution log và commit SHA test ghi; không ghi PAT hoặc credentials vào tài liệu.

Chưa có GAS deployment URL hoặc GitHub credentials trong môi trường hiện tại. Chưa thực hiện ghi GitHub hay deploy Netlify.

## Kiểm tra cục bộ đã thực hiện

Các mục dưới đây được chạy bằng Node có sẵn với GAS/GitHub/fetch/DOM giả lập, không cài dependency và không truy cập dịch vụ thật:

- [x] Parse cú pháp toàn bộ JS/GS và bảy file JSON.
- [x] doGet và bốn route đọc trả envelope mong đợi; lọc token/passwordHash khỏi system info.
- [x] Action cấm bị từ chối trước khi gọi GitHub; JSON lỗi và request sai định dạng bị từ chối.
- [x] Tự thêm database/ đúng một lần; chặn đường dẫn traversal.
- [x] Hàm ghi nội bộ GET SHA rồi PUT đúng branch; timestamp và tiếng Việt giữ nguyên qua base64.
- [x] Lỗi GitHub được làm sạch; conflict có mã lỗi riêng.
- [x] Frontend kiểm tra URL, POST text/plain, xử lý lỗi mạng/timeout/JSON/API.
- [x] Điều phối UI giả lập hiển thị 4/4 khi thành công, 3/4 khi một API lỗi, bật lại nút sau kiểm tra.

Chưa kiểm tra hiển thị bằng trình duyệt thật, CORS thực tế hoặc rule Netlify trên deployment.
