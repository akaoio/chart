import { sum } from "d3-array"
import { slidingWindow } from "../utils/index.js"
import { WMA as defaultOptions } from "./defaultOptionsForComputation.js"

/** Weights rise linearly across the window, so the newest value counts N times. */
export default function wmaCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { windowSize, sourcePath } = options
        const weight = (windowSize * (windowSize + 1)) / 2

        return slidingWindow()
            .windowSize(windowSize)
            .sourcePath(sourcePath)
            .accumulator(values => sum(values, (value, i) => (i + 1) * value) / weight)(data)
    }

    calculator.undefinedLength = () => options.windowSize - 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
