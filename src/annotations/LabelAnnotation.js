import { functor, withDefaults } from "../core/utils/index.js"

export const labelAnnotationDefaults = {
    className: "chart-label-annotation",
    textAnchor: "middle",
    fontFamily: "-apple-system, system-ui, Roboto, 'Helvetica Neue', Ubuntu, sans-serif",
    fontSize: 12,
    fill: "#000000",
    opacity: 1,
    rotate: 0,
    x: ({ xScale, xAccessor, datum }) => xScale(xAccessor(datum)),
    y: undefined,
    text: undefined,
    tooltip: undefined,
    onClick: undefined,
}

/**
 * A piece of text pinned to a data point.
 *
 * The `<title>` is what shows as a native tooltip on hover, so an annotation can carry a
 * long explanation without cluttering the chart with it.
 */
export const renderLabelAnnotation = props => {
    const resolved = withDefaults(labelAnnotationDefaults, props)
    const { className, textAnchor, fontFamily, fontSize, opacity, rotate } = resolved
    const { x, y, datum, fill, text, tooltip, xAccessor, xScale, yScale, plotData, onClick } = resolved

    const xPos = functor(x)({ xScale, xAccessor, datum, plotData })
    const yPos = functor(y)({ yScale, datum, plotData })

    const handleClick = onClick ? event => onClick(event, { xScale, yScale, datum }) : undefined

    return {
        tag: "g",
        attrs: { className },
        children: [
            { tag: "title", attrs: {}, children: [functor(tooltip)(datum)] },
            {
                tag: "text",
                attrs: {
                    x: xPos,
                    y: yPos,
                    fontFamily,
                    fontSize,
                    fill: functor(fill)(datum),
                    opacity,
                    transform: `rotate(${rotate}, ${xPos}, ${yPos})`,
                    onClick: handleClick,
                    textAnchor,
                },
                children: [functor(text)(datum)],
            },
        ],
    }
}
