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
    this.renderer.autoClear = false // allows for rendering multiple scenes at once

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
    this.scroll = 0
    canvas.addEventListener('wheel', (event) => this.onScrollEvent(event), {
      passive: false,
    })

    // animation loop setup
    this.renderer.setAnimationLoop(() => this.update())
  }

  register(name, scene) {
    this.scenes[name] = scene
    if (name === 'home') {
      this.renderer.getDrawingBufferSize(
        window.plane.material.uniforms.resolution.value,
      )
    }
  }

  // main render loop (calls the on render function for all scenes)
  update() {
    // get delta time since last frame (in seconds)
    this.timer.update()
    const delta = this.timer.getDelta()
    this.time += delta

    window.plane.material.uniforms.time.value = this.time // update shader uniform

    // resize logic
    this.resize()

    this.renderer.clear()

    // update and render objects in scene (should be callable)
    for (const scene of Object.values(this.scenes)) {
      scene.onUpdate(delta)
      scene.onRender(this.renderer, this.camera.get(), delta)
    }

    // update other objects
    this.camera.onUpdate()
  }

  onScrollEvent(event) {
    event.preventDefault()
    this.camera.onScroll(event.deltaY)
  }

  onMouseMove(event) {
    // get ndc coordinates and store in property
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1
    this.mouseY = -((event.clientY / window.innerHeight) * 2 - 1) // y-flipped screen goes down
    this.camera.onMouseMove(this.mouseX, this.mouseY)

    // raycast checking
    this.raycaster.setFromCamera(
      new THREE.Vector2(this.mouseX, this.mouseY),
      this.camera.get(),
    )

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

  // determines if viewport needs resizing
  resize() {
    const canvas = this.renderer.domElement
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    // compare against the drawing-buffer size the renderer should have
    const needs =
      canvas.width !== Math.floor(width * this.renderer.getPixelRatio()) ||
      canvas.height !== Math.floor(height * this.renderer.getPixelRatio())

    if (!needs) return

    this.renderer.setSize(width, height, false)
    this.camera.resize(width, height)

    // refresh the shader's resolution uniform (drawing-buffer pixels)
    const plane = window.plane
    if (plane) {
      this.renderer.getDrawingBufferSize(
        plane.material.uniforms.resolution.value,
      )
    }
  }
}
