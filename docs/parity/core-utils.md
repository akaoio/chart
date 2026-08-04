# parity: `core/src/utils` (nội bộ)

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/core/src/utils`. Port ở **bậc 1**.

Nhóm này **không nằm trong bảng parity chính** vì bản gốc không export nó ra khỏi package
`core` — nó không phải API công khai. Nhưng `scales` dựa hẳn vào `slidingWindow` và
`zipper`, và hầu hết mọi thứ về sau cũng vậy, nên sai ở đây thì sai lan khắp nơi mà không
ai thấy. Vì thế nó được port và kiểm cùng bậc 1.

Đừng nhầm với package `utils` (`docs/parity/utils.md`) — cái đó chỉ có hai React HOC và
thuộc bậc 2.

## Đã port (☑ = có golden data)

| hàm | file nguồn | tt |
|---|---|:--:|
| `identity` | `identity.ts` | ☑ |
| `noop` | `noop.ts` | ☑ |
| `sign` | `index.ts` | ☑ |
| `path` | `index.ts` | ☑ |
| `functor` | `index.ts` | ☑ |
| `getClosestValue` | `index.ts` | ☑ |
| `head` / `first` / `last` | `index.ts` | ☑ |
| `isDefined` / `isNotDefined` / `isObject` | `index.ts` | ☑ |
| `mapObject` | `index.ts` | ☑ |
| `shallowEqual` | `shallowEqual.ts` | ☑ |
| `zipper` | `zipper.ts` | ☑ |
| `slidingWindow` | `slidingWindow.ts` | ☑ |
| `accumulatingWindow` | `accumulatingWindow.ts` | ☑ |
| `getClosestItemIndexes` / `getClosestItem` | `closestItem.ts` | ☑ |
| `getStrokeDasharray` / `getStrokeDasharrayCanvas` | `strokeDasharray.ts` | ☑ |
| `plotDataLengthBarWidth` | `barWidth.ts` | ☑ |

**211 giá trị** khớp bản gốc (`tools/golden/fixtures/utils.json`).

## Hoãn sang bậc 2 — cần DOM hoặc canvas

| hàm | vì sao |
|---|---|
| `d3Window` | trả về `window` của một node; thuộc phần gắn sự kiện |
| `clearCanvas` | thao tác `CanvasRenderingContext2D` |
| `mousePosition` / `touchPosition` | nhận `React.MouseEvent` / `React.TouchEvent`; phải thiết kế lại theo sự kiện DOM thuần |
| `getTouchProps` | đi kèm nhóm chạm ở trên |
| `PureComponent` | là React |

## Hoãn sang bậc 2 — thuộc đường dữ liệu của chart

`ChartDataUtil.ts` (297 dòng) và `evaluator.ts` (163 dòng) thuần về mặt hàm nhưng gắn chặt
vào cấu hình chart, nên đi cùng `core`.

## Chỗ bản gốc kỳ lạ, cố ý giữ nguyên

**`path()` trả giá trị mặc định không đối xứng.** Nếu đường đi dừng giữa chừng vì gặp
`null`/`undefined` thì trả về giá trị mặc định; nhưng nếu đi hết đường rồi mới ra
`undefined` thì trả về `undefined`, bỏ qua giá trị mặc định. Golden data khoá chặt chỗ này
(`path.nullMidway`).

**`zipper()` không có `combine` thì trả về mảng thứ nhất.** Mặc định `combine` là
`identity`, mà `identity` chỉ nhận tham số đầu — nên `zipper()([1,2,3], ['a','b','c'])` ra
`[1,2,3]` chứ không phải các cặp. Dễ tưởng nhầm là `d3.zip`.

**`slidingWindow` gọi `windowSize` không tham số** — xem `docs/parity/scales.md`.
