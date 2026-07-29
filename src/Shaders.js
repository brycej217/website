const _VS = `
void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const _FS = `
#define MAX_BLOBS 32

struct Blob {
    vec2  center;
    float radius;
};

uniform Blob blobs[MAX_BLOBS];
uniform int count;
uniform vec3 color;
uniform vec2 resolution;
uniform vec2 mouse;

void main()
{
    vec2 uv = gl_FragCoord.xy / resolution; // [0 -> 1], center at (0.5, 0.5)
    uv = uv * 2.0 - 1.0; // remap to [-1 -> 1], center at (0, 0)
    
    float field = 0.0;
    for (int i = 0; i < count; i++)
    {
        Blob b = blobs[i];
        float d = length(uv - b.center) + 1e-6; // get distance to current blob
        field += b.radius / d;
    }
    float md = length(uv - mouse) + 1e-6;
    float mr = 0.01;
    field += mr / md;

    vec3 a = vec3(1.0, 0.0, 0.0);
    vec3 b = vec3(0.0, 0.0, 1.0);
    vec3 c = mix(a, b, field);

    gl_FragColor = vec4(c, 1.0);
}
`

export { _VS, _FS }
