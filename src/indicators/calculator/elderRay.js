/*
https://github.com/ScottLogic/d3fc/blob/master/src/indicator/algorithm/calculator/elderRay.js
The MIT License (MIT) · Copyright (c) 2014-2015 Scott Logic Ltd. — see LICENSE
*/

import { mean, zip } from "d3-array"
import { slidingWindow } from "../utils/index.js"
import ema from "./ema.js"
import { ElderRay as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * How far buyers and sellers can push price past the trend.
 *
 * Bull power is the high above the moving average, bear power the low below it. Both are
 * measured from the same average, so they read as one pair rather than two indicators.
 */
export default function elderRayCalculator() {
    let options = defaultOptions
    let ohlc = datum => ({ open: datum.open, high: datum.high, low: datum.low, close: datum.close })

    const calculator = data => {
        const { windowSize, sourcePath, movingAverageType } = options

        const meanAlgorithm =
            movingAverageType === "ema"
                ? ema().options({ windowSize, sourcePath })
                : slidingWindow()
                      .windowSize(windowSize)
                      .accumulator(values => mean(values))
                      .sourcePath(sourcePath)

        return zip(data, meanAlgorithm(data)).map(([datum, meanValue]) => ({
            bullPower: meanValue !== undefined ? ohlc(datum).high - meanValue : undefined,
            bearPower: meanValue !== undefined ? ohlc(datum).low - meanValue : undefined,
        }))
    }

    calculator.undefinedLength = () => options.windowSize - 1

    calculator.ohlc = accessor => {
        if (accessor === undefined) return ohlc
        ohlc = accessor
        return calculator
    }

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
