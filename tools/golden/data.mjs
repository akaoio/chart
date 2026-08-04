/**
 * Dữ liệu đầu vào cho golden data.
 *
 * Mọi thứ ở đây phải tất định tuyệt đối: không `Date.now()`, không `Math.random()`,
 * không `Math.sin` (độ chính xác tuỳ engine). Chỉ số nguyên và phép chia.
 *
 * Múi giờ cũng là đầu vào, không phải chuyện vặt: bản gốc tính mốc thời gian bằng
 * `getHours`/`getDay`/`getMonth` — toàn giờ địa phương. Chạy ở múi khác ra kết quả khác.
 * Cả bên sinh lẫn bên so đều bị ép TZ=UTC.
 */

/** MINSTD. Tích lớn nhất ~1.03e14, dưới 2^53 nên không mất bit ở bất kỳ engine nào. */
const random = seed => {
    let state = seed
    return () => (state = (state * 48271) % 2147483647) / 2147483647
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const series = (start, step, count, { skipWeekends = false } = {}) => {
    const next = random(42)
    const out = []
    let close = 100
    for (let i = 0; out.length < count; i++) {
        const date = new Date(start + i * step)
        if (skipWeekends && (date.getUTCDay() === 0 || date.getUTCDay() === 6)) continue

        const open = close
        const drift = (next() - 0.5) * 4
        close = Math.round((open + drift) * 100) / 100
        const high = Math.round((Math.max(open, close) + next() * 2) * 100) / 100
        const low = Math.round((Math.min(open, close) - next() * 2) * 100) / 100
        out.push({ date, open, high, low, close, volume: Math.round(next() * 1e6) })
    }
    return out
}

/** Bốn thang thời gian khác nhau, để ép levelDefinition chạy vào các nhánh khác nhau. */
export const datasets = {
    /** Ngày, có nghỉ cuối tuần — chỗ tính không liên tục thể hiện rõ nhất. */
    daily: series(Date.UTC(2023, 0, 2), DAY, 260, { skipWeekends: true }),

    /** Tháng, trải 5 năm — chạm mốc quý và năm. */
    monthly: series(Date.UTC(2019, 0, 1), 30 * DAY, 62),

    /** 5 phút trong một phiên — chạm mốc phút, 5/15/30 phút, giờ. */
    intraday: series(Date.UTC(2023, 5, 15, 9, 30), 5 * MINUTE, 300),

    /** Giây — chạm các mốc dưới phút, phần hiếm khi được chạy tới nhất. */
    seconds: series(Date.UTC(2023, 5, 15, 14, 0), SECOND, 180),
}

/** Ngày nằm ngay hai bên mỗi ngưỡng của timeFormat. */
export const instants = [
    Date.UTC(2023, 0, 1),
    Date.UTC(2023, 0, 1) + 7,
    Date.UTC(2023, 0, 1, 0, 0, 30),
    Date.UTC(2023, 0, 1, 0, 45),
    Date.UTC(2023, 0, 1, 13, 0),
    Date.UTC(2023, 0, 8),
    Date.UTC(2023, 2, 1),
    Date.UTC(2023, 2, 15),
    Date.UTC(2024, 0, 1),
    Date.UTC(2024, 1, 29, 23, 59, 59, 999),
].map(t => new Date(t))

export { SECOND, MINUTE, HOUR, DAY }
