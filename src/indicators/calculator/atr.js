import { sum } from "d3-array"
import { slidingWindow } from "../utils/index.js"
import { ATR as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * Average True Range — how far price actually travels in a period.
 *
 * "True" range counts the gap from the previous close, not just today's high minus low,
 * so a market that gapped overnight is not recorded as quiet. The average is smoothed
 * the Wilder way: each step carries the previous value forward rather than recomputing.
 */
export default function atrCalculator() {
    let options = defaultOptions
    let source = datum => ({ open: datum.open, high: datum.high, low: datum.low, close: datum.close })

    const calculator = data => {
        const { windowSize } = options

        const trueRangeAlgorithm = slidingWindow()
            .windowSize(2)
            .source(source)
            // the first TR value is simply the High minus the Low
            .undefinedValue(datum => datum.high - datum.low)
            .accumulator(values => {
                const [previous, datum] = values
                return Math.max(datum.high - datum.low, datum.high - previous.close, datum.low - previous.close)
            })

        let previousATR

        const atrAlgorithm = slidingWindow()
            .skipInitial(1) // trueRange starts from index 1 so ATR starts from 1
            .windowSize(windowSize)
            .accumulator(values => {
                const trueRange = values[values.length - 1]
                const atr =
                    previousATR !== undefined
                        ? (previousATR * (windowSize - 1) + trueRange) / windowSize
                        : sum(values) / windowSize

                previousATR = atr
                return atr
            })

        return atrAlgorithm(trueRangeAlgorithm(data))
    }

    calculator.undefinedLength = () => options.windowSize - 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    calculator.source = newSource => {
        if (newSource === undefined) return source
        source = newSource
        return calculator
    }

    return calculator
}
