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
    canvas.addEventListener('wheel', (event) => this.onScroll(event), {
      passive: false,
    })

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
    this.app.y = this.camera.position.y
  }

  boundsCheck(top, bottom, scenes) {
    const y = this.camera.position.y
    if (y < bottom) {
      this.teleport(top - 1)
    } else if (y > top) {
      this.teleport(bottom + 1)
    }

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
