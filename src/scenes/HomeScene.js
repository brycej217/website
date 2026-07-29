import * as THREE from 'three'
import { Scene } from './Scene'
import { rotate, changeColor } from '../Animations'
import { glowScale, deGlowScale } from '../Interactions'
import { shaderPlane, text, cube } from '../Prefabs'
import gsap from 'gsap'

export class HomeScene extends Scene {
  constructor() {
    super()

    // background
    this.add('plane', shaderPlane(), {
      position: new THREE.Vector3(0, 0, -1),
      animate: changeColor(
        0.3,
        new THREE.Vector3(0.1, 0.1, 1.0),
        new THREE.Vector3(0.8, 0.8, 0.8),
      ),
      interactable: false,
    })
    /*
    // cube
    this.add('cube', cube(1, { color: new THREE.Color(0.0, 0.0, 0.5) }), {
      position: new THREE.Vector3(0, 0, 0),
      animate: rotate(0.1, ['x', 'y']),
      hover: glowScale(new THREE.Color('white')),
      dehover: deGlowScale(),
    })

    // text
    this.add('label', text('Bryce'), {
      position: new THREE.Vector3(0, 0, 1),
    })

    const tween = gsap.to(this.get('cube').position, {
      x: 2,
      duration: 2,
      ease: 'power1.out',
      paused: true,
    })
    tween.play()*/
  }

  onRender(renderer, camera, delta) {
    const speed = 0.1
    super.onRender(renderer, camera, delta)
  }
}
