# parity: `interactive`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/interactive/src`. Port ở **bậc 6** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (18) — đã làm **11**

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
| `Brush` | `Brush.tsx` | ☐ | |
| `EquidistantChannel` | `EquidistantChannel.tsx` | ☐ | |
| `FibonacciRetracement` | `FibonacciRetracement.tsx` | ☐ | |
| `GannFan` | `GannFan.tsx` | ☐ | |
| `InteractiveText` | `InteractiveText.tsx` | ☐ | |
| `InteractiveYCoordinate` | `InteractiveYCoordinate.tsx` | ☐ | |
| `StandardDeviationChannel` | `StandardDeviationChannel.tsx` | ☐ | |
| `TrendLine` | `TrendLine.tsx` | ☑ | 22 khẳng định trong trình duyệt: vẽ, cửa chặn, kéo cả đường |

Nội bộ đã port: `components/InteractiveStraightLine` — hình học của đường thẳng, nền của trendline, kênh giá và quạt Gann.

**Bậc 6 chưa xong.** 11 trong 18 export đã port. `TrendLine` là công cụ vẽ tay đầu tiên chạy đủ vòng — và quan trọng hơn, **bộ máy chứng minh tương tác đã dựng xong**, nên 7 công cụ còn lại đi theo đúng khuôn đó.

Nội bộ đã port thêm: `ClickableCircle`, `Text`, `HoverTextNearMouse`, `MouseLocationIndicator`, `wrapper/EachTrendLine`.

## Ba tầng, ba cách chứng minh

Nhóm này không đồng nhất như các bậc trước:

| tầng | chứng minh bằng | trạng thái |
|---|---|---|
| hình học và tiện ích | so số, như bậc 1 và 5 | ☑ xong |
| phần vẽ | chuỗi lệnh canvas, như bậc 3 | ☑ cho `InteractiveStraightLine` |
| kéo thả, chọn, sửa | thao tác thật trong trình duyệt | ☑ bộ máy xong, `TrendLine` đã qua |

Tầng thứ ba là thứ golden data không nói được gì. Bộ kiểm cho nó thao tác thật: bấm hai lần để vẽ, bấm mà không di chuột để kiểm cửa chặn, kéo chéo cả đường rồi đọc lại toạ độ báo về.

Đã kiểm rằng nó biết fail:

| sửa hỏng chỗ nào | bài kiểm bắt được |
|---|---|
| bỏ cửa chặn đường dài 0 | vẽ trendline · bấm không di chuột |
| kéo đường bỏ phần dịch ngang | kéo trendline |
| một đầu không đi theo khi kéo | kéo trendline |
| đường không báo "kéo xong" | kéo trendline |
| hook tra không ra gì trên prototype | 3 bài |
| wrapper dựng lại con thay vì tái dùng | kéo trendline |
| bỏ vẽ lại khi đổi property | đổi property thì chart vẽ lại |

Hai dòng cuối chỉ bắt được sau khi thêm bài kiểm: kéo **chéo** thay vì kéo dọc (kéo dọc thì bỏ hẳn phần dịch ngang cũng không lộ), và một bài riêng cho việc đổi property.

**243 giá trị** khớp bản gốc.

Đã kiểm bộ này biết fail — sửa hỏng 9 chỗ, bắt được **9/9**:

| sửa hỏng chỗ nào | số giá trị lệch |
|---|---:|
| đổi nhịp nội suy khi zoom | 10 |
| `getSelected` không lọc | 7 |
| `XLINE` bỏ xét chiều vẽ | 4 |
| bỏ nhánh đường thẳng đứng khỏi `getSlope` | 3 |
| `ZoomButtons` sai vị trí nút | 3 |
| `RAY` luôn kéo sang phải | 2 |
| `getValueFromOverride` bỏ so index | 1 |
| `getMorePropsForChart` bỏ trừ origin pane | 1 |
| bỏ chặn ngoài đầu mút khi xét hover | 1 |

## Chỗ đáng nói: `LINE`, `RAY`, `XLINE`

Một trendline vẽ trên hai cây nến thường có ý kéo dài. Nên đường thẳng có ba kiểu: `LINE` dừng ở hai điểm, `RAY` chạy từ điểm đầu tới mép chart, `XLINE` cắt ngang cả hai chiều.

Hệ quả: hai kiểu sau **phải tính lại mỗi khi domain đổi** — chúng bám vào mép khung nhìn chứ không vào dữ liệu. Đó cũng là lý do hai mutation "bỏ xét chiều vẽ" và "luôn kéo sang phải" chỉ lệch vài giá trị mà vẫn phải bắt: sai chiều thì đường vẫn vẽ, chỉ là kéo dài về phía ngược lại.

## Ba lỗi trong khung, tìm ra nhờ công cụ vẽ tay đầu tiên

Không lỗi nào lộ ra ở năm bậc trước, vì trước đó chưa có gì vừa nhận sự kiện vừa tự dựng lại con.

**1. Property của phần tử che mất hook của khung.** `GenericComponent` gọi `this.onClick(...)`; một component vừa nhận *property* `onClick` vừa định nghĩa *hook* `onClick` thì property — vốn là own property — che mất method trên prototype. Kết quả: hook thành mã chết, và callback của người dùng bị gọi sai chữ ký.

Sửa tận gốc: hook được tra trên **chuỗi prototype**, bỏ qua own property. Property là dữ liệu component đọc, hook là hành vi khung gọi — hai thứ khác nhau và giờ không thể lẫn. Đổi lại, component phải **nối chúng một cách tường minh** (`onHover(e, mp) { this.#props.onHover?.(e, mp) }`), mà đọc mã là thấy ngay cái nào gọi cái nào.

**2. Dựng lại phần tử con làm mất trạng thái đang có.** Wrapper dựng lại toàn bộ con mỗi lần đổi trạng thái. Nhưng hover và drag *sống trên chính những phần tử ấy* — nên thay phần tử giữa chừng là vứt đi đúng cái trạng thái mà thao tác đang cần: đường quên mất nó đang được hover ngay khoảnh khắc nó được hover, và không bao giờ kéo được.

React giữ nguyên instance qua các lần render. Bản port giờ làm y như vậy bằng tay: tạo con một lần, sau đó chỉ cập nhật property.

**3. Mỗi lần ghi property là một lần vẽ lại cả chart.** Cấu hình một phần tử nghĩa là ghi cả chục property liên tiếp; vẽ lại từng lần là vẽ lại cả chục lần, và lần đầu tiên rơi vào lúc chart chưa kịp tính ra nó đang hiển thị cái gì — nổ. Giờ gom vào một microtask.

## Còn thiếu, và vì sao

7 export còn lại đều là **công cụ vẽ tay có trạng thái**: người dùng bấm, kéo, thả, chọn, sửa. Chúng dựa trên hai tầng chưa port:

- `wrapper/` (1.717 dòng, 5 file `Each*`) — mỗi đối tượng đã vẽ được bọc trong một wrapper lo việc kéo từng đầu mút, hiện chốt điều khiển khi được chọn, và ghi đè toạ độ trong lúc kéo.
- phần còn lại của `components/` (1.297 dòng) — `ChannelWithArea`, `ClickableCircle`, `ClickableShape`, `HoverTextNearMouse`, `MouseLocationIndicator`, `GannFan`, `LinearRegressionChannelWithArea`, `InteractiveText`, `InteractiveYCoordinate`, `Text`.

Bộ máy chứng minh đã có, khuôn chuyển đổi đã chạy đủ vòng với `TrendLine` — phần còn lại là lặp lại khuôn ấy cho từng hình dạng: kênh giá song song, quạt Gann, dải Fibonacci, hộp brush, nhãn, đường giá.
