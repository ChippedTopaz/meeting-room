# M0 Acceptance

## Trạng thái M0 và nguồn bằng chứng

**M0 đã hoàn tất acceptance, đủ điều kiện đóng milestone.** Bằng chứng production do người dùng xác nhận; bằng chứng code/mock được ghi riêng bên dưới. Toàn bộ tiêu chí đã được xử lý: PASS hoặc N/A/SUPERSEDED, không còn mục chờ kiểm tra.

Ngày cập nhật tài liệu: 2026-09-17. Giữ nguyên các giá trị `fetchedAt` và kết quả Network người dùng cung cấp; không suy diễn execution ID hoặc thời điểm thực hiện từng request từ `fetchedAt`.

## Kết quả production đã xác minh — PASS

- [x] Frontend production hoạt động tại https://phonghop.netlify.app.
- [x] Luồng đọc end-to-end: Netlify Frontend → Google Apps Script → GitHub JSON → Frontend hoạt động.
- [x] Frontend chỉ dùng một API `bootstrap` để tải `system`, `rooms`, `requirements`; bootstrap thành công.
- [x] Cache miss thành công; `serverMs` = 1391 ms, `clientMs` = 4327 ms.
- [x] Cache hit thành công; `serverMs` = 210 ms, `clientMs` = 5100 ms.
- [x] Các lần kiểm tra tiếp theo hoạt động ổn định; thời gian người dùng cảm nhận khi cache hit khoảng 2 giây. Đây không phải số đo `clientMs` hoặc Network chính xác.
- [x] Cache danh mục có TTL 120 giây, không cache booking/availability và có cơ chế invalidate sau khi ghi dữ liệu danh mục.
- [x] Luồng triển khai VS Code → clasp → Google Apps Script hoạt động.
- [x] GitHub → Netlify auto deploy hoạt động.
- [x] GAS Web App `/exec` và production end-to-end hoạt động.
- [x] GitHub PAT chỉ nằm trong GAS Script Properties; frontend không truy cập GitHub trực tiếp.
- [x] Không public API `getUsers`, `getAuditLogs`, `testWrite`, `writeJson`, `updateJson`.

M0 chưa triển khai Authentication; Authentication thuộc M1. Hoàn tất acceptance M0 không đồng nghĩa đã triển khai xác thực.

## Bằng chứng lịch sử trước sửa tối ưu

- GAS và frontend https://phonghop.netlify.app đã được deploy.
- Local từng đạt 4/4 API.
- Production: ping và getSystemInfo thành công; getRooms và getRequirements timeout 30 giây.

Đây là báo cáo lịch sử của người dùng, không phải agent tái hiện lỗi trên trình duyệt. Trạng thái chưa deploy/chưa PASS end-to-end trước đây đã được thay thế bằng kết quả production ở trên.

## Kiểm tra cục bộ bản tối ưu

Lệnh: `node --test tests/m0.test.cjs`. Bảy test dùng mock, không gọi dịch vụ thật. FINAL M0 VERIFICATION: chạy lại đạt 7/7 PASS. Sandbox chặn lần đầu với `spawn EPERM`; đã xin phép và chạy lại ngoài sandbox thành công. Đây là lỗi môi trường chạy test, không phải FAIL chức năng.

- [x] Cú pháp JS/GS và JSON hợp lệ.
- [x] Cold bootstrap đọc ba file qua một batch; warm hit không gọi GitHub; không lộ secret trong response/cache/log.
- [x] Cache mất/hỏng/lỗi đọc vẫn fallback; lỗi GitHub không bị cache.
- [x] Ghi danh mục thành công invalidate; ghi lỗi không invalidate; đọc booking bypass cache.
- [x] Route chẩn đoán cũ còn hoạt động; action ghi/nhạy cảm và clear cache không public.
- [x] Frontend tự gọi một bootstrap, chặn click trùng, xử lý lỗi không fallback sang bốn API.
- [x] Giữ timeout 30 giây; abort lúc đọc response body không bị báo nhầm lỗi JSON.

## Đối chiếu checklist sau redeploy ban đầu

FINALIZE M0 ACCEPTANCE: trong 9 mục ban đầu chưa chọn, 8 đã PASS và 1 N/A/SUPERSEDED theo quyết định của người dùng. Cộng tiêu chí ghi nội bộ đã PASS trước đó, checklist sau redeploy có 9 PASS và 1 N/A/SUPERSEDED. PASS bằng code/mock không khẳng định đã quan sát execution production tương ứng. Agent không gọi dịch vụ production trong lần cập nhật tài liệu này.

- [x] GAS deployment hiện có đã cập nhật phiên bản bootstrap/cache mới, URL /exec giữ nguyên. PASS theo xác nhận production cuối cùng của người dùng: deployment sử dụng đúng URL đã cấu hình.
- [x] Netlify đã nhận frontend mới và giữ rule chặn database/gas. PASS theo báo cáo production/auto deploy và inspection cấu hình; HTTP thực tế có tiêu chí riêng bên dưới.
- [x] Mở trang tạo đúng một POST bootstrap, hiển thị đủ ba danh mục. PASS theo báo cáo production mới, inspection và test frontend.
- [x] Sau clearCatalogCacheInternal: miss, một log github_batch với ba status 200. PASS bằng mock bổ sung; production miss đã có bằng chứng, không tuyên bố đã chạy clear/đọc log production.
- [x] Gọi lại trong TTL: hit, không có GitHub request trong execution đó (trừ cache bị evict). PASS bằng code/mock với cache còn hiệu lực và production hit đã xác nhận; không tuyên bố đã đọc execution production.
- [x] Xác minh clientMs/serverMs cho cold và warm, response thành công không timeout, cùng luồng redirect ContentService qua Network. PASS theo bằng chứng cuối cùng bên dưới; không yêu cầu thêm số đo Network Duration riêng.
- **N/A / SUPERSEDED — đối chiếu local và Netlify bằng local browser:** không thực hiện test local-vs-production riêng và không ghi PASS. Theo quyết định của người dùng, production end-to-end đã được xác minh trên chính source/deployment hiện tại; chạy lại cùng frontend qua local HTTP server không cung cấp thêm bằng chứng cần thiết để đóng M0. Tiêu chí cũ được thay thế bằng nghiệm thu production end-to-end và redirect thực tế.
- [x] Test ghi nội bộ được người dùng chủ động chạy và kiểm tra trên GitHub nếu cần; agent chưa chạy ghi thật. Người dùng xác nhận luồng GAS → GitHub API → JSON đã được kiểm thử thành công trước đó bằng `testGithubWriteInternal()`.
- [x] Public API không expose users, audit logs, write hoặc clear cache. PASS bằng inspection allowlist/dispatch và test mock doPost.
- [x] Protected paths must not expose database files or GAS source in production. PASS cho `/database/users/users.json`, `/database/logs/audit_2026.json`, `/gas/Main.gs`: cả ba trả giao diện application index, không trả JSON database hoặc GAS source. Tiêu chí thay thế yêu cầu HTTP 404 trước đây; không khẳng định status HTTP của ba URL này.

### Bằng chứng inspection và test bổ sung

- Inspection trước đó ghi nhận `netlify.toml`: publish `.`; hai rule `/database/*`, `/gas/*` có `status = 404`, `force = true`, đích `/index.html`. Đây là nội dung cấu hình, không phải bằng chứng HTTP 404 thực tế. Theo quan sát production của người dùng, các protected paths được rewrite về application index thay vì trả file thật. Không sửa cấu hình trong bước acceptance này.
- `index.html` nạp `app.js` một lần. `app.js` gọi một bootstrap khi mở trang, chặn click trùng, không retry/fallback; `api.js` gửi POST, dùng `redirect: 'follow'`, đọc JSON và timeout 30 giây. `getBootstrap_` trả cả system/rooms/requirements; frontend kiểm tra payload rồi render cả ba. Người dùng đã xác nhận production hiển thị đủ ba danh mục.
- `Security.gs` chỉ cho phép `ping`, `bootstrap`, `getSystemInfo`, `getRooms`, `getRequirements`; `Main.gs` dispatch bằng switch cố định, không gọi tùy ý theo tên hàm. Mock xác nhận `getUsers`, `getAuditLogs`, `testWrite`, `writeJson`, `updateJson`, `testGithubWriteInternal`, `clearCatalogCacheInternal`, `__proto__` bị `ACTION_NOT_ALLOWED` và không thêm GitHub request. GET chỉ trả thông tin service.
- Chạy một test bổ sung trực tiếp trong bộ nhớ bằng harness mock hiện có, không sửa file test: tổng 8/8 PASS (7 cũ + 1 bổ sung). Test nạp cache, clear nội bộ, gọi bootstrap và xác nhận miss, đúng một log `github_batch`, count 3, statuses `[200, 200, 200]`; gọi lại ngay xác nhận hit, không thêm request và không có log `github_batch`/`github_fetch`.
- Test bổ sung xác nhận đủ ba danh mục, `cacheTtlSeconds = 120`, `fetchedAt` hợp lệ, `serverMs`, batch timing và `api_complete` với hit/timing. Mock không mô phỏng đồng hồ eviction của GAS. Test cũ kiểm tra cache mất/hỏng/lỗi, invalidate sau ghi và booking bypass.
- Inspection xác nhận `github_fetch`, `github_batch`, `api_complete`, `api_error` có timing; frontend tính `clientMs`. Các test không gọi mạng hay ghi GitHub thật.

### Bằng chứng manual verification cuối cùng

Người dùng xác nhận deployment hiện tại chạy phiên bản bootstrap/cache mới trên đúng GAS Web App URL đã cấu hình, không đổi URL.

| Quan sát | cache | fetchedAt | cacheTtlSeconds | serverMs | clientMs |
| --- | --- | --- | ---: | ---: | ---: |
| COLD / CACHE MISS | miss | 2026-09-17T15:36:08.760Z | 120 | 544 | 2219 |
| WARM / CACHE HIT | hit | 2026-09-17T15:28:59.249Z | 120 | 154 | 1822 |

Cả hai response thành công, không timeout. Hai giá trị `fetchedAt` được giữ nguyên như cung cấp; giá trị của hit sớm hơn miss, nên không coi đây là một cặp miss → hit liên tiếp trên cùng snapshot cache. Bằng chứng này xác nhận hai trạng thái production; logic hit không gọi GitHub đã được kiểm chứng riêng bằng mock.

Network đã xác minh: POST `/exec` → HTTP 302 → redirect GET `script.googleusercontent.com/macros/echo` → HTTP 200. Không ghi thêm Network Duration chưa được cung cấp.

Local browser test riêng được người dùng quyết định N/A/SUPERSEDED như trên. Ba protected paths đã kiểm tra trực tiếp trên production: không trả JSON/GAS source, đều hiển thị `index.html` của ứng dụng. Ghi nhận hành vi rewrite về application index; không suy diễn HTTP 404 hoặc HTTP 200 cho các protected paths.

### Kết luận FINAL M0 VERIFICATION

Toàn bộ tài liệu có 28 checkbox PASS và 1 tiêu chí N/A/SUPERSEDED; không còn checkbox chưa xử lý, FAIL hoặc NEEDS MANUAL TEST. M0 đủ điều kiện đóng theo phạm vi acceptance đã được người dùng xác nhận; không chuyển việc kiểm tra M0 sang M1. Không sửa code/config, thêm dependency, commit/push/deploy hay bắt đầu M1. README không thay đổi thêm trong vòng này.

Không ghi token. Cache danh mục không chứng minh booking concurrency an toàn, chưa triển khai booking ở M0.
