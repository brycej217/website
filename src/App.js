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

    // transition setup — single circle using a cloned material with its own scrollY
    this.nextBlobSlot = 0
    this.transitionMat = this.blobs.createTransitionMaterial()
    this.tc = circle(1, { material: this.transitionMat })
    this.tc.position.z = 0.1
    globalScene.root.add(this.tc) // bypass interactables
    this.on('update', () => {
      this.tc.position.y = this.getY()
    })
    this.tc.visible = false
    this.htmlOverlay = document.querySelector('#world-html')
  }

  transition(callback, destY = null, destColor = null) {
    this.tl?.kill()

    // point circle at destination; fall back to current view if not provided
    this.transitionMat.uniforms.scrollY.value = destY ?? this.getY()

    // find the scene that owns destY so we can read its final color
    const destScene =
      destY !== null
        ? Object.values(this.scenes).find(
            (s) =>
              s.bounds && s.color && destY <= s.bounds.x && destY >= s.bounds.y,
          )
        : null

    // resolve destination color: explicit override (e.g. a project's own color) >
    // the scene that owns destY > whatever color is currently showing
    const targetColor =
      destColor ?? (destScene ? destScene.color : this.uniforms.color.value)

    // immediately snap the circle to the destination color (no gsap)
    this.transitionMat.uniforms.color.value.copy(targetColor)

    this.tc.scale.set(0.01, 0.01, 0.01)
    this.tc.visible = true

    this.tl = gsap.timeline()

    // world HTML fades out immediately so the positional snap is invisible
    this.tl.to(
      this.htmlOverlay,
      { opacity: 0, duration: 0.25, ease: 'power2.out' },
      0,
    )

    // current scene's objects fade out alongside the html — a touch slower and
    // gentler than the html fade so it reads as a fade rather than a snap
    if (this.currScene) {
      this.tl.to(
        this.currScene,
        { opacity: 0, duration: 0.3, ease: 'power1.out' },
        0,
      )
    }

    // circle expands from center revealing destination
    this.tl.to(
      this.tc.scale,
      { x: 10, y: 10, z: 10, duration: 0.7, ease: 'power3.out' },
      0,
    )

    // swap camera / scene at peak coverage
    this.tl.call(
      () => {
        callback?.()
        this.transitionMat.uniforms.scrollY.value = this.getY()
        // hide the destination scene's objects until they're revealed behind
        // the shrinking circle, so the fade-in below has something to animate from
        if (destScene) destScene.opacity = 0
      },
      null,
      0.45,
    )

    // hide circle — snap main color to destination first so there is no color pop
    this.tl.call(
      () => {
        gsap.killTweensOf(this.uniforms.color.value)
        this.uniforms.color.value.copy(this.transitionMat.uniforms.color.value)
        this.tc.visible = false
        this.tc.scale.set(0.01, 0.01, 0.01)
      },
      null,
      0.7,
    )

    // world HTML fades back in to reveal destination content
    this.tl.to(
      this.htmlOverlay,
      { opacity: 1, duration: 0.3, ease: 'power2.in' },
      0.65,
    )

    // destination scene's objects fade back in. Starts earlier than the html
    // (while still hidden behind the circle) and uses an ease-out curve so most
    // of the opacity change happens while masked — by the time the circle is
    // gone at 0.7 the cards are already mostly visible, so it reads as a real
    // cross-fade instead of popping in over the mask's last few frames
    if (destScene) {
      this.tl.to(
        destScene,
        { opacity: 1, duration: 0.3, ease: 'power2.in' },
        0.65,
      )
    }
  }

  register(name, scene) {
    this.scenes[name] = scene
    if (name === 'home') {
      this.currScene = scene
      this.currScene.onEnter()
    }
  }

  // Allocates a contiguous slice of the global blobs array for a scene's simulation.
  // Returns the starting index; call once per scene during construction.
  allocateBlobSlots(count) {
    const offset = this.nextBlobSlot
    this.nextBlobSlot += count
    this.uniforms.count.value = this.nextBlobSlot
    return offset
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
