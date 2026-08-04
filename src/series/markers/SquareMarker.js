import { functor } from "../../core/utils/index.js"

export const Square = {
    defaultProps: { fillStyle: "#4682B4", width: 6 },

    drawOnCanvas(props, point, context) {
        const { strokeStyle, fillStyle, strokeWidth, width } = props

        if (strokeStyle !== undefined) context.strokeStyle = strokeStyle
        if (strokeWidth !== undefined) context.lineWidth = strokeWidth
        if (fillStyle !== undefined) context.fillStyle = fillStyle

        const size = functor(width)(point.datum)

        context.beginPath()
        context.rect(point.x - size / 2, point.y - size / 2, size, size)
        context.fill()

        if (strokeStyle !== undefined) context.stroke()
    },
}
