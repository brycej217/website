import * as THREE from 'three'

export class Scene {
  constructor() {
    this.objects = {}
    this.interactables = {}
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
  add(
    name,
    object,
    { position, animate, hover, dehover, click, interactable = true } = {},
  ) {
    // register all functions
    if (position) {
      object.position.copy(position)
    }
    if (animate) {
      object.onAnimate = animate
    }
    if (hover) {
      object.onHover = hover
    }
    if (dehover) {
      object.deHover = dehover
    }
    if (click) {
      object.onClick = click
    }
    if (interactable) {
      this.interactables[name] = object
    }

    this.objects[name] = object
    this.scene.add(object)
  }

  get(name) {
    return this.objects[name]
  }
}
