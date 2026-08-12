import * as THREE from 'three'
import { App } from './App'
import { HomeScene } from './scenes/HomeScene'
import { ProjectScene } from './scenes/ProjectScene'
import { AboutScene } from './scenes/AboutScene'
import { WorldHtml } from './WorldHtml'
import { PageManager } from './PageManager'

const app = new App()

// each scene's world-Y position/bounds is defined here and nowhere else —
// WorldHtml (via each .world-section's data-scene) and PageManager's nav
// targets both read it back off app.scenes at runtime instead of carrying
// their own hardcoded copies, which used to drift out of sync with these
// (and with each other) every time one got hand-tuned without the others.
// Scenes are registered immediately so app.scenes is populated before
// WorldHtml/PageManager construct below and need to read it.
const homeScene = new HomeScene(app, {
  position: new THREE.Vector3(0.0, 0.0, 0.0),
  bounds: new THREE.Vector2(7.0, -4.0),
})
app.register('home', homeScene)

const projectScene = new ProjectScene(app, {
  position: new THREE.Vector3(0.0, -15.0, 0.0),
  bounds: new THREE.Vector2(-4.0, -22.0),
})
app.register('project', projectScene)

const aboutScene = new AboutScene(app, {
  position: new THREE.Vector3(0.0, -30.0, 0.0),
  bounds: new THREE.Vector2(-22.0, -37.0),
})
app.register('about', aboutScene)

const worldHtml = new WorldHtml(app)
const pageManager = new PageManager(app)

// reveal the site once it's actually ready to be looked at, instead of
// leaving #loading-screen's cover over whatever's underneath the instant
// index.html itself parses — waits on the custom fonts (avoids a flash of
// fallback-font nav/labels right as it fades in) and two rAFs deep (the
// standard trick for "the browser has actually painted a frame", not just
// "we called renderer.render() once") so the WebGL background is already
// drawn, not blank, the moment it's revealed. Capped with a timeout so a
// stalled font load can never strand the page behind a black screen.
const loadingScreen = document.querySelector('#loading-screen')
if (loadingScreen) {
  const ready = Promise.all([
    document.fonts.ready,
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ),
  ])
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000))

  Promise.race([ready, timeout]).then(() => {
    loadingScreen.classList.add('loaded')
    loadingScreen.addEventListener(
      'transitionend',
      () => loadingScreen.remove(),
      { once: true },
    )
  })
}
