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
| — | không có | `reset()` | bản gốc không có phép đưa chart về hình lúc mở, nên nút reset của `ZoomButtons` không có gì để gọi |
| `strokeDashTypes` | một **kiểu** TypeScript | mảng các tên | kiểu không tồn tại lúc chạy; cái mảng chính là thứ kiểu ấy mô tả |

## Chỗ bản gốc kỳ lạ, cố ý giữ nguyên

**`hackyWayToStopPanBeyondBounds__plotData` / `__domain` — đã bỏ, chữa ở gốc.** Bản gốc giữ hai biến ấy để nhớ khung hình trước và trả lại nó khi kéo quá tay. Chính cái tên đã tự nhận là chắp vá, và nó chắp vá thật: `filterData` là một hàm thuần, nhưng câu trả lời của nó lại phụ thuộc vào chuyện trước đó đã kéo những gì.

Đo ra thì nó đang chặn một lần **ném lỗi**: kéo quá tay thì domain trôi tới chỗ gần như không còn điểm nào, nhánh cuối cắt danh sách còn rỗng, rồi `xAccessor(head([]))` nổ.

Chữa ở đúng chỗ ấy, trong `filterData`: **giới hạn khung nhìn theo chính dữ liệu**. Giữ lại đúng số điểm tối thiểu mà `minPointsPerPxThreshold` đã quy định, rồi đẩy khung nhìn lại đúng lượng tối thiểu để không vượt qua đó. Bề rộng khung nhìn không đổi, kéo tiếp thì đứng yên chứ không giật ngược, và không còn trạng thái nào phải nhớ giữa hai lần gọi — kể cả `currentPlotData`/`currentDomain` trong `options` cũng đã bỏ, vì không ai còn truyền.

Hành vi người dùng thấy vẫn thế: kéo tới mép thì dừng. Bằng chứng là bài `kéo mãi cũng không kéo chart ra khỏi dữ liệu` (9 khẳng định); bỏ phép giới hạn ấy đi thì bài đổ.

**Vẽ lại là phát cho tất cả, không lọc theo pane.** Ban đầu tưởng là thiếu sót và đã viết hẳn một bài kiểm để bắt lỗi — nhưng bài kiểm sai chứ không phải mã. Các pane dùng chung một lớp canvas vừa bị xoá sạch; ai không vẽ lại thì biến mất. Cửa lọc theo pane nằm ở tầng xử lý sự kiện (hover, click, callback), đúng chỗ bản gốc đặt nó.

## Khác bản gốc về nhịp vẽ, không về hình vẽ

React biết hết props trước khi mount; DOM thì không — `append` chạy `connectedCallback`
*ngay tức khắc*, còn property thường được đặt sau đó. Nên bản port hoãn cả **lần vẽ đầu**
lẫn **mọi lần vẽ lại do đổi property** sang hết microtask: cả loạt gán xong rồi mới vẽ, và
vẽ đúng một lần.

Chi tiết này là của bản port, không có ở bản gốc, nhưng nó phục vụ đúng cái bản gốc có sẵn
nhờ React. Ba lỗi được nó chặn đứng đều tìm ra ở bậc 6 — xem
[`interactive.md`](interactive.md).

Cùng lý do, phần tử nào giữ thứ nhớ sẵn phụ thuộc vào property (bề rộng chữ đã đo, chẳng
hạn) được báo qua `propertyChanged(name)` khi property đổi. Đây là chỗ của
`componentDidUpdate` bên bản gốc.

## Kéo dọc: một lỗi của bản port và một lỗi của bản gốc

Người dùng báo từ trang thật: chạm vào trục giá một lần rồi kéo nến theo chiều dọc thì nến trôi xa gấp mấy lần con trỏ, không nhúc nhích trong lúc kéo, rồi nhảy một phát khi thả tay. Đào ra hai nguyên nhân rời nhau.

**Của bản port.** `handlePan` nạp kết quả từng khung hình vào `#state`, mà `#panHelper` lại tính `dy` từ mốc đặt tay xuống — nên mỗi khung cộng thêm một lần nữa lên một thang **đã dịch rồi**, và độ dịch phình theo bình phương: kéo 100px thì thang y đi xa gấp ba. Trục x không dính vì thang lúc bắt đầu kéo được truyền vào (`panStartXScale`), còn thang y thì lấy từ state.

Bản gốc không dính vì nó **không `setState` trong lúc kéo** — trạng thái chỉ chốt ở `panend`. Bản port giờ làm đúng như thế: trong lúc kéo chỉ ghi lại phần con trỏ.

**Của bản gốc.** Sự kiện `pan` mang danh sách pane dưới tên `chartConfigs`, còn phép thu hẹp về một pane trong `GenericChartComponent.updateMoreProps` lại đi tìm `chartConfig`. Hai cái tên không gặp nhau, nên suốt cú kéo mọi phần tử vẫn vẽ theo thang y **cũ** — kéo dọc không nhúc nhích cho tới khi thả tay.

Đây là đọc mã bản gốc mà kết luận, không phải chạy React ra rồi đo: `panHelper` trả về `chartConfigs`, `updateMoreProps` đọc `chartConfig`, và không có chỗ nào ở giữa đổi tên. Bản port sửa bằng cách **tách hẳn hai cái tên**: `chartConfigs` luôn là danh sách, `chartConfig` luôn là pane này — không còn phải hỏi `Array.isArray` để biết đang cầm cái nào.

8 khẳng định canh chỗ này, đo cả hai điều: trong lúc kéo hình vẽ đi tới đâu, và sau khi thả thì dừng ở đâu. Trả lại một trong hai lỗi thì bài đổ.

## Ngón tay: chart chạy ngược chiều vuốt

Cùng lần soi ấy còn lòi ra một lỗi nữa, và lần này của bản gốc: `handlePan` đảo dấu ở nhánh chạm —

```js
dx = panOrigin[0] - mouseXY[0]     // chạm
dx = mouseXY[0] - panOrigin[0]     // chuột
```

— nên trên màn hình cảm ứng chart chạy **ngược** chiều ngón tay, cả ngang lẫn dọc. Đo trên trang thật trước khi sửa, cùng một cú kéo sang phải 150px:

| | domain x dịch |
|---|---:|
| chuột | −25.0 (nến đi theo tay) |
| ngón tay | **+25.8** (nến đi ngược) |

Bản port bỏ phép đảo dấu: một công thức cho cả hai, vì "nội dung đi theo thứ đang kéo nó" không phụ thuộc vào việc thứ ấy là con trỏ hay ngón tay.

4 khẳng định canh chỗ này, dựng bằng `TouchEvent` thật của trình duyệt, đo cả bốn chiều vuốt. Trả lại phép đảo dấu thì bài đổ.

## Nhấp đúp: bản gốc chỉ đo thời gian, không đo khoảng cách

`EventCapture` của bản gốc coi **mọi** cú bấm thứ hai trong vòng 400ms là một cú nhấp đúp, dù nó ở đâu trên biểu đồ:

```js
if (this.clicked && onDoubleClick !== undefined) { onDoubleClick(mouseXY, e); this.clicked = false }
else { onClick(mouseXY, e); this.clicked = true; setTimeout(() => { … }, 400) }
```

Hậu quả nhìn thấy được: chọn công cụ Text rồi đặt hai nhãn ở hai đầu biểu đồ, nhanh tay một chút, thì cái thứ hai **không xuất hiện** — không lỗi, không dấu vết, chỉ là không có gì xảy ra. Trên điện thoại thì gần như luôn xảy ra, vì gõ hai lần thì nhanh. Bộ kiểm ở đây từng phải có hẳn một hàm `pastDoubleClickWindow()` chờ 450ms giữa hai cú bấm để đi qua chỗ này — một cái vòng phải lách chứ không phải một hành vi.

Nhấp đúp vốn là hai cú bấm **vào cùng một chỗ**; chính trình duyệt cũng đo khoảng cách khi phát `dblclick`. Nên ở đây hỏi cả khoảng cách (`DOUBLE_CLICK_SLOP`, 8px — rộng hơn con chuột để ngón tay còn chỗ), và một cú bấm ra ngoài bán kính ấy được tính là một cú bấm mới, mở lại cửa sổ nhấp đúp tại chỗ mới.

Cùng chỗ ấy còn một lỗi thứ hai của bản gốc: mỗi cú bấm hẹn một `setTimeout` riêng mà không ai huỷ cái cũ, nên hẹn giờ của một cú bấm cũ đóng cửa sổ nhấp đúp của cú bấm mới. Bản port huỷ cái cũ trước khi hẹn cái mới. Lỗi này lộ ra vì bài kiểm mới bấm ba cặp liên tiếp và cặp thứ ba đổ.

`AxisZoomCapture` mang y nguyên hai phép sửa ấy, với cửa sổ 300ms của riêng nó.

5 khẳng định: hai chỗ khác nhau → hai cú bấm; cùng chỗ → một cú nhấp đúp; lệch 4px → vẫn nhấp đúp. Bỏ phép đo khoảng cách thì bài đổ.

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
