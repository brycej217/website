import * as THREE from 'three'

export class Camera {
  constructor(app) {
    // camera setup
    this.app = app
    const canvas = document.querySelector('#viewport')
    this.canvas = canvas
    const fov = 75
    const aspect = canvas.clientWidth / canvas.clientHeight
    const near = 0.1
    const far = 1000
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this.camera.position.z = 5

    this.scrollTarget = 0

    // pointer setup
    this.pointer = new THREE.Vector2()
    this.raycaster = new THREE.Raycaster()

    // app event listeners
    app.on('update', (delta) => this.update(delta))

    // event listeners for scroll
    window.addEventListener('wheel', (event) => this.onScroll(event), {
      passive: false,
    })

    // event listeners for mouse
    window.addEventListener('mousemove', (event) => this.onMouseMove(event))
    window.addEventListener('mousedown', (event) => this.onMouseDown(event))
  }

  get() {
    return this.camera
  }

  // pixels-per-world-unit at z=0 (where every scene's root sits), for the
  // current viewport. WorldHtml converts world-Y into a CSS pixel offset to
  // keep the DOM overlay scrolling in lockstep with the 3D scene, and needs
  // this exact ratio to do it — a hand-picked constant only happens to
  // match one particular window height (whatever it was tuned against) and
  // is off everywhere else, which reads as the DOM and the 3D scene
  // scrolling at two different rates.
  pixelsPerUnit() {
    const fovRad = (this.camera.fov * Math.PI) / 180
    const visibleHeight = 2 * this.camera.position.z * Math.tan(fovRad / 2)
    return this.canvas.clientHeight / visibleHeight
  }

  update(delta) {
    // eased toward scrollTarget by hand, inside the same 'update' tick that
    // drives everything else keyed off camera Y (WorldHtml, the blob
    // shader's scrollY, the transition circle) — this used to be a
    // gsap.quickTo() tween instead, which eases camera.position.y on gsap's
    // own internal rAF ticker rather than this one. With continuous, small
    // wheel deltas (macOS's default smooth scrolling) that second ticker
    // stayed close enough to this one that the one-tick-of-lag between them
    // was invisible. Switching macOS to line-based scrolling sends a few
    // large deltas instead of many small ones, and that lag became a very
    // visible one-frame stutter between the DOM overlay and the 3D scene —
    // each was reading camera.position.y at a slightly different point in
    // its easing, rather than the exact same value in the same frame.
    // Easing manually here means every consumer reads one number, computed
    // once, and there's nothing left to fall out of step. Exponential decay
    // toward the target keeps it frame-rate independent — `tau` is the time
    // constant (time to close ~63% of the remaining distance); three tau
    // (~0.15s) roughly matches the old gsap tween's duration/feel.
    const tau = 0.05
    const ease = 1 - Math.exp(-delta / tau)
    this.camera.position.y += (this.scrollTarget - this.camera.position.y) * ease
  }

  onMouseDown(event) {
    // these listeners are on `window` so they fire for every click on the
    // page, including ones that land on real DOM UI (nav links, the about
    // panel, page content) sitting visually on top of the canvas. Without
    // this check, a 3D object positioned behind that UI can still register
    // as "hovered" and get clicked right along with whatever the UI itself
    // does, racing two transitions against each other.
    if (event.target !== this.canvas) return

    if (this.hovered) {
      this.hovered.onClick?.()
    }
  }

  onMouseMove(event) {
    // see onMouseDown — ignore the 3D scene while the pointer is over DOM UI
    if (event.target !== this.canvas) {
      if (this.hovered) {
        this.hovered.onDehover?.()
        this.hovered = null
      }
      this.canvas.style.cursor = 'default'
      return
    }

    // mouse -> NDC [-1, 1]
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1)

    this.raycaster.setFromCamera(this.pointer, this.camera)
    const interactables = this.app.interactables ?? []
    const hits = this.raycaster.intersectObjects(interactables, true)

    let hit = null
    for (const rayHit of hits) {
      let obj = rayHit.object
      while (obj && !interactables.includes(obj)) obj = obj.parent
      if (obj) {
        hit = obj
        break
      }
    }

    // hover logic
    if (this.hovered !== hit) // if hovering new object or dehovering
    {
      this.hovered?.onDehover?.()
      this.hovered = hit
      this.hovered?.onHover?.()
    }
    this.canvas.style.cursor = hit ? 'pointer' : 'default'
  }

  boundsCheck(top, bottom, scenes) {
    const y = this.camera.position.y
    if (y < bottom) {
      this.teleport(top - 1)
    } else if (y > top) {
      this.teleport(bottom + 1)
    }

    if (!scenes) return

    // check if camera has moved into new scene
    for (const scene of Object.values(scenes)) {
      if (!scene.bounds) continue

      const { x: top, y: bottom } = scene.bounds
      if (y <= top && y >= bottom) {
        return scene
      }
    }
  }

  teleport(y) {
    this.scrollTarget = y
    this.camera.position.y = y
  }

  // eases toward `y` like a normal scroll, instead of teleport()'s hard snap
  // — for in-page jumps (e.g. the section navigator) that have no transition
  // wipe covering an instant cut
  scrollToY(y) {
    this.scrollTarget = y
  }

  onScroll(event) {
    event.preventDefault()

    const speed = 0.02
    const y = event.deltaY
    this.scrollTarget -= y * speed
  }

  // resize callback
  resize(width, height) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
}
