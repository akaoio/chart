import { first, last } from "./index.js"

/**
 * How wide one bar should be, from how many items are on screen and how far apart the
 * first and last of them sit.
 *
 * Three cases, in the order the original tries them: a numeric domain divides the range
 * evenly; an invertible scale with a non-numeric domain (dates) measures the plotted
 * span instead and shrinks it by 0.7; a scale with no `invert` is ordinal, so the domain
 * length is the item count.
 */
export const plotDataLengthBarWidth = (props, moreProps) => {
    const { widthRatio } = props
    const { xAccessor, xScale, plotData } = moreProps

    const [left, right] = xScale.range()

    if (xScale.invert != null) {
        const [domainLeft, domainRight] = xScale.domain()

        if (typeof domainLeft === "number" && typeof domainRight === "number") {
            const totalWidth = Math.abs(right - left)
            const width = totalWidth / Math.abs(domainLeft - domainRight)

            return width * widthRatio
        }

        const width = xScale(xAccessor(last(plotData))) - xScale(xAccessor(first(plotData)))

        return (width / plotData.length) * widthRatio * 0.7
    }

    const totalWidth = Math.abs(right - left)
    const width = totalWidth / xScale.domain().length

    return width * widthRatio
}
