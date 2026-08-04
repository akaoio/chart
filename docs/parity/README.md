# Parity với bản gốc

Bản gốc: [`react-financial-charts@2.0.1`](https://github.com/react-financial/react-financial-charts) (`745c7c0`, commit cuối 2024-03).

Mỗi file ở đây liệt kê **toàn bộ export runtime** của một package nguồn, trích tự động bằng
cách lần theo các file barrel — không phải chép tay, nên không sót. Tổng cộng **144 export
runtime** trên 10 package.

Không có mục nào được phép biến mất trong im lặng. Một export chỉ có ba kết cục: đã port
(☑, kèm bằng chứng), cố ý bỏ (⊘, kèm lý do), hoặc chưa làm (☐).

| package | export runtime | bậc | tiến độ |
|---|---:|:--:|---|
| [`scales`](scales.md) | 5 | 1 | ☐ |
| [`core`](core.md) | 45 | 2 | ☐ |
| [`utils`](utils.md) | 2 | 2 | ☐ |
| [`axes`](axes.md) | 3 | 3 | ☐ |
| [`series`](series.md) | 25 | 3 | ☐ |
| [`coordinates`](coordinates.md) | 8 | 4 | ☐ |
| [`tooltip`](tooltip.md) | 13 | 4 | ☐ |
| [`annotations`](annotations.md) | 5 | 4 | ☐ |
| [`indicators`](indicators.md) | 20 | 5 | ☐ |
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
`d3Window`, `ChartDataUtil`, `zipper`, `shallowEqual`… Đây mới là thứ test-được-tuyệt-đối ở
bậc 1 cùng với `scales`. Không có mặt ở bảng parity vì bản gốc không coi chúng là API công
khai, nhưng vẫn phải port đủ.
