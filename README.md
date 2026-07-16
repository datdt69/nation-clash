# Liar Market Bar

Game bluff realtime cho lớp học, lấy cảm hứng từ Liar's Bar và minh họa sự khác nhau giữa kinh tế thị trường tư bản chủ nghĩa với kinh tế thị trường định hướng XHCN.

## Cách tổ chức

- Host mở phòng trên laptop và chiếu bàn chơi lên máy chiếu.
- Màn host có chế độ toàn màn hình; số lá còn lại được hiển thị cỡ lớn trên từng ghế để quan sát từ xa.
- 2–8 đội tham gia bằng điện thoại; mỗi đội chỉ thấy bài riêng của mình.
- Toàn trận dùng đúng 40 lá; đủ 8 đội thì mỗi đội nhận 5 lá và không còn lá thừa.
- Các đội có vị trí cố định quanh bàn và đánh theo chiều kim đồng hồ.
- Mỗi vòng công bố một mục tiêu: Tăng trưởng, An sinh hoặc Điều tiết.
- Đội đến lượt úp 1–3 lá và tự động tuyên bố tất cả thuộc mục tiêu vòng.
- Đội kế tiếp tố “Nói dối” hoặc chọn bài để đánh tiếp.
- Mục tiêu là đánh hết bài. Lá cuối chỉ được xác nhận nếu đội kế tiếp không tố hoặc tố sai.
- Trận kết thúc khi mọi đội về đích; hệ thống xếp hạng và đánh dấu 4 đội tổng điểm cao nhất.
- Sau bảng tổng kết có nút **Về trang chủ** để xóa phiên cũ và tạo trận mới.

## Cấu trúc bộ bài cố định

- 12 lá Tăng trưởng: 6 Doanh nghiệp tư nhân + 6 FDI.
- 12 lá An sinh: 6 Hợp tác xã + 6 An sinh xã hội.
- 12 lá Điều tiết: 4 Doanh nghiệp nhà nước + 4 Đầu tư công + 4 Thuế.
- 4 lá Cân bằng, hợp lệ với mọi mục tiêu.

Vì mỗi mục tiêu chỉ có tối đa 16 lá hợp lệ nếu tính cả Cân bằng, người chơi có thể dựa vào bài trên tay và tổng số lá đã được tuyên bố để phát hiện bluff.

## Chỉ số và xếp hạng

- Mỗi đội bắt đầu với 100 GDP, 100 Ngân sách, 100 An sinh và 100 Ổn định.
- Lá bài không làm thay đổi chỉ số.
- Nói dối bị bắt hoặc tố sai sẽ nhận một khủng hoảng ngẫu nhiên và bị trừ chỉ số.
- Nếu nói dối ở lượt cuối bị bắt, các lá vừa đánh quay lại tay và đội đó chưa về đích.
- Hạng 1 được cộng 25 mỗi chỉ số; hạng 2 cộng 18; hạng 3 cộng 12; hạng 4 cộng 7.
- Tổng điểm = GDP + Ngân sách + An sinh + Ổn định. Bốn tổng điểm cao nhất là TOP 4.

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
