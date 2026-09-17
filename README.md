# Hệ thống quản lý phòng họp — M0

Skeleton kiểm tra kết nối: **Netlify Frontend → HTTPS/JSON → Google Apps Script Web App → GitHub JSON Database**. Chưa có đăng nhập, đặt phòng, dashboard, Zalo hoặc phân quyền production.

## Cấu trúc

- `index.html`, `css/main.css`, `js/`: frontend vanilla, không build, không dependency. `api.js` gọi GAS; `app.js` điều phối kiểm tra; `state.js` giữ trạng thái; `utils.js` hiển thị bằng textContent.
- `gas/Main.gs`: doGet, doPost với bốn route cố định và hàm test ghi nội bộ.
- `gas/GitHubDB.gs`: truy cập GitHub Contents API, UTF-8/base64, tự thêm `database/`, lấy SHA trước PUT.
- `gas/Security.gs`: allowlist M0, chưa phải authentication. `Cache.gs`: scaffold, chưa cache. `Utils.gs`: response và lỗi.
- `database/config/`: system và requirements; `users/`, `rooms/`, `bookings/`, `logs/`: JSON seed.
- `manifest.json`, `sw.js`: PWA scaffold; chưa đăng ký service worker, chưa offline, không icon giả.
- `netlify.toml`: publish root, chặn truy cập trực tiếp `/database/*` và `/gas/*` bằng HTTP 404.
- `M0_ACCEPTANCE.md`: checklist xác minh thực tế.

## 1. Chuẩn bị GitHub

Đưa các file seed lên repo `ChippedTopaz/meeting-room`, nhánh `main`, bằng quy trình Git do bạn chủ động thực hiện. Code M0 chỉ cập nhật file đã tồn tại. Agent không commit, push hay đổi remote.

Trong GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens, tạo token có thời hạn, resource owner `ChippedTopaz`, chọn **Only select repositories → meeting-room**. Cấp repository permission **Contents: Read and write** (đọc JSON và test ghi); Metadata read là quyền nền tảng GitHub yêu cầu. Không cấp quyền repository khác. Nếu repo thuộc tổ chức, hoàn tất approval theo chính sách tổ chức.

Chỉ lưu token trong Apps Script Properties, không dán vào frontend, source, README hoặc Git. Nếu repo public thì mọi JSON trong repo cũng public dù API đã chặn: M0 chỉ dùng dữ liệu giả; trước dữ liệu thật cần repo private và kiểm soát quyền phù hợp.

## 2. Tạo Apps Script project

1. Mở https://script.google.com, tạo New project, đặt tên `meeting-room-m0`.
2. Tạo các file `Main.gs`, `GitHubDB.gs`, `Cache.gs`, `Security.gs`, `Utils.gs`; copy nội dung tương ứng trong `gas/`. Xóa nội dung Code.gs mặc định nếu không dùng. Dùng runtime V8.
3. Trong Project Settings → Script Properties, thêm:

| Property | Giá trị |
| --- | --- |
| GITHUB_OWNER | ChippedTopaz |
| GITHUB_REPO | meeting-room |
| GITHUB_BRANCH | main |
| GITHUB_TOKEN | Fine-grained PAT của bạn |

Không lưu PAT trong User Properties hoặc code. Backend không trả các properties này cho frontend.

## 3. Deploy GAS Web App

1. Chọn Deploy → New deployment → Web app.
2. Execute as: **Me**. Who has access: **Anyone**, nếu chính sách tài khoản cho phép. Authorize các quyền Google được yêu cầu cho script, bao gồm gọi dịch vụ ngoài.
3. Copy URL kết thúc bằng `/exec`; không dùng URL `/dev` cho frontend.
4. Mở URL để kiểm tra doGet: response `success: true`, service `meeting-room`. Đây mới chỉ chứng minh GAS chạy, chưa chứng minh GitHub hoạt động.
5. Sau khi sửa code GAS, vào Manage deployments → Edit → New version → Deploy để cập nhật deployment.

**Cảnh báo M0:** Web App có thể deploy Anyone để frontend gọi được. Vì vậy chỉ expose API đọc an toàn. M1 bắt buộc triển khai application-layer authentication trước khi dùng dữ liệu người dùng thực tế. Không expose users.json hoặc audit log qua API public. M0 không phải production secure; chưa chống abuse, chưa có phân quyền.

## 4. Frontend và Netlify

1. Trong `js/api.js`, thay `PASTE_GAS_WEB_APP_EXEC_URL_HERE` bằng URL `/exec`. Đây là URL public, không phải token.
2. Deploy repo qua Netlify: không chọn framework, để trống Build command, Publish directory là `.`. Giữ `netlify.toml` để áp dụng rule chặn database và GAS source. Không cần npm install.
3. Mở site HTTPS, bấm **Kiểm tra kết nối**. Bốn ô phải hiển thị ping, system info, rooms rỗng và bốn requirements tiếng Việt.
4. DevTools → Network: request POST có Content-Type `text/plain;charset=utf-8`, body JSON `{ "action": "getRooms", "data": {} }`. Không thêm Authorization header ở frontend. GAS ContentService có redirect; fetch theo redirect mặc định/explicit follow. Không dùng `mode: no-cors` vì không đọc được response.
5. Kiểm tra trực tiếp `/database/users/users.json`, `/database/logs/audit_2026.json` và `/gas/Main.gs` trên site: phải HTTP 404, không trả file nguồn. Các rule này dành riêng Netlify; static server khác cần cấu hình tương đương.

Nếu chưa deploy Netlify, có thể xem layout bằng mở index.html, nhưng nghiệm thu frontend phải qua HTTP/HTTPS và GAS thật. Khi deploy thủ công, bảo đảm Netlify áp dụng cấu hình; luôn xác minh các URL bị chặn trước khi coi deployment đạt.

Lỗi thường gặp: URL chưa thay → thông báo cấu hình; trả HTML → sai deployment/quyền truy cập; HTTP 401/403 từ GitHub → PAT/quyền/hết hạn; HTTP 404 → owner/repo/branch/file chưa tồn tại hoặc token không có quyền; lỗi mạng/CORS → kiểm tra URL /exec, quyền Anyone, chính sách Workspace và redirect. Client timeout sau 30 giây. GAS có thể trả HTTP 200 kèm `success: false`; luôn kiểm tra envelope.

## 5. Test ghi nội bộ

Trong Apps Script Editor, chọn `testGithubWriteInternal` rồi Run; cấp quyền nếu được hỏi. Hàm đọc `database/config/system.json`, đặt `lastWriteTestAt` theo ISO UTC, lấy SHA và ghi qua `githubWriteJson`, sau đó Logger.log timestamp và SHA. Kiểm tra Execution log và mở file/commit trên GitHub để xác minh timestamp thực sự thay đổi.

**Thao tác Run này tạo commit trên GitHub bằng PAT của bạn.** Agent chưa chạy nó. Không gọi hàm qua frontend và không thêm route testWrite. API getSystemInfo chỉ trả các trường công khai đã chọn, không trả lastWriteTestAt; xác minh ghi trực tiếp trên GitHub.

M0 chưa retry conflict và chưa có transaction cho read-modify-write. Không chạy đồng thời các writer; M3 cần bổ sung kiểm soát cạnh tranh và hợp nhất thay đổi trước retry.

## API M0

Các action duy nhất: `ping`, `getSystemInfo`, `getRooms`, `getRequirements`. Client không được chỉ định đường dẫn database. Trường rooms công khai dự kiến: id, name, capacity, location, active; requirements: id, name, active. Không tự động trả toàn bộ object khi schema mở rộng.

Thành công: `{ "success": true, "data": {}, "message": "" }`.
Lỗi: `{ "success": false, "error": { "code": "ACTION_NOT_ALLOWED", "message": "..." } }`.

Gửi getUsers, getAuditLogs, testWrite, writeJson, updateJson hoặc tên hàm nội bộ đều phải bị từ chối. Không log/trả upstream body, token hay stack trace cho frontend.

## Nghiệm thu và tài liệu

Chỉ đánh dấu checklist sau khi quan sát kết quả thực tế; test mock cục bộ không chứng minh deployment hay credentials hoạt động.

- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Google Content Service và redirects](https://developers.google.com/apps-script/guides/content)
- [GitHub Contents API, quyền và SHA](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28)
- [Netlify redirect options và forced 404](https://docs.netlify.com/manage/routing/redirects/redirect-options/)
