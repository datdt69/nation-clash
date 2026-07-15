# Đường Đua Kinh Tế

Game `.io` nguyên bản cho bài thuyết trình **Kinh tế thị trường định hướng XHCN ở Việt Nam**. Tối đa 8 người chơi realtime; host chiếu toàn bản đồ, mỗi điện thoại là một bộ điều khiển.

## Trải nghiệm người chơi

- Xe tự chạy; chỉ giữ **Trái** hoặc **Phải** để đổi hướng.
- Mũi tên lớn luôn chỉ mục tiêu hiện tại.
- Khi chưa có hàng: đi tới điểm nhận hàng đang phát sáng.
- Khi có hàng: giao tới điểm cùng màu.
- Va chạm với biên hoặc tuyến khác chỉ khiến hồi sinh sau 1,2 giây, không bị loại.
- Trước trận có hướng dẫn trực quan ba bước, không cần đọc tài liệu.

Ba loại nhiệm vụ tạo ba chỉ số:

- Sản xuất → GDP.
- Thuốc và an sinh → phúc lợi.
- Thiết bị hạ tầng → ổn định.

Mỗi lần giao hàng đóng góp vào quỹ chung. Quỹ đầy nâng cấp hạ tầng cho mọi đội. Cuối trận công bố GDP cao nhất và phát triển toàn diện nhất.

## Chạy local

```bash
npm ci
npm test
npm start
```

Mở `http://localhost:3000`. Trận mặc định kéo dài 6 phút; đổi bằng biến `MATCH_SECONDS`.

## Deploy Render

Repo có `render.yaml`: build `npm ci`, start `npm start`, health check `/health`.
