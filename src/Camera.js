import * as THREE from 'three'
import gsap from 'gsap'

export class Camera {
  constructor() {
    // camera setup
    const canvas = document.querySelector('#viewport')
    const fov = 75
    const aspect = canvas.clientWidth / canvas.clientHeight
    const near = 0.1
    const far = 1000
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this.camera.position.z = 5

    this.smoothMouse = new THREE.Vector2()
    this.xTo = gsap.quickTo(this.smoothMouse, 'x', {
      duration: 2,
      ease: 'power4.out',
    })
    this.yTo = gsap.quickTo(this.smoothMouse, 'y', {
      duration: 2,
      ease: 'power4.out',
    })
  }

  get() {
    return this.camera
  }

  onMouseMove(mouseX, mouseY) {
    const factor = 0.25 // movement scaling factor

    this.xTo(-mouseY * factor)
    this.yTo(-mouseX * factor)
  }
}
