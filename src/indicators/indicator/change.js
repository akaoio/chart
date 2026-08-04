import { merge, rebind } from "../utils/index.js"
import { change } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "Change"

/**
 * Difference from the previous row, absolute and percentage.
 *
 * The only indicator that does not demand an accessor before merging — it writes two
 * named fields rather than one blob, so there is nothing to point an accessor at.
 */
export default function changeIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)

    const underlyingAlgorithm = change()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.absoluteChange = value.absoluteChange
            datum.percentChange = value.percentChange
        })

    const indicator = (data, options = { merge: true }) =>
        options.merge ? mergedAlgorithm(data) : underlyingAlgorithm(data)

    rebind(indicator, base, "id", "accessor", "stroke", "fill", "echo", "type")
    rebind(indicator, underlyingAlgorithm, "options")
    rebind(indicator, mergedAlgorithm, "merge", "skipUndefined")

    return indicator
}
