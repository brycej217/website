import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { plane, text, fitViewport, labelLocalBottom } from '../Prefabs'
import gsap from 'gsap'
export class AboutScene extends Scene {
  constructor(app, opts) {
    super(app, opts)

    // color setup
    this.color = new THREE.Vector3(0.35, 0.05, 0.97) // indigo

    // this scene's world-Y as originally authored (see main.js) — reposition()
    // below can push it further down to clear a project grid taller than the
    // gap main.js budgeted for it, and needs a fixed reference point that
    // doesn't itself drift as that shift gets recalculated on every resize
    this.basePosition = this.position.clone()
    this.baseBounds = this.bounds.clone()
    this.shiftY = 0

    // manual, purely-cosmetic nudge to bounds.y (bottom of this scene's
    // Camera.boundsCheck()/App.transition color-change range) — layered on
    // *after* reposition()'s dynamic shiftY below rather than baked into
    // baseBounds/main.js's authored number, since editing that instead
    // would also move shiftY, which drags this scene's root/label/blob
    // position along with it. bounds.x has no equivalent field here — see
    // reposition(), it's read directly off ProjectScene instead, on purpose.
    this.boundsEndOffset = 0 // + moves bounds.y (bottom) later/lower (less negative) — i.e. shortens the span

    // label setup
    const name = this.add(
      'label',
      text('ABOUT', { fontSize: 1.5, font: '/mr.ttf' }),
      { position: new THREE.Vector3(0, 4.5, 0), interactable: false },
    )
    fitViewport(app, name)
    this.label = name
    // world-unit breathing room between the label's bottom edge and the
    // about panel's top — see anchorY()/main.js's relayout()
    this.labelGap = 4

    // blob setup
    this.count = 5
    this.simBound = 2.0
    this.sim = Blobs.sim(
      this.count,
      this.position.clone().add(new THREE.Vector3(0, 0, 0)),
    )
    this.blobOffset = app.allocateBlobSlots(this.count)
    app.on('update', (delta) => this.blobUpdate(delta))
  }

  // world-Y where DOM content for this scene should start — right below the
  // "ABOUT" label's actual (possibly already reposition()ed) rendered
  // bottom edge. Null until the label's own async layout lands. See
  // ProjectScene.anchorY, which this mirrors.
  get anchorY() {
    const bottom = labelLocalBottom(this.label)
    return bottom === null ? null : this.position.y + bottom - this.labelGap
  }

  // pushes this scene's root and blob sim down (never up — shiftY is
  // expected to be <= 0) by `shiftY` world units relative to its base
  // position, so its label/panel/blobs move down together and stay lined up
  // with each other regardless of how tall ProjectScene's grid rendered.
  // shiftY is exactly how far ProjectScene.extendBounds() had to push its
  // own bottom bound past its authored value (its *automatic*, content
  // -driven part only — see there), not independently measured.
  //
  // bounds.x is read directly off ProjectScene.bounds.y — not reconstructed
  // from shiftY/baseBounds.x/an offset here — so the two can never drift
  // apart. They have to be *exactly* equal, not just close: Camera.
  // boundsCheck() walks scenes in registration order and returns the first
  // whose bounds contain the camera's Y, so any gap leaves a dead zone
  // where no scene matches, and any overlap just silently loses to
  // ProjectScene (checked first) — a "start 1 unit earlier" nudge applied
  // only on this side would have no visible effect for exactly that reason.
  // Tune the boundary itself via ProjectScene.boundaryOffset instead.
  //
  // Idempotent — safe to call repeatedly with the same or a different
  // absolute shiftY (e.g. once per resize) since blob positions are
  // translated incrementally, by however much shiftY changed since the last
  // call, rather than by the full amount every time.
  reposition(shiftY) {
    // bounds still need recomputing even when shiftY is unchanged, since
    // ProjectScene.bounds.y/this.boundsEndOffset can change independently
    // of any resize-driven relayout() call
    this.bounds.x = this.app.scenes.project.bounds.y
    this.bounds.y = this.baseBounds.y + shiftY + this.boundsEndOffset

    if (shiftY === this.shiftY) return
    const delta = shiftY - this.shiftY
    this.shiftY = shiftY

    this.root.position.y = this.basePosition.y + shiftY
    this.position.y = this.basePosition.y + shiftY

    // blob positions are absolute world coordinates (not root-relative —
    // see blobUpdate()/Blobs.sim), so they need their own translation
    for (const s of this.sim) s.pos.y += delta
  }

  blobUpdate(delta) {
    const blobs = this.app.uniforms.blobs.value
    // velocities in Blobs.sim() are tuned as units/frame at 60fps — scale by
    // delta*60 so motion speed is real-time, not tied to the render's fps
    const step = delta * 60

    for (let i = 0; i < this.count; ++i) {
      const { pos, velocity } = this.sim[i]
      pos.addScaledVector(velocity, step)
      if (pos.x > this.simBound || pos.x < -this.simBound)
        velocity.x = -velocity.x
      if (pos.y > this.simBound || pos.y < -this.simBound)
        velocity.y = -velocity.y
      if (pos.z > this.simBound || pos.z < -this.simBound)
        velocity.z = -velocity.z

      blobs[this.blobOffset + i].center.copy(pos)
    }
  }

  onEnter() {
    gsap.to(this.app.uniforms.color.value, {
      x: this.color.x,
      y: this.color.y,
      z: this.color.z,
      duration: 2,
      ease: 'power4.out',
      overwrite: 'auto',
    })
  }

  onExit() {}
}
