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
    this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    // `false` here is load-bearing: the default (true) stamps a fixed
    // inline width/height (in px) onto the canvas, which outranks the
    // stylesheet's `#viewport { width: 100%; height: 100% }` and freezes
    // canvas.clientWidth/clientHeight at whatever the window was on load.
    // Every resize check downstream (this.resize(), Camera.pixelsPerUnit())
    // reads from those, so with the inline size pinned, nothing ever
    // detects a real resize or monitor switch again.
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
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
    this.navEl = document.querySelector('#nav1')
    this.backEl = document.querySelector('#page-back')

    // besides the per-frame poll in update() (still needed to catch a
    // monitor-switch that changes devicePixelRatio without firing a native
    // resize event at all), also react to the browser's own resize event
    // directly. The DOM's 100vh sections reflow instantly and synchronously
    // the moment the window/monitor actually changes — no JS involved — but
    // the 3D camera's projection matrix only updates when this.resize() next
    // runs. Waiting on the once-per-frame poll means a real, if usually
    // sub-frame, gap where the DOM has already reflowed to the new size and
    // the 3D scene hasn't caught up yet; that gap can stretch to something
    // actually visible if rAF stalls during the resize itself (common
    // during an OS-level window drag between monitors), which reads as
    // labels briefly "shifting" before settling into place.
    window.addEventListener('resize', () => this.resize())
  }

  transition(callback, destY = null, destColor = null) {
    // killing an in-flight timeline can catch it mid-transition — after it
    // set its destination scene's opacity to 0 (to fade in behind the wipe)
    // but before its own fade-back-in ever ran. Left alone that scene would
    // stay invisible forever, so every scene is snapped fully visible before
    // the new timeline below re-drives whichever ones it actually cares about
    this.tl?.kill()
    for (const scene of Object.values(this.scenes)) {
      if (scene.color) scene.opacity = 1
    }

    // lock out the nav/back button for the duration — a click landing
    // mid-transition raced this one (two competing transition() calls); the
    // 'transitioning' class hides them and disables pointer-events via CSS
    this.navEl.classList.add('transitioning')
    this.backEl?.classList.add('transitioning')

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

    if (destScene) {
      this.tl.to(
        destScene,
        { opacity: 1, duration: 0.3, ease: 'power2.in' },
        0.65,
      )
    }

    this.tl.eventCallback('onComplete', () => {
      this.navEl.classList.remove('transitioning')
      this.backEl?.classList.remove('transitioning')

      // the scene we just faded *away from* (this.currScene, captured above)
      // only ever got faded to 0 — nothing in this timeline fades it back in,
      // since only destScene gets that treatment. Left alone it stays
      // invisible forever, including if the user later scrolls back to it by
      // hand (normal scroll-cycling never touches opacity, only transition()
      // does) rather than clicking another nav link. Same fix as the
      // kill-recovery snap above, just run once this transition actually
      // finishes instead of only defensively at the start of the next one.
      for (const scene of Object.values(this.scenes)) {
        if (scene.color) scene.opacity = 1
      }
    })
  }

  register(name, scene) {
    this.scenes[name] = scene
    if (name === 'home') {
      this.currScene = scene
      this.currScene.onEnter()
    }
  }

  // Allocates a contiguous slice of the global blobs array for a scene's simulation.
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
      const top = -90 // top of screen (small buffer above the page's anchor)

      // bottom bound follows the active page's actual rendered height (it's
      const pageEl = this.pages?.active?.el
      const pxPerUnit = this.camera.pixelsPerUnit()
      const viewportUnits = this.renderer.domElement.clientHeight / pxPerUnit
      const contentUnits = pageEl ? pageEl.scrollHeight / pxPerUnit : 0
      const bottom = -100 - Math.max(0, contentUnits - viewportUnits) - 10

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
    // read live rather than the renderer's cached copy — dragging the
    // window to a different monitor can change this without changing
    // clientWidth/clientHeight at all (same CSS-pixel size, different
    // backing scale), which the drawing-buffer comparison alone would miss
    const pixelRatio = window.devicePixelRatio || 1

    // compare against the drawing-buffer size the renderer should have
    const needs =
      pixelRatio !== this.renderer.getPixelRatio() ||
      canvas.width !== Math.floor(width * pixelRatio) ||
      canvas.height !== Math.floor(height * pixelRatio)

    if (!needs) return

    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(width, height, false)
    this.camera.resize(width, height)
    this.emit('resize') // WorldHtml re-anchors its sections — see Camera.pixelsPerUnit()

    // refresh the shader's resolution uniform (drawing-buffer pixels) — without
    // this the blob raymarch keeps reading the launch-time canvas size, so its
    // gl_FragCoord/resolution UV math (and therefore the whole background)
    // skews and stretches out of proportion to the actual window after a resize
    this.renderer.getDrawingBufferSize(this.uniforms.resolution.value)
  }

  // helper camera position getter
  getY() {
    return this.camera.get().position.y
  }
}
