import { interpolateNumber } from "d3-interpolate"
import { last } from "../utils/index.js"

/**
 * Đường đi giữa hai mức zoom, chứ không phải điểm neo của một cú zoom.
 *
 * `zoomBehavior.js` cạnh đây trả lời câu "cái gì đứng yên"; file này trả lời câu
 * "đi từ đây tới đó bằng mấy bước". Hai câu khác nhau nên ở hai nhà.
 *
 * Mắt mất chỗ nếu khung nhìn nhảy một phát. Đi qua các domain nội suy giữ cho vẫn
 * là những cây nến ấy suốt chặng. Các bước thưa dần — nhanh lúc đầu, chậm về cuối.
 */
export const zoomSteps = (xScale, plotData, xAccessor, direction, zoomMultiplier) => {
    const cx = xScale(xAccessor(last(plotData)))
    const factor = direction > 0 ? zoomMultiplier : 1 / zoomMultiplier

    const [start, end] = xScale.domain()
    const [newStart, newEnd] = xScale
        .range()
        .map(x => cx + (x - cx) * factor)
        .map(xScale.invert)

    const left = interpolateNumber(start, newStart)
    const right = interpolateNumber(end, newEnd)

    return [0.25, 0.3, 0.5, 0.6, 0.75, 1].map(at => [left(at), right(at)])
}
