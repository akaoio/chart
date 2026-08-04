/**
 * JSON hoá không đánh mất thông tin.
 *
 * `JSON.stringify` bỏ lặng khoá có giá trị `undefined` và biến `NaN`/`Infinity` thành
 * `null`. Nếu để nguyên, một bản port trả `null` ở chỗ bản gốc trả `undefined` sẽ khớp
 * golden data một cách hoàn hảo — test xanh mà sai. Chính xác kiểu lỗ hổng khiến test
 * trở nên vô nghĩa.
 *
 * Nên mọi giá trị JSON không diễn tả được đều đổi thành chuỗi đánh dấu, thấy được bằng
 * mắt khi đọc file fixture.
 */

export const replacer = (key, value) => {
    if (value === undefined) return "·undefined·"
    if (typeof value === "number") {
        if (Number.isNaN(value)) return "·NaN·"
        if (value === Infinity) return "·Infinity·"
        if (value === -Infinity) return "·-Infinity·"
        // -0 và 0 khác nhau khi chia, mà JSON viết cả hai thành "0"
        if (value === 0 && Object.is(value, -0)) return "·-0·"
    }
    if (typeof value === "function") return "·function·"
    if (typeof value === "bigint") return `·bigint:${value}·`
    return value
}

export const stringify = value => JSON.stringify(value, replacer, 1)

/** Chuẩn hoá qua đúng đường đi của fixture, để so sánh là so cùng một dạng. */
export const normalize = value => JSON.parse(stringify(value))
