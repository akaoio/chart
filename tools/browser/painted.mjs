/**
 * Đo từng `<chart-canvas>` của trang: nó vẽ được gì, và nó có series nào không.
 *
 * Hàm này chạy **trong trình duyệt** — Playwright chuyển nó sang bên kia dưới dạng mã
 * nguồn, nên nó không được đóng gói biến nào ở ngoài. Nó ở đây vì cả bộ kiểm trình duyệt
 * lẫn bộ kiểm `_site` đều cần đúng phép đo ấy, và hai bản chép rời nhau thì sớm muộn cũng
 * lệch nhau về ngưỡng.
 *
 * Trước đây chỗ này chỉ đếm "có pixel nào không". Ngưỡng ấy quá rộng lượng, và nó đã để
 * lọt một lỗi thật: ba trang mất sạch series, chỉ còn hai cái trục — mà trục thôi cũng vẽ
 * ra vài nghìn pixel, nên bài vẫn xanh và trang vẫn được xuất bản.
 *
 * Nên bây giờ đo ba thứ:
 *
 * - `painted`: pixel không trong suốt trên cả khung. Có vẽ gì đó hay không.
 * - `inside`: pixel không trong suốt **bên trong vùng vẽ**, tức đã trừ bốn dải lề. Trục,
 *   vạch và chữ đều nằm ngoài dải ấy, và bộ trưng bày không bật đường lưới — nên con số
 *   này là "có vẽ dữ liệu hay không", và nó chính là con số bài kiểm cũ đã không hỏi.
 * - `series`: số phần tử `*-series` nằm trong canvas. Đếm ở DOM, nên nó bắt được cái sai
 *   trước cả khi bàn tới pixel: series bị đánh rơi lúc dựng thì bằng 0.
 *
 * Đo theo vùng chứ không theo màu là có lý do. Bản đầu tôi đếm pixel "có màu", định lấy
 * cái xám của trục ra khỏi phép đo — nhưng `chart-ohlc-series` mặc định tô đen khi hàng
 * chưa có `absoluteChange`, nên một series thật cũng có thể xám từ đầu đến cuối. Vùng vẽ
 * thì không phụ thuộc vào chuyện ấy.
 *
 * Hai phép đo pixel và DOM không thay thế nhau: một series có thật nhưng `yAccessor` sai
 * thì `series` vẫn là 1 mà `inside` tụt về 0.
 */
export const chartMeasurements = () =>
    [...document.querySelectorAll("chart-canvas")].map(canvas => {
        const series = [...canvas.querySelectorAll("*")].filter(node =>
            node.tagName.toLowerCase().endsWith("-series"),
        ).length

        const contexts = canvas.getCanvasContexts?.()
        if (!contexts) return { painted: 0, inside: 0, series }

        const { left = 0, right = 0, top = 0, bottom = 0 } = canvas.margin ?? {}
        const ratio = canvas.ratio ?? 1

        let painted = 0
        let inside = 0

        for (const key of ["bg", "axes", "mouseCoord"]) {
            const context = contexts[key]
            if (!context) continue

            const { width, height } = context.canvas

            const pixels = context.getImageData(0, 0, width, height).data
            for (let at = 3; at < pixels.length; at += 4) if (pixels[at] > 0) painted++

            // Vùng vẽ tính bằng pixel thật của canvas: lề khai báo theo pixel CSS.
            const x = Math.round(left * ratio)
            const y = Math.round(top * ratio)
            const plotWidth = Math.round(width - (left + right) * ratio)
            const plotHeight = Math.round(height - (top + bottom) * ratio)
            if (plotWidth <= 0 || plotHeight <= 0) continue

            const plot = context.getImageData(x, y, plotWidth, plotHeight).data
            for (let at = 3; at < plot.length; at += 4) if (plot[at] > 0) inside++
        }

        return { painted, inside, series }
    })
