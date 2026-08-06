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

    this.backBtn = document.querySelector('#back')
    this.backBtn.addEventListener('click', () =>
      this.app.transition(() => this.close(), this.storedY),
    )

    // teleport buttons
    const navTargets = { home: 0, projects: -11, about: -25 }
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
    this.backBtn.classList.add('visible')
    this.app.navEl.classList.add('hidden')
  }

  close() {
    this.active?.hide()
    this.active = null
    this.backBtn.classList.remove('visible')
    this.app.navEl.classList.remove('hidden')

    // tell app that we are back in scene mode and retrieve stored y
    this.app.inProject = false
    this.app.camera.teleport(this.storedY)
  }
}
