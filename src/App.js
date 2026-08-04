import * as THREE from 'three'
import { Emitter } from './Emitter'
import { Camera } from './Camera'
import { Blobs } from './Shaders'
import { Scene } from './scenes/Scene'
import { circle } from './Prefabs'
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
    this.interactables = []

    // clock setup
    this.timer = new THREE.Timer()
    this.time = 0

    // animation loop setup
    this.renderer.setAnimationLoop(() => this.update())

    // blob setup
    this.blobs = new Blobs(this)
    const globalScene = new Scene(this)
    globalScene.add('blobs', this.blobs.plane)
    this.scenes['blobs'] = globalScene
    this.uniforms = this.blobs.material.uniforms
    this.renderer.getDrawingBufferSize(this.uniforms.resolution.value)

    // transition setup
    this.t1 = globalScene.add(
      't1',
      circle(1, { color: new THREE.Color('black') }),
    )
    this.t2 = globalScene.add(
      't2',
      circle(1, { material: this.blobs.material }),
    )
    this.t2.position.z = 0.1
    this.on('update', () => {
      this.t1.position.y = this.getY()
      this.t2.position.y = this.getY()
    })
    this.t1.visible = false
    this.t2.visible = false
  }

  transition(callback) {
    this.tl?.kill()

    this.tl = gsap.timeline({
      onComplete: () => {
        this.t1.visible = false
        this.t2.visible = false
        this.t1.scale.set(0.01, 0.01, 0.01)
        this.t2.scale.set(0.01, 0.01, 0.01)
      },
    })

    // starting state
    this.t1.scale.set(0.01, 0.01, 0.01)
    this.t2.scale.set(0.01, 0.01, 0.01)
    this.t1.visible = true
    this.t2.visible = false

    // phase 1: t1 grows to cover
    this.tl.to(this.t1.scale, {
      x: 10,
      y: 10,
      z: 10,
      duration: 1,
      ease: 'power3.out',
    })

    // swap content once t1 has covered enough
    this.tl.call(
      () => {
        callback?.()
        this.t2.visible = true
      },
      null,
      0.6,
    ) // absolute time 0.5s

    // phase 2: t2 grows
    this.tl.to(
      this.t2.scale,
      {
        x: 10,
        y: 10,
        z: 10,
        duration: 1,
        ease: 'power3.out',
      },
      0.6,
    ) // absolute time 0.5s
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
