import 'dart:async';
import 'dart:typed_data'; // Needed for Float32List
import 'package:flutter/material.dart';

// Import the main plugin library
import 'package:flutter_3d/flutter_3d.dart';
import 'package:vector_math/vector_math_64.dart' as vm; // For Matrix4, radians

// Import web-specific libraries needed for canvas setup
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
  // Use the core API classes
  final Renderer _renderer = Renderer();
  final Scene _scene = Scene();
  final Camera _camera = Camera();
  Object3D? _triangleObject; // Hold reference to modify transform
  double _rotationY = 0.0;

  bool _isRendererInitialized = false;
  String? _errorMessage;
  // Timer? _renderLoopTimer; // We'll use addPostFrameCallback

  // Unique ID for the platform view
  final String _viewId = 'flutter3d-canvas';

  @override
  void initState() {
    super.initState();
    _initGraphics();
  }

  @override
  void dispose() {
    _renderer.dispose(); // Dispose the renderer
    // Render loop should stop automatically due to `mounted` check
    super.dispose();
  }

  Future<void> _initGraphics() async {
    try {
      // --- Canvas Setup (remains the same) ---
      final web.HTMLCanvasElement canvas =
          web.HTMLCanvasElement()
            ..id = _viewId
            ..width = 500
            ..height = 500
            ..style.width = '100%'
            ..style.height = '100%';

      // ignore: undefined_prefixed_name
      ui_web.platformViewRegistry.registerViewFactory(
        _viewId,
        (int viewId) => canvas,
      );

      // --- Renderer Initialization ---
      final initSuccess = await _renderer.initialize(canvas);
      if (!initSuccess) {
        setState(() {
          _errorMessage = 'Failed to initialize Renderer (WebGPU backend).';
        });
        return;
      }

      // --- Scene Setup ---
      _setupScene();

      setState(() {
        _isRendererInitialized = true;
      });

      // Start the render loop
      _startRenderLoop();
    } catch (e) {
      print('Error during graphics initialization: $e');
      setState(() {
        _errorMessage = 'An error occurred during initialization: $e';
      });
    }
  }

  void _setupScene() {
    // Define triangle mesh data using the API
    final Float32List vertices = Float32List.fromList([
      // Position      Color
      0.0, 0.5, 1.0, 0.0, 0.0, // Top vertex, red
      -0.5, -0.5, 0.0, 1.0, 0.0, // Bottom left, green
      0.5, -0.5, 0.0, 0.0, 1.0, // Bottom right, blue
    ]);
    const int vertexStride =
        5 * Float32List.bytesPerElement; // 5 floats per vertex
    final List<VertexAttribute> attributes = [
      VertexAttribute(name: 'position', offset: 0, format: 'float32x2'),
      VertexAttribute(
        name: 'color',
        offset: 2 * Float32List.bytesPerElement,
        format: 'float32x3',
      ),
    ];

    final Mesh triangleMesh = Mesh(
      vertices: vertices,
      vertexCount: 3,
      vertexStride: vertexStride,
      attributes: attributes,
    );

    // Create an object, store it, and add it to the scene
    // TODO: Create a basic Material class later
    _triangleObject = Object3D(mesh: triangleMesh);
    _scene.add(_triangleObject!);

    print("Scene setup complete with one triangle object.");
  }

  void _requestRenderFrame() {
    if (!mounted || !_isRendererInitialized || _triangleObject == null) {
      print("Render loop stopped.");
      return;
    }

    try {
      // Update triangle rotation before rendering
      _rotationY += 0.02; // Increment rotation angle
      _triangleObject!.transform = vm.Matrix4.identity()..rotateY(_rotationY);

      // Call the core renderer API
      _renderer.render(_scene, _camera);
    } catch (e) {
      print("Dart: Error calling renderer.render: $e");
      setState(() {
        _errorMessage = "Error during rendering: $e";
      });
      return; // Stop loop on error
    }

    // Request the next frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _isRendererInitialized) {
        _requestRenderFrame();
      }
    });
  }

  void _startRenderLoop() {
    print("Starting render loop using Renderer API...");
    WidgetsBinding.instance.addPostFrameCallback((_) => _requestRenderFrame());
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
    } else if (_isRendererInitialized) {
      // Display the HtmlElementView containing the canvas
      bodyContent = HtmlElementView(viewType: _viewId);
    } else {
      // Show a loading indicator while initializing
      bodyContent = const Center(child: CircularProgressIndicator());
    }

    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(title: const Text('Flutter 3D API Example')),
        body: bodyContent,
      ),
    );
  }
}
