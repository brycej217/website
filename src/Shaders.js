const _VS = `

varying vec3 vNormal;

void main()
{
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const _FS = `

uniform vec3 color;
varying vec3 vNormal;

void main()
{
    gl_FragColor = vec4(color, 1.0);
}
`

export { _VS, _FS }
