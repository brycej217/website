// world units <-> screen pixels for #world-html — also used by App.js to size
// the inProject scroll bounds against a page's actual rendered height
export const PIXELS_PER_UNIT = 100

export class WorldHtml {
  constructor(app) {
    document.querySelectorAll('.world-section').forEach((el) => {
      const worldY = parseFloat(el.dataset.y)
      el.style.top = `${-worldY * PIXELS_PER_UNIT}px`
    })

    this.app = app
    this.el = document.querySelector('#world-html')
    app.on('update', () => this.update())
  }

  update() {
    const y = this.app.getY()
    const offset = y * PIXELS_PER_UNIT
    this.el.style.transform = `translateY(${offset}px)`
  }
}
