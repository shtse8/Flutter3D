// ignore: avoid_web_libraries_in_flutter
import 'dart:js_interop'; // Using js_interop for modern JS interaction

import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:web/web.dart'
    as web; // For accessing browser APIs like navigator, canvas

// Import the main library file to potentially access shared Dart types/interfaces later
import 'flutter_3d.dart'; // Access to Renderer, Scene etc. defined in the main lib

// --- JS Interop Definitions for WebGPU ---

/// JS Interop definition for the GPU object found on `navigator.gpu`.
@JS()
@staticInterop
class GPU {}

extension GPUCapabilities on GPU {
  // We'll add methods like requestAdapter here later
}

/// Extension type on Navigator to safely access the `gpu` property.
extension type NavigatorGPU._(web.Navigator navigator)
    implements web.Navigator {
  /// Accesses the `gpu` property which might not be in the standard typing.
  @JS('gpu')
  external GPU? get gpu;
}

// --- End JS Interop Definitions ---

// --- JS Interop Bindings for flutter_3d_webgpu.js ---

// Define the shape of the object exposed on the window
@JS('flutter3d_webgpu')
@staticInterop
class Flutter3DWebGPUJS {}

extension Flutter3DWebGPUJSMethods on Flutter3DWebGPUJS {
  @JS('initWebGPU')
  external JSPromise<JSBoolean> initWebGPU(); // Returns a Promise<boolean>

  @JS('configureCanvasContext')
  external JSBoolean configureCanvasContext(web.HTMLCanvasElement canvas); // Returns boolean

  @JS('renderFrame')
  external void renderFrame(); // Returns void
}

// Helper to access the global object
@JS('window.flutter3d_webgpu')
external Flutter3DWebGPUJS? get _flutter3dWebGPU;

// --- End JS Interop Bindings ---

/// A web implementation of the flutter_3d plugin using WebGPU.
class Flutter3dWeb {
  /// Constructs a Flutter3dWeb instance.
  /// This might hold references to the WebGPU device, context, etc. later.
  Flutter3dWeb() {
    // Initialization should be triggered explicitly, e.g., via initializeWebGPU().
    print(
      "Flutter3dWeb instance created. Call initializeWebGPU() to set up WebGPU.",
    );
  }

  /// Registers this class as the web implementation for the plugin.
  static void registerWith(Registrar registrar) {
    // In a pure FFI/JS-interop approach without a platform interface,
    // this registration might primarily be used to signal web support
    // or potentially register factory functions for web-specific classes.
    // For now, we'll leave it simple. We might instantiate our main web
    // renderer class here later.
    print('Flutter3dWeb registered.');
  }

  /// Calls the JavaScript initWebGPU function.
  Future<bool> initializeWebGPU() async {
    final jsObject = _flutter3dWebGPU;
    if (jsObject == null) {
      print(
        'Error: flutter_3d_webgpu.js script not loaded or object not found.',
      );
      return false;
    }
    try {
      // await the promise, then convert the resulting JSBoolean to Dart bool
      final jsResult = await jsObject.initWebGPU().toDart;
      final result = jsResult.toDart;
      print('Dart: initWebGPU returned $result');
      return result;
    } catch (e) {
      print('Dart: Error calling initWebGPU: $e');
      return false;
    }
  }

  /// Calls the JavaScript configureCanvasContext function.
  bool configureCanvas(web.HTMLCanvasElement canvas) {
    final jsObject = _flutter3dWebGPU;
    if (jsObject == null) {
      print(
        'Error: flutter_3d_webgpu.js script not loaded or object not found.',
      );
      return false;
    }
    try {
      final result = jsObject.configureCanvasContext(canvas).toDart;
      print('Dart: configureCanvasContext returned $result');
      return result;
    } catch (e) {
      print('Dart: Error calling configureCanvasContext: $e');
      return false;
    }
  }

  /// Calls the JavaScript renderFrame function.
  void callRenderFrame() {
    final jsObject = _flutter3dWebGPU;
    if (jsObject == null) {
      print(
        'Error: flutter_3d_webgpu.js script not loaded or object not found.',
      );
      return;
    }
    try {
      jsObject.renderFrame();
      // print('Dart: renderFrame called.'); // Avoid logging every frame
    } catch (e) {
      print('Dart: Error calling renderFrame: $e');
    }
  }

  // TODO: Add methods here that correspond to the Dart API (e.g., Renderer, Scene)
  // These methods will use JS interop (`package:web` or `dart:js_interop`)
  // to call the actual WebGPU JavaScript code (which we'll write in the `web/` directory).

  // Example placeholder for a future method:
  // Future<void> initializeRenderer(web.HTMLCanvasElement canvas) async {
  //   if (!await _checkWebGPUSupport()) {
  //     throw Exception('WebGPU not supported');
  //   }
  //   // TODO: Call JS interop function to initialize WebGPU on the given canvas
  //   print('Initializing WebGPU renderer for canvas...');
  // }
}
