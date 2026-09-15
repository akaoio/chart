# parity: `interactive`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/interactive/src`. Port ở **bậc 6** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (18) — đã làm **18**

| export | file nguồn | tt | bằng chứng |
|---|---|:--:|---|
| `getValueFromOverride` | `utils.ts` | ☑ | 3 trường hợp |
| `getMorePropsForChart` | `utils.ts` | ☑ | 2 trường hợp, có cả khi không có chuột |
| `getSelected` | `utils.ts` | ☑ | 3 nhóm, lọc chéo |
| `isHover` | `utils.ts` | ☑ | |
| `isHoverForInteractiveType` | `utils.ts` | ☑ | |
| `saveNodeType` | `utils.ts` | ☑ | |
| `terminate` | `utils.ts` | ☑ | |
| `ClickCallback` | `ClickCallback.tsx` | ☑ | 6 khẳng định: báo đúng cây nến dưới con trỏ, không phải pixel |
| `DrawingObjectSelector` | `DrawingObjectSelector.tsx` | ☑ | 6 khẳng định: bấm đúng đường nào thì chọn đường ấy, bấm chỗ trống thì bỏ chọn |
| `ZoomButtons` | `ZoomButtons.tsx` | ⊘ | **UI là việc của ứng dụng.** Phép zoom sáu bước giữ nguyên và thành `canvas.zoomIn()` / `zoomOut()`; ba cái nút thì không ship — xem mục dưới (chart#39) |
| `TrendLine` | `TrendLine.tsx` | ☑ | 22 khẳng định trong trình duyệt: vẽ, cửa chặn, kéo cả đường |
| `Brush` | `Brush.tsx` | ☑ | 6 khẳng định: kéo ra khoảng chọn, bấm suông thì không |
| `EquidistantChannel` | `EquidistantChannel.tsx` | ☑ | 18 lệnh canvas × 3 dáng, cộng 4 khẳng định ba-lần-bấm |
| `StandardDeviationChannel` | `StandardDeviationChannel.tsx` | ☑ | 22 lệnh × 3 dáng, cột hover ba đường, 4 khẳng định |
| `FibonacciRetracement` | `FibonacciRetracement.tsx` | ☑ | 6 mức × 2 chiều, cộng 5 khẳng định trong trình duyệt |
| `GannFan` | `GannFan.tsx` | ☑ | 114 lệnh canvas, cột hover chín tia, 6 khẳng định |
| `InteractiveText` | `InteractiveText.tsx` | ☑ | 11 lệnh, hộp chữ đo bằng canvas, 6 khẳng định |
| `InteractiveYCoordinate` | `InteractiveYCoordinate.tsx` | ☑ | 38 lệnh, cộng 9 khẳng định: kéo đổi giá, bấm ✕ thì xoá |

Nội bộ đã port đủ: `components/` (`InteractiveStraightLine`, `ClickableCircle`, `ClickableShape`, `Text`, `HoverTextNearMouse`, `MouseLocationIndicator`, `ChannelWithArea`, `LinearRegressionChannelWithArea`, `GannFan`, `InteractiveText`, `InteractiveYCoordinate`) và `wrapper/` (`EachTrendLine`, `EachEquidistantChannel`, `EachLinearRegressionChannel`, `EachFibRetracement`, `EachGannFan`, `EachText`, `EachInteractiveYCoordinate`).

Bề mặt công khai của `src/interactive/index.js` **chứa đúng** bề mặt của `index.ts` bản gốc: công cụ và `utils`, không có phần trong ruột. Các file trong `components/` và `wrapper/` vẫn được nạp ở đó — thẻ tuỳ biến phải được đăng ký thì trình duyệt mới hiểu — nhưng không re-export, y như bản gốc. Ngoài bề mặt ấy, index xuất thêm năm công cụ vượt bản gốc (mục dưới) — đánh dấu tường minh trong file, không trộn lẫn với phần port.

## Công cụ vượt ra ngoài bản gốc (chart#5)

TradingView có ~60 công cụ vẽ; bản gốc có 8. Đợt đầu bù năm họ hay dùng nhất — mỗi họ một bộ ba tầng đúng khuôn tool → each-wrapper → leaf, tái dùng khung có sẵn (`InteractiveStraightLine`, `ClickableCircle`, máy trạng thái hai-bấm của `TrendLine`, cách đặt một-bấm của `InteractiveText`):

| thẻ mới | thay cho công cụ TradingView | đặt bằng | leaf |
|---|---|---|---|
| `chart-axis-line` (`mode`) | Horizontal line · Horizontal ray · Vertical line · Crossline | 1 bấm | `InteractiveStraightLine` có sẵn — ngang là `XLINE` hai đầu cùng y, dọc là nhánh `end[0] === start[0]` |
| `chart-shape-tool` (`shape`) | Rectangle · Ellipse/Circle | 2 bấm | `chart-interactive-shape` (mới): rect/elip + fill, trúng cả lòng lẫn viền |
| `chart-measure` (`mode`) | Price range · Date range · Date & price range | 2 bấm | `chart-interactive-measure` (mới): hộp + mũi tên + hộp số Δgiá/%/nến/thời gian |
| `chart-position-tool` (`side`) | Long position · Short position | 1 bấm | `chart-interactive-position` (mới): hai vùng lời/lỗ + ba nhãn + R/R |
| `chart-pitchfork` (`variant`) | Pitchfork · Schiff · Modified Schiff | 3 bấm | `chart-interactive-pitchfork` (mới): trung tuyến + hai càng RAY, khung tia + hộp chặn hit của GannFan |
| `chart-pitchfork` (`variant: "fan"`) | Pitchfan | 3 bấm | `InteractivePitchfork` có sẵn, thêm nhánh tia: mỗi tia từ neo qua một mức `PITCHFAN_LEVELS` của đoạn P2–P3, không tô băng (TV cũng không); tool/wrapper nguyên vẹn — variant vốn đã chảy suốt họ. Đổ nếu variant lạ làm rơi vào nhánh fork |
| `chart-equidistant-channel` (`levels`) | Fib channel | 3 bấm | `ChannelWithArea` có sẵn, thêm `levels` tuỳ chọn: một đường tại mỗi fraction giữa mép 0 và mép 1 (`FIB_CHANNEL_LEVELS` xuất kèm); kênh trơn là ca đặc biệt levels vắng. Máy 3 bấm và tay cầm nguyên vẹn |
| `chart-rotated-rect` | Rotated rectangle | 3 bấm | `chart-interactive-rotated-rect` (mới): BA neo dữ liệu — P1–P2 là cạnh, khoảng cách vuông góc của P3 là bề rộng; bốn góc suy trong PIXEL mỗi lần vẽ (góc giữa index và giá là vô nghĩa thứ nguyên); vẽ + hit cùng một danh sách góc, trúng cả lòng lẫn viền. Wrapper ba tay cầm — không có tay cầm cho góc dẫn xuất |
| `chart-anchored-vwap` | Anchored VWAP | 1 bấm | `chart-interactive-anchored-vwap` (mới): đối tượng chỉ giữ MỘT neo — mọi y trên đường là Σ(typical·volume)/Σ(volume) suy lại từ rows mỗi lần vẽ, không bao giờ là bản chép của dữ liệu. Họ "đọc dữ liệu" đầu tiên (chart#5 cụm 4). Đổ nếu đường được lưu thay vì suy |
| `chart-volume-profile-tool` | Fixed Range Volume Profile | 2 bấm | `chart-interactive-volume-profile` (mới): hai neo kẹp một dải bar, histogram volume-tại-giá suy lại từ rows mỗi lần vẽ; trục giá của profile là high–low của chính dải; trúng ở viền hộp — lòng hộp là dữ liệu, không phải thân kéo |
| `chart-bars-pattern` | Bars Pattern | 3 bấm | `chart-interactive-bars-pattern` (mới): hai bấm kẹp dải NGUỒN, bóng nến bám con trỏ, bấm ba đặt xuống; đối tượng là {from, to, at} — nến suy lại từ rows mỗi lần vẽ, dời neo thì bóng dời, dữ liệu đổi thì bóng nói sự thật mới; trúng trong hộp bao của cả bóng |
| `chart-disjoint-channel` (`variant`) | Disjoint channel · Flat top/bottom | 3 bấm | `ChannelWithArea` có sẵn, thêm `dy2` tuỳ chọn — kênh lệch là "kênh mà hai offset bất đồng", hình học vẫn một chỗ; `flat` kéo MỨC ngang, hai offset suy từ mức. Wrapper mới `chart-each-disjoint-channel`: hai tay cầm đường 2 độc lập (near→`dy`, far→`dy2`), flat giữ ngang khi kéo bất kỳ đầu nào. Máy 3 bấm mượn nguyên `EquidistantChannel`; sinh ra song song, tay cầm mới làm lệch — đổ nếu `dy2` mặc định khác `dy` |
| `chart-fib-extension` | Trend-based fib extension | 3 bấm | không leaf mới — mỗi mức một `InteractiveStraightLine` RAY + `chart-interactive-label`, đúng khuôn retracement |
| `chart-callout` | Callout | 2 bấm | không leaf mới — `InteractiveText` + chân `InteractiveStraightLine` + tay cầm neo |
| `chart-price-label` | Price label | 1 bấm | không leaf mới — `InteractiveText` mà chữ là chính y của nó, kéo là đổi giá |
| `chart-pattern` (`variant`) | XABCD · Cypher · ABCD · Triangle · Three drives · H&S · Elliott ×5 | n bấm | `chart-interactive-polyline` (mới): đường gấp khúc + nhãn đỉnh + fill tam giác; máy đặt-n-điểm là MỘT, variant chỉ là bảng. Hai combo Elliott (WXY, WXYXZ) của chart#34 vào bằng đúng **hai dòng** `PATTERN_VARIANTS` — không một dòng mã nào khác đổi, và bài kiểm hỏi thẳng bảng ấy rồi hỏi máy có đọc nó không |
| `chart-path` | Path · Polyline | n bấm + nhấp đúp chốt (hoặc phương thức finish cho màn chạm) | dùng lại nguyên `chart-each-pattern` — path là pattern không bảng |
| `chart-cyclic-lines` | Cyclic lines | 2 bấm | `chart-interactive-cycles` (mới): vạch dọc lặp theo chu kỳ, chặn 500 vạch |
| `chart-arrow` | Arrow · Arrow marker | 2 bấm | `chart-interactive-arrow` (mới): thân + đầu đặc |
| `chart-arrow-mark` (`mode`) | Arrow mark up · down · left · right | 1 bấm | không leaf mới — glyph ▲▼◀▶ trên `InteractiveText`. Bốn hướng là một bảng `MARKS` trong wrapper, không phải bốn nhánh; màu cố ý bất đối xứng — ▲/▼ nói về GIÁ nên mang màu tăng/giảm, ◀/▶ chỉ về THỜI GIAN nên dùng `sideFill` trung tính |
| `chart-fib-time-zone` | Fib time zone | 2 bấm | không leaf mới — `chart-interactive-cycles` học thêm `offsets`, dãy Fibonacci thay cho lặp đều |
| `chart-fib-shape` (`variant`) | Fib speed resistance fan · Fib arcs · Fib circles · Fib spiral · Fib wedge | 2–3 bấm | `chart-interactive-fib-shape` (mới): hình học tính một lần trong pixel, vẽ và dò trúng cùng đọc; bán kính pixel từ hai neo dữ liệu |
| `chart-gann-box` (`variant`) | Gann box · Gann square · Gann square fixed | 2 bấm | `chart-interactive-gann-box` (mới): hộp chia mức hai trục, `square` thêm chéo + quạt góc; một bảng mức dùng chung hai trục (TV cho hai bảng riêng — tập con trung thực); `squareFixed` khoá tỉ lệ giá/nến theo đúng cách TV: ratio chốt lúc đặt, chiều cao suy từ chiều rộng, hiện cạnh neo thứ hai |
| `chart-time-cycles` (`mode`) | Time cycles · Sine line | 2 bấm | `chart-interactive-wave` (mới): bán nguyệt lặp trên nền neo đầu hoặc đường sin đỉnh–đáy trải hết pane |
| `chart-trend-angle` | Trend angle | 2 bấm | `chart-interactive-angle-line` (mới): neo dữ liệu + góc/độ dài MÀN HÌNH — đúng cách TV: đổi scale thì góc giữ nguyên, nhãn độ không bao giờ nói dối |
| `chart-note` (`kind`) | Note · Comment | 1 bấm | không leaf mới — hộp chữ trên `InteractiveText`, chữ của người dùng đóng băng vào từng note; sửa chữ là UI ứng dụng |
| `chart-signpost` | Signpost | 1 bấm | `chart-interactive-signpost` (mới): cột + hộp chữ đo từ chính chữ |
| `chart-flag-mark` | Flag mark | 1 bấm | không leaf mới — `EachArrowMark` học `glyph`/`fill`, cờ ⚑ cưỡi cùng wrapper |
| `chart-freehand` (`mode`) | Brush · Highlighter | đè–rê–nhả | `chart-interactive-freehand` (mới). KHÔNG cần sửa EventCapture: công cụ đang bật đã phủ quyết pan nên không cử chỉ nào chiếm chuỗi kéo — mousemove/touchmove vẫn chảy về indicator giữa lúc đè, cú nhả phát `onClick`. Điểm lược theo pixel (≥ 3px), chặn 2000 điểm |
| `chart-anchored-text` (`kind`) | Anchored Text · Anchored Note | 1 bấm | `chart-interactive-anchored-box` (mới): neo MÀN HÌNH theo tỉ lệ pane — cuộn/zoom đứng yên, resize giữ chỗ tương đối, đúng tài liệu TV |
| `chart-price-note` | Price Note | 2 bấm | không leaf mới — neo đầu ghim GIÁ, neo hai đặt nhãn, nhãn đọc giá từ neo mỗi lần vẽ (đúng hai-neo-một-đường-nối của TV) |
| `chart-pin` | Pin | 1 bấm | không leaf mới — 📍 cưỡi wrapper arrow-mark |
| `chart-table` | Table | 1 bấm | cùng leaf anchored-box — bảng neo màn hình, cột rộng theo ô dài nhất; sửa ô là UI ứng dụng |
| `chart-image-tool` | Image | 2 bấm | `chart-interactive-image` (mới): ảnh căng giữa hai neo dữ liệu, `src` là dataURL do ứng dụng đưa; cache theo src, tải xong tự xin vẽ lại |
| `chart-info-line` | Info line | 2 bấm | không leaf mới — nhãn giữa đoạn đọc Δgiá/%/số nến, suy từ dữ liệu nên không cũ được |
| `chart-curve-tool` (`variant`) | Triangle · Polyline · Arc · Curve · Double curve | 3–4 bấm; polyline nhấp đúp chốt | `chart-interactive-curve` (mới): hình được **duỗi thành MỘT danh sách điểm** rồi mới vẽ và mới dò trúng — gọi `arc`/`quadraticCurveTo` của canvas thì nét mượt hơn nhưng phép dò trúng phải dựng lại cùng hình học bằng công thức khác, và hai bản mô tả một hình là hai chỗ để lệch. Cung là đường tròn ĐI QUA ba điểm (thẳng hàng thì hạ về đoạn thẳng — `d → 0`, và canvas nuốt `NaN` trong im lặng); curve là Bézier bậc hai, double curve là bậc ba, nên "double" là hai điểm điều khiển chứ không phải hai đoạn cong ghép. Wrapper `EachCurve` chép nguyên khuôn `EachPattern` — một tay cầm mỗi neo |
| `chart-sticker` | Sticker (flyout emoji của TV) | 1 bấm | `chart-interactive-sticker` (mới): MỘT neo, MỘT tay cầm, cỡ cố định theo **pixel** — zoom vào con dấu không to ra, và đó là chỗ nó khác `chart-image-tool` một cách ĐO ĐƯỢC (ảnh căng giữa hai neo, hai tay cầm, co giãn cùng biểu đồ). Vì thế nó là phần tử riêng chứ không phải một `mode` của ImageTool. Gói **không** mang tệp emoji nào: `src` do ứng dụng đưa vào, y như `imageToolDefaults.src` (chốt của chủ repo, 2026-08-30). Dùng chung cache ảnh của `InteractiveImage` — một dataURL tải một lần |
| `chart-fib-time-extension` | Trend-based fib time | 3 bấm | không leaf mới — `chart-interactive-cycles` học thêm `x3Value`, tách GỐC CHIẾU khỏi gốc đo: hai neo đầu đo đơn vị trên xu hướng, neo ba là chỗ chiếu. Vắng `x3Value` thì mọi thứ cũ vẽ y như trước. Bảng mức là **tỉ lệ** (0.382/0.618/1/1.618/2.618/4.236), không phải dãy số Fibonacci của `chart-fib-time-zone` — hai đại lượng khác nhau, không phải quên đồng bộ |
| `chart-projection` (`variant`) | Forecast · Projection | 3 bấm | `chart-interactive-projection` (mới): chân nền nét đứt (đã xảy ra) + chân dự phóng có hộp tô và hộp số Δgiá/%/số nến. Chỗ khác nhau giữa hai công cụ gói gọn trong hàm thuần `projectionLeg` — `forecast` nối tiếp từ cuối chân nền tới neo ba, `projection` chép nguyên vector nền sang neo ba làm gốc. Đích của `projection` là **suy ra** nên nó KHÔNG có tay cầm: một vành kéo được cho một giá trị dẫn xuất là lời hứa mà kéo xong sẽ bị nuốt |
| `chart-bars-pattern` (`mode`) | Ghost feed | 3 bấm | leaf có sẵn học `mode: "ghost"`: xáo lại chính những bước giá của dải nguồn (mở→đóng, râu trên, râu dưới so với giá mở) rồi nối đuôi nhau — nến GIẢ mang tính cách của một dải THẬT, không số nào bịa từ hư không. Bộ sinh tất định gieo từ ba cái neo: `Math.random()` làm bóng nhấp nháy mỗi lần chuột đi qua, và một hình đổi dáng khi bạn nhìn nó thì không đọc được |

Riêng "Inside pitchfork" của TradingView cố ý chưa làm: phép neo của nó không có tài liệu nào đủ tin để chép — bịa ra một công thức rồi gọi bằng tên của họ thì tệ hơn là thiếu. chart#34 §4 xác nhận lại quyết định ấy và ghi nó xuống để lần sau không ai đếm nó là "thiếu".

**"Price range" và "Date range" KHÔNG phải phần tử thiếu.** chart#34 §2 xếp chúng vào cột phải-làm-thật; chúng đã xong từ #5, trong `chart-measure` (`mode: price | date | both`) — chính dòng `chart-measure` phía trên đã khai đúng ba công cụ TV ấy. Cái thiếu là **cái demo**, và nó vào bằng hai dòng showcase cộng hai dòng chạm. Bằng chứng không phải lời nói: bài `price range và date range đã có sẵn` dựng cùng một hộp ở ba `mode` rồi so **vân tay canvas** — ba hình khác nhau, và bỏ một nhánh `mode !== …` trong `drawInteractiveMeasure` làm hai trong ba trùng nhau. Nên §2 của #34 còn **11** phần tử việc thật, không phải 13.

Wrapper tương ứng: `EachAxisLine`, `EachShape`, `EachMeasure`, `EachPosition`, `EachPitchfork`, `EachFibExtension`, `EachCallout`, `EachPriceLabel`, `EachPattern`, `EachCyclicLines`, `EachArrow`, `EachArrowMark`, `EachInfoLine`, `EachFibShape`, `EachGannBox`, `EachWave`, `EachAngleLine`, `EachNote`, `EachSignpost`, `EachFreehand`, `EachAnchoredBox`, `EachPriceNote`, `EachImage`, `EachCurve`, `EachSticker`, `EachFibTimeExtension`, `EachProjection` — cùng quy tắc với các wrapper port: con tạo một lần rồi sửa tại chỗ, tay cầm chỉ hiện khi hover/chọn, kéo thân đi bằng delta pixel rồi mới đổi về data.

**Số tay cầm là giao ước qua ranh giới gói, không phải chi tiết nội bộ.** Cổng `check:drawn-icons` của akao đọc thẳng `node_modules/@akaoio/chart/src/interactive` mỗi lượt chạy và đếm `createElement("chart-clickable-circle")` trong wrapper để biết icon phải vẽ mấy vành (akaoio/akao#540, #559). Nên số ấy nằm ở thân hàm, không trong nhánh điều kiện: `EachSticker` một, `EachFibTimeExtension` và `EachProjection` ba; `EachCurve` một-vành-mỗi-neo trong một vòng `while` — cùng hình dạng `EachPattern`, và số thật đọc ở `CURVE_VARIANTS`.

Với wrapper đếm-theo-điểm, cổng ấy nhận ra kiểu wrapper bằng cách dò **đúng chuỗi** `handles.length < points.length` rồi mới đi đọc bảng biến thể; viết đảo vế (`points.length > handles.length`) làm nó rơi về nhánh đếm `createElement` và ra "1 vành" — đỏ oan cả `chart-pattern` lẫn `chart-curve-tool`, mà không ai đoán ra vì mã vẫn đúng. Nên câu ấy giữ nguyên vế, và ai đổi thì báo kho akao trước.

**Và chú thích không được trích nguyên văn cái chuỗi bị đếm.** Bộ quét ấy chạy trên văn bản THÔ, không che chú thích. `EachSticker.js` lúc đầu giải thích chính giao ước này bằng cách trích đúng chuỗi, và thành tệp **duy nhất trong 31 wrapper** có phép đếm thô (2) khác phép đếm thật (1) — tức nó bảo akao vẽ hai vành cho một công cụ có một tay cầm. Lỗi ấy chỉ nổ ở kho bên kia, sau khi ai đó nâng lock, và triệu chứng là "cổng đòi 2 vành" chứ không phải "chú thích có chuỗi trùng". Nó là mặt NGƯỢC của một lớp lỗi akao đã trả giá: ở đó chuỗi trong chú thích làm bộ quét mù, ở đây làm bộ quét đếm thừa. Và nó khó thấy vì **chú thích càng viết đúng thì càng dễ gây lỗi** — viết đúng nghĩa là trích nguyên văn.

`test.js` nay canh đúng chuyện đó: đếm token hai lần, thô và sau khi che chú thích, rồi bắt hai số bằng nhau. Cổng ấy chỉ vá được phía gói; **che chú thích trước khi đếm ở phía akao mới là chữa gốc**, và nó bảo vệ mọi wrapper tương lai chứ không riêng cái này.

Và cổng bên kia đọc mã ở nhiều chỗ hơn chỗ đếm vành — trong đó có một arm hỏng theo chiều **ngược lại và tệ hơn**: nó nhận ra một giá trị prop bằng cách tìm `key === "v"`, `case "v"` hay `key: "v"` trong tệp, nên một chú thích chứa hình dạng ấy làm một từ LẠ trông như từ QUEN. Đỏ oan thì người ta đi tìm; **xanh oan thì không ai biết để đi tìm**. Quét chú thích của `src/interactive` ngày 2026-08-31 cho **8 chỗ mang đúng ba hình dạng ấy, trong 5 tệp**:

| tệp | chỗ trong chú thích |
|---|---|
| `DisjointChannel.js` | `variant: "disjoint"` · `variant: "flat"` · và một mảnh câu tiếng Việt lọt vào biểu thức (`ways: "disjoint"`) |
| `components/InteractiveBarsPattern.js` | `mode: "copy"` · `mode: "ghost"` |
| `components/InteractivePitchfork.js` | `variant: "fan"` |
| `components/LinearRegressionChannelWithArea.js` | `type: "SD"` |
| `wrapper/EachArrowMark.js` | `=== "down"` |

Cả tám **đang nói đúng sự thật**, nên cổng xanh nhờ chúng cũng là xanh đúng kết luận — nhưng xanh vì lý do sai: xoá nhánh `mode === "ghost"` khỏi leaf mà quên xoá câu chú thích thì cổng vẫn bảo "gói biết `ghost`". Tám cái kíp chờ sẵn, không phải một ca giả định. akaoio/akao#559 đã che chú thích ở cả chín chỗ đọc mã, nên chúng đã được tháo.

Kho này **cố ý không** canh ca ấy. Cấm chú thích chứa `=== "v"` là cấm luôn tám câu đang nói đúng, và là lấy cổng của kho A bắt kho B viết văn theo ý mình. Câu hỏi "từ này có được so sánh thật không" chỉ trả lời được ở phía ĐỌC, bằng phép che — đúng chỗ akao đã sửa. Cổng của kho này giữ phạm vi hẹp: một token, một phép đếm, một câu hỏi trả lời được từ phía này.

Cùng loại giao ước, chiều ngược lại: `variant: "schiff"` và `variant: "modifiedSchiff"` (`pitchforkAnchor`), `type: "RAY"` và `type: "LINE"` (`generateLine`) là bốn chuỗi akao truyền vào. Cả hai `switch` ấy có nhánh `default:` nuốt mọi giá trị lạ, nên đổi tên chúng làm akao vẽ sai **mà không có gì đỏ** — hỏng im lặng, loại đắt nhất. akaoio/akao#559 nay có cổng canh đúng chuyện đó, nhưng cổng ở kho bên kia: đổi tên thì báo trước.

**Không có giá trị golden nào cho nhóm này** — không có bản gốc để so. Bằng chứng nằm ở trình duyệt: các bài trong `tools/browser/tests.js` (đặt, hình tạm, hoàn tất đúng một đối tượng, kéo giữ dáng, pixel thật trên canvas) và các dòng trong bảng chạm một-ngón của `test.browser.js` (Pixel 7, CDP touch, 5 khẳng định mỗi công cụ).

Nhóm chart#34 thêm một phép đo mà nhóm trước không có: **vân tay canvas** (`mouseLayerSignature`) thay cho phép đếm pixel ở mọi chỗ khẳng định "hình đổi thật sự". Lý do đo được: một tam giác và một cung căng qua CÙNG ba neo rất dễ có cùng số pixel, nên `mouseLayerPixels` một mình để lọt việc bỏ hẳn nhánh `arc` trong `curveOutline`. Vân tay băm cả VỊ TRÍ từng pixel có mực, nên nó bắt. Đúng bài học cũ của #5, chỉ ở một trục khác: phép so phải nhạy với thứ nó tuyên bố đang đo.

Đã sửa hỏng ba chỗ có chủ ý, bắt được **3/3** — nhưng một chỗ chỉ bắt được sau khi làm bài kiểm chặt hơn:

| sửa hỏng chỗ nào | bài nào đổ |
|---|---|
| bỏ `#mouseMoved` của `ShapeTool` | cả bài chuột lẫn bài chạm của shape-tool — cú bấm đầu đã đẻ ra hình |
| `riskReward` bị thay bằng hằng số | bài R/R đổ ở `near ±0.001` |
| bỏ nhánh elip trong `drawInteractiveShape` | **lúc đầu KHÔNG đổ**: phép so "hình đổi trên canvas" đếm một lần lúc hình đang chọn (tay cầm + nét dày) và một lần lúc không — hai số khác nhau bất kể hình có đổi hay không. Đưa cả hai lần đếm về cùng trạng thái không-chọn thì mutation bị bắt. Lại đúng bài học cũ: phép so phải chỉ còn đúng một biến. |

Quy ước giữ nguyên: `hitSlop` cộng vào mọi phép đo trúng (lòng hình nới theo, `ClickableCircle` nới bán kính); `onHover === undefined` thì không hit-test; công cụ không giữ danh sách — báo qua `onComplete`, ứng dụng đặt lại.

## Ba tầng, ba cách chứng minh

Nhóm này không đồng nhất như các bậc trước:

| tầng | chứng minh bằng | trạng thái |
|---|---|---|
| hình học và tiện ích | so số, như bậc 1 và 5 | ☑ xong |
| phần vẽ | chuỗi lệnh canvas, như bậc 3 | ☑ xong |
| kéo thả, chọn, sửa | thao tác thật trong trình duyệt | ☑ xong |

**1.421 giá trị** khớp bản gốc, cộng **77 khẳng định** trong trình duyệt thật cho riêng nhóm này.

Ba component nhớ kết quả đo *trong chính mình* — bề rộng chữ, bề rộng hộp nhãn — nên chúng chỉ trỏ vào được sau khi đã vẽ một lần. Bộ kiểm giữ đúng ràng buộc ấy: vẽ và hỏi hover trên **cùng một thực thể**, cả hai phía. Bản gốc nhớ trong instance React, bản port nhớ trong một `cache` mà phần tử giữ.

Hình học Fibonacci nằm trong một hàm bản gốc **không xuất khẩu**. Thay vì chép lại công thức, bộ kiểm đi qua cây phần tử React mà bản gốc render rồi đọc các mức ra từ chính props của những đường ấy — con số đem so là con số bản gốc dùng để vẽ.

## chart#34: sửa hỏng có chủ ý, 9 chỗ trong bộ golden

Nhóm #34 không có bản gốc để so, nhưng hình học của nó là số học thuần — nên nó được so
với số tính TAY trong `test.js`, chạy không cần trình duyệt, và chín chỗ sửa hỏng đều đỏ
với một câu báo đọc được:

| sửa hỏng chỗ nào | bài nào đổ, và nói gì |
|---|---|
| bỏ nhánh cung tròn trong `curveOutline` | `cung: số mẫu: 3 ≠ 9` — cung hạ về đường gấp khúc |
| bỏ nhánh Bézier bậc ba | `Bézier bậc ba giữa đường: [[100,900]] ≠ [[150,925]]` |
| cung suy biến không hạ về đoạn thẳng | mọi toạ độ thành `null` (chia cho 0 → `NaN`, mà canvas nuốt `NaN` trong im lặng — không nổ, không vẽ) |
| `projection` quên chép vector nền | `{"to":[40,90]} ≠ {"to":[50,110]}` — đích trùng gốc |
| bỏ gốc chiếu `x3Value` | `fib time chiếu từ neo ba: [100,140,180] ≠ [500,540,580]` |
| ghost feed dùng `Math.random` | `không tất định: 2,-1,4,-1 rồi 4,-1,2,-1` |
| ghost feed bịa bước giá thay vì xáo bước có thật | `bóng giả dùng bước lạ: -2,4,-2,8` |
| bỏ một dòng showcase | `1 element công khai vắng mặt showcase: chart-sticker` |
| chú thích trích nguyên văn token tay cầm (đúng lỗi đã xảy ra thật) | `1 tệp làm cổng đếm icon của akao lệch: EachSticker.js (bộ quét đếm 2, thật 1)` |

**Chỗ suýt lọt.** Mồi đầu — bỏ nhánh cung tròn — lúc đầu đỏ bằng một cú **nổ**, không bằng
một câu báo: danh sách mẫu ngắn lại, `round(arc[8])` đọc phải `undefined` và ném. Nổ cũng
là đỏ, nhưng nó không nói cho người đọc biết cái gì đã lệch. Phép so giờ trả `null` cho chỗ
không có điểm, nên nó nói ra.

Bốn chỗ nữa trong bộ trình duyệt — những thứ golden không nhìn thấy — sửa hỏng cùng một
lượt, và mỗi chỗ đổ đúng bài của mình (một chỗ đổ hai bài):

| sửa hỏng chỗ nào | bài nào đổ, và nói gì |
|---|---|
| bảng `MARKS`: `left` trỏ về ▲ | `bốn hướng, bốn glyph: ▲▶▲▼ ≠ ◀▶▲▼` |
| `EachSticker` dựng HAI vành | `wrapper con dấu dựng đúng một vành: 2 ≠ 1` — đúng con số là giao ước với akao |
| `polyline` có số neo định trước (`count: 0 → 3`) | `polyline không định trước số neo: 3 ≠ 0`, và `ba cú bấm chưa chốt: 1 ≠ 0` |
| máy đếm neo chốt bằng hằng số thay vì đọc bảng | `hai cú bấm chưa xong tam giác`, cộng cả dòng chạm `chart-curve-tool` — gõ đúng chỗ mà không chọn được gì |

## Đã kiểm rằng bộ kiểm biết fail

20 chỗ bị sửa hỏng có chủ ý, bắt được **20/20** — nhưng một chỗ chỉ bắt được sau khi làm bài kiểm chặt hơn (xem dưới).

Golden, 13 chỗ:

| sửa hỏng chỗ nào | số giá trị lệch |
|---|---:|
| chữ đo lại bề rộng mỗi lần vẽ thay vì nhớ | 85 |
| nhãn cảnh báo không làm tròn y | 39 |
| nhãn cảnh báo vẫn vẽ khi giá trôi khỏi khung | 39 |
| hồi quy: chỉ đường giữa nhận hover | 14 |
| dấu ✕ bỏ đệm trái | 9 |
| nhãn cảnh báo thiếu đệm phải | 9 |
| kênh song song: `dy` đổi dấu | 8 |
| quạt Gann: tia 1/3 thành 1/4 | 8 |
| quạt Gann: tia 8/1 thành 7/1 | 6 |
| Fibonacci: mức 61.8 lệch 0.1 | 4 |
| hộp chữ mất đệm trái | 4 |
| hộp chữ cao thêm một cỡ chữ | 3 |
| quạt Gann bỏ hộp chặn của tia | 1 |

Trình duyệt, 7 chỗ, mỗi chỗ đổ đúng bài của nó: quạt Gann hai đầu trùng nhau · kênh song song xong ngay từ lần bấm thứ hai · Fibonacci chỉ còn năm mức · chữ kéo xong không đổi chỗ · brush báo cả khi bấm suông · cảnh báo xoá nhầm cái khác · kênh song song trả lại lỗi nhân thang hai lần của bản gốc.

**Chỗ suýt lọt.** Bỏ hộp chặn của tia quạt Gann lúc đầu **không bị bắt**: mấy điểm được thử đều nằm giữa tia, mà ở giữa thì có hộp chặn hay không cũng thế. Quét cả khung mới thấy đúng **512 trong 274.961 điểm** đổi câu trả lời — toàn nằm trong dải mỏng ngay quá đầu tia. Thêm một điểm trong dải ấy thì bắt được. Lại đúng bài học cũ: **dữ liệu kiểm phải dữ hơn dữ liệu thật**.

Hai bài kiểm hover cũng từng vô nghĩa mà nhìn thì tưởng đúng: bản gốc chặn `if (onHover !== undefined)` trước khi tính gì cả, nên bộ kiểm quên truyền `onHover` sẽ nhận **toàn `false`** và khớp hoàn hảo với một bản port hỏng bất kỳ. Giờ có `onHover`, và có một mục riêng đo đúng cái cửa chặn ấy.

## Một chỗ CỐ Ý khác bản gốc: trỏ vào thân kênh song song

`ChannelWithArea.isHover` của bản gốc lấy toạ độ **pixel** rồi đưa vào `isHovering`, mà hàm ấy chờ toạ độ **giá trị** và nhân thang thêm một lần nữa. Quét cả khung 760×360 ở bản gốc: **trúng 0 trên 68.961 điểm**. Thân kênh không bao giờ trỏ vào được — dù chính bản gốc đã gắn cho nó con trỏ "move" và một tay kéo cả kênh, tức là ý định thì rõ.

Bản port bỏ lần nhân thang thừa. Hai phía vì thế không thể khớp ở đây, nên mấy điểm "trúng" **không nằm trong bộ so**; chúng được đo trong chart thật, ở `test.browser.js`. Chỗ nào hai bên vẫn đồng ý — ra xa thì không trúng, không ai nghe thì không tính — vẫn so bình thường.

Ba chỗ khác vẫn giữ nguyên hành vi bản gốc vì chúng có lý: cửa chặn `onHover === undefined`, hộp bao của tia quạt Gann, và việc nhãn cảnh báo trôi khỏi khung thì không vẽ gì cả thay vì dán vào mép.

## Một chỗ CỐ Ý khác bản gốc: kho này không ship nút bấm nào

`<ZoomButtons>` của bản gốc vẽ ba nút tròn — `−` `+` `↺` — và mang theo cả một ngôn ngữ thiết kế: `r: 16`, nền `#ffffff` mờ `0.75`, viền `#e0e3eb`, glyph Material. Đây là thứ **duy nhất** trong cả thư viện vẽ ra giao diện của **ứng dụng** thay vì vẽ nội dung **biểu đồ**.

Cấy chart vào một dự án có hệ thiết kế riêng thì cụm nút ấy xung đột: nó không đọc token của host, không theo theme của host, không theo hình dạng nút của host. Mọi tính năng khác đều để ứng dụng tự dựng UI; chỉ mỗi cái này làm thay.

Và nó còn kéo theo một lỗi. `renderZoomButtons` đọc `moreProps.chartConfig.height` — chiều cao của **pane nó ngồi trong**, không phải của canvas — nên bật indicator là pane giá co lại và cụm nút bay lên giữa chart. Đo với canvas cao 600px:

| pane giá cao | `cy` nút | cách **đáy canvas** |
|---|---|---|
| 600 (không indicator) | 576 | 24px |
| 450 (1 indicator) | 426 | **174px** |
| 300 (3 indicator) | 276 | **324px** |

Cái giá hiện ra ở phía người dùng thư viện: cả showcase của kho này lẫn akao đều phải bù tay một con số (`heightFromBase = 108` và `oscillators + 42`) để kéo nút về đáy. Khi một prop tồn tại chủ yếu để người ta bù lỗi của nó, chỗ sai nằm ở tầng dưới.

Nên ba cái nút bị gỡ, và thứ có giá trị được giữ nguyên:

- **Sáu bước nội suy** — `zoomSteps`, vẫn so từng giá trị với bản gốc — dọn về `src/core/zoom/zoomSteps.js`, cạnh `zoomBehavior.js`. Hai file trả lời hai câu khác nhau: cái kia nói *cái gì đứng yên*, cái này nói *đi mấy bước*.
- **`canvas.zoomIn()` / `canvas.zoomOut()`** chạy chuỗi bước ấy. Mặc định nhân 1.5 — cố ý khác `zoomMultiplier` 1.1 của con lăn, vì một nấc con lăn không phải một lần bấm.
- **`canvas.reset()`** vẫn là phép mới của kho này. Bản gốc để `onReset` trống nên nút thứ ba của nó vẽ ra rồi nằm im — kể cả trong câu chuyện mẫu `StockChart` của chính bản gốc. Xem [`core.md`](core.md).

Golden vẫn giữ `zoomButtons` trong fixture, khai là lệch có chủ ý: fixture là chỗ duy nhất còn nói được bản gốc vẽ ra cây SVG gì.

## Một chỗ CỐ Ý khác bản gốc: công cụ vẽ tự biết pane của nó

Đăng ký một công cụ với `<DrawingObjectSelector>` buộc phải kèm `chartId`, và bản gốc để người dùng tự nhớ — trong ví dụ của nó, `chartId` được viết tay cho khớp với `<Chart id={…}>`. Nhớ sai thì `getMorePropsForChart` không tìm ra pane và đọc `undefined.origin`.

Cái giá của việc nhớ sai cao hơn nhiều so với vẻ ngoài của nó, vì chỗ ấy được gọi từ trong vòng phát sự kiện của `ChartCanvas`: cú nổ cắt luôn việc phát cho mọi phần tử đăng ký sau selector. Người dùng thấy "vẽ xong một cái là bấm gì cũng không ăn" — và đó đúng là chuyện đã xảy ra trên trang trưng bày công cụ vẽ, nơi chính tôi viết `chartId: undefined` còn pane mang id 0.

Hai phép sửa:

- Bảy công cụ vẽ giờ có getter `chartId`, trả về id của pane chứa nó — hỏi phần tử thì không nhớ sai được. Công cụ vẽ không phải `GenericChartComponent` nên trước đây nó không có sẵn thứ này; getter dùng đúng cơ chế context mà các series đang dùng, nên nó đúng cả khi pane bị bọc trong `<div>`.
- `getMorePropsForChart` nói ra chuyện gì đã xảy ra: `chartId` nào được hỏi, và những pane nào đang có. Vẫn ném chứ không âm thầm bỏ qua — `chartId` sai là lỗi của ứng dụng, và cái giá của việc im lặng là "chọn không được mà không hiểu vì sao".

3 khẳng định trên trang trưng bày: đặt được một nhãn, bấm tiếp thì không lỗi nào, và công cụ khác vẫn vẽ được sau đó. Trả `chartId: undefined` về thì bài đổ. Bài kiểm cũ mù chỗ này vì nó vẽ một trendline bằng hai cú bấm rồi dừng — cú bấm thứ hai xảy ra khi danh sách còn rỗng, nên `getMorePropsForChart` chưa được gọi tới.

## Chỗ đáng nói: `LINE`, `RAY`, `XLINE`

Một trendline vẽ trên hai cây nến thường có ý kéo dài. Nên đường thẳng có ba kiểu: `LINE` dừng ở hai điểm, `RAY` chạy từ điểm đầu tới mép chart, `XLINE` cắt ngang cả hai chiều.

Hệ quả: hai kiểu sau **phải tính lại mỗi khi domain đổi** — chúng bám vào mép khung nhìn chứ không vào dữ liệu. Đó cũng là lý do hai mutation "bỏ xét chiều vẽ" và "luôn kéo sang phải" chỉ lệch vài giá trị mà vẫn phải bắt: sai chiều thì đường vẫn vẽ, chỉ là kéo dài về phía ngược lại.

## Chỗ đáng nói: kênh hồi quy không nhớ hình của nó

Mọi công cụ khác nhớ những điểm người dùng đã đặt. `StandardDeviationChannel` chỉ nhớ **hai mốc x**; đường và dải của nó được tính lại từ dữ liệu nằm giữa, mỗi lần vẽ. Kéo một đầu là hỏi lại một câu khác — "xu hướng trong quãng này là gì" — chứ không phải dịch một hình đã vẽ.

## Năm lỗi trong khung, tìm ra nhờ các công cụ vẽ tay

Không lỗi nào lộ ra ở năm bậc trước, vì trước đó chưa có gì vừa nhận sự kiện vừa tự dựng lại con.

**1. Property của phần tử che mất hook của khung.** `GenericComponent` gọi `this.onClick(...)`; một component vừa nhận *property* `onClick` vừa định nghĩa *hook* `onClick` thì property — vốn là own property — che mất method trên prototype. Kết quả: hook thành mã chết, và callback của người dùng bị gọi sai chữ ký.

Sửa tận gốc: hook được tra trên **chuỗi prototype**, bỏ qua own property. Property là dữ liệu component đọc, hook là hành vi khung gọi — hai thứ khác nhau và giờ không thể lẫn.

**2. Dựng lại phần tử con làm mất trạng thái đang có.** Wrapper dựng lại toàn bộ con mỗi lần đổi trạng thái. Nhưng hover và drag *sống trên chính những phần tử ấy* — nên thay phần tử giữa chừng là vứt đi đúng cái trạng thái mà thao tác đang cần: đường quên mất nó đang được hover ngay khoảnh khắc nó được hover, và không bao giờ kéo được.

**3. Mỗi lần ghi property là một lần vẽ lại cả chart.** Cấu hình một phần tử nghĩa là ghi cả chục property liên tiếp; vẽ lại từng lần là vẽ lại cả chục lần, và lần đầu tiên rơi vào lúc chart chưa kịp tính ra nó đang hiển thị cái gì — nổ. Giờ gom vào một microtask.

**4. Phần tử vẽ ngay lúc gắn vào cây, trước khi được cấu hình.** `append` chạy `connectedCallback` *ngay tức khắc*, mà gắn-rồi-mới-đặt-property là cách viết DOM tự nhiên. Phần tử nào có hàm vẽ đọc một prop bắt buộc sẽ nổ ngay tại đó — `EachFibRetracement` lộ ra điều này vì nhãn mức của nó cần `xyProvider`. Lần vẽ đầu giờ cũng đợi hết microtask, cùng lý do với mục 3.

**5. Đổi danh sách đối tượng trên công cụ chỉ vẽ lại, không dựng lại.** Gán `tool.fans = [...]` sau khi chart đã dựng thì phải **tạo thêm wrapper**, chứ không phải chỉ vẽ lại cái đang có. Các công cụ giờ dựng lại cây con khi property đổi, gom vào một microtask để một loạt gán chỉ dựng lại một lần.

Bốn trong năm lỗi nằm dưới mọi thứ đã port từ bậc 2 trở đi. Không cái nào lộ ra cho tới khi có một công cụ vừa nghe sự kiện vừa tự dựng lại con — đó là lý do bậc 6 đáng làm sớm hơn là muộn.
