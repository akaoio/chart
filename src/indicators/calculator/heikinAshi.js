import { mappedSlidingWindow } from "../utils/index.js"

/**
 * Candles built from averages instead of raw prices.
 *
 * Each open comes from the *previous Heikin-Ashi candle*, not the previous price — so the
 * chart feeds on its own output and trends read as unbroken runs of one colour. That
 * recursion is exactly what `mappedSlidingWindow` exists for.
 */
export default function heikinAshiCalculator() {
    let source = value => value

    const calculator = data =>
        mappedSlidingWindow()
            .windowSize(2)
            .undefinedValue(({ open, high, low, close }) => ({
                open,
                high,
                low,
                close: (open + high + low + close) / 4,
            }))
            .accumulator(([previous, now]) => {
                const { date, volume } = now
                const close = (now.open + now.high + now.low + now.close) / 4
                const open = (previous.open + previous.close) / 2

                return {
                    date,
                    open,
                    high: Math.max(open, now.high, close),
                    low: Math.min(open, now.low, close),
                    close,
                    volume,
                }
            })(data)

    calculator.source = newSource => {
        if (newSource === undefined) return source
        source = newSource
        return calculator
    }

    return calculator
}
