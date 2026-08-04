/*

Taken from https://github.com/ScottLogic/d3fc/blob/master/src/indicator/algorithm/calculator/slidingWindow.js

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

import { functor, path } from "./index.js"
import { noop } from "./noop.js"

/**
 * Roll a fixed-size window over the data, calling `accumulator` once per position.
 *
 * Positions before the window is full get `undefinedValue` instead. Every setter
 * returns the calculator, so calls chain; calling a setter with no argument reads.
 */
export default function slidingWindowCalculator() {
    let undefinedValue
    let windowSize = 10
    let accumulator = noop
    let sourcePath
    let source
    let skipInitial = 0
    let misc

    const slidingWindow = data => {
        const sourceFunction = source || path(sourcePath)

        // The original writes `functor(windowSize).apply(this, arguments)` inside an
        // arrow function, so `arguments` is the factory's — always empty. A window size
        // given as a function is therefore called with no arguments, not with the data.
        const size = functor(windowSize)()

        const windowData = data.slice(skipInitial, size + skipInitial).map(sourceFunction)

        let accumulatorIndex = 0
        const undefined_ = functor(undefinedValue)

        return data.map((datum, i) => {
            if (i < skipInitial + size - 1) {
                return undefined_(sourceFunction(datum), i, misc)
            }
            if (i >= skipInitial + size) {
                // windowData is a FIFO rolling buffer
                windowData.shift()
                windowData.push(sourceFunction(datum, i))
            }

            return accumulator(windowData, i, accumulatorIndex++, misc)
        })
    }

    slidingWindow.undefinedValue = function (value) {
        if (!arguments.length) return undefinedValue
        undefinedValue = value
        return slidingWindow
    }

    slidingWindow.windowSize = function (value) {
        if (!arguments.length) return windowSize
        windowSize = value
        return slidingWindow
    }

    slidingWindow.misc = function (value) {
        if (!arguments.length) return misc
        misc = value
        return slidingWindow
    }

    slidingWindow.accumulator = function (value) {
        if (!arguments.length) return accumulator
        accumulator = value
        return slidingWindow
    }

    slidingWindow.skipInitial = function (value) {
        if (!arguments.length) return skipInitial
        skipInitial = value
        return slidingWindow
    }

    slidingWindow.sourcePath = function (value) {
        if (!arguments.length) return sourcePath
        sourcePath = value
        return slidingWindow
    }

    slidingWindow.source = function (value) {
        if (!arguments.length) return source
        source = value
        return slidingWindow
    }

    return slidingWindow
}
