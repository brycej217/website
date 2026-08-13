import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { text, fitViewport, labelLocalBottom } from '../Prefabs'
import { content } from '../../Content'
import gsap from 'gsap'

const projects = [
  {
    id: 'glremix',
    name: 'glRemix',
    subtitle: 'A DX12 remastering platform for legacy OpenGL games.',
    image: 'glremix/glremix.gif',
    color: new THREE.Vector3(0.21, 0.18, 0.37),
  },
  {
    id: 'nptracer',
    name: 'NPTracer',
    subtitle:
      'A Vulkan pathtracer enabling simultaneous PBR and NPR stylization in 3D scenes.',
    image: 'nptracer/np.gif',
    color: new THREE.Vector3(0.18, 0.22, 0.37),
  },
  {
    id: 'cuda-path-tracer',
    name: 'CUDA Path Tracer',
    subtitle: 'A GPU-accelerated Monte Carlo path tracer written in CUDA.',
    image: 'cuda/cuda.gif',
    color: new THREE.Vector3(0.37, 0.32, 0.18),
  },
  {
    id: 'clustered-renderer',
    name: 'Clustered Renderer',
    subtitle:
      'A real-time WebGPU renderer implementing Forward+ and Clustered Deferred lighting.',
    image: 'cluster/cluster.gif',
    color: new THREE.Vector3(0.37, 0.18, 0.28),
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
    fitViewport(app, name)
    this.label = name
    // world-unit breathing room between the label's bottom edge and the
    // DOM grid's top — see anchorY() below
    this.labelGap = 4
    // ...and between the grid's bottom edge and this scene's own bottom
    // bound (bounds.y) — the boundary Camera.boundsCheck()/App.transition
    // use to decide when the background color starts shifting from this
    // scene's to AboutScene's. baseBounds is the fixed span main.js
    // authored; extendBounds() below only ever pushes bounds.y further past
    // it, never back above it — see extendBounds().
    this.bottomGap = 2.0
    this.baseBounds = this.bounds.clone()
    // manual, purely-cosmetic nudge to bounds.y on top of the automatic
    // content-driven extension below — positive moves it up (less negative:
    // this scene's active range ends sooner / AboutScene's begins sooner).
    // AboutScene.bounds.x always reads this scene's bounds.y directly (see
    // AboutScene.reposition()) rather than recomputing its own copy of this
    // number, specifically so the two can never drift apart — a boundary
    // Camera.boundsCheck() treats as a hard edge (see the note there) can't
    // tolerate two independently-tuned values that only sometimes agree.
    this.boundaryOffset = 3

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

  // world-Y where DOM content for this scene should start — right below the
  // "PROJECTS" label's actual rendered bottom edge, rather than at
  // this.position.y (which WorldHtml used before this existed, and which
  // only ever lined up with the label by coincidence — see anchorSections()
  // in WorldHtml.js). Null until the label's own async layout lands.
  get anchorY() {
    const bottom = labelLocalBottom(this.label)
    return bottom === null ? null : this.position.y + bottom - this.labelGap
  }

  // world-Y of the bottom of the actually-rendered project grid — measured
  // fresh every call (grid height, and therefore this, changes with
  // viewport width — see .project-card's breakpoints in style.css). Null
  // until the label's own async layout lands, same as anchorY.
  contentBottom(pxPerUnit) {
    const anchor = this.anchorY
    if (anchor === null) return null
    const gridHeight = this.gridEl ? this.gridEl.scrollHeight / pxPerUnit : 0
    return anchor - gridHeight
  }

  // extends bounds.y (this scene's bottom bound) to sit bottomGap below the
  // grid's *actual* rendered bottom edge, if that's further down than the
  // originally-authored bound — never pulls it back up above baseBounds.y,
  // so a grid that fits within the original budget leaves this untouched.
  // boundaryOffset is layered on top unconditionally (even before the label
  // syncs), since it's a fixed manual nudge, not something that depends on
  // measuring anything async.
  //
  // Returns how far past baseBounds.y the *automatic* (content-driven) part
  // alone moved, deliberately excluding boundaryOffset — main.js's
  // relayout() uses this to shift AboutScene's position, and a manual
  // boundary nudge shouldn't drag that along (see boundaryOffset's comment,
  // above, and AboutScene.reposition()).
  extendBounds(pxPerUnit) {
    const bottom = this.contentBottom(pxPerUnit)
    const autoBottom =
      bottom === null
        ? this.baseBounds.y
        : Math.min(this.baseBounds.y, bottom - this.bottomGap)
    this.bounds.y = autoBottom + this.boundaryOffset
    return autoBottom - this.baseBounds.y
  }

  buildCards() {
    const grid = document.querySelector('#project-grid')
    if (!grid) return
    this.gridEl = grid

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
