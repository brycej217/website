import * as THREE from 'three'
import { Scene } from './Scene'
import { shaderPlane, ballUpdate } from '../Shaders'
import { text } from '../Prefabs'
import gsap from 'gsap'

export class HomeScene extends Scene {
  constructor() {
    super()

    // background
    const plane = this.add('plane', shaderPlane(), {
      position: new THREE.Vector3(0, 0, -1.1),
      interactable: false,
      onAnimate: ballUpdate(),
    })
    window.plane = plane

    // labels
    const group = this.add('lables', new THREE.Group(), {
      position: new THREE.Vector3(0, 1, 0),
    })

    const name = this.add(
      'label',
      text('BRYCE  JOSEPH', { fontSize: 1.5, font: '../../public/mr.ttf' }),
    )

    const desc = this.add(
      'label',
      text('GRAPHICS PROGRAMMER', {
        fontSize: 0.4,
        font: '../../public/ic.ttf',
      }),
      {
        position: new THREE.Vector3(0, -1.4, 0),
      },
    )

    group.add(name)
    group.add(desc)
  }
}
