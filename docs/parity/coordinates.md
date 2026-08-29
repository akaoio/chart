# parity: `coordinates`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/coordinates/src`. Port ở **bậc 4** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (8) — đã làm **8**

| export | file nguồn | tt | bằng chứng |
|---|---|:--:|---|
| `CrossHairCursor` | `CrossHairCursor.tsx` | ☑ | 2 bài chuỗi lệnh: bám điểm và tự do |
| `Cursor` | `Cursor.tsx` | ☑ | 5 bài: đầy đủ, bỏ trục y, dạng dải, dải có nét đứt, và khi con trỏ ra ngoài |
| `CurrentCoordinate` | `CurrentCoordinate.tsx` | ☑ | 2 bài |
| `MouseCoordinateX` | `MouseCoordinateX.tsx` | ☑ | 3 bài: dưới, trên, không bám điểm |
| `MouseCoordinateXV2` | `MouseCoordinateXV2.tsx` | ☑ | 2 bài |
| `MouseCoordinateY` | `MouseCoordinateY.tsx` | ☑ | 4 bài, gồm cả khi con trỏ ở pane khác |
| `PriceCoordinate` | `PriceCoordinate.tsx` | ☑ | 3 bài, gồm cả giá nằm ngoài khung nhìn |
| `EdgeIndicator` | `EdgeIndicator.tsx` | ☑ | 3 bài: cuối, đầu, và trải hết bề ngang |

Nội bộ: `EdgeCoordinateV3` (phần vẽ dùng chung) đã port thành `edgeGeometry` + `drawEdgeCoordinate`. `EdgeCoordinate` và `EdgeCoordinateV2` — hai bản cũ hơn còn sót trong repo gốc nhưng **không được export và không nơi nào dùng** — ⊘ bỏ.

## Bằng chứng

Cùng cách của bậc 3: chuỗi lệnh canvas so từng lệnh một. Nhóm này chỉ vẽ khi con trỏ đang ở đâu đó, nên dữ liệu kiểm mang theo trạng thái chuột thật (`show`, `mouseXY`, `currentItem`, `currentCharts`) — kể cả các trạng thái mà **đúng ra phải không vẽ gì**: con trỏ rời chart, con trỏ ở pane khác, giá vượt khỏi khung nhìn.

Đã kiểm rằng bộ này biết fail:

| sửa hỏng chỗ nào | số giá trị lệch |
|---|---:|
| bỏ bù `strokeWidth` khi canh dọc hộp nhãn | 20 |
| `PriceCoordinate` luôn hiện dù ngoài khung nhìn | 16 |
| `MouseCoordinateY` bỏ lọc theo pane | 11 |
| bỏ đệm 10px của hộp co theo chữ | 8 |
| `Cursor` bỏ nửa pixel của đường ngang | 3 |

## Lệch có chủ ý so với bản gốc

`Cursor`, `CrossHairCursor` và `HoverTooltip` của bản gốc đọc `margin`/`ratio` từ `ChartCanvasContext`. Ở đây chúng nhận qua props (phần tử lấy sẵn từ canvas) **hoặc** qua `moreProps` — vì margin và tỉ lệ màn hình là chuyện của cả chart, không của riêng con trỏ.

### Nhãn ghim vào trục giá được đo, không còn rộng cố định

Hộp nhãn của bản gốc rộng đúng `rectWidth` (mặc định 50), bất kể chữ trong nó dài bao nhiêu, và chữ thì canh **giữa** hộp. Canvas không cắt chữ theo hộp — không có chuyện đó — nên một giá tám chữ số ở cỡ 13px chỉ đơn giản là **tràn ra khỏi nền của chính nó**: đè lên đường trục một bên, chạy quá mép canvas bên kia. Không nổ, không cảnh báo, và chuỗi lệnh canvas vẫn đủ lệnh, nên bộ golden vẫn xanh. Chỉ có hình là sai.

Ba thay đổi, tất cả nằm trong `drawEdgeCoordinate`/`edgeGeometry`:

- hộp **không bao giờ hẹp hơn chữ** cộng `rectPadding` mỗi bên (prop mới, mặc định 4);
- khi biết cột trục rộng bao nhiêu (`gutterWidth`, tính từ `margin`), hộp **lấp đúng bề rộng cột** — đó là chỗ dải trắng thừa bên phải nhãn biến mất, và cũng là thứ biến `rectPadding` từ một mức tối thiểu thành khoảng thở thật: cột càng rộng, hai bên con số càng thoáng;
- hộp rộng hơn cột thì **lấn vào trong biểu đồ**, không tràn ra ngoài mép. Ngoài mép canvas không có gì cả — nhãn vẽ ra đó là mất hẳn, mà một cái giá cụt hai chữ số cuối còn tệ hơn một cái giá đè lên vài cây nến.

Người gọi không đưa `margin` — các hàm vẽ được gọi thẳng, với `moreProps` dựng tay, bởi chính bộ golden — thì giữ nguyên `rectWidth` cứng của bản gốc, **kể cả không đo chữ**: `measureText` cũng là một lệnh canvas, mà chuỗi lệnh chính là thứ bộ ấy so.

Năm case của bộ `draw` vì thế lệch khỏi fixture, và cả năm đều được khai báo trong `tools/golden/cases/draw.mjs`: `mouseCoordinateY`, `mouseCoordinateYFit`, `priceCoordinateRight`, `edgeIndicator`, `edgeIndicatorFull`. Chỉ những case ghim vào bên **phải** — `hovering()` đặt `margin.left` bằng 0, nên bên trái không có cột nào để lấp và hình vẽ giữ nguyên từng lệnh.

Fixture **không** được sinh lại cho vừa ý bản port: nó là bản gốc chạy thật, và sinh lại là mất luôn thứ duy nhất nói được bản gốc vốn vẽ gì. `test.js` canh hai chiều — lệch ở case không khai báo là đỏ như trước, và case đã khai báo mà **hết lệch** cũng là đỏ, vì khi ấy hoặc bản sửa đã bị gỡ, hoặc lời khai báo đã hết hạn.

Đã kiểm rằng cơ chế ấy **biết fail cả hai chiều**: gỡ phép lấp cột đi (`column = 0`) thì cả 5 case khai báo hết lệch và bộ báo đỏ đích danh từng cái; còn phá một chỗ **không** khai báo (`tickSpacing + 3` trong `Axis.js`) thì vẫn đỏ theo lối cũ, 179 giá trị lệch.

Hình thì đo bằng pixel, ở `test.browser.js` (`trưng bày: cột giá không lẹm, không thừa`): hộp phải chạm mép phải canvas, và chữ phải cách mép hộp ít nhất 2px cả hai bên.
