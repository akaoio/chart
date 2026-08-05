/**
 * Cửa vào gộp — tương ứng `packages/charts` của bản gốc, vốn cũng chỉ là một file
 * re-export không chứa logic.
 *
 * Mỗi vùng được thêm vào đây khi bậc tương ứng hoàn tất và có bằng chứng parity.
 * Xem docs/parity/ để biết chính xác chỗ nào đã xong.
 */

// bậc 1
export * from "./scales/index.js"

// bậc 2
export * from "./core/index.js"
export * from "./utils/index.js"

// bậc 3
export * from "./axes/index.js"
export * from "./series/index.js"

// bậc 6
export * from "./interactive/index.js"

// bậc 5
export * from "./indicators/index.js"

// bậc 4
export * from "./coordinates/index.js"
export * from "./tooltip/index.js"
export * from "./annotations/index.js"
