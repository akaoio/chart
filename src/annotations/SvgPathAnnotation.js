import { functor, withDefaults } from "../core/utils/index.js"

export const svgPathAnnotationDefaults = {
    className: "chart-svg-path-annotation",
    opacity: 1,
    x: ({ xScale, xAccessor, datum }) => xScale(xAccessor(datum)),
    y: undefined,
    path: undefined,
    pathWidth: 0,
    pathHeight: 0,
    fill: undefined,
    stroke: undefined,
    tooltip: undefined,
    onClick: undefined,
}

/**
 * An arbitrary SVG path anchored to a data point — an arrow, a flag, a custom glyph.
 *
 * The path is translated by its own width and height, so the shape's bottom-right corner
 * lands on the point rather than its origin. That is what makes an arrow point *at*
 * something instead of starting from it.
 */
export const renderSvgPathAnnotation = props => {
    const resolved = withDefaults(svgPathAnnotationDefaults, props)
    const { className, datum, stroke, opacity, path, pathWidth, pathHeight } = resolved
    const { x, y, fill, tooltip, xAccessor, xScale, yScale, plotData, onClick } = resolved

    const xPos = Math.round(functor(x)({ xScale, xAccessor, datum, plotData }))
    const yPos = Math.round(functor(y)({ yScale, datum, plotData }))

    const handleClick = onClick ? event => onClick(event, { xScale, yScale, datum }) : undefined

    return {
        tag: "g",
        attrs: { className, onClick: handleClick },
        children: [
            { tag: "title", attrs: {}, children: [functor(tooltip)(datum)] },
            {
                tag: "path",
                attrs: {
                    transform: `translate(${xPos - pathWidth},${yPos - pathHeight})`,
                    d: path(datum),
                    stroke,
                    fill: functor(fill)(datum),
                    opacity,
                },
            },
        ],
    }
}
