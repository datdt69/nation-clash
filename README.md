# Nation Clash

Web game realtime cho lớp học khoảng 50 người, chia thành 8 nhóm và cử 8 đại diện, thời lượng một ván 12–15 phút. Host tạo phòng và chiếu mã QR; mỗi đại diện chọn đúng đội của mình rồi điều khiển quyết định trên điện thoại sau khi thảo luận với nhóm.

## Gameplay

Mỗi ván có 6 biến cố kinh tế. Trong từng vòng:

1. Thành viên bỏ phiếu chọn một trong bốn chính sách: tăng trưởng, an sinh, hạ tầng hoặc đầu cơ.
2. Mỗi đội được ghép với một đối thủ và bí mật chọn **Bắt tay** hoặc **Chơi rắn**.
3. Server tính GDP, an sinh, ổn định và công bố bảng xếp hạng realtime.

Game trao hai danh hiệu cuối trận:

- Quán quân tăng trưởng: GDP cao nhất.
- Quán quân phát triển toàn diện: `45% GDP + 30% an sinh + 25% ổn định`.

Sự khác nhau giữa hai kết quả là điểm chốt để dẫn vào phần kinh tế thị trường định hướng XHCN.

## Chạy trên máy

Yêu cầu Node.js 20 trở lên.

```bash
npm install
npm test
npm start
```

Mở `http://localhost:3000`. Nếu muốn điện thoại cùng Wi-Fi truy cập, mở bằng IP LAN của máy host, ví dụ `http://192.168.1.10:3000`, và cho phép cổng 3000 qua firewall.

## Đưa lên Internet

Ứng dụng là một Node.js server dùng Socket.IO, không cần database. Có thể deploy trực tiếp lên Render, Railway, Fly.io hoặc nền tảng hỗ trợ WebSocket khác.

Thiết lập tối thiểu:

- Build command: `npm ci`
- Start command: `npm start`
- Health check: `/health`
- Biến môi trường: `NODE_ENV=production`

Repository có sẵn `Dockerfile` và `render.yaml`. Phòng chỉ được giữ trong bộ nhớ và tự xóa sau 3 giờ; khi server khởi động lại, các phòng đang chạy sẽ mất.

## Điều chỉnh thời gian

Mặc định mỗi vòng gồm 32 giây chọn chính sách, 24 giây đối đầu và 14 giây xem kết quả. Có thể đổi bằng biến môi trường:

```bash
POLICY_SECONDS=25
DUEL_SECONDS=18
REVEAL_SECONDS=10
```

## Kiểm tra trước khi lên lớp

1. Tạo phòng bằng laptop sẽ dùng để trình chiếu.
2. Cho 5–10 điện thoại thử vào bằng QR.
3. Chạy hết một ván và kiểm tra mạng Wi-Fi tại lớp.
4. Khi tổ chức chính thức, host có nút bỏ qua thời gian và kết thúc trận nếu cần.
