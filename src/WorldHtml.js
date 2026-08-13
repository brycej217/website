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
  // to a registered scene (data-scene) reads that scene's own anchorY when
  // it has one — ProjectScene/AboutScene compute this as "right below my 3D
  // label's actual rendered bottom edge" (see their anchorY getters), which
  // is what actually keeps the DOM content from drifting away from its
  // label at a resolution other than whatever this was last tuned against.
  // Falls back to the scene's plain position.y for scenes with no such
  // label-based anchor (or before one has finished its async layout) — and
  // the one section with no scene of its own at all (the project-page
  // holding area) still uses a literal data-y.
  anchorSections() {
    const pxPerUnit = this.app.camera.pixelsPerUnit()
    this.sections.forEach((el) => {
      let worldY
      if (el.dataset.scene) {
        const scene = this.app.scenes[el.dataset.scene]
        worldY = scene.anchorY ?? scene.position.y
      } else {
        worldY = parseFloat(el.dataset.y)
      }
      el.style.top = `${-worldY * pxPerUnit}px`
    })
  }

  // publishes the current pixels-per-unit, relative to the resolution this
  // site's rem/px-sized DOM panels were designed against, as a CSS variable
  // — see REFERENCE_PIXELS_PER_UNIT above. .project-inner/.about-inner cap
  // their max-width by it (`calc(<base> * var(--world-scale))`) so their
  // *layout footprint* shrinks/grows in lockstep with the 3D scene instead
  // of staying a fixed pixel size regardless of viewport — deliberately not
  // a `transform: scale()` on the whole panel, which used to scale its text
  // too, double-shrinking it on top of that text's own width-based clamp()
  // sizing in style.css. Text now sizes purely off those clamp() rules,
  // untouched by this.
  //
  // Capped at 1 — pixelsPerUnit() depends only on viewport *height* (see
  // Camera.pixelsPerUnit()), so a tall-but-narrow window (a maximized
  // portrait monitor, a half-width split-screen on a tall display, ...)
  // computes a scale well above 1, which would push max-width past panels'
  // own base size (.project-inner's 1500px, e.g.) and out past the actual
  // viewport width. Floored at 0.7 so a short viewport doesn't squeeze a
  // panel's *layout* — independent of text now, but .about-photo/etc still
  // need some minimum room to lay out sanely — down toward nothing.
  updateWorldScale() {
    const scale = Math.max(
      0.7,
      Math.min(1, this.app.camera.pixelsPerUnit() / REFERENCE_PIXELS_PER_UNIT),
    )
    document.documentElement.style.setProperty('--world-scale', scale)
  }

  update() {
    const y = this.app.getY()
    const offset = y * this.app.camera.pixelsPerUnit()
    this.el.style.transform = `translateY(${offset}px)`
  }
}
