import * as THREE from 'three'
import { Text } from 'troika-three-text'

const loader = new THREE.TextureLoader()

function projectCard(
  imageUrl,
  label,
  { width = 2, height = 1.4, font, fontSize = 0.25 } = {},
) {
  const group = new THREE.Group()

  // image plane
  const geo = new THREE.PlaneGeometry(width, height)
  const mat = new THREE.MeshBasicMaterial({ color: 'white' })
  const mesh = new THREE.Mesh(geo, mat)
  group.add(mesh)

  // load texture async
  loader.load(
    imageUrl,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace // correct color for photos
      mat.map = tex
      mat.needsUpdate = true
    },
    undefined,
    () => {
      // load error
    },
  )

  // text label
  const text = new Text()
  text.text = label
  text.fontSize = fontSize
  text.color = 0xffffff
  text.anchorX = 'center'
  text.anchorY = 'top'
  text.position.set(0, -height / 2 - 0.1, 0.01) // just below the plane, slightly forward
  if (font) text.font = font
  text.sync()
  group.add(text)

  // transparent hit plane covering the full card
  const hitH = height + 0.1 + fontSize
  const hitPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width, hitH),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  )
  hitPlane.position.set(0, -(0.1 + fontSize) / 2, 0.02)
  group.add(hitPlane)

  return group
}

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

export { cube, text, plane, circle, projectCard }
