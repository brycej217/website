export class WorldHtml {
  constructor(app) {
    this.app = app
    this.el = document.querySelector('#world-html')
    this.sections = document.querySelectorAll('.world-section')

    this.anchorSections()
    app.on('update', () => this.update())
    app.on('resize', () => this.anchorSections())
  }

  // positions each .world-section at its world-Y, converted through the
  // camera's current pixels-per-unit — re-run on resize since that ratio
  // depends on viewport height (see Camera.pixelsPerUnit())
  anchorSections() {
    const pxPerUnit = this.app.camera.pixelsPerUnit()
    this.sections.forEach((el) => {
      const worldY = parseFloat(el.dataset.y)
      el.style.top = `${-worldY * pxPerUnit}px`
    })
  }

  update() {
    const y = this.app.getY()
    const offset = y * this.app.camera.pixelsPerUnit()
    this.el.style.transform = `translateY(${offset}px)`
  }
}
