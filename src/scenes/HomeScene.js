import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { text, circle, fitViewport, textWidth } from '../Prefabs'
import gsap from 'gsap'

export class HomeScene extends Scene {
  constructor(app, opts) {
    super(app, opts)

    // color setup
    this.color = new THREE.Vector3(0.97, 0.24, 0.05)
    this.app.uniforms.color.value.copy(this.color) // set initial color

    // blob setup — slot allocation makes this sim run persistently alongside other scenes
    this.count = 30
    this.simBound = 2.0
    this.sim = Blobs.sim(this.count, new THREE.Vector3(0, 0, 0))
    this.blobOffset = app.allocateBlobSlots(this.count)
    app.on('update', (delta) => this.blobUpdate(delta))

    // labels
    const group = this.add('lables', new THREE.Group(), {
      position: new THREE.Vector3(0, 1, 0),
    })

    // "BRYCE" and "JOSEPH" are two separate objects rather than one
    // 'BRYCE  JOSEPH' string, so layoutName() below can stack them into two
    // lines on a narrow/portrait viewport instead of shrinking one long
    // line down to an illegible size (which is what fitViewport alone did
    // here previously, and reads badly at the sizes it takes to fit a name
    // this wide into a phone-width frustum)
    this.nameGap = 0.5 // world-unit gap between the words when side by side
    this.stackGap = 1.3 // vertical gap between the words when stacked
    const bryce = this.add(
      'brand-bryce',
      text('BRYCE', { fontSize: 1.5, font: '/mr.ttf' }),
      { interactable: false },
    )
    const joseph = this.add(
      'brand-joseph',
      text('JOSEPH', { fontSize: 1.5, font: '/mr.ttf' }),
      { interactable: false },
    )
    // safety net for a screen too narrow to fit even one word alone —
    // harmless in the common case, since a lone word sits well within
    // fitViewport's margin long before the two-word combined width (what
    // layoutName measures) forces a stack
    fitViewport(app, bryce)
    fitViewport(app, joseph)
    this.nameWords = [bryce, joseph]
    group.add(bryce)
    group.add(joseph)

    const desc = this.add(
      'label',
      text('GRAPHICS PROGRAMMER', {
        fontSize: 0.4,
        font: '/ic.ttf',
      }),
      { interactable: false },
    )
    fitViewport(app, desc)
    group.add(desc)
    this.desc = desc
    this.descRowY = -1.5 // desc's normal position, name laid out on one line
    this.descStackY = -2.1 // pushed down to clear the name's second line

    const layout = () => this.layoutName()
    bryce.addEventListener('synccomplete', layout)
    joseph.addEventListener('synccomplete', layout)
    app.on('resize', layout)
  }

  // lays "BRYCE"/"JOSEPH" out side by side (like the old single-string
  // label) if they both fit within the camera's current visible width,
  // otherwise stacks them into two centered lines. Re-run on resize and
  // once each word's own async (worker-driven) layout lands — see
  // Prefabs.textWidth(). Reads each word's *current* scale so this stays
  // correct even after fitViewport's safety-net shrink above has kicked in.
  layoutName() {
    const [bryce, joseph] = this.nameWords
    const w1 = textWidth(bryce)
    const w2 = textWidth(joseph)
    if (w1 == null || w2 == null) return

    const scaledW1 = w1 * bryce.scale.x
    const scaledW2 = w2 * joseph.scale.x
    const visible = this.app.camera.visibleWidth() * 0.88
    const stacked = scaledW1 + this.nameGap + scaledW2 > visible

    if (stacked) {
      bryce.position.set(0, this.stackGap / 2, 0)
      joseph.position.set(0, -this.stackGap / 2, 0)
      this.desc.position.y = this.descStackY
    } else {
      bryce.position.set(-(this.nameGap / 2 + scaledW1 / 2), 0, 0)
      joseph.position.set(this.nameGap / 2 + scaledW2 / 2, 0, 0)
      this.desc.position.y = this.descRowY
    }
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
