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
 * Gộp nhiều lần gọi trong cùng một lượt thành một.
 *
 * Cấu hình một phần tử là gán liên tiếp cả chục property; nếu mỗi lần gán lại dựng lại
 * toàn bộ cây con thì lần dựng đầu nhìn thấy một cấu hình dở dang. Đợi hết microtask thì
 * cả loạt gán đã xong.
 */
export const batched = work => {
    let queued = false

    return () => {
        if (queued) return
        queued = true

        queueMicrotask(() => {
            queued = false
            work()
        })
    }
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

    /**
     * Một getter mà class tự viết thì phải được dùng, không bị che.
     *
     * Chỗ này cài accessor lên **chính instance**, mà thuộc tính trên instance che thuộc
     * tính trên prototype. Nên một class viết `get disablePan()` để trả về một phép tính
     * — chứ không phải giá trị thô — sẽ thấy getter ấy chưa từng được gọi, im lặng, không
     * dấu vết.
     *
     * Đã xảy ra thật: `MouseLocationIndicator` viết `get disablePan()` trả về
     * `enabled && disablePan`, nghĩa là "chỉ chặn pan trong lúc đang vẽ". Getter bị che nên
     * phần tử ấy chặn pan **mọi lúc** — cứ có một công cụ vẽ trên biểu đồ là không kéo được
     * khung nhìn nữa, bằng chuột lẫn bằng ngón tay. Xem issue #3.
     *
     * Nên nếu prototype đã có getter cùng tên thì dùng nó, và chỉ mượn phần setter.
     */
    const inherited = name => {
        let level = Object.getPrototypeOf(element)
        while (level !== null) {
            const descriptor = Object.getOwnPropertyDescriptor(level, name)
            if (descriptor !== undefined) return descriptor.get
            level = Object.getPrototypeOf(level)
        }
        return undefined
    }

    for (const name of new Set([...Object.keys(defaults), ...extra])) {
        const getter = inherited(name)

        Object.defineProperty(element, name, {
            get: getter === undefined ? () => props[name] : () => getter.call(element),
            set: value => {
                props[name] = value
                // Vài phần tử có thứ nhớ sẵn phụ thuộc vào prop — bề rộng chữ đã đo chẳng
                // hạn — nên chúng cần biết prop nào vừa đổi để bỏ cái nhớ ấy đi. Đây là
                // chỗ của `componentDidUpdate` bên bản gốc.
                element.propertyChanged?.(name, value)
                requestRedraw()
            },
            configurable: true,
            enumerable: true,
        })
    }

    return props
}
