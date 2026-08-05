import { head, isDefined, mapObject } from "../core/utils/index.js"
import { GenericComponent, getMouseCanvas } from "../core/GenericComponent.js"
import { defineProperties, define } from "../core/element.js"
import { getMorePropsForChart, getSelected } from "./utils.js"

export const drawingObjectSelectorDefaults = {
    enabled: true,
    getInteractiveNodes: undefined,
    drawingObjectMap: undefined,
    onSelect: undefined,
    onDoubleClick: undefined,
}

/**
 * Decides which drawn object a click belongs to: `<chart-drawing-object-selector>`.
 *
 * Every interactive tool registers its nodes; on a click this asks each of them whether
 * the pointer was over one of its objects, and reports back the whole picture. That is
 * why selection is a separate element rather than each tool handling its own clicks —
 * with several trendlines and a Fibonacci overlapping, only something that can see all
 * of them can decide.
 */
export const getInteraction = (moreProps, props) => {
    const { getInteractiveNodes, drawingObjectMap } = props

    return mapObject(getInteractiveNodes(), each => {
        const key = drawingObjectMap[each.type]
        const valueArray = isDefined(key) ? each.node.interactiveProps[key] : undefined
        const valuePresent = isDefined(valueArray) && Array.isArray(valueArray) && valueArray.length > 0

        return {
            type: each.type,
            chartId: each.chartId,
            objects: valuePresent ? each.node.getSelectionState(getMorePropsForChart(moreProps, each.chartId)) : [],
        }
    })
}

/** Decides which drawn object a click belongs to, across every tool at once. */
export class DrawingObjectSelector extends GenericComponent {
    #props

    constructor() {
        super()
        this.#props = defineProperties(this, drawingObjectSelectorDefaults)
    }

    get drawOn() {
        return ["mousemove", "pan", "drag"]
    }

    canvasToDraw(contexts) {
        return getMouseCanvas(contexts)
    }

    /**
     * `preventDefault` chỉ dành cho chuột. Trên `touchstart` nó có nghĩa khác, và phá.
     *
     * Bản gốc gọi thẳng `event.preventDefault()` ở đây, và với `mousedown` thì đúng: nó chặn
     * việc trình duyệt bắt đầu bôi chọn văn bản hay kéo-thả ảnh.
     *
     * Trên `touchstart` thì cùng một lời gọi ấy nói một điều hoàn toàn khác: **đừng sinh ra
     * chuỗi sự kiện chuột tương thích**. Không có `mousedown`, `mouseup`, và không có
     * `click` — mà việc đặt một đối tượng vẽ lại xảy ra ở `click`. Nên gõ vào biểu đồ không
     * đặt được gì cả, im lặng, không lỗi.
     *
     * Chuyện này chỉ lộ ra khi đường chạm bắt đầu gọi `onMouseDown` (issue #3), và nó lộ ra
     * theo cách khó nhất: cả tám công cụ cùng ngừng đặt được, mà không hàm nào ném.
     *
     * Cử chỉ chạm của biểu đồ được khai bằng `touch-action` trên vùng bắt sự kiện — đó là
     * chỗ đúng để nói với trình duyệt về ngón tay, không phải chỗ này.
     */
    onMouseDown(event, moreProps) {
        if (event.type === "mousedown") event.preventDefault()
        if (!this.#props.enabled) return

        this.#props.onSelect?.(event, getInteraction(moreProps, this.#props), moreProps)
    }

    onDoubleClick(event, moreProps) {
        event.preventDefault()
        if (!this.#props.enabled) return

        const allSelected = getSelected(getInteraction(moreProps, this.#props))
        if (allSelected.length === 0) return

        const selected = head(allSelected)

        this.#props.onDoubleClick?.(
            event,
            { type: selected.type, chartId: selected.chartId, object: head(selected.objects) },
            getMorePropsForChart(moreProps, selected.chartId),
        )
    }
}

define("chart-drawing-object-selector", DrawingObjectSelector)
