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

`setLocale` **đã golden, trong tiến trình riêng**. Nó gọi `timeFormatDefaultLocale` của d3, thứ đổi trạng thái toàn cục của cả tiến trình, nên chạy chung sẽ làm hỏng bài khác — `generate.mjs` và `test.js` đẻ một tiến trình con cho riêng nó (`tools/golden/cases/locale.mjs`, **37 giá trị**).

Một phần của nó **không so được**, và lý do đã đo chứ không đoán:

| | d3-time-format | giải ra |
|---|---|---|
| repo gốc | 3.0.0 | bản UMD trong `dist/` |
| repo này | 4.x | bản ESM trong `src/` |

`timeFormatDefaultLocale` gán lại biến `timeFormat` ở tầng module. Bản ESM cho một **ràng buộc sống** nên chỗ import thấy giá trị mới; bản UMD chỉ cho một **bản chụp** nên chỗ import giữ nguyên cái cũ. Hệ quả: cùng một dòng mã, `setLocale(locale)` đổi được nhãn ở repo này mà không đổi được ở repo gốc.

Khác biệt nằm ở **bản dựng của d3**, không ở thư viện chart — nên so nhãn sau khi đổi ngôn ngữ là so hai bản dựng d3 với nhau, không nói lên điều gì. Cái so được thì vẫn so: nhãn trước khi đổi, giá trị trả về, mức chi tiết (không được đổi theo ngôn ngữ), và nhánh `formatters` vốn là của riêng từng builder.

Với người dùng gói này thì đây là tin tốt: `setLocale` **có tác dụng**, còn ở bản gốc thì không.

## Lệch có chủ ý so với bản gốc

_Chưa có._ Bậc 1 port trung thành hoàn toàn, kể cả những chỗ bản gốc không nhất quán (xem dưới).

## Chỗ bản gốc kỳ lạ, cố ý giữ nguyên

**`financeDiscontinuousScale.rangeRound` không nối chuỗi được.** Mọi setter khác (`domain`, `range`, `clamp`, `nice`, `index`) trả về chính scale để `.domain(...).range(...)` chạy được, riêng `rangeRound` trả về scale tuyến tính nền. Golden data ghi lại chỗ này ở `scale.*.returnsSelf.rangeRound === false` để bản port không "sửa" trong im lặng. Sửa hay không là quyết định của bậc 3, khi biết `axes` thật sự dùng nó thế nào.

**`slidingWindow` gọi `windowSize` không tham số.** Bản gốc viết `functor(windowSize).apply(this, arguments)` bên trong một arrow function, nên `arguments` là của hàm nhà máy bao ngoài — luôn rỗng. Truyền `windowSize` là hàm thì hàm đó được gọi *không có tham số nào*, chứ không phải nhận được dữ liệu như đọc lướt sẽ tưởng. Giữ nguyên, có ghi chú trong mã.

**Một calculator dùng chung cho mọi lần gọi — đã bỏ.** Bản gốc giữ một `slidingWindow` ở tầng module rồi cấu hình lại nó (`.source(...).misc(...)`) mỗi lần chạy. Nó *tình cờ* an toàn vì dữ liệu được đẩy qua ngay dòng sau, không có gì xen vào — nhưng "tình cờ an toàn" mới là vấn đề: hai chart trong một tiến trình dùng chung đúng cái object ấy.

Bản port dựng một cái mới mỗi lần gọi. Tốn một closure, và mối nguy biến mất hẳn.

Nói cho đủ: **không bài kiểm nào hiện phân biệt được hai cách**, vì trong chính thư viện, hai dòng cấu hình và chạy nằm liền nhau. Đây là bỏ một mối nguy, không phải sửa một lỗi đã quan sát được — ghi đúng như thế thay vì gán cho nó một bằng chứng nó không có.
