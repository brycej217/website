import * as THREE from 'three'
import gsap from 'gsap'

export class Camera {
  constructor(app) {
    // camera setup
    this.app = app
    const canvas = document.querySelector('#viewport')
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
      duration: 0.3,
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
    if (this.hovered) {
      this.hovered.onClick?.()
    }
  }

  onMouseMove(event) {
    // mouse -> NDC [-1, 1]
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    this.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1)

    this.raycaster.setFromCamera(this.pointer, this.camera)
    const interactables = this.app.interactables ?? []
    const hits = this.raycaster.intersectObjects(interactables, true)

    let hit = null
    if (hits.length) {
      let obj = hits[0].object
      while (obj && !interactables.includes(obj)) obj = obj.parent
      hit = obj
    }

    // hover logic
    if (this.hovered !== hit) // if hovering new object or dehovering
    {
      this.hovered?.onDehover?.()
      this.hovered = hit
      this.hovered?.onHover?.()
    }
    document.querySelector('#viewport').style.cursor = hit
      ? 'pointer'
      : 'default'
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
      duration: 0.3,
      ease: 'power1.out',
    })
  }

  onScroll(event) {
    event.preventDefault()

    const speed = 0.05
    const y = event.deltaY
    this.scrollTarget -= y * speed
  }

  // resize callback
  resize(width, height) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
}
