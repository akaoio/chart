import { isDefined } from "../core/utils/index.js"
import { ElementBase, define, defineProperties, batched } from "../core/element.js"
import { getValueFromOverride, isHoverForInteractiveType, saveNodeType, terminate, toolChartId } from "./utils.js"

export const stickerToolDefaults = {
    enabled: true,
    src: undefined,
    size: 32,
    opacity: 1,
    snap: false,
    snapTo: undefined,
    shouldDisableSnap: event => event.button === 2 || event.shiftKey,
    currentPositionStroke: "#000000",
    currentPositionstrokeOpacity: 1,
    currentPositionStrokeWidth: 3,
    currentPositionRadius: 0,
    onComplete: undefined,
    onSelect: undefined,
    hoverText: {
        enable: true,
        bgHeight: "auto",
        bgWidth: "auto",
        text: "Click to select object",
        selectedText: "",
    },
    stickers: [],
    appearance: {
        strokeStyle: "#2962FF",
        strokeWidth: 1,
        edgeStroke: "#2962FF",
        edgeFill: "#FFFFFF",
        edgeStrokeWidth: 1,
        r: 5,
    },
}

/**
 * Stickers: `<chart-sticker>`.
 *
 * Một cú bấm đóng một con dấu tại con trỏ: MỘT neo, MỘT tay cầm, cỡ cố định
 * theo pixel. `src` là dataURL do ứng dụng đưa vào, và mỗi con dấu nhớ lấy của
 * riêng nó — nên một danh sách trộn nhiều hình vẫn là một phần tử.
 *
 * Gói **không** biết emoji là gì (chốt của chủ repo, 2026-08-30). Nó biết "con
 * dấu một điểm mang một ảnh"; bộ hình và cái picker thuộc về ứng dụng, y như
 * `chart-image-tool` không mang bức ảnh nào. Nhét vài nghìn tệp Noto vào đây là
 * gói tự quyết ứng dụng được vẽ cái gì.
 *
 * Khác `chart-image-tool` ở chỗ đo được, không phải ở chỗ khai: ảnh căng giữa
 * HAI neo (hai tay cầm, co giãn theo biểu đồ), con dấu neo MỘT chỗ (một tay
 * cầm, zoom vào không to ra). Vì thế nó là phần tử riêng chứ không phải một
 * `mode` của ImageTool.
 */
export class StickerTool extends ElementBase {
    #props
    #override = null

    #wrappers = []
    #indicator = null

    nodes = []

    constructor() {
        super()
        this.#props = defineProperties(this, stickerToolDefaults)

        this.terminate = terminate.bind(this)
        this.saveNodeType = saveNodeType.bind(this)
        this.getSelectionState = isHoverForInteractiveType("stickers").bind(this)
    }

    /** Pane nào chứa công cụ này — thứ `chart-drawing-object-selector` cần khi đăng ký. */
    get chartId() {
        return toolChartId.call(this)
    }

    /** What `isHoverForInteractiveType` reads. */
    get interactiveProps() {
        return this.#props
    }

    setInteractiveState(next) {
        if ("override" in next) this.#override = next.override
        this.update()
    }

    /** Đổi danh sách đối tượng đã vẽ thì phải dựng lại cây con, không chỉ vẽ lại. */
    propertyChanged = batched(() => this.update())

    connectedCallback() {
        this.style.display = "none"
        this.#build()
    }

    update() {
        if (this.isConnected) this.#build()
    }

    #build() {
        const props = this.#props

        while (this.#wrappers.length > props.stickers.length) this.#wrappers.pop().remove()
        while (this.#wrappers.length < props.stickers.length) {
            const wrapper = document.createElement("chart-each-sticker")
            this.#wrappers.push(wrapper)
            this.append(wrapper)
        }

        this.nodes = [...this.#wrappers]

        props.stickers.forEach((each, index) => {
            const appearance = isDefined(each.appearance) ? { ...props.appearance, ...each.appearance } : props.appearance

            Object.assign(this.#wrappers[index], {
                index,
                interactive: true,
                selected: each.selected,
                at: getValueFromOverride(this.#override, index, "at", each.at),
                src: each.src ?? props.src,
                size: each.size ?? props.size,
                opacity: each.opacity ?? props.opacity,
                appearance,
                hoverText: { ...stickerToolDefaults.hoverText, ...props.hoverText },
                onDrag: this.#handleDragSticker,
                onDragComplete: this.#handleDragStickerComplete,
            })

            this.#wrappers[index].update()
        })

        if (this.#indicator === null) {
            this.#indicator = document.createElement("chart-mouse-location-indicator")
            this.append(this.#indicator)
        }

        Object.assign(this.#indicator, {
            enabled: props.enabled,
            snap: props.snap,
            shouldDisableSnap: props.shouldDisableSnap,
            snapTo: props.snapTo,
            r: props.currentPositionRadius,
            stroke: props.currentPositionStroke,
            opacity: props.currentPositionstrokeOpacity,
            strokeWidth: props.currentPositionStrokeWidth,
            onClick: this.#handlePlace,
        })
    }

    /** One click, one stamp — the anchor is read off the click itself. */
    #handlePlace = (event, xyValue, moreProps) => {
        if (!this.#props.enabled) return

        const newStickers = [
            ...this.#props.stickers.map(each => ({ ...each, selected: false })),
            {
                at: xyValue,
                src: this.#props.src,
                size: this.#props.size,
                opacity: this.#props.opacity,
                selected: true,
                appearance: this.#props.appearance,
            },
        ]

        this.#props.onComplete?.(event, newStickers, moreProps)
    }

    #handleDragSticker = (event, index, newValues) => {
        this.setInteractiveState({ override: { index, ...newValues } })
    }

    #handleDragStickerComplete = (event, moreProps) => {
        if (!isDefined(this.#override)) return

        const { index, at } = this.#override

        const newStickers = this.#props.stickers.map((each, position) =>
            position === index ? { ...each, at, selected: true } : { ...each, selected: false },
        )

        this.setInteractiveState({ override: null })
        this.#props.onComplete?.(event, newStickers, moreProps)
    }
}

define("chart-sticker", StickerTool)
