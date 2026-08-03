import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { plane, text, circle } from '../Prefabs'
import gsap from 'gsap'

const projects = [
  'Vulkan Engine',
  'glRemix',
  'NPTracer',
  'CUDA Path Tracer',
  'Clustered Renderer',
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

    // scene setup
    let p = this.position.y + 10
    for (const n of projects) {
      this.add(
        `${n}`,
        text(n, {
          fontSize: 1.0,
          font: '/ic.ttf',
          color: new THREE.Color('white'),
        }),
        {
          position: new THREE.Vector3(0.0, p, 0),
        },
      )
      p -= 2
    }

    /*
    const name = document.createElement('h1')
    name.textContent = 'BRYCE JOSEPH'
    name.className = 'hero-name'
    name.style.display = 'none'
    document.querySelector('#overlay').appendChild(name)
    this.name = name
    */

    /*
    const link = document.createElement('a')
    link.textContent = 'Vulkan Engine'
    link.href = 'https://threejs.org/docs/#Vector3.project'
    link.target = '_blank'
    link.rel = 'noopener'
    link.className = 'project-link'
    document.querySelector('#overlay').appendChild(link)*/

    /*
    const link2 = document.createElement('button')
    link2.textContent = 'Vulkan Engine'
    link2.className = 'project-link'
    link2.addEventListener('click', () => {})
    document.querySelector('#overlay').appendChild(link2)*/
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
