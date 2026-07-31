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

    app.on('render', (renderer, camera) => this.render(renderer, camera))
  }

  // registers object under a name alongside on functions
  add(name, object, { position, interactable = true } = {}) {
    if (position) object.position.copy(position)

    this.objects[name] = object
    this.root.add(object)
    return object
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
