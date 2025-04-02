// Flutter 3D WebGPU Backend Logic

'use strict';

// Global state (consider encapsulating in a class later)
let gpuDevice = null;
let gpuAdapter = null;
let canvasContext = null;
let presentationFormat = null;

// --- Initialization ---

/**
 * Checks for WebGPU support and initializes the adapter and device.
 * Must be called before any other WebGPU operations.
 * @returns {Promise<boolean>} True if initialization is successful, false otherwise.
 */
async function initWebGPU() {
    if (gpuDevice) {
        console.log("WebGPU already initialized.");
        return true; // Already initialized
    }

    console.log("Initializing WebGPU...");
    if (!navigator.gpu) {
        console.error("WebGPU not supported on this browser.");
        alert("WebGPU is not supported on this browser. Please use a compatible browser like Chrome or Edge.");
        return false;
    }

    try {
        gpuAdapter = await navigator.gpu.requestAdapter();
        if (!gpuAdapter) {
            console.error("Failed to get GPU adapter.");
            alert("Failed to get GPU adapter. WebGPU might be disabled or unavailable.");
            return false;
        }
        console.log("GPU Adapter obtained:", gpuAdapter);

        // TODO: Add feature checks or request specific limits if needed
        gpuDevice = await gpuAdapter.requestDevice();
        if (!gpuDevice) {
            console.error("Failed to get GPU device.");
            alert("Failed to get GPU device.");
            return false;
        }
        console.log("GPU Device obtained:", gpuDevice);

        gpuDevice.lost.then((info) => {
            console.error(`WebGPU device lost: ${info.message}`);
            gpuDevice = null;
            gpuAdapter = null;
            // TODO: Handle device loss - potentially trigger re-initialization?
        });

        console.log("WebGPU initialization successful.");
        return true;

    } catch (error) {
        console.error("Error initializing WebGPU:", error);
        alert(`Error initializing WebGPU: ${error.message}`);
        return false;
    }
}

// --- Canvas Setup ---

/**
 * Configures a canvas for WebGPU rendering.
 * @param {HTMLCanvasElement} canvas The canvas element to use.
 * @returns {boolean} True if configuration is successful, false otherwise.
 */
function configureCanvasContext(canvas) {
    if (!gpuDevice) {
        console.error("WebGPU device not initialized. Call initWebGPU() first.");
        return false;
    }
    if (!canvas) {
        console.error("Invalid canvas element provided.");
        return false;
    }

    canvasContext = canvas.getContext('webgpu');
    if (!canvasContext) {
        console.error("Failed to get WebGPU context from canvas.");
        return false;
    }

    // Determine the preferred format for the canvas
    // Use navigator.gpu.getPreferredCanvasFormat() for optimal performance/compatibility
    presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    console.log("Preferred canvas format:", presentationFormat);

    canvasContext.configure({
        device: gpuDevice,
        format: presentationFormat,
        // Optional: Alpha mode (e.g., 'premultiplied', 'opaque')
        alphaMode: 'premultiplied' // or 'opaque'
    });

    console.log("Canvas context configured successfully.");
    return true;
}


// --- Rendering Logic (Placeholders) ---

/**
 * Placeholder for the main render loop function.
 */
function renderFrame() {
    if (!gpuDevice || !canvasContext) {
        console.warn("Cannot render: WebGPU device or canvas context not ready.");
        return;
    }

    // TODO: Implement actual rendering commands
    // 1. Get current texture from swap chain (canvas context)
    // 2. Create command encoder
    // 3. Create render pass descriptor (specify color attachments, depth/stencil)
    // 4. Begin render pass
    // 5. Set pipeline, bind groups, vertex/index buffers
    // 6. Draw calls
    // 7. End render pass
    // 8. Finish command encoder
    // 9. Submit command buffer to device queue

    // Example: Clear the canvas to a color (replace with actual drawing)
    const commandEncoder = gpuDevice.createCommandEncoder();
    const textureView = canvasContext.getCurrentTexture().createView();

    const renderPassDescriptor = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.0, g: 0.5, b: 0.8, a: 1.0 }, // Light blue clear color
            loadOp: 'clear',
            storeOp: 'store',
        }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.end(); // Nothing drawn yet

    gpuDevice.queue.submit([commandEncoder.finish()]);

    // Request next frame if running an animation loop
    // requestAnimationFrame(renderFrame);
}

// --- Utility / Export ---

// Expose functions needed by Dart via JS interop.
// We might wrap these in a class or object later for better organization.
// For now, make them globally accessible for simplicity during setup.
// (Consider using JSExport with Dart's js_interop for type safety later)
window.flutter3d_webgpu = {
    initWebGPU,
    configureCanvasContext,
    renderFrame
};

console.log("flutter_3d_webgpu.js loaded.");

// Automatically try to initialize on load (optional, might be better called from Dart)
// initWebGPU();