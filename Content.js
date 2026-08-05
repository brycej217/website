export const content = [
  {
    id: 'vulkan-engine',
    title: 'Vulkan Engine',
    description:
      'A real-time rendering engine built in C++ and Vulkan featuring an entity-component-system architecture, a Hydra-based render delegate, and a modular render graph. Supports physically-based shading, deferred rendering, and dynamic resource management.',
    tech: ['C++', 'Vulkan', 'GLSL', 'ECS'],
    links: [
      { label: 'GitHub', url: 'https://github.com/brycej217/vulkan-engine' },
      { label: 'Writeup', url: '#' },
    ],
  },
  {
    id: 'glremix',
    title: 'glRemix',
    description:
      'A real-time graphics project exploring [fill in]. Built to experiment with [technique], with a focus on [goal].',
    tech: ['C++', 'OpenGL', 'GLSL'],
    links: [{ label: 'GitHub', url: '#' }],
  },
  {
    id: 'nptracer',
    title: 'NPTracer',
    description:
      'A physically-based path tracer implemented in Vulkan, featuring a render graph, BRDF sampling, and full PBR material support. Renders offline images with importance sampling and multiple bounce global illumination.',
    md: '/np.md', // full write-up, rendered from public/np.md — see Page.js
    tech: ['Vulkan', 'GLSL', 'PBR', 'Path Tracing'],
    links: [{ label: 'GitHub', url: 'https://github.com/brycej217/nptracer' }],
  },
  {
    id: 'cuda-path-tracer',
    title: 'CUDA Path Tracer',
    description:
      'A GPU-accelerated path tracer written in CUDA, leveraging parallel ray processing, stream compaction for ray termination, and material-based work sorting for performance.',
    tech: ['CUDA', 'C++', 'Path Tracing'],
    links: [{ label: 'GitHub', url: '#' }],
  },
  {
    id: 'clustered-renderer',
    title: 'Clustered Renderer',
    description:
      'A clustered forward renderer supporting large numbers of dynamic lights by partitioning the view frustum into clusters and culling lights per cluster.',
    tech: ['C++', 'Vulkan', 'GLSL'],
    links: [{ label: 'GitHub', url: '#' }],
  },
]
