# parity: `series`

Nguồn: `react-financial-charts@2.0.1` (`745c7c0`), `packages/series/src`. Port ở **bậc 3** — xem [#1](https://github.com/akaoio/chart/issues/1).

Ký hiệu: ☐ chưa làm · ☑ đã port, có bằng chứng · ⊘ cố ý bỏ (bắt buộc ghi lý do).

Một dòng chỉ được đánh ☑ khi đã có bằng chứng kèm theo — test số học, hoặc ảnh so sánh với story tương ứng của bản gốc. Đánh dấu xong mà không có bằng chứng là nói dối.

## Export runtime (25)

| export | loại | file nguồn | tt | ghi chú |
|---|---|---|:--:|---|
| `AlternateDataSeries` | const | `AlternateDataSeries.tsx` | ☐ | |
| `AlternatingFillAreaSeries` | class | `AlternatingFillAreaSeries.tsx` | ☐ | |
| `AreaOnlySeries` | class | `AreaOnlySeries.tsx` | ☐ | |
| `AreaSeries` | class | `AreaSeries.tsx` | ☐ | |
| `BarSeries` | class | `BarSeries.tsx` | ☐ | |
| `BollingerSeries` | class | `BollingerSeries.tsx` | ☐ | |
| `CandlestickSeries` | class | `CandlestickSeries.tsx` | ☐ | |
| `CircleMarker` | class | `markers/CircleMarker.tsx` | ☐ | |
| `ElderRaySeries` | class | `ElderRaySeries.tsx` | ☐ | |
| `GroupedBarSeries` | class | `GroupedBarSeries.tsx` | ☐ | |
| `KagiSeries` | class | `KagiSeries.tsx` | ☐ | |
| `LineSeries` | class | `LineSeries.tsx` | ☐ | |
| `MACDSeries` | class | `MACDSeries.tsx` | ☐ | |
| `OHLCSeries` | class | `OHLCSeries.tsx` | ☐ | |
| `PointAndFigureSeries` | class | `PointAndFigureSeries.tsx` | ☐ | |
| `RenkoSeries` | class | `RenkoSeries.tsx` | ☐ | |
| `RSISeries` | class | `RSISeries.tsx` | ☐ | |
| `SARSeries` | class | `SARSeries.tsx` | ☐ | |
| `ScatterSeries` | class | `ScatterSeries.tsx` | ☐ | |
| `Square` | class | `markers/SquareMarker.tsx` | ☐ | |
| `StackedBarSeries` | class | `StackedBarSeries.tsx` | ☐ | |
| `StochasticSeries` | class | `StochasticSeries.tsx` | ☐ | |
| `StraightLine` | class | `StraightLine.tsx` | ☐ | |
| `Triangle` | class | `markers/TriangleMarker.tsx` | ☐ | |
| `VolumeProfileSeries` | class | `VolumeProfileSeries.tsx` | ☐ | |

## Export chỉ-kiểu (26)

Không tồn tại khi chạy nên không cần port. Liệt kê vì chúng định nghĩa **hợp đồng props** của bản gốc — dùng làm nguồn tra cứu khi đặt tên attribute/property cho web component, rồi ghi lại chỗ nào cố ý đặt khác.

<details><summary>Danh sách</summary>

- `AlternateDataSeriesProps`
- `AlternatingFillAreaSeriesProps`
- `AreaOnlySeriesProps`
- `AreaSeriesProps`
- `BarSeriesProps`
- `BollingerSeriesProps`
- `CandlestickSeriesProps`
- `CircleMarkerProps`
- `ElderRaySeriesProps`
- `GroupedBarSeriesProps`
- `ICandle`
- `KagiSeriesProps`
- `LineSeriesProps`
- `MACDSeriesProps`
- `OHLCSeriesProps`
- `PointAndFigureSeriesProps`
- `RenkoSeriesProps`
- `RSISeriesProps`
- `SARSeriesProps`
- `ScatterSeriesProps`
- `SquareProps`
- `StackedBarSeriesProps`
- `StochasticSeriesProps`
- `StraightLineProps`
- `TriangleProps`
- `VolumeProfileSeriesProps`

</details>

## Lệch có chủ ý so với bản gốc

_Chưa có._ Mỗi khác biệt so với bản gốc phải ghi vào đây kèm lý do, ngay khi tạo ra nó.
