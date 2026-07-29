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
  }

  get() {
    return this.camera
  }

  onMouseMove(mouseX, mouseY) {
    const factor = 0.25 // movement scaling factor

    const xTo = gsap.quickTo(this.camera.rotation, 'x', {
      duration: 2,
      ease: 'power4.out',
      overwrite: 'auto',
    })

    const yTo = gsap.quickTo(this.camera.rotation, 'y', {
      duration: 2,
      ease: 'power4.out',
      overwrite: 'auto',
    })

    xTo(-mouseY * factor)
    yTo(-mouseX * factor)
  }
}
