# Project Brief: Flutter3D Rendering Engine

## Core Goal

To develop a high-performance, cross-platform 3D rendering plugin for Flutter.

## Key Objectives

*   Provide a unified Dart API for 3D rendering tasks.
*   Leverage the most efficient, modern graphics APIs on each target platform:
    *   iOS: Metal
    *   Android: Vulkan
    *   Windows: DirectX 12
    *   macOS: Metal
    *   Linux: Vulkan
    *   Web: WebGPU
*   Abstract platform-specific complexities away from the Flutter developer.
*   Aim for performance comparable to native rendering solutions.
*   Serve as a modern alternative to existing, potentially outdated solutions like `flutter_gl`.

## Initial Focus

*   Establish the core API structure.
*   Implement the Web/WebGPU backend as the first target platform.