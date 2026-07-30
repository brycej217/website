import * as THREE from 'three'

export class Scene {
  constructor({ position = new THREE.Vector3() } = {}) {
    this.objects = {}
    this.interactables = {}
    this.scene = new THREE.Scene()

    // scene root
    this.root = new THREE.Group()
    this.root.position.copy(position)
    this.scene.add(this.root)
  }

  // registers object under a name alongside on functions
  add(name, object, { position, interactable = true, ...handlers } = {}) {
    if (position) object.position.copy(position)

    // register all functions optionally provided
    Object.assign(object, handlers) // onAnimate, onHover, ...
    if (interactable) this.interactables[name] = object

    this.objects[name] = object
    this.root.add(object)
    return object
  }

  // calls the animation functions of all objects in scene before rendering
  onUpdate(delta) {
    for (const object of Object.values(this.objects)) {
      object.onAnimate?.(object, delta)
    }
  }

  // updates all objects in scene then renders them
  onRender(renderer, camera, delta) {
    renderer.render(this.scene, camera)
  }

  get(name) {
    return this.objects[name]
  }
}
