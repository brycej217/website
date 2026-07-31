import * as THREE from 'three'
import { Engine } from './Engine'
import { HomeScene } from './scenes/HomeScene'
import { ProjectScene } from './scenes/ProjectScene'
import { AboutScene } from './scenes/AboutScene'

const engine = new Engine()

const homeScene = new HomeScene({
  position: new THREE.Vector3(0.0, 0.0, 0.0),
  bounds: new THREE.Vector2(10.0, -5.0),
})
const projectScene = new ProjectScene({
  position: new THREE.Vector3(0.0, -30.0, 0.0),
  bounds: new THREE.Vector2(-5.0, -25.0),
})
const aboutScene = new AboutScene({
  position: new THREE.Vector3(0.0, -60.0, 0.0),
  bounds: new THREE.Vector2(-25.0, -40.0),
})

engine.register('home', homeScene)
engine.register('project', projectScene)
engine.register('about', aboutScene)
