/**
 * Đếm pixel đã vẽ trên mọi `<chart-canvas>` của trang.
 *
 * Hàm này chạy **trong trình duyệt** — Playwright chuyển nó sang bên kia dưới dạng mã
 * nguồn, nên nó không được đóng gói biến nào ở ngoài. Nó ở đây vì cả bộ kiểm trình duyệt
 * lẫn bộ kiểm `_site` đều cần đúng phép đo ấy, và hai bản chép rời nhau thì sớm muộn cũng
 * lệch nhau về ngưỡng.
 */
export const paintedPixels = () =>
    [...document.querySelectorAll("chart-canvas")].map(canvas => {
        const contexts = canvas.getCanvasContexts?.()
        if (!contexts) return 0

        let painted = 0
        for (const key of ["bg", "axes", "mouseCoord"]) {
            const context = contexts[key]
            if (!context) continue

            const pixels = context.getImageData(0, 0, context.canvas.width, context.canvas.height).data
            for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) painted++
        }
        return painted
    })
