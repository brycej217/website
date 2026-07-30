import * as THREE from 'three'
import { Scene } from './Scene'
import { plane } from '../Prefabs'

export class ProjectScene extends Scene {
  constructor({ position = new THREE.Vector3() } = {}) {
    super({ position })

    // background
    this.add('plane', plane(50), {
      position: new THREE.Vector3(0, 0, -1),
    })
  }
}
