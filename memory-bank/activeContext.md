# Active Context: Flutter3D Rendering Engine

## Current Focus
*   Core Dart API connected to WebGPU backend; static triangle rendering via API working.
*   Paused debugging of matrix transformation rendering issue (blank screen). Code reverted to static triangle baseline.
*   Current focus: Decide next steps (e.g., texture mapping, material/shader API).
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
*   Attempted and reverted matrix transformation implementation due to rendering issues.
## Immediate Next Steps

1.  **Paused:** Debug matrix transformation rendering issue.
2.  **Next Option:** Implement basic texture loading and mapping.
    *   Add texture coordinates to `Mesh` and vertex data.
    *   Update shaders to sample textures.
    *   Implement texture loading (e.g., from `Image` widget or URL) in Dart/JS.
    *   Update JS backend to create GPU textures, samplers, and bind groups for textures.
3.  **Next Option:** Flesh out `Material` and `Shader` classes in the Dart API.