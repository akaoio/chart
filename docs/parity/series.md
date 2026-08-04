# parity: `series`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/series/src`. Port ở **bậc 3** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (25) — đã làm **25**

| export | file nguồn | tt | bằng chứng |
|---|---|:--:|---|
| `LineSeries` | `LineSeries.tsx` | ☑ | 6 bài chuỗi lệnh: nét thường, có kiểu, đường cong, đang hover, dữ liệu thủng lỗ, nối lỗ |
| `AreaOnlySeries` | `AreaOnlySeries.tsx` | ☑ | 2 bài: đáy mặc định và đáy chỉ định |
| `AreaSeries` | `AreaSeries.tsx` | ☑ | 1 bài — và chính nó lộ ra lỗi `withDefaults`, xem dưới |
| `StraightLine` | `StraightLine.tsx` | ☑ | 2 bài: ngang và dọc |
| `BarSeries` | `BarSeries.tsx` | ☑ | 3 bài: mặc định, tô màu theo dữ liệu, và nhánh `swapScales` |
| `CandlestickSeries` | `CandlestickSeries.tsx` | ☑ | 2 bài, gồm cả nến doji thân dày 0 |
| `OHLCSeries` | `OHLCSeries.tsx` | ☑ | 1 bài |
| `ScatterSeries` | `ScatterSeries.tsx` | ☑ | 3 bài, một cho mỗi marker |
| `CircleMarker` | `markers/CircleMarker.tsx` | ☑ | |
| `Square` | `markers/SquareMarker.tsx` | ☑ | |
| `Triangle` | `markers/TriangleMarker.tsx` | ☑ | giữ nguyên cả lỗi xoay của bản gốc, xem dưới |
| `AlternateDataSeries` | `AlternateDataSeries.tsx` | ☑ | đứng trước chart, cấp plotData khác cho con · kiểm trong trình duyệt |
| `AlternatingFillAreaSeries` | `AlternatingFillAreaSeries.tsx` | ☑ | 1 bài — hai lần vẽ dưới hai vùng cắt |
| `BollingerSeries` | `BollingerSeries.tsx` | ☑ | 1 bài — ba đường cộng dải giữa |
| `ElderRaySeries` | `ElderRaySeries.tsx` | ☑ | 1 bài — bốn accessor cho bar hai chiều |
| `GroupedBarSeries` | `GroupedBarSeries.tsx` | ☑ | 2 bài, gồm dữ liệu dày tới mức cột còn 1px |
| `KagiSeries` | `KagiSeries.tsx` | ☑ | 1 bài |
| `MACDSeries` | `MACDSeries.tsx` | ☑ | 1 bài — cột quanh mốc 0, hai đường, đường 0 |
| `PointAndFigureSeries` | `PointAndFigureSeries.tsx` | ☑ | 1 bài — cột X và cột O |
| `RSISeries` | `RSISeries.tsx` | ☑ | 1 bài — đổi màu ở đúng ngưỡng nhờ vùng cắt |
| `RenkoSeries` | `RenkoSeries.tsx` | ☑ | 1 bài, gồm viên chưa hoàn thành |
| `SARSeries` | `SARSeries.tsx` | ☑ | 2 bài, có và không có viền |
| `StackedBarSeries` | `StackedBarSeries.tsx` | ☑ | 3 bài, gồm dữ liệu dày và bản có viền |
| `StochasticSeries` | `StochasticSeries.tsx` | ☑ | 1 bài |
| `VolumeProfileSeries` | `VolumeProfileSeries.tsx` | ☑ | 2 bài, hai hướng, có nền phiên |

**25/25 xong.** Ngoài ra `SVGComponent` (không nằm trong danh sách export runtime vì bản gốc không export nó ra khỏi barrel) cũng đã port, dưới tên thẻ `<chart-svg>`.

Ngoài chuỗi lệnh canvas, cả 25 còn được dựng thật trong trình duyệt như phần tử HTML — `document.createElement("chart-candlestick-series")` rồi gắn vào `<chart-pane>` — và kiểm rằng chúng đăng ký được, tìm được pane, và chart vẫn vẽ ra hình sau khi có đủ 25 series cùng lúc.

## Bằng chứng: so từng lệnh canvas, không so ảnh

Một hình vẽ trên canvas **là** một chuỗi lệnh. Nên cả bản gốc lẫn bản port cùng vẽ vào một canvas giả chỉ ghi chép (`tools/golden/recorder.mjs`), rồi so đúng từng lệnh một. Cùng chuỗi lệnh thì cùng pixel — chính xác không kém so ảnh, mà khi lệch thì chỉ ra được ngay lệnh thứ mấy, chứ không phải "có 37 pixel khác nhau".

Bên bản gốc, hàm vẽ được lấy ra bằng cách dựng component React rồi nhặt prop `canvasDraw` mà nó truyền cho `GenericChartComponent` — không render, không cần DOM, không cần trình duyệt.

**9.465 lệnh canvas khớp bản gốc**, trên 54 bài vẽ. (Con số `npm test` in ra — 32.586 — là số *giá trị lá* được so, vì mỗi lệnh gồm tên lệnh cộng các tham số của nó. Số lệnh mới là con số đáng nói.)

Cộng 40 khẳng định trong trình duyệt thật, nơi các phần tử này được dựng trong một chart thật rồi soi pixel: nến xanh, nến đỏ, đường tím, trục đen — và cả 25 series cùng gắn vào một pane một lúc.

Đã kiểm rằng bộ này biết fail:

| sửa hỏng chỗ nào | số lệnh lệch |
|---|---:|
| bỏ làm tròn toạ độ y của `LineSeries` | 346 |
| bỏ chiều cao tối thiểu 1px của thân nến | 225 |
| bỏ lệch nửa pixel khi vẽ cột | 160 |
| `OHLCSeries` bỏ trừ 1.5 khỏi bề rộng cột | 80 |
| đổi góc hình học của marker tam giác | 40 |
| `withDefaults` quay lại ngữ nghĩa spread | 40 |

Hai dòng đầu chỉ bắt được sau khi thêm vào dữ liệu kiểm ba phiên mà dữ liệu ngẫu nhiên gần như không sinh ra nhưng thị trường thì có: một phiên **doji** (mở bằng đóng, thân nến dày 0), một phiên đứng im hoàn toàn, và một phiên biến động rất mạnh. Trước đó không nến nào có thân mỏng hơn 1px, nên bỏ hẳn ngưỡng tối thiểu cũng chẳng đổi gì.

## Một lỗi thật, do bài kiểm tìm ra

`AreaSeries` truyền `base={baseAt}` xuống `AreaOnlySeries`. Khi người dùng không đặt `baseAt`, giá trị truyền xuống là `undefined`.

- React: `defaultProps` coi `undefined` là **không truyền**, nên giá trị mặc định được dùng.
- `{ ...defaults, ...props }`: `undefined` **đè lên** mặc định và xoá nó.

Kết quả là đáy vùng tô thành `NaN` — vùng tô biến mất. 40 lệnh lệch chỉ ra đúng chỗ. Đã thêm `withDefaults` trong `core/utils`, dựng lại đúng ngữ nghĩa của React, và dùng ở mọi series.

Đây là loại lỗi không thể tìm ra bằng cách đọc: cả hai đoạn mã trông y hệt nhau.

## Chỗ bản gốc kỳ lạ, cố ý giữ nguyên

**Marker tam giác xoay sai, và bản gốc tự biết.** Khi có yêu cầu xoay, đường bao được dựng ở vị trí chưa xoay rồi canvas mới xoay quanh điểm — nên hình được tô không phải hình vừa mô tả. Ngay chỗ đó bản gốc có sẵn `// TODO: rotation does not work`. Giữ nguyên: sửa lặng lẽ sẽ khiến tam giác xoay xuất hiện ở nơi bản gốc chưa từng vẽ. Chỉ `direction: "top"` (mặc định) là đúng.

**`ScatterSeries` gom điểm theo màu tô rồi mới theo màu viền.** Trông thừa một tầng, nhưng đó là cách giảm số lần đổi trạng thái canvas — thứ đắt hơn hẳn việc vẽ.

## Lệch có chủ ý so với bản gốc

**Phần vẽ tách khỏi phần tử.** Mỗi series xuất ra hai thứ: một hàm `drawXSeries(context, moreProps, props)` không đụng DOM, và một phần tử mỏng gọi hàm đó. Bản gốc gộp cả hai trong một class React.

Lý do là để chứng minh được: hàm vẽ chạy trong Node và so được với bản gốc từng lệnh, còn một lớp `extends HTMLElement` thì không tồn tại ngoài trình duyệt. Tách ra cũng đúng về mặt thiết kế — cách vẽ một cây nến không liên quan gì tới việc nó có phải một phần tử DOM hay không.

**Marker là object thuần, không phải component.** Bản gốc để mỗi marker là một React component *kèm* một static `drawOnCanvas`, nhưng không chỗ nào render chúng như component — `ScatterSeries` chỉ gọi static. Nên ở đây marker đúng là thứ nó vốn là: một bộ props mặc định và một cách vẽ.

## Một nhánh không kiểm được, và vì sao

`StackedBarSeries` có dòng `const offset = barWidth === 1 ? 0 : 0.5 * width`. Bỏ hẳn nhánh đặc biệt ấy đi thì **không bài kiểm nào bắt được**, kể cả với dữ liệu dày tới mức cột chỉ còn đúng 1 pixel.

Không phải vì bộ kiểm yếu. `offset` chỉ đi vào `groupOffset` và `offset`, và cả hai đều qua `Math.round`; chênh lệch do nhánh này tạo ra luôn nhỏ hơn 0.5 nên không bao giờ sống sót qua phép làm tròn. Đây là một nhánh chết trong chính bản gốc.

Giữ nguyên vì port trung thành là mặc định, nhưng ghi ra đây để không ai tưởng nó đã được chứng minh.
