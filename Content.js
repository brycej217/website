export const content = [
  {
    id: 'vulkan-engine',
    title: 'Vulkan Engine',
    description:
      'A real-time rendering engine built in C++ and Vulkan utilizing an entity-component-system architecture.',
    tech: ['C++', 'Vulkan', 'GLSL', 'glTF'],
    md: '/vulkan/vulkan.md',
    links: [
      { label: 'GitHub', url: 'https://github.com/brycej217/uncle-engine' },
    ],
  },
  {
    id: 'glremix',
    title: 'glRemix',
    md: 'glremix/gl.md',
    tech: ['C++', 'DX12', 'OpenGL', 'HLSL'],
    links: [
      { label: 'GitHub', url: 'https://github.com/glRemix/glRemix' },
      {
        label: 'YouTube',
        url: 'https://youtu.be/bFBkLRBmGoY?si=xTCaDidjgyTFXXFn',
      },
    ],
  },
  {
    id: 'nptracer',
    title: 'NPTracer',
    md: 'nptracer/np.md', // full write-up, rendered from public/np.md — see Page.js
    tech: ['C++', 'Vulkan', 'Slang', 'Houdini'],
    links: [
      { label: 'GitHub', url: 'https://github.com/brycej217/nptracer' },
      {
        label: 'YouTube',
        url: 'https://youtu.be/Qi0Pz44qmic?si=-RG6M0DrsKKBNxH3',
      },
    ],
  },
  {
    id: 'cuda-path-tracer',
    title: 'CUDA Path Tracer',
    md: '/cuda/cuda.md',
    tech: ['C++', 'CUDA'],
    links: [
      { label: 'GitHub', url: 'https://github.com/brycej217/CUDA-Path-Tracer' },
    ],
  },
  {
    id: 'clustered-renderer',
    title: 'Clustered Renderer',
    md: '/cluster/cluster.md',
    tech: ['JavaScript', 'WebGPU', 'WGSL'],
    links: [
      {
        label: 'GitHub',
        url: 'https://github.com/brycej217/WebGPU-Forward-Plus-and-Clustered-Deferred-Renderer',
      },
    ],
  },
]
