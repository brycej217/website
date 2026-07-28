import * as THREE from 'three'

// factory that returns a function that can be stored on objects for rotation
export function rotate(speed, axes = ['x', 'y', 'z']) {
  return (mesh, delta) => {
    for (const axis of axes) {
      mesh.rotation[axis] += speed * delta
    }
  }
}

// interpolates between colors a and b and sets shader uniform value of color to the result
export function changeColor(speed = 2, a, b) {
  let elapsed = 0
  return (mesh, delta) => {
    elapsed += delta
    const t = Math.sin(elapsed * speed) * 0.5 + 0.5
    mesh.material.uniforms.color.value.copy(a).lerp(b, t)
  }
}
