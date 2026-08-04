import { merge, rebind } from "../utils/index.js"
import { sto } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "STO"

/** Where the close sits inside the recent high-low range. */
export default function stochasticOscillatorIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)

    const underlyingAlgorithm = sto()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.sto = value
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
