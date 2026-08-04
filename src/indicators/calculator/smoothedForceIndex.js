import { zip } from "d3-array"
import forceIndex from "./forceIndex.js"
import ema from "./ema.js"
import sma from "./sma.js"
import { SmoothedForceIndex as defaultOptions } from "./defaultOptionsForComputation.js"

/** Force index is very noisy on its own, so this returns both raw and smoothed. */
export default function smoothedForceIndexCalculator() {
    const underlyingAlgorithm = forceIndex()
    let options = defaultOptions

    const calculator = data => {
        const { smoothingType, smoothingWindow, sourcePath, volumePath } = options

        const force = underlyingAlgorithm.options({ sourcePath, volumePath })(data)

        const movingAverage = smoothingType === "ema" ? ema() : sma()
        const smoothed = movingAverage.options({ windowSize: smoothingWindow, sourcePath: undefined })(force)

        return zip(force, smoothed).map(pair => ({ force: pair[0], smoothed: pair[1] }))
    }

    calculator.undefinedLength = () => underlyingAlgorithm.undefinedLength() + options.smoothingWindow - 1

    calculator.options = newOptions => {
        if (newOptions === undefined) return options
        options = { ...defaultOptions, ...newOptions }
        return calculator
    }

    return calculator
}
