# Vietnam 2045 – Realtime Economic Arena

Game multiplayer cho phần thuyết trình **Kinh tế thị trường định hướng XHCN ở Việt Nam**. Tối đa 8 nhóm, mỗi nhóm cử một đại diện. Host tạo phòng, chiếu QR và bản đồ lên màn hình lớp.

## Gameplay

- WASD/phím mũi tên hoặc joystick điện thoại để di chuyển.
- Thu thập **vốn**, **lao động**, **công nghệ** và mang về căn cứ.
- Nhấn `Space`/nút **HÚC** để dash, làm đối thủ rơi một phần hàng.
- Đứng trong khu sản xuất, hợp tác xã hoặc trung tâm đổi mới để chiếm quyền kiểm soát.
- Mỗi lần giao hàng đóng góp vào quỹ chung; đủ quỹ sẽ tự động xây hạ tầng và tăng chỉ số cho mọi đội.
- Cú sốc chuỗi cung ứng trừng phạt nền kinh tế thiếu ổn định.
- Hai bảng thắng: GDP cao nhất và phát triển toàn diện nhất.

Trận mặc định kéo dài 7 phút. Có thể đặt biến môi trường `MATCH_SECONDS` để đổi thời lượng.

## Chạy local

```bash
npm ci
npm test
npm start
```

Mở `http://localhost:3000`.

## Deploy Render

Repo có sẵn `render.yaml`. Dùng Blueprint của Render hoặc tạo Web Service với:

- Build command: `npm ci`
- Start command: `npm start`
- Health check: `/health`

Socket.IO cần một tiến trình server chạy liên tục; không deploy game này như static site.
