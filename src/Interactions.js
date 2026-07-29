import * as THREE from 'three'
import gsap from 'gsap'

// sets base property values to return to on object's user data
function captureBase(mesh) {
  if (!mesh.userData.base) {
    mesh.userData.base = {
      scale: mesh.scale.clone(),
      color: mesh.material.color.clone(),
    }
  }
}

function glowScale(color, scale = 1.5, duration = 0.5, ease = 'power1.out') {
  const tl = gsap.timeline()
  return (mesh) => {
    // store properties
    captureBase(mesh)

    // kill in flight timelines
    mesh.userData.tl?.kill()
    const tl = gsap.timeline()
    mesh.userData.tl = tl

    tl.to(mesh.scale, {
      x: mesh.scale.x * scale,
      y: mesh.scale.y * scale,
      z: mesh.scale.z * scale,
      duration,
      ease,
    })
    tl.to(
      mesh.material.color,
      {
        r: color.r,
        g: color.g,
        b: color.b,
        duration: 0.5,
        ease,
      },
      '<',
    )
  }
}

function deGlowScale(duration = 0.5, ease = 'power1.in') {
  const tl = gsap.timeline()
  return (mesh) => {
    const base = mesh.userData.base // retrieve base data

    // kill in flight timelines
    mesh.userData.tl?.kill()
    const tl = gsap.timeline()
    mesh.userData.tl = tl

    tl.to(mesh.scale, {
      x: base.scale.x,
      y: base.scale.y,
      z: base.scale.z,
      duration,
      ease,
    })
    tl.to(
      mesh.material.color,
      {
        r: base.color.r,
        g: base.color.g,
        b: base.color.b,
        duration: 0.5,
        ease,
      },
      '<',
    )
  }
}

export { glowScale, deGlowScale }
