import * as THREE from 'three'
import gsap from 'gsap'

function scaleHover(object, factor = 1.5) {
  if (!object.userData.baseScale) {
    object.userData.baseScale = object.scale.clone()
  }
  const base = object.userData.baseScale
  gsap.to(object.scale, {
    x: base.x * factor,
    y: base.y * factor,
    z: base.z * factor,
    duration: 0.4,
    ease: 'power2.out',
    overwrite: 'auto',
  })
}

function scaleDehover(object) {
  const base = object.userData.baseScale
  if (!base) return
  gsap.to(object.scale, {
    x: base.x,
    y: base.y,
    z: base.z,
    duration: 0.4,
    ease: 'power2.out',
    overwrite: 'auto',
  })
}

export { scaleHover, scaleDehover }
