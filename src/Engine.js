import * as THREE from 'three'
import { Camera } from './Camera'
import './style.css'
import gsap from 'gsap'

export class Engine {
  constructor() {
    // canvas selection and renderer setup
    const canvas = document.querySelector('#viewport')
    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
    this.renderer.setSize(window.innerWidth, window.innerHeight)

    // camera setup
    this.camera = new Camera()

    // scene registry setup
    this.scenes = {}

    // clock setup
    this.timer = new THREE.Timer()
    this.time = 0

    // pointer setup
    this.pointer = new THREE.Vector2()
    this.raycaster = new THREE.Raycaster()

    // event listeners for mouse movement
    canvas.addEventListener('mousemove', (event) => this.onMouseMove(event))

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
    this.time += delta

    if (this.needsResize()) {
      this.camera.aspect = canvas.clientWidth / client.innerHeight
      this.camera.updateProjectionMatrix()
    }

    // scuffed callback
    this.scenes['home'].get('plane').material.uniforms.time.value = this.time

    // render objects in scene (should be callable)
    for (const scene of Object.values(this.scenes)) {
      scene.onRender(this.renderer, this.camera.get(), delta)
    }
  }

  register(name, scene) {
    this.scenes[name] = scene
    if (name === 'home') {
      this.renderer.getDrawingBufferSize(
        scene.get('plane').material.uniforms.resolution.value,
      )
    }
  }

  onMouseMove(event) {
    // get ndc coordinates and store in property
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1
    this.mouseY = -((event.clientY / window.innerHeight) * 2 - 1) // y-flipped screen goes down

    // on mouse move camera movement
    this.camera.onMouseMove(this.mouseX, this.mouseY)

    // raycast checking
    this.raycaster.setFromCamera(
      new THREE.Vector2(this.mouseX, this.mouseY),
      this.camera.get(),
    )

    // scuffed callback
    this.scenes['home'].get('plane').material.uniforms.mouse.value =
      new THREE.Vector2(this.mouseX, this.mouseY)

    // get all interactables across all scenes
    const interactables = Object.values(this.scenes).flatMap((scene) =>
      Object.values(scene.interactables),
    )
    const hits = this.raycaster.intersectObjects(interactables, true)
    if (!hits.length) {
      // if something is being hovered and nothing was raycasted dehover and return
      if (this.hovered) {
        this.hovered.deHover?.(this.hovered)
        this.hovered = null
      }
      return // return early
    }

    const hit = hits[0] // work on first object hit

    // if current hovered object is different (dehover previous)
    if (this.hovered !== hit.object) {
      this.hovered?.deHover?.(this.hovered)
    }

    // set new hover
    this.hovered = hit.object
    hit.object.onHover?.(hit.object)
  }
}
