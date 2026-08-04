import { functor } from "../../core/utils/index.js"

/** Geometry of an equilateral triangle centred on a point. */
const getTrianglePoints = width => ({
    innerHypotenuse: (width / 2) * (1 / Math.cos((30 * Math.PI) / 180)),
    innerOpposite: (width / 2) * (1 / Math.tan((60 * Math.PI) / 180)),
})

/** `"hide"` means draw nothing at all, which is how a marker is skipped per datum. */
const getRotationInDegrees = (props, point) => {
    const direction = functor(props.direction ?? "top")(point.datum)
    if (direction === "hide") return null

    switch (direction) {
        case "bottom":
            return 180
        case "left":
            return -90
        case "right":
            return 90
        default:
            return 0
    }
}

export const Triangle = {
    defaultProps: { direction: "top", fillStyle: "#4682B4", width: 8 },

    /**
     * Faithful port, including a bug the original marks itself.
     *
     * When a rotation is asked for, the path is built at the unrotated position and only
     * then is the canvas rotated around the point — so the shape that gets filled is not
     * the shape that was described. The original carries `// TODO: rotation does not
     * work` right here. Kept as-is; changing it silently would make a rotated triangle
     * appear somewhere the original never drew it. Recorded in docs/parity/series.md.
     */
    drawOnCanvas(props, point, context) {
        const { fillStyle, strokeStyle, strokeWidth, width } = props

        if (strokeStyle !== undefined) context.strokeStyle = functor(strokeStyle)(point.datum)
        if (strokeWidth !== undefined) context.lineWidth = strokeWidth
        if (fillStyle !== undefined) context.fillStyle = functor(fillStyle)(point.datum)

        const size = functor(width)(point.datum)
        const { x, y } = point
        const { innerOpposite, innerHypotenuse } = getTrianglePoints(size)
        const rotation = getRotationInDegrees(props, point)

        context.beginPath()
        context.moveTo(x, y - innerHypotenuse)
        context.lineTo(x + size / 2, y + innerOpposite)
        context.lineTo(x - size / 2, y + innerOpposite)

        if (rotation !== null && rotation !== 0) {
            context.save()
            context.translate(x, y)
            context.rotate((rotation * Math.PI) / 180)
            context.fill()
            context.restore()
        }

        context.fill()

        if (strokeStyle !== undefined) context.stroke()
    },
}
