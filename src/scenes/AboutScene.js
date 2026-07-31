import * as THREE from 'three'
import { Scene } from './Scene'
import { plane, text } from '../Prefabs'
import gsap from 'gsap'

export class AboutScene extends Scene {
  constructor(opts) {
    super(opts)

    this.color = new THREE.Vector3(0.35, 0.05, 0.97)
  }

  onEnter() {
    console.log('enter about')
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
    console.log('exit about')
  }
}
