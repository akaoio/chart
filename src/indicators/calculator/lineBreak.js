/**
 * Three-line break — chuỗi "vạch" chỉ đổi khi giá đóng vượt hẳn quá khứ.
 *
 * Luật chuẩn (mặc định 3 vạch, chỉnh bằng `.count()`):
 * - Tiếp diễn: giá đóng vượt đỉnh vạch cuối (đang lên) hay thủng đáy vạch
 *   cuối (đang xuống) là thêm một vạch cùng chiều, nối từ mép vạch cuối.
 * - Đảo chiều: phải vượt qua CỰC TRỊ của `count` vạch gần nhất; vạch đảo
 *   chiều bắt đầu từ chân vạch cuối (mép `from` — với vạch lên đó là đáy,
 *   với vạch xuống đó là đỉnh).
 * - Không vượt gì cả thì không có vạch nào — trục thời gian vì thế không
 *   đều: mỗi vạch mang `date` của cây nến đã chốt nó, volume cộng dồn từ
 *   lần chốt trước.
 *
 * Mỗi vạch trả về dạng OHLC (open = gốc, close = ngọn) nên vẽ thẳng bằng
 * `chart-candlestick-series`, màu lên/xuống tự rơi đúng chỗ.
 */
export default function lineBreakCalculator() {
    let count = 3
    let source = datum => datum

    const calculator = data => {
        const lines = []
        let pendingVolume = 0

        for (const bar of data) {
            const { date, open, close, volume = 0 } = source(bar)
            pendingVolume += volume

            if (lines.length === 0) {
                if (close === open) continue
                lines.push(makeLine(date, open, close, pendingVolume))
                pendingVolume = 0
                continue
            }

            const last = lines[lines.length - 1]
            const window = lines.slice(-count)
            const top = Math.max(...window.map(line => Math.max(line.open, line.close)))
            const bottom = Math.min(...window.map(line => Math.min(line.open, line.close)))
            const rising = last.close > last.open

            if (rising ? close > last.close : close > top) {
                const from = rising ? last.close : last.open
                lines.push(makeLine(date, from, close, pendingVolume))
                pendingVolume = 0
            } else if (rising ? close < bottom : close < last.close) {
                const from = rising ? last.open : last.close
                lines.push(makeLine(date, from, close, pendingVolume))
                pendingVolume = 0
            }
        }

        return lines
    }

    const makeLine = (date, from, to, volume) => ({
        date,
        open: from,
        close: to,
        high: Math.max(from, to),
        low: Math.min(from, to),
        volume,
    })

    calculator.count = newCount => {
        if (newCount === undefined) return count
        count = newCount
        return calculator
    }

    calculator.source = newSource => {
        if (newSource === undefined) return source
        source = newSource
        return calculator
    }

    return calculator
}
