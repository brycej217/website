import * as THREE from 'three'
import { Scene } from './Scene'
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
  constructor(opts) {
    super(opts)

    this.color = new THREE.Vector3(0.97, 0.62, 0.05)

    let p = 20
    for (const n of projects) {
      this.add(
        `${n}`,
        text(n, {
          fontSize: 1.0,
          font: '/ic.ttf',
          color: new THREE.Color('black'),
        }),
        {
          position: new THREE.Vector3(0.0, p, 0),
        },
      )
      p -= 2
    }

    const name = document.createElement('h1')
    name.textContent = 'BRYCE JOSEPH'
    name.className = 'hero-name'
    name.style.display = 'none'
    document.querySelector('#overlay').appendChild(name)
    this.name = name

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

  onEnter() {
    console.log('project enter')
    gsap.to(window.plane.material.uniforms.color.value, {
      x: this.color.x,
      y: this.color.y,
      z: this.color.z,
      duration: 2,
      ease: 'power4.out',
      overwrite: 'auto',
    })
    this.name.style.display = 'block'
  }

  onExit() {
    console.log('project exit')
    this.name.style.display = 'none'
  }
}
