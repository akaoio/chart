/**
 * The DOM half of the original `core/src/utils/index.ts`.
 *
 * Kept separate from the pure half so that everything provable by arithmetic stays
 * importable without a browser, and so it is obvious which functions need one.
 */

/** The window a node belongs to — the node itself if it already is one. */
export const d3Window = node =>
    node && ((node.ownerDocument && node.ownerDocument.defaultView) || (node.document && node) || node.defaultView)

/**
 * Where a pointer event landed, in the target's own coordinates.
 *
 * This is `d3-selection`'s `pointer`, ported so the dependency can go. For anything
 * inside an SVG the answer has to come from the screen transform matrix — the element's
 * bounding box would ignore viewBox scaling and any transform above it.
 */
export const pointerPosition = (event, node = event.currentTarget) => {
    if (node) {
        const svg = node.ownerSVGElement || node
        if (svg.createSVGPoint) {
            let point = svg.createSVGPoint()
            point.x = event.clientX
            point.y = event.clientY
            point = point.matrixTransform(node.getScreenCTM().inverse())
            return [point.x, point.y]
        }
        if (node.getBoundingClientRect) {
            const rect = node.getBoundingClientRect()
            return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop]
        }
    }
    return [event.pageX, event.pageY]
}

/** The same, for every active touch. */
export const pointersPosition = (event, node = event.currentTarget) => {
    const touches = event.touches ? [...event.touches] : [event]
    return touches.map(touch => pointerPosition(touch, node))
}

export const getTouchProps = touch => ({
    pageX: touch.pageX,
    pageY: touch.pageY,
    clientX: touch.clientX,
    clientY: touch.clientY,
})

/** Pointer position relative to the element the handler is attached to, rounded. */
export const mousePosition = (event, defaultRect) => {
    const container = event.currentTarget
    const rect = defaultRect ?? container.getBoundingClientRect()
    return [
        Math.round(event.clientX - rect.left - container.clientLeft),
        Math.round(event.clientY - rect.top - container.clientTop),
    ]
}

export const touchPosition = (touch, event) => {
    const container = event.currentTarget
    const rect = container.getBoundingClientRect()
    return [
        Math.round(touch.clientX - rect.left - container.clientLeft),
        Math.round(touch.clientY - rect.top - container.clientTop),
    ]
}

/**
 * Wipe canvases back to blank.
 *
 * The transform is reset first because drawing code leaves its own translate in place,
 * and clearing through someone else's transform misses part of the canvas. The device
 * pixel ratio goes back on afterwards so the next drawing starts where it expects to.
 */
export const clearCanvas = (contexts, ratio) => {
    contexts.forEach(context => {
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(-1, -1, context.canvas.width + 2, context.canvas.height + 2)
        context.scale(ratio, ratio)
    })
}
