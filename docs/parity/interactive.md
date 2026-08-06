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
| `ZoomButtons` | `ZoomButtons.tsx` | ☑ | cây SVG khớp từng node, 6 bước nội suy, và 6 khẳng định bấm thật |
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
| `chart-fib-extension` | Trend-based fib extension | 3 bấm | không leaf mới — mỗi mức một `InteractiveStraightLine` RAY + `chart-interactive-label`, đúng khuôn retracement |
| `chart-callout` | Callout | 2 bấm | không leaf mới — `InteractiveText` + chân `InteractiveStraightLine` + tay cầm neo |
| `chart-price-label` | Price label | 1 bấm | không leaf mới — `InteractiveText` mà chữ là chính y của nó, kéo là đổi giá |
| `chart-pattern` (`variant`) | XABCD · Cypher · ABCD · Triangle · Three drives · H&S · Elliott ×3 | n bấm | `chart-interactive-polyline` (mới): đường gấp khúc + nhãn đỉnh + fill tam giác; máy đặt-n-điểm là MỘT, variant chỉ là bảng |
| `chart-path` | Path · Polyline | n bấm + nhấp đúp chốt (hoặc phương thức finish cho màn chạm) | dùng lại nguyên `chart-each-pattern` — path là pattern không bảng |
| `chart-cyclic-lines` | Cyclic lines | 2 bấm | `chart-interactive-cycles` (mới): vạch dọc lặp theo chu kỳ, chặn 500 vạch |
| `chart-arrow` | Arrow · Arrow marker | 2 bấm | `chart-interactive-arrow` (mới): thân + đầu đặc |
| `chart-arrow-mark` (`mode`) | Arrow mark up · Arrow mark down | 1 bấm | không leaf mới — glyph ▲/▼ trên `InteractiveText` |
| `chart-fib-time-zone` | Fib time zone | 2 bấm | không leaf mới — `chart-interactive-cycles` học thêm `offsets`, dãy Fibonacci thay cho lặp đều |
| `chart-fib-shape` (`variant`) | Fib speed resistance fan · Fib arcs · Fib circles · Fib spiral · Fib wedge | 2–3 bấm | `chart-interactive-fib-shape` (mới): hình học tính một lần trong pixel, vẽ và dò trúng cùng đọc; bán kính pixel từ hai neo dữ liệu |
| `chart-info-line` | Info line | 2 bấm | không leaf mới — nhãn giữa đoạn đọc Δgiá/%/số nến, suy từ dữ liệu nên không cũ được. Trend angle CỐ Ý chưa làm: góc phụ thuộc tỉ lệ pixel hai trục, cần label tính chữ theo pixel — ghi vào #5 |

Riêng "Inside pitchfork" của TradingView cố ý chưa làm: phép neo của nó không có tài liệu nào đủ tin để chép — bịa ra một công thức rồi gọi bằng tên của họ thì tệ hơn là thiếu.

Wrapper tương ứng: `EachAxisLine`, `EachShape`, `EachMeasure`, `EachPosition`, `EachPitchfork`, `EachFibExtension`, `EachCallout`, `EachPriceLabel`, `EachPattern`, `EachCyclicLines`, `EachArrow`, `EachArrowMark`, `EachInfoLine`, `EachFibShape` — cùng quy tắc với các wrapper port: con tạo một lần rồi sửa tại chỗ, tay cầm chỉ hiện khi hover/chọn, kéo thân đi bằng delta pixel rồi mới đổi về data.

**Không có giá trị golden nào cho nhóm này** — không có bản gốc để so. Bằng chứng nằm ở trình duyệt: năm bài trong `tools/browser/tests.js` (đặt, hình tạm, hoàn tất đúng một đối tượng, kéo giữ dáng, pixel thật trên canvas) và năm dòng trong bảng chạm một-ngón của `test.browser.js` (Pixel 7, CDP touch, 5 khẳng định mỗi công cụ).

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

## Một chỗ CỐ Ý khác bản gốc: nút reset có việc để làm

`<ZoomButtons>` của bản gốc vẽ ba nút, và nút thứ ba chỉ gọi `onReset`. Không ai truyền gì vào thì nó không làm gì — kể cả câu chuyện mẫu `StockChart` của chính bản gốc cũng để trống, nên ở đó nút reset vẽ ra rồi nằm im.

Một cái nút bấm không ăn thì không phải là "trung thành", là hỏng. Ở đây không đặt `onReset` thì nút đưa chart về **đúng hình lúc mở**: khung nhìn x quay lại `xExtents`, và mọi pane bỏ khung giá người dùng tự kéo. Ứng dụng vẫn đặt `onReset` của riêng mình được, và khi ấy phép mặc định không chạy.

Phép ấy là `canvas.reset()`, một phương thức mới của `<chart-canvas>` — xem [`core.md`](core.md).

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
