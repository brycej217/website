import { Page } from './Page'
import { content } from '../Content'
import { PIXELS_PER_UNIT } from './WorldHtml'

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

    // teleport buttons
    const navTargets = { home: 0, projects: -10, about: -32 }
    for (const [id, y] of Object.entries(navTargets)) {
      document.querySelector(`#${id}`)?.addEventListener('click', (e) => {
        e.preventDefault()
        this.app.transition(() => {
          this.close()
          this.app.camera.teleport(y)
        }, y)
      })
    }
  }

  open(id) {
    // tell app that we are in page mode and store y
    this.app.inProject = true
    this.app.currScene = null
    this.storedY = this.app.getY()

    // teleport to page display
    this.app.camera.teleport(-100)
    this.active?.hide()
    this.active = this.pages[id]
    this.active?.show()
    this.renderOutline(this.active)
  }

  close() {
    this.active?.hide()
    this.active = null
    this.renderOutline(null)

    // tell app that we are back in scene mode and retrieve stored y
    this.app.inProject = false
    this.app.camera.teleport(this.storedY)
  }

  // called by Page once its markdown finishes loading — if that page is
  // already the one on screen (the fetch can resolve after open() ran),
  // refresh the sidebar so it doesn't sit empty
  onOutlineReady(page) {
    if (this.active === page) this.renderOutline(page)
  }

  // (re)builds the section-navigator sidebar for `page` (or clears/hides it
  // for null); lives outside #world-html so it stays put on screen — see
  // .page-nav — rather than scrolling away with the write-up
  renderOutline(page) {
    this.outlineEl.innerHTML = ''

    if (!page?.outline.length) {
      this.outlineEl.classList.remove('visible')
      return
    }
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
    const deltaY = (desiredScreenY - currentScreenY) / PIXELS_PER_UNIT
    this.app.camera.scrollToY(this.app.getY() + deltaY)
  }
}
