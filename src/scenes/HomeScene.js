import * as THREE from 'three'
import { Scene } from './Scene'
import { Blobs } from '../Shaders'
import { text, circle } from '../Prefabs'
import gsap from 'gsap'

export class HomeScene extends Scene {
  constructor(app, opts) {
    super(app, opts)

    // color setup
    this.color = new THREE.Vector3(0.97, 0.24, 0.05)
    this.app.uniforms.color.value.copy(this.color) // set initial color

    // blob setup
    this.count = 32
    this.simBound = 2.0
    this.sim = Blobs.sim(this.count, new THREE.Vector3(0, 0, 0))

    // labels
    const group = this.add('lables', new THREE.Group(), {
      position: new THREE.Vector3(0, 1, 0),
    })

    const name = this.add(
      'label',
      text('BRYCE  JOSEPH', { fontSize: 1.5, font: '/mr.ttf' }),
    )

    const desc = this.add(
      'label',
      text('GRAPHICS PROGRAMMER', {
        fontSize: 0.4,
        font: '/ic.ttf',
      }),
      {
        position: new THREE.Vector3(0, -1.4, 0),
      },
    )

    group.add(name)
    group.add(desc)
  }

  blobUpdate(delta) {
    this.elapsed += delta
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

      blobs[i].center.copy(pos)
    }
  }

  onEnter() {
    this.app.uniforms.count.value = this.count
    this.unregister = this.app.on('update', (delta) => this.blobUpdate(delta))
    gsap.to(this.app.uniforms.color.value, {
      x: this.color.x,
      y: this.color.y,
      z: this.color.z,
      duration: 2,
      ease: 'power4.out',
      overwrite: 'auto',
    })
  }

  onExit() {
    this.unregister()
  }
}
