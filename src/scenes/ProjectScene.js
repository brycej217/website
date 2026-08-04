import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { plane, text, circle, cube, projectCard } from '../Prefabs'
import { scaleHover, scaleDehover } from './Animations'
import gsap from 'gsap'

const projects = [
  { id: 'vulkan-engine', name: 'Vulkan Engine', image: '/test.jpg' },
  { id: 'glremix', name: 'glRemix', image: '/test.jpg' },
  { id: 'nptracer', name: 'NPTracer', image: '/test.jpg' },
  {
    id: 'cuda-path-tracer',
    name: 'CUDA Path Tracer',
    image: '/test.jpg',
  },
  {
    id: 'clustered-renderer',
    name: 'Clustered Renderer',
    image: '/test.jpg',
  },
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
    /*
    const list = document.querySelector('#project-list')
    for (const { id, name } of projects) {
      const btn = document.createElement('button')
      btn.textContent = name
      btn.className = 'project-link'
      btn.addEventListener('click', () =>
        this.app.transition(this.projectClick(id)),
      )
      list.appendChild(btn)
    }*/

    // project cards
    this.cards = []
    const cols = 3
    const spacingX = 2.6
    const spacingY = 2.2
    const startX = -((cols - 1) * spacingX) / 2

    projects.forEach((proj, i) => {
      const card = this.add(
        proj.id,
        projectCard(proj.image, proj.name, { font: '/ic.ttf' }),
      )

      const col = i % cols
      const row = Math.floor(i / cols)
      const gx = startX + col * spacingX
      const gy = this.position.y + 2 - row * spacingY
      card.position.set(gx, gy, 0).sub(this.root.position)

      card.userData.home = new THREE.Vector3(gx, gy, 0).sub(this.root.position)
      card.userData.phase = new THREE.Vector2(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      )
      card.userData.freq = new THREE.Vector2(
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5,
      )
      card.userData.amp = 0.15 + Math.random() * 0.1

      // hover/click
      card.userData.baseScale = card.scale.clone()
      card.onHover = () => scaleHover(card)
      card.onDehover = () => scaleDehover(card)
      card.onClick = () => this.app.transition(() => this.projectClick(proj.id))

      this.cards.push(card)
    })

    this.unregisterDrift = this.app.on('update', (delta) =>
      this.cardUpdate(delta),
    )
  }

  cardUpdate(delta) {
    this.cardElapsed = (this.cardElapsed ?? 0) + delta
    const t = this.cardElapsed

    for (const card of this.cards) {
      const { home, phase, freq, amp } = card.userData

      // small elliptical drift around the grid position
      card.position.x = home.x + Math.sin(t * freq.x + phase.x) * amp
      card.position.y = home.y + Math.cos(t * freq.y + phase.y) * amp
    }
  }

  projectClick(id) {
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
    this.unregister()
  }
}
