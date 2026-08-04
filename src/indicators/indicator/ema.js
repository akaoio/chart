import { merge, rebind } from "../utils/index.js"
import { ema } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "EMA"

/** Exponential moving average: recent values weigh more, old ones never vanish. */
export default function emaIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)
        .accessor(datum => datum.ema)

    const underlyingAlgorithm = ema()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.ema = value
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
