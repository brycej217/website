import * as THREE from 'three'
import { Text } from 'troika-three-text'
import { _VS, _FS } from './Shaders'

function shaderPlane(size = 50) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Vector3(0, 0, 0) } },
      vertexShader: _VS,
      fragmentShader: _FS,
    }),
  )
}

function cube(size = 1, { color = 'white' } = {}) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial({ color }),
  )
}

function text(text, { fontSize = 0.5, color = 0xffffff } = {}) {
  const label = new Text()
  label.text = text
  label.fontSize = fontSize
  label.color = color
  label.anchorX = 'center'
  label.sync() // required after setting properties
  return label
}

export { shaderPlane, cube, text }
