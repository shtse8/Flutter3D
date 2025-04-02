import 'dart:typed_data';
import 'dart:js_interop';
import 'dart:js_interop_unsafe'; // Import for setProperty extension method

// Conditional import for web-specific types
import 'flutter_3d_web.dart'
    if (dart.library.io) 'stub/flutter_3d_web_stub.dart';
import 'package:web/web.dart' if (dart.library.io) 'stub/web_stub.dart' as web;

/// Represents the main entry point for the 3D rendering engine.
/// Manages rendering contexts and resources.
class Renderer {
  // This will eventually be a platform interface type, but for now,
  // we directly reference the web implementation for simplicity.
  Flutter3dWeb? _platformRenderer; // Make nullable

  bool _isInitialized = false;
  final Set<int> _uploadedMeshHashes = {}; // Track uploaded meshes

  /// Initializes the renderer, potentially associating it with a canvas.
  /// For web, this requires the canvas element.
  Future<bool> initialize(web.HTMLCanvasElement canvas) async {
    // TODO: Later, use Platform Interface to get the correct implementation.
    _platformRenderer = Flutter3dWeb();
    final gpuOk = await _platformRenderer!.initializeWebGPU();
    if (!gpuOk) return false;
    final canvasOk = _platformRenderer!.configureCanvas(canvas);
    if (!canvasOk) return false;
    _isInitialized = true;
    return true;
  }

  /// Renders a given scene with a specific camera.
  void render(Scene scene, Camera camera) {
    if (!_isInitialized || _platformRenderer == null) {
      print("Renderer not initialized.");
      return;
    }
    // TODO: Implement camera transformations later.
    // TODO: Implement material/shader handling later.

    // Basic render loop: iterate objects, setup their mesh buffers, and render.
    // This is highly simplified. A real renderer would manage state, batching,
    // buffer reuse, etc.
    for (final object in scene.children) {
      if (object.mesh != null) {
        final mesh = object.mesh!;
        final meshHash = mesh.hashCode;

        // Only upload mesh data if we haven't seen this mesh before
        if (!_uploadedMeshHashes.contains(meshHash)) {
          print("Renderer: Uploading mesh ${meshHash}...");
          // TODO: Handle buffer handle/ID properly
          _platformRenderer!.setupMesh(mesh);
          _uploadedMeshHashes.add(meshHash);
        }

        // Render the mesh using the platform implementation
        _platformRenderer!.renderMesh(object.mesh!);
      }
    }
  }

  /// Disposes of the renderer and releases resources.
  void dispose() {
    // TODO: Call dispose on _platformRenderer if it exists and implements it.
    // TODO: Call dispose on _platformRenderer if it exists and implements it.
    _uploadedMeshHashes.clear(); // Clear tracked meshes
    _isInitialized = false;
    _platformRenderer = null;
  }
}

/// Represents the 3D world containing objects, lights, etc.
class Scene {
  final List<Object3D> children = [];
  // TODO: Add lights, background color/skybox etc.

  void add(Object3D object) {
    children.add(object);
    // TODO: Potentially notify renderer or update internal structures.
  }

  void remove(Object3D object) {
    children.remove(object);
    // TODO: Potentially notify renderer or update internal structures.
  }

  void clear() {
    children.clear();
    // TODO: Potentially notify renderer or update internal structures.
  }
}

/// Represents an object within the scene (e.g., a mesh with a material).
class Object3D {
  Mesh? mesh;
  Material? material;
  // TODO: Add transformations (position, rotation, scale) - likely using vector_math Matrix4

  Object3D({this.mesh, this.material});

  // TODO: Add methods for updating transformations?
}

/// Describes a single vertex attribute within a mesh buffer.
class VertexAttribute {
  final String name; // e.g., 'position', 'color', 'uv'
  final int offset; // Offset in bytes within the stride
  final String
  format; // e.g., 'float32x2', 'float32x3' (matches WGSL/WebGPU formats)
  // final int shaderLocation; // Optional: Explicit shader location

  VertexAttribute({
    required this.name,
    required this.offset,
    required this.format,
    // this.shaderLocation,
  });

  /// Converts this attribute to a JSObject suitable for interop.
  /// NOTE: This method will only work on the web platform.
  JSObject toJSBox() {
    final obj = JSObject();
    // Use the setProperty extension method from dart:js_interop_unsafe
    obj.setProperty('name'.toJS, name.toJS);
    obj.setProperty('offset'.toJS, offset.toJS);
    obj.setProperty('format'.toJS, format.toJS);
    return obj;
  }
}

/// Represents geometry data (vertices, indices, UVs, normals).
class Mesh {
  final Float32List vertices;
  final int vertexCount;
  final int vertexStride; // Stride in bytes
  final List<VertexAttribute> attributes;
  // TODO: Add indices (Uint16List or Uint32List) later

  /// Creates a mesh from vertex data and attribute descriptions.
  /// Assumes interleaved vertex data in the `vertices` list.
  Mesh({
    required this.vertices,
    required this.vertexCount,
    required this.vertexStride,
    required this.attributes,
  }) {
    // TODO: Add validation (e.g., vertexCount * vertexStride == vertices.lengthInBytes)
  }

  // TODO: Add methods for managing GPU buffers associated with this mesh?
  // Or handle buffer creation/updates in the Renderer/Platform implementation.
}

/// Represents the surface appearance of an object (shaders, textures, parameters).
class Material {
  // TODO: Implement material properties and shader linkage.
}

/// Represents image data used for texturing.
class Texture {
  // TODO: Implement texture loading and management.
}

/// Represents shader programs defining rendering logic.
class Shader {
  // TODO: Implement shader loading and management.
}

/// Defines the viewpoint into the scene.
class Camera {
  // TODO: Implement camera properties (position, target, projection type).
}

/// Represents a light source in the scene.
class Light {
  // TODO: Implement light types (directional, point, spot) and properties.
}
