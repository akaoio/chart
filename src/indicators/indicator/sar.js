import { merge, rebind } from "../utils/index.js"
import { sar } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

/**
 * Faithful port of a copy-paste slip in the original: SAR reports its `type()` as
 * `"SMA"`, not `"SAR"`.
 *
 * Kept because `type()` is public and a tooltip or legend may be keying off it. Changing
 * it silently would relabel someone's chart. Recorded in docs/parity/indicators.md.
 */
const ALGORITHM_TYPE = "SMA"

/** Parabolic SAR — an accelerating trailing stop that flips when price crosses it. */
export default function sarIndicator() {
    const base = baseIndicator()
        .type(ALGORITHM_TYPE)
        .accessor(datum => datum.sar)

    const underlyingAlgorithm = sar()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.sar = value
        })

    const indicator = (data, options = { merge: true }) => {
        if (options.merge) {
            if (!base.accessor()) throw new Error(`Set an accessor to ${ALGORITHM_TYPE} before calculating`)
            return mergedAlgorithm(data)
        }
        return underlyingAlgorithm(data)
    }

    rebind(indicator, base, "id", "accessor", "stroke", "echo", "type")
    rebind(indicator, underlyingAlgorithm, "options", "undefinedLength")
    rebind(indicator, mergedAlgorithm, "merge")

    return indicator
}
