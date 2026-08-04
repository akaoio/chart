/*
https://github.com/ScottLogic/d3fc/blob/master/src/indicator/algorithm/merge.js

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

import { identity, zipper } from "../../core/utils/index.js"

/**
 * Run a calculation over the data and fold the result back into each row.
 *
 * This is why `sma(data)` returns the same rows with an `sma` field added, rather than a
 * bare array of numbers — one row carries the price and every indicator computed from it,
 * which is what lets a single `plotData` feed a dozen series.
 */
export default function mergeCalculation() {
    let algorithm = identity
    let skipUndefined = true
    let merge = () => {}

    const mergeCompute = data => {
        const zip = zipper().combine((datum, indicator) => {
            const result = skipUndefined && indicator === undefined ? datum : merge(datum, indicator)
            return result === undefined ? datum : result
        })

        return zip(data, algorithm(data))
    }

    mergeCompute.algorithm = function (value) {
        if (value === undefined) return algorithm
        algorithm = value
        return mergeCompute
    }

    mergeCompute.merge = function (value) {
        if (value === undefined) return merge
        merge = value
        return mergeCompute
    }

    mergeCompute.skipUndefined = function (value) {
        if (value === undefined) return skipUndefined
        skipUndefined = value
        return mergeCompute
    }

    return mergeCompute
}
