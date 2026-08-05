import { max, min } from "d3-array"
import { getClosestItemIndexes, head, isDefined, isNotDefined, last } from "./index.js"

/**
 * Where the domain should end so that the last data point keeps the same pixel it has
 * now, given a new start. Used when panning past the right edge into empty space.
 */
const getNewEnd = (fallbackEnd, xAccessor, initialXScale, start) => {
    const { lastItem, lastItemX } = fallbackEnd
    const lastItemXValue = xAccessor(lastItem)
    const [rangeStart, rangeEnd] = initialXScale.range()

    return (
        ((rangeEnd - rangeStart) / (lastItemX.valueOf() - rangeStart)) * (lastItemXValue.valueOf() - start.valueOf()) +
        start.valueOf()
    )
}

const showMinThreshold = (width, threshold) => Math.max(1, Math.ceil(width * threshold))
const showMaxThreshold = (width, threshold) => Math.floor(width * threshold)
const showMax = (width, threshold) => Math.floor(showMaxThreshold(width, threshold) * 0.97)

const canShowTheseManyPeriods = (width, count, maxThreshold, minThreshold) =>
    count >= showMinThreshold(width, minThreshold) && count < showMaxThreshold(width, maxThreshold)

const getFilteredResponse = (data, left, right, xAccessor) =>
    data.slice(
        getClosestItemIndexes(data, left, xAccessor).left,
        getClosestItemIndexes(data, right, xAccessor).right + 1,
    )

/**
 * Decide what actually gets plotted for a requested x domain.
 *
 * This is what stops a chart from trying to draw a million candles in eight hundred
 * pixels, and equally from stretching six candles across the whole width. Both limits
 * are expressed as points per pixel; when the request falls outside them the domain is
 * pulled back to something drawable rather than honoured literally.
 */
const extentsWrapper = (useWholeData, clamp, pointsPerPxThreshold, minPointsPerPxThreshold, flipXScale) => {
    const filterData = (data, inputDomain, xAccessor, initialXScale, options = {}) => {
        if (useWholeData) return { plotData: data, domain: inputDomain }

        const { fallbackStart, fallbackEnd, ignoreThresholds = false } = options

        let left = head(inputDomain)
        let right = last(inputDomain)
        let clampedDomain = inputDomain

        /**
         * Kéo đến đâu thì dừng: giới hạn của khung nhìn, tính từ chính dữ liệu.
         *
         * Kéo quá tay — hay giật chuột ra ngoài cửa sổ — thì domain được hỏi trôi tới chỗ
         * gần như không còn điểm nào bên trong, và cái ngưỡng "ít nhất bấy nhiêu điểm mỗi
         * pixel" ở dưới không còn cách nào đáp ứng. Bản gốc lúc ấy trả lại **khung hình
         * trước**, qua hai biến nó tự đặt tên là `hackyWayToStopPanBeyondBounds`: đúng
         * kết quả, nhưng phải nhớ trạng thái giữa các lần gọi, và nếu không nhớ thì nhánh
         * cuối cắt danh sách còn rỗng rồi `xAccessor(head([]))` ném.
         *
         * Ở đây giới hạn được tính thẳng: giữ lại **đúng số điểm tối thiểu** mà chính
         * `minPointsPerPxThreshold` đã quy định, rồi đẩy khung nhìn lại đúng lượng tối
         * thiểu để không vượt qua đó. Bề rộng khung nhìn không đổi, kéo tiếp thì đứng yên
         * chứ không giật ngược, và câu trả lời chỉ phụ thuộc vào dữ liệu cùng domain được
         * hỏi — không phụ thuộc vào chuyện trước đó đã kéo những gì.
         */
        if (data.length > 0) {
            const chartWidth = last(initialXScale.range()) - head(initialXScale.range())
            const keep = Math.min(data.length, showMinThreshold(chartWidth, minPointsPerPxThreshold))

            const furthestRight = xAccessor(data[data.length - keep]).valueOf()
            const furthestLeft = xAccessor(data[keep - 1]).valueOf()

            const shift =
                left.valueOf() > furthestRight
                    ? furthestRight - left.valueOf()
                    : right.valueOf() < furthestLeft
                      ? furthestLeft - right.valueOf()
                      : 0

            if (shift !== 0) {
                left = left.valueOf() + shift
                right = right.valueOf() + shift
                clampedDomain = [left, right]
            }
        }

        let filteredData = getFilteredResponse(data, left, right, xAccessor)

        // A single point cannot define a width, so fall back to a domain that can
        if (filteredData.length === 1 && fallbackStart !== undefined) {
            left = fallbackStart
            right = getNewEnd(fallbackEnd, xAccessor, initialXScale, left)

            clampedDomain = [left, right]
            filteredData = getFilteredResponse(data, left, right, xAccessor)
        }

        if (typeof clamp === "function") {
            clampedDomain = clamp(clampedDomain, [xAccessor(head(data)), xAccessor(last(data))])
        } else {
            if (clamp === "left" || clamp === "both" || clamp === true) {
                clampedDomain = [max([left, xAccessor(head(data))]), clampedDomain[1]]
            }
            if (clamp === "right" || clamp === "both" || clamp === true) {
                clampedDomain = [clampedDomain[0], min([right, xAccessor(last(data))])]
            }
        }

        if (clampedDomain !== inputDomain) {
            filteredData = getFilteredResponse(data, clampedDomain[0], clampedDomain[1], xAccessor)
        }

        const realInputDomain = clampedDomain
        const xScale = initialXScale.copy().domain(realInputDomain)

        let width = Math.floor(xScale(xAccessor(last(filteredData))) - xScale(xAccessor(head(filteredData))))

        // prevent negative width when flipXScale
        if (flipXScale && width < 0) width = width * -1

        const chartWidth = last(xScale.range()) - head(xScale.range())

        if (
            (ignoreThresholds && filteredData.length > 1) ||
            canShowTheseManyPeriods(width, filteredData.length, pointsPerPxThreshold, minPointsPerPxThreshold)
        ) {
            return { plotData: filteredData, domain: realInputDomain }
        }

        if (chartWidth > showMaxThreshold(width, pointsPerPxThreshold) && isDefined(fallbackEnd)) {
            return {
                plotData: filteredData,
                domain: [head(realInputDomain), getNewEnd(fallbackEnd, xAccessor, initialXScale, head(realInputDomain))],
            }
        }

        // Ít nhất một điểm. Dữ liệu có mà biểu đồ trống thì không bao giờ là câu trả lời
        // đúng — và `head([])` là `undefined`, thứ mà `xAccessor` không chịu nổi.
        const wanted = Math.max(1, showMax(width, pointsPerPxThreshold))
        const plotData = filteredData.slice(Math.max(0, filteredData.length - wanted))

        return {
            plotData,
            domain: [xAccessor(head(plotData)), xAccessor(last(plotData))],
        }
    }

    return { filterData }
}

export default function evaluator({
    xScale,
    useWholeData,
    clamp,
    pointsPerPxThreshold,
    minPointsPerPxThreshold,
    flipXScale,
}) {
    return extentsWrapper(
        useWholeData || isNotDefined(xScale.invert),
        clamp,
        pointsPerPxThreshold,
        minPointsPerPxThreshold,
        flipXScale,
    )
}
