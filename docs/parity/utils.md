# parity: `utils`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/utils/src`. Port ở **bậc 2** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (2)

| export | loại | file nguồn | tt | ghi chú |
|---|---|---|:--:|---|
| `withDeviceRatio` | const | `withDeviceRatio.tsx` | ⊘ | `<chart-canvas>` tự đọc `devicePixelRatio` |
| `withSize` | const | `withSize.tsx` | ⊘ | `<chart-canvas>` tự đo mình bằng `ResizeObserver` |

## Vì sao cả package biến mất

Đừng nhầm package này với `core/src/utils` — chỗ chứa hàm thuần, đã port đủ, theo dõi ở [`core-utils.md`](core-utils.md). Package `utils` chỉ có đúng hai thứ, và cả hai là React higher-order component:

```
withSize          bọc chart trong react-virtualized-auto-sizer để cấp width/height
withDeviceRatio   đo devicePixelRatio rồi truyền xuống làm prop
```

Cả hai tồn tại vì một component React không tự biết mình to bao nhiêu — phải có ai đó đo hộ rồi truyền xuống. Custom element thì **chính nó là một phần tử**: nó có hộp, và nó theo dõi được hộp của mình. Không còn gì để bọc.

Nên hành vi chuyển vào trong `<chart-canvas>`: bỏ trống `width`/`height` thì nó tự đo bằng `ResizeObserver`, bỏ trống `ratio` thì nó đọc `devicePixelRatio`, đặt tay thì nó nghe theo. Ai cần đo mà không cần chart thì dùng `observeSize` và `getDeviceRatio` trong `src/utils/index.js`.

Đây cũng là lý do package này nằm ở **bậc 2 chứ không phải bậc 1**, dù cái tên gợi ý ngược lại — xem đính chính ở [#1](https://github.com/akaoio/chart/issues/1).

## Một phép tính đã rút gọn, có chủ ý

`withDeviceRatio` chia `devicePixelRatio` cho một "backing store ratio" đọc qua năm thuộc tính có tiền tố nhà cung cấp:

```js
context.webkitBackingStorePixelRatio ?? context.mozBackingStorePixelRatio ??
context.msBackingStorePixelRatio ?? context.oBackingStorePixelRatio ??
context.backingStorePixelRatio ?? 1
```

Cả năm đã bị gỡ khỏi trình duyệt từ lâu, nên số chia luôn bằng `1` và cả biểu thức rút gọn thành `devicePixelRatio`. Rút gọn là quyết định chứ không phải bỏ sót — ghi lại để ai đọc bản gốc rồi thấy khác thì biết vì sao.

## Export chỉ-kiểu (3)

Không tồn tại khi chạy nên không cần port. Liệt kê vì chúng định nghĩa **hợp đồng props** của bản gốc.

<details><summary>Danh sách</summary>

- `WithRatioProps`
- `WithRatioState`
- `WithSizeProps`

</details>

## Lệch có chủ ý so với bản gốc

Đã nêu hết ở trên: hai HOC biến thành hành vi sẵn có của phần tử chủ, và phép chia cho backing-store ratio được rút gọn.
