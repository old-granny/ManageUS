import 'package:flutter/material.dart';
import 'package:flutter_application_1/info_page.dart';

class DeviceParing extends StatefulWidget {
  const DeviceParing({super.key});

  @override
  State<DeviceParing> createState() => _DeviceParingState();
}

class _DeviceParingState extends State<DeviceParing> {

  final TextEditingController _ctrl = TextEditingController();


  @override
  void initState() {
    // TODO: implement initState
    
    super.initState();

  }

  @override
  void dispose() {
    // TODO: implement dispose

    _ctrl.dispose();
    super.dispose();
    
  }

  @override
  Widget build(BuildContext context) {
    return Container(
  width: 250,
  height: 300,
  decoration: BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.1),
        blurRadius: 12,
        offset: Offset(0, 4),
        spreadRadius: 2,
      ),
    ],
  ),
  padding: const EdgeInsets.all(20),
  child: Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      TextField(
        controller: _ctrl,
        decoration: InputDecoration(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          labelText: 'Pairing Number',
        ),
      ),
      const SizedBox(height: 16),
      ElevatedButton(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(double.infinity, 44),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: const Text("Pair"),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => PostsScreen(pairingNumber: int.tryParse(_ctrl.text))),
          );
        },
      ),
    ],
  ),
  );
    
  }
}