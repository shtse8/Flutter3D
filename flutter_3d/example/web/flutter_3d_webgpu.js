// Flutter 3D WebGPU Backend Logic

'use strict';

// Global state (consider encapsulating in a class later)
let gpuDevice = null;
let gpuAdapter = null;
let canvasContext = null;
let presentationFormat = null;
let pipeline = null; // Added for render pipeline
let vertexBuffer = null; // Added for triangle vertices

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
            pipeline = null; // Reset pipeline on device loss
            vertexBuffer = null; // Reset buffer on device loss
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

// --- Graphics Setup (Triangle) ---

function setupTriangleGraphics() {
    if (!gpuDevice) {
        console.error("Cannot setup graphics: WebGPU device not initialized.");
        return false;
    }

    // 1. Vertex Data & Buffer
    // Simple triangle vertices (x, y, r, g, b) - positions in clip space (-1 to 1)
    const vertices = new Float32Array([
        // Position      Color
         0.0,  0.5,     1.0, 0.0, 0.0, // Top vertex, red
        -0.5, -0.5,     0.0, 1.0, 0.0, // Bottom left, green
         0.5, -0.5,     0.0, 0.0, 1.0, // Bottom right, blue
    ]);

    vertexBuffer = gpuDevice.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true, // Allows writing data immediately
    });
    new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
    vertexBuffer.unmap();
    console.log("Vertex buffer created and mapped.");

    // 2. Shaders (WGSL)
    const wgslShaders = `
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) color : vec4<f32>,
        };

        @vertex
        fn vs_main(@location(0) pos: vec2<f32>, @location(1) color: vec3<f32>) -> VertexOutput {
            var output : VertexOutput;
            output.position = vec4<f32>(pos, 0.0, 1.0);
            output.color = vec4<f32>(color, 1.0); // Pass color to fragment shader
            return output;
        }

        @fragment
        fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
            return color; // Output the interpolated color
        }
    `;

    const shaderModule = gpuDevice.createShaderModule({
        code: wgslShaders,
    });
    console.log("Shader module created.");

    // 3. Render Pipeline
    pipeline = gpuDevice.createRenderPipeline({
        layout: 'auto', // Let WebGPU infer the pipeline layout
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [ // Describe vertex buffer layout
                {
                    arrayStride: 5 * Float32Array.BYTES_PER_ELEMENT, // 2 pos + 3 color = 5 floats
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x2' }, // pos
                        { shaderLocation: 1, offset: 2 * Float32Array.BYTES_PER_ELEMENT, format: 'float32x3' }, // color
                    ],
                },
            ],
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            targets: [{ format: presentationFormat }], // Use the canvas format
        },
        primitive: {
            topology: 'triangle-list', // Draw triangles
        },
    });
    console.log("Render pipeline created.");

    return true;
}


// --- Canvas Setup ---

/**
 * Configures a canvas for WebGPU rendering and sets up triangle graphics.
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

    presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    console.log("Preferred canvas format:", presentationFormat);

    canvasContext.configure({
        device: gpuDevice,
        format: presentationFormat,
        alphaMode: 'premultiplied'
    });
    console.log("Canvas context configured successfully.");

    // Setup triangle resources after configuring canvas (needs presentationFormat)
    return setupTriangleGraphics();
}


// --- Rendering Logic (Triangle) ---

/**
 * Renders a single frame, drawing the triangle.
 */
function renderFrame() {
    if (!gpuDevice || !canvasContext || !pipeline || !vertexBuffer) {
        console.warn("Cannot render: WebGPU resources not ready.");
        return;
    }

    const commandEncoder = gpuDevice.createCommandEncoder();
    const textureView = canvasContext.getCurrentTexture().createView();

    const renderPassDescriptor = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }, // Dark grey clear color
            loadOp: 'clear',
            storeOp: 'store',
        }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer); // Use slot 0 for the vertex buffer
    passEncoder.draw(3, 1, 0, 0); // Draw 3 vertices, 1 instance
    passEncoder.end();

    gpuDevice.queue.submit([commandEncoder.finish()]);
}

// --- Utility / Export ---

window.flutter3d_webgpu = {
    initWebGPU,
    configureCanvasContext,
    renderFrame
};

console.log("flutter_3d_webgpu.js loaded (with triangle drawing).");