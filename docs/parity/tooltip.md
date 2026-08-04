# parity: `tooltip`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/tooltip/src`. Port ở **bậc 4** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

Một dòng chỉ được đánh ☑ khi đã có bằng chứng kèm theo — test số học, hoặc ảnh so sánh với story tương ứng của bản gốc. Đánh dấu xong mà không có bằng chứng là nói dối.

## Export runtime (13)

| export | loại | file nguồn | tt | ghi chú |
|---|---|---|:--:|---|
| `BollingerBandTooltip` | class | `BollingerBandTooltip.tsx` | ☐ | |
| `GroupTooltip` | class | `GroupTooltip.tsx` | ☐ | |
| `HoverTooltip` | class | `HoverTooltip.tsx` | ☐ | |
| `MACDTooltip` | class | `MACDTooltip.tsx` | ☐ | |
| `MovingAverageTooltip` | class | `MovingAverageTooltip.tsx` | ☐ | |
| `OHLCTooltip` | class | `OHLCTooltip.tsx` | ☐ | |
| `RSITooltip` | class | `RSITooltip.tsx` | ☐ | |
| `SingleMAToolTip` | class | `MovingAverageTooltip.tsx` | ☐ | |
| `SingleTooltip` | class | `SingleTooltip.tsx` | ☐ | |
| `SingleValueTooltip` | class | `SingleValueTooltip.tsx` | ☐ | |
| `StochasticTooltip` | class | `StochasticTooltip.tsx` | ☐ | |
| `ToolTipText` | class | `ToolTipText.tsx` | ☐ | |
| `ToolTipTSpanLabel` | class | `ToolTipTSpanLabel.tsx` | ☐ | |

## Export chỉ-kiểu (11)

Không tồn tại khi chạy nên không cần port. Liệt kê vì chúng định nghĩa **hợp đồng props** của bản gốc — dùng làm nguồn tra cứu khi đặt tên attribute/property cho web component, rồi ghi lại chỗ nào cố ý đặt khác.

<details><summary>Danh sách</summary>

- `BollingerBandTooltipProps`
- `GroupTooltipProps`
- `HoverTooltipProps`
- `layouts`
- `MACDTooltipProps`
- `OHLCTooltipProps`
- `RSITooltipProps`
- `SingleMAToolTipProps`
- `SingleTooltipProps`
- `SingleValueTooltipProps`
- `StochasticTooltipProps`

</details>

## Lệch có chủ ý so với bản gốc

_Chưa có._ Mỗi khác biệt so với bản gốc phải ghi vào đây kèm lý do, ngay khi tạo ra nó.
