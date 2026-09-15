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

**7.745 lệnh canvas khớp bản gốc**, trên 39 bài vẽ. Con số `npm test` in ra lớn hơn nhiều (29.121 cho riêng nhóm này) vì nó đếm *giá trị lá*, mà mỗi lệnh gồm tên lệnh cộng các tham số của nó — và nó gộp chung trong bộ `draw`, nơi `axes`, `coordinates` và phần canvas của `tooltip` cũng nằm. Số lệnh mới là con số đáng nói.

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

**`AlternateDataSeries` bỏ đúng hai hàng ở hai mép khung nhìn.** Bộ lọc so sánh nghiêm ngặt:

```js
return at > start && at < end
```

`start` và `end` chính là x của hàng đầu và hàng cuối đang hiện trên màn hình, nên hàng khách nằm đúng ở hai mép bị loại. Thấy được bằng mắt: đường của dữ liệu khách luôn dừng sớm hơn mép vùng vẽ một bước, và khi kéo thì điểm đầu điểm cuối lần lượt hiện ra rồi mất đi. Với dữ liệu khách thưa — thứ mà phần tử này sinh ra để phục vụ — chỗ hụt ấy rộng bằng cả một bước lấy mẫu.

`>=`/`<=` thì hết, nhưng bản gốc là `>`/`<` (`AlternateDataSeries.tsx:21-24`) và đây là hành vi nhìn thấy được, không phải chi tiết nội bộ. Giữ nguyên, ghi ra đây, và nói thẳng trong bài trưng bày để người đọc không tưởng mình đặt sai dữ liệu.

## `AlternateDataSeries`: hai chỗ bản gốc để con nó thấy dữ liệu của chart

Phần tử này đứng trước chart để trả lời `contextValues`, và chỉ thế thôi. Hai đường khác vẫn chở dữ liệu của mảng chính tới con của nó, và cả hai đều nhìn thấy được trên màn hình.

**`plotData` trong gói phát ra lúc pan/zoom.** Đó là đường dẫn nóng: không dựng lại gì, chart tính state mới rồi phát thẳng tới từng phần tử đã đăng ký. `GenericComponent.getMoreProps()` trải `this.moreProps` sau cùng, nên cái vừa phát vào đè lên thứ context cấp — series con vẽ đúng đường đóng cửa của bộ nến trong suốt cú kéo, rồi thả tay là thưa lại như cũ, vì `refreshFromContext()` đặt lại từ context. Người dùng phát hiện chỗ này: "đường vàng bỗng dưng khớp hoàn toàn với chart nến".

**`currentItem` — hàng dưới con trỏ.** Nó đến từ `getMutableState()`, mà bản gốc chuyển tiếp thẳng. Nên một tooltip hay `chart-current-coordinate` đặt trong `<AlternateDataSeries>` đọc số của mảng chính, ngay cạnh một series đang vẽ bộ thứ hai — hai con số khác nhau cho cùng một chỗ trên màn hình.

Cả hai đều không giữ, cùng một lý lẽ: phần tử này tồn tại để quyết định con của nó thấy bộ dữ liệu nào, và cả "vẽ gì" lẫn "dưới con trỏ là hàng nào" đều là phần của bộ dữ liệu ấy. `subscribe` giờ bọc listener của con lại, và `getMutableState` đi qua cùng một hàm thu hẹp — hai đường một câu trả lời, chứ không phải `currentItem` đổi nghĩa tuỳ theo lần vẽ vừa rồi do cái nào gây ra.

`mouseXY` và `currentCharts` vẫn của chart: con trỏ ở đâu, và những pane nào đang dưới nó, không phụ thuộc vào việc ai cấp dữ liệu.

9 khẳng định canh hai chỗ này: 5 cho `plotData` (đọc số hàng series con nhìn thấy mỗi lần được vẽ, trong lúc tay còn đặt xuống) và 4 cho `currentItem` (cả đường phát sự kiện lẫn đường `refreshFromContext`). Dữ liệu thứ hai trong bài phải thưa hẳn — bài cũ dùng dữ liệu khớp một-đối-một nên hai con số bằng nhau, không thể đỏ.

## Lệch có chủ ý so với bản gốc

**Thân nến vẽ đúng mép của nó.** Bản gốc đặt thân và viền ở hai toạ độ x khác nhau:

```ts
ctx.fillRect(d.x - 0.5, d.y, d.width, d.height);
if (…) ctx.strokeRect(d.x, d.y, d.width, d.height);
```

`d.x` **đã là mép trái** — `getCandleData` trả `x - offset`. Cái `- 0.5` là phép căn giữa
của **wick** bị chép sang thân: wick vẽ `fillRect(wick.x - 0.5, …, 1, …)` vì `wick.x` là
**tâm**, và một vạch rộng 1px muốn nằm giữa tâm thì phải bắt đầu ở tâm − 0.5. Thân không
có lý do ấy, nên nó bị đẩy lệch nửa pixel so với chính cái viền của mình.

Đo trên canvas, một cây nến với mọi toạ độ nguyên, thân đáng lẽ chiếm `[80, 120]`:

| pixel | bản gốc | ở đây |
|---|---|---|
| x = 79 (ngoài, trái) | `rgb(191,95,95)` — thân tràn ra ngoài viền | `rgb(191,191,191)` — chỉ có viền |
| x = 80 (mép trái) | `rgb(191,0,0)` | `rgb(191,0,0)` |
| x = 119 (mép phải) | `rgb(192,95,95)` — **trắng lọt vào** giữa thân và viền | `rgb(192,0,0)` |
| x = 120 (ngoài, phải) | `rgb(191,191,191)` | `rgb(191,191,191)` |

Bản gốc **không đối xứng**: bên trái thân tràn qua viền, bên phải hở ra một vệt sáng. Ở
đây fill và stroke dùng chung đúng một hình chữ nhật, nên hai mép giống hệt nhau. Golden
khai hai case `candlestick` và `candlestickStroked` là lệch có chủ ý (chart#38).

Nhánh `width <= 1` giữ `- 0.5` nhưng tính từ **tâm thân** (`candle.x + width / 2`), vốn
bằng đúng `wick.x` — nên vạch 1px ấy nằm giữa wick thay vì lệch trái nửa pixel.

**Nhánh `height === 0` bị bỏ, vì nó chết trong chính bản gốc.** `getCandleData` trả
`height = Math.max(1, …)`, nên `candle.height` không bao giờ bằng 0 — kể cả với nến doji,
thứ bộ dữ liệu golden có sẵn một cây. Giữ lại thì lần sau sẽ có người đi "sửa" cái `- 0.5`
trong đó.

**Thân thanh cũng vậy, lệch theo đường chéo.** `BarSeries` và `StackedBarSeries` mang cùng
một vòng vẽ, và cùng một lỗi:

```ts
ctx.fillRect(d.x + 0.5, d.y + 0.5, d.width, d.height);
if (stroke) ctx.strokeRect(d.x, d.y, d.width, d.height);
```

`d.x` ở cả hai nhà đều là **mép trái** — `BarSeries.getBars` trả `xScale(…) - offset`,
`StackedBarSeries` trả `Math.round(xScale(…) - width / 2)`. Thân vì thế trượt xuống-phải
nửa pixel so với chính viền của nó, mà vẫn giữ nguyên `width`/`height`.

Đo trên canvas, một thanh toạ độ nguyên, thân đáng lẽ chiếm `[80, 120] × [120, 220]`:

| pixel | bản gốc | ở đây |
|---|---|---|
| x = 79 (ngoài, trái) | `rgb(127,127,127)` | `rgb(127,127,127)` |
| x = 80 (mép trái) | `rgb(127,63,63)` — **trắng lọt vào** | `rgb(127,0,0)` |
| x = 119 (mép phải) | `rgb(128,0,0)` | `rgb(128,0,0)` |
| x = 120 (ngoài, phải) | `rgb(127,63,63)` — thân **thò ra** | `rgb(127,127,127)` |

Trục dọc y hệt: `y = 120` ra `rgb(127,63,63)` còn `y = 220` cũng `rgb(127,63,63)`. Sau bản
sửa, hai mép của mỗi trục giống hệt nhau. Golden khai 11 case lệch có chủ ý — mọi thứ dựng
trên vòng vẽ ấy, kể cả histogram của MACD và Elder ray (chart#42).

`GroupedBarSeries` viết lại `x` và `width` trước khi vẽ (`x + offset - groupOffset`,
`width: groupWidth`), nên `x + width / 2` vẫn là tâm của đúng hình được vẽ — một bản sửa
đúng cho cả ba.


**Phần vẽ tách khỏi phần tử.** Mỗi series xuất ra hai thứ: một hàm `drawXSeries(context, moreProps, props)` không đụng DOM, và một phần tử mỏng gọi hàm đó. Bản gốc gộp cả hai trong một class React.

Lý do là để chứng minh được: hàm vẽ chạy trong Node và so được với bản gốc từng lệnh, còn một lớp `extends HTMLElement` thì không tồn tại ngoài trình duyệt. Tách ra cũng đúng về mặt thiết kế — cách vẽ một cây nến không liên quan gì tới việc nó có phải một phần tử DOM hay không.

**Marker là object thuần, không phải component.** Bản gốc để mỗi marker là một React component *kèm* một static `drawOnCanvas`, nhưng không chỗ nào render chúng như component — `ScatterSeries` chỉ gọi static. Nên ở đây marker đúng là thứ nó vốn là: một bộ props mặc định và một cách vẽ.

**Ba prop của bản gốc không được mang sang, vì mang sang cũng không làm gì:**

| prop | ở đâu | vì sao bỏ |
|---|---|---|
| `zeroLineStroke` | `MACDSeries` | khai báo ở dòng 21 rồi không chỗ nào đọc — đường zero lấy màu từ `strokeStyle.zero`, và cái đó có |
| `zeroLineOpacity` | `MACDSeries` | dòng 22, cũng chưa từng được đọc |
| `areaClassName` | `BollingerSeries` | lớp CSS cho vùng tô, mà vùng tô nằm trên canvas — không có node nào để gắn vào |

Hai cái đầu là prop chết trong chính bản gốc: một người đọc bảng props sẽ tưởng mình đổi được màu đường zero bằng `zeroLineStroke`, và sẽ không hiểu vì sao không có gì xảy ra. Bỏ đi thì bảng props nói thật.

## Một nhánh không kiểm được, và vì sao

`StackedBarSeries` có dòng `const offset = barWidth === 1 ? 0 : 0.5 * width`. Bỏ hẳn nhánh đặc biệt ấy đi thì **không bài kiểm nào bắt được**, kể cả với dữ liệu dày tới mức cột chỉ còn đúng 1 pixel.

Không phải vì bộ kiểm yếu. `offset` chỉ đi vào `groupOffset` và `offset`, và cả hai đều qua `Math.round`; chênh lệch do nhánh này tạo ra luôn nhỏ hơn 0.5 nên không bao giờ sống sót qua phép làm tròn. Đây là một nhánh chết trong chính bản gốc.

Giữ nguyên vì port trung thành là mặc định, nhưng ghi ra đây để không ai tưởng nó đã được chứng minh.

## Vượt ra ngoài bản gốc (chart#5)

`chart-volume-candlestick-series` — nến có bề ngang theo volume (TradingView "Volume candles"): mỗi thân co giãn theo volume của chính nó so với volume lớn nhất đang hiện trên khung; `minWidthRatio` giữ nến mỏng nhất còn nhìn thấy, đặt nó bằng 1 là mọi nến bằng nhau. Không có golden (không có gì để so) — được chứng minh bằng khẳng định trình duyệt trên hình học `getVolumeCandleData`. Vòng vẽ của nó là bản chép của `CandlestickSeries`, nên nó chép cả chỗ lệch nửa pixel kể trên — và chart#38 sửa **cả hai** cùng lúc. Ở đây bản sửa không phải lệch parity: series này vốn không có gì để so.


## Series vượt ra ngoài bản gốc (chart#5 · akao#276)

| thẻ mới | thay cho | leaf |
|---|---|---|
| `chart-session-profile-series` (`mode`) | Session Volume Profile · TPO/Market Profile | gom ô footprint theo PHIÊN = ngày của giờ HIỂN THỊ (cùng ranh giới với session breaks — hai tính năng không bao giờ cãi nhau về đầu ngày); volume: thanh ngang buy|sell mỗi mức từ mép trái phiên; tpo: mỗi kỳ `periodMs` chạm mức là một khối, đủ rộng mang chữ kỳ (A…Z rồi a…z) — kỳ NEO VÀO 00:00 của ngày hiển thị, không phải bar đầu khung nhìn (pan không đổi nghĩa chữ); khối cắt tại maxWidth; datum không date bị bỏ qua êm. Chỉ-đọc như footprint; kiểm bằng số tính tay hai mode |
| `chart-footprint-series` | Volume footprint của TradingView | mỗi bar mở thành các mức giá, buy đấu sell tại từng mức — hai nửa-ô mọc về nhau từ trục giữa bar, chia theo PHÍA LỚN NHẤT của bar; đủ cao đủ rộng thì viết số. Series CHỈ ĐỌC `datum.footprint` (`[{price, buy, sell}]`) — phép gộp xảy ra ở thượng nguồn (akao#276 fold từ trade thật); bước mức suy từ chính lưới dữ liệu (khoảng cách nhỏ nhất giữa hai mức kề). Kiểm bằng số tính tay trong test.js (4 nửa-ô); đổ nếu series tự tính footprint từ OHLCV |
