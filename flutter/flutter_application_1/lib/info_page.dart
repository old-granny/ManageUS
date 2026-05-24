import 'package:flutter/material.dart';
import 'api_service.dart';

class PostsScreen extends StatefulWidget {

  final pairingNumber;

  PostsScreen({super.key, required this.pairingNumber});
  @override
  State<PostsScreen> createState() => _PostsScreenState();
}

class _PostsScreenState extends State<PostsScreen> {
  bool _isLoading = false;
  bool? _isConnected; // null = not tried yet
  String? _error;

  Future<void> _connect() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final result = await ApiService.post('/manager/connect', {
        "code": widget.pairingNumber,
      });
      print('Connected: $result');
      setState(() { _isConnected = true; });
    } catch (e) {
      print('Error: $e');
      setState(() { _isConnected = false; _error = e.toString(); });
    } finally {
      setState(() { _isLoading = false; });
    }
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    _connect();
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
  appBar: AppBar(title: const Text('Posts')),
  body: Column(
    children: [
      // Status banner
      if (_isConnected != null)
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          width: double.infinity,
          color: _isConnected! ? Colors.green.shade600 : Colors.red.shade600,
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          child: Row(
            children: [
              Icon(
                _isConnected! ? Icons.check_circle : Icons.error,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                _isConnected! ? 'Connected successfully' : 'Connection failed',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (!_isConnected! && _error != null) ...[
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    '— $_error',
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ],
          ),
        ),

      // START button
      if (_isConnected == true)
        Expanded(
          child: Center(
            child: ElevatedButton(
              onPressed: () {
                // your start action here
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade600,
                foregroundColor: Colors.white,
                minimumSize: const Size(180, 52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                textStyle: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                ),
              ),
              child: const Text('START'),
            ),
          ),
        ),

      // Loading indicator
      if (_isLoading)
        const Expanded(
          child: Center(child: CircularProgressIndicator()),
        ),
    ],
  ),
  );
  }
}