import { identity, merge, rebind, slidingWindow } from "../utils/index.js"

/**
 * An indicator you define inline.
 *
 * Give it a window size, a function over that window, and a way to write the result back
 * into each row. That is the whole contract every built-in indicator follows, exposed so
 * a chart can carry a calculation the library never shipped.
 */
export default function algorithm() {
    let windowSize = 1
    let accumulator = identity
    let mergeAs = identity

    const algo = data => {
        const defaultAlgorithm = slidingWindow().windowSize(windowSize).accumulator(accumulator)
        return merge().algorithm(defaultAlgorithm).merge(mergeAs)(data)
    }

    algo.accumulator = newAccumulator => {
        if (newAccumulator === undefined) return accumulator
        accumulator = newAccumulator
        return algo
    }

    algo.windowSize = newWindowSize => {
        if (newWindowSize === undefined) return windowSize
        windowSize = newWindowSize
        return algo
    }

    algo.merge = newMerge => {
        if (newMerge === undefined) return mergeAs
        mergeAs = newMerge
        return algo
    }

    return algo
}
