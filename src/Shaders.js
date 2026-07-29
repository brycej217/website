const _VS = `
void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const meta = `
void main()
{
    vec3 a = vec3(0.1, 0.1, 1.0);
    vec3 col_in = vec3(0.8, 0.8, 0.8); // color within blobs

    vec2 uv = gl_FragCoord.xy / resolution; // [0 -> 1], center at (0.5, 0.5)
    uv = uv * 2.0 - 1.0; // remap to [-1 -> 1], center at (0, 0)
    
    float blobField = 0.0;
    for (int i = 0; i < count; i++)
    {
        Blob b = blobs[i];
        float d = length(uv - b.center) + 1e-6;
        blobField += b.radius / d;
    }
    float md = length(uv - mouse) + 1e-6;
    float mc = 0.01 / md;

    float field = blobField + mc;

    float inside  = step(1.0, field); 
    float hasBlob = step(0.5, blobField); // checks if blobs reach position (not just mouse)

    float f = inside * hasBlob;   

    col_in = (f > 0.5) ? col_in : a;
    gl_FragColor = vec4(col_in, 1.0);
}`

const _FS = `
#define MAX_BLOBS 32

struct Blob {
    vec3  center;
    float radius;
};

uniform Blob blobs[MAX_BLOBS];
uniform int count;
uniform vec3 color;
uniform vec2 resolution;
uniform vec2 mouse;
uniform float time;

float sphere(vec3 p, vec3 c, float r)
{
    return length(p - c) - r;
}

float smin(float a, float b, float k)
{
    float h = max(k-abs(a-b), 0.0) / k;
    return min(a,b) - h*h*h*k*(1.0/6.0);
}

// distance of point p to scene
float map(vec3 p)
{
    float currMin = sphere(p, blobs[0].center, blobs[0].radius);
    for (int i = 0; i < count; ++i)
    {
        Blob b = blobs[i];
        float s = sphere(p, b.center, b.radius);
        currMin = smin(currMin, s, 1.0);
    }

    return currMin;
}

vec3 calculateNormal(vec3 p)
{
const float epsilon = 0.001;

vec3 v1 = vec3(
    map(p + vec3(epsilon, 0.0, 0.0)),
    map(p + vec3(0.0, epsilon, 0.0)),
    map(p + vec3(0.0, 0.0, epsilon)));
vec3 v2 = vec3(
    map(p - vec3(epsilon, 0.0, 0.0)),
    map(p - vec3(0.0, epsilon, 0.0)),
    map(p - vec3(0.0, 0.0, epsilon)));

return normalize(v1 - v2);
}

void main()
{
    vec3 a = vec3(0.97, 0.24, 0.05);
    vec3 b = vec3(0.0, 0.0, 0.0); // color within blobs

    vec2 uv = gl_FragCoord.xy / resolution; // [0 -> 1], center at (0.5, 0.5)
    uv = uv * 2.0 - 1.0; // remap to [-1 -> 1], center at (0, 0)

    // initialization
    vec3 ro = vec3(0, 0, -3); // ray origin
    vec3 rd = normalize(vec3(uv + vec2(mouse.x, mouse.y), 1)); // ray direction

    float t = 0.0;
    float d = 0.0;
    vec3 p = ro; // initial point to be iterated

    // raymarching
    for (int i = 0; i < 80; ++i)
    {
        p = ro + rd * t; // position along ray (based on distance traveled)
        d = map(p); // current distance to the scene
        t += d; // march (we can travel safely d along the ray confirmed)

        // early exits
        if (d < 0.001 || t > 100.0) break;
    }

    // if surface was hit perform lighting calculations
    if (d < 0.001) 
    {
        vec3 lightDir = vec3(cos(time), sin(time) * 3.0, cos(time));
        vec3 lightCol = vec3(1.0);
        float k = 0.015;

        vec3 n = calculateNormal(p);
        vec3 l = normalize(lightDir - p);
        vec3 v = normalize(ro - p);
        vec3 r = reflect(-l, n);

        float diff = max(dot(n, l), 0.0);
        float diffuseStrength = 0.08;
        vec3 base = b + diff * diffuseStrength * lightCol;

        float spec = pow(max(dot(v, r), 0.0), 32.0) * k;
        float f = step(0.01, spec);

        vec3 col = mix(base, vec3(1.0), f); // if f is past will return pure white
        gl_FragColor = vec4(col, 1.0);
    }
    else
    {
        gl_FragColor = vec4(a, 1.0);
    }
}
`

export { _VS, _FS }
