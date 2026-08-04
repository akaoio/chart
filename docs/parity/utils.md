# parity: `utils`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/utils/src`. Port ở **bậc 2** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

Một dòng chỉ được đánh ☑ khi đã có bằng chứng kèm theo — test số học, hoặc ảnh so sánh với story tương ứng của bản gốc. Đánh dấu xong mà không có bằng chứng là nói dối.

## Export runtime (2)

| export | loại | file nguồn | tt | ghi chú |
|---|---|---|:--:|---|
| `withDeviceRatio` | const | `withDeviceRatio.tsx` | ☐ | |
| `withSize` | const | `withSize.tsx` | ☐ | |

## Export chỉ-kiểu (3)

Không tồn tại khi chạy nên không cần port. Liệt kê vì chúng định nghĩa **hợp đồng props** của bản gốc — dùng làm nguồn tra cứu khi đặt tên attribute/property cho web component, rồi ghi lại chỗ nào cố ý đặt khác.

<details><summary>Danh sách</summary>

- `WithRatioProps`
- `WithRatioState`
- `WithSizeProps`

</details>

## Lệch có chủ ý so với bản gốc

_Chưa có._ Mỗi khác biệt so với bản gốc phải ghi vào đây kèm lý do, ngay khi tạo ra nó.
