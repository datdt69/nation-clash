# Liar Market

Trò chơi đấu trí theo thời gian thực cho lớp học, minh họa sự khác nhau giữa kinh tế thị trường tư bản chủ nghĩa với kinh tế thị trường định hướng xã hội chủ nghĩa.

## Cách tổ chức

- Người điều khiển mở phòng trên máy tính xách tay và chiếu bàn chơi lên máy chiếu.
- Màn hình chính có chế độ toàn màn hình; số lá còn lại được hiển thị cỡ lớn trên từng ghế để quan sát từ xa.
- 2–8 đội tham gia bằng điện thoại; mỗi đội chỉ thấy bài riêng của mình.
- Toàn trận dùng đúng 64 lá; đủ 8 đội thì chia hết toàn bộ, mỗi đội nhận 8 lá.
- Các đội có vị trí cố định quanh bàn và đánh theo chiều kim đồng hồ.
- Mỗi vòng công bố một mục tiêu: Tăng trưởng, An sinh hoặc Điều tiết.
- Đội đến lượt úp 1–3 lá và tự động tuyên bố tất cả thuộc mục tiêu vòng.
- Đội kế tiếp tố “Nói dối” hoặc chọn bài để đánh tiếp.
- Mục tiêu là đánh hết bài. Lá cuối chỉ được xác nhận nếu đội kế tiếp không tố hoặc tố sai.
- Trận kết thúc khi mọi đội về đích; hệ thống xếp hạng và đánh dấu 4 đội tổng điểm cao nhất.
- Sau bảng tổng kết có nút **Về trang chủ** để xóa phiên cũ và tạo trận mới.

## Cấu trúc bộ bài cố định

- 20 lá Tăng trưởng: 10 Doanh nghiệp tư nhân + 10 Doanh nghiệp vốn ngoại.
- 20 lá An sinh: 10 Hợp tác xã + 10 An sinh xã hội.
- 20 lá Điều tiết: 7 Doanh nghiệp nhà nước + 7 Đầu tư công + 6 Thuế.
- 4 lá Cân bằng, hợp lệ với mọi mục tiêu.

Người chơi có thể dựa vào bài trên tay, 4 lá Cân bằng và tổng số lá đã được tuyên bố để phát hiện lời nói dối.

## Chỉ số và xếp hạng

- Mỗi đội bắt đầu với 100 Sản lượng, 100 Ngân sách, 100 An sinh và 100 Ổn định.
- Lá bài không làm thay đổi chỉ số.
- Nói dối bị bắt hoặc tố sai sẽ nhận một khủng hoảng ngẫu nhiên và bị trừ chỉ số.
- Mọi lá đã đánh đều mất vĩnh viễn, kể cả khi người đánh bị bắt quả tang nói dối.
- Nếu bị bắt ở lượt cuối, đội vẫn hết bài và về đích nhưng chịu khủng hoảng làm giảm tổng điểm.
- Khi chỉ còn hai đội và một đội vừa hết bài, đội còn lại bắt buộc phải tố “Nói dối”, không được đánh tiếp.
- Hạng 1 được cộng 25 mỗi chỉ số; hạng 2 cộng 18; hạng 3 cộng 12; hạng 4 cộng 7.
- Tổng điểm = Sản lượng + Ngân sách + An sinh + Ổn định. Bốn tổng điểm cao nhất là bốn đội được chọn.

## Chạy trên máy

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
