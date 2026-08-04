import { merge, rebind } from "../utils/index.js"
import { macd } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"
import { themes } from "./defaultOptionsForAppearance.js"

const ALGORITHM_TYPE = "MACD"

/** MACD — momentum as the distance between two trends. */
export default function macdIndicator() {
    const appearance = themes.light[ALGORITHM_TYPE]

    const base = baseIndicator()
        .type(ALGORITHM_TYPE)
        .fill(appearance.fill)
        .stroke(appearance.stroke)
        .accessor(datum => datum.macd)

    const underlyingAlgorithm = macd()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.macd = value
        })

    const indicator = (data, options = { merge: true }) => {
        if (options.merge) {
            if (!base.accessor()) throw new Error(`Set an accessor to ${ALGORITHM_TYPE} before calculating`)
            return mergedAlgorithm(data)
        }
        return underlyingAlgorithm(data)
    }

    rebind(indicator, base, "id", "accessor", "stroke", "fill", "echo", "type")
    rebind(indicator, underlyingAlgorithm, "options", "undefinedLength")
    rebind(indicator, mergedAlgorithm, "merge", "skipUndefined")

    return indicator
}
