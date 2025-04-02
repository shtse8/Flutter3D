# Technical Context: Flutter3D Rendering Engine

## Core Technologies

*   **Language (API):** Dart (via Flutter SDK)
*   **Language (Native Backends):** To be determined, likely a mix depending on platform and potential shared logic:
    *   **iOS/macOS:** Swift/Objective-C (for Metal integration)
    *   **Android:** Kotlin/Java (for JNI/Vulkan integration), potentially C++ (for NDK/Vulkan)
    *   **Windows:** C++ (for DirectX 12 integration)
    *   **Linux:** C++ (for Vulkan integration)
    *   **Web:** JavaScript/TypeScript (for WebGPU integration), potentially C++/Rust compiled to Wasm.
*   **Graphics APIs:**
    *   Metal (iOS, macOS)
    *   Vulkan (Android, Linux)
    *   DirectX 12 (Windows)
    *   WebGPU (Web)
*   **Communication Bridge:** Flutter Platform Channels or Dart FFI (Foreign Function Interface). FFI is generally preferred for performance-sensitive graphics interop.

## Key Dependencies (Anticipated)

*   Flutter SDK
*   Native build tools for each platform (Xcode, Android Studio/NDK, Visual Studio, etc.)
*   Potentially graphics API SDKs/loaders (Vulkan SDK, DirectX Headers, etc.)
*   Potentially shader compilation/translation tools (e.g., SPIRV-Cross, Naga, DXC)
*   Potentially asset loading libraries (e.g., cgltf, tinygltf)

## Technical Constraints & Considerations

*   **Performance:** Bridging between Dart and native code (especially via FFI) needs careful management to avoid bottlenecks. Data transfer (vertices, textures) must be efficient.
*   **Shader Management:** Handling shaders across different APIs (Metal Shading Language, GLSL/SPIR-V for Vulkan, HLSL for DX12, WGSL for WebGPU) requires a robust strategy (e.g., transpilation from a common source like WGSL, or maintaining separate shader sets).
*   **API Abstraction:** Designing a Dart API that is powerful yet effectively hides the significant differences between the underlying graphics APIs is a major challenge.
*   **Build Complexity:** Managing build configurations and dependencies across six distinct platform targets will be complex.
*   **API Evolution:** Graphics APIs (especially WebGPU) are still evolving. The plugin needs to be adaptable.