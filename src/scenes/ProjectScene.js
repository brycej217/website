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

    // label setup
    const name = this.add(
      'label',
      text('PROJECTS', { fontSize: 1.5, font: '/mr.ttf' }),
      { position: new THREE.Vector3(0, 5.5, 0), interactable: false },
    )

    // blob setup
    this.count = 12
    this.simBound = 2.0
    this.zBound = 1.5
    // per-axis blob wrap bounds — NOT `this.bounds` (Scene already uses that
    // name for the scene's world-Y navigation range; colliding with it broke
    // Camera.boundsCheck()/App.transition's color lookup, which read
    // scene.bounds.x/.y expecting the Vector2 top/bottom, not this object)
    this.blobBounds = { x: this.simBound, y: 6.0, z: this.zBound }
    this.radiusScale = 0.6 // blobs read smaller in this scene than elsewhere
    this.sim = Blobs.projectSim(
      this.count,
      this.position,
      this.simBound,
      this.zBound,
    )
    this.blobOffset = app.allocateBlobSlots(this.count)

    // shrink each blob's (randomly-assigned) radius and capture it so the
    // fade-in after a wrap has something to restore to
    const blobsUniform = app.uniforms.blobs.value
    this.sim.forEach((s, i) => {
      const blob = blobsUniform[this.blobOffset + i]
      blob.radius *= this.radiusScale
      s.baseRadius = blob.radius
    })

    app.on('update', (delta) => this.blobUpdate(delta))

    // project cards
    this.cards = []
    const cols = 3
    const cardWidth = 3.8
    const cardHeight = (9 * cardWidth) / 16 // 16:9 aspect
    const gapX = 0.2
    const gapY = 0.2

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
      const s = this.sim[i]
      const blob = blobs[this.blobOffset + i]

      if (!s.fading) {
        s.pos.add(s.velocity)

        // blobs live in world space, spawned around this.position — so
        // every bound has to be checked relative to that, not absolute
        for (const axis of ['x', 'y', 'z']) {
          const local = s.pos[axis] - this.position[axis]
          const bound = this.blobBounds[axis]

          if (local > bound || local < -bound) {
            this.wrapBlob(s, blob, axis, local > 0 ? -bound : bound)
            break // one axis fading at a time is enough
          }
        }
      }

      blob.center.copy(s.pos)
    }
  }

  // fades a blob's radius out, teleports it to the opposite edge of the
  // given axis, then fades the radius back in
  wrapBlob(s, blob, axis, destLocal) {
    const fadeDuration = 0.6
    s.fading = true

    gsap.to(blob, {
      radius: 0,
      duration: fadeDuration,
      ease: 'power2.in',
      onComplete: () => {
        // suddenly appear at the opposite end of the sim
        s.pos[axis] = this.position[axis] + destLocal
        gsap.to(blob, {
          radius: s.baseRadius,
          duration: fadeDuration,
          ease: 'power2.out',
          onComplete: () => {
            s.fading = false
          },
        })
      },
    })
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
