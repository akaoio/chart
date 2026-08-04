import { scaleOrdinal } from "d3-scale"

const defaultColors = ["#F44336", "#2196F3", "#8BC34A", "#FF5722", "#3F51B5", "#03A9F4", "#9C27B0", "#4CAF50"]

let nextId = 0
const overlayColors = scaleOrdinal(defaultColors)

/**
 * What every indicator carries besides its maths: an id, how to read its result off a
 * row, and what colour to draw it.
 *
 * Colours are handed out from a fixed palette by id, so two moving averages on one chart
 * come out different without anyone choosing. Module-level state on purpose — the counter
 * has to be shared for that to work.
 */
export default function baseIndicator() {
    let id = nextId++
    let accessor
    let stroke
    let fill
    let echo
    let type

    const base = () => () => {}

    base.id = newId => {
        if (newId === undefined) return id
        id = newId
        return base
    }

    base.accessor = newAccessor => {
        if (newAccessor === undefined) return accessor
        accessor = newAccessor
        return base
    }

    base.stroke = newStroke => {
        if (newStroke === undefined) return !stroke ? (stroke = overlayColors(id)) : stroke
        stroke = newStroke
        return base
    }

    base.fill = newFill => {
        if (newFill === undefined) return !fill ? (fill = overlayColors(id)) : fill
        fill = newFill
        return base
    }

    base.echo = newEcho => {
        if (newEcho === undefined) return echo
        echo = newEcho
        return base
    }

    base.type = newType => {
        if (newType === undefined) return type
        type = newType
        return base
    }

    return base
}
