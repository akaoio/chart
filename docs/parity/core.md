# parity: `core`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/core/src`. Port ở **bậc 2** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

Một dòng chỉ được đánh ☑ khi đã có bằng chứng kèm theo. Đánh dấu xong mà không có bằng chứng là nói dối.

## Export runtime (45)

Phần lớn danh sách này là hàm thuần đã port và chứng minh ở bậc 1 — `core` export ra ngoài gần như mọi thứ trong `utils/`. Cột cuối nói rõ mỗi dòng được chứng minh bằng cách nào.

| export | loại | file nguồn | tt | bằng chứng |
|---|---|---|:--:|---|
| `ChartCanvas` | class | `ChartCanvas.tsx` | ☑ | 59 khẳng định trong trình duyệt thật |
| `Chart` | const | `Chart.tsx` | ☑ | như trên — hai pane, thang y riêng, lọc sự kiện |
| `GenericComponent` | class | `GenericComponent.tsx` | ☑ | như trên — đăng ký, vẽ, gỡ |
| `GenericChartComponent` | class | `GenericChartComponent.tsx` | ☑ | như trên — gốc toạ độ pane kiểm bằng pixel |
| `getAxisCanvas` | const | `GenericComponent.tsx` | ☑ | dùng trong bài kiểm trình duyệt |
| `getMouseCanvas` | const | `GenericComponent.tsx` | ☑ | |
| `mouseBasedZoomAnchor` | const | `zoom/zoomBehavior.ts` | ☑ | golden `chartdata.zoomAnchors` |
| `lastVisibleItemBasedZoomAnchor` | const | `zoom/zoomBehavior.ts` | ☑ | golden |
| `rightDomainBasedZoomAnchor` | const | `zoom/zoomBehavior.ts` | ☑ | golden |
| `clearCanvas` | function | `utils/index.ts` | ☑ | mọi lần xoá canvas trong bài kiểm trình duyệt |
| `d3Window` | function | `utils/index.ts` | ☑ | |
| `mousePosition` | function | `utils/index.ts` | ☑ | đường pan và click |
| `touchPosition` · `getTouchProps` | function | `utils/index.ts` | ☑ | |
| `accumulatingWindow` | default | `utils/accumulatingWindow.ts` | ☑ | golden bậc 1 |
| `slidingWindow` | default | `utils/slidingWindow.ts` | ☑ | golden bậc 1 |
| `zipper` | default | `utils/zipper.ts` | ☑ | golden bậc 1 |
| `shallowEqual` | const | `utils/shallowEqual.ts` | ☑ | golden bậc 1 |
| `identity` · `noop` · `sign` · `path` · `functor` | | `utils/` | ☑ | golden bậc 1 |
| `head` · `first` · `last` | | `utils/index.ts` | ☑ | golden bậc 1 |
| `isDefined` · `isNotDefined` · `isObject` | | `utils/index.ts` | ☑ | golden bậc 1 |
| `mapObject` · `getClosestValue` | | `utils/index.ts` | ☑ | golden bậc 1 |
| `getClosestItem` · `getClosestItemIndexes` | | `utils/closestItem.ts` | ☑ | golden bậc 1 |
| `getStrokeDasharray` · `getStrokeDasharrayCanvas` | | `utils/strokeDasharray.ts` | ☑ | golden bậc 1 |
| `plotDataLengthBarWidth` | const | `utils/barWidth.ts` | ☑ | golden bậc 1 |
| `ChartCanvasContext` | const | `ChartCanvas.tsx` | ⊘ | React context; thay bằng giao thức sự kiện, xem dưới |
| `ChartContext` | const | `Chart.tsx` | ⊘ | như trên, vai trò `"pane"` |
| `PureComponent` | class | `utils/PureComponent.tsx` | ⊘ | là React |
| `MOUSEENTER` `MOUSELEAVE` `MOUSEMOVE` `MOUSEUP` `TOUCHMOVE` `TOUCHEND` | const | `utils/index.ts` | ⊘ | tên sự kiện mang **namespace của d3** (`"mousemove.pan"`); nền tảng không có khái niệm này, xem dưới |

Nội bộ, không export nhưng đã port đủ: `CanvasContainer`, `EventCapture`, `ChartDataUtil`, `evaluator`. Theo dõi ở [`core-utils.md`](core-utils.md).

`useEvent.ts` ⊘ — hook React vá một thiếu sót của chính React. Không có gì tương ứng.

## Ba quyết định kiến trúc của bậc 2

### 1. Con tìm cha — giao thức sự kiện, không phải registry

Dựng cả ba phương án rồi cho chạy qua 10 kiểu gắn vào DOM mà một trang thật tạo ra (`tools/prototype/composition.mjs`, chạy lại được bất cứ lúc nào):

| | điểm |
|---|:--:|
| sự kiện nổi bọt | **10/10** |
| cha gán property khi `slotchange` | 8/10 |
| registry toàn cục theo id | 9/10 |

`slotchange` mù với lồng sâu và với shadow DOM. Registry chỉ hỏng một phép thử — thêm series vào chart thứ nhất trong hai chart đã dựng sẵn — nhưng nó hỏng bằng cách **bám nhầm chart mà không báo gì**, tệ hơn hỏng ra mặt.

Sự kiện nổi bọt thắng vì nó đi theo cây đã ghép: "chart gần nhất bao ngoài" do chính DOM trả lời, không do một sổ sách song song có thể lệch khỏi DOM. Thứ trả về là **phần tử** cha chứ không phải bản chụp giá trị, nên con đọc giá trị sống và gọi phương thức — đúng như context của bản gốc.

Phép đo phải trung thực mới có nghĩa. Bản nháp đầu chấm registry 9/9 vì chỉ so id; sửa tiêu chí thành "cha đúng = tổ tiên gần nhất trên cây đã ghép", và thêm cảnh dò ở chart *thứ nhất* thay vì chart cuối, thì chỗ hỏng mới lộ.

### 2. Gỡ listener theo nhóm — `AbortController` thay namespace của d3

Bản gốc viết `select(window).on("mousemove.pan", handler)` rồi gỡ bằng `.on("mousemove.pan", null)`: đúng một listener, theo tên, không đụng `mousemove` của ai khác, không cần giữ tham chiếu hàm. `removeEventListener` đòi đúng hàm cũ, nên làm tay nghĩa là cất từng handler rồi nhớ ghép lại cho khớp.

`AbortSignal` nói cùng ý đó thẳng hơn: mỗi cử chỉ một controller, `abort()` là gỡ sạch. Không thể lệch, vì không có gì phải giữ cho khớp. Kèm theo một tính chất bản gốc không có sẵn: chart bị gỡ giữa lúc đang kéo cũng không để lại gì trên `window`, và điều đó có bài kiểm riêng.

### 3. `mutableState` thành state tường minh — **lệch 1:1 có chủ ý**

Bản gốc để `mouseXY`, `currentItem`, `currentCharts` trong `mutableState`, ghi thẳng không qua `setState` để React khỏi render lại mỗi lần chuột nhúc nhích.

Ở đây không có React để lách, nên tất cả nằm trong một object state duy nhất, và object đó là **câu trả lời đầy đủ cho câu hỏi "màn hình đang hiện cái gì"**. `getState()` đọc, `setState()` khôi phục. Cùng state vào thì cùng hình ra — điều kiện để tua chart tới lui theo lời giảng, thay vì chỉ chạy tới theo con chuột.

Ràng buộc này đến từ tính năng khoá học TTS nêu trong #1, và đã kiểm: chụp state, kéo đi chỗ khác, trả state cũ về, hình vẽ lại đúng domain cũ.

## Lệch có chủ ý so với bản gốc

| chỗ nào | bản gốc | ở đây | vì sao |
|---|---|---|---|
| tên thẻ của `Chart` | `<Chart>` | `<chart-pane>` | `<chart-chart>` là cái tên phải sống chung trong HTML; "pane" đúng là thứ nó biểu diễn, và tài liệu bản gốc cũng gọi vậy |
| prop `id` của `Chart` | `id` | `chartId` | `id` trên phần tử DOM đã có nghĩa sẵn, đè lên sẽ phá `getElementById` và selector CSS. Đổi tên còn cho phép hai chart trên cùng trang cùng có pane tên `"price"`, thứ mà id tài liệu không cho |
| `getNewChartConfig` | nhận React children, đọc `each.props` | nhận thẳng mảng props | custom element không có lớp bọc `props` |
| `withSize` / `withDeviceRatio` | HOC bọc ngoài | phần tử tự đo | xem [`utils.md`](utils.md) |
| lớp CSS con trỏ | `react-financial-charts-*` | `chart-*` | tên cũ nhắc tới React trong một bản không có React |

## Chỗ bản gốc kỳ lạ, cố ý giữ nguyên

**`hackyWayToStopPanBeyondBounds__plotData` / `__domain`.** Tên biến tự nhận là chắp vá, và kế hoạch ban đầu định làm lại cho tử tế. Đọc kỹ thì nó không phải rác: trong lúc kéo, kết quả khung hình trước được nạp lại làm `currentPlotData`/`currentDomain`, nên dữ liệu không trôi ra ngoài mép nhanh hơn domain đuổi theo. Giữ nguyên cả tên, vì cái tên nói đúng sự thật. Xét lại ở bậc 3 khi có axes thật để đo.

**Vẽ lại là phát cho tất cả, không lọc theo pane.** Ban đầu tưởng là thiếu sót và đã viết hẳn một bài kiểm để bắt lỗi — nhưng bài kiểm sai chứ không phải mã. Các pane dùng chung một lớp canvas vừa bị xoá sạch; ai không vẽ lại thì biến mất. Cửa lọc theo pane nằm ở tầng xử lý sự kiện (hover, click, callback), đúng chỗ bản gốc đặt nó.

## Bằng chứng biết fail

Bậc 2 không chứng minh được bằng golden data — nó là DOM, canvas và chuột. Bộ kiểm chạy trong Chromium thật (`npm run test:browser`, 59 khẳng định). Để chắc nó không xanh vô nghĩa, sửa hỏng bản port 6 chỗ:

| sửa hỏng chỗ nào | bài kiểm bắt được |
|---|---|
| bỏ `stopPropagation` trong giao thức context | chart lồng trong chart: series bám chart gần nhất |
| `disconnect` không huỷ cử chỉ đang chạy | gỡ chart giữa lúc đang kéo |
| bỏ lọc sự kiện theo pane | sự kiện chuột chỉ tới series của pane đang trỏ |
| `unsubscribe` không gỡ gì | gỡ series ra thì nó thôi được vẽ |
| `setState` bỏ qua giá trị mới | getState/setState đưa chart về hình cũ |
| không dịch gốc toạ độ về góc pane | hai pane chồng nhau (soi vị trí pixel) |

Vòng đầu chỉ bắt được **1 trong 6**. Ba bài phải viết lại vì chúng khẳng định nhầm chỗ: đếm "không vẽ nữa" thay vì đếm danh sách đăng ký (series đã gỡ tự bỏ qua lệnh vẽ, nên đăng ký rác vẫn tích lại mà test vẫn xanh); đếm số pixel màu thay vì vị trí của chúng; và không có cảnh nào lồng chart trong chart nên `stopPropagation` chưa bao giờ được dùng tới.
