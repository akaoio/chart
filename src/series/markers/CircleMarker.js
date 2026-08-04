import { functor } from "../../core/utils/index.js"

/**
 * Markers are plain objects, not elements.
 *
 * The original made each one a React component that also carried a static
 * `drawOnCanvas`, but nothing ever rendered them as components — `ScatterSeries` only
 * ever calls the static. So here a marker is what it always was underneath: a default
 * set of props and a way to draw one.
 */
export const CircleMarker = {
    defaultProps: { fillStyle: "#4682B4", r: 3 },

    drawOnCanvas(props, point, context) {
        const { strokeStyle, fillStyle, r, strokeWidth } = props

        if (strokeStyle !== undefined) context.strokeStyle = strokeStyle
        if (strokeWidth !== undefined) context.lineWidth = strokeWidth
        if (fillStyle !== undefined) context.fillStyle = fillStyle

        const { datum, x, y } = point
        const radius = functor(r)(datum)

        context.moveTo(x, y)
        context.beginPath()
        context.arc(x, y, radius, 0, 2 * Math.PI, false)
        context.fill()

        if (strokeStyle !== undefined) context.stroke()
    },
}
