import 'package:flutter/material.dart';

class BankDetailPage extends StatelessWidget {
  const BankDetailPage({super.key});

  @override
  Widget build(BuildContext context) {
    // Get bankId from route arguments
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final bankId = args?['bankId'] as String? ?? 'unknown';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Bank Details',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: Center(
        child: Text('BankDetailPage($bankId) - TODO: implement in Task 5'),
      ),
    );
  }
}
