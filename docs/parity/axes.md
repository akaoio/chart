# parity: `axes`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/axes/src`. Port ở **bậc 3** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (3)

| export | loại | file nguồn | tt | bằng chứng |
|---|---|---|:--:|---|
| `Axis` | class | `Axis.tsx` | ☑ | 15 cấu hình, chuỗi lệnh canvas khớp bản gốc từng lệnh một |
| `XAxis` | class | `XAxis.tsx` | ☑ | dựng trong chart thật; trục nằm đúng đáy pane, vẽ ra pixel |
| `YAxis` | class | `YAxis.tsx` | ☑ | dựng trong chart thật; trục nằm đúng mép phải pane |

Tên thẻ: `<chart-x-axis>`, `<chart-y-axis>`. `Axis` không có thẻ riêng — nó là phần vẽ dùng chung, `XAxis`/`YAxis` chỉ tính ra tham số rồi gọi nó, đúng như bản gốc.

## Bằng chứng

Bậc 3 vẽ ra hình, mà hình trên canvas là một **chuỗi lệnh**. Nên thay vì chụp ảnh so pixel, cả bản gốc lẫn bản port cùng vẽ vào một canvas giả rồi so đúng từng lệnh — chính xác hơn so ảnh, và khi lệch thì chỉ ra ngay lệnh thứ mấy chứ không phải "có 37 pixel khác nhau".

15 cấu hình trục được kiểm: trục x dưới, trục x trên, trục y phải, trục y trái, có lưới (cả hai hướng), không tick, `tickValues` chỉ định tay, `tickInterval`, `tickFormat` tuỳ biến, `outerTickSize`, và bốn mật độ tick khác nhau.

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

## Chưa làm

**`AxisZoomCapture` (232 dòng) chưa port.** Đây là phần kéo trên chính trục để co giãn thang: kéo dọc trên trục y thì giãn giá, kéo ngang trên trục x thì giãn thời gian, nhấp đúp thì trả về mặc định.

Hệ quả cụ thể: prop `zoomEnabled` hiện **không có tác dụng**. Trục vẫn vẽ đúng, chart vẫn pan và zoom bằng chuột như thường; chỉ riêng thao tác kéo *trên trục* là chưa có.

Ghi ra đây thay vì để im, vì `zoomEnabled` mặc định là `true` ở cả `XAxis` lẫn `YAxis` — ai đọc API sẽ tưởng nó chạy. Phần nó nối vào (`xAxisZoom`, `yAxisZoom` của `ChartCanvas`) đã có sẵn từ bậc 2; chỗ còn thiếu chỉ là tầng bắt sự kiện trên trục.

## Export chỉ-kiểu (2)

`XAxisProps`, `YAxisProps` — không tồn tại khi chạy. Đã dùng làm nguồn tra cứu khi đặt tên property.

## Lệch có chủ ý so với bản gốc

| chỗ nào | bản gốc | ở đây | vì sao |
|---|---|---|---|
| lớp CSS mặc định | `react-financial-charts-x-axis`… | không đặt | tên nhắc tới React trong một bản không có React; lớp con trỏ đã đổi thành `chart-*` từ bậc 2 |
| `tickHelper` | hàm nội bộ, không export | export | nó là thứ duy nhất tính ra vị trí tick, đáng để chạm tới được |
| `Axis` | là component | là hàm `drawAxis` cộng phần tử riêng | tách phần vẽ khỏi phần tử để kiểm được ngoài trình duyệt — xem [`series.md`](series.md) |
