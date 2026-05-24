import 'package:flutter/material.dart';

import 'device_paring.dart';

class HomeWidget extends StatefulWidget {
  const HomeWidget({super.key});

  @override
  State<HomeWidget> createState() => _HomeWidgetState();
}

class _HomeWidgetState extends State<HomeWidget> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("ManageUS"),
      ),

      body: Center(
        child: DeviceParing(),
      )
      
    );
  }
}