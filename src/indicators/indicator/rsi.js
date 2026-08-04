import { merge, rebind } from "../utils/index.js"
import { rsi } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "RSI"

/** Relative Strength Index — momentum on a 0–100 scale. */
export default function rsiIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)
        .accessor(datum => datum.rsi)

    const underlyingAlgorithm = rsi()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.rsi = value
        })

    const indicator = (data, options = { merge: true }) => {
        if (options.merge) {
            if (!base.accessor()) {
                throw new Error(`Set an accessor to ${ALGORITHM_TYPE} before calculating`)
            }

            return mergedAlgorithm(data)
        }

        return underlyingAlgorithm(data)
    }

    rebind(indicator, base, "id", "accessor", "stroke", "fill", "echo", "type")
    rebind(indicator, underlyingAlgorithm, "options", "undefinedLength")
    rebind(indicator, mergedAlgorithm, "merge", "skipUndefined")

    return indicator
}
