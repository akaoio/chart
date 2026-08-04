# parity: `coordinates`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/coordinates/src`. Port ở **bậc 4** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

## Export runtime (8) — đã làm **8**

| export | file nguồn | tt | bằng chứng |
|---|---|:--:|---|
| `CrossHairCursor` | `CrossHairCursor.tsx` | ☑ | 2 bài chuỗi lệnh: bám điểm và tự do |
| `Cursor` | `Cursor.tsx` | ☑ | 5 bài: đầy đủ, bỏ trục y, dạng dải, dải có nét đứt, và khi con trỏ ra ngoài |
| `CurrentCoordinate` | `CurrentCoordinate.tsx` | ☑ | 2 bài |
| `MouseCoordinateX` | `MouseCoordinateX.tsx` | ☑ | 3 bài: dưới, trên, không bám điểm |
| `MouseCoordinateXV2` | `MouseCoordinateXV2.tsx` | ☑ | 2 bài |
| `MouseCoordinateY` | `MouseCoordinateY.tsx` | ☑ | 4 bài, gồm cả khi con trỏ ở pane khác |
| `PriceCoordinate` | `PriceCoordinate.tsx` | ☑ | 3 bài, gồm cả giá nằm ngoài khung nhìn |
| `EdgeIndicator` | `EdgeIndicator.tsx` | ☑ | 3 bài: cuối, đầu, và trải hết bề ngang |

Nội bộ: `EdgeCoordinateV3` (phần vẽ dùng chung) đã port thành `edgeGeometry` + `drawEdgeCoordinate`. `EdgeCoordinate` và `EdgeCoordinateV2` — hai bản cũ hơn còn sót trong repo gốc nhưng **không được export và không nơi nào dùng** — ⊘ bỏ.

## Bằng chứng

Cùng cách của bậc 3: chuỗi lệnh canvas so từng lệnh một. Nhóm này chỉ vẽ khi con trỏ đang ở đâu đó, nên dữ liệu kiểm mang theo trạng thái chuột thật (`show`, `mouseXY`, `currentItem`, `currentCharts`) — kể cả các trạng thái mà **đúng ra phải không vẽ gì**: con trỏ rời chart, con trỏ ở pane khác, giá vượt khỏi khung nhìn.

Đã kiểm rằng bộ này biết fail:

| sửa hỏng chỗ nào | số giá trị lệch |
|---|---:|
| bỏ bù `strokeWidth` khi canh dọc hộp nhãn | 20 |
| `PriceCoordinate` luôn hiện dù ngoài khung nhìn | 16 |
| `MouseCoordinateY` bỏ lọc theo pane | 11 |
| bỏ đệm 10px của hộp co theo chữ | 8 |
| `Cursor` bỏ nửa pixel của đường ngang | 3 |

## Lệch có chủ ý so với bản gốc

`Cursor`, `CrossHairCursor` và `HoverTooltip` của bản gốc đọc `margin`/`ratio` từ `ChartCanvasContext`. Ở đây chúng nhận qua props (phần tử lấy sẵn từ canvas) **hoặc** qua `moreProps` — vì margin và tỉ lệ màn hình là chuyện của cả chart, không của riêng con trỏ.
