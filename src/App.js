import * as THREE from 'three'
import { Emitter } from './Emitter'
import { Camera } from './Camera'
import { Blobs } from './Shaders'
import { Scene } from './scenes/Scene'
import './style.css'
import gsap from 'gsap'

export class App extends Emitter {
  constructor() {
    super()

    // canvas selection and renderer setup
    const canvas = document.querySelector('#viewport')
    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.autoClear = false // allows for rendering multiple scenes at once

    // camera setup
    this.camera = new Camera(this)

    // scene registry setup
    this.scenes = {}

    // clock setup
    this.timer = new THREE.Timer()
    this.time = 0

    // animation loop setup
    this.renderer.setAnimationLoop(() => this.update())

    // blob setup
    this.blobs = new Blobs(this)
    const blobScene = new Scene(this)
    blobScene.add('blobs', this.blobs.plane)
    this.scenes['blobs'] = blobScene
    this.uniforms = this.blobs.material.uniforms
    this.renderer.getDrawingBufferSize(this.uniforms.resolution.value)
  }

  register(name, scene) {
    this.scenes[name] = scene
    if (name === 'home') {
      this.currScene = scene
      this.currScene.onEnter()
    }
  }

  // main render loop (calls the on render function for all scenes)
  update() {
    // get delta time since last frame (in seconds)
    this.timer.update()
    const delta = this.timer.getDelta()
    this.time += delta

    // emit update event
    this.emit('update', delta)

    // resize logic
    this.resize()
    this.renderer.clear()

    // emit render event
    this.emit('render', this.renderer, this.camera.get())

    // if in project view do not perform alternative bounds checking
    if (this.inProject) {
      const top = -90 // top of screen
      const bottom = -125 // bottom of screen

      this.camera.boundsCheck(top, bottom, null)
      return
    }

    // check if entered new scene
    const top = this.scenes['home'].bounds.x // top of screen
    const bottom = this.scenes['about'].bounds.y // bottom of screen

    const active = this.camera.boundsCheck(top, bottom, this.scenes)

    if (active && active !== this.currScene) {
      this.currScene?.onExit?.()
      this.currScene = active
      active.onEnter?.()
    }
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
      this.renderer.getDrawingBufferSize(this.uniforms.resolution.value)
    }
  }

  // helper camera position getter
  getY() {
    return this.camera.get().position.y
  }
}
