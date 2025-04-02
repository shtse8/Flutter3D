# System Patterns: Flutter3D Rendering Engine

## High-Level Architecture

The system follows a layered architecture:

1.  **Flutter Application Layer:** The end-user Flutter application interacts with the plugin via the Dart API.
2.  **Dart API Layer:** A platform-agnostic Dart API provides the interface for 3D rendering tasks (Scene management, object creation, rendering commands).
3.  **Bridge Layer:** Utilizes Dart FFI (preferred) or Platform Channels to communicate between the Dart layer and the native platform code. FFI is targeted for better performance with graphics operations.
4.  **Native Adapter Layer:** Platform-specific implementations (Adapters) that translate the Dart API calls into commands for the native graphics API (Metal, Vulkan, DX12, WebGPU).
5.  **Native Graphics API Layer:** The underlying graphics APIs provided by the operating systems.

```mermaid
graph TD
    AppCode[Flutter App Code (Dart)] --> DartAPI[Core Rendering API (Dart)]
    DartAPI --- PlatformBridge[FFI/Platform Channel Bridge]
    PlatformBridge --- NativeAdapters[Native Adapters (Platform Specific)]
    NativeAdapters --> GraphicsAPIs[Native Graphics APIs (Metal, Vulkan, DX12, WebGPU)]

    subgraph Plugin Scope
        DartAPI
        PlatformBridge
        NativeAdapters
    end

    style Plugin Scope fill:#d2ffd2,stroke:#7aa87a
```

## Key Design Patterns & Decisions

*   **Abstraction Layer:** The Dart API acts as a strong abstraction layer, hiding the complexities and differences of the underlying native graphics APIs.
*   **Adapter Pattern:** Each platform implementation serves as an Adapter, translating the common Dart API interface into the specific requirements of the native graphics API.
*   **FFI for Performance:** Dart FFI will be prioritized for communication between Dart and native code, especially for frequent calls or large data transfers (geometry, textures), to minimize overhead compared to Platform Channels.
*   **Resource Management:** Careful management of graphics resources (buffers, textures, shaders) is critical. The Dart API will likely provide handles, while the native adapters manage the actual GPU resource lifetimes. Explicit disposal methods will be necessary.
*   **Asynchronous Operations:** Many graphics operations are asynchronous. The API design must accommodate this, likely using Dart `Future`s or callbacks.
*   **Shader Strategy:** A common shader language (likely WGSL) with transpilation (using tools like Naga or SPIRV-Cross) to native formats (MSL, SPIR-V, HLSL) is the preferred approach for maintainability, though writing native shaders remains an option if needed for specific optimizations.
*   **Modularity:** Design the native adapters to be as modular as possible to simplify maintenance and testing. Consider if any core logic (e.g., math, scene graph basics) can be shared across platforms using C++ or Rust compiled for each target.