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

    // touch scroll + desktop middle-click drag scroll share one
    // implementation: press (a touch, or the mouse's middle button) then
    // drag vertically to scroll, exactly like native touch scrolling.
    // onScroll above only ever fires for 'wheel' events — touchscreens
    // never dispatch those at all, which is the entire reason scrolling did
    // nothing on mobile. Pointer events unify touch/mouse/pen into one API
    // so both gestures can share this handler instead of needing separate
    // touch* and mouse* listeners. Not gated to the canvas (unlike
    // onMouseDown/onMouseMove above) — same as onScroll, a drag should
    // scroll the page no matter which element (nav, about panel, project
    // grid, ...) it starts on.
    this.drag = null
    window.addEventListener('pointerdown', (event) =>
      this.onPointerDown(event),
    )
    window.addEventListener(
      'pointermove',
      (event) => this.onPointerMove(event),
      { passive: false },
    )
    window.addEventListener('pointerup', (event) => this.onPointerUp(event))
    window.addEventListener('pointercancel', (event) =>
      this.onPointerUp(event),
    )
  }

  get() {
    return this.camera
  }

  // world-space height of the visible frustum at z=0 (where every scene's
  // root sits) — shared by pixelsPerUnit() (below) and visibleWidth().
  visibleHeight() {
    const fovRad = (this.camera.fov * Math.PI) / 180
    return 2 * this.camera.position.z * Math.tan(fovRad / 2)
  }

  // pixels-per-world-unit at z=0 (where every scene's root sits), for the
  // current viewport. WorldHtml converts world-Y into a CSS pixel offset to
  // keep the DOM overlay scrolling in lockstep with the 3D scene, and needs
  // this exact ratio to do it — a hand-picked constant only happens to
  // match one particular window height (whatever it was tuned against) and
  // is off everywhere else, which reads as the DOM and the 3D scene
  // scrolling at two different rates.
  pixelsPerUnit() {
    return this.canvas.clientHeight / this.visibleHeight()
  }

  // world-space width of the visible frustum at z=0. Unlike visibleHeight()
  // this isn't constant — a PerspectiveCamera holds its *vertical* fov
  // fixed, so the horizontal extent shrinks along with a narrower/portrait
  // aspect ratio. Used by Prefabs.fitViewport() to keep world-space-sized
  // objects (troika text, whose fontSize is in world units, not px) from
  // running off the edges of a narrow screen.
  visibleWidth() {
    return this.visibleHeight() * this.camera.aspect
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
    this.camera.position.y +=
      (this.scrollTarget - this.camera.position.y) * ease
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
  }

  onPointerDown(event) {
    const isTouch = event.pointerType === 'touch'
    const isMiddleClick = event.pointerType !== 'touch' && event.button === 1
    if (!isTouch && !isMiddleClick) return

    // middle-click normally triggers the browser's own autoscroll (Windows/
    // Linux) or a primary-selection paste (Linux X11) — that's being
    // replaced with the same drag-to-scroll gesture touch uses below, so
    // the native behavior has to be stopped from firing at all
    if (isMiddleClick) event.preventDefault()

    this.drag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScroll: this.scrollTarget,
      moved: false,
    }
  }

  onPointerMove(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return

    // dragging up (finger/pointer moving toward the top of the screen, i.e.
    // event.clientY decreasing below startY) should scroll further into the
    // site — same direction as a native touch scroll or a trackpad's
    // "natural" scrolling — which means scrollTarget has to *decrease* (see
    // onScroll: wheel-down, deltaY > 0, also decreases it). The previous
    // startY - clientY had this backwards: dragging up produced a positive
    // delta and scrolled back toward Home instead of further into the site.
    const deltaPx = event.clientY - this.drag.startY

    // small dead zone before committing to a drag-scroll, so a plain tap or
    // click (a nav link, a project card, ...) still registers as one
    // instead of being swallowed the instant the finger/button so much as
    // twitches
    if (!this.drag.moved) {
      if (Math.abs(deltaPx) < 6) return
      this.drag.moved = true
    }

    event.preventDefault()
    // 1:1 with the drag, same as native touch scrolling — unlike
    // onScroll's hand-tuned `speed`, pixelsPerUnit() is the exact
    // px<->world-unit ratio WorldHtml itself scrolls by, so the content
    // actually tracks the pointer instead of over/undershooting it.
    // teleport() (not scrollTarget alone) so the camera's actual position
    // snaps straight to the pointer every move instead of easing toward it
    // like every other scroll source does (see update()'s tau) — that
    // per-tick easing is for smoothing discrete wheel ticks/nav jumps, and
    // layering it on top of an already-continuous, already-1:1 drag signal
    // just reads as the content trailing behind your finger instead of
    // gripping it, which is what actually made this feel slow.
    this.teleport(this.drag.startScroll + deltaPx / this.pixelsPerUnit())
  }

  onPointerUp(event) {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return
    this.drag = null
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

  // nudges both the camera's actual position and its scroll target by
  // `delta` world units — unlike teleport()/scrollToY() this isn't "go to a
  // place", it's "the ground just moved, follow it": main.js's relayout()
  // uses this to keep the camera visually locked onto whatever it was
  // looking at when AboutScene.reposition() shifts that scene's content in
  // response to a resize (a taller/shorter project grid at the new
  // viewport width), rather than leaving the camera where it was while the
  // content it was framing slides out from under it. Adjusting
  // scrollTarget too (not just position) matters just as much as the
  // position nudge itself — leaving it behind would otherwise have the
  // very next eased scroll tick (Camera.update()) immediately ease back
  // toward the old, no-longer-correct target, undoing the nudge.
  shiftY(delta) {
    this.camera.position.y += delta
    this.scrollTarget += delta
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
