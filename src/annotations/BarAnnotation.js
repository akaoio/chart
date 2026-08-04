import { functor, withDefaults } from "../core/utils/index.js"

export const barAnnotationDefaults = {
    className: "chart-bar-annotation",
    opacity: 1,
    fill: "#000000",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 10,
    textAnchor: "middle",
    textFill: "#000000",
    textOpacity: 1,
    textIconFill: "#000000",
    textIconFontSize: 10,
    x: ({ xScale, xAccessor, datum }) => xScale(xAccessor(datum)),
    y: undefined,
    text: undefined,
    textIcon: undefined,
    path: undefined,
    stroke: undefined,
    tooltip: undefined,
    onClick: undefined,
}

/**
 * The full annotation: a label, an icon, and a shape, any of which may be absent.
 *
 * Text and icon are separate on purpose — they take separate offsets and separate
 * rotations, so a glyph can sit above a bar while its caption sits below.
 */
export const renderBarAnnotation = props => {
    const resolved = withDefaults(barAnnotationDefaults, props)
    const {
        className,
        stroke,
        opacity,
        xAccessor,
        xScale,
        yScale,
        path,
        text,
        textXOffset,
        textYOffset,
        textAnchor,
        fontFamily,
        fontSize,
        textFill,
        textOpacity,
        textRotate,
        textIcon,
        textIconFontSize,
        textIconFill,
        textIconOpacity,
        textIconRotate,
        textIconXOffset,
        textIconYOffset,
        datum,
        plotData,
        onClick,
    } = resolved

    const x = functor(resolved.x)({ xScale, xAccessor, datum, plotData })
    const y = functor(resolved.y)({ yScale, datum, plotData })
    const fill = functor(resolved.fill)(datum)
    const tooltip = functor(resolved.tooltip)(datum)

    const handleClick = onClick ? event => onClick(event, { xScale, yScale, datum }) : undefined

    return {
        tag: "g",
        attrs: { className, onClick: handleClick },
        children: [
            tooltip !== undefined ? { tag: "title", attrs: {}, children: [tooltip] } : null,
            text !== undefined
                ? {
                      tag: "text",
                      attrs: {
                          x,
                          y,
                          dx: textXOffset,
                          dy: textYOffset,
                          fontFamily,
                          fontSize,
                          fill: textFill,
                          opacity: textOpacity,
                          transform: textRotate != undefined ? `rotate(${textRotate}, ${x}, ${y})` : undefined,
                          textAnchor,
                      },
                      children: [text],
                  }
                : null,
            textIcon !== undefined
                ? {
                      tag: "text",
                      attrs: {
                          x,
                          y,
                          dx: textIconXOffset,
                          dy: textIconYOffset,
                          fontSize: textIconFontSize,
                          fill: textIconFill,
                          opacity: textIconOpacity,
                          transform: textIconRotate != undefined ? `rotate(${textIconRotate}, ${x}, ${y})` : undefined,
                          textAnchor,
                      },
                      children: [textIcon],
                  }
                : null,
            path !== undefined
                ? { tag: "path", attrs: { d: path({ x, y }), stroke, fill, opacity } }
                : null,
        ],
    }
}
