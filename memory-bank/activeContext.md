# Active Context: Flutter3D Rendering Engine

## Current Focus
*   Successfully rendered a basic triangle using the Web/WebGPU backend.
*   Current focus: Refine the rendering pipeline, connect the core Dart API (`Renderer`, `Scene`, etc.) to the web backend, and add more features (e.g., transformations, textures).
## Recent Changes

*   Project plan defined and saved to `planning_notes.md`.
*   `memory-bank` directory created.
*   Core Memory Bank files created:
    *   `projectbrief.md`
    *   `productContext.md`
    *   `techContext.md`
    *   `systemPatterns.md`
*   Created `flutter_3d/web/flutter_3d_webgpu.js` with initial WebGPU setup functions.
*   Updated `flutter_3d/lib/flutter_3d_web.dart` with JS interop bindings.
*   Modified `flutter_3d/example/web/index.html` to load the JS file.
*   Updated `flutter_3d/example/lib/main.dart` to initialize WebGPU, create/configure canvas, and render the triangle.

## Immediate Next Steps

1.  **Current:** Connect the core Dart API classes (`Renderer`, `Scene`, `Object3D`, `Mesh`, `Material`) to the web backend.
    *   Modify `flutter_3d.dart` classes to hold relevant data (e.g., mesh vertices, material properties).
    *   Modify `flutter_3d_web.dart` to accept data from the Dart API classes.
    *   Modify `flutter_3d_webgpu.js` to use data passed from Dart (e.g., vertex data, shader parameters) instead of hardcoded values.
2.  Implement transformations (position, rotation, scale) using matrices (e.g., using `vector_math` package in Dart and uniform buffers in WebGPU).
3.  Implement basic texture loading and mapping.