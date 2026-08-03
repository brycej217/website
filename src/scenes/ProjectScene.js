import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { plane, text, circle } from '../Prefabs'
import gsap from 'gsap'

const projects = [
  { id: 'vulkan-engine', name: 'Vulkan Engine' },
  { id: 'glremix', name: 'glRemix' },
  { id: 'nptracer', name: 'NPTracer' },
  { id: 'cuda-path-tracer', name: 'CUDA Path Tracer' },
  { id: 'clustered-renderer', name: 'Clustered Renderer' },
]

const otherProjects = ['CUDA Boids', 'CUDA Stream Compaction', 'This Website']

export class ProjectScene extends Scene {
  constructor(app, opts) {
    super(app, opts)

    // color setup
    this.color = new THREE.Vector3(0.97, 0.62, 0.05)

    // blob setup
    this.count = 10
    this.simBound = 2.0
    this.sim = Blobs.sim(this.count, this.position)

    // projects
    const list = document.querySelector('#project-list')
    for (const { id, name } of projects) {
      const btn = document.createElement('button')
      btn.textContent = name
      btn.className = 'project-link'
      btn.addEventListener('click', () =>
        this.app.transition(this.projectClick(id)),
      )
      list.appendChild(btn)
    }
  }

  projectClick(id) {
    console.log('clicked')

    // transition

    // teleport camera to the start
    this.onExit()
    this.app.pages.open(id)
  }

  blobUpdate(delta) {
    this.elapsed += delta
    const blobs = this.app.uniforms.blobs.value

    for (let i = 0; i < this.count; ++i) {
      const { pos, velocity } = this.sim[i]
      pos.add(velocity)
      if (pos.x > this.simBound || pos.x < -this.simBound)
        velocity.x = -velocity.x
      if (pos.y > this.simBound || pos.y < -this.simBound)
        velocity.y = -velocity.y
      if (pos.z > this.simBound || pos.z < -this.simBound)
        velocity.z = -velocity.z

      blobs[i].center.copy(pos)
    }
  }

  onEnter() {
    console.log('project enter')
    // blob updates
    this.app.uniforms.count.value = this.count
    this.unregister = this.app.on('update', (delta) => this.blobUpdate(delta))

    gsap.to(this.app.uniforms.color.value, {
      x: this.color.x,
      y: this.color.y,
      z: this.color.z,
      duration: 2,
      ease: 'power4.out',
      overwrite: 'auto',
    })
  }

  onExit() {
    console.log('project exit')
    this.unregister()
  }
}
