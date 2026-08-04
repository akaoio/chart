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

## Đã port ở bậc 2 — đường dữ liệu của chart

Thuần về mặt hàm, nên vẫn chứng minh được bằng golden data: **359 giá trị** khớp bản gốc
(`tools/golden/fixtures/chartdata.json`).

| hàm | file nguồn | tt |
|---|---|:--:|
| `getChartOrigin` · `getDimensions` | `ChartDataUtil.ts` | ☑ |
| `getNewChartConfig` | `ChartDataUtil.ts` | ☑ |
| `getCurrentCharts` · `getCurrentItem` · `getXValue` | `ChartDataUtil.ts` | ☑ |
| `getChartConfigWithUpdatedYScales` | `ChartDataUtil.ts` | ☑ |
| `ChartDefaultConfig` | `ChartDataUtil.ts` | ☑ |
| `evaluator` (mặc định) | `evaluator.ts` | ☑ |

**Lệch có chủ ý:** `getNewChartConfig` của bản gốc nhận React children rồi đọc
`each.props`; ở đây nó nhận thẳng mảng props, vì custom element không có lớp bọc ấy. Đây
là khớp nối duy nhất trong cả bộ golden — bên sinh dữ liệu bọc props lại thành React
element, ba dòng trong `tools/golden/generate.mjs`, không chứa logic chart nào.

## Đã port ở bậc 2 — phần cần DOM

Không golden-test được nên chúng được chứng minh gián tiếp, qua bộ kiểm trình duyệt: mọi
thao tác chuột trong `npm run test:browser` đều đi qua nhóm này.

| hàm | file nguồn | tt | ghi chú |
|---|---|:--:|---|
| `d3Window` | `utils/index.ts` | ☑ | |
| `clearCanvas` | `utils/index.ts` | ☑ | |
| `mousePosition` · `touchPosition` · `getTouchProps` | `utils/index.ts` | ☑ | nhận sự kiện DOM thuần thay cho `React.MouseEvent` |
| `pointerPosition` · `pointersPosition` | — | ☑ | **mới**: bản port của `pointer`/`pointers` trong d3-selection, để bỏ được cả gói đó |
| `PureComponent` | `utils/PureComponent.tsx` | ⊘ | là React |

`pointerPosition` không có trong bản gốc vì bản gốc gọi thẳng `d3-selection`. Nó phải quy
toạ độ qua ma trận `getScreenCTM().inverse()` chứ không dùng hộp bao: hộp bao bỏ qua
`viewBox` và mọi `transform` phía trên, mà chart thì luôn có một `translate` nửa pixel.

## Chỗ bản gốc kỳ lạ, cố ý giữ nguyên

**`path()` trả giá trị mặc định không đối xứng.** Nếu đường đi dừng giữa chừng vì gặp
`null`/`undefined` thì trả về giá trị mặc định; nhưng nếu đi hết đường rồi mới ra
`undefined` thì trả về `undefined`, bỏ qua giá trị mặc định. Golden data khoá chặt chỗ này
(`path.nullMidway`).

**`zipper()` không có `combine` thì trả về mảng thứ nhất.** Mặc định `combine` là
`identity`, mà `identity` chỉ nhận tham số đầu — nên `zipper()([1,2,3], ['a','b','c'])` ra
`[1,2,3]` chứ không phải các cặp. Dễ tưởng nhầm là `d3.zip`.

**`slidingWindow` gọi `windowSize` không tham số** — xem `docs/parity/scales.md`.
