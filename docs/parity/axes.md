# parity: `axes`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/axes/src`. Port ở **bậc 3** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (3)

| export | loại | file nguồn | tt | bằng chứng |
|---|---|---|:--:|---|
| `Axis` | class | `Axis.tsx` | ☑ | 15 cấu hình, chuỗi lệnh canvas khớp bản gốc từng lệnh một |
| `XAxis` | class | `XAxis.tsx` | ☑ | dựng trong chart thật; trục nằm đúng đáy pane, vẽ ra pixel, kéo được cho giãn |
| `YAxis` | class | `YAxis.tsx` | ☑ | dựng trong chart thật; trục nằm đúng mép phải pane, kéo được cho giãn |

Nội bộ đã port: `AxisZoomCapture` — dải bắt chuột trên trục, không nằm trong barrel của bản gốc.

Tên thẻ: `<chart-x-axis>`, `<chart-y-axis>`, `<chart-axis-zoom-capture>`. `Axis` không có thẻ riêng — nó là phần vẽ dùng chung, `XAxis`/`YAxis` chỉ tính ra tham số rồi gọi nó, đúng như bản gốc.

## Bằng chứng

Bậc 3 vẽ ra hình, mà hình trên canvas là một **chuỗi lệnh**. Nên thay vì chụp ảnh so pixel, cả bản gốc lẫn bản port cùng vẽ vào một canvas giả rồi so đúng từng lệnh — chính xác hơn so ảnh, và khi lệch thì chỉ ra ngay lệnh thứ mấy chứ không phải "có 37 pixel khác nhau".

15 cấu hình trục được kiểm (đếm theo lệnh canvas, không phải theo giá trị lá mà `npm test` in ra): trục x dưới, trục x trên, trục y phải, trục y trái, có lưới (cả hai hướng), không tick, `tickValues` chỉ định tay, `tickInterval`, `tickFormat` tuỳ biến, `outerTickSize`, và bốn mật độ tick khác nhau.

Đã kiểm rằng bộ này **biết fail**:

| sửa hỏng chỗ nào | số lệnh lệch |
|---|---:|
| mô phỏng lực chạy 50 bước thay vì 100 | 80 |
| ngưỡng dịch nhãn `0.01` → `0.5` | 12 |

Dòng thứ hai chỉ bắt được sau khi thêm nhiều mật độ tick khác nhau. Với một mật độ duy nhất, mọi nhãn hoặc không dịch, hoặc dịch xa hơn `0.5` — nên đổi ngưỡng chẳng ảnh hưởng gì và bộ kiểm im lặng.

## Chỗ đáng nói: nhãn trục x được đẩy nhau bằng mô phỏng lực

Đây là thứ duy nhất trong `axes` không phải số học đơn giản. Mỗi tick thành một vật thể bị kéo về đúng vị trí thật của nó và bị đẩy khỏi hàng xóm (`forceCollide(22)`), chạy 100 bước.

Lý do: mốc thời gian không rơi đều. Đầu tháng nằm ở đâu là ở đó, nên không thể đặt tick cách đều, mà bỏ bớt tick va chạm thì để lại khoảng trống. Cách này đẩy nhãn sang bên thay vì bỏ đi — và **chỉ nhãn dịch**: `x1` vẫn nằm trên giá trị thật, nên vạch tick vẫn chỉ đúng chỗ dù chữ đã né sang.

Đây cũng là lý do `d3-force` nằm trong `dependencies` dù repo này không vẽ đồ thị mạng.

## Kéo trên trục để co giãn thang

`AxisZoomCapture` là một dải trong suốt nằm đè lên trục. Kéo dọc trên trục giá thì giãn giá, kéo ngang trên trục thời gian thì giãn thời gian; nhấp đúp để trả về mặc định là việc của ứng dụng, qua `onDoubleClick`.

Phép toán chỉ có một câu: **hai đầu của range dịch cùng một lượng, ngược chiều nhau**. Nên giữa trục đứng yên trong lúc kéo, còn domain được đọc lại từ thang cũ ở đúng hai chỗ mới ấy — kéo vào giữa thì hai đầu xích lại, khoảng nhìn hẹp đi, chart phóng to; kéo ra xa thì ngược lại. Kéo quá tay đến mức hai đầu vượt qua nhau thì phép kéo bị **từ chối** thay vì cho trục lộn ngược.

Trong bản port đây là một phần tử riêng, `<chart-axis-zoom-capture>`, do `XAxis`/`YAxis` tự dựng ra — nội bộ, không nằm trong barrel, đúng như bản gốc. Nó là thứ duy nhất trong thư viện vừa vẽ canvas (phần trục) vừa đặt một node SVG bắt chuột, nên nó cần cả hai kiểu bằng chứng:

| chứng minh cái gì | bằng cách nào |
|---|---|
| domain mới sau một cú kéo | so số với `handleDrag` của chính bản gốc — 20 giá trị |
| cái rect vô hình | so cây SVG, 5 dáng — vị trí, kích thước, lớp con trỏ |
| kéo thật có đổi chart không | 17 khẳng định trong Chromium thật |

Bên bản gốc phép toán nằm trong `handleDrag`, một thuộc tính riêng của instance. Bộ kiểm gọi thẳng nó với `ref` và `state` bơm vào bằng tay thay cho React, nên con số đem so là con số bản gốc tự tính — không phải công thức chép lại.

Đã kiểm rằng bộ này biết fail — sửa hỏng 12 chỗ, bắt được 12/12:

| sửa hỏng chỗ nào | bắt ở đâu |
|---|---|
| đảo chiều giãn | golden, 20 giá trị |
| hai đầu vào của `getMouseDelta` đổi chỗ | golden, 20 giá trị |
| neo vào đầu trục thay vì giữa trục | golden, 11 giá trị |
| vùng bắt chuột hiện ra thay vì trong suốt | golden, 5 giá trị |
| cho phép trục lộn ngược | golden, 2 giá trị |
| con trỏ không đổi khi đang kéo | golden, 1 giá trị |
| trục không báo domain mới lên chart (x, y) | trình duyệt |
| bỏ qua `zoomEnabled` | trình duyệt |
| nhấp đúp tính cả sau khi kéo | trình duyệt |
| không nhớ là đã kéo | trình duyệt |
| trục giá dùng nhầm thang x | trình duyệt |

### Một chỗ cố ý khác bản gốc: kéo bằng ngón tay

Bản gốc đưa thẳng `TouchEvent` vào `pointer()` của d3, mà hàm ấy đọc `event.clientX` — một TouchEvent không có thuộc tính đó, nên toạ độ ra `NaN` và **kéo trục bằng ngón tay không bao giờ chạy**. Bản port lấy `event.touches[0]`. Một dòng, và nó là khác biệt duy nhất về hành vi.

### Và một chỗ giữ nguyên vì có lý

Trục giá chỉ kéo được khi pane cho phép (`yPan`). Nếu không, kéo sẽ đổi domain rồi khung hình sau lại tính lại về chỗ cũ, và trục giật ngược lại — bản gốc chặn đúng chỗ ấy, bản port giữ nguyên.

## Export chỉ-kiểu (2)

`XAxisProps`, `YAxisProps` — không tồn tại khi chạy. Đã dùng làm nguồn tra cứu khi đặt tên property.

## Lệch có chủ ý so với bản gốc

| chỗ nào | bản gốc | ở đây | vì sao |
|---|---|---|---|
| lớp CSS mặc định | `react-financial-charts-x-axis`… | không đặt | tên nhắc tới React trong một bản không có React; lớp con trỏ đã đổi thành `chart-*` từ bậc 2 |
| `tickHelper` | hàm nội bộ, không export | export | nó là thứ duy nhất tính ra vị trí tick, đáng để chạm tới được |
| `Axis` | là component | là hàm `drawAxis` cộng phần tử riêng | tách phần vẽ khỏi phần tử để kiểm được ngoài trình duyệt — xem [`series.md`](series.md) |
