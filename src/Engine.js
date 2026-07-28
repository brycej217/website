import * as THREE from 'three'
import './style.css'

export class Engine {
  constructor() {
    // canvas selection and renderer setup
    const canvas = document.querySelector('#viewport')
    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    // camera setup
    const fov = 75
    const aspect = canvas.clientWidth / canvas.clientHeight
    const near = 0.1
    const far = 1000
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this.camera.position.z = 5

    // scene registry setup
    this.scenes = {}

    // clock setup
    this.timer = new THREE.Timer()

    // animation loop setup
    this.renderer.setAnimationLoop(() => this.renderLoop())
  }

  // determines if viewport needs resizing
  needsResize() {
    const canvas = this.renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const needsResize = width !== canvas.width || height !== canvas.height

    if (needsResize) {
      const canvas = this.renderer.domElement
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight
      this.camera.updateProjectionMatrix()
    }

    return needsResize
  }

  // main render loop (calls the on render function for all scenes)
  renderLoop() {
    // get delta time since last frame (in seconds)
    this.timer.update()
    const delta = this.timer.getDelta()

    if (this.needsResize()) {
      this.camera.aspect = canvas.clientWidth / client.innerHeight
      this.camera.updateProjectionMatrix()
    }

    // render objects in scene (should be callable)
    for (const scene of Object.values(this.scenes)) {
      scene.onRender(this.renderer, this.camera, delta)
    }
  }

  register(name, scene) {
    this.scenes[name] = scene
  }
}
