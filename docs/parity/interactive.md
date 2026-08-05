# parity: `interactive`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/interactive/src`. Port ở **bậc 6** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (18) — đã làm **10**

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
| `TrendLine` | `TrendLine.tsx` | ☐ | |

Nội bộ đã port: `components/InteractiveStraightLine` — hình học của đường thẳng, nền của trendline, kênh giá và quạt Gann.

**Bậc 6 chưa xong.** 10 trong 18 export đã port: toàn bộ tầng tiện ích, cả ba công cụ không-cần-vẽ-tay, và hình học đường thẳng. 8 cái còn lại là các công cụ vẽ tay có trạng thái.

## Ba tầng, ba cách chứng minh

Nhóm này không đồng nhất như các bậc trước:

| tầng | chứng minh bằng | trạng thái |
|---|---|---|
| hình học và tiện ích | so số, như bậc 1 và 5 | ☑ xong |
| phần vẽ | chuỗi lệnh canvas, như bậc 3 | ☑ cho `InteractiveStraightLine` |
| kéo thả, chọn, sửa | chỉ trình duyệt thật trả lời được | ☐ chưa tới |

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

## Còn thiếu, và vì sao

8 export còn lại đều là **công cụ vẽ tay có trạng thái**: người dùng bấm, kéo, thả, chọn, sửa. Chúng dựa trên hai tầng chưa port:

- `wrapper/` (1.717 dòng, 5 file `Each*`) — mỗi đối tượng đã vẽ được bọc trong một wrapper lo việc kéo từng đầu mút, hiện chốt điều khiển khi được chọn, và ghi đè toạ độ trong lúc kéo.
- phần còn lại của `components/` (1.297 dòng) — `ChannelWithArea`, `ClickableCircle`, `ClickableShape`, `HoverTextNearMouse`, `MouseLocationIndicator`, `GannFan`, `LinearRegressionChannelWithArea`, `InteractiveText`, `InteractiveYCoordinate`, `Text`.

Đây là phần duy nhất trong cả dự án mà **golden data không nói được gì**: giá trị của nó nằm ở chuỗi thao tác — bấm chỗ này, kéo tới chỗ kia, thả ra, rồi kéo lại đầu mút. Chứng minh nó cần bộ kiểm trình duyệt, và cần bộ kiểm ấy dựng trước khi port, không phải sau.
