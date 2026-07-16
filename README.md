# Liar Market Bar

Game bluff realtime cho lớp học, lấy cảm hứng từ Liar's Bar và minh họa sự khác nhau giữa kinh tế thị trường tư bản chủ nghĩa với kinh tế thị trường định hướng XHCN.

## Cách tổ chức

- Host mở phòng trên laptop và chiếu bàn chơi lên máy chiếu.
- 2–8 đội tham gia bằng điện thoại; mỗi đội chỉ thấy bài riêng của mình.
- Các đội có vị trí cố định quanh bàn và đánh theo chiều kim đồng hồ.
- Mỗi vòng công bố một mục tiêu: Tăng trưởng, An sinh hoặc Điều tiết.
- Đội đến lượt úp 1–3 lá và tự động tuyên bố tất cả thuộc mục tiêu vòng.
- Đội kế tiếp tố “Nói dối” hoặc chọn bài để đánh tiếp.
- Sau 8 vòng, hệ thống tính điểm theo chế độ host đã chọn.

## Hai chế độ

- **Thị trường TBCN:** GDP và ngân sách có trọng số quyết định.
- **Định hướng XHCN:** GDP, ngân sách, an sinh và ổn định cùng được tính; chênh lệch lớn bị trừ điểm.

## Chạy local

```bash
npm install
npm start
```

Mở `http://localhost:3000`.

## Kiểm thử

```bash
npm test
```

## Deploy Render

Repo có sẵn `render.yaml` và `Dockerfile`. Kết nối repo với Render, chọn Blueprint hoặc Web Service và bật Auto Deploy.
