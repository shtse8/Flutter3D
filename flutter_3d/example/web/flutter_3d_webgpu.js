// Flutter 3D WebGPU Backend Logic

'use strict';

// Global state
let gpuDevice = null;
let gpuAdapter = null;
let canvasContext = null;
let presentationFormat = null;
let pipeline = null; // Single pipeline for now

// Store mesh data (buffers, counts, etc.) keyed by meshId from Dart
const meshRegistry = new Map();

// --- Initialization ---

async function initWebGPU() {
    if (gpuDevice) return true;
    console.log("Initializing WebGPU...");
    if (!navigator.gpu) {
        console.error("WebGPU not supported.");
        alert("WebGPU is not supported.");
        return false;
    }
    try {
        gpuAdapter = await navigator.gpu.requestAdapter();
        if (!gpuAdapter) throw new Error("Failed to get GPU adapter.");
        console.log("GPU Adapter obtained:", gpuAdapter);

        gpuDevice = await gpuAdapter.requestDevice();
        if (!gpuDevice) throw new Error("Failed to get GPU device.");
        console.log("GPU Device obtained:", gpuDevice);

        gpuDevice.lost.then((info) => {
            console.error(`WebGPU device lost: ${info.message}`);
            // Clear resources that depend on the device
            gpuDevice = null;
            gpuAdapter = null;
            pipeline = null;
            meshRegistry.clear();
            // TODO: Handle device loss more robustly
        });

        console.log("WebGPU initialization successful.");
        return true;
    } catch (error) {
        console.error("Error initializing WebGPU:", error);
        alert(`Error initializing WebGPU: ${error.message}`);
        return false;
    }
}

// --- Mesh Buffer Setup ---

/**
 * Creates or updates a GPU vertex buffer for a given mesh.
 * @param {string} meshId Unique ID for the mesh (from Dart).
 * @param {Float32Array} vertices Interleaved vertex data.
 * @param {number} stride Vertex stride in bytes.
 * @param {Array<object>} attributes Array of attribute descriptions ({ name, offset, format }).
 * @returns {string | null} The meshId if successful, null otherwise.
 */
function setupMeshBuffer(meshId, vertices, stride, attributes) {
    if (!gpuDevice) {
        console.error("Cannot setup mesh buffer: WebGPU device not initialized.");
        return null;
    }
    console.log(`Setting up buffer for meshId: ${meshId}`);
    console.log(`  Vertices length: ${vertices.length}, Stride: ${stride}`);
    console.log(`  Attributes:`, attributes);

    try {
        // TODO: Handle buffer updates vs creation if meshId already exists
        if (meshRegistry.has(meshId)) {
            // For now, just recreate if it exists
            console.warn(`Mesh ${meshId} already exists, recreating buffer.`);
            // TODO: Destroy old buffer? meshRegistry.get(meshId).buffer.destroy();
        }

        const vertexBuffer = gpuDevice.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
        vertexBuffer.unmap();

        const vertexCount = vertices.length / (stride / Float32Array.BYTES_PER_ELEMENT);

        // Store buffer and related info
        meshRegistry.set(meshId, {
            buffer: vertexBuffer,
            vertexCount: vertexCount,
            stride: stride,
            attributes: attributes // Store attributes for potential pipeline recreation later
        });

        console.log(`Buffer created for mesh ${meshId}, Vertex count: ${vertexCount}`);
        return meshId; // Return the ID as the handle for now

    } catch (error) {
        console.error(`Error setting up buffer for mesh ${meshId}:`, error);
        return null;
    }
}


// --- Graphics Pipeline Setup ---

// Creates the render pipeline (assuming vertex format won't change often for now)
// TODO: Make pipeline creation more dynamic based on material/shader later
function setupPipeline(attributes) {
     if (!gpuDevice || !presentationFormat) {
        console.error("Cannot setup pipeline: WebGPU device or presentation format not ready.");
        return false;
    }
    if (pipeline) return true; // Already created

    console.log("Setting up render pipeline...");

    // Convert Dart attributes to WebGPU buffer layout
    const gpuAttributes = attributes.map((attr, index) => ({
        shaderLocation: index, // Assuming shader locations 0, 1, ...
        offset: attr.offset,
        format: attr.format
    }));

    const wgslShaders = `
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) color : vec4<f32>, // Assuming color is always location 0 for now
        };

        // TODO: Make shader inputs dynamic based on attributes
        @vertex
        fn vs_main(@location(0) pos: vec2<f32>, @location(1) color: vec3<f32>) -> VertexOutput {
            var output : VertexOutput;
            output.position = vec4<f32>(pos, 0.0, 1.0);
            output.color = vec4<f32>(color, 1.0);
            return output;
        }

        @fragment
        fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
            return color;
        }
    `;

    const shaderModule = gpuDevice.createShaderModule({ code: wgslShaders });

    pipeline = gpuDevice.createRenderPipeline({
        layout: 'auto',
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: attributes.reduce((maxOffset, attr) => Math.max(maxOffset, attr.offset + _getFormatByteSize(attr.format)), 0), // Calculate stride based on attributes
                attributes: gpuAttributes,
            }],
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fs_main',
            targets: [{ format: presentationFormat }],
        },
        primitive: { topology: 'triangle-list' },
    });
    console.log("Render pipeline created.");
    return true;
}

// Helper to get byte size of a format (simplified)
function _getFormatByteSize(format) {
    switch(format) {
        case 'float32x2': return 2 * 4;
        case 'float32x3': return 3 * 4;
        case 'float32x4': return 4 * 4;
        // Add other formats as needed
        default: return 0;
    }
}


// --- Canvas Setup ---

function configureCanvasContext(canvas) {
    if (!gpuDevice) {
        console.error("WebGPU device not initialized."); return false;
    }
    if (!canvas) {
        console.error("Invalid canvas element."); return false;
    }

    canvasContext = canvas.getContext('webgpu');
    if (!canvasContext) {
        console.error("Failed to get WebGPU context."); return false;
    }

    presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    console.log("Preferred canvas format:", presentationFormat);

    canvasContext.configure({
        device: gpuDevice,
        format: presentationFormat,
        alphaMode: 'premultiplied'
    });
    console.log("Canvas context configured.");

    // Pipeline setup depends on attributes, defer until first mesh is set up?
    // Or create a default pipeline here? Let's defer for now.

    return true;
}


// --- Rendering Logic ---

/**
 * Renders a mesh identified by meshId.
 * @param {string} meshId The ID of the mesh to render (must match one from setupMeshBuffer).
 */
function renderMesh(meshId) {
    if (!gpuDevice || !canvasContext) {
        console.warn("Cannot render: WebGPU device or canvas context not ready."); return;
    }

    const meshData = meshRegistry.get(meshId);
    if (!meshData) {
        console.warn(`Cannot render: Mesh data not found for id ${meshId}.`); return;
    }

    // Ensure pipeline is created (using attributes from the mesh)
    // TODO: This is inefficient if multiple meshes share the same attributes/pipeline
    if (!setupPipeline(meshData.attributes)) {
         console.error("Cannot render: Failed to setup pipeline."); return;
    }

    const commandEncoder = gpuDevice.createCommandEncoder();
    const textureView = canvasContext.getCurrentTexture().createView();

    const renderPassDescriptor = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }, // Dark grey clear
            loadOp: 'clear',
            storeOp: 'store',
        }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, meshData.buffer); // Use the buffer for this meshId
    passEncoder.draw(meshData.vertexCount, 1, 0, 0); // Use vertex count for this meshId
    passEncoder.end();

    gpuDevice.queue.submit([commandEncoder.finish()]);
}

// --- Utility / Export ---

window.flutter3d_webgpu = {
    initWebGPU,
    configureCanvasContext,
    setupMeshBuffer, // Expose the new function
    renderMesh // Expose the renamed function
};

console.log("flutter_3d_webgpu.js loaded (with mesh setup and renderMesh).");