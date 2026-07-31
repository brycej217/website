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

    this.scrollTarget = 0

    this.smoothMouse = new THREE.Vector2()
    this.xTo = gsap.quickTo(this.smoothMouse, 'x', {
      duration: 2,
      ease: 'power4.out',
    })
    this.yTo = gsap.quickTo(this.smoothMouse, 'y', {
      duration: 2,
      ease: 'power4.out',
    })
    this.scrollTo = gsap.quickTo(this.camera.position, 'y', {
      duration: 0.3,
      ease: 'power1.out',
    })
  }

  get() {
    return this.camera
  }

  onUpdate() {
    this.scrollTo(this.scrollTarget)
    window.plane.material.uniforms.scrollY.value = this.camera.position.y
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

  onMouseMove(mouseX, mouseY) {
    const factor = 0.25 // movement scaling factor

    this.xTo(-mouseY * factor)
    this.yTo(-mouseX * factor)

    window.plane.material.uniforms.mouse.value = new THREE.Vector2(
      mouseX,
      mouseY,
    )
  }

  onScroll(y) {
    const speed = 0.05
    this.scrollTarget -= y * speed
  }

  // resize callback
  resize(width, height) {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
}
