# HƯỚNG DẪN & YÊU CẦU CHI TIẾT TỪNG PHẦN TRONG TEMPLATE ĐATN SOICT

Tài liệu này cung cấp chi tiết toàn bộ các yêu cầu nội dung, độ dài, quy định định dạng, lưu ý hành văn và danh sách các việc cần tránh (DOs & DON'Ts) cho từng tệp tin và chương mục cấu thành nên Đồ án Tốt nghiệp (ĐATN).

---

## MỤC LỤC HƯỚNG DẪN
1. [PHẦN I: CÁC TRANG PHỤ TRỢ ĐẦU QUYỂN (Bìa, Lời cảm ơn, Tóm tắt...)](#phần-i-các-trang-phụ-trợ-đầu-quyển)
2. [PHẦN II: CÁC CHƯƠNG NỘI DUNG CHÍNH (Chương 1 - Chương 6)](#phần-ii-các-chương-nội-dung-chính)
3. [PHẦN III: TÀI LIỆU THAM KHẢO & PHỤ LỤC](#phần-iii-tài-liệu-tham-khảo-phụ-lục)
4. [PHẦN IV: QUY ĐỊNH KỸ THUẬT VÀ PHONG CÁCH HÀNH VĂN CHUNG](#phần-iv-quy-định-kỹ-thuật-và-phong-cách-hành-văn-chung)

---

## PHẦN I: CÁC TRANG PHỤ TRỢ ĐẦU QUYỂN
*(Các trang này được đánh số trang bằng ký tự La Mã thường: i, ii, iii... hoặc ẩn số trang)*

### 1. Trang Bìa Chính (`Bia.tex`) & Trang Bìa Lót (`Bia_lot.tex`)
*   **Yêu cầu nội dung**:
    *   **Tên trường**: Đại học Bách khoa Hà Nội (viết in hoa đậm).
    *   **Tên tiêu đề**: ĐỒ ÁN TỐT NGHIỆP (in hoa đậm lớn).
    *   **Tên đề tài**: Đặt ở giữa trang (cỡ chữ Large, in đậm).
    *   **Thông tin sinh viên**: Họ và tên (in hoa đậm), email sinh viên (tài liệu mẫu dùng email đuôi `@sis.hust.edu.vn`).
    *   **Ngành học**: Viết đúng tên chương trình đào tạo/ngành học (ví dụ: *Ngành Khoa học máy tính*, *Chương trình Việt-Nhật*...).
    *   **Thông tin hướng dẫn**: Tên GVHD (học hàm học vị đầy đủ), tên Khoa (ví dụ: *Khoa Kỹ thuật máy tính*), tên Trường (ví dụ: *Trường Công nghệ Thông tin và Truyền thông*).
    *   **Địa điểm & Thời gian**: Ví dụ: HÀ NỘI, 06/2022 (đặt dưới cùng).
*   **Điểm khác biệt**:
    *   `Bia.tex` (Bìa chính): In trên giấy bìa màu cứng phía ngoài, không có đường kẻ ký tên.
    *   `Bia_lot.tex` (Bìa lót): In trên giấy thường bên trong, **bắt buộc phải chừa chỗ trống và đường kẻ ký tên của GVHD** (`Chữ kí GVHD`).

### 2. Lời cảm ơn (`0_2_Loi_cam_on.tex`)
*   **Yêu cầu nội dung**: Lời cảm ơn gửi tới gia đình, bạn bè, thầy cô, người yêu và bản thân vì đã nỗ lực thực hiện đồ án.
*   **Lưu ý & Quy định**:
    *   Độ dài giới hạn: **100 đến 150 từ**.
    *   Phong cách: Viết ngắn gọn, chân thành, tránh các từ ngữ sáo rỗng.
    *   Số trang: Thiết lập bắt đầu đánh số trang La Mã từ trang này (`\pagenumbering{roman}`).

### 3. Tóm tắt nội dung đồ án (`0_3_Tom_tat_noi_dung.tex`)
*   **Yêu cầu nội dung**: Phải bao gồm đủ 4 ý theo trình tự:
    1.  *Giới thiệu vấn đề*: Lý do xuất hiện bài toán, tình hình giải quyết hiện tại, các hướng tiếp cận đang có và hạn chế của chúng.
    2.  *Hướng tiếp cận*: Hướng đi sinh viên lựa chọn và lý do chọn hướng đó.
    3.  *Tổng quan giải pháp*: Mô tả ngắn gọn giải pháp sinh viên áp dụng theo hướng tiếp cận đã chọn.
    4.  *Đóng góp chính*: Kết quả nổi bật nhất đạt được sau cùng.
*   **Lưu ý & Quy định**:
    *   Độ dài: Từ **200 đến 350 từ**.
    *   Hình thức: Viết liền mạch thành các đoạn văn, **tuyệt đối không gạch đầu dòng hoặc viết ý**.
    *   Bắt buộc có dòng ký và ghi rõ họ tên sinh viên dưới cùng bên phải.
    *   Trang này ẩn số trang (`\pagenumbering{gobble}`).

### 4. Tóm tắt nội dung bằng tiếng Anh (`0_4_Tom_tat_noi_dung_English.tex`)
*   **Yêu cầu nội dung**: Dịch lại đầy đủ phần tóm tắt tiếng Việt ở trên sang tiếng Anh (Abstract).
*   **Lưu ý & Quy định**:
    *   **Không bắt buộc**: Đây là phần khuyến khích sinh viên viết.
    *   **Cảnh báo**: Nếu lựa chọn viết, sinh viên phải đảm bảo câu từ và ngữ pháp chuẩn xác. Nếu viết sai ngữ pháp sẽ gây phản cảm đối với hội đồng chấm.

### 5. Danh mục hình vẽ & Danh mục bảng biểu
*   **Yêu cầu**: Được tạo tự động bằng lệnh `\listoffigures` và `\listoftables`.
*   **Lưu ý**: Chỉ hiển thị các hình vẽ/bảng biểu có gán nhãn `\caption` và `\label` nằm trong nội dung chính.

### 6. Danh mục thuật ngữ và từ viết tắt (`Tu_viet_tat.tex`)
*   **Yêu cầu**: Khai báo danh sách các thuật ngữ viết tắt trong file `Tu_viet_tat.tex` bằng lệnh `\newglossaryentry` của package `glossaries`.
*   **Lưu ý**: Khi sử dụng từ viết tắt trong thân đồ án, lần đầu xuất hiện cần ghi đầy đủ nghĩa tiếng Anh và tiếng Việt, các lần sau chỉ viết tắt.

---

## PHẦN II: CÁC CHƯƠNG NỘI DUNG CHÍNH
*(Bắt đầu đánh số trang từ 1 bằng ký tự số Ả Rập: 1, 2, 3...)*

> [!IMPORTANT]
> **Yêu cầu chung cho mọi Chương**: 
> Mỗi chương luôn phải có mục **Tổng quan chương** (nằm ở đầu chương, dùng văn bản thường `Normal` không in đậm/nghiêng/đóng khung) và mục **Kết chương** (nằm ở cuối chương). 
> *   *Tổng quan chương*: Liên kết với chương trước, giới thiệu lý do và sơ bộ nội dung sẽ trình bày.
> *   *Kết chương*: Tóm tắt kết quả chính của chương, không viết lặp lại giống hệt Tổng quan, và có câu liên kết dẫn dắt sang chương tiếp theo.

### CHƯƠNG 1: GIỚI THIỆU ĐỀ TÀI
*   **Độ dài quy định**: Từ **3 đến 6 trang**.
*   **Các phần bắt buộc**:
    *   **1.1 Đặt vấn đề**:
        *   *Nội dung*: Làm nổi bật tính cấp thiết, tầm quan trọng hoặc quy mô bài toán. Trình bày từ thực tế dẫn đến bài toán, lợi ích đem lại cho ai nếu giải quyết được.
        *   *Lưu ý*: **Tuyệt đối không trình bày giải pháp ở đây**, chỉ tập trung nêu vấn đề.
    *   **1.2 Mục tiêu và phạm vi đề tài**:
        *   *Nội dung*: Đánh giá sơ bộ các nghiên cứu/sản phẩm hiện tại -> rút ra hạn chế -> xác định mục tiêu giải quyết hạn chế gì, phát triển phần mềm có chức năng chính nào.
        *   *Lưu ý*: Chỉ trình bày ở mức tổng quan, không đi sâu chi tiết của vấn đề hay giải pháp.
    *   **1.3 Định hướng giải pháp**:
        *   *Nội dung*: (i) Định hướng/phương pháp/công nghệ lựa chọn; (ii) Mô tả ngắn gọn giải pháp thực tế; (iii) Đóng góp chính và kết quả dự kiến.
        *   *Lưu ý*: Không phân tích sâu thuật toán/công nghệ; chỉ nêu tên, viết ngắn gọn 1-2 câu giải thích nhanh lý do chọn.
    *   **1.4 Bố cục đồ án**:
        *   *Nội dung*: Viết mô tả tóm tắt nội dung các chương từ Chương 2 trở đi.
        *   *Lưu ý*: **Bắt buộc viết thành các đoạn văn hoàn chỉnh**, không dùng gạch đầu dòng hay liệt kê ý. Không cần mô tả lại Chương 1.

---

### CHƯƠNG 2: KHẢO SÁT VÀ PHÂN TÍCH YÊU CẦU
*   **Độ dài quy định**: Từ **9 đến 11 trang**.
*   **Các phần bắt buộc**:
    *   **2.1 Khảo sát hiện trạng**:
        *   *Nội dung*: Khảo sát từ 3 nguồn (khách hàng/người dùng, hệ thống cũ đã có, các ứng dụng tương tự). Phân tích chi tiết ưu nhược điểm của các giải pháp hiện tại.
        *   *Lưu ý*: Khuyên dùng bảng so sánh tính năng để trực quan hóa thông tin.
    *   **2.2 Tổng quan chức năng**:
        *   *Nội dung*: Chỉ mô tả chức năng mức cao (tổng quan), không đi vào chi tiết.
        *   *2.2.1 Biểu đồ use case tổng quát*: Vẽ biểu đồ use case tổng quát, giải thích rõ các tác nhân (actor), vai trò tác nhân và mô tả ngắn gọn use case chính.
        *   *2.2.2 Biểu đồ use case phân rã [Tên Use Case]*: Phân rã cho từng use case mức cao. **Lưu ý**: Tên của đề mục con bắt buộc phải khớp chính xác với tên use case tương ứng trên biểu đồ.
        *   *2.2.3 Quy trình nghiệp vụ*:
            *   *Yêu cầu*: Vẽ biểu đồ hoạt động (Activity diagram) mô tả quy trình kết hợp.
            *   *Lưu ý*: **Đây không phải là luồng sự kiện của từng use case**, mà là luồng nghiệp vụ lớn của hệ thống có sự liên kết, kết hợp của nhiều use case (ví dụ quy trình "Mượn-Trả sách" gồm tạo thẻ, mượn, duyệt, trả).
    *   **2.3 Đặc tả chức năng**:
        *   *Nội dung*: Lựa chọn **từ 4 đến 7 use case quan trọng nhất** của đồ án để đặc tả chi tiết.
        *   *Yêu cầu mỗi đặc tả*: Bắt buộc phải có ít nhất: (i) Tên use case, (ii) Luồng sự kiện chính và luồng phát sinh, (iii) Tiền điều kiện, (iv) Hậu điều kiện. 
        *   *Lưu ý*: Chỉ vẽ thêm biểu đồ hoạt động khi use case đó cực kỳ phức tạp. Các use case phụ khác đưa xuống Phụ lục B.
    *   **2.4 Yêu cầu phi chức năng**:
        *   *Nội dung*: Hiệu năng, độ tin cậy, tính dễ dùng, bảo trì, các yêu cầu kỹ thuật (CSDL, công nghệ...).

---

### CHƯƠNG 3: NỀN TẢNG LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG
*   **Độ dài quy định**: **Tối đa không quá 10 trang**.
*   **Quy định bắt buộc**:
    *   Không trình bày lý thuyết chung chung, dài dòng (kiến thức đã có sẵn, chỉ tóm tắt lại). Nếu lý thuyết quá dài, chuyển bớt vào phần Phụ lục.
    *   **Tính liên kết**: Với mỗi công nghệ/lý thuyết trình bày, bắt buộc phải phân tích rõ nó dùng để **giải quyết yêu cầu hoặc vấn đề cụ thể nào đã nêu ở Chương 2**.
    *   **So sánh đối chiếu**: Phải liệt kê các công nghệ/hướng tiếp cận tương tự có thể dùng làm lựa chọn thay thế, giải thích rõ lý do chọn công nghệ này mà không chọn cái khác.
    *   **Trích dẫn khoa học**: Bắt buộc tạo tham chiếu chéo (`\cite`) đến danh mục Tài liệu tham khảo tin cậy.

---

### CHƯƠNG 4: PHÂN TÍCH THIẾT KẾ, TRIỂN KHAI VÀ ĐÁNH GIÁ HỆ THỐNG
*   **Các phần bắt buộc**:
    *   **4.1 Thiết kế kiến trúc**:
        *   *4.1.1 Lựa chọn kiến trúc*: Lựa chọn mô hình kiến trúc (MVC, MVP, SOA, Microservices...) và giải thích cách áp dụng cụ thể vào hệ thống của mình (mô hình hóa thành phần chi tiết của hệ thống tương ứng với các lớp kiến trúc). Độ dài từ **1 đến 3 trang**.
        *   *4.1.2 Thiết kế tổng quan*: Vẽ biểu đồ gói UML (UML Package Diagram). **Quy tắc**: Các gói phải phân tầng rõ ràng, thể hiện sự phụ thuộc một chiều (không phụ thuộc chéo chéo, gói tầng dưới không phụ thuộc gói tầng trên, không phụ thuộc bắc cầu bỏ qua tầng). Giải thích nhiệm vụ từng gói.
        *   *4.1.3 Thiết kế chi tiết gói*: Vẽ biểu đồ lớp chi tiết của gói. **Quy tắc**: Chỉ hiển thị tên lớp, **không vẽ thuộc tính và phương thức** để tránh rối hình. Thể hiện rõ các quan hệ (phụ thuộc, kết hợp, kết tập, hợp thành, kế thừa, thực thi).
    *   **4.2 Thiết kế chi tiết**:
        *   *4.2.1 Thiết kế giao diện*: Đặc tả độ phân giải màn hình đích, kích thước, chuẩn phối màu, cách hiển thị thông báo, nút bấm. Đưa ảnh mockup thiết kế giao diện của các chức năng quan trọng. **Độ dài: 2 - 3 trang**. **Lưu ý**: Không nhầm ảnh mockup thiết kế với ảnh chụp màn hình ứng dụng thực tế.
        *   *4.2.2 Thiết kế lớp*: Trình bày chi tiết thuộc tính và phương thức của **2 đến 4 lớp chủ đạo nhất** của hệ thống (các lớp khác đưa vào phụ lục). Vẽ biểu đồ trình tự (Sequence Diagram) thể hiện luồng truyền thông điệp cho **2 đến 3 use case quan trọng**. **Độ dài: 3 - 4 trang**.
        *   *4.2.3 Thiết kế cơ sở dữ liệu*: Vẽ và giải thích biểu đồ thực thể liên kết (E-R) hoặc lược đồ CSDL cụ thể (SQL, NoSQL, Firebase). **Độ dài: 2 - 4 trang**.
    *   **4.3 Xây dựng ứng dụng**:
        *   *4.3.1 Thư viện và công cụ sử dụng*: Kẻ bảng liệt kê ngôn ngữ, thư viện, API, IDE kèm theo **chính xác số phiên bản** và đường dẫn URL tải/tài liệu.
        *   *4.3.2 Kết quả đạt được*: Mô tả kết quả đóng gói (file exe, apk, war...), lập bảng thống kê thông số ứng dụng (số dòng code, số lớp, số gói, dung lượng mã nguồn...).
        *   *4.3.3 Minh họa các chức năng chính*: Đưa ra ảnh chụp màn hình các chức năng thực tế kèm mô tả chú thích ngắn gọn.
    *   **4.4 Kiểm thử**:
        *   *Nội dung*: Thiết kế ca kiểm thử (test cases) cho **2 đến 3 chức năng chính**, ghi rõ kỹ thuật kiểm thử (hộp đen, hộp trắng...), tổng kết số lượng test case và kết quả kiểm thử. Giải thích nguyên nhân nếu có test case lỗi. **Độ dài: 2 - 3 trang**. (Các test case chi tiết khác đưa vào phụ lục).
    *   **4.5 Triển khai**: Triển khai thực tế trên server/thiết bị cấu hình thế nào. Thống kê kết quả vận hành thử nghiệm (lượt truy cập, khả năng chịu tải, thời gian phản hồi, phản hồi người dùng...).

---

### CHƯƠNG 5: CÁC GIẢI PHÁP VÀ ĐÓNG GÓP NỔI BẬT
*   **Độ dài quy định**: **Tối thiểu 5 trang**, không giới hạn tối đa. (Nếu dưới 5 trang, bắt buộc gộp vào chương Kết luận chứ không tách chương riêng).
*   **Quy định bắt buộc**:
    *   Đây là phần cốt lõi để đánh giá năng lực của sinh viên. Trình bày giải pháp cho bài toán khó, thuật toán đề xuất hoặc kiến trúc tối ưu tự thiết kế.
    *   **Cấu trúc mỗi đóng góp**: Phải được tổ chức thành một mục lớn độc lập gồm 3 mục con: (i) Dẫn dắt bài toán, (ii) Giải pháp chi tiết, (iii) Kết quả đạt được.
    *   **Tránh trùng lặp**: Các nội dung chi tiết ở đây không được viết lặp lại ở các chương trước. Các chương trước chỉ giới thiệu sơ lược và dùng liên kết trỏ tới Chương 5 (ví dụ: *"Chi tiết về kiến trúc này sẽ được trình bày tại mục 5.1"*).

---

### CHƯƠNG 6: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN
*   **6.1 Kết luận**: So sánh đối chiếu sản phẩm/nghiên cứu của mình với các sản phẩm tương tự. Phân tích việc đã làm được, chưa làm được, các đóng góp nổi bật và rút ra bài học kinh nghiệm.
*   **6.2 Hướng phát triển**: Định hướng công việc tương lai để hoàn thiện các chức năng hiện tại và nghiên cứu nâng cấp các chức năng mới.

---

## PHẦN III: TÀI LIỆU THAM KHẢO & PHỤ LỤC

### 1. Tài liệu tham khảo (`Danh_sach_tai_lieu_tham_khao.bib`)
*   **Quy định nguồn**:
    *   *Nguồn hợp lệ*: Sách khoa học, bài báo tạp chí, bài báo hội nghị, đồ án/luận văn tốt nghiệp khóa trước, các tài liệu Internet là công bố chính thống của tổ chức uy tín (ví dụ: đặc tả chuẩn của W3C).
    *   *Cấm sử dụng*: Slide bài giảng của thầy cô, trang Wikipedia hoặc các trang web tin tức, blog cá nhân thông thường.
*   **Quy định định dạng**: 
    *   Bắt buộc hiển thị theo chuẩn **IEEE** (sử dụng gói `biblatex` với tham số `style=ieee`).
    *   Chỉ các tài liệu thực tế có sử dụng lệnh `\cite{}` trong thân đồ án mới được xuất hiện trong danh mục này.

### 2. Phụ lục A: Hướng dẫn viết ĐATN (`Chuong/Phu_luc_A.tex`)
*   Là phần hướng dẫn kỹ thuật cài đặt LaTeX (sử dụng bullet, chèn bảng, chèn ảnh, viết công thức toán học, quy cách đóng quyển). Sinh viên giữ nguyên phần này để tham khảo và có thể xóa/thay đổi khi nộp bản cuối cùng nếu nhà trường yêu cầu.

### 3. Phụ lục B: Đặc tả Use Case (`Chuong/Phu_luc_B.tex`)
*   Sử dụng để viết đặc tả chi tiết cho các use case phụ, use case nhánh không đủ diện tích trình bày trong mục 2.3 của Chương 2.

---

## PHẦN IV: QUY ĐỊNH KỸ THUẬT VÀ PHONG CÁCH HÀNH VĂN CHUNG

| Đặc trưng | Quy định bắt buộc | Gợi ý cách thực hiện trong LaTeX |
| :--- | :--- | :--- |
| **Không đạo văn** | Phải trích dẫn nguồn cho tất cả câu chữ, hình ảnh, bảng biểu không do mình tự làm. | Sử dụng lệnh `\cite{label_tltk}` |
| **Tham chiếu đầy đủ** | Mọi hình vẽ, bảng biểu, công thức phải được giải thích và tham chiếu ít nhất 1 lần trong bài. | Sử dụng các lệnh `\ref{fig:label}`, `\ref{table:label}`, `\eqref{pt:label}` |
| **Không gạch đầu dòng** | Không trình bày kiểu slide. Phải viết thành câu đầy đủ chủ vị, cấu trúc thành các đoạn văn mạch lạc. | Khi cần liệt kê, viết dạng đoạn văn kèm ký tự La Mã: `(i)...`, `(ii)...` |
| **Ảnh & Bảng** | Chú thích của hình vẽ và bảng biểu đều được đặt **ngay dưới** hình vẽ/bảng biểu đó. | Sử dụng thẻ `\caption{}` đặt dưới lệnh `\includegraphics` hoặc `\begin{tabular}` |
| **Đóng quyển** | Bìa cứng màu xanh, dán keo nhiệt gáy sách. Cấm bấm ghim hay dán băng dính màu ở gáy. Bìa trước và sau liền khổ giấy. | Đóng quyển tại cửa hàng in chuyên nghiệp yêu cầu dán keo nhiệt gáy vuông. |
| **In chữ gáy bìa** | Hướng chữ in dọc từ trên xuống dưới: `KỲ LÀM ĐATN - NGÀNH ĐÀO TẠO - HỌ VÀ TÊN SINH VIÊN - MÃ SỐ SINH VIÊN` | *Ví dụ*: `2022.1 - KỸ THUẬT MÁY TÍNH - NGUYỄN VĂN A - 20221234` |
