import * as THREE from 'three'
import { App } from './App'
import { HomeScene } from './scenes/HomeScene'
import { ProjectScene } from './scenes/ProjectScene'
import { AboutScene } from './scenes/AboutScene'
import { WorldHtml } from './WorldHtml'
import { PageManager } from './PageManager'
import { Router } from './Router'

const app = new App()

const projStart = -4.0
const aboutStart = -5.0

const homeScene = new HomeScene(app, {
  position: new THREE.Vector3(0.0, 0.0, 0.0),
  bounds: new THREE.Vector2(7.0, projStart),
})
app.register('home', homeScene)

const projectScene = new ProjectScene(app, {
  position: new THREE.Vector3(0.0, -15.0, 0.0),
  bounds: new THREE.Vector2(projStart, aboutStart),
})
app.register('project', projectScene)

const aboutScene = new AboutScene(app, {
  position: new THREE.Vector3(0.0, -9.0, 0.0),
  bounds: new THREE.Vector2(aboutStart, -16.0),
})
app.register('about', aboutScene)

const worldHtml = new WorldHtml(app)
const pageManager = new PageManager(app)
const router = new Router(app) // reads app.scenes/app.pages, so built after both

// ProjectScene's/AboutScene's authored bounds above assume the project grid
// fits in the 18-unit gap budgeted for it — true on desktop, but the grid's
// cards stack into more, taller rows as the viewport narrows (see
// .project-card's breakpoints in style.css), and can end up running well
// past that. relayout() re-measures the grid's actual rendered height every
// time that could have changed, extends ProjectScene's own bottom bound
// (bounds.y — the boundary that drives the background color's enter/exit
// transition, via Camera.boundsCheck()/App.transition) to clear it, and
// pushes AboutScene (root, bounds, and blob sim) down by exactly that same
// amount, so AboutScene's label/panel always pick up right where
// ProjectScene's own (possibly-extended) range actually ends instead of at
// some independently-guessed distance — see ProjectScene.extendBounds() and
// AboutScene.reposition(). Finishes by re-running WorldHtml's own anchoring
// pass immediately rather than waiting for the next native resize event, so
// the DOM sections pick up the new anchors (and either label's own async
// layout landing) right away too.
function relayout() {
  const pxPerUnit = app.camera.pixelsPerUnit()

  // the camera doesn't move on its own during a resize, but the content it
  // was framing can (see below) — capture enough beforehand to tell, once
  // that's recomputed, whether it just happened and by how much
  const wasInAbout = app.getY() <= aboutScene.bounds.x
  const prevShiftY = aboutScene.shiftY

  const shift = projectScene.extendBounds(pxPerUnit)
  aboutScene.reposition(shift)
  worldHtml.anchorSections()

  // AboutScene.reposition() just moved its root/label/blobs in world space
  // by (aboutScene.shiftY - prevShiftY) — a plain resize (nothing about the
  // *content* changed) can trigger this too, purely because contentBottom()
  // measures grid height by converting its pixel scrollHeight through
  // pxPerUnit, and pxPerUnit itself changes with viewport height. Without
  // this, a viewer sitting in AboutScene watching it happen would see its
  // label/panel/blobs slide out from under a camera that never itself
  // moved — popping around on screen despite nothing they did causing it.
  // Following the move by the same delta keeps whatever was on screen on
  // screen. A camera still up in Home/Project is deliberately left alone —
  // neither of those scenes' content moves, so shifting it there would
  // introduce a jump instead of preventing one.
  const delta = aboutScene.shiftY - prevShiftY
  if (delta !== 0 && wasInAbout) {
    app.camera.shiftY(delta)
  }
}

app.on('resize', relayout)
projectScene.label.addEventListener('synccomplete', relayout)
aboutScene.label.addEventListener('synccomplete', relayout)
document.fonts.ready.then(relayout) // custom fonts can shift card text height, and therefore grid height
relayout()

// Router.boot() needs ProjectScene's/AboutScene's bounds already reflecting
// their real rendered content height (see anchorY on both scenes) — both
// stay null until each scene's troika label finishes its own async layout,
// so booting off the synchronous relayout() above alone can read
// still-unextended bounds. That's not just a wrong initial camera Y: a
// stale AboutScene.bounds can still claim ownership of whatever Y
// ProjectScene's own target resolves to (Camera.boundsCheck() runs every
// frame off live bounds), which visibly flashes into About before the next
// real relayout() corrects it — e.g. a fresh load of /project landing in
// AboutScene's color for a frame. Wait for both labels' first sync (or a
// timeout, so a stalled font/layout can never strand routing entirely),
// re-run relayout() once more immediately before booting.
function whenSynced(label) {
  return new Promise((resolve) =>
    label.addEventListener('synccomplete', resolve, { once: true }),
  )
}
const labelsReady = Promise.all([
  whenSynced(projectScene.label),
  whenSynced(aboutScene.label),
])
const bootTimeout = new Promise((resolve) => setTimeout(resolve, 3000))
const booted = Promise.race([labelsReady, bootTimeout]).then(() => {
  relayout()
  router.boot()
  // landed directly on a project's detail page (a deep link) — also wait
  // for its write-up to actually finish fetching (see Page.ready), so the
  // loading screen doesn't lift off a page whose body hasn't rendered yet.
  // Bounded by the same overall timeout below regardless of how long this takes.
  return app.pages.active?.ready
})

// reveal the site once it's actually ready to be looked at, instead of
// leaving #loading-screen's cover over whatever's underneath the instant
// index.html itself parses — waits on the custom fonts (avoids a flash of
// fallback-font nav/labels right as it fades in), on the initial route
// having actually landed (see `booted` above — otherwise a deep link could
// reveal a frame of the wrong scene before Router.boot() cuts over), and
// two rAFs deep (the standard trick for "the browser has actually painted a
// frame", not just "we called renderer.render() once") so the WebGL
// background is already drawn, not blank, the moment it's revealed. Capped
// with a timeout so a stalled font/label load can never strand the page
// behind a black screen.
const loadingScreen = document.querySelector('#loading-screen')
if (loadingScreen) {
  const ready = Promise.all([
    document.fonts.ready,
    booted,
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

// About panel's email link copies the address instead of navigating —
// href stays a plain mailto: (so right-click "copy email address"/middle-
// click-open-in-new-tab still do something sensible), the click itself is
// intercepted and swaps the label to a brief "Copied!" confirmation
const emailLink = document.querySelector('#email-link')
if (emailLink) {
  const label = emailLink.textContent
  const email = emailLink.href.replace(/^mailto:/, '')
  let resetTimer = null

  emailLink.addEventListener('click', (e) => {
    e.preventDefault()
    navigator.clipboard.writeText(email).then(() => {
      clearTimeout(resetTimer)
      emailLink.textContent = 'Copied!'
      resetTimer = setTimeout(() => {
        emailLink.textContent = label
      }, 1500)
    })
  })
}
