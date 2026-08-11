import * as THREE from 'three'
import { App } from './App'
import { HomeScene } from './scenes/HomeScene'
import { ProjectScene } from './scenes/ProjectScene'
import { AboutScene } from './scenes/AboutScene'
import { WorldHtml } from './WorldHtml'
import { PageManager } from './PageManager'

const app = new App()

const homeScene = new HomeScene(app, {
  position: new THREE.Vector3(0.0, 0.0, 0.0),
  bounds: new THREE.Vector2(10.0, -5.0),
})
const projectScene = new ProjectScene(app, {
  position: new THREE.Vector3(0.0, -14.0, 0.0),
  bounds: new THREE.Vector2(-5.0, -20.0),
})
const aboutScene = new AboutScene(app, {
  position: new THREE.Vector3(0.0, -28.0, 0.0),
  bounds: new THREE.Vector2(-20.0, -33.0),
})

const worldHtml = new WorldHtml(app)
const pageManager = new PageManager(app)

app.register('home', homeScene)
app.register('project', projectScene)
app.register('about', aboutScene)
