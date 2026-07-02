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
          'Help',
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
                hintText: 'Search questions...',
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
                  _buildSectionTitle('Quick Guides'),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 110,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _buildQuickGuideCard(
                          icon: Icons.play_circle_outline,
                          color: Colors.blue,
                          title: 'Getting Started',
                        ),
                        const SizedBox(width: 12),
                        _buildQuickGuideCard(
                          icon: Icons.class_outlined,
                          color: Colors.green,
                          title: 'Class Management',
                        ),
                        const SizedBox(width: 12),
                        _buildQuickGuideCard(
                          icon: Icons.document_scanner_outlined,
                          color: Colors.purple,
                          title: 'OMR Scanning',
                        ),
                        const SizedBox(width: 12),
                        _buildQuickGuideCard(
                          icon: Icons.settings_outlined,
                          color: Colors.orange,
                          title: 'Settings',
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 28),

                  // FAQ Section
                  _buildSectionTitle('Frequently Asked Questions'),
                  const SizedBox(height: 12),

                  // Category 1 - Getting Started
                  _buildFAQCategory(
                    icon: Icons.rocket_launch,
                    title: 'Getting Started',
                    items: const [
                      FAQItem(
                        question: 'How do I log in?',
                        answer: 'Use the email and password provided by your school to log in to the app. If you don\'t have an account, please contact the administrator.',
                      ),
                      FAQItem(
                        question: 'How do I create a new class?',
                        answer: 'Press the + button in the Classes tab, fill in the class information including class name, subject, and description, then press Save.',
                      ),
                      FAQItem(
                        question: 'What if I forgot my password?',
                        answer: 'Press "Forgot Password" on the login page and follow the instructions to reset your password via your registered email.',
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Category 2 - Exams
                  _buildFAQCategory(
                    icon: Icons.assignment,
                    title: 'Exams',
                    items: const [
                      FAQItem(
                        question: 'How do I create a new exam?',
                        answer: 'Go to the Exams tab, select "Create New Exam", enter exam information such as name, time, number of questions, and select a class to assign the exam.',
                      ),
                      FAQItem(
                        question: 'How does auto-grading work?',
                        answer: 'The system will automatically grade based on the answers set up when creating the OMR exam. Results will be updated immediately after scanning.',
                      ),
                      FAQItem(
                        question: 'How do I export exam results?',
                        answer: 'After grading, go to exam details and select "Export Results" to download an Excel or PDF file containing scores for all students.',
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Category 3 - OMR Scanning
                  _buildFAQCategory(
                    icon: Icons.document_scanner,
                    title: 'OMR Scanning',
                    items: const [
                      FAQItem(
                        question: 'How do I scan answer sheets?',
                        answer: 'Place the answer sheet on a flat surface, align it, and take a photo using the app\'s camera. Ensure adequate lighting and that the sheet is within the frame.',
                      ),
                      FAQItem(
                        question: 'Why are scan results inaccurate?',
                        answer: 'Check the brightness again, ensure the sheet is not wrinkled and all black bubbles are fully filled. If still having errors, try scanning from a different angle.',
                      ),
                      FAQItem(
                        question: 'Can I scan multiple sheets at once?',
                        answer: 'Currently, each scan only processes one answer sheet. Please scan each sheet individually to ensure accuracy.',
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Category 4 - Account
                  _buildFAQCategory(
                    icon: Icons.person,
                    title: 'Account',
                    items: const [
                      FAQItem(
                        question: 'How do I change personal information?',
                        answer: 'Go to Profile in the Account tab, click on the avatar to edit personal information such as name and phone number.',
                      ),
                      FAQItem(
                        question: 'Can I change my password?',
                        answer: 'Yes, go to Profile > Change Password, enter your current password and the new password you want to set.',
                      ),
                      FAQItem(
                        question: 'How do I log out of the app?',
                        answer: 'Go to Profile, scroll down and press the "Logout" button to log out of your account.',
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
                          'Contact Support',
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
                          text: 'Monday - Friday: 8:00 - 17:00',
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
