import * as THREE from 'three'

// factory that returns a function that can be stored on objects for rotation
function rotate(speed, axes = ['x', 'y', 'z']) {
  return (mesh, delta) => {
    for (const axis of axes) {
      mesh.rotation[axis] += speed * delta
    }
  }
}

export { rotate }
