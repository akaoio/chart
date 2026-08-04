import { merge, rebind } from "../utils/index.js"
import { heikinAshi } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "HeikinAshi"

/**
 * Heikin-Ashi candles.
 *
 * The merge spreads the result over the row rather than nesting it, because Heikin-Ashi
 * *replaces* open/high/low/close — a candlestick series then plots it with no changes.
 */
export default function heikinAshiIndicator() {
    const base = baseIndicator()
        .type(ALGORITHM_TYPE)
        .accessor(datum => datum.ha)

    const underlyingAlgorithm = heikinAshi()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => ({ ...datum, ...value }))

    const indicator = (data, options = { merge: true }) => {
        if (options.merge) {
            if (!base.accessor()) throw new Error(`Set an accessor to ${ALGORITHM_TYPE} before calculating`)
            return mergedAlgorithm(data)
        }
        return underlyingAlgorithm(data)
    }

    rebind(indicator, base, "accessor", "stroke", "fill", "echo", "type")
    rebind(indicator, mergedAlgorithm, "merge")

    return indicator
}
