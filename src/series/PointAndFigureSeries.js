import { isDefined, isNotDefined, withDefaults } from "../core/utils/index.js"
import { Series } from "./Series.js"
import { define } from "../core/element.js"

export const pointAndFigureSeriesDefaults = {
    strokeWidth: 1,
    stroke: { up: "#6BA583", down: "#FF0000" },
    fill: { up: "none", down: "none" },
    clip: true,
}

/**
 * Columns of X and O boxes, time ignored entirely.
 *
 * Box height comes from the first box in the data rather than being computed per column,
 * because in Point and Figure every box is the same price increment by definition — that
 * is the whole premise of the chart.
 */
export const getPointAndFigureColumns = moreProps => {
    const {
        xAccessor,
        xScale,
        chartConfig: { yScale },
        plotData,
    } = moreProps

    const width = xScale(xAccessor(plotData[plotData.length - 1])) - xScale(xAccessor(plotData[0]))
    const columnWidth = width / (plotData.length - 1)

    let anyBox
    let index = 0
    while (isNotDefined(anyBox)) {
        if (isDefined(plotData[index].close)) {
            anyBox = plotData[index].boxes[0]
        } else {
            break
        }
        index++
    }

    const boxHeight = Math.abs(yScale(anyBox.open) - yScale(anyBox.close))

    return plotData
        .filter(datum => isDefined(datum.close))
        .map(datum => ({
            boxes: datum.boxes.map(box => ({
                columnWidth,
                boxHeight,
                open: yScale(box.open),
                close: yScale(box.close),
            })),
            direction: datum.direction,
            offset: [xScale(xAccessor(datum)) - columnWidth / 2, 0],
        }))
}

/** Rising columns are crosses; falling columns are circles. */
export const drawPointAndFigureSeries = (context, moreProps, props) => {
    const { stroke, fill, strokeWidth } = withDefaults(pointAndFigureSeriesDefaults, props)
    const columns = getPointAndFigureColumns(moreProps)

    context.lineWidth = strokeWidth

    columns.forEach(column => {
        const [offsetX, offsetY] = column.offset

        column.boxes.forEach(box => {
            if (column.direction > 0) {
                context.fillStyle = fill.up
                context.strokeStyle = stroke.up

                context.beginPath()
                context.moveTo(offsetX, offsetY + box.open)
                context.lineTo(offsetX + box.columnWidth, offsetY + box.close)
                context.moveTo(offsetX, offsetY + box.close)
                context.lineTo(offsetX + box.columnWidth, offsetY + box.open)
                context.stroke()
            } else {
                context.fillStyle = fill.down
                context.strokeStyle = stroke.down

                context.beginPath()
                const [x, y] = [offsetX + box.columnWidth / 2, offsetY + box.open + box.boxHeight / 2]
                context.ellipse(x, y, box.columnWidth / 2, box.boxHeight / 2, 0, 0, 2 * Math.PI)
                context.stroke()
            }
        })
    })

    context.stroke()
}

export class PointAndFigureSeries extends Series {
    static defaults = pointAndFigureSeriesDefaults

    get clip() {
        return this.seriesProps.clip
    }

    canvasDraw(context, moreProps) {
        drawPointAndFigureSeries(context, moreProps, this.seriesProps)
    }
}

define("chart-point-and-figure-series", PointAndFigureSeries)
