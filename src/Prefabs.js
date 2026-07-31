import * as THREE from 'three'
import { Text } from 'troika-three-text'

function plane(size = 10, { color = 'white' } = {}) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ color }),
  )
}

function cube(size = 1, { color = 'white' } = {}) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({ color }),
  )
}

function circle(size = 1, { color = 'white', material } = {}) {
  return new THREE.Mesh(
    new THREE.CircleGeometry(size),
    material ?? new THREE.MeshBasicMaterial({ color: color ?? 'white' }),
  )
}

function text(text, { fontSize = 0.5, color = 0xffffff, font } = {}) {
  const label = new Text()
  label.text = text
  label.fontSize = fontSize
  label.color = color
  label.anchorX = 'center'
  if (font) label.font = font
  label.sync() // required after setting properties
  return label
}

export { cube, text, plane, circle }
