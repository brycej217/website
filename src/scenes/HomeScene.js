import * as THREE from 'three'
import { Scene } from './Scene'
import { rotate, changeColor } from '../Animations'
import { Text } from 'troika-three-text'
import { _VS, _FS } from '../Shaders'
import { shaderPlane, text, cube } from '../Prefabs'

export class HomeScene extends Scene {
  constructor() {
    super()

    // background
    this.add('plane', shaderPlane(), {
      position: new THREE.Vector3(0, 0, -5),
      animate: changeColor(
        0.3,
        new THREE.Vector3(0.1, 0.1, 1.0),
        new THREE.Vector3(0.8, 0.8, 0.8),
      ),
    })

    // cube
    this.add('cube', cube(1, { color: new THREE.Color(0.5, 0.5, 0.5) }), {
      position: new THREE.Vector3(0, 0, 0),
      animate: rotate(0.1, ['x', 'y']),
    })

    // text
    this.add('label', text('Bryce'), {
      position: new THREE.Vector3(0, 0, 1),
    })
  }

  onRender(renderer, camera, delta) {
    const speed = 0.1
    super.onRender(renderer, camera, delta)
  }
}
