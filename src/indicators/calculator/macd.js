/*
https://github.com/ScottLogic/d3fc/blob/master/src/indicator/algorithm/calculator/macd.js
The MIT License (MIT) · Copyright (c) 2014-2015 Scott Logic Ltd. — see LICENSE
*/

import { zip } from "d3-array"
import ema from "./ema.js"
import { MACD as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * Two moving averages of different speeds, subtracted — then smoothed again.
 *
 * `macd` is fast minus slow; `signal` is an average of that; `divergence` is the gap
 * between the two, which is what the histogram draws. Momentum expressed as the distance
 * between two trends.
 */
export default function macdCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { fast, slow, signal, sourcePath } = options

        const fastEMA = ema().options({ windowSize: fast, sourcePath })
        const slowEMA = ema().options({ windowSize: slow, sourcePath })
        const signalEMA = ema().options({ windowSize: signal, sourcePath: undefined })

        const diff = zip(fastEMA(data), slowEMA(data)).map(pair =>
            pair[0] !== undefined && pair[1] !== undefined ? pair[0] - pair[1] : undefined,
        )

        return zip(diff, signalEMA(diff)).map(pair => ({
            macd: pair[0],
            signal: pair[1],
            divergence: pair[0] !== undefined && pair[1] !== undefined ? pair[0] - pair[1] : undefined,
        }))
    }

    calculator.undefinedLength = () => options.slow + options.signal - 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
