import { functor, identity } from "../../core/utils/index.js"

/**
 * A sliding window that feeds on its own output.
 *
 * Each result replaces the datum it came from inside the window, so the next step sees
 * previous *results* rather than previous inputs. That is what recursive indicators need
 * — Kagi and Renko decide each brick from the last brick, not from the last price.
 */
export default function mappedSlidingWindowCalculator() {
    let undefinedValue
    let windowSize = 10
    let accumulator = () => {}
    let source = identity
    let skipInitial = 0

    const mappedSlidingWindow = data => {
        const size = functor(windowSize)()
        const windowData = []
        let accumulatorIndex = 0
        const undefined_ = functor(undefinedValue)
        const result = []

        data.forEach((datum, i) => {
            if (i < skipInitial + size - 1) {
                const mapped = undefined_(datum, i)
                result.push(mapped)
                windowData.push(mapped)
                return
            }

            if (i >= skipInitial + size) windowData.shift()

            windowData.push(source(datum, i))

            const mapped = accumulator(windowData, i, accumulatorIndex++)
            result.push(mapped)

            // swap the input for the result, so the next window sees what was computed
            windowData.pop()
            windowData.push(mapped)
        })

        return result
    }

    mappedSlidingWindow.undefinedValue = function (value) {
        if (!arguments.length) return undefinedValue
        undefinedValue = value
        return mappedSlidingWindow
    }
    mappedSlidingWindow.windowSize = function (value) {
        if (!arguments.length) return windowSize
        windowSize = value
        return mappedSlidingWindow
    }
    mappedSlidingWindow.accumulator = function (value) {
        if (!arguments.length) return accumulator
        accumulator = value
        return mappedSlidingWindow
    }
    mappedSlidingWindow.skipInitial = function (value) {
        if (!arguments.length) return skipInitial
        skipInitial = value
        return mappedSlidingWindow
    }
    mappedSlidingWindow.source = function (value) {
        if (!arguments.length) return source
        source = value
        return mappedSlidingWindow
    }

    return mappedSlidingWindow
}
