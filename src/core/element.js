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
/**
 * Hoãn một việc tới cuối lượt hiện tại — nhưng không bao giờ giữ vòng lặp sự kiện mãi.
 *
 * Đây là chỗ đáng nói nhất của cả file. `queueMicrotask` chạy **trước khi** trình duyệt lấy
 * lại quyền: một microtask hẹn thêm một microtask nữa thì chuỗi ấy không nhường lại lượt cho
 * ai cả. Trang không vẽ, không nhận thao tác, và **không refresh được** — người dùng phải
 * đóng tab. Đó không phải chậm, đó là chết.
 *
 * Mà chuỗi ấy rất dễ hình thành ở đây: ghi một prop thì hẹn dựng lại; dựng lại thì ghi prop
 * của con; con ghi prop thì lại hẹn. Chỉ cần một giá trị trong vòng ấy đổi mỗi lượt là chuỗi
 * không có điểm dừng. Người dùng báo đúng hiện tượng này.
 *
 * Nên: vài lượt đầu vẫn dùng microtask, vì đó là điều đúng cho việc gộp một loạt phép gán
 * liên tiếp. Quá `CHAIN_LIMIT` lượt **trong cùng một khung hình** thì chuyển sang
 * `requestAnimationFrame` — vòng lặp sự kiện được nhường lại, trang vẽ và vẫn bấm được.
 * Một vòng lặp còn sót lại sẽ biểu hiện thành "vẽ lại mỗi khung hình", tức là chậm và nhìn
 * thấy được, chứ không phải một tab chết không cứu được.
 *
 * Bộ đếm được đặt lại mỗi khung hình, nên hoạt động bình thường không bao giờ chạm tới ngưỡng.
 */
const CHAIN_LIMIT = 8

const deferred = work => {
    let queued = false
    let chain = 0
    let resetQueued = false

    const scheduleReset = () => {
        if (resetQueued) return
        resetQueued = true

        requestAnimationFrame(() => {
            chain = 0
            resetQueued = false
        })
    }

    return () => {
        if (queued) return
        queued = true
        chain++
        scheduleReset()

        const run = () => {
            queued = false
            work()
        }

        if (chain > CHAIN_LIMIT) requestAnimationFrame(run)
        else queueMicrotask(run)
    }
}

/**
 * Gộp nhiều lần gọi trong cùng một lượt thành một.
 *
 * Cấu hình một phần tử là gán liên tiếp cả chục property; nếu mỗi lần gán lại dựng lại
 * toàn bộ cây con thì lần dựng đầu nhìn thấy một cấu hình dở dang. Đợi hết microtask thì
 * cả loạt gán đã xong.
 */
export const batched = work => deferred(work)

/**
 * Give an element a settable JS property per configuration key, each one asking for a
 * redraw when written. `defaults` supplies both the initial values and the key list;
 * `extra` names properties that have no default.
 */
export const defineProperties = (element, defaults = {}, extra = []) => {
    const props = { ...defaults }

    /**
     * Redraw once per batch, not once per property.
     *
     * Configuring an element means writing a dozen properties in a row; redrawing on each
     * would repaint the whole chart a dozen times, and the first of those would land
     * before the chart has worked out what it is showing. Waiting for the microtask lets
     * the whole assignment land first — qua `deferred`, nên một chuỗi ghi-vẽ-ghi không thể
     * giữ vòng lặp sự kiện mãi.
     */
    const requestRedraw = deferred(() => {
        if (element.isConnected && element.canvas?.getState?.() != null) element.canvas.redraw()
    })

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
                /**
                 * Ghi lại đúng giá trị đang có thì không phải một thay đổi.
                 *
                 * Không có phép so này thì mỗi lượt ghi đều phát `propertyChanged` và hẹn một
                 * redraw — kể cả khi giá trị y nguyên. Mà `propertyChanged` của các công cụ
                 * vẽ là "dựng lại cây con", và dựng lại thì ghi lại toàn bộ prop của con.
                 * Vòng ấy tự nuôi: ghi → dựng lại → ghi → dựng lại, khoảng mười lượt mỗi
                 * giây, mãi mãi.
                 *
                 * Đo được trên trang trưng bày công cụ vẽ: một cú chạm khiến `onSelect` của
                 * trang ghi lại danh sách của cả bảy công cụ, và từ đó biểu đồ không bao giờ
                 * đứng lại — 37 lần redraw trong 3 giây sau khi tay đã rời ra. Trên điện
                 * thoại thì đó là đơ. Người dùng thấy nó cùng lúc với chữ "Click to select
                 * object", vì cả hai đều cần một đối tượng đã vẽ.
                 *
                 * `===` là đủ và cũng là đúng: một danh sách vừa `map` ra là một mảng mới nên
                 * vẫn khác, đúng như nó phải khác; còn số, chuỗi, và hàm đã bind thì bằng
                 * nhau khi chúng thật sự không đổi.
                 */
                if (props[name] === value) return

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
