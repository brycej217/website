// pixels-per-unit this site's DOM panels (.project-inner, .about-inner —
// see updateWorldScale()) were designed against: fonts/padding/gaps on
// those are plain rem/px, so they're the same physical pixel size on any
// monitor. The 3D scene isn't — its content's on-screen size scales with
// Camera.pixelsPerUnit(), which shrinks on a smaller/shorter viewport. On a
// big screen that just means extra breathing room; on a small one the DOM
// panel's fixed pixel size stops shrinking with everything else and can
// grow (relatively) large enough to run into 3D content next to it — e.g.
// the project grid crowding into the "PROJECTS" heading above it. Scaling
// those panels by the same ratio the 3D scene itself is scaled by keeps
// their size relative to it constant at any resolution instead.
const REFERENCE_PIXELS_PER_UNIT = 100

export class WorldHtml {
  constructor(app) {
    this.app = app
    this.el = document.querySelector('#world-html')
    this.sections = document.querySelectorAll('.world-section')

    this.anchorSections()
    this.updateWorldScale()
    app.on('update', () => this.update())
    app.on('resize', () => {
      this.anchorSections()
      this.updateWorldScale()
    })
  }

  // positions each .world-section at its world-Y, converted through the
  // camera's current pixels-per-unit — re-run on resize since that ratio
  // depends on viewport height (see Camera.pixelsPerUnit()). A section tied
  // to a registered scene (data-scene) reads that scene's actual position
  // straight off app.scenes — the single place main.js defines it — rather
  // than carrying its own hardcoded copy of the number, which is what let
  // the two drift out of sync in the first place. The one section with no
  // scene of its own (the project-page holding area) still uses a literal
  // data-y.
  anchorSections() {
    const pxPerUnit = this.app.camera.pixelsPerUnit()
    this.sections.forEach((el) => {
      const worldY = el.dataset.scene
        ? this.app.scenes[el.dataset.scene].position.y
        : parseFloat(el.dataset.y)
      el.style.top = `${-worldY * pxPerUnit}px`
    })
  }

  // publishes the current pixels-per-unit, relative to the resolution this
  // site's rem/px-sized DOM panels were designed against, as a CSS variable
  // — see REFERENCE_PIXELS_PER_UNIT above. .project-inner/.about-inner
  // scale themselves by it so they shrink/grow in lockstep with the 3D
  // scene instead of staying a fixed pixel size regardless of viewport.
  updateWorldScale() {
    const scale = this.app.camera.pixelsPerUnit() / REFERENCE_PIXELS_PER_UNIT
    document.documentElement.style.setProperty('--world-scale', scale)
  }

  update() {
    const y = this.app.getY()
    const offset = y * this.app.camera.pixelsPerUnit()
    this.el.style.transform = `translateY(${offset}px)`
  }
}
