# parity: `annotations`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/annotations/src`. Port ở **bậc 4** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (5) — đã làm **5**

| export | file nguồn | tt | bằng chứng |
|---|---|:--:|---|
| `Annotate` | `Annotate.tsx` | ☑ | 3 bài, mỗi bài một loại hình đánh dấu |
| `LabelAnnotation` | `LabelAnnotation.tsx` | ☑ | qua `Annotate` |
| `SvgPathAnnotation` | `SvgPathAnnotation.tsx` | ☑ | qua `Annotate` |
| `BarAnnotation` | `BarAnnotation.tsx` | ☑ | qua `Annotate`, có cả chữ, icon xoay và hình |
| `Label` | `Label.tsx` | ☑ | 2 bài chuỗi lệnh canvas, có và không xoay |

## Chỗ đáng nói

`Annotate` nhận một **vị từ** (`when`) chứ không nhận danh sách điểm cần đánh dấu. Nghĩa là "đánh dấu mọi phiên nhảy giá" viết được trong một dòng, và nó tính lại khi chart trượt — dấu hiện ra rồi biến mất theo dữ liệu, thay vì cũ đi.

`Label` là thứ duy nhất trong nhóm vẽ lên canvas, và nó đăng ký `drawOn: []` — vẽ một lần rồi nằm yên trên lớp nền trong khi mọi thứ phía trên vẽ lại. Đó là cách một watermark không tốn gì cả khi người dùng kéo chart.

## Bằng chứng biết fail

Bỏ phép xoay icon trong `BarAnnotation` → 4 giá trị lệch. Phép thử này ban đầu **không bắt được**, không phải vì bộ kiểm yếu mà vì dữ liệu kiểm không hề đặt `textIconRotate`. Đã thêm.

## Lệch có chủ ý so với bản gốc

| chỗ nào | bản gốc | ở đây | vì sao |
|---|---|---|---|
| prop `with` của `Annotate` | một React component | một hàm dựng mô tả SVG | cùng vai trò, chỉ khác hình dạng thứ được truyền — bản port không có component để truyền |
| tên lớp CSS | `react-financial-charts-*` | `chart-*` | đồng bộ với bậc 2, 3 và `tooltip` |
