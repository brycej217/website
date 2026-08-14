// Maps the site's virtual-scroll world-Y positions (and project detail pages)
// to real URL paths using the History API, so the browser's own back/forward
// buttons — and direct/refreshed URLs, see public/404.html — work like a
// normal multi-page site, while the actual navigation is still just
// App.transition()'s wipe + a camera teleport (see CLAUDE.md).
//
// Route table:
//   /                -> home scene
//   /projects        -> project grid
//   /projects/:id    -> a project's detail page
//   /about           -> about scene
export class Router {
  constructor(app) {
    this.app = app
    app.router = this
    this.lastSyncedScene = null
    // guards syncFromScroll() until boot() has actually run — currScene is
    // already 'home' from the moment App.register('home', ...) runs, well
    // before boot() gets a chance to read the real initial URL (it's
    // deferred behind label sync, see main.js), and the render loop is
    // already ticking 'update' by then. Without this, the very first tick
    // would replaceState to '/' out from under a deep link like /about
    // before boot() ever sees the URL it was supposed to land on.
    this.ready = false

    // the entry already changed by the time this fires — just reflect it,
    // with the same wipe transition a nav-link/card click would use
    window.addEventListener('popstate', () => this.apply(location.pathname))

    // mirrors the URL to whichever scene the camera is actually inside as
    // the user free-scrolls between Home/Project/About with no click
    // involved — see syncFromScroll()
    app.on('update', () => this.syncFromScroll())
  }

  parse(path) {
    const [first, second] = path.split('/').filter(Boolean)
    if (first === 'projects' && second) return { scene: 'project', id: second }
    if (first === 'projects') return { scene: 'project', id: null }
    if (first === 'about') return { scene: 'about', id: null }
    return { scene: 'home', id: null }
  }

  // `scene` here is the internal key (matches app.scenes.project etc.) —
  // 'projects' below is purely the URL segment, kept distinct on purpose
  pathFor(scene, id = null) {
    if (scene === 'project') return id ? `/projects/${id}` : '/projects'
    if (scene === 'about') return '/about'
    return '/'
  }

  // called by nav links, project cards, and the in-page back button
  navigate(scene, id = null) {
    const path = this.pathFor(scene, id)
    if (location.pathname === path) return
    history.pushState({ scene, id }, '', path)
    this.go(scene, id)
  }

  // browser back/forward — history already moved, just replay it
  apply(path) {
    const { scene, id } = this.parse(path)
    this.go(scene, id)
  }

  // performs the actual scene/page switch — shared by navigate(), apply(),
  // and (with instant: true) boot(). Returns the route it actually landed
  // on, since an unknown project id falls back to the grid.
  go(scene, id, { instant = false } = {}) {
    const { home, project, about } = this.app.scenes
    const pages = this.app.pages

    if (scene === 'project' && id) {
      if (this.app.scenes.project.openProject(id, { instant })) {
        return { scene, id }
      }
      id = null // unknown/removed id — fall through to the grid below
    }

    // closing an open project page returns to exactly where it was opened
    // from (see PageManager.storedY) instead of the grid's generic anchor —
    // the in-app back button's long-standing behavior, now also true for
    // the browser's own back button and for plain nav-link/card clicks
    const returningFromPage = scene === 'project' && pages.active
    const targetY = returningFromPage
      ? pages.storedY
      : scene === 'about'
        ? about.position.y + 1
        : scene === 'project'
          ? project.position.y + 5
          : home.position.y

    const apply = () => {
      pages.close()
      this.app.camera.teleport(targetY)
    }

    if (instant) apply()
    else this.app.transition(apply, targetY)

    return { scene, id: null }
  }

  // called every 'update' tick — App.update() already only reassigns
  // app.currScene on an actual scene-boundary crossing (see its
  // active !== this.currScene check), so this fires at most once per
  // crossing, not once per frame. Always replaceState, never pushState —
  // free scrolling shouldn't flood browser history with an entry per scene
  // crossed the way an explicit nav-link/card click does. Skipped entirely
  // while a project detail page is open or mid-open/close (app.inProject):
  // that route belongs to navigate()/openProject(), not scroll position,
  // and currScene is null the whole time anyway (see PageManager.open()).
  syncFromScroll() {
    if (!this.ready || this.app.inProject) return
    const scene = this.app.currScene
    if (!scene || scene === this.lastSyncedScene) return
    this.lastSyncedScene = scene

    const key = ['home', 'project', 'about'].find(
      (k) => this.app.scenes[k] === scene,
    )
    if (!key) return

    const path = this.pathFor(key)
    if (location.pathname !== path) {
      history.replaceState({ scene: key, id: null }, '', path)
    }
  }

  // syncs the very first frame to whatever URL the site loaded/refreshed on
  // — a deep link (e.g. /project/vulkan-engine) lands directly on that
  // project with no wipe playing over content that was never on screen —
  // then normalizes the URL (e.g. an unknown project id) via replaceState
  boot() {
    const { scene, id } = this.parse(location.pathname)
    const landed = this.go(scene, id, { instant: true })
    history.replaceState(landed, '', this.pathFor(landed.scene, landed.id))
    this.lastSyncedScene = this.app.currScene
    this.ready = true
  }
}
