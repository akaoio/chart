# parity: `tooltip`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/tooltip/src`. Port ở **bậc 4** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (13) — đã làm **13**

| export | file nguồn | tt | bằng chứng |
|---|---|:--:|---|
| `ToolTipText` | `ToolTipText.tsx` | ☑ | dùng trong mọi bài tooltip |
| `ToolTipTSpanLabel` | `ToolTipTSpanLabel.tsx` | ☑ | |
| `SingleValueTooltip` | `SingleValueTooltip.tsx` | ☑ | 5 bài, gồm cả khi con trỏ ở nơi khác và `origin` là hàm |
| `OHLCTooltip` | `OHLCTooltip.tsx` | ☑ | 4 bài, gồm cả khi không có dữ liệu |
| `RSITooltip` | `RSITooltip.tsx` | ☑ | 2 bài |
| `BollingerBandTooltip` | `BollingerBandTooltip.tsx` | ☑ | 1 bài |
| `MACDTooltip` | `MACDTooltip.tsx` | ☑ | 1 bài |
| `StochasticTooltip` | `StochasticTooltip.tsx` | ☑ | 1 bài |
| `MovingAverageTooltip` | `MovingAverageTooltip.tsx` | ☑ | 1 bài, hai đường trung bình |
| `SingleMAToolTip` | `MovingAverageTooltip.tsx` | ☑ | qua `MovingAverageTooltip` |
| `GroupTooltip` | `GroupTooltip.tsx` | ☑ | 6 bài — đủ 5 layout, cộng neo góc |
| `SingleTooltip` | `SingleTooltip.tsx` | ☑ | qua `GroupTooltip`, đủ 5 layout |
| `HoverTooltip` | `HoverTooltip.tsx` | ☑ | 2 bài chuỗi lệnh canvas, gồm cả khi hộp phải lật sang bên kia |

## Cách chứng minh thứ hai: so cây SVG

`HoverTooltip` vẽ lên canvas, nhưng **12 cái còn lại thì không** — chúng trả về node SVG, để chữ trong tooltip là chữ thật: bôi đen được, đọc màn hình đọc được, CSS chỉnh được. Chuỗi lệnh canvas không nói gì về chúng.

Nên bậc 4 dựng thêm `tools/golden/svgtree.mjs`: quy cây SVG về `{ tag, attrs, children }` rồi so. Vẫn đúng nguyên tắc cũ — **một hàm quy chuẩn duy nhất nhận cả React element lẫn mô tả của bản port**, không có hai bộ luật để lệch nhau. Tên thuộc tính quy về dạng DOM (`strokeWidth` → `stroke-width`, `className` → `class`).

**878 giá trị** trong cây SVG khớp bản gốc.

Đã kiểm bộ này biết fail: cho `MovingAverageTooltip` xếp mọi mục chồng lên nhau → bắt được; cho `GroupTooltip` sai giãn cách `verticalRows` → bắt được.

## Chỗ tưởng giống mà không giống

JSX viết `{yLabel}: ` sinh ra **hai** node văn bản rời (`"Mở"` và `": "`), không phải một chuỗi `"Mở: "`. Trên màn hình y hệt nhau; trong cây DOM thì khác, và cây mới là thứ được so. Bản port phải chia y như vậy — ở `SingleTooltip` và `MACDTooltip`.

Nghe như tiểu tiết, nhưng nó là loại khác biệt mà so ảnh không bao giờ thấy, còn CSS nhắm vào `tspan:first-child` thì thấy ngay.

## Lệch có chủ ý so với bản gốc

| chỗ nào | bản gốc | ở đây | vì sao |
|---|---|---|---|
| tên lớp CSS | `react-financial-charts-*` | `chart-*` | tên cũ nhắc tới React trong thư viện không có React; đồng bộ với bậc 2 và 3. Bộ kiểm quy chuẩn phép đổi tiền tố này cho **cả hai phía**, nên mọi khác biệt tên lớp ngoài đúng phép ấy vẫn lộ ra |
| `SingleTooltip`, `SingleMAToolTip` | là component | là hàm dựng mô tả | chúng chỉ là mảnh ghép bên trong `GroupTooltip` và `MovingAverageTooltip`, không ai dựng trực tiếp |
