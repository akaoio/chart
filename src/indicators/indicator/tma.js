import { merge, rebind } from "../utils/index.js"
import { tma } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "TMA"

/** Triangular moving average: weights peak in the middle, so it is the smoothest of the four. */
export default function tmaIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)
        .accessor(datum => datum.tma)

    const underlyingAlgorithm = tma()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.tma = value
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
