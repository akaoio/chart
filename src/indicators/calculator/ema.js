/*
https://github.com/ScottLogic/d3fc/blob/master/src/indicator/algorithm/calculator/exponentialMovingAverage.js

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

import { path } from "../utils/index.js"
import { EMA as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * Weighted towards recent values, and never forgetting old ones entirely.
 *
 * The first value is seeded with a plain average of the window; after that each step is
 * a blend of the new value and the previous result. Leading gaps in the data are skipped
 * rather than counted, so a late-starting series still gets a full seed window.
 */
export default function emaCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { windowSize, sourcePath } = options

        const source = path(sourcePath)
        const alpha = 2 / (windowSize + 1)

        let previous
        let initialAccumulator = 0
        let skip = 0

        return data.map((datum, i) => {
            const value = source(datum, i)

            if (previous === undefined && value === undefined) {
                skip++
                return undefined
            }

            if (i < windowSize + skip - 1) {
                initialAccumulator += value
                return undefined
            }

            if (i === windowSize + skip - 1) {
                initialAccumulator += value
                previous = initialAccumulator / windowSize
                return previous
            }

            previous = value * alpha + (1 - alpha) * previous
            return previous
        })
    }

    calculator.undefinedLength = () => options.windowSize - 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
