# Bàn Cờ Kinh Tế

Game bluff realtime cho bài thuyết trình **Kinh tế thị trường định hướng XHCN ở Việt Nam**. Tối đa 8 nhóm, mỗi nhóm cử một đại diện giữ tay bài bí mật.

## Luật trong 20 giây

1. Mỗi vòng bàn yêu cầu một loại lá: **Thị trường**, **An sinh** hoặc **Nhà nước**.
2. Đến lượt, chọn 1–3 lá, úp xuống và tuyên bố tất cả đều là loại đang được yêu cầu. Người chơi được phép nói dối.
3. Đội kế tiếp có thể đánh tiếp hoặc bấm **Tố gian**.
4. Nếu tố đúng, người nói dối mất uy tín. Nếu tố sai, người tố mất uy tín.
5. Lá **Đổi mới** thay được mọi loại.

Mỗi lượt có 12 giây. Sau tối đa sáu lượt đánh, vòng tự chốt để tổng thời lượng phù hợp phần trình bày 10–15 phút. Vòng có đủ cả ba trụ thị trường–an sinh–Nhà nước thưởng điểm cân bằng cho tất cả đội.

## Chạy local

```bash
npm ci
npm test
npm start
```

Mở `http://localhost:3000`. Host tạo phòng và chiếu QR; người vào trước tự nhận đội trước.

## Deploy Render

Repo có sẵn `render.yaml`: build `npm ci`, start `npm start`, health check `/health`.
