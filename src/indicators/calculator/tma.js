import { sum } from "d3-array"
import { slidingWindow } from "../utils/index.js"
import { TMA as defaultOptions } from "./defaultOptionsForComputation.js"

/**
 * Weights rise to the middle of the window and fall away again — an average of an
 * average, and much smoother than either a simple or weighted one.
 */
export default function tmaCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { windowSize, sourcePath } = options

        const half = Math.floor(windowSize / 2)
        const weight = windowSize % 2 === 0 ? half * (half + 1) : (half + 1) * (half + 1)

        return slidingWindow()
            .windowSize(windowSize)
            .sourcePath(sourcePath)
            .accumulator(
                values => sum(values, (value, i) => (i < half ? (i + 1) * value : (windowSize - i) * value)) / weight,
            )(data)
    }

    calculator.undefinedLength = () => options.windowSize - 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
