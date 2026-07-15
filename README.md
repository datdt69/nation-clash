# Economic Shieldwall

Game web realtime lấy cảm hứng từ vòng lặp **chỉ huy đội quân – chiếm cứ điểm – giữ cân bằng** của Shieldwall, được thiết kế cho bài thuyết trình **Kinh tế thị trường định hướng XHCN ở Việt Nam**.

## Gameplay

- Tối đa 8 người, tự chia xen kẽ thành hai phe.
- Mỗi người điều khiển một chỉ huy và 5 NPC.
- Di chuyển bằng WASD/D-pad.
- Ba lệnh: **Theo tôi**, **Phòng thủ**, **Tấn công**.
- NPC tự giữ đội hình, tìm mục tiêu và giao tranh.
- Chỉ huy và NPC chết sẽ tái tập hợp tại căn cứ, không bị loại khỏi trận.

Ba cứ điểm:

- Khu sản xuất → GDP.
- Khu phúc lợi → an sinh.
- Khu điều tiết → ổn định.

Phe giữ cân bằng `GDP ≥ 40`, `An sinh ≥ 32`, `Ổn định ≥ 32` nhận điểm chiến thắng nhanh hơn. Khủng hoảng định kỳ phạt phe thiếu ổn định. Trận mặc định kéo dài 6 phút.

## UX

- Tutorial trực quan ba bước trước trận.
- Mobile có D-pad lớn và ba nút lệnh cố định.
- Màn hình player dùng camera bám chỉ huy.
- Màn hình host hiển thị toàn chiến trường, tiến độ chiếm điểm và ba chỉ số của hai phe.

## Chạy local

```bash
npm ci
npm test
npm start
```

Mở `http://localhost:3000`. Có thể đổi thời lượng bằng `MATCH_SECONDS`.

## Deploy Render

Repo có `render.yaml`: build `npm ci`, start `npm start`, health check `/health`.
