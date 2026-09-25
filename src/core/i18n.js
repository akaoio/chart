import { timeFormatLocale } from "d3-time-format"

/**
 * Mọi chữ biểu đồ tự nói, với câu tiếng Anh mặc định — và KHÔNG một bản dịch nào.
 *
 * Gói này được nhiều ứng dụng dùng, mỗi ứng dụng một bộ ngôn ngữ riêng. Nếu biểu đồ tự
 * mang bản dịch thì nó phải chọn trước những ngôn ngữ nào được hỗ trợ, và mọi ứng dụng có
 * một ngôn ngữ ngoài bộ ấy đều thiếu. Nên việc chia đôi rõ ràng: biểu đồ KHAI những gì nó
 * nói (danh mục này), ứng dụng DỊCH (thuộc tính `dictionary` của `<chart-canvas>`).
 *
 * Danh mục được xuất ra để ứng dụng đọc được — biết phải dịch những khoá nào, và một cổng
 * bên ứng dụng có thể suy ra danh sách khoá từ chính nó thay vì chép lại.
 *
 * Đo 2026-09-25 trước khi có tệp này: 44 công cụ vẽ nói "Click to select object", ba nói
 * "Click and drag the edge circles", bảy tooltip nói "n/a", và chữ mặc định của Signpost,
 * Callout, Note, Comment, Alert, Image, Anchored text/note đều là tiếng Anh viết cứng.
 */
export const dictionary = Object.freeze({
    selectObject: "Click to select object",
    dragEdgeCircles: "Click and drag the edge circles",
    notAvailable: "n/a",
    open: "O",
    high: "H",
    low: "L",
    close: "C",
    signal: "Signal",
    divergence: "Divergence",
    riskReward: "R/R",
    signpost: "Signpost",
    callout: "Callout",
    note: "Note",
    comment: "Comment",
    anchoredText: "Anchored text",
    anchoredNote: "Anchored note",
    image: "Image",
    alert: "Alert",
    sampleText: "Lorem ipsum...",
    bars: "{count} bars",
})

/**
 * Một chữ của danh mục, CHƯA nói — thứ đặt vào giá trị mặc định của một phần tử.
 *
 * Giá trị mặc định được định nghĩa lúc nạp module, khi chưa có biểu đồ nào và chưa có từ
 * điển nào; câu chữ thì phải chọn lúc vẽ (hoặc lúc tạo đối tượng), theo từ điển của canvas
 * mà phần tử thuộc về. Nên mặc định giữ KHOÁ, và `spoken` nói nó ra ở đúng chỗ. Ứng dụng tự
 * đặt một chuỗi thì chuỗi ấy được giữ nguyên — `spoken` chỉ nói những gì là `word(...)`.
 */
export const word = key => Object.freeze({ key })

/** Nói một giá trị: `word(...)` thành câu theo từ điển, còn lại giữ nguyên. */
export const spoken = (value, host, values) =>
    value !== null && typeof value === "object" && typeof value.key === "string" ? say(host, value.key, values) : value

/**
 * Từ điển của canvas mà một phần tử thuộc về. Phần tử con nằm trong light DOM của
 * `<chart-canvas>`, nên canvas GẦN NHẤT là của nó — kể cả khi biểu đồ lồng nhau.
 */
export const dictionaryOf = element => element?.closest?.("chart-canvas")?.dictionary

const HOLE = /\{(\w+)\}/g

/**
 * Một khoá, nói bằng từ điển của ứng dụng — hoặc bằng câu tiếng Anh của danh mục khi ứng
 * dụng không có câu cho khoá ấy.
 *
 * `host` là thứ ứng dụng trao cho `<chart-canvas>`: một HÀM `(key, values) => string` (ứng
 * dụng đã có cửa từ điển của mình thì trao thẳng nó) hoặc một OBJECT `{ key: string }` (ứng
 * dụng chỉ có một tệp JSON mỗi ngôn ngữ). Một câu trả lời rỗng, không phải chuỗi, hoặc
 * chính là cái khoá — cách nhiều cửa từ điển nói "không có" — đều tính là không có, để một
 * khoá thiếu hiện ra bằng tiếng Anh chứ không bằng tên khoá.
 *
 * Lỗ `{name}` trong câu được lấp từ `values`; lỗ không ai lấp thì để nguyên cho thấy được.
 */
export function say(host, key, values) {
    const own = typeof host === "function" ? host(key, values) : host?.[key]
    const said = typeof own === "string" && own !== "" && own !== key ? own : (dictionary[key] ?? key)
    return values === undefined ? said : said.replace(HOLE, (whole, name) => values[name] ?? whole)
}

/**
 * Quy ước viết số của một locale, hỏi `Intl` — không có bảng nào ở đây, nên mọi locale
 * trình duyệt biết thì biểu đồ biết.
 */
const numberConventions = new Map()
function conventionOf(locale) {
    if (numberConventions.has(locale)) return numberConventions.get(locale)
    const parts = new Intl.NumberFormat(locale, {
        useGrouping: true,
    }).formatToParts(-1234567.5)
    const integers = parts.filter(part => part.type === "integer").map(part => part.value)
    // Cỡ nhóm đọc từ chính con số: "12,34,567" (hi) cho [3, 2], "1.234.567" (de) cho [3].
    const sizes = integers.slice(1).map(group => group.length)
    const numerals = new Intl.NumberFormat(locale, { useGrouping: false }).format(1234567890).split("")
    const convention = {
        decimal: parts.find(part => part.type === "decimal")?.value ?? ".",
        group: parts.find(part => part.type === "group")?.value ?? ",",
        minus: parts.find(part => part.type === "minusSign")?.value ?? "-",
        first: sizes.at(-1) ?? 3,
        rest: sizes.length > 1 ? sizes[0] : (sizes.at(-1) ?? 3),
        // "1234567890" theo thứ tự ấy: vị trí 9 là chữ số 0, vị trí 0..8 là 1..9.
        digits: [numerals[9], ...numerals.slice(0, 9)],
    }
    numberConventions.set(locale, convention)
    return convention
}

function regroup(integer, { group, first, rest }) {
    if (integer.length <= first) return integer
    const tail = integer.slice(-first)
    let head = integer.slice(0, -first)
    const groups = []
    while (head.length > rest) {
        groups.unshift(head.slice(-rest))
        head = head.slice(0, -rest)
    }
    if (head) groups.unshift(head)
    return [...groups, tail].join(group)
}

// Một con số viết theo mặc định của d3 và của toFixed: dấu trừ (d3 dùng U+2212), phần
// nguyên có thể nhóm bằng dấu phẩy, phần thập phân sau dấu chấm.
const NUMBER = /([-−]?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?/g

/**
 * Viết lại mọi con số trong một chuỗi theo quy ước của `locale`.
 *
 * Chuỗi vào là thứ d3 và `toFixed` sinh ra — luôn theo kiểu en-US, vì mặc định của d3-format
 * là en-US và toFixed không biết locale. Thay vì đổi mặc định TOÀN CỤC của d3 (một biểu đồ
 * tiếng Đức sẽ kéo cả biểu đồ tiếng Nhật trên cùng trang theo), mỗi biểu đồ viết lại đầu ra
 * của chính nó: dấu thập phân, dấu nhóm, cỡ nhóm, dấu trừ và bộ chữ số. Nhóm chỉ được đặt
 * lại ở chỗ đầu vào ĐÃ nhóm, nên ".2f" vẫn không nhóm, đúng như người viết định dạng muốn.
 *
 * Không có `locale` thì chuỗi đi qua nguyên vẹn — đó là điều giữ 41 881 giá trị so với bản
 * gốc đứng yên.
 */
export function localize(text, locale) {
    if (!locale || typeof text !== "string") return text
    const convention = conventionOf(locale)
    const digits = value => value.replace(/\d/g, digit => convention.digits[digit])
    return text.replace(NUMBER, (whole, sign, integer, fraction = "") => {
        const grouped = integer.includes(",") ? regroup(integer.replaceAll(",", ""), convention) : integer
        const decimals = fraction ? convention.decimal + fraction.slice(1) : ""
        return (sign ? convention.minus : "") + digits(grouped) + digits(decimals)
    })
}

/** Một bộ định dạng số (d3 hoặc bất kỳ hàm nào trả chuỗi), nói theo `locale`. */
export const localized = (formatter, locale) => (locale ? value => localize(formatter(value), locale) : formatter)

/**
 * Các prop đã điền mặc định của một thành phần, NÓI RA theo canvas của nó.
 *
 * Mọi thành phần vẽ theo cùng một khuôn — `render(moreProps, props)` sau `withDefaults` — và
 * hai thứ trong đó phụ thuộc ngôn ngữ, nhận ra được bằng HÌNH DẠNG chứ không bằng danh sách:
 * một hàm tên bắt đầu bằng `format` hoặc kết thúc bằng `Format` sinh chữ số (bọc bằng
 * `localized`), và một giá trị là `word(...)` (nói bằng `spoken`, kể cả khi nó nằm trong một
 * object như `displayTexts`).
 *
 * Chỉ bọc hàm định dạng MẶC ĐỊNH của biểu đồ — thứ còn bằng đúng giá trị trong `defaults`.
 * `localize` đọc đầu vào như số kiểu en-US, nên bọc một hàm ỨNG DỤNG đã tự định dạng theo
 * ngôn ngữ của nó ("1.234,5") sẽ viết lại sai. Hàm của ứng dụng là lời của ứng dụng.
 *
 * Thành phần nhận `locale` và `dictionary` từ canvas qua chính `props` này; không có hai
 * thứ ấy thì hàm định dạng đi qua nguyên vẹn và chữ nói bằng tiếng Anh của danh mục.
 */
export function speakProps(resolved, defaults = {}) {
    const { locale, dictionary: host } = resolved
    const speak = value =>
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value.key !== "string" &&
        Object.getPrototypeOf(value) === Object.prototype
            ? Object.fromEntries(Object.entries(value).map(([name, inner]) => [name, spoken(inner, host)]))
            : spoken(value, host)
    const out = {}
    for (const [name, value] of Object.entries(resolved))
        out[name] =
            typeof value === "function" && FORMATTER.test(name) ? own(value, defaults[name], locale) : speak(value)
    return out
}

const FORMATTER = /^format|Format$/

/** Một hàm định dạng: nói theo `locale` nếu nó còn là MẶC ĐỊNH của biểu đồ, còn không thì giữ nguyên. */
export const own = (formatter, fallback, locale) => (formatter === fallback ? localized(formatter, locale) : formatter)

/** Locale của canvas mà một phần tử thuộc về — cùng con đường với `dictionaryOf`. */
export const localeOf = element => element?.closest?.("chart-canvas")?.locale

/**
 * Một khoảng thời gian ở đơn vị lớn nhất còn ≥ 1 — "3d", "5h", "12m" như bản gốc — nói theo
 * `locale` bằng đơn vị hẹp của `Intl`: tiếng Anh vẫn "3d", tiếng Đức "3 T", tiếng Trung "3天",
 * tiếng Việt "3 ngày" (đo trên ICU của Node 24, 2026-09-25 — và tiếng Nhật cũng "3d": CLDR
 * chọn thế, nên đó là câu trả lời của locale ấy, không phải một lỗ).
 */
export function durationIn(locale, milliseconds) {
    const days = milliseconds / 86_400_000
    const hours = milliseconds / 3_600_000
    const [unit, amount] =
        Math.abs(days) >= 1
            ? ["day", Math.round(days)]
            : Math.abs(hours) >= 1
              ? ["hour", Math.round(hours)]
              : ["minute", Math.round(milliseconds / 60_000)]
    return new Intl.NumberFormat(locale, {
        style: "unit",
        unit,
        unitDisplay: "narrow",
    }).format(amount)
}

/**
 * Một công cụ đo, nói theo canvas: giá và phần trăm MẶC ĐỊNH của nó theo `locale`, khoảng
 * thời gian mặc định bằng `durationIn`, và hàm ứng dụng tự đưa thì để nguyên.
 */
export const measuring = (resolved, defaults) => ({
    ...resolved,
    formatPrice: own(resolved.formatPrice, defaults.formatPrice, resolved.locale),
    formatPercent: own(resolved.formatPercent, defaults.formatPercent, resolved.locale),
    formatDuration:
        resolved.formatDuration === defaults.formatDuration && resolved.locale
            ? milliseconds => durationIn(resolved.locale, milliseconds)
            : resolved.formatDuration,
})

const timeLocales = new Map()

/**
 * Bộ định dạng ngày của d3 cho một locale, dựng từ `Intl` — tên tháng, tên thứ, sáng/chiều.
 *
 * `timeFormatDefaultLocale` của d3 đổi locale cho CẢ tiến trình; hai biểu đồ hai ngôn ngữ
 * trên một trang thì cái sau đè cái trước. Bộ này thuộc về từng locale và không đụng gì
 * toàn cục. Chữ số trong ngày ("15", "2023") đi qua `localize` như mọi con số khác.
 */
export function timeFormatFor(locale) {
    if (!locale) return undefined
    if (timeLocales.has(locale)) return timeLocales.get(locale)
    const on = (options, dates) =>
        dates.map(date => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...options }).format(date))
    // 2023-01-01 là Chủ nhật: bảy ngày từ đó cho đúng thứ tự Sunday..Saturday d3 cần.
    const week = Array.from({ length: 7 }, (_, day) => new Date(Date.UTC(2023, 0, 1 + day)))
    const year = Array.from({ length: 12 }, (_, month) => new Date(Date.UTC(2023, month, 15)))
    const periodOf = hour =>
        new Intl.DateTimeFormat(locale, {
            hour: "numeric",
            hour12: true,
            timeZone: "UTC",
        })
            .formatToParts(new Date(Date.UTC(2023, 0, 1, hour)))
            .find(part => part.type === "dayPeriod")?.value ?? (hour < 12 ? "AM" : "PM")
    const d3Locale = timeFormatLocale({
        dateTime: "%x, %X",
        date: "%-m/%-d/%Y",
        time: "%-I:%M:%S %p",
        periods: [periodOf(9), periodOf(21)],
        days: on({ weekday: "long" }, week),
        shortDays: on({ weekday: "short" }, week),
        months: on({ month: "long" }, year),
        shortMonths: on({ month: "short" }, year),
    })
    const format = specifier => localized(d3Locale.format(specifier), locale)
    timeLocales.set(locale, format)
    return format
}
