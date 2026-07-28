import * as THREE from 'three'

export class Scene {
  constructor() {
    this.objects = {}
    this.scene = new THREE.Scene()
  }

  // calls the animation functions of all objects in scene before rendering
  onUpdate(delta) {
    for (const object of Object.values(this.objects)) {
      object.onAnimate?.(object, delta)
    }
  }

  // updates all objects in scene then renders them
  onRender(renderer, camera, delta) {
    this.onUpdate(delta)
    renderer.render(this.scene, camera)
  }

  // registers object under a name alongside on functions
  add(name, object, { position, animate } = {}) {
    if (position) {
      object.position.copy(position)
    }

    if (animate) {
      object.onAnimate = animate
    }

    this.objects[name] = object
    this.scene.add(object)
  }

  find(name) {
    return this.objects[name]
  }
}
