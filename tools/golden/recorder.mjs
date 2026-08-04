/**
 * Canvas giả chỉ để ghi lại lệnh.
 *
 * Từ bậc 3 trở đi thứ cần chứng minh là **hình vẽ**, mà hình vẽ trên canvas chính là một
 * chuỗi lệnh. Nên thay vì chụp ảnh rồi so pixel — chậm, cần trình duyệt, và sai lệch một
 * pixel thì không biết vì sao — ta cho cả bản gốc lẫn bản port vẽ vào cùng một canvas giả
 * rồi so **đúng từng lệnh một**.
 *
 * Chính xác hơn so ảnh chứ không kém: cùng chuỗi lệnh thì cùng pixel, mà lệch ở đâu thì
 * chỉ ra được ngay lệnh thứ mấy, chứ không phải "có 37 pixel khác nhau".
 */

/** Thuộc tính có thể gán; ghi lại lần gán thay vì bỏ qua. */
const WRITABLE = new Set([
    "fillStyle",
    "strokeStyle",
    "lineWidth",
    "lineCap",
    "lineJoin",
    "miterLimit",
    "lineDashOffset",
    "font",
    "textAlign",
    "textBaseline",
    "globalAlpha",
    "globalCompositeOperation",
    "shadowBlur",
    "shadowColor",
    "shadowOffsetX",
    "shadowOffsetY",
    "filter",
    "imageSmoothingEnabled",
])

/** Số làm tròn tới 1e-6: khác biệt dưới mức đó không thành pixel, chỉ thành nhiễu. */
const tidy = value => {
    if (typeof value === "number") {
        if (!Number.isFinite(value)) return String(value)
        return Math.round(value * 1e6) / 1e6
    }
    if (Array.isArray(value)) return value.map(tidy)
    if (value instanceof Date) return value.toISOString()
    if (value && typeof value === "object") return "«object»"
    if (typeof value === "function") return "«function»"
    return value
}

export const createRecorder = ({ width = 800, height = 400 } = {}) => {
    const calls = []

    const measured = { width: 42, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }

    const context = {
        canvas: { width, height },
        calls,

        // Trả về giá trị chứ không phải undefined, vì mã vẽ có đọc lại
        measureText: text => {
            calls.push(["measureText", tidy(text)])
            return measured
        },
        createLinearGradient: (...args) => {
            calls.push(["createLinearGradient", ...args.map(tidy)])
            return { addColorStop: (...stop) => calls.push(["gradient.addColorStop", ...stop.map(tidy)]) }
        },
        getLineDash: () => [],
    }

    const record = name =>
        (...args) => {
            calls.push([name, ...args.map(tidy)])
        }

    for (const name of [
        "save",
        "restore",
        "beginPath",
        "closePath",
        "moveTo",
        "lineTo",
        "bezierCurveTo",
        "quadraticCurveTo",
        "arc",
        "arcTo",
        "ellipse",
        "rect",
        "roundRect",
        "fill",
        "stroke",
        "clip",
        "fillRect",
        "strokeRect",
        "clearRect",
        "fillText",
        "strokeText",
        "translate",
        "rotate",
        "scale",
        "transform",
        "setTransform",
        "resetTransform",
        "setLineDash",
        "drawImage",
    ]) {
        context[name] = record(name)
    }

    return new Proxy(context, {
        get(target, key) {
            if (key in target) return target[key]
            if (WRITABLE.has(key)) return target[`_${String(key)}`]

            // Bất cứ thứ gì chưa liệt kê vẫn ghi lại, để không có lệnh nào lọt qua im lặng
            return record(String(key))
        },
        set(target, key, value) {
            if (WRITABLE.has(key)) {
                target[`_${String(key)}`] = value
                calls.push([`set ${String(key)}`, tidy(value)])
                return true
            }
            target[key] = value
            return true
        },
    })
}
