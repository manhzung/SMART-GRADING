import 'package:flutter/material.dart';

class HelpPage extends StatefulWidget {
  const HelpPage({super.key});

  @override
  State<HelpPage> createState() => _HelpPageState();
}

class _HelpPageState extends State<HelpPage> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Trợ giúp',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Stack(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: const Center(
                    child: Icon(Icons.person, size: 20, color: Color(0xFF64748B)),
                  ),
                ),
                Positioned(
                  right: 0,
                  top: 0,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFF22C55E),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Section (sticky top)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Tìm kiếm câu hỏi...',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF64748B), size: 22),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF081C43), width: 1.5),
                ),
              ),
            ),
          ),
          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 20),

                  // Quick Guides Section
                  _buildSectionTitle('Hướng dẫn nhanh'),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 110,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _buildQuickGuideCard(
                          icon: Icons.play_circle_outline,
                          color: Colors.blue,
                          title: 'Bắt đầu',
                        ),
                        const SizedBox(width: 12),
                        _buildQuickGuideCard(
                          icon: Icons.class_outlined,
                          color: Colors.green,
                          title: 'Quản lý lớp',
                        ),
                        const SizedBox(width: 12),
                        _buildQuickGuideCard(
                          icon: Icons.document_scanner_outlined,
                          color: Colors.purple,
                          title: 'Quét OMR',
                        ),
                        const SizedBox(width: 12),
                        _buildQuickGuideCard(
                          icon: Icons.settings_outlined,
                          color: Colors.orange,
                          title: 'Cài đặt',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 28),

                  // FAQ Section
                  _buildSectionTitle('Câu hỏi thường gặp'),
                  const SizedBox(height: 12),

                  // Category 1 - Bắt đầu sử dụng
                  _buildFAQCategory(
                    icon: Icons.rocket_launch,
                    title: 'Bắt đầu sử dụng',
                    items: const [
                      FAQItem(
                        question: 'Làm sao để đăng nhập?',
                        answer: 'Sử dụng email và mật khẩu được cấp bởi trường để đăng nhập vào ứng dụng. Nếu chưa có tài khoản, vui lòng liên hệ quản trị viên.',
                      ),
                      FAQItem(
                        question: 'Làm sao tạo lớp học mới?',
                        answer: 'Nhấn nút + trong tab Lớp học, điền đầy đủ thông tin lớp học bao gồm tên lớp, môn học và mô tả, sau đó nhấn Lưu.',
                      ),
                      FAQItem(
                        question: 'Tôi quên mật khẩu thì sao?',
                        answer: 'Nhấn "Quên mật khẩu" ở trang đăng nhập và làm theo hướng dẫn để đặt lại mật khẩu mới qua email đã đăng ký.',
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Category 2 - Thi cử
                  _buildFAQCategory(
                    icon: Icons.assignment,
                    title: 'Thi cử',
                    items: const [
                      FAQItem(
                        question: 'Làm sao tạo bài thi mới?',
                        answer: 'Vào tab Thi, chọn "Tạo bài thi mới", nhập thông tin bài thi như tên, thời gian, số câu hỏi và chọn lớp học để giao bài.',
                      ),
                      FAQItem(
                        question: 'Cách chấm điểm tự động hoạt động?',
                        answer: 'Hệ thống sẽ tự động chấm điểm dựa trên đáp án đã được thiết lập khi tạo bài thi OMR. Kết quả sẽ được cập nhật ngay sau khi quét.',
                      ),
                      FAQItem(
                        question: 'Làm sao xuất kết quả thi?',
                        answer: 'Sau khi chấm xong, vào chi tiết bài thi và chọn "Xuất kết quả" để tải file Excel hoặc PDF chứa điểm số của tất cả học sinh.',
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Category 3 - Quét OMR
                  _buildFAQCategory(
                    icon: Icons.document_scanner,
                    title: 'Quét OMR',
                    items: const [
                      FAQItem(
                        question: 'Làm sao quét phiếu trả lời?',
                        answer: 'Đặt phiếu trả lời trên mặt phẳng, căn chỉnh và chụp ảnh bằng camera của ứng dụng. Đảm bảo ánh sáng đủ và phiếu nằm trong khung hình.',
                      ),
                      FAQItem(
                        question: 'Tại sao kết quả quét không chính xác?',
                        answer: 'Kiểm tra lại độ sáng, đảm bảo phiếu không bị nhàu và các bọt đen được tô đầy đủ. Nếu vẫn lỗi, thử quét lại với góc chụp khác.',
                      ),
                      FAQItem(
                        question: 'Có thể quét nhiều phiếu cùng lúc không?',
                        answer: 'Hiện tại mỗi lần quét chỉ xử lý một phiếu trả lời. Vui lòng quét lần lượt từng phiếu để đảm bảo độ chính xác.',
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Category 4 - Tài khoản
                  _buildFAQCategory(
                    icon: Icons.person,
                    title: 'Tài khoản',
                    items: const [
                      FAQItem(
                        question: 'Làm sao thay đổi thông tin cá nhân?',
                        answer: 'Vào mục Hồ sơ trong tab Tài khoản, nhấn vào ảnh đại diện để chỉnh sửa thông tin cá nhân như tên, số điện thoại.',
                      ),
                      FAQItem(
                        question: 'Có thể đổi mật khẩu không?',
                        answer: 'Có, vào mục Hồ sơ > Đổi mật khẩu, nhập mật khẩu hiện tại và mật khẩu mới muốn đặt.',
                      ),
                      FAQItem(
                        question: 'Làm sao đăng xuất khỏi ứng dụng?',
                        answer: 'Vào mục Hồ sơ, kéo xuống dưới và nhấn nút "Đăng xuất" để đăng xuất khỏi tài khoản.',
                      ),
                    ],
                  ),

                  const SizedBox(height: 28),

                  // Contact Section
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Liên hệ hỗ trợ',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 16),
                        _buildContactRow(
                          icon: Icons.email_outlined,
                          text: 'support@smartgrading.edu.vn',
                        ),
                        const SizedBox(height: 12),
                        _buildContactRow(
                          icon: Icons.phone_outlined,
                          text: '1900 1234',
                        ),
                        const SizedBox(height: 12),
                        _buildContactRow(
                          icon: Icons.access_time,
                          text: 'Thứ 2 - Thứ 6: 8:00 - 17:00',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Color(0xFF0F172A),
        ),
      ),
    );
  }

  Widget _buildQuickGuideCard({
    required IconData icon,
    required Color color,
    required String title,
  }) {
    return Container(
      width: 120,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 32,
              color: color,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFAQCategory({
    required IconData icon,
    required String title,
    required List<FAQItem> items,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          key: PageStorageKey(title),
          leading: Icon(icon, color: const Color(0xFF081C43), size: 24),
          title: Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: Color(0xFF0F172A),
            ),
          ),
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          collapsedIconColor: const Color(0xFF64748B),
          iconColor: const Color(0xFF081C43),
          childrenPadding: const EdgeInsets.all(16),
          children: items.map((item) => _buildFAQItem(item)).toList(),
        ),
      ),
    );
  }

  Widget _buildFAQItem(FAQItem item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.question,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            item.answer,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              height: 1.5,
            ),
          ),
          if (item != FAQItem._last) const Divider(color: Color(0xFFE2E8F0), height: 24),
        ],
      ),
    );
  }

  Widget _buildContactRow({
    required IconData icon,
    required String text,
  }) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF64748B), size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF0F172A),
            ),
          ),
        ),
      ],
    );
  }
}

class FAQItem {
  final String question;
  final String answer;

  const FAQItem({
    required this.question,
    required this.answer,
  });

  static const FAQItem _last = FAQItem(question: '', answer: '');
}
