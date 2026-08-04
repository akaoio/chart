/**
 * Cửa vào gộp — tương ứng `packages/charts` của bản gốc, vốn cũng chỉ là một file
 * re-export không chứa logic.
 *
 * Mỗi vùng được thêm vào đây khi bậc tương ứng hoàn tất và có bằng chứng parity.
 * Xem docs/parity/ để biết chính xác chỗ nào đã xong.
 */

// bậc 1
export * from "./scales/index.js"

export const version = "0.0.0"
