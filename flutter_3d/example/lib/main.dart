import 'dart:async';
import 'dart:typed_data'; // Needed for Float32List
import 'package:flutter/material.dart';

// Import the main plugin library with a prefix
import 'package:flutter_3d/flutter_3d.dart' as f3d;
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
  // Use the core API classes with prefix
  final f3d.Renderer _renderer = f3d.Renderer();
  final f3d.Scene _scene = f3d.Scene();
  final f3d.Camera _camera = f3d.Camera();
  f3d.Object3D? _triangleObject;
  // double _rotationY = 0.0; // No longer rotating

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
    // Add UV coordinates (s, t)
    final Float32List vertices = Float32List.fromList([
      // Position      Color          UV
      0.0, 0.5, 1.0, 1.0, 1.0, 0.5, 1.0, // Top vertex, white, top-center UV
      -0.5, -0.5, 1.0, 1.0, 1.0, 0.0, 0.0, // Bottom left, white, bottom-left UV
      0.5,
      -0.5,
      1.0,
      1.0,
      1.0,
      1.0,
      0.0, // Bottom right, white, bottom-right UV
    ]);
    const int vertexStride =
        7 * Float32List.bytesPerElement; // 2 pos + 3 color + 2 uv = 7 floats
    final List<f3d.VertexAttribute> attributes = [
      // Use prefix
      f3d.VertexAttribute(name: 'position', offset: 0, format: 'float32x2'),
      f3d.VertexAttribute(
        name: 'color',
        offset: 2 * Float32List.bytesPerElement,
        format: 'float32x3',
      ),
      f3d.VertexAttribute(
        name: 'uv',
        offset: 5 * Float32List.bytesPerElement,
        format: 'float32x2',
      ), // Add UV attribute
    ];

    final f3d.Mesh triangleMesh = f3d.Mesh(
      // Use prefix
      vertices: vertices,
      vertexCount: 3,
      vertexStride: vertexStride,
      attributes: attributes,
    );

    // Create texture and material using prefix
    final f3d.Texture sampleTexture = f3d.Texture(
      source:
          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/SVG_Logo.svg/512px-SVG_Logo.svg.png',
    );
    final f3d.Material triangleMaterial = f3d.Material(map: sampleTexture);

    // Create an object, store it, and add it to the scene
    _triangleObject = f3d.Object3D(
      mesh: triangleMesh,
      material: triangleMaterial,
    ); // Use prefix
    _scene.add(_triangleObject!);

    print("Scene setup complete with one triangle object.");
  }

  void _requestRenderFrame() {
    if (!mounted || !_isRendererInitialized || _triangleObject == null) {
      print("Render loop stopped.");
      return;
    }

    try {
      // Apply a static translation matrix for debugging
      _triangleObject!.transform =
          vm.Matrix4.identity()
            ..translate(0.3, 0.2, 0.0); // Translate right and up slightly

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
