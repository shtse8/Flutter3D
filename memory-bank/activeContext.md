# Active Context: Flutter3D Rendering Engine

## Current Focus
*   Core Dart API (`Renderer`, `Scene`, `Mesh`, `Object3D`) successfully connected to the WebGPU backend.
*   Triangle defined in Dart is rendered via the API, with mesh data uploaded only once.
*   Current focus: Implement transformations (matrices) and texture mapping.
## Recent Changes

*   Project plan defined and saved to `planning_notes.md`.
*   `memory-bank` directory created.
*   Core Memory Bank files created:
    *   `projectbrief.md`
    *   `productContext.md`
    *   `techContext.md`
    *   `systemPatterns.md`
*   Created `flutter_3d/web/flutter_3d_webgpu.js` with initial WebGPU setup functions.
*   Updated `flutter_3d/lib/flutter_3d_web.dart` with JS interop bindings for mesh setup/rendering.
*   Updated `flutter_3d/lib/flutter_3d.dart` API classes (`Mesh`, `Object3D`, `Scene`, `Renderer`) to handle data and drive rendering.
*   Added stub files for conditional imports (`flutter_3d/lib/stub/`).
*   Fixed `setProperty` usage with `dart:js_interop_unsafe`.
*   Modified `flutter_3d/example/web/index.html` to load the JS file.
*   Updated `flutter_3d/example/lib/main.dart` to use the core Dart API (`Renderer`, `Scene`, etc.) to define and render the triangle.
*   Optimized `Renderer` to avoid redundant mesh uploads.
## Immediate Next Steps

1.  **Current:** Implement transformations (position, rotation, scale) using matrices.
    *   Add `vector_math` dependency.
    *   Add `Matrix4` transformation property to `Object3D`.
    *   Update shaders (WGSL) to accept a transformation matrix (Uniform Buffer).
    *   Update JS backend (`flutter_3d_webgpu.js`) to create/update uniform buffers and bind groups.
    *   Update Dart web backend (`flutter_3d_web.dart`) to pass matrix data.
    *   Update `Renderer` to handle transformations.
2.  Implement basic texture loading and mapping.
3.  Flesh out `Material` and `Shader` classes.