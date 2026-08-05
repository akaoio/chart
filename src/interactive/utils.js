import { isDefined, isNotDefined, mapObject } from "../core/utils/index.js"
import { findContext } from "../core/context.js"

/**
 * Id của pane mà công cụ vẽ này đang nằm trong. Bind vào công cụ, nên `this` là phần tử.
 *
 * Công cụ vẽ không phải `GenericChartComponent` — nó không tự vẽ gì, nó dựng ra những phần
 * tử con vẽ hộ. Nên nó không có sẵn `chartId` như các series, và trước đây nó không có cách
 * nào trả lời câu "mày ở pane nào".
 *
 * Mà câu ấy là câu người dùng thư viện buộc phải trả lời, mỗi lần đăng ký công cụ với
 * `chart-drawing-object-selector`. Bản gốc để họ tự nhớ — trong ví dụ của bản gốc, `chartId`
 * được viết tay khớp với `<Chart id={…}>`. Nhớ sai thì `getMorePropsForChart` không tìm ra
 * pane và nổ, mà nổ từ trong vòng phát sự kiện nên cả biểu đồ trông như chết. Đúng chuyện
 * đã xảy ra ở trang trưng bày: viết `undefined` còn pane mang id 0.
 *
 * Hỏi phần tử thì không nhớ sai được.
 */
export function toolChartId() {
    return findContext(this, "pane")?.chartId
}

/**
 * While an object is being dragged, its stored coordinates are stale — the live position
 * lives in an `override`. This reads through it: the override wins for the object being
 * dragged, everything else answers as normal.
 */
export const getValueFromOverride = (override, index, key, defaultValue) => {
    if (isDefined(override) && override.index === index) return override[key]
    return defaultValue
}

/** End an in-progress drawing or drag. Bound to the tool, so `this` is the element. */
export function terminate() {
    this.setInteractiveState({ current: null, override: null })
}

/**
 * Keep a handle on each child node so the tool can ask them things later — chiefly
 * "is the pointer over you". Passing `undefined` forgets that node.
 */
export function saveNodeType(type) {
    return node => {
        if (isDefined(this.nodes)) {
            if (isNotDefined(node) && isDefined(this.nodes[type])) delete this.nodes[type]
            else this.nodes[type] = node
        } else {
            this.nodes = []
        }
    }
}

/** Ask every drawn object whether the pointer is over it, and mark the ones that say yes. */
export function isHoverForInteractiveType(interactiveType) {
    return function (moreProps) {
        if (isDefined(this.nodes)) {
            const selectedNodes = this.nodes.map(node => node.isHover(moreProps))

            return this.interactiveProps[interactiveType].map((each, index) => ({
                ...each,
                selected: selectedNodes[index],
            }))
        }
    }
}

export function isHover(moreProps) {
    return mapObject(this.nodes, node => node.isHover(moreProps)).reduce((a, b) => a || b)
}

const getMouseXY = (moreProps, [originX, originY]) => {
    if (Array.isArray(moreProps.mouseXY)) {
        const [x, y] = moreProps.mouseXY
        return [x - originX, y - originY]
    }
    return moreProps.mouseXY
}

/**
 * Narrow the chart-wide `moreProps` to one pane, with the pointer moved into that pane's
 * coordinates — so a tool drawn in the volume pane measures from the volume pane's corner.
 *
 * The list arrives as `chartConfigs`. The original calls it `chartConfig` and tells the
 * two apart by asking whether it is an array; here the plural name carries the list and
 * the singular one carries a single pane, so neither has to be inspected to know which it
 * is. Both names are read only because the shared golden case drives this same function
 * on both sides.
 */
export const getMorePropsForChart = (moreProps, chartId) => {
    const list = moreProps.chartConfigs ?? moreProps.chartConfig
    const chartConfig = list.find(each => each.id === chartId)

    /**
     * Nói ra chuyện gì đã xảy ra, thay vì để nó thành `undefined.origin`.
     *
     * Bản gốc đọc thẳng `chartConfig.origin`, nên một `chartId` không khớp bất kỳ pane nào
     * chỉ để lại "Cannot read properties of undefined (reading 'origin')" ở giữa một
     * stack toàn tên nội bộ. Mà chỗ này bị gọi từ trong vòng phát sự kiện của
     * `ChartCanvas`, nên cú nổ ấy còn cắt luôn việc phát cho những phần tử đăng ký sau —
     * biểu đồ trông như chết hẳn. Đúng cái đã xảy ra trên trang trưng bày công cụ vẽ:
     * `chart-drawing-object-selector` được đăng ký với `chartId: undefined` còn pane thì
     * mang id 0.
     *
     * Vẫn ném, không âm thầm bỏ qua: `chartId` sai là lỗi của người dùng thư viện, và cái
     * giá của việc im lặng là "chọn không được mà không hiểu vì sao". Chỉ nói cho đủ.
     */
    if (chartConfig === undefined) {
        const ids = list.map(each => JSON.stringify(each.id)).join(", ")
        throw new Error(
            `getMorePropsForChart: không có pane nào mang chartId ${JSON.stringify(chartId)}. ` +
                `Các pane đang có: ${ids || "(không có pane nào)"}.`,
        )
    }

    return { ...moreProps, chartConfig, mouseXY: getMouseXY(moreProps, chartConfig.origin) }
}

/** Of every interactive group, only the objects the user has selected. */
export const getSelected = interactives =>
    interactives
        .map(each => ({ ...each, objects: each.objects.filter(object => object.selected) }))
        .filter(each => each.objects.length > 0)
