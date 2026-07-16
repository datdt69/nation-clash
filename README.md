# Sàn Kinh Tế

Trò chơi giao dịch cổ phiếu mô phỏng theo thời gian thực dành cho lớp học. Tối đa 56 người chia thành 8 đội, mỗi đội tối đa 7 thành viên và dùng chung một danh mục.

> Các quốc gia, mã và mức giá trong game chỉ là dữ liệu mô phỏng phục vụ học tập, không phải dữ liệu chứng khoán hay khuyến nghị đầu tư.

## Luật chơi

- Người điều khiển tạo phòng, chiếu mã QR và mã phòng lên màn hình lớn.
- Host có thể mở thị trường ngay từ 1 người để kiểm thử.
- Tối đa 56 người tham gia bằng điện thoại, chọn một trong 8 đội; mỗi đội nhận `100.000` vốn mô phỏng.
- Mười hai mã đại diện cho mười hai ngành/quốc gia và liên kết với nhau theo chuỗi cung ứng, từ công nghệ, bán dẫn, dầu mỏ và logistics đến năng lượng, nông nghiệp, thực phẩm và y tế.
- Giá thay đổi mỗi giây theo nhiễu thị trường, cung–cầu, thanh khoản, giao dịch của người chơi và sự kiện kinh tế.
- Sự kiện đầu xuất hiện sau 15 giây; sau đó máy chủ chọn ngẫu nhiên 1–3 sự kiện theo chu kỳ host cấu hình (mặc định 60 giây).
- Trong lúc sự kiện diễn ra, người chơi chỉ thấy nội dung tình huống để tự suy luận ngành nào tăng hoặc giảm; mapping tác động và hệ số số học được giữ kín ở máy chủ.
- Sau khi sự kiện kết thúc, game công bố một phân tích ngắn về cách hai mô hình phản ứng.
- Không cho phép bán khống. Mỗi giao dịch chịu phí mô phỏng `0,15%`.
- Danh mục hiển thị tiền đã mua, giá vốn, giá hiện tại, lãi/lỗ chưa chốt, lãi/lỗ đã chốt và nút bán nhanh.
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
