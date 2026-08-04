/*
https://github.com/ScottLogic/d3fc/blob/master/src/indicator/algorithm/calculator/stochasticOscillator.js
The MIT License (MIT) · Copyright (c) 2014-2015 Scott Logic Ltd. — see LICENSE
*/

import { max, mean, min, zip } from "d3-array"
import { slidingWindow } from "../utils/index.js"
import { FullStochasticOscillator as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * Where the close sits inside the recent high-low range, as a percentage.
 *
 * %K is that raw position, smoothed once; %D smooths it again. Two windows of smoothing
 * on top of the window that defined the range, which is why the result lags but stops
 * flapping at every tick.
 */
export default function stochasticOscillatorCalculator() {
    let options = defaultOptions
    let source = datum => ({ open: datum.open, high: datum.high, low: datum.low, close: datum.close })

    const calculator = data => {
        const { windowSize, kWindowSize, dWindowSize } = options

        const high = datum => source(datum).high
        const low = datum => source(datum).low
        const close = datum => source(datum).close

        const kWindow = slidingWindow()
            .windowSize(windowSize)
            .accumulator(values => {
                const highestHigh = max(values, high)
                if (highestHigh === undefined) return undefined

                const lowestLow = min(values, low)
                if (lowestLow === undefined) return undefined

                return ((close(values[values.length - 1]) - lowestLow) / (highestHigh - lowestLow)) * 100
            })

        const kSmoothed = slidingWindow()
            .skipInitial(windowSize - 1)
            .windowSize(kWindowSize)
            .accumulator(values => mean(values))

        const dWindow = slidingWindow()
            .skipInitial(windowSize - 1 + kWindowSize - 1)
            .windowSize(dWindowSize)
            .accumulator(values => mean(values))

        const kData = kSmoothed(kWindow(data))

        return zip(kData, dWindow(kData)).map(pair => ({ K: pair[0], D: pair[1] }))
    }

    calculator.undefinedLength = () => options.windowSize + options.kWindowSize + options.dWindowSize

    calculator.source = newSource => {
        if (newSource === undefined) return source
        source = newSource
        return calculator
    }

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
