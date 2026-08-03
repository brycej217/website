export class WorldHtml {
  constructor(app) {
    this.PIXELS_PER_UNIT = 100

    document.querySelectorAll('.world-section').forEach((el) => {
      const worldY = parseFloat(el.dataset.y)
      el.style.top = `${-worldY * this.PIXELS_PER_UNIT}px`
    })

    this.app = app
    this.el = document.querySelector('#world-html')
    app.on('update', () => this.update())
  }

  update() {
    const y = this.app.getY()
    const offset = y * this.PIXELS_PER_UNIT
    this.el.style.transform = `translateY(${offset}px)`
  }
}
