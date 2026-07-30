import * as THREE from 'three'
import { Engine } from './Engine'
import { HomeScene } from './scenes/HomeScene'
import { ProjectScene } from './scenes/ProjectScene'

const engine = new Engine()

const homeScene = new HomeScene()
const projectScene = new ProjectScene({
  position: new THREE.Vector3(0.0, -30.0, 0.0),
})

engine.register('home', homeScene)
engine.register('project', projectScene)
