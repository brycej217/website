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

    const back = document.querySelector('#back')
    back.addEventListener('click', () => this.close())

    // teleport buttons
    const navTargets = { home: 0, projects: -10, about: -30 }
    for (const [id, y] of Object.entries(navTargets)) {
      document.querySelector(`#${id}`)?.addEventListener('click', (e) => {
        e.preventDefault()
        this.close()
        this.app.camera.teleport(y)
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
  }

  close() {
    this.active?.hide()
    this.active = null

    // tell app that we are back in scene mode and retrieve stored y
    this.app.inProject = false
    this.app.camera.teleport(this.storedY)
  }
}
