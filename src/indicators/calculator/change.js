import { slidingWindow } from "../utils/index.js"
import { Change as defaultOptions } from "./defaultOptionsForComputation.js"

/** Difference from the previous value, both absolute and as a percentage. */
export default function changeCalculator() {
    let options = defaultOptions

    const calculator = data =>
        slidingWindow()
            .windowSize(2)
            .sourcePath(options.sourcePath)
            .accumulator(([previous, current]) => {
                const absoluteChange = current - previous
                return { absoluteChange, percentChange: (absoluteChange * 100) / previous }
            })(data)

    calculator.undefinedLength = () => 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
