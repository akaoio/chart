import { rebind } from "../utils/index.js"
import { kagi } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "Kagi"

/**
 * Kagi. Unlike the others there is no merge step: the result *replaces* the data rather
 * than annotating it, because a Kagi chart has fewer rows than the prices it came from.
 */
export default function kagiIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)

    const indicator = kagi()

    rebind(indicator, base, "id", "stroke", "fill", "echo", "type")

    return indicator
}
