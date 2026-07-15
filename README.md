# Xây Việt Nam 2045

Game Stack realtime một chạm cho bài thuyết trình **Kinh tế thị trường định hướng XHCN ở Việt Nam**. Tối đa 8 nhóm, mỗi nhóm cử một đại diện. Người chơi không cần biết kiến thức trước khi vào game.

## Luật chơi

Khối chạy ngang. Chạm màn hình hoặc nhấn `Space` để thả. Phần đặt lệch bị cắt; đặt càng chuẩn thì công trình càng dễ xây cao.

Các khối đại diện cho sản xuất, thị trường, phúc lợi, hạ tầng công và ổn định. Mỗi phút có một biến cố. Công trình có GDP cao nhưng phúc lợi hoặc ổn định quá thấp sẽ mất tầng. Cuối trận công bố hai đội:

- Tăng trưởng cao nhất.
- Phát triển toàn diện nhất.

Trận mặc định kéo dài 6 phút. Đặt biến môi trường `MATCH_SECONDS` để thay đổi.

## Chạy local

```bash
npm ci
npm test
npm start
```

Mở `http://localhost:3000`. Host tạo phòng và chiếu QR; người vào trước tự nhận đội trước.

## Deploy Render

Repo có sẵn `render.yaml`:

- Build: `npm ci`
- Start: `npm start`
- Health check: `/health`
