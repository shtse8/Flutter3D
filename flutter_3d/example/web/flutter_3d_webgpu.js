// Flutter 3D WebGPU Backend Logic

'use strict';

// Global state
let gpuDevice = null;
let gpuAdapter = null;
let canvasContext = null;
let presentationFormat = null;
let pipeline = null; // Single pipeline for now
let defaultSampler = null; // Add a default sampler

// Store mesh data (buffers, counts, etc.) keyed by meshId
const meshRegistry = new Map();
// Store object data (uniform buffer, bind group, texture) keyed by objectId (meshId for now)
const objectRegistry = new Map();

// Matrix size in bytes (4x4 float32)
const MATRIX_SIZE = 4 * 4 * Float32Array.BYTES_PER_ELEMENT;
const UNIFORM_BUFFER_SIZE = Math.ceil(MATRIX_SIZE / 256) * 256; // 256

// --- Initialization ---

async function initWebGPU() {
    if (gpuDevice) return true;
    console.log("Initializing WebGPU...");
    if (!navigator.gpu) {
        console.error("WebGPU not supported."); alert("WebGPU is not supported."); return false;
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
            gpuDevice = null; gpuAdapter = null; pipeline = null; defaultSampler = null;
            meshRegistry.clear(); objectRegistry.clear();
            // TODO: Handle device loss more robustly
        });

        // Create a default sampler
        defaultSampler = gpuDevice.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
            // addressModeU/V/W, mipmapFilter etc. can be added later
        });
        console.log("Default sampler created.");

        console.log("WebGPU initialization successful.");
        return true;
    } catch (error) {
        console.error("Error initializing WebGPU:", error); alert(`Error initializing WebGPU: ${error.message}`); return false;
    }
}

// --- Texture Loading ---

/**
 * Loads an image from a URL and creates a WebGPU texture.
 * @param {string} url Image URL.
 * @returns {Promise<GPUTexture | null>} The GPU texture or null on error.
 */
async function loadTexture(url) {
    if (!gpuDevice) { console.error("GPU device not ready for texture loading."); return null; }
    console.log(`Loading texture: ${url}`);
    try {
        const response = await fetch(url, { mode: 'cors' }); // Use CORS mode
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        const imageBitmap = await createImageBitmap(await response.blob());
        console.log(`Image loaded: ${imageBitmap.width}x${imageBitmap.height}`);

        const texture = gpuDevice.createTexture({
            size: [imageBitmap.width, imageBitmap.height, 1],
            format: 'rgba8unorm', // Common format
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });

        gpuDevice.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: texture },
            [imageBitmap.width, imageBitmap.height]
        );
        console.log("Texture created and data copied.");
        return texture;

    } catch (error) {
        console.error(`Error loading texture ${url}:`, error);
        return null;
    }
}


// --- Mesh & Object Setup ---

/**
 * Creates/updates vertex buffer, uniform buffer, texture, sampler, and bind group for an object.
 * @param {string} objectId Unique ID for the object (using meshId for now).
 * @param {Float32Array} vertices Interleaved vertex data.
 * @param {number} stride Vertex stride in bytes.
 * @param {Array<object>} attributes Array of attribute descriptions.
 * @param {string | null} textureUrl URL of the texture to load, or null.
 * @returns {Promise<string | null>} The objectId if successful, null otherwise.
 */
async function setupObject(objectId, vertices, stride, attributes, textureUrl) {
    if (!gpuDevice) { console.error("Cannot setup object: WebGPU device not initialized."); return null; }
    console.log(`Setting up objectId: ${objectId}`);

    try {
        // --- Vertex Buffer (from meshRegistry logic) ---
        let meshData = meshRegistry.get(objectId);
        if (!meshData) {
            console.log(`  Creating vertex buffer for mesh ${objectId}`);
            const vertexBuffer = gpuDevice.createBuffer({
                size: vertices.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true,
            });
            new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
            vertexBuffer.unmap();
            const vertexCount = vertices.length / (stride / Float32Array.BYTES_PER_ELEMENT);
            meshData = { buffer: vertexBuffer, vertexCount: vertexCount, stride: stride, attributes: attributes };
            meshRegistry.set(objectId, meshData);
            console.log(`  Vertex buffer created, Vertex count: ${vertexCount}`);
        } else {
             console.log(`  Reusing vertex buffer for mesh ${objectId}`);
             // TODO: Handle vertex buffer updates if needed
        }

        // --- Texture ---
        let gpuTexture = null;
        if (textureUrl) {
            // TODO: Cache textures based on URL
            gpuTexture = await loadTexture(textureUrl);
            if (!gpuTexture) { console.warn(`  Failed to load texture for ${objectId}`); }
        }
        // TODO: Use a default placeholder texture if loading fails or no URL provided?

        // --- Uniform Buffer ---
        // TODO: Reuse uniform buffer if objectId exists?
        const uniformBuffer = gpuDevice.createBuffer({
            size: UNIFORM_BUFFER_SIZE,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        // Initialize with identity
        const identityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
        gpuDevice.queue.writeBuffer(uniformBuffer, 0, identityMatrix.buffer, identityMatrix.byteOffset, identityMatrix.byteLength);

        // --- Pipeline (ensure created) ---
        // Note: Assumes pipeline is compatible for all objects for now
        if (!pipeline && !setupPipeline(meshData)) { // Pass meshData for stride/attributes
             throw new Error("Failed to setup pipeline for bind group creation.");
        }

        // --- Bind Group ---
        const bindGroup = gpuDevice.createBindGroup({
            layout: pipeline.getBindGroupLayout(0), // Use layout from pipeline
            entries: [
                { // Binding 0: Uniform Buffer (Matrix)
                    binding: 0,
                    resource: { buffer: uniformBuffer },
                },
                { // Binding 1: Texture View
                    binding: 1,
                    // Use loaded texture view or a default/dummy one
                    resource: gpuTexture ? gpuTexture.createView() : createDummyTextureView(),
                },
                 { // Binding 2: Sampler
                    binding: 2,
                    resource: defaultSampler, // Use the default sampler
                },
            ],
        });

        // Store all object-specific resources
        objectRegistry.set(objectId, {
            uniformBuffer: uniformBuffer,
            bindGroup: bindGroup,
            texture: gpuTexture // Store texture if needed for disposal later
        });

        console.log(`  Uniforms and BindGroup created for object ${objectId}`);
        return objectId;

    } catch (error) {
        console.error(`Error setting up object ${objectId}:`, error);
        return null;
    }
}

// Helper to create a dummy 1x1 texture view if needed
let dummyTextureView = null;
function createDummyTextureView() {
    if (!gpuDevice) return null;
    if (!dummyTextureView) {
        const texture = gpuDevice.createTexture({
            size: [1, 1, 1], format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        const data = new Uint8Array([255, 255, 255, 255]); // White pixel
        gpuDevice.queue.writeTexture({ texture }, data, { bytesPerRow: 4 }, [1, 1]);
        dummyTextureView = texture.createView();
        console.log("Created dummy texture view.");
    }
    return dummyTextureView;
}


// --- Graphics Pipeline Setup ---

function setupPipeline(meshData) {
    const attributes = meshData.attributes;
    const stride = meshData.stride;

    if (!gpuDevice || !presentationFormat) { console.error("Pipeline setup: Device/Format not ready."); return false; }
    if (pipeline) return true; // Already created

    console.log("Setting up render pipeline...");

    const gpuAttributes = attributes.map((attr) => ({
        shaderLocation: attr.name === 'position' ? 0 : (attr.name === 'color' ? 1 : (attr.name === 'uv' ? 2 : -1)), // Assign locations
        offset: attr.offset,
        format: attr.format
    })).filter(attr => attr.shaderLocation !== -1); // Filter out unassigned attributes
    console.log("GPU Attributes for pipeline:", gpuAttributes);
    console.log("Using stride from meshData:", stride);

    const wgslShaders = `
        struct Uniforms {
            modelViewProjectionMatrix : mat4x4<f32>,
        };
        @group(0) @binding(0) var<uniform> uniforms : Uniforms;

        // Texture and Sampler bindings
        @group(0) @binding(1) var myTexture: texture_2d<f32>;
        @group(0) @binding(2) var mySampler: sampler;

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) color : vec4<f32>,
            @location(1) uv : vec2<f32>,
        };

        @vertex
        fn vs_main(
            @location(0) pos: vec2<f32>,
            @location(1) color: vec3<f32>,
            @location(2) uv: vec2<f32> // Add UV input
        ) -> VertexOutput {
            var output : VertexOutput;
            // Multiply position by model-view-projection matrix
            output.position = uniforms.modelViewProjectionMatrix * vec4<f32>(pos, 0.0, 1.0);
            output.color = vec4<f32>(color, 1.0);
            output.uv = uv;
            return output;
        }

        @fragment
        fn fs_main(fragData: VertexOutput) -> @location(0) vec4<f32> {
            // Sample the texture using the interpolated UVs
            let texColor = textureSample(myTexture, mySampler, fragData.uv);
            return texColor; // Output only texture color
            // return texColor * fragData.color; // Modulate with vertex color
        }
    `;

    const shaderModule = gpuDevice.createShaderModule({ code: wgslShaders });

    // Define bind group layout explicitly including texture/sampler
     const bindGroupLayout = gpuDevice.createBindGroupLayout({
        entries: [
            { // Binding 0: Uniform Buffer (Matrix)
                binding: 0,
                visibility: GPUShaderStage.VERTEX, // Only vertex shader needs matrix
                buffer: { type: 'uniform' },
            },
            { // Binding 1: Texture View
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT, // Only fragment shader needs texture
                texture: {}, // Default texture binding
            },
            { // Binding 2: Sampler
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT, // Only fragment shader needs sampler
                sampler: {}, // Default sampler binding
            },
        ],
    });

    const pipelineLayout = gpuDevice.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout], // Use the explicit layout
    });

    pipeline = gpuDevice.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            entryPoint: 'vs_main',
            buffers: [{
                arrayStride: stride,
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
        case 'float32x2': return 2 * 4; case 'float32x3': return 3 * 4; case 'float32x4': return 4 * 4;
        default: console.warn(`Unknown format size: ${format}`); return 0;
    }
}


// --- Canvas Setup ---

function configureCanvasContext(canvas) {
    if (!gpuDevice) { console.error("WebGPU device not initialized."); return false; }
    if (!canvas) { console.error("Invalid canvas element."); return false; }
    canvasContext = canvas.getContext('webgpu');
    if (!canvasContext) { console.error("Failed to get WebGPU context."); return false; }
    presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    console.log("Preferred canvas format:", presentationFormat);
    canvasContext.configure({ device: gpuDevice, format: presentationFormat, alphaMode: 'premultiplied' });
    console.log("Canvas context configured.");
    return true;
}


// --- Rendering Logic ---

/**
 * Renders a mesh identified by objectId using its transform matrix and texture.
 * @param {string} objectId The ID of the object to render.
 * @param {Float32Array} transformMatrix The 4x4 transformation matrix.
 */
function renderObject(objectId, transformMatrix) { // Renamed from renderMesh
    if (!gpuDevice || !canvasContext) { console.warn("Cannot render: Device/Context not ready."); return; }

    const meshData = meshRegistry.get(objectId);
    const objectData = objectRegistry.get(objectId); // Get object data (uniforms, bindgroup)

    if (!meshData || !objectData) { console.warn(`Cannot render: Data not found for id ${objectId}.`); return; }

    // Ensure pipeline is created (pass meshData for attributes/stride)
    if (!pipeline && !setupPipeline(meshData)) { console.error("Cannot render: Failed to setup pipeline."); return; }

    // Update the uniform buffer
    gpuDevice.queue.writeBuffer(
        objectData.uniformBuffer, 0, transformMatrix.buffer, transformMatrix.byteOffset, transformMatrix.byteLength
    );

    // --- Render Pass ---
    const commandEncoder = gpuDevice.createCommandEncoder();
    const textureView = canvasContext.getCurrentTexture().createView();
    const renderPassDescriptor = {
        colorAttachments: [{ view: textureView, clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 }, loadOp: 'clear', storeOp: 'store' }],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, objectData.bindGroup); // Set the object-specific bind group
    passEncoder.setVertexBuffer(0, meshData.buffer);
    passEncoder.draw(meshData.vertexCount, 1, 0, 0);
    passEncoder.end();

    gpuDevice.queue.submit([commandEncoder.finish()]);
}

// --- Utility / Export ---

window.flutter3d_webgpu = {
    initWebGPU,
    configureCanvasContext,
    // setupMeshBuffer, // Replaced by setupObject
    setupObject, // Expose the new setup function
    renderObject // Expose the renamed render function
};

console.log("flutter_3d_webgpu.js loaded (with texture support).");