import * as THREE from 'three'
import { Scene } from './Scene'
import { shaderPlane, ballUpdate } from '../Shaders'
import { text, circle } from '../Prefabs'
import { shaderMaterial } from '../Shaders'
import gsap from 'gsap'

export class HomeScene extends Scene {
  constructor(opts) {
    super(opts)

    this.color = new THREE.Vector3(0.97, 0.24, 0.05)

    // background
    const plane = this.add('plane', shaderPlane(), {
      position: new THREE.Vector3(0, 0, -1.01),
      interactable: false,
      onAnimate: ballUpdate(),
    })
    window.plane = plane
    this.plane = plane
    plane.material.uniforms.color.value.copy(this.color) // set initial color

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

  onEnter() {
    console.log('enter home')
    gsap.to(window.plane.material.uniforms.color.value, {
      x: this.color.x,
      y: this.color.y,
      z: this.color.z,
      duration: 2,
      ease: 'power4.out',
      overwrite: 'auto',
    })
  }

  onExit() {
    console.log('exit home')
  }
}
