/**
 * So sánh phần vẽ bằng **SVG**, thay vì bằng lệnh canvas.
 *
 * Gần hết `tooltip` và cả `annotations` không vẽ lên canvas — chúng trả về node SVG, để
 * chữ trong tooltip là chữ thật: bôi đen được, đọc màn hình đọc được, CSS chỉnh được.
 * Chuỗi lệnh canvas không nói gì về chúng.
 *
 * Nên bậc 4 cần cách chứng minh thứ hai: quy cây SVG về một dạng chung rồi so.
 *
 * Điểm mấu chốt vẫn như cũ — **một hàm quy chuẩn duy nhất, dùng cho cả hai phía**. Bản
 * gốc trả về phần tử React, bản port trả về node DOM thật; hàm này nhận cả hai và cho ra
 * cùng một dạng `{ tag, attrs, children }`. Không có hai bộ luật để lệch nhau.
 *
 * Tên thuộc tính được quy về dạng của DOM (`strokeWidth` → `stroke-width`,
 * `className` → `class`), vì đó là dạng thật sự đi vào tài liệu.
 */

const KEBAB = /[A-Z]/g

/** React viết camelCase, SVG thật dùng gạch nối. Vài tên là ngoại lệ. */
const KEEP_AS_IS = new Set(["viewBox", "preserveAspectRatio", "textLength", "lengthAdjust", "gradientTransform"])

const normalizeName = name => {
    if (name === "className") return "class"
    if (KEEP_AS_IS.has(name)) return name
    return name.replace(KEBAB, letter => `-${letter.toLowerCase()}`)
}

/** Không phải thuộc tính: khoá riêng của React, handler, và giá trị rỗng. */
const isAttribute = (name, value) => {
    if (name === "key" || name === "ref" || name === "children") return false
    if (name.startsWith("on") && typeof value === "function") return false
    if (value === undefined || value === null || value === false) return false
    return typeof value !== "function"
}

const tidyValue = value => {
    if (typeof value === "number") return String(Math.round(value * 1e6) / 1e6)
    return String(value)
}

const isReactElement = node => node !== null && typeof node === "object" && node.$$typeof !== undefined
const isDomNode = node => node !== null && typeof node === "object" && typeof node.nodeType === "number"

/**
 * Quy một cây SVG — React hay DOM — về `{ tag, attrs, children }`.
 *
 * Component tuỳ biến của bản gốc (ToolTipText, ToolTipTSpanLabel…) được dựng rồi gọi
 * `render()`, giống cách làm ở phần canvas: mục tiêu là so **kết quả cuối**, chứ không
 * so cách hai bên chia component.
 */
export const normalizeSvg = node => {
    if (node === null || node === undefined || node === false || node === true) return null

    if (Array.isArray(node)) {
        const children = node.map(normalizeSvg).filter(each => each !== null)
        return children.length === 0 ? null : children
    }

    if (typeof node === "string" || typeof node === "number") {
        const text = String(node)
        return text.trim() === "" ? null : { text }
    }

    if (isDomNode(node)) {
        if (node.nodeType === 3) {
            const text = node.nodeValue
            return text.trim() === "" ? null : { text }
        }
        if (node.nodeType !== 1) return null

        const attrs = {}
        for (const attribute of node.attributes) {
            attrs[normalizeName(attribute.name)] = tidyValue(attribute.value)
        }

        const children = [...node.childNodes].map(normalizeSvg).filter(each => each !== null)

        return { tag: node.localName, attrs, children: children.flat() }
    }

    // Bản port trả về **mô tả** chứ không phải node DOM, để chạy được trong Node — cùng
    // lý do phần vẽ canvas được tách khỏi phần tử ở bậc 3.
    if (typeof node === "object" && typeof node.tag === "string") {
        const attrs = {}
        for (const [name, value] of Object.entries(node.attrs ?? {})) {
            if (isAttribute(name, value)) attrs[normalizeName(name)] = tidyValue(value)
        }

        const children = normalizeSvg(node.children ?? [])
        const list = children === null ? [] : Array.isArray(children) ? children.flat() : [children]

        return { tag: node.tag, attrs, children: list }
    }

    if (isReactElement(node)) {
        const { type, props } = node

        // Component tuỳ biến: dựng lên rồi lấy kết quả render
        if (typeof type === "function") {
            const merged = { ...type.defaultProps, ...props }
            return normalizeSvg(type.prototype?.render ? new type(merged).render() : type(merged))
        }

        const attrs = {}
        for (const [name, value] of Object.entries(props ?? {})) {
            if (isAttribute(name, value)) attrs[normalizeName(name)] = tidyValue(value)
        }

        const children = normalizeSvg(props?.children)
        const list = children === null ? [] : Array.isArray(children) ? children.flat() : [children]

        return { tag: String(type), attrs, children: list }
    }

    return null
}
