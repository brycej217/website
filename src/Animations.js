import * as THREE from 'three'

// factory that returns a function that can be stored on objects for rotation
function rotate(speed, axes = ['x', 'y', 'z']) {
  return (mesh, delta) => {
    for (const axis of axes) {
      mesh.rotation[axis] += speed * delta
    }
  }
}

// interpolates between colors a and b and sets shader uniform value of color to the result
function changeColor(speed = 2, a, b) {
  let elapsed = 0
  const offset = new THREE.Vector3()
  const vel = 0.005
  const bound = 2.0
  const count = 32

  const sim = Array.from({ length: count }, () => ({
    pos: new THREE.Vector3()
      .random()
      .subScalar(0.5)
      .multiplyScalar(2 * bound),
    velocity: new THREE.Vector3().random().subScalar(0.5).multiplyScalar(vel),
  }))

  return (mesh, delta) => {
    elapsed += delta
    const t = Math.sin(elapsed * speed) * 0.5 + 0.5

    const blobs = mesh.material.uniforms.blobs.value

    for (let i = 0; i < count; ++i) {
      const { pos, velocity } = sim[i]
      pos.add(velocity)

      if (pos.x > bound || pos.x < -bound) velocity.x = -velocity.x
      if (pos.y > bound || pos.y < -bound) velocity.y = -velocity.y
      if (pos.z > bound || pos.z < -bound) velocity.z = -velocity.z

      blobs[i].center.copy(pos)
    }

    mesh.material.uniforms.count.value = count
    mesh.material.uniforms.color.value.copy(a).lerp(b, t)
  }
}

export { rotate, changeColor }
