import { merge, rebind } from "../utils/index.js"
import { elderRay } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "ElderRay"

/** How far buyers and sellers push price past the trend. */
export default function elderRayIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)
        .accessor(datum => datum.elderRay)

    const underlyingAlgorithm = elderRay()

    const mergedAlgorithm = merge()
        .algorithm(underlyingAlgorithm)
        .merge((datum, value) => {
            datum.elderRay = value
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
