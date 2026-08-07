import * as THREE from 'three'
import gsap from 'gsap'

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
    app.on('update', (delta) => this.update())

    // event listeners for scroll
    this.scroll = 0
    window.addEventListener('wheel', (event) => this.onScroll(event), {
      passive: false,
    })

    // event listeners for mouse
    window.addEventListener('mousemove', (event) => this.onMouseMove(event))
    window.addEventListener('mousedown', (event) => this.onMouseDown(event))

    // gsap functions
    this.scrollTo = gsap.quickTo(this.camera.position, 'y', {
      duration: 0.15,
      ease: 'power1.out',
    })
  }

  get() {
    return this.camera
  }

  update() {
    this.scrollTo(this.scrollTarget)
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
    gsap.killTweensOf(this.camera.position)
    this.scrollTarget = y
    this.camera.position.y = y
    this.scrollTo = gsap.quickTo(this.camera.position, 'y', {
      duration: 0.15,
      ease: 'power1.out',
    })
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
