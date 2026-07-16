# Sàn Kinh Tế

Trò chơi giao dịch cổ phiếu mô phỏng theo thời gian thực dành cho lớp học. Tối đa 8 đội cùng mua và bán 8 mã thị trường để quan sát cách nhóm thị trường tư bản chủ nghĩa và nhóm thị trường định hướng xã hội chủ nghĩa phản ứng trước cùng một cú sốc kinh tế.

> Các quốc gia, mã và mức giá trong game chỉ là dữ liệu mô phỏng phục vụ học tập, không phải dữ liệu chứng khoán hay khuyến nghị đầu tư.

## Luật chơi

- Người điều khiển tạo phòng, chiếu mã QR và mã phòng lên màn hình lớn.
- 2–8 đội tham gia bằng điện thoại, mỗi đội nhận `100.000` vốn mô phỏng.
- Tám mã gồm `USX`, `JPX`, `DEX`, `UKX`, `VNX`, `CNX`, `LAX`, `CBX`.
- Giá thay đổi mỗi giây theo nhiễu thị trường, cung–cầu, thanh khoản, giao dịch của người chơi và sự kiện kinh tế.
- Đúng mỗi 60 giây, máy chủ chọn ngẫu nhiên 1–3 sự kiện.
- Trong lúc sự kiện diễn ra, người chơi chỉ thấy nội dung; hệ số tác động được giữ kín hoàn toàn ở máy chủ.
- Sau khi sự kiện kết thúc, game công bố một phân tích ngắn về cách hai mô hình phản ứng.
- Không cho phép bán khống. Mỗi giao dịch chịu phí mô phỏng `0,15%`.
- Thị trường đóng sau 10 phút. Đội có tổng tiền mặt cộng giá trị cổ phiếu cao nhất chiến thắng.

## Kiến trúc

- Node.js + Express
- Socket.IO cho phòng và đồng bộ trạng thái realtime
- Engine giá/sự kiện chạy hoàn toàn phía máy chủ
- Giao diện thuần HTML, CSS và JavaScript, không tải thư viện giao diện bên ngoài
- QR Code tạo trực tiếp khi mở phòng

## Chạy trên máy

```bash
npm ci
npm start
```

Mở `http://localhost:3000`.

## Kiểm thử

```bash
npm test
```

Bộ test bao phủ engine thị trường, quyền riêng tư danh mục, mua/bán, chu kỳ sự kiện, giới hạn 8 đội và luồng Socket.IO thực tế.

## Deploy Render

Repo giữ nguyên `render.yaml` và `Dockerfile`. Kết nối repo với Render bằng Blueprint hoặc Web Service, sau đó bật Auto Deploy cho nhánh cần triển khai.
