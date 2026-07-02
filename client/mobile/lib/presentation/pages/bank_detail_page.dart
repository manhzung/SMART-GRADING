import 'package:flutter/material.dart';

class BankDetailPage extends StatelessWidget {
  const BankDetailPage({super.key, required this.bankId});

  final String bankId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('BankDetailPage($bankId) - TODO: implement in Task 5')),
    );
  }
}
