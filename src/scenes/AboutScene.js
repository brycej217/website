import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { plane, text } from '../Prefabs'
import gsap from 'gsap'
export class AboutScene extends Scene {
  constructor(app, opts) {
    super(app, opts)

    // color setup
    this.color = new THREE.Vector3(0.35, 0.05, 0.97)

    // blob setup
    this.count = 5
    this.simBound = 2.0
    this.sim = Blobs.sim(this.count, this.position.clone())
    this.blobOffset = app.allocateBlobSlots(this.count)
    app.on('update', (delta) => this.blobUpdate(delta))
  }

  blobUpdate(delta) {
    const blobs = this.app.uniforms.blobs.value

    for (let i = 0; i < this.count; ++i) {
      const { pos, velocity } = this.sim[i]
      pos.add(velocity)
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
