/**
 * Range bars — mỗi thanh là một QUÃNG GIÁ cố định, không phải một quãng
 * thời gian: thanh chốt khi giá đóng đi hết `range` kể từ gốc thanh, đi xa
 * hơn thì tràn sang thanh kế (một cây nến có thể sinh nhiều thanh).
 *
 * TradingView dựng range bars từ tick trong phiên; dữ liệu ở đây chỉ có giá
 * đóng theo nến nên chuỗi được suy từ giá đóng — tập con trung thực, ghi rõ
 * trong docs/parity. `date` của thanh là của cây nến đang chảy qua nó,
 * volume chia đều cho số thanh cây nến ấy sinh ra.
 */
export default function rangeBarsCalculator() {
    let range = undefined
    let source = datum => datum

    const calculator = data => {
        if (range === undefined || range <= 0) return []

        const bars = []
        let current = null

        for (const bar of data) {
            const { date, close, volume = 0 } = source(bar)

            if (current === null) {
                current = { date, open: close, volume: 0 }
                continue
            }

            // Một cây nến có thể chốt nhiều thanh — chia volume đều cho số bước
            const steps = Math.floor(Math.abs(close - current.open) / range)
            const direction = Math.sign(close - current.open)
            const perStep = steps > 0 ? volume / steps : 0

            for (let step = 0; step < steps; step++) {
                const open = current.open
                const to = open + direction * range
                bars.push({
                    date,
                    open,
                    close: to,
                    high: Math.max(open, to),
                    low: Math.min(open, to),
                    volume: current.volume + perStep,
                })
                current = { date, open: to, volume: 0 }
            }

            if (steps === 0) current.volume += volume
        }

        return bars
    }

    calculator.range = newRange => {
        if (newRange === undefined) return range
        range = newRange
        return calculator
    }

    calculator.source = newSource => {
        if (newSource === undefined) return source
        source = newSource
        return calculator
    }

    return calculator
}
