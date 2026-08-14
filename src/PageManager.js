import { Page } from './Page'
import { content } from '../Content'

export class PageManager {
  constructor(app) {
    this.app = app
    app.pages = this
    this.pages = {}

    for (const data of content) {
      this.pages[data.id] = new Page(app, data)
    }
    this.active = null
    this.outlineEl = document.querySelector('#page-nav')
    this.backEl = document.querySelector('#page-back')

    // target scene resolved at click time by Router.go(), not cached here —
    // AboutScene.position.y can shift after this constructor runs (see
    // main.js's relayout(), which pushes it down to clear a tall project
    // grid), and a target cached before that shift would teleport the
    // camera to where "about" used to be instead of where it actually ended up
    const navTargets = { home: 'home', projects: 'project', about: 'about' }
    for (const [elId, scene] of Object.entries(navTargets)) {
      document.querySelector(`#${elId}`)?.addEventListener('click', (e) => {
        e.preventDefault()
        // fade the sidebar out *before* the wipe starts, not mid-transition
        // — see hideOutlineNow()
        this.hideOutlineNow()
        this.app.router.navigate(scene)
      })
    }

    // back button — goes through the browser's own session history (rather
    // than transitioning directly) so it behaves identically to the
    // browser's back button; Router's popstate handler does the actual
    // close()+teleport, landing on storedY same as before
    this.backEl?.addEventListener('click', (e) => {
      e.preventDefault()
      if (!this.active) return
      this.hideOutlineNow()
      history.back()
    })
  }

  // `showBack` is false only when ProjectScene.openProject() landed here via
  // Router.boot()'s instant path (a deep link/hard refresh) — there's no
  // in-app history behind that, so the button (which just calls
  // history.back()) would otherwise send a click straight out of the site
  open(id, { showBack = true } = {}) {
    // tell app that we are in page mode and store y
    this.app.inProject = true
    this.app.currScene = null
    this.storedY = this.app.getY()

    // teleport to page display
    this.app.camera.teleport(-100)
    this.active?.hide()
    this.active = this.pages[id]
    this.active?.show()
    // sidebar reveal is gated behind armOutlineReveal() — see there
    this.outlineArmed = false
    this.backEl?.classList.toggle('visible', showBack)
  }

  close() {
    this.active?.hide()
    this.active = null
    this.hideOutlineNow()
    this.backEl?.classList.remove('visible')

    // tell app that we are back in scene mode and retrieve stored y
    this.app.inProject = false
    this.app.camera.teleport(this.storedY)
  }

  // called once App.transition()'s wipe has fully finished — see
  // ProjectScene's card click, which passes this as the transition's
  // onComplete. The sidebar only reveals once this AND the write-up's
  // outline (built asynchronously once its markdown fetch resolves — see
  // onOutlineReady) are both ready, whichever finishes last. Without this
  // gate, a markdown fetch that happened to resolve quickly could reveal
  // the sidebar as early as open() itself — well before the wipe even
  // finished covering the screen — instead of only once the destination is
  // actually on screen.
  armOutlineReveal() {
    this.outlineArmed = true
    this.revealOutlineIfReady()
  }

  // called by Page once its markdown finishes loading — if that page is
  // already the one on screen (the fetch can resolve after open() ran),
  // refresh the sidebar so it doesn't sit empty
  onOutlineReady(page) {
    if (this.active === page) this.revealOutlineIfReady()
  }

  revealOutlineIfReady() {
    if (!this.outlineArmed) return
    this.renderOutline(this.active)
  }

  // hides the sidebar immediately — has to be quick, since it's outside
  // #world-html (see .page-nav) so nothing else masks it while a scene
  // transition is in flight; callers fade it out *before* starting
  // App.transition() so it's already gone by the time the wipe begins,
  // rather than fading out mid-transition
  hideOutlineNow() {
    this.outlineEl.innerHTML = ''
    this.outlineEl.style.transitionDuration = '0.12s'
    this.outlineEl.classList.remove('visible')
  }

  // (re)builds the section-navigator sidebar for `page` (or clears/hides it
  // for null); lives outside #world-html so it stays put on screen — see
  // .page-nav — rather than scrolling away with the write-up
  renderOutline(page) {
    if (!page?.outline.length) {
      this.hideOutlineNow()
      return
    }

    this.outlineEl.innerHTML = ''
    this.outlineEl.style.transitionDuration = '0.3s'
    this.outlineEl.classList.add('visible')

    for (const item of page.outline) {
      const a = document.createElement('a')
      a.textContent = item.text
      a.href = `#${item.id}`
      a.className = item.level === 1 ? 'page-nav-h1' : 'page-nav-h2'
      a.addEventListener('click', (e) => {
        e.preventDefault()
        this.scrollToHeading(item.id)
      })
      this.outlineEl.appendChild(a)
    }
  }

  // teleports the camera so `id`'s heading lands near the top of the
  // viewport — converts its current on-screen position to world-space
  // using the same world-unit <-> pixel ratio WorldHtml uses to sync
  // #world-html's scroll transform in the first place
  scrollToHeading(id) {
    const el = document.getElementById(id)
    if (!el) return

    const desiredScreenY = 120
    const currentScreenY = el.getBoundingClientRect().top
    const deltaY =
      (desiredScreenY - currentScreenY) / this.app.camera.pixelsPerUnit()
    this.app.camera.scrollToY(this.app.getY() + deltaY)
  }
}
