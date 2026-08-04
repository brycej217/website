import * as THREE from 'three'

export class Scene {
  constructor(app, { position = new THREE.Vector3(), bounds } = {}) {
    this.app = app
    this.objects = {}
    this.interactables = {}
    this.scene = new THREE.Scene()

    // scene root
    this.position = position
    this.root = new THREE.Group()
    this.root.position.copy(position)
    this.scene.add(this.root)

    // bounds
    this.bounds = bounds

    // opacity — drives a fade over every visible object under root (see `opacity` setter)
    this._opacity = 1

    app.on('render', (renderer, camera) => this.render(renderer, camera))
  }

  // registers object under a name alongside on functions
  add(name, object, { position, interactable = true } = {}) {
    if (position) object.position.copy(position)

    this.objects[name] = object
    this.root.add(object)
    this.app.interactables.push(object)
    return object
  }

  // fades every visible object under root; used by App.transition() to cross-fade
  // scenes alongside the html overlay. Skips objects flagged noFade (e.g. invisible
  // hit-planes, which must stay at opacity 0 regardless of the scene fade).
  set opacity(value) {
    this._opacity = value
    this.root.traverse((obj) => {
      if (obj.userData.noFade) return

      if ('fillOpacity' in obj) {
        obj.fillOpacity = value // troika-three-text
      } else if (obj.material) {
        obj.material.transparent = true
        obj.material.opacity = value
      }
    })
  }

  get opacity() {
    return this._opacity
  }

  // updates all objects in scene then renders them
  render(renderer, camera) {
    renderer.render(this.scene, camera)
  }

  onEnter() {}

  onExit() {}

  get(name) {
    return this.objects[name]
  }
}
