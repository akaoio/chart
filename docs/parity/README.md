# Parity với bản gốc

Bản gốc: [`react-financial-charts@2.0.1`](https://github.com/react-financial/react-financial-charts) (`745c7c0`, commit cuối 2024-03).

Mỗi file ở đây liệt kê **toàn bộ export runtime** của một package nguồn, trích tự động bằng
cách lần theo các file barrel — không phải chép tay, nên không sót. Tổng cộng **144 export
runtime** trên 10 package.

Không có mục nào được phép biến mất trong im lặng. Một export chỉ có ba kết cục: đã port
(☑, kèm bằng chứng), cố ý bỏ (⊘, kèm lý do), hoặc chưa làm (☐). Một package làm dở thì
ghi ◐ kèm tỉ lệ, và file parity của nó phải liệt kê đích danh phần còn thiếu.

| package | export runtime | bậc | tiến độ |
|---|---:|:--:|---|
| [`scales`](scales.md) | 5 | 1 | ☑ 5/5 |
| [`core`](core.md) | 45 | 2 | ☑ 41 port · 4 ⊘ |
| [`utils`](utils.md) | 2 | 2 | ⊘ 2 — phần tử tự đo |
| [`axes`](axes.md) | 3 | 3 | ☑ 3/3 |
| [`series`](series.md) | 25 | 3 | ☑ 25/25 |
| [`coordinates`](coordinates.md) | 8 | 4 | ☑ 8/8 |
| [`tooltip`](tooltip.md) | 13 | 4 | ☑ 13/13 |
| [`annotations`](annotations.md) | 5 | 4 | ☑ 5/5 |
| [`indicators`](indicators.md) | 20 | 5 | ☑ 20/20 |
| [`interactive`](interactive.md) | 18 | 6 | ☐ |

## Hai package không có mặt ở bảng trên

**`charts`** không chứa dòng code nào — `packages/charts/src/index.ts` chỉ có 10 dòng
`export * from` 10 package kia. Nó là cửa vào gộp, không phải "các preset lắp sẵn" như kế
hoạch ban đầu ghi. Vai trò đó ở repo này do `src/index.js` đảm nhận, nên không cần file
parity riêng.

**`stories`** cố ý không port. Showcase phải viết bằng chính web component của repo này.

## Trật tự bậc lệch so với ranh giới package

`utils` nằm ở bậc 2 chứ không phải bậc 1, dù tên gợi ý ngược lại: cả hai export của nó
(`withSize`, `withDeviceRatio`) là **React higher-order component**, không phải hàm thuần.
Chúng giải quyết hai việc mà web component xử lý theo cách khác hẳn — đo kích thước phần tử
(`ResizeObserver`) và độ phân giải màn hình (`devicePixelRatio`) — nên thuộc về phần thân
chart, không tách rời được.

Các hàm thuần thực sự nằm ở `packages/core/src/utils/` (nội bộ, không export ra ngoài):
`zipper`, `slidingWindow`, `shallowEqual`, `path`… Đây mới là thứ test-được-tuyệt-đối ở
bậc 1 cùng với `scales`. Không có mặt ở bảng trên vì bản gốc không coi chúng là API công
khai, nhưng vẫn phải port đủ — theo dõi ở [`core-utils.md`](core-utils.md).

## Bằng chứng đến từ đâu

Không ai đọc bản gốc rồi tự khẳng định port đúng. Cách làm là chạy **chính mã nguồn bản
gốc** trong Node, ghi kết quả xuống `tools/golden/fixtures/`, rồi bắt bản port trả lời đúng
những câu hỏi đó.

Điểm mấu chốt: bài kiểm nằm ở `tools/golden/cases/`, và **cùng một file đó chạy cho cả hai
phía** — một lần với mã nguồn gốc, một lần với bản port. Không có đường nào để hai bên lệch
nhau về *cách* kiểm; chỉ còn lệch về *kết quả*.

Bản gốc là TypeScript nhưng không cần build: `tools/golden/resolve-source.mjs` là một loader
hook dịch `.ts`/`.tsx` ngay lúc nạp, bằng đúng bản TypeScript trong `node_modules` của repo
gốc. Fixture đã commit nên `npm test` không cần repo gốc; chỉ khi sinh lại mới cần:

```sh
npm test                                               # cả hai bộ dưới đây
npm run test:golden                                    # so bản port với fixture
npm run test:browser                                   # DOM, canvas, chuột trong Chromium thật
CHART_SOURCE=~/react-financial-charts npm run golden   # sinh lại fixture
```

Không phải thứ gì cũng golden-test được. Từ bậc 2 trở đi có DOM, canvas và con trỏ, nên
phần đó được chứng minh trong trình duyệt thật (`test.browser.js`) bằng thao tác thật —
bấm, kéo, di, gỡ phần tử giữa chừng — và soi tới tận pixel khi vị trí là thứ cần khẳng
định.

Múi giờ bị ép về `UTC` ở cả hai đầu. Không phải chuyện vặt: bản gốc chia mốc thời gian bằng
`getHours`/`getDay`/`getMonth` — toàn giờ địa phương — nên cùng dữ liệu ở Hà Nội và ở London
ra chỉ số khác nhau. Đó là chủ ý của bản gốc (một phiên giao dịch là chuyện địa phương), nên
port giữ nguyên và cố định múi giờ khi kiểm.

Một bộ test luôn xanh thì vô dụng, nên nó được kiểm ngược lại bằng cách sửa hỏng bản port
rồi xem có bắt được không — kết quả ghi trong từng file parity.
