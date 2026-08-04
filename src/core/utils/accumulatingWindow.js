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

import { identity } from "./identity.js"
import { functor } from "./index.js"
import { noop } from "./noop.js"

/**
 * Group consecutive items into windows of variable length, closing a window whenever
 * `accumulateTill` says so. Unlike a sliding window, nothing overlaps.
 *
 * This is what turns a stream of candles into Kagi, Renko or Point-and-Figure bricks.
 */
export default function accumulatingWindowCalculator() {
    let accumulateTill = functor(false)
    let accumulator = noop
    let value = identity
    let discardTillStart = false
    let discardTillEnd = false

    const accumulatingWindow = data => {
        let accumulatedWindow = discardTillStart ? undefined : []
        const response = []
        let accumulatorIndex = 0
        let i = 0

        for (i = 0; i < data.length; i++) {
            const datum = data[i]
            if (accumulateTill(datum, i, accumulatedWindow || [])) {
                if (accumulatedWindow && accumulatedWindow.length > 0) {
                    response.push(accumulator(accumulatedWindow, i, accumulatorIndex++))
                }

                accumulatedWindow = [value(datum)]
            } else if (accumulatedWindow) {
                accumulatedWindow.push(value(datum))
            }
        }

        if (!discardTillEnd) {
            response.push(accumulator(accumulatedWindow, i, accumulatorIndex))
        }

        return response
    }

    accumulatingWindow.accumulateTill = function (test) {
        if (!arguments.length) return accumulateTill
        accumulateTill = functor(test)
        return accumulatingWindow
    }

    accumulatingWindow.accumulator = function (value_) {
        if (!arguments.length) return accumulator
        accumulator = value_
        return accumulatingWindow
    }

    accumulatingWindow.value = function (accessor) {
        if (!arguments.length) return value
        value = accessor
        return accumulatingWindow
    }

    accumulatingWindow.discardTillStart = function (discard) {
        if (!arguments.length) return discardTillStart
        discardTillStart = discard
        return accumulatingWindow
    }

    accumulatingWindow.discardTillEnd = function (discard) {
        if (!arguments.length) return discardTillEnd
        discardTillEnd = discard
        return accumulatingWindow
    }

    return accumulatingWindow
}
