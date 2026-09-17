# Hệ thống quản lý phòng họp — M0

Skeleton kiểm tra kết nối: **Netlify Frontend → HTTPS/JSON → Google Apps Script Web App → GitHub JSON Database**. Chưa có đăng nhập, đặt phòng, dashboard, Zalo hoặc phân quyền production.

**Trạng thái M0:** Đã hoàn thành kiểm thử production theo xác nhận của người dùng. Kết quả PASS và các chi tiết checklist chưa được xác minh riêng được ghi tại [M0_ACCEPTANCE.md](M0_ACCEPTANCE.md).

## Cấu trúc

- `index.html`, `css/main.css`, `js/`: frontend vanilla, không build, không dependency. `api.js` gọi GAS; `app.js` điều phối kiểm tra; `state.js` giữ trạng thái; `utils.js` hiển thị bằng textContent.
- `gas/Main.gs`: doGet, doPost với bootstrap và bốn route chẩn đoán cố định và hàm test ghi nội bộ.
- `gas/GitHubDB.gs`: truy cập GitHub Contents API, UTF-8/base64, tự thêm `database/`, lấy SHA trước PUT.
- `gas/Security.gs`: allowlist M0, chưa phải authentication. `Cache.gs`: cache danh mục công khai 120 giây, chỉ bootstrap sử dụng. `Utils.gs`: response và lỗi.
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
3. Mở site HTTPS, bấm **Kiểm tra kết nối**. Trang tự gọi bootstrap một lần; bốn ô hiển thị trạng thái GAS, system info, rooms và requirements. Nút kiểm tra gọi lại bootstrap, có thể dùng cache.
4. DevTools → Network: request POST có Content-Type `text/plain;charset=utf-8`, body JSON `{ "action": "bootstrap", "data": {} }`. Không thêm Authorization header ở frontend. GAS ContentService có redirect; fetch theo redirect mặc định/explicit follow. Không dùng `mode: no-cors` vì không đọc được response.
5. Kiểm tra trực tiếp `/database/users/users.json`, `/database/logs/audit_2026.json` và `/gas/Main.gs` trên site: phải HTTP 404, không trả file nguồn. Các rule này dành riêng Netlify; static server khác cần cấu hình tương đương.

Nếu chưa deploy Netlify, có thể xem layout bằng mở index.html, nhưng nghiệm thu frontend phải qua HTTP/HTTPS và GAS thật. Khi deploy thủ công, bảo đảm Netlify áp dụng cấu hình; luôn xác minh các URL bị chặn trước khi coi deployment đạt.

Lỗi thường gặp: URL chưa thay → thông báo cấu hình; trả HTML → sai deployment/quyền truy cập; HTTP 401/403 từ GitHub → PAT/quyền/hết hạn; HTTP 404 → owner/repo/branch/file chưa tồn tại hoặc token không có quyền; lỗi mạng/CORS → kiểm tra URL /exec, quyền Anyone, chính sách Workspace và redirect. Client timeout sau 30 giây. GAS có thể trả HTTP 200 kèm `success: false`; luôn kiểm tra envelope.

## 5. Test ghi nội bộ

Trong Apps Script Editor, chọn `testGithubWriteInternal` rồi Run; cấp quyền nếu được hỏi. Hàm đọc `database/config/system.json`, đặt `lastWriteTestAt` theo ISO UTC, lấy SHA và ghi qua `githubWriteJson`, sau đó Logger.log timestamp và SHA. Kiểm tra Execution log và mở file/commit trên GitHub để xác minh timestamp thực sự thay đổi.

**Thao tác Run này tạo commit trên GitHub bằng PAT của bạn.** Agent chưa chạy nó. Không gọi hàm qua frontend và không thêm route testWrite. API getSystemInfo chỉ trả các trường công khai đã chọn, không trả lastWriteTestAt; xác minh ghi trực tiếp trên GitHub.

M0 chưa retry conflict và chưa có transaction cho read-modify-write. Không chạy đồng thời các writer; M3 cần bổ sung kiểm soát cạnh tranh và hợp nhất thay đổi trước retry.

## API M0

Các action public: `bootstrap`, `ping`, `getSystemInfo`, `getRooms`, `getRequirements`. Frontend chỉ gọi bootstrap; bốn action cũ dùng chẩn đoán, không cache. Client không được chỉ định đường dẫn database. Trường rooms công khai dự kiến: id, name, capacity, location, active; requirements: id, name, active. Không tự động trả toàn bộ object khi schema mở rộng.

Thành công: `{ "success": true, "data": {}, "message": "" }`.
Lỗi: `{ "success": false, "error": { "code": "ACTION_NOT_ALLOWED", "message": "..." } }`.

Gửi getUsers, getAuditLogs, testWrite, writeJson, updateJson hoặc tên hàm nội bộ đều phải bị từ chối. Không log/trả upstream body, token hay stack trace cho frontend.

## Nghiệm thu và tài liệu

Chỉ đánh dấu checklist sau khi quan sát kết quả thực tế; test mock cục bộ không chứng minh deployment hay credentials hoạt động.

- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Google Content Service và redirects](https://developers.google.com/apps-script/guides/content)
- [GitHub Contents API, quyền và SHA](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28)
- [Netlify redirect options và forced 404](https://docs.netlify.com/manage/routing/redirects/redirect-options/)


## Tối ưu latency sau triển khai M0

### Kết luận chẩn đoán

Theo báo cáo người dùng: local từng đạt 4/4; Netlify production ping và getSystemInfo thành công, getRooms/getRequirements hết hạn 30 giây. Đọc code xác nhận frontend cũ dùng Promise.all nên gửi bốn POST song song, không phải tuần tự. Mỗi POST tới GAS gọi doPost riêng; ping không gọi GitHub, ba action còn lại mỗi action gọi GitHub Contents API một lần. Cache.gs cũ chỉ có comment, hoàn toàn chưa dùng CacheService. Service worker cũng chưa đăng ký, không có offline cache gây stale response.

Nguyên nhân trực tiếp quan sát được là client hết deadline 30 giây trước khi nhận/đọc xong response. Chưa có trace Network và Execution log của lần lỗi nên **chưa xác định được tầng gây chậm**, không thể khẳng định Netlify, giới hạn hai execution, GitHub throttling hay cold start là thủ phạm. Netlify chỉ phục vụ static assets; API đi từ trình duyệt trực tiếp tới GAS, không qua Netlify Function/proxy.

Các khả năng cần phân biệt: chờ khởi chạy GAS, chậm UrlFetchApp/GitHub, chậm redirect ContentService, điều kiện mạng/trình duyệt khác nhau hoặc bản local và production khác URL/code/deployment. Một lần local thành công chỉ xác nhận lần chạy đó. Việc hai action cùng endpoint thành công làm lỗi CORS/cấu hình chung ít phù hợp hơn, nhưng không loại trừ lỗi mạng/redirect riêng từng request. Rooms ít dữ liệu không đảm bảo nhanh: chi phí request và execution có thể lớn hơn thời gian parse JSON. File thiếu hoặc token sai thường trả lỗi HTTP rõ ràng khi upstream phản hồi, không có bằng chứng đó là nguyên nhân timeout này.

### Luồng trước và sau

| Luồng | POST trình duyệt → GAS | Lần chạy doPost | GitHub GET |
| --- | ---: | ---: | ---: |
| Cũ, mỗi lần bấm kiểm tra | 4 song song | 4 | 3 |
| Mới, mở trang hoặc bấm kiểm tra, cache miss | 1 bootstrap | 1 | 3 qua fetchAll |
| Mới, cache hit | 1 bootstrap | 1 | 0 |

Cold bootstrap vẫn cần ba GitHub request vì ba file độc lập; fetchAll gom chúng trong cùng execution, không phải một GitHub request duy nhất. Cache giảm request cho các lần mở sau, không loại bỏ latency nền tảng của GAS. Không tăng timeout (vẫn 30 giây), không tự retry và không fallback thành bốn request. Bootstrap chỉ trả thành công khi đủ ba danh mục; lỗi một nguồn làm cả bootstrap lỗi, không trộn dữ liệu cũ/mới hay báo thành công một phần.

ScriptCache dùng chung trong project, key gồm version cache + owner/repo/branch, không chứa PAT. Chỉ lưu các trường danh mục public sau khi lọc. TTL 120 giây; có thể bị evict sớm. Cache lỗi/miss thì đọc GitHub lại, không cache lỗi. Mỗi lần ghi thành công vào system/rooms/requirements qua githubUpdateFile sẽ invalidate cache. Sửa trực tiếp trên GitHub thì chờ TTL hoặc chạy clearCatalogCacheInternal trong Editor; hàm này không có route public. Khi đổi cấu trúc payload cache, tăng version key.

Với dưới 10 phòng, khoảng 15 người và JSON nhỏ, đây là tối ưu đủ gọn cho M0. Không thêm distributed lock, trigger refresh hay database mới. Nhiều người cùng mở lúc cache miss có thể tạo batch trùng; đây là tradeoff M0, không hứa chỉ một batch trên toàn hệ thống. Cache danh mục có eventual consistency: read đang chạy đồng thời write có thể nạp lại snapshot cũ tới hết TTL; invalidate không phải transaction. Không dùng cache này để quyết định room active, quyền hay chế độ đặt phòng tại thời điểm ghi booking.

**Booking availability tuyệt đối không nằm trong bootstrap/cache.** Các hàm githubGetJson/githubGetFile/githubWriteJson vẫn đọc/ghi trực tiếp. M3 phải đọc dữ liệu booking mới, kiểm tra xung đột và xử lý concurrency ở backend khi ghi; cache danh mục không giải quyết double booking.

### Đo thời gian để xác định tầng gây chậm

Response bootstrap có `meta.cache`, `fetchedAt`, `cacheTtlSeconds`, `serverMs`; giao diện GAS status bổ sung `clientMs`. serverMs đo bên trong handler bootstrap, không gồm thời gian chờ khởi chạy GAS hoặc redirect/network. clientMs gồm toàn bộ fetch và đọc JSON. Hiệu hai số là dấu hiệu để điều tra, không phải phép đo chính xác cold start.

Trong Apps Script Executions, xem log `github_batch` (thời gian batch và HTTP status theo thứ tự system, rooms, requirements), `github_fetch` (route chẩn đoán đơn), `api_complete` và `api_error`. Không log headers, token, body GitHub hoặc dữ liệu người dùng. Nếu batch chậm, kiểm tra GitHub/UrlFetch; nếu server nhanh nhưng client chậm, đối chiếu Network Timing, redirect và thời điểm execution bắt đầu. Client abort không đảm bảo GAS execution dừng.

Để so sánh local và production, dùng cùng URL /exec, cùng code frontend, cùng thời điểm; chạy từng action cũ tuần tự để chẩn đoán. Đối chiếu Network payload và mã JS production để loại trừ deploy cũ. Không có execution tương ứng thì kiểm tra request có tới GAS chưa. Không thể chứng minh CORS bằng curl/PowerShell; phải test bằng trình duyệt tại origin Netlify.

### Lệnh test và redeploy (người dùng tự chạy)

Từ thư mục gốc:

```powershell
node --test tests/m0.test.cjs
```

Bộ test chỉ dùng Node built-ins và mock; không gọi mạng, không ghi database. Kiểm tra syntax, cache hit/miss/failure, batch, field filtering, invalidation, booking bypass, action cấm và frontend chỉ gọi một bootstrap.

**Deploy GAS trước frontend.** Cách đơn giản: copy năm file .gs vào project hiện có → Deploy → Manage deployments → chọn deployment đang dùng → Edit → New version → Deploy. Giữ deployment hiện có để URL /exec không đổi. Không cần sửa token/Script Properties.

Nếu dùng clasp đã cài, repo hiện chưa có .clasp.json. Lấy Script ID từ Project Settings (khác Deployment ID trong /exec), rồi tự liên kết đúng project:

```powershell
clasp login
@{ scriptId = 'DIEN_SCRIPT_ID_HIEN_CO'; rootDir = 'gas' } | ConvertTo-Json | Set-Content .clasp.json -Encoding ascii
clasp status
clasp push
clasp update-deployment 'AKfycbxgkgn7MuSkDkthxCVC9OGCUmdxfqXWKLwVOYbyujItJqkrHHny2yHegk9jLVxl-JCY' --description 'M0 bootstrap and catalog cache'
```

Nếu chưa bật Apps Script API cho tài khoản, bật tại https://script.google.com/home/usersettings trước khi dùng clasp. `clasp status` phải chỉ liệt kê GAS files dưới gas/. Lệnh push ở đây tải code lên Apps Script, không phải Git push. Chỉ chạy sau khi đã điền đúng Script ID. .clasp.json đã nằm trong .gitignore. Lệnh update-deployment được kiểm tra theo help của clasp đang cài.

Deploy Netlify không cần Git commit/push, dùng CLI đã cài:

```powershell
netlify login
netlify deploy --site phonghop --dir . --no-build --prod
```

Xác nhận site phonghop là site hiện có thuộc tài khoản của bạn; có thể thay bằng Project ID trong Netlify nếu tên không duy nhất. CLI xử lý netlify.toml. Không dùng --trigger vì sẽ build bản GitHub cũ chưa chứa sửa đổi local.

Sau deploy, mở https://phonghop.netlify.app và hard reload, DevTools Network → lọc /exec: một POST action bootstrap lúc mở trang (redirect của cùng request không phải action thứ hai). Chạy clearCatalogCacheInternal trong Editor trước một lần test để quan sát cache miss; bấm kiểm tra lần nữa trong 120 giây để quan sát hit nếu cache chưa bị evict. Warm hit không có log github_batch/github_fetch cho execution đó. Ghi clientMs, serverMs và thời gian Network; không đặt PASS chỉ vì code test đạt.

Có thể chạy từ Console của trang để so sánh các action cũ, tuần tự:

```javascript
for (const action of ['ping', 'getSystemInfo', 'getRooms', 'getRequirements']) {
  const start = performance.now();
  try { console.log(action, await apiRequest(action), Math.round(performance.now() - start)); }
  catch (error) { console.log(action, error.message, Math.round(performance.now() - start)); }
}
```

Tài liệu: [CacheService và TTL/eviction](https://developers.google.com/apps-script/reference/cache/cache), [UrlFetchApp.fetchAll](https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app), [ContentService redirect](https://developers.google.com/apps-script/guides/content), [Netlify deploy CLI](https://cli.netlify.com/commands/deploy/).
