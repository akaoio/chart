import { merge, rebind } from "../utils/index.js"
import { bollingerBand } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "BollingerBand"

/** A moving average with a volatility channel either side. */
export default function bollingerBandIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)

    const underlyingAlgorithm = bollingerBand()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.bollingerBand = value
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
    rebind(indicator, underlyingAlgorithm, "options")
    rebind(indicator, mergedAlgorithm, "merge", "skipUndefined")

    return indicator
}
