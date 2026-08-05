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
| `ClickCallback` | `ClickCallback.tsx` | ☑ | vẽ rỗng, chỉ chuyển tiếp sự kiện |
| `DrawingObjectSelector` | `DrawingObjectSelector.tsx` | ☑ | |
| `ZoomButtons` | `ZoomButtons.tsx` | ☑ | cây SVG khớp từng node, cộng 6 bước nội suy |
| `TrendLine` | `TrendLine.tsx` | ☑ | 22 khẳng định trong trình duyệt: vẽ, cửa chặn, kéo cả đường |
| `Brush` | `Brush.tsx` | ☑ | 6 khẳng định: kéo ra khoảng chọn, bấm suông thì không |
| `EquidistantChannel` | `EquidistantChannel.tsx` | ☑ | 18 lệnh canvas × 3 dáng, cộng 4 khẳng định ba-lần-bấm |
| `StandardDeviationChannel` | `StandardDeviationChannel.tsx` | ☑ | 22 lệnh × 3 dáng, cột hover ba đường, 4 khẳng định |
| `FibonacciRetracement` | `FibonacciRetracement.tsx` | ☑ | 6 mức × 2 chiều, cộng 5 khẳng định trong trình duyệt |
| `GannFan` | `GannFan.tsx` | ☑ | 114 lệnh canvas, cột hover chín tia, 6 khẳng định |
| `InteractiveText` | `InteractiveText.tsx` | ☑ | 11 lệnh, hộp chữ đo bằng canvas, 6 khẳng định |
| `InteractiveYCoordinate` | `InteractiveYCoordinate.tsx` | ☑ | 38 lệnh, cộng 9 khẳng định: kéo đổi giá, bấm ✕ thì xoá |

Nội bộ đã port đủ: `components/` (`InteractiveStraightLine`, `ClickableCircle`, `ClickableShape`, `Text`, `HoverTextNearMouse`, `MouseLocationIndicator`, `ChannelWithArea`, `LinearRegressionChannelWithArea`, `GannFan`, `InteractiveText`, `InteractiveYCoordinate`) và `wrapper/` (`EachTrendLine`, `EachEquidistantChannel`, `EachLinearRegressionChannel`, `EachFibRetracement`, `EachGannFan`, `EachText`, `EachInteractiveYCoordinate`).

Bề mặt công khai của `src/interactive/index.js` **đúng bằng** bề mặt của `index.ts` bản gốc: công cụ và `utils`, không có phần trong ruột. Các file trong `components/` và `wrapper/` vẫn được nạp ở đó — thẻ tuỳ biến phải được đăng ký thì trình duyệt mới hiểu — nhưng không re-export, y như bản gốc.

## Ba tầng, ba cách chứng minh

Nhóm này không đồng nhất như các bậc trước:

| tầng | chứng minh bằng | trạng thái |
|---|---|---|
| hình học và tiện ích | so số, như bậc 1 và 5 | ☑ xong |
| phần vẽ | chuỗi lệnh canvas, như bậc 3 | ☑ xong |
| kéo thả, chọn, sửa | thao tác thật trong trình duyệt | ☑ xong |

**1.421 giá trị** khớp bản gốc, cộng **65 khẳng định** trong trình duyệt thật cho riêng nhóm này.

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
