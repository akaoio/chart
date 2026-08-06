export * from "./indicator/index.js"

/**
 * lineBreak và rangeBars đi thẳng từ calculator: chúng ĐỔI SỐ HÀNG (mỗi
 * vạch/thanh gộp nhiều cây nến) nên không mặc áo indicator được — bộ merge
 * của indicator trải kết quả theo từng hàng, mà ở đây hàng ra không còn
 * ứng 1–1 với hàng vào.
 */
export { lineBreak, rangeBars } from "./calculator/index.js"
