# parity: `core`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/core/src`. Port ở **bậc 2** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

Một dòng chỉ được đánh ☑ khi đã có bằng chứng kèm theo — test số học, hoặc ảnh so sánh với story tương ứng của bản gốc. Đánh dấu xong mà không có bằng chứng là nói dối.

## Export runtime (45)

| export | loại | file nguồn | tt | ghi chú |
|---|---|---|:--:|---|
| `accumulatingWindow` | default | `utils/accumulatingWindow.ts` | ☐ | |
| `Chart` | const | `Chart.tsx` | ☐ | |
| `ChartCanvas` | class | `ChartCanvas.tsx` | ☐ | |
| `ChartCanvasContext` | const | `ChartCanvas.tsx` | ☐ | |
| `ChartContext` | const | `Chart.tsx` | ☐ | |
| `clearCanvas` | function | `utils/index.ts` | ☐ | |
| `d3Window` | function | `utils/index.ts` | ☐ | |
| `first` | const | `utils/index.ts` | ☐ | |
| `functor` | const | `utils/index.ts` | ☐ | |
| `GenericChartComponent` | class | `GenericChartComponent.tsx` | ☐ | |
| `GenericComponent` | class | `GenericComponent.tsx` | ☐ | |
| `getAxisCanvas` | const | `GenericComponent.tsx` | ☐ | |
| `getClosestItem` | const | `utils/closestItem.ts` | ☐ | |
| `getClosestItemIndexes` | const | `utils/closestItem.ts` | ☐ | |
| `getClosestValue` | function | `utils/index.ts` | ☐ | |
| `getMouseCanvas` | const | `GenericComponent.tsx` | ☐ | |
| `getStrokeDasharray` | const | `utils/strokeDasharray.ts` | ☐ | |
| `getStrokeDasharrayCanvas` | const | `utils/strokeDasharray.ts` | ☐ | |
| `getTouchProps` | function | `utils/index.ts` | ☐ | |
| `head` | function | `utils/index.ts` | ☐ | |
| `identity` | const | `utils/identity.ts` | ☐ | |
| `isDefined` | const | `utils/index.ts` | ☐ | |
| `isNotDefined` | function | `utils/index.ts` | ☐ | |
| `isObject` | function | `utils/index.ts` | ☐ | |
| `last` | function | `utils/index.ts` | ☐ | |
| `lastVisibleItemBasedZoomAnchor` | const | `zoom/zoomBehavior.ts` | ☐ | |
| `mapObject` | function | `utils/index.ts` | ☐ | |
| `mouseBasedZoomAnchor` | const | `zoom/zoomBehavior.ts` | ☐ | |
| `MOUSEENTER` | const | `utils/index.ts` | ☐ | |
| `MOUSELEAVE` | const | `utils/index.ts` | ☐ | |
| `MOUSEMOVE` | const | `utils/index.ts` | ☐ | |
| `mousePosition` | function | `utils/index.ts` | ☐ | |
| `MOUSEUP` | const | `utils/index.ts` | ☐ | |
| `noop` | const | `utils/noop.ts` | ☐ | |
| `path` | const | `utils/index.ts` | ☐ | |
| `plotDataLengthBarWidth` | const | `utils/barWidth.ts` | ☐ | |
| `PureComponent` | class | `utils/PureComponent.tsx` | ☐ | |
| `rightDomainBasedZoomAnchor` | const | `zoom/zoomBehavior.ts` | ☐ | |
| `shallowEqual` | const | `utils/shallowEqual.ts` | ☐ | |
| `sign` | const | `utils/index.ts` | ☐ | |
| `slidingWindow` | default | `utils/slidingWindow.ts` | ☐ | |
| `TOUCHEND` | const | `utils/index.ts` | ☐ | |
| `TOUCHMOVE` | const | `utils/index.ts` | ☐ | |
| `touchPosition` | function | `utils/index.ts` | ☐ | |
| `zipper` | default | `utils/zipper.ts` | ☐ | |

## Export chỉ-kiểu (5)

Không tồn tại khi chạy nên không cần port. Liệt kê vì chúng định nghĩa **hợp đồng props** của bản gốc — dùng làm nguồn tra cứu khi đặt tên attribute/property cho web component, rồi ghi lại chỗ nào cố ý đặt khác.

<details><summary>Danh sách</summary>

- `ChartContextType`
- `ChartProps`
- `IZoomAnchorOptions`
- `MoreProps`
- `strokeDashTypes`

</details>

## Lệch có chủ ý so với bản gốc

_Chưa có._ Mỗi khác biệt so với bản gốc phải ghi vào đây kèm lý do, ngay khi tạo ra nó.
