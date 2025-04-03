// Flutter 3D WebGPU Backend Logic

'use strict';

// Global state
let gpuDevice = null;
let gpuAdapter = null;
let canvasContext = null;
let presentationFormat = null;
let pipeline = null;

// Store mesh data (buffers, counts, etc.) keyed by meshId from Dart
const meshRegistry = new Map();
// Store uniform buffer and bind group per object (using meshId as key for now)
const objectUniforms = new Map();

// Matrix size in bytes (4x4 float32)
const MATRIX_SIZE = 4 * 4 * Float32Array.BYTES_PER_ELEMENT; // 64 bytes
// Pad buffer size to 256 bytes for potential alignment requirements
const UNIFORM_BUFFER_SIZE = Math.ceil(MATRIX_SIZE / 256) * 256; // Should be 256

// --- Initialization ---

async function initWebGPU() {
    // ... (initWebGPU function remains the same) ...
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
            gpuDevice = null;
            gpuAdapter = null;
            pipeline = null;
            meshRegistry.clear();
            objectUniforms.clear(); // Clear uniforms on device loss
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

function setupMeshBuffer(meshId, vertices, stride, attributes) {
    // ... (setupMeshBuffer function remains largely the same) ...
    if (!gpuDevice) {
        console.error("Cannot setup mesh buffer: WebGPU device not initialized.");
        return null;
    }
    console.log(`Setting up buffer for meshId: ${meshId}`);
    console.log(`  Vertices length: ${vertices.length}, Stride: ${stride}`);
    console.log(`  Attributes:`, attributes);

    try {
        if (meshRegistry.has(meshId)) {
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

        meshRegistry.set(meshId, {
            buffer: vertexBuffer,
            vertexCount: vertexCount,
            stride: stride,
            attributes: attributes
        });

        // --- Also create uniform buffer and bind group for this object ---
        const uniformBuffer = gpuDevice.createBuffer({
            size: UNIFORM_BUFFER_SIZE, // Use padded size
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            // MappedAtCreation is NOT allowed for UNIFORM usage!
        });

        // Write initial identity matrix immediately after creation
        const identityMatrix = new Float32Array([
            1, 0, 0, 0,  0, 1, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1
        ]);
        gpuDevice.queue.writeBuffer(
            uniformBuffer, 0, identityMatrix.buffer, identityMatrix.byteOffset, identityMatrix.byteLength
        );

        // Ensure pipeline exists to get its layout for the bind group
        // Note: This assumes pipeline layout is compatible across meshes for now
        // Pass meshData to setupPipeline so it can access stride/attributes
        if (!pipeline && !setupPipeline(meshRegistry.get(meshId))) {
             throw new Error("Failed to setup pipeline for bind group creation.");
        }

        const bindGroup = gpuDevice.createBindGroup({
            layout: pipeline.getBindGroupLayout(0), // Use layout from pipeline
            entries: [{
                binding: 0,
                resource: { buffer: uniformBuffer },
            }],
        });

        objectUniforms.set(meshId, {
            buffer: uniformBuffer,
            bindGroup: bindGroup,
            // Store matrix data? Or expect it to be passed in renderMesh?
            // Let's expect it in renderMesh for now.
        });
        // ----------------------------------------------------------------

        console.log(`Buffer and uniforms created for mesh ${meshId}, Vertex count: ${vertexCount}`);
        return meshId;

    } catch (error) {
        console.error(`Error setting up buffer/uniforms for mesh ${meshId}:`, error);
        return null;
    }
}


// --- Graphics Pipeline Setup ---

function setupPipeline(meshData) {
    // ... (setupPipeline function remains largely the same, but uses gpuAttributes) ...
    const attributes = meshData.attributes; // Get attributes from meshData
    const stride = meshData.stride; // Get stride from meshData

    if (!gpuDevice || !presentationFormat) {
        console.error("Cannot setup pipeline: WebGPU device or presentation format not ready."); return false;
    }
    if (pipeline) return true; // Already created

    console.log("Setting up render pipeline...");

    const gpuAttributes = attributes.map((attr, index) => ({
        shaderLocation: attr.name === 'position' ? 0 : (attr.name === 'color' ? 1 : index),
        offset: attr.offset,
        format: attr.format
    }));
    console.log("GPU Attributes for pipeline:", gpuAttributes);
    // Stride is now correctly passed in via meshData
    console.log("Using stride from meshData:", stride);


    const wgslShaders = `
        struct Uniforms {
            modelViewProjectionMatrix : mat4x4<f32>,
        };
        @group(0) @binding(0) var<uniform> uniforms : Uniforms;

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) color : vec4<f32>,
        };

        @vertex
        fn vs_main(@location(0) pos: vec2<f32>, @location(1) color: vec3<f32>) -> VertexOutput {
            var output : VertexOutput;
            // TEMPORARY DEBUG: Output raw position, ignoring matrix
            output.position = vec4<f32>(pos, 0.0, 1.0);
            // output.position = uniforms.modelViewProjectionMatrix * vec4<f32>(pos, 0.0, 1.0);
            output.color = vec4<f32>(color, 1.0);
            return output;
        }

        @fragment
        fn fs_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
            return color; // Original color passthrough
        }
    `;

    const shaderModule = gpuDevice.createShaderModule({ code: wgslShaders });

    // Define bind group layout explicitly
     const bindGroupLayout = gpuDevice.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, // Add Fragment visibility
            buffer: { type: 'uniform' },
        }],
    });

    const pipelineLayout = gpuDevice.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout], // Use the explicit layout
    });


    pipeline = gpuDevice.createRenderPipeline({
        layout: pipelineLayout, // Use the created layout
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: stride, // Use stride from meshData passed into setupPipeline
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
    // ... (remains the same) ...
    switch(format) {
        case 'float32x2': return 2 * 4;
        case 'float32x3': return 3 * 4;
        case 'float32x4': return 4 * 4;
        default: return 0;
    }
}


// --- Canvas Setup ---

function configureCanvasContext(canvas) {
    // ... (remains the same, no longer calls setupPipeline directly) ...
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
    return true;
}


// --- Rendering Logic ---

/**
 * Renders a mesh identified by meshId using its transform matrix.
 * @param {string} meshId The ID of the mesh to render.
 * @param {Float32Array} transformMatrix The 4x4 transformation matrix.
 */
function renderMesh(meshId, transformMatrix) {
    if (!gpuDevice || !canvasContext) {
        console.warn("Cannot render: WebGPU device or canvas context not ready."); return;
    }

    const meshData = meshRegistry.get(meshId);
    const uniformData = objectUniforms.get(meshId);

    if (!meshData || !uniformData) {
        console.warn(`Cannot render: Mesh or uniform data not found for id ${meshId}.`); return;
    }

    // Ensure pipeline is created (pass meshData to use its attributes/stride)
    // This will only create the pipeline once if it doesn't exist
    if (!pipeline && !setupPipeline(meshData)) {
         console.error("Cannot render: Failed to setup pipeline."); return;
    }

    // Log the received matrix for debugging
    // console.log(`JS: Rendering mesh ${meshId} with matrix:`, transformMatrix); // Can be very verbose

    // Update the uniform buffer with the latest matrix
    // Use the explicit buffer source signature for writeBuffer
    gpuDevice.queue.writeBuffer(
        uniformData.buffer,       // destination buffer
        0,                        // destination offset
        transformMatrix.buffer,   // source buffer (ArrayBuffer)
        transformMatrix.byteOffset, // source offset
        transformMatrix.byteLength  // source size (should be MATRIX_SIZE)
    );

    // --- Render Pass ---
    const commandEncoder = gpuDevice.createCommandEncoder();
    const textureView = canvasContext.getCurrentTexture().createView();
    const renderPassDescriptor = {
        colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
            loadOp: 'clear',
            storeOp: 'store',
        }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    // Explicitly set viewport (though often defaults correctly)
    const canvas = canvasContext.canvas;
    passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    passEncoder.setBindGroup(0, uniformData.bindGroup); // Set the bind group for uniforms
    passEncoder.setVertexBuffer(0, meshData.buffer);
    passEncoder.draw(meshData.vertexCount, 1, 0, 0);
    passEncoder.end();

    gpuDevice.queue.submit([commandEncoder.finish()]);
}

// --- Utility / Export ---

window.flutter3d_webgpu = {
    initWebGPU,
    configureCanvasContext,
    setupMeshBuffer,
    renderMesh
};

console.log("flutter_3d_webgpu.js loaded (with transforms).");