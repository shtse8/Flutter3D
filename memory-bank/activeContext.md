# Active Context: Flutter3D Rendering Engine

## Current Focus

*   Initial project setup completed (Memory Bank, Flutter plugin structure, basic Dart API definition).
*   Focus shifting to implementing the Web/WebGPU backend adapter.
## Recent Changes

*   Project plan defined and saved to `planning_notes.md`.
*   `memory-bank` directory created.
*   Core Memory Bank files created:
    *   `projectbrief.md`
    *   `productContext.md`
    *   `techContext.md`
    *   `systemPatterns.md`

## Immediate Next Steps

1.  **Current:** Start implementing the Web platform integration (WebGPU backend).
    *   Define the FFI/JS-interop bridge between Dart and JavaScript.
    *   Write JavaScript code to interact with the WebGPU API (initialize device, create swap chain, basic render pipeline).
    *   Connect the Dart `Renderer` class to the JavaScript implementation.
2.  Implement basic rendering of a simple shape (e.g., triangle or cube) using the WebGPU backend.