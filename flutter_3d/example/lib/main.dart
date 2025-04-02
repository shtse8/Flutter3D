import 'dart:async';
import 'package:flutter/material.dart';

// Import the web implementation and JS interop types
import 'package:flutter_3d/flutter_3d_web.dart';
import 'package:web/web.dart' as web;
import 'dart:ui_web' as ui_web;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final Flutter3dWeb _flutter3dWeb = Flutter3dWeb();
  bool _isWebGPUInitialized = false;
  bool _isCanvasConfigured = false;
  String? _errorMessage;
  Timer? _renderLoopTimer;

  // Unique ID for the platform view
  final String _viewId = 'flutter3d-canvas';

  @override
  void initState() {
    super.initState();
    _initGraphics();
  }

  @override
  void dispose() {
    _renderLoopTimer?.cancel();
    // TODO: Add any necessary WebGPU resource disposal calls via _flutter3dWeb
    super.dispose();
  }

  Future<void> _initGraphics() async {
    try {
      // Initialize WebGPU via JS interop
      final gpuInitSuccess = await _flutter3dWeb.initializeWebGPU();
      if (!gpuInitSuccess) {
        setState(() {
          _errorMessage =
              'Failed to initialize WebGPU. Check browser compatibility/settings.';
        });
        return;
      }
      setState(() {
        _isWebGPUInitialized = true;
      });

      // Create and register the canvas element
      final web.HTMLCanvasElement canvas =
          web.HTMLCanvasElement()
            ..id = _viewId
            // Set initial size (can be adjusted later)
            ..width = 500
            ..height = 500
            ..style.width =
                '100%' // Make it responsive within its container
            ..style.height = '100%';

      // Register the canvas factory
      // ignore: undefined_prefixed_name
      ui_web.platformViewRegistry.registerViewFactory(
        _viewId,
        (int viewId) => canvas,
      );

      // Configure the canvas context via JS interop
      final canvasConfigSuccess = _flutter3dWeb.configureCanvas(canvas);
      if (!canvasConfigSuccess) {
        setState(() {
          _errorMessage = 'Failed to configure WebGPU canvas context.';
        });
        return;
      }
      setState(() {
        _isCanvasConfigured = true;
      });

      // Start a simple render loop
      _startRenderLoop();
    } catch (e) {
      print('Error during graphics initialization: $e');
      setState(() {
        _errorMessage = 'An error occurred during initialization: $e';
      });
    }
  }

  void _startRenderLoop() {
    // Simple timer-based loop. For real applications, use Ticker or AnimationController.
    _renderLoopTimer = Timer.periodic(const Duration(milliseconds: 16), (
      timer,
    ) {
      if (mounted && _isWebGPUInitialized && _isCanvasConfigured) {
        _flutter3dWeb.callRenderFrame();
      } else {
        timer.cancel(); // Stop if state is no longer valid
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    Widget bodyContent;

    if (_errorMessage != null) {
      bodyContent = Center(
        child: Text(
          'Error: $_errorMessage',
          style: const TextStyle(color: Colors.red),
        ),
      );
    } else if (_isWebGPUInitialized && _isCanvasConfigured) {
      // Display the HtmlElementView containing the canvas
      bodyContent = HtmlElementView(viewType: _viewId);
    } else {
      // Show a loading indicator while initializing
      bodyContent = const Center(child: CircularProgressIndicator());
    }

    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('Flutter 3D WebGPU Example')),
        body: bodyContent,
      ),
    );
  }
}
