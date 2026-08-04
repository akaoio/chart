/*
https://github.com/ScottLogic/d3fc/blob/master/src/indicator/algorithm/calculator/relativeStrengthIndex.js

The MIT License (MIT)

Copyright (c) 2014-2015 Scott Logic Ltd.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import { mean } from "d3-array"
import { path, slidingWindow } from "../utils/index.js"
import { RSI as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * Relative Strength Index: average gain against average loss, scaled to 0–100.
 *
 * Like ATR, the averages are smoothed by carrying the previous value forward, so the
 * reading depends on all history rather than only the last N bars — two charts starting
 * at different dates will not agree exactly, and that is Wilder's design, not a bug.
 */
export default function rsiCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { windowSize, sourcePath } = options
        const source = path(sourcePath)

        let previousAvgGain
        let previousAvgLoss

        const rsiAlgorithm = slidingWindow()
            .windowSize(windowSize)
            .accumulator(values => {
                const avgGain =
                    previousAvgGain !== undefined
                        ? (previousAvgGain * (windowSize - 1) + values[values.length - 1].gain) / windowSize
                        : mean(values, each => each.gain)

                if (avgGain === undefined) return undefined

                const avgLoss =
                    previousAvgLoss !== undefined
                        ? (previousAvgLoss * (windowSize - 1) + values[values.length - 1].loss) / windowSize
                        : mean(values, each => each.loss)

                if (avgLoss === undefined) return undefined

                previousAvgGain = avgGain
                previousAvgLoss = avgLoss

                return 100 - 100 / (1 + avgGain / avgLoss)
            })

        const gainsAndLossesCalculator = slidingWindow()
            .windowSize(2)
            .undefinedValue(() => [0, 0])
            .accumulator(tuple => {
                const change = source(tuple[1]) - source(tuple[0])
                return { gain: Math.max(change, 0), loss: Math.abs(Math.min(change, 0)) }
            })

        return rsiAlgorithm(gainsAndLossesCalculator(data))
    }

    calculator.undefinedLength = () => options.windowSize - 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
