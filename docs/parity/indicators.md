# parity: `indicators`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/indicators/src`. Port ở **bậc 5** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (20) — đã làm **20**

| export | tt | bằng chứng |
|---|:--:|---|
| `sma` `ema` `wma` `tma` | ☑ | mỗi cái 3 cấu hình (cửa sổ 10, cửa sổ 20, đổi nguồn) cộng `undefinedLength` |
| `rsi` | ☑ | 2 cửa sổ |
| `atr` | ☑ | có cả phiên **nhảy giá qua đêm** — xem dưới |
| `macd` | ☑ | 2 bộ tham số |
| `bollingerBand` | ☑ | trung bình đơn và trung bình mũ |
| `stochasticOscillator` | ☑ | |
| `elderRay` | ☑ | trung bình đơn và trung bình mũ |
| `forceIndex` | ☑ | |
| `sar` | ☑ | 2 mức gia tốc |
| `change` | ☑ | |
| `compare` | ☑ | |
| `heikinAshi` | ☑ | |
| `kagi` | ☑ | ngưỡng theo ATR và ngưỡng cố định |
| `renko` | ☑ | ATR, cố định, và lấy nguồn từ giá đóng |
| `pointAndFigure` | ☑ | 2 kích thước hộp |
| `algo` | ☑ | một chỉ báo tự định nghĩa chạy đủ vòng |
| `elderImpulse` | ☑ | **đã sửa một lỗi của bản gốc** — xem dưới |
| `defaultOptionsForComputation` | ☑ | so nguyên bộ |
| `defaultOptionsForAppearance` | ☑ | so nguyên bộ, cả hai theme |

## Bằng chứng

Toán thuần, không dính DOM — nên quay lại đúng cách của bậc 1: **so số, tuyệt đối**. Không canvas giả, không cây SVG.

**4.079 giá trị** khớp bản gốc. Ngoài kết quả tính, bộ kiểm còn khoá cả `type()` của từng chỉ báo, vì tooltip và legend đọc nó.

Đã kiểm bộ này biết fail — sửa hỏng 12 chỗ, bắt được **12/12**:

| sửa hỏng chỗ nào | số giá trị lệch |
|---|---:|
| `pointAndFigure` bỏ số hộp đảo chiều | 753 |
| `renko` làm tròn lên số viên | 421 |
| `kagi` bỏ ngưỡng đảo chiều | 330 |
| `ema` sai hệ số làm mượt | 190 |
| `atr` bỏ khoảng hở so với giá đóng cửa trước | 50 |
| `wma` sai trọng số | 42 |
| `tma` bỏ đỉnh tam giác | 42 |
| `rsi` bỏ làm mượt Wilder | 28 |
| `bollinger` bỏ hệ số nhân | 28 |
| `sto` sai mẫu số | 28 |
| `heikinAshi` lấy giá mở từ nến hiện tại | 14 |
| `sar` bỏ trần gia tốc | 2 |

## Dữ liệu kiểm phải có phiên nhảy giá

Dòng `atr` ở trên ban đầu **không bắt được**. Không phải bộ kiểm yếu: dữ liệu sinh ra trôi liên tục, nên cả phiên luôn nằm gọn quanh giá đóng cửa hôm trước, và "true range" luôn đúng bằng cao trừ thấp. Nhánh xét khoảng hở — thứ làm nên chữ "true" trong tên — chưa bao giờ chạy tới.

Thị trường thật thì nhảy: tin ra ngoài giờ, và phiên mở ở một mức khác hẳn. Đã thêm sáu phiên như vậy vào dữ liệu kiểm.

Cùng một bài học lặp lại từ bậc 3 và bậc 4: **dữ liệu kiểm phải khắc nghiệt hơn dữ liệu thật**, nếu không thì mã đúng và mã sai cho ra cùng một kết quả.

## Sửa một lỗi của bản gốc: `elderImpulse` không dựng được

`elderImpulse.ts` viết:

```ts
const base = baseIndicator().type(ALGORITHM_TYPE).stroke(...).fill(undefined);
```

Nhưng `fill()` gọi không tham số là **đọc** giá trị, không phải xoá. Nên `base` thành một chuỗi màu, và `rebind(indicator, base, "id", ...)` ngay dòng dưới ném lỗi.

Hệ quả: `elderImpulse()` của bản gốc **ném lỗi mỗi lần gọi**. Đã kiểm trực tiếp trên mã nguồn bản gốc:

```
bản gốc NỔ: Attempt to rebind id which isn't a function on the source object
```

Đây không phải chuyện thẩm mỹ mà là một export hỏng hoàn toàn, nên "port trung thành" ở đây đồng nghĩa với port một thứ không dùng được. Bản port bỏ hẳn lời gọi `.fill(undefined)` — ý định rõ ràng là "không đặt fill", mà không đặt thì đúng là không gọi.

Vì bản gốc không chạy nên **không có gì để so**: `elderImpulse` không có mặt trong golden data. Bản port thì dựng được và tính ra `"up"`/`"down"`/`"neutral"` như thiết kế.

## Chỗ bản gốc kỳ lạ, cố ý giữ nguyên

**`sar` khai `type()` là `"SMA"`.** Lỗi chép nhầm trong `sar.ts`: `const ALGORITHM_TYPE = "SMA"`. Giữ nguyên, vì `type()` là API công khai và một tooltip hay legend có thể đang đọc nó — đổi lặng lẽ sẽ đổi nhãn trên chart của người khác. Golden data khoá chặt chỗ này.

## Lệch có chủ ý so với bản gốc

Bản gốc chép lại `slidingWindow`, `zipper`, `functor`, `path`, `identity` sang `indicators/src/utils/` — bản sao gần như y hệt của `core/src/utils/`. Ở đây chúng dùng chung, chỉ `rebind`, `merge` và `mappedSlidingWindow` là riêng của nhóm này.
