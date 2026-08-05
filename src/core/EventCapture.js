import { getCurrentCharts } from "./utils/ChartDataUtil.js"
import { getTouchProps, mousePosition, pointerPosition, pointersPosition, touchPosition } from "./utils/dom.js"

/**
 * Hai cú bấm cách nhau bao nhiêu pixel thì vẫn còn là một cú nhấp đúp.
 *
 * Ngón tay không đặt lại đúng một pixel, nên số này phải rộng hơn con chuột — mà rộng quá
 * thì hai lần gõ có ý là hai lần lại bị gộp. Trình duyệt trên máy tính lấy khoảng 2–4 pixel;
 * lấy 8 để ngón tay còn đủ chỗ.
 */
export const DOUBLE_CLICK_SLOP = 8

/**
 * One invisible rectangle over the whole chart, turning raw pointer events into the
 * chart's own vocabulary: pan, drag, zoom, pinch, hover.
 *
 * ## Why listeners go on `window`, not on the rectangle
 *
 * Once a drag begins the pointer belongs to the gesture, not to whatever it happens to
 * be over. Someone panning fast will leave the chart, and the pan has to keep working
 * and has to end on mouse-up wherever that lands. So a gesture starts on the rectangle
 * and continues on `window`, exactly as the original does.
 *
 * ## Removing listeners in groups, without d3
 *
 * The original leans on a d3 feature with no platform equivalent: namespaced events.
 * `select(window).on("mousemove.pan", handler)` can later be undone with
 * `.on("mousemove.pan", null)` — by name, removing that one handler and disturbing no
 * other `mousemove` listener, without holding on to the function reference.
 *
 * `removeEventListener` needs the exact same function, so reproducing that by hand means
 * storing every handler and remembering to match them up. `AbortSignal` says the same
 * thing more directly: every listener of a gesture shares one controller, and aborting
 * it drops all of them at once. It cannot get out of step, because there is nothing to
 * keep in step — and `disconnectedCallback` aborting the lot means a chart removed
 * mid-drag leaves nothing behind on `window`.
 */
export class EventCapture {
    #element
    #owner

    // one controller per gesture — abort() is the whole teardown
    #gesture = null

    #focus = false
    #mouseInside = false
    #mouseInteraction = true
    #clicked = false
    #clickedAt = null
    #clickTimer = null
    #touchOrigin = null
    #touchMoved = false
    #touchFingers = 0
    #dragHappened = false
    #panHappened = false
    #panEndTimeout
    #lastNewPos
    #dx = 0
    #dy = 0

    #panInProgress = false
    #dragInProgress = false
    #panStart
    #dragStartPosition
    #pinchZoomStart
    #cursorOverrideClass

    /** `owner` supplies live props and the handlers, the way React passed them down. */
    constructor(owner) {
        this.#owner = owner

        this.#element = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        this.#element.style.opacity = 0

        // A finger on the chart is there to drag the chart sideways and to pinch it —
        // not to zoom the page. Say so, or the browser claims those gestures and the
        // chart's own `touchmove` never runs.
        //
        // `pan-y` and not `none`: vertical scrolling stays with the page. A chart is
        // usually inside a document, and a reader who cannot scroll past it is stuck.
        // Panning is horizontal anyway, and excluding `pinch-zoom` from the list is what
        // hands the pinch to us.
        this.#element.style.touchAction = "pan-y"

        // The class attribute carries the cursor and gets rewritten, so identity lives
        // on a separate attribute that nothing overwrites.
        this.#element.setAttribute("data-event-capture", "")
    }

    get element() {
        return this.#element
    }

    get panInProgress() {
        return this.#panInProgress
    }

    #props() {
        return this.#owner.eventCaptureProps
    }

    /** Begin a gesture: any listener added with this signal dies when the gesture ends. */
    #startGesture() {
        this.#gesture?.abort()
        this.#gesture = new AbortController()
        return this.#gesture.signal
    }

    #endGesture() {
        this.#gesture?.abort()
        this.#gesture = null

        // Hover tracking is not part of any gesture, so it has to come back afterwards
        if (this.#mouseInside) this.#trackHover()
    }

    #trackHover() {
        this.#hover?.abort()
        this.#hover = new AbortController()
        window.addEventListener("mousemove", this.#handleMouseMove, { signal: this.#hover.signal })
    }

    #hover = null

    connect() {
        const { disableInteraction } = this.#props()
        if (disableInteraction) return

        this.#lifetime = new AbortController()
        const { signal } = this.#lifetime

        this.#element.addEventListener("mouseenter", this.#handleEnter, { signal })
        this.#element.addEventListener("mouseleave", this.#handleLeave, { signal })
        this.#element.addEventListener("wheel", this.#handleWheel, { passive: false, signal })
        this.#element.addEventListener("mousedown", this.#handleMouseDown, { signal })
        this.#element.addEventListener("click", this.#handleClick, { signal })
        this.#element.addEventListener("contextmenu", this.#handleRightClick, { signal })
        this.#element.addEventListener("touchstart", this.#handleTouchStart, { signal })
        this.#element.addEventListener("touchmove", this.#handleTouchMove, { signal })
        this.#element.addEventListener("touchend", this.#handleTouchEnd, { signal })
        this.#element.addEventListener("touchcancel", this.#handleTouchEnd, { signal })
    }

    /**
     * Đặt lại con trỏ theo trạng thái hiện tại.
     *
     * Phải gọi sau mỗi lần chart tính lại, vì `useCrossHairStyleCursor` mà EventCapture
     * nhìn thấy còn nhân với "chart có tương tác được không" — mà điều ấy chỉ biết được
     * khi đã có dữ liệu và thang. Lúc `connect()` thì chưa có gì, nên nếu chỉ gán một lần
     * ở đó thì chart vừa dựng lên đã mang mũi trỏ mặc định, và giữ nguyên thế cho tới khi
     * có ai chạm vào. Bản gốc viết lớp ấy thẳng trong JSX nên nó đúng từ khung hình đầu.
     */
    refreshCursor() {
        this.#applyCursor()
    }

    #lifetime = null

    /** Everything this ever attached, anywhere, goes away here. */
    disconnect() {
        this.#lifetime?.abort()
        this.#hover?.abort()
        this.#gesture?.abort()
        this.#lifetime = this.#hover = this.#gesture = null
        window.clearTimeout(this.#panEndTimeout)
        window.clearTimeout(this.#clickTimer)
    }

    resize(width, height) {
        this.#element.setAttribute("width", Math.max(0, width))
        this.#element.setAttribute("height", Math.max(0, height))
    }

    setCursorClass(cursorOverrideClass) {
        if (cursorOverrideClass === this.#cursorOverrideClass) return

        this.#cursorOverrideClass = cursorOverrideClass ?? undefined
        this.#applyCursor()
    }

    #applyCursor() {
        const { disableInteraction, useCrossHairStyleCursor } = this.#props()

        const className = disableInteraction
            ? undefined
            : this.#cursorOverrideClass !== undefined
              ? this.#cursorOverrideClass
              : !useCrossHairStyleCursor
                ? undefined
                : this.#panInProgress
                  ? "chart-grabbing-cursor"
                  : "chart-crosshair-cursor"

        this.#element.setAttribute("class", className ?? "")
    }

    #handleEnter = event => {
        const { onMouseEnter } = this.#props()
        if (onMouseEnter === undefined) return

        this.#mouseInside = true
        if (!this.#panInProgress && !this.#dragInProgress) this.#trackHover()

        onMouseEnter(event)
    }

    #handleLeave = event => {
        const { onMouseLeave } = this.#props()
        if (onMouseLeave === undefined) return

        this.#mouseInside = false
        if (!this.#panInProgress && !this.#dragInProgress) this.#hover?.abort()

        onMouseLeave(event)
    }

    /**
     * A wheel means zoom when it is mostly vertical, and pan otherwise — which is how a
     * trackpad's two-finger swipe becomes a pan without any gesture recognition.
     *
     * Wheel panning has no natural end, so a timer declares one 100ms after the last
     * tick. That is the original's approach and it is kept.
     */
    #handleWheel = event => {
        const { pan, onPan, zoom, onZoom } = this.#props()
        if (!pan && !zoom) return

        const yZoom = Math.abs(event.deltaY) > Math.abs(event.deltaX) && Math.abs(event.deltaY) > 0
        const mouseXY = mousePosition(event)
        event.preventDefault()

        if (zoom && this.#focus && yZoom && !this.#panInProgress) {
            onZoom?.(event.deltaY > 0 ? 1 : -1, mouseXY, event)
        } else if (this.#focus) {
            if (this.#shouldPan() && this.#panStart !== undefined) {
                const { panStartXScale, chartsToPan } = this.#panStart
                this.#lastNewPos = mouseXY
                this.#panHappened = true

                this.#dx -= event.deltaX
                this.#dy += event.deltaY

                onPan?.(mouseXY, panStartXScale, { dx: this.#dx, dy: this.#dy }, chartsToPan, event)
            } else {
                const { xScale, chartConfig } = this.#props()

                this.#dx = 0
                this.#dy = 0
                this.#panInProgress = true
                this.#panStart = {
                    panStartXScale: xScale,
                    panOrigin: mouseXY,
                    chartsToPan: getCurrentCharts(chartConfig, mouseXY),
                }
                this.#applyCursor()
            }
            this.#queuePanEnd(event)
        }
    }

    #queuePanEnd(event) {
        window.clearTimeout(this.#panEndTimeout)
        this.#panEndTimeout = window.setTimeout(() => this.#handlePanEnd(event), 100)
    }

    #handleMouseMove = event => {
        const { onMouseMove, mouseMove } = this.#props()
        if (onMouseMove === undefined) return

        if (this.#mouseInteraction && mouseMove && !this.#panInProgress) {
            onMouseMove(pointerPosition(event, this.#element), "mouse", event)
        }
    }

    /**
     * A second click within 400ms **and within a few pixels** is a double click. Neither
     * fires if the pointer was panning or dragging — otherwise letting go of a pan would
     * register as a click.
     *
     * Bản gốc chỉ hỏi thời gian: cú bấm thứ hai trong 400ms ở **bất kỳ đâu** cũng thành
     * nhấp đúp, và cú bấm ấy bị ăn mất. Đặt hai nhãn chữ cách nhau nửa biểu đồ, nhanh tay
     * một chút, thì cái thứ hai không xuất hiện — không báo lỗi, không dấu vết, chỉ là
     * không có gì xảy ra. Trên điện thoại thì gần như luôn xảy ra, vì gõ hai lần thì nhanh.
     *
     * Nhấp đúp vốn là hai cú bấm **vào cùng một chỗ**; chính trình duyệt cũng đo khoảng
     * cách khi phát `dblclick`. Nên ở đây hỏi cả khoảng cách, và một cú bấm ra ngoài bán
     * kính ấy được tính là một cú bấm mới — mở lại cửa sổ nhấp đúp tại chỗ mới.
     */
    #handleClick = event => {
        const mouseXY = mousePosition(event)
        const { onClick, onDoubleClick } = this.#props()

        if (this.#panHappened || this.#dragHappened) return

        const nearFirst =
            this.#clickedAt !== null &&
            Math.abs(mouseXY[0] - this.#clickedAt[0]) <= DOUBLE_CLICK_SLOP &&
            Math.abs(mouseXY[1] - this.#clickedAt[1]) <= DOUBLE_CLICK_SLOP

        if (this.#clicked && nearFirst && onDoubleClick !== undefined) {
            onDoubleClick(mouseXY, event)
            this.#forgetClick()
        } else if (onClick !== undefined) {
            onClick(mouseXY, event)
            this.#clicked = true
            this.#clickedAt = mouseXY

            // Huỷ hẹn giờ của cú bấm trước. Bản gốc để chúng chồng lên nhau, nên hẹn giờ
            // của một cú bấm cũ đóng cửa sổ nhấp đúp của cú bấm mới: bấm ba lần rời rạc
            // rồi bấm đúp thì cú đúp ấy có thể bị tính thành hai cú bấm lẻ.
            window.clearTimeout(this.#clickTimer)
            this.#clickTimer = setTimeout(() => this.#forgetClick(), 400)
        }
    }

    #forgetClick() {
        window.clearTimeout(this.#clickTimer)
        this.#clickTimer = null
        this.#clicked = false
        this.#clickedAt = null
    }

    #handleRightClick = event => {
        event.stopPropagation()
        event.preventDefault()

        const { onContextMenu, onPanEnd } = this.#props()
        const mouseXY = mousePosition(event, this.#element.getBoundingClientRect())

        if (this.#panStart !== undefined) {
            const { panStartXScale, panOrigin, chartsToPan } = this.#panStart

            if (this.#panHappened && onPanEnd !== undefined) {
                onPanEnd(mouseXY, panStartXScale, { dx: panOrigin[0], dy: panOrigin[1] }, chartsToPan, event)
            }

            this.#endGesture()
            this.#panInProgress = false
            this.#panStart = undefined
            this.#applyCursor()
        }

        onContextMenu?.(mouseXY, event)
    }

    /**
     * Điểm đang được kéo, dù kéo bằng gì.
     *
     * `MouseEvent` mang `clientX`/`clientY` ngay trên mình, `TouchEvent` thì mang chúng
     * trong danh sách `touches`. Phép rẽ này trước đây chỉ có ở `#handlePan`, còn
     * `#handleDrag` chỉ gọi `pointerPosition` — nên ngay cả khi đường kéo được gọi bằng ngón
     * tay, nó cũng đọc ra `undefined`. Một hàm cho cả hai đường: bớt một bản trùng, không
     * thêm.
     */
    #positionOf(event) {
        if (this.#mouseInteraction) return pointerPosition(event, this.#element)

        const active = pointersPosition(event, this.#element)
        if (active.length > 0) return active[0]

        // `touchend`: `touches` đã rỗng vì ngón tay vừa rời ra. Điểm cuối nằm ở
        // `changedTouches` — không đọc chỗ ấy thì một cú kéo bằng ngón tay kết thúc ở
        // `undefined`, và cái đó đi thẳng vào `onDragComplete`.
        const changed = event.changedTouches
        if (changed !== undefined && changed.length > 0) return pointerPosition(changed[0], this.#element)

        return this.#lastNewPos ?? [0, 0]
    }

    #handleDrag = event => {
        const { onDrag } = this.#props()
        if (onDrag === undefined || this.#dragStartPosition === undefined) return

        this.#dragHappened = true
        if (event.type === "touchmove" && event.cancelable) event.preventDefault()

        onDrag({ startPos: this.#dragStartPosition, mouseXY: this.#positionOf(event) }, event)
    }

    cancelDrag() {
        this.#endGesture()
        this.#dragInProgress = false
        this.#mouseInteraction = true
    }

    #handleDragEnd = event => {
        const mouseXY = this.#positionOf(event)
        this.#endGesture()

        if (this.#dragHappened) this.#props().onDragComplete?.({ mouseXY }, event)

        this.#dragInProgress = false
        this.#mouseInteraction = true
    }

    /**
     * Pan only if nothing objects and nothing is selected.
     *
     * Every subscriber gets a say: panning needs unanimous consent, while a single
     * draggable component is enough to claim the gesture as a drag instead. That is how
     * dragging a trendline moves the line rather than the whole chart.
     */
    #canPan() {
        const { getAllPanConditions, pan: initialPanEnabled } = this.#props()

        return getAllPanConditions().reduce(
            (result, condition) => ({
                draggable: result.draggable || condition.draggable,
                panEnabled: result.panEnabled && condition.panEnabled,
            }),
            { draggable: false, panEnabled: initialPanEnabled },
        )
    }

    /**
     * Một cú đặt xuống: quyết định nó là pan hay là kéo một đối tượng, rồi vũ trang cử chỉ.
     *
     * Con chuột và ngón tay dùng **cùng** phép quyết định này. Chỉ ba thứ khác nhau giữa hai
     * thiết bị, và cả ba được truyền vào: tên sự kiện di chuyển, tên sự kiện kết thúc, và vị
     * trí điểm đặt.
     *
     * Trước đây phép quyết định chỉ có ở nhánh chuột, còn nhánh chạm thì luôn pan — nên trên
     * điện thoại không đối tượng nào kéo được. Chép nhánh ấy sang là có hai bản phải giữ
     * khớp nhau; thay vào đó cả hai gọi vào đây. Xem issue #3.
     *
     * Thứ tự hai nhánh đảo lại so với bản gốc, cùng kết quả nhưng đọc ra một câu: "có đối
     * tượng nhận cú kéo thì cú kéo thuộc về nó, không thì mới tới lượt khung nhìn". Bản gốc
     * hỏi `panEnabled && !somethingSelected` trước, nên phải đọc hai điều kiện mới biết.
     */
    #beginGestureAt(position, { move, end, cancel, event }) {
        const { xScale, chartConfig, onDragStart } = this.#props()

        const currentCharts = getCurrentCharts(chartConfig, position)
        const { panEnabled, draggable: somethingSelected } = this.#canPan()

        const arm = (onMove, onEnd, { passive = true } = {}) => {
            const signal = this.#startGesture()
            window.addEventListener(move, onMove, { signal, passive })
            window.addEventListener(end, onEnd, { signal })
            if (cancel !== undefined) window.addEventListener(cancel, onEnd, { signal })
        }

        if (somethingSelected) {
            this.#panInProgress = false
            this.#dragInProgress = true
            this.#panStart = undefined
            this.#dragStartPosition = position

            onDragStart?.({ startPos: position }, event)

            /**
             * Cú kéo này thuộc về đối tượng, nên phải nói với trình duyệt là đừng cuộn trang.
             *
             * Vùng bắt sự kiện khai `touch-action: pan-y` — cố ý, để người đọc còn cuộn được
             * qua biểu đồ. Nhưng khi cú kéo đã được một đối tượng nhận thì nó không còn là
             * một cú vuốt trang nữa, và kéo một đối tượng xuống dưới không được biến thành
             * cuộn trang. `preventDefault` chỉ nói được điều ấy nếu listener KHÔNG passive,
             * mà `touchmove` trên `window` thì trình duyệt mặc định cho là passive — nên phải
             * khai rõ.
             *
             * Nhánh pan thì không: pan là ngang, còn dọc vẫn thuộc về trang, đúng như
             * `pan-y` đã hẹn.
             */
            arm(this.#handleDrag, this.#handleDragEnd, { passive: false })
        } else if (panEnabled) {
            this.#panInProgress = true
            this.#panStart = { panStartXScale: xScale, panOrigin: position, chartsToPan: currentCharts }
            this.#applyCursor()

            arm(this.#handlePan, this.#handlePanEnd)
        }

        return currentCharts
    }

    #handleMouseDown = event => {
        if (event.button !== 0) return

        const { onMouseDown } = this.#props()

        this.#panHappened = false
        this.#dragHappened = false
        this.#focus = true

        if (!this.#panInProgress && this.#mouseInteraction) {
            const mouseXY = mousePosition(event)
            const currentCharts = this.#beginGestureAt(mouseXY, { move: "mousemove", end: "mouseup", event })

            onMouseDown?.(mouseXY, currentCharts, event)
        }

        event.preventDefault()
    }

    #shouldPan() {
        const { pan, onPan } = this.#props()
        return pan && onPan && this.#panStart !== undefined
    }

    #handlePan = event => {
        if (!this.#shouldPan() || this.#panStart === undefined) return

        this.#panHappened = true
        const { panStartXScale, panOrigin, chartsToPan } = this.#panStart

        /**
         * Cùng một dấu cho chuột và cho ngón tay: nội dung đi **theo** thứ đang kéo nó.
         *
         * Bản gốc đảo dấu ở nhánh chạm (`dx = panOrigin[0] - mouseXY[0]`), nên trên màn
         * hình cảm ứng chart chạy ngược chiều ngón tay — cả ngang lẫn dọc. Đo trên trang
         * thật trước khi sửa: vuốt sang phải 150px thì domain x dịch **+25.8** thay vì
         * −25.0 như khi dùng chuột. Xem docs/parity/core.md.
         */
        const mouseXY = this.#positionOf(event)

        const dx = mouseXY[0] - panOrigin[0]
        const dy = mouseXY[1] - panOrigin[1]

        this.#lastNewPos = mouseXY
        this.#dx = dx
        this.#dy = dy

        this.#props().onPan?.(mouseXY, panStartXScale, { dx, dy }, chartsToPan, event)
    }

    #handlePanEnd = event => {
        const { pan: panEnabled, onPanEnd } = this.#props()
        if (this.#panStart === undefined) return

        const { panStartXScale, chartsToPan } = this.#panStart
        this.#endGesture()

        if (this.#panHappened && panEnabled && onPanEnd && this.#lastNewPos !== undefined) {
            onPanEnd(this.#lastNewPos, panStartXScale, { dx: this.#dx, dy: this.#dy }, chartsToPan, event)
        }

        this.#dx = 0
        this.#dy = 0
        this.#panInProgress = false
        this.#panStart = undefined
        this.#applyCursor()
    }

    #handleTouchMove = event => {
        const { onMouseMove } = this.#props()
        if (onMouseMove === undefined) return

        const position = touchPosition(getTouchProps(event.touches[0]), event)

        if (this.#touchOrigin !== null) {
            const moved =
                Math.abs(position[0] - this.#touchOrigin[0]) > DOUBLE_CLICK_SLOP ||
                Math.abs(position[1] - this.#touchOrigin[1]) > DOUBLE_CLICK_SLOP
            if (moved) this.#touchMoved = true
        }

        onMouseMove(position, "touch", event)
    }

    /**
     * Một cú kéo bằng ngón tay mà không ai giành, thì kết thúc của nó là một cú bấm.
     *
     * Trình duyệt sinh ra `click` sau một cú **gõ**, không sinh sau một cú **kéo** — đúng,
     * vì cú kéo thường là cuộn trang. Nhưng có thứ dùng cú kéo rồi đóng lại bằng `click`:
     * `chart-brush` bắt đầu ở `onMouseDown`, theo dấu ở `onMouseMove`, và chốt ở `onClick`.
     * Nên trên điện thoại nó quét mãi không xong — không lỗi, chỉ là không có gì báo về.
     *
     * Ba điều kiện, và cả ba đều cần:
     *
     * - cử chỉ phải là **một ngón từ đầu đến cuối**, và mọi ngón đã rời ra. Pinch không
     *   phải một cú bấm, và nó không đặt `#panHappened` — nên thiếu điều kiện này thì chụm
     *   hai ngón để zoom lại đặt ra một đối tượng vẽ. Đo được: pinch khi đang bật công cụ
     *   Text đặt oan một nhãn.
     * - ngón tay phải **đi** quá `DOUBLE_CLICK_SLOP`. Nếu chỉ gõ thì trình duyệt tự sinh
     *   `click`, và phát thêm một cái nữa thì một cú gõ bị xử lý hai lần — đúng cái đã
     *   xảy ra ở `DrawingObjectSelector` theo chiều ngược lại.
     * - không có pan và không có drag nào đã xảy ra. Chúng giành cú kéo trước, và một cú
     *   kéo đã thuộc về ai thì không còn là cú bấm.
     * - `onClick` phải có thật.
     *
     * Không dùng `preventDefault` trên `touchstart` để tự chiếm cả chuỗi sự kiện: làm thế thì
     * chặn luôn cuộn trang bắt đầu từ trên biểu đồ, mà `touch-action: pan-y` được đặt chính
     * là để giữ điều ấy.
     */
    #handleTouchEnd = event => {
        const wasMoved = this.#touchMoved
        const fingers = this.#touchFingers
        const allUp = event.touches.length === 0

        if (allUp) {
            this.#touchMoved = false
            this.#touchOrigin = null
            this.#touchFingers = 0
        }

        if (!allUp || fingers !== 1 || !wasMoved || this.#panHappened || this.#dragHappened) return

        const { onClick } = this.#props()
        if (onClick === undefined) return

        onClick(this.#positionOf(event), event)
    }

    #handleTouchStart = event => {
        this.#mouseInteraction = false
        this.#touchFingers = Math.max(this.#touchFingers, event.touches.length)

        const { pan: panEnabled, onMouseMove, onMouseDown, xScale, onPanEnd } = this.#props()

        if (event.touches.length === 1) {
            this.#panHappened = false
            this.#dragHappened = false
            this.#touchMoved = false
            this.#touchFingers = 1

            const touchXY = touchPosition(getTouchProps(event.touches[0]), event)
            this.#touchOrigin = touchXY

            /**
             * Ba việc, đúng ba việc con chuột làm khi bấm xuống, theo đúng thứ tự ấy.
             *
             * 1. Nói cho các phần tử biết con trỏ đang ở đâu, để chúng tính lại `hovering`.
             *    Phép quyết định ở bước 2 đọc chính `hovering` ấy, nên bước này phải xong
             *    trước — và phải xong **ngay**, không qua phép chặn một-lần-mỗi-khung-hình
             *    của `handleMouseMove`, nên gọi kèm `immediate`.
             * 2. Quyết định cú này là pan hay là kéo một đối tượng.
             * 3. Báo là đã có một cú đặt xuống. Đây là thứ `chart-drawing-object-selector`
             *    nghe để biết mình vừa bị bấm vào — nó nghe `mousedown`. Mà `mousedown` do
             *    trình duyệt sinh ra sau một cú gõ thì bị `#mouseInteraction` chặn (chặn
             *    đúng: nếu không thì một cú gõ bị xử lý hai lần). Nên trước đây trên điện
             *    thoại không cách nào chọn được một đối tượng đã vẽ. Đường chạm tự báo lấy.
             */
            onMouseMove?.(touchXY, "touch", event, { immediate: true })

            const currentCharts = this.#beginGestureAt(touchXY, {
                move: "touchmove",
                end: "touchend",
                cancel: "touchcancel",
                event,
            })

            onMouseDown?.(touchXY, currentCharts, event)
        } else if (event.touches.length === 2) {
            // A second finger turns a pan into a pinch: end the pan, start the zoom
            if (this.#panInProgress && panEnabled && onPanEnd && this.#panStart !== undefined) {
                const { panStartXScale, panOrigin, chartsToPan } = this.#panStart

                const signal = this.#startGesture()
                window.addEventListener("touchmove", this.#handlePinchZoom, { signal })
                window.addEventListener("touchend", this.#handlePinchZoomEnd, { signal })
                window.addEventListener("touchcancel", this.#handlePinchZoomEnd, { signal })

                const touch1Pos = touchPosition(getTouchProps(event.touches[0]), event)
                const touch2Pos = touchPosition(getTouchProps(event.touches[1]), event)

                if (this.#panHappened && this.#lastNewPos !== undefined) {
                    onPanEnd(
                        this.#lastNewPos,
                        panStartXScale,
                        { dx: panOrigin[0], dy: panOrigin[1] },
                        chartsToPan,
                        event,
                    )
                }

                this.#panInProgress = false
                this.#pinchZoomStart = {
                    xScale,
                    touch1Pos,
                    touch2Pos,
                    range: xScale.range(),
                    chartsToPan,
                }
            }
        }
    }

    #handlePinchZoom = event => {
        if (this.#pinchZoomStart === undefined) return

        const { xScale, zoom: zoomEnabled, onPinchZoom } = this.#props()
        if (!zoomEnabled || onPinchZoom === undefined) return

        const [touch1Pos, touch2Pos] = pointersPosition(event, this.#element)
        const { chartsToPan, ...initialPinch } = this.#pinchZoomStart

        onPinchZoom(initialPinch, { touch1Pos, touch2Pos, xScale }, event)
    }

    #handlePinchZoomEnd = event => {
        this.#endGesture()
        if (this.#pinchZoomStart === undefined) return

        const { chartsToPan, ...initialPinch } = this.#pinchZoomStart
        const { zoom: zoomEnabled, onPinchZoomEnd } = this.#props()

        if (zoomEnabled && onPinchZoomEnd) onPinchZoomEnd(initialPinch, event)

        this.#pinchZoomStart = undefined
    }
}
