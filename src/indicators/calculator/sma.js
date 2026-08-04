import { mean } from "d3-array"
import { slidingWindow } from "../utils/index.js"
import { SMA as defaultOptions } from "./defaultOptionsForComputation.js"

/** The plain average of the last N values. */
export default function smaCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { windowSize, sourcePath } = options

        return slidingWindow()
            .windowSize(windowSize)
            .sourcePath(sourcePath)
            .accumulator(values => mean(values))(data)
    }

    calculator.undefinedLength = () => options.windowSize - 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
