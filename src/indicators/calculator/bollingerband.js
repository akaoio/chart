/*
https://github.com/ScottLogic/d3fc/blob/master/src/indicator/algorithm/calculator/bollingerBands.js
The MIT License (MIT) · Copyright (c) 2014-2015 Scott Logic Ltd. — see LICENSE
*/

import { deviation, mean } from "d3-array"
import { path, slidingWindow, zipper } from "../utils/index.js"
import ema from "./ema.js"
import { BollingerBand as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * A moving average with a channel a fixed number of standard deviations either side.
 *
 * The band widens when the market is volatile and pinches when it is quiet, which is the
 * whole point: the same distance means something different in different conditions.
 */
export default function bollingerBandCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { windowSize, multiplier, movingAverageType, sourcePath } = options
        const source = path(sourcePath)

        const meanAlgorithm =
            movingAverageType === "ema"
                ? ema().options({ windowSize, sourcePath })
                : slidingWindow()
                      .windowSize(windowSize)
                      .accumulator(values => mean(values))
                      .sourcePath(sourcePath)

        const bollingerBandAlgorithm = slidingWindow()
            .windowSize(windowSize)
            .accumulator(values => {
                const average = values[values.length - 1].mean
                const stdDev = deviation(values, each => source(each.datum))

                if (stdDev === undefined) return undefined

                return {
                    top: average + multiplier * stdDev,
                    middle: average,
                    bottom: average - multiplier * stdDev,
                }
            })

        const zip = zipper().combine((datum, meanValue) => ({ datum, mean: meanValue }))

        return bollingerBandAlgorithm(zip(data, meanAlgorithm(data)))
    }

    calculator.undefinedLength = () => options.windowSize - 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
