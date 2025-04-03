// ignore: avoid_web_libraries_in_flutter
import 'dart:js_interop';
import 'dart:js_interop_unsafe'; // Import for setProperty extension method

import 'package:flutter_web_plugins/flutter_web_plugins.dart';
import 'package:web/web.dart' as web;
import 'package:vector_math/vector_math_64.dart'; // Import for Matrix4

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

// /// Extension to convert VertexAttribute to a JSObjectBox for interop.
// /// NOTE: Analyzer seems to have issues with setProperty inside this extension.
// extension VertexAttributeToJS on VertexAttribute {
//   JSObject get toJSBox {
//     final obj = JSObject();
//     setProperty(obj, 'name'.toJS, name.toJS);
//     setProperty(obj, 'offset'.toJS, offset.toJS);
//     setProperty(obj, 'format'.toJS, format.toJS);
//     return obj;
//   }
// }

// --- JS Interop Bindings for flutter_3d_webgpu.js ---

// Define the shape of the object exposed on the window
@JS('flutter3d_webgpu')
@staticInterop
class Flutter3DWebGPUJS {}

extension Flutter3DWebGPUJSMethods on Flutter3DWebGPUJS {
  @JS('initWebGPU')
  external JSPromise<JSBoolean> initWebGPU();

  @JS('configureCanvasContext')
  external JSBoolean configureCanvasContext(web.HTMLCanvasElement canvas);

  // New function to setup vertex buffer, uniforms, texture, bind group for an object
  @JS('setupObject')
  external JSPromise<JSAny?> setupObject(
    // Returns Promise<objectId | null>
    String objectId,
    JSTypedArray vertices,
    JSNumber stride,
    JSArray<JSObject> attributes,
    JSString? textureUrl, // Optional texture URL
  );

  @JS('renderObject') // Renamed JS function
  external void renderObject(String objectId, JSTypedArray transformMatrix); // Accepts objectId and matrix
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

  /// Sets up the GPU resources for a given object (mesh, material/texture).
  /// Returns the objectId if successful.
  Future<String?> setupObject(Object3D object) async {
    if (object.mesh == null) {
      print('Error: Cannot setup object without a mesh.');
      return null;
    }
    final mesh = object.mesh!;
    // Use mesh hashCode as objectId for now
    final objectId = mesh.hashCode.toString();
    final textureUrl = object.material?.map?.source;

    final jsObject = _flutter3dWebGPU;
    if (jsObject == null) {
      print('Error: flutter_3d_webgpu.js script not loaded.');
      return null;
    }
    try {
      // Convert Dart data to JS types
      final jsVertices = mesh.vertices.toJS;
      final jsStride = mesh.vertexStride.toJS;
      final jsAttributesList = <JSObject>[];
      for (final attr in mesh.attributes) {
        final jsAttr = JSObject();
        jsAttr.setProperty('name'.toJS, attr.name.toJS);
        jsAttr.setProperty('offset'.toJS, attr.offset.toJS);
        jsAttr.setProperty('format'.toJS, attr.format.toJS);
        jsAttributesList.add(jsAttr);
      }
      final jsAttributes = jsAttributesList.toJS;
      final jsTextureUrl = textureUrl?.toJS; // Convert String? to JSString?

      // Call the async JS function
      final resultPromise = jsObject.setupObject(
        objectId,
        jsVertices,
        jsStride,
        jsAttributes,
        jsTextureUrl,
      );
      final result = await resultPromise.toDart; // Await the promise

      // The JS function returns the objectId (string) or null
      if (result != null && result is JSString) {
        final returnedId = result.toDart;
        print('Dart: setupObject completed for object $returnedId');
        return returnedId;
      } else {
        print(
          'Dart: setupObject failed for object $objectId (JS returned null or unexpected type)',
        );
        return null;
      }
    } catch (e) {
      print('Dart: Error calling setupObject for $objectId: $e');
      return null;
    }
  }
  // Removed extra closing brace

  /// Calls the JavaScript renderObject function.
  /// Assumes setupObject has already been called.
  void renderObject(Object3D object) {
    // Method name already correct, just ensuring consistency
    if (object.mesh == null) return; // Cannot render without mesh

    if (object.mesh == null) return; // Cannot render without mesh
    final mesh = object.mesh!; // Extract mesh
    final transform = object.transform; // Extract transform

    final jsObject = _flutter3dWebGPU;
    if (jsObject == null) {
      print('Error: flutter_3d_webgpu.js script not loaded.');
      return;
    }
    try {
      // Use mesh hashCode as objectId for now
      final objectId = object.mesh!.hashCode.toString();
      final jsMatrix = object.transform.storage.toJS; // Pass current transform

      jsObject.renderObject(objectId, jsMatrix);
      // print('Dart: renderObject called for $objectId');
    } catch (e) {
      print('Dart: Error calling renderObject: $e');
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
