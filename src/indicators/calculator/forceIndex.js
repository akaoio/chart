import { path, slidingWindow } from "../utils/index.js"
import { ForceIndex as defaultOptions } from "./defaultOptionsForComputation.js"

/** Price change multiplied by volume — how much conviction was behind a move. */
export default function forceIndexCalculator() {
    let options = defaultOptions

    const calculator = data => {
        const { sourcePath, volumePath } = options
        const source = path(sourcePath)
        const volume = path(volumePath)

        return slidingWindow()
            .windowSize(2)
            .accumulator(([previous, current]) => (source(current) - source(previous)) * volume(current))(data)
    }

    calculator.undefinedLength = () => 2

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
