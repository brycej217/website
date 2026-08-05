import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { plane, text, circle, cube, projectCard } from '../Prefabs'
import { scaleHover, scaleDehover } from './Animations'
import gsap from 'gsap'

const projects = [
  {
    id: 'vulkan-engine',
    name: 'Vulkan Engine',
    subtitle: 'A real-time game engine made with Vulkan.',
    image: '/glremix.png',
    color: new THREE.Vector3(0.05, 0.7, 0.97), // cyan-blue
  },
  {
    id: 'glremix',
    name: 'glRemix',
    subtitle: 'A DX12 remastering platform for legacy OpenGL games.',
    image: '/glremix.png',
    color: new THREE.Vector3(0.05, 0.97, 0.89), // teal
  },
  {
    id: 'nptracer',
    name: 'NPTracer',
    subtitle:
      'A Vulkan pathtracer enabling simultaneous PBR and NPR stylization in 3D scenes.',
    image: '/nptracer.png',
    color: new THREE.Vector3(0.05, 0.97, 0.24), // green
  },
  {
    id: 'cuda-path-tracer',
    name: 'CUDA Path Tracer',
    subtitle: 'A GPU-accelerated Monte Carlo path tracer written in CUDA.',
    image: '/cuda.png',
    color: new THREE.Vector3(0.97, 0.05, 0.97), // magenta
  },
  {
    id: 'clustered-renderer',
    name: 'Clustered Renderer',
    subtitle:
      'A real-time WebGPU renderer implementing Forward+ and Clustered Deferred lighting.',
    image: '/clustered.png',
    color: new THREE.Vector3(0.35, 0.05, 0.97), // indigo
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
    this.blobOffset = app.allocateBlobSlots(this.count)
    app.on('update', (delta) => this.blobUpdate(delta))

    // project cards
    this.cards = []
    const cols = 3
    const cardWidth = 4.0
    const cardHeight = (9 * cardWidth) / 16 // 16:9 aspect
    const gapX = 0
    const gapY = 0

    const built = projects.map((proj) =>
      this.add(
        proj.id,
        projectCard(proj.image, proj.name, {
          width: cardWidth,
          height: cardHeight,
          subtitle: proj.subtitle,
          font: '/ic.ttf',
        }),
      ),
    )

    // space by the card's actual footprint (backdrop included), not just
    const { cardWidth: footprintW, cardHeight: footprintH } = built[0].userData
    const spacingX = footprintW + gapX - 0.25
    const spacingY = footprintH + gapY - 0.25

    // group into rows of `cols`; a short final row (project count not a
    for (let row = 0; row * cols < projects.length; row++) {
      const rowProjects = projects.slice(row * cols, row * cols + cols)
      const rowStartX = -((rowProjects.length - 1) * spacingX) / 2

      rowProjects.forEach((proj, col) => {
        const card = built[row * cols + col]
        const gx = rowStartX + col * spacingX
        const gy = this.position.y + 2 - row * spacingY
        card.position.set(gx, gy, 0).sub(this.root.position)

        // hover/click
        card.userData.baseScale = card.scale.clone()
        card.userData.color = proj.color
        card.onHover = () => scaleHover(card, 1.2)
        card.onDehover = () => scaleDehover(card)
        card.onClick = () =>
          this.app.transition(
            () => this.projectClick(proj.id),
            -100,
            proj.color,
          )

        this.cards.push(card)
      })
    }
  }

  projectClick(id) {
    // teleport camera to the start
    this.onExit()
    this.app.pages.open(id)
  }

  blobUpdate(delta) {
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

      blobs[this.blobOffset + i].center.copy(pos)
    }
  }

  onEnter() {
    gsap.to(this.app.uniforms.color.value, {
      x: this.color.x,
      y: this.color.y,
      z: this.color.z,
      duration: 2,
      ease: 'power4.out',
      overwrite: 'auto',
    })
  }

  onExit() {}
}
