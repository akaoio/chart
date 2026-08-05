/**
 * Bài kiểm cho `setLocale` — chạy **trong tiến trình riêng**.
 *
 * `setLocale` gọi `timeFormatDefaultLocale` của d3, thứ thay đổi trạng thái toàn cục của
 * cả tiến trình: từ lúc ấy trở đi mọi định dạng thời gian được tạo mới đều ra tiếng khác.
 * Chạy chung với các bài kiểm khác thì nó làm hỏng kết quả của chúng, mà thứ tự chạy lại
 * là chuyện không nên phải nhớ.
 *
 * Nên bộ này bị tách ra: `generate.mjs` và `test.js` đều đẻ một tiến trình con cho riêng
 * nó. Bên trong đây thứ tự vẫn quan trọng — mốc "chưa đổi" phải lấy trước — và đó là lý
 * do mọi thứ nằm trong một hàm `run` chứ không rải ra nhiều bài.
 */

export const name = "locale"

const rows = Array.from({ length: 8 }, (_, index) => ({ date: new Date(Date.UTC(2023, index, 1)) }))

/** Vài mốc đủ để chạm cả nhãn tháng, nhãn ngày và nhãn năm. */
const detailed = [
    new Date(Date.UTC(2023, 0, 1)),
    new Date(Date.UTC(2023, 5, 15)),
    new Date(Date.UTC(2023, 5, 15, 13, 45)),
    new Date(Date.UTC(2024, 0, 1)),
]

/** Tiếng Việt, đủ các trường d3 đòi. */
const vietnamese = {
    dateTime: "%A, %e %B %Y %X",
    date: "%d/%m/%Y",
    time: "%H:%M:%S",
    periods: ["SA", "CH"],
    days: ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"],
    shortDays: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    months: [
        "Tháng một", "Tháng hai", "Tháng ba", "Tháng tư", "Tháng năm", "Tháng sáu",
        "Tháng bảy", "Tháng tám", "Tháng chín", "Tháng mười", "Tháng mười một", "Tháng mười hai",
    ],
    shortMonths: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"],
}

export function run(api) {
    const out = {}

    const provider = () => api.discontinuousTimeScaleProviderBuilder().inputDateAccessor(datum => datum.date)

    /** Nhãn mà trục sẽ in ra cho từng hàng — đây mới là thứ người dùng nhìn thấy. */
    const labels = built => built.data.map(row => row.idx.format(row.idx.date))
    const levels = built => built.data.map(row => row.idx.level)

    // ── trước khi đổi gì ──────────────────────────────────────────────────────────

    out.before = labels(provider()(rows))
    out.levelsBefore = levels(provider()(rows))
    out.detailedBefore = detailed.map(date => labels(provider()([{ date }]))[0])

    // ── đổi ngôn ngữ ──────────────────────────────────────────────────────────────
    //
    // NHÃN sau khi đổi ngôn ngữ **không nằm trong bộ so**, và lý do đã đo chứ không đoán:
    //
    //   repo gốc  d3-time-format 3.0.0 → giải ra bản UMD trong `dist/`
    //   repo này  d3-time-format 4.x   → giải ra bản ESM trong `src/`
    //
    // `timeFormatDefaultLocale` gán lại biến `timeFormat` ở tầng module. Với bản ESM đó
    // là một ràng buộc sống nên chỗ import thấy giá trị mới; với bản UMD nó là một bản
    // chụp nên chỗ import giữ nguyên cái cũ. Cùng một dòng mã, hai kết quả — khác nhau ở
    // *bản dựng của d3*, không phải ở thư viện chart.
    //
    // So chỗ ấy là so hai bản dựng d3 với nhau, không nói lên điều gì về bản port. Cái so
    // được thì vẫn so: giá trị trả về, mức chi tiết, và cả nhánh `formatters` vốn là của
    // riêng từng builder nên không dính trạng thái toàn cục. Xem docs/parity/scales.md.

    const localised = provider()
    out.setLocaleReturnsProvider = localised.setLocale(vietnamese) === localised

    // Mức chi tiết là chuyện của dữ liệu, không phải của ngôn ngữ — phải y nguyên
    out.levelsAfter = levels(provider()(rows))

    // ── đổi luôn bộ định dạng ─────────────────────────────────────────────────────
    //
    // `formatters` là của riêng từng builder, khác `locale` vốn là của cả tiến trình.

    const custom = provider().setLocale(undefined, {
        // Chỉ dùng mã định dạng KHÔNG phụ thuộc ngôn ngữ (`%m` chứ không `%B`), để bài
        // này đo đúng thứ nó định đo: `formatters` là của riêng builder.
        yearFormat: "[%Y]",
        quarterFormat: "[Q %m]",
        monthFormat: "[%m]",
        weekFormat: "[tuần %e]",
        dayFormat: "[ngày %e]",
        hourFormat: "[%H giờ]",
        minuteFormat: "[%H:%M]",
        secondFormat: "[%S giây]",
        milliSecondFormat: "[.%L]",
    })

    // Định dạng tuỳ biến chỉ dùng lại chính các format string, không đụng tới locale —
    // nên chỗ này so được ở cả hai phía.
    out.customFormatters = labels(custom(rows))

    return out
}
