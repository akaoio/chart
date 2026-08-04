import { rebind } from "../utils/index.js"
import { pointAndFigure } from "../calculator/index.js"
import baseIndicator from "./baseIndicator.js"

const ALGORITHM_TYPE = "PointAndFigure"

/** Point and Figure. Like Kagi and Renko, it replaces the data. */
export default function pointAndFigureIndicator() {
    const base = baseIndicator().type(ALGORITHM_TYPE)

    const indicator = pointAndFigure()

    rebind(indicator, base, "id", "stroke", "fill", "echo", "type")

    return indicator
}
