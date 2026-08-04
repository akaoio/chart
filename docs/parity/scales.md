# parity: `scales`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/scales/src`. Port ở **bậc 1** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

Một dòng chỉ được đánh ☑ khi đã có bằng chứng kèm theo — test số học, hoặc ảnh so sánh với story tương ứng của bản gốc. Đánh dấu xong mà không có bằng chứng là nói dối.

## Export runtime (5)

| export | loại | file nguồn | tt | ghi chú |
|---|---|---|:--:|---|
| `defaultScaleProvider` | const | `index.ts` | ☑ | golden: `misc.defaultScaleProvider` |
| `discontinuousTimeScaleProvider` | default | `discontinuousTimeScaleProvider.ts` | ☑ | thể dựng sẵn của builder; golden phủ qua `provider.*` |
| `discontinuousTimeScaleProviderBuilder` | function | `discontinuousTimeScaleProvider.ts` | ☑ | golden: 4 bộ dữ liệu × 4 thang thời gian, cộng `utc`, `initialIndex`, `withIndex`, `indexCalculator`, getter |
| `financeDiscontinuousScale` | default | `financeDiscontinuousScale.ts` | ☑ | golden: `scale.*` — domain, range, clamp, invert, ticks ở 5 mật độ, tickFormat, value, nice, copy |
| `timeFormat` | const | `timeFormat.ts` | ☑ | golden: 10 mốc nằm hai bên mọi ngưỡng |

Cả `levels.ts` (không export ra ngoài package) cũng được port đủ: `defaultFormatters` và toàn bộ 23 mức của `levelDefinition`.

## Bằng chứng

`npm test` chạy **1.428 giá trị** của bộ này, so với kết quả sinh từ chính mã nguồn bản gốc (`tools/golden/fixtures/scales.json`, nguồn @ `745c7c0`).

Đã kiểm rằng bộ test này **biết fail**, bằng cách sửa hỏng bản port rồi xem nó có bắt không:

| sửa hỏng chỗ nào | số giá trị lệch |
|---|---:|
| `invert` làm tròn 3 chữ số thay vì 4 | 4 |
| mức 15 đổi `i % 2` thành `i % 3` | 13 |
| `startOfWeek` dùng `!==` thay cho `<` | 130 |
| đổi `shift()` thành `splice(0,1)` — tương đương thật | 0 |

Dòng cuối cũng quan trọng như ba dòng trên: một bộ test bắt cả những thay đổi không đổi hành vi thì cũng vô dụng theo kiểu khác.

## Chưa có bằng chứng

`setLocale` **đã port nhưng chưa golden**. Nó gọi `timeFormatDefaultLocale` của d3, thứ thay đổi trạng thái toàn cục của tiến trình — chạy trong cùng một tiến trình với các bài kiểm khác sẽ làm hỏng kết quả của chúng. Cần chạy trong tiến trình con riêng. Ghi vào đây thay vì lặng lẽ bỏ qua.

## Lệch có chủ ý so với bản gốc

_Chưa có._ Bậc 1 port trung thành hoàn toàn, kể cả những chỗ bản gốc không nhất quán (xem dưới).

## Chỗ bản gốc kỳ lạ, cố ý giữ nguyên

**`financeDiscontinuousScale.rangeRound` không nối chuỗi được.** Mọi setter khác (`domain`, `range`, `clamp`, `nice`, `index`) trả về chính scale để `.domain(...).range(...)` chạy được, riêng `rangeRound` trả về scale tuyến tính nền. Golden data ghi lại chỗ này ở `scale.*.returnsSelf.rangeRound === false` để bản port không "sửa" trong im lặng. Sửa hay không là quyết định của bậc 3, khi biết `axes` thật sự dùng nó thế nào.

**`slidingWindow` gọi `windowSize` không tham số.** Bản gốc viết `functor(windowSize).apply(this, arguments)` bên trong một arrow function, nên `arguments` là của hàm nhà máy bao ngoài — luôn rỗng. Truyền `windowSize` là hàm thì hàm đó được gọi *không có tham số nào*, chứ không phải nhận được dữ liệu như đọc lướt sẽ tưởng. Giữ nguyên, có ghi chú trong mã.

**Một calculator dùng chung cho mọi lần gọi.** `discontinuousIndexCalculatorLocalTime` là biến ở tầng module, và `createIndex` cấu hình lại nó (`.source(...).misc(...)`) mỗi lần chạy. An toàn chỉ vì dữ liệu được đẩy qua ngay sau đó. Giữ nguyên ở bậc 1; sẽ xét lại ở bậc 2 khi state phải điều khiển được từ ngoài.
