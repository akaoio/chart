import { rebind } from "../utils/index.js"
import { renko } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "Renko"

/** Renko. Like Kagi, it replaces the data rather than annotating it. */
export default function renkoIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)

    const indicator = renko()

    rebind(indicator, base, "id", "stroke", "fill", "echo", "type")

    return indicator
}
