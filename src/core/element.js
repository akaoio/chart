/**
 * Cho phép nạp mã của một phần tử ở nơi không có DOM.
 *
 * `class X extends HTMLElement` nổ ngay lúc định nghĩa lớp nếu `HTMLElement` không tồn
 * tại — mà bộ kiểm golden chạy trong Node và cần import chính những file ấy để lấy hàm
 * vẽ. Hàm vẽ không đụng DOM; chỉ cái vỏ phần tử mới cần.
 *
 * Nên ở nơi không có DOM, lớp nền thành một lớp rỗng và `define` không làm gì. Phần tử
 * không dùng được ở đó, và không ai định dùng; hàm vẽ thì nạp được, đó mới là điều cần.
 *
 * Cách này giữ được mỗi series một file, phản chiếu 1:1 cấu trúc bản gốc, thay vì phải
 * tách đôi mọi file chỉ để né một dòng `extends`.
 */

export const ElementBase = globalThis.HTMLElement ?? class {}

export const define = (name, constructor) => {
    if (typeof customElements === "undefined") return
    if (customElements.get(name)) return

    customElements.define(name, constructor)
}

/**
 * Give an element a settable JS property per configuration key, each one asking for a
 * redraw when written. `defaults` supplies both the initial values and the key list;
 * `extra` names properties that have no default.
 */
export const defineProperties = (element, defaults = {}, extra = []) => {
    const props = { ...defaults }
    let queued = false

    /**
     * Redraw once per batch, not once per property.
     *
     * Configuring an element means writing a dozen properties in a row; redrawing on each
     * would repaint the whole chart a dozen times, and the first of those would land
     * before the chart has worked out what it is showing. Waiting for the microtask lets
     * the whole assignment land first.
     */
    const requestRedraw = () => {
        if (queued) return
        queued = true

        queueMicrotask(() => {
            queued = false
            if (element.isConnected && element.canvas?.getState?.() != null) element.canvas.redraw()
        })
    }

    for (const name of new Set([...Object.keys(defaults), ...extra])) {
        Object.defineProperty(element, name, {
            get: () => props[name],
            set: value => {
                props[name] = value
                requestRedraw()
            },
            configurable: true,
            enumerable: true,
        })
    }

    return props
}
