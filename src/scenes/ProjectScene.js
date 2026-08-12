import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { text } from '../Prefabs'
import { content } from '../../Content'
import gsap from 'gsap'

const projects = [
  {
    id: 'glremix',
    name: 'glRemix',
    subtitle: 'A DX12 remastering platform for legacy OpenGL games.',
    image: 'glremix/glremix.gif',
    color: new THREE.Vector3(0.1, 0.1, 0.1),
  },
  {
    id: 'nptracer',
    name: 'NPTracer',
    subtitle:
      'A Vulkan pathtracer enabling simultaneous PBR and NPR stylization in 3D scenes.',
    image: 'nptracer/np.gif',
    color: new THREE.Vector3(0.17, 0.24, 0.44),
  },
  {
    id: 'cuda-path-tracer',
    name: 'CUDA Path Tracer',
    subtitle: 'A GPU-accelerated Monte Carlo path tracer written in CUDA.',
    image: 'cuda/cuda.gif',
    color: new THREE.Vector3(0.36, 0.32, 0.2),
  },
  {
    id: 'clustered-renderer',
    name: 'Clustered Renderer',
    subtitle:
      'A real-time WebGPU renderer implementing Forward+ and Clustered Deferred lighting.',
    image: 'cluster/cluster.gif',
    color: new THREE.Vector3(0.65, 0.24, 0.38),
  },
  {
    id: 'vulkan-engine',
    name: 'Vulkan Engine',
    subtitle: 'A real-time game engine made with Vulkan.',
    image: 'vulkan/vulkan.gif',
    color: new THREE.Vector3(0.1, 0.1, 0.1),
  },
]

const otherProjects = ['CUDA Boids', 'CUDA Stream Compaction', 'This Website']

export class ProjectScene extends Scene {
  constructor(app, opts) {
    super(app, opts)

    // color setup
    this.color = new THREE.Vector3(0.97, 0.62, 0.05)

    const name = this.add(
      'label',
      text('PROJECTS', { fontSize: 1.5, font: '/mr.ttf' }),
      { interactable: false, position: new THREE.Vector3(0, 8.25, 0) },
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

    // project cards — plain DOM elements (see #project-grid in index.html,
    // kept in scroll-sync with this scene by WorldHtml like the about
    // section) rather than a 3D prefab, so that <img> gifs actually animate:
    // browsers only keep advancing an animated image's frames while it's
    // part of the rendered document, which a WebGL texture's source image
    // never is.
    this.buildCards()
  }

  buildCards() {
    const grid = document.querySelector('#project-grid')
    if (!grid) return

    const images = []

    for (const proj of projects) {
      const card = document.createElement('div')
      card.className = 'project-card'

      const title = document.createElement('h3')
      title.className = 'project-card-title'
      title.textContent = proj.name
      card.appendChild(title)

      // tech pills — sourced from Content.js (matching by id) rather than
      // duplicated here, same as everything else that's kept in sync
      // between the card grid and the detail page (see CLAUDE.md)
      const tech = content.find((c) => c.id === proj.id)?.tech
      if (tech?.length) {
        const techList = document.createElement('ul')
        techList.className = 'project-card-tech'
        for (const t of tech) {
          const li = document.createElement('li')
          li.textContent = t
          techList.appendChild(li)
        }
        card.appendChild(techList)
      }

      const media = document.createElement('div')
      media.className = 'project-card-media'
      const img = document.createElement('img')
      img.className = 'project-card-image'
      img.alt = proj.name
      img.decoding = 'async' // decode off the main thread instead of blocking layout/paint
      // no `src` yet — observeCardImages() below attaches/detaches it based on
      // whether the card is actually on screen, so the GIF only loads/decodes
      // while visible instead of the moment this scene is constructed
      img.dataset.src = proj.image
      media.appendChild(img)
      card.appendChild(media)
      images.push(img)

      const subtitle = document.createElement('p')
      subtitle.className = 'project-card-subtitle'
      subtitle.textContent = proj.subtitle
      card.appendChild(subtitle)

      card.addEventListener('click', () =>
        this.app.transition(
          () => this.projectClick(proj.id),
          -100,
          proj.color,
          // sidebar only reveals once the wipe has actually finished — see
          // PageManager.armOutlineReveal()
          () => this.app.pages.armOutlineReveal(),
        ),
      )

      grid.appendChild(card)
    }

    this.observeCardImages(images)
  }

  // GIFs (some 15-20MB) keep decoding/animating forever once loaded — and
  // #world-html never actually removes this section from the DOM, only
  // translates it off-screen as the camera scrolls elsewhere, so without this
  // all 5 would still be animating even miles away on Home or About. Detaching
  // `src` while off-screen stops that immediately (no layout/paint side effects,
  // unlike content-visibility: auto — that also clips anything overflowing the
  // section's box, which cut the grid off); re-attaching it once back in view
  // restarts the GIF from its first frame, which is cheap since it's cached.
  observeCardImages(images) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const img = entry.target
          if (entry.isIntersecting) {
            if (img.src !== img.dataset.src) img.src = img.dataset.src
          } else {
            img.removeAttribute('src')
          }
        }
      },
      { rootMargin: '200px' }, // start/stop just before the card is exactly on screen
    )
    images.forEach((img) => io.observe(img))
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
