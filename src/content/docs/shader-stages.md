---
title: Shader stages
description: What the vertex, geometry, fragment and compute stages do inside one program, what each runs once per, and how data passes between them.
section: developing
order: 4
updated: 2026-11-08
loaders: [iris, optifine]
---

A program is built from up to four kinds of shader, called stages, each in its own file. This page
is for readers who have built [their first shaderpack](/docs/first-shaderpack) and want to know what
each file is for. Afterwards you will know which stage a piece of code belongs in, how to pass
values from one stage to the next, and which files you can leave out.

## Stages at a glance

| Stage    | File   | Runs once per                        | Required                                 |
| -------- | ------ | ------------------------------------ | ---------------------------------------- |
| Vertex   | `.vsh` | Vertex                               | Yes, unless an Iris pass is compute-only |
| Geometry | `.gsh` | Primitive: a triangle, line or point | No                                       |
| Fragment | `.fsh` | Fragment, roughly one covered pixel  | Yes, unless an Iris pass is compute-only |
| Compute  | `.csh` | Invocation, in work groups you size  | No; not allowed in geometry programs     |

Each file is named after its program, such as `gbuffers_terrain.vsh`. The drawing stages run in a
fixed chain: vertex, then geometry if present, then fragment. Compute shaders run before that chain.

## Vertex stage

The vertex shader runs once for every corner of every primitive. Its one required job is to write
`gl_Position`, the position in clip space. Anything later stages need, it passes on as an output.

In a geometry program the inputs are Minecraft's per-vertex data, called attributes. With
`#version 330 compatibility` the standard ones keep their built-in names, and the loader adds some:

| Attribute           | Type   | Contents                                                    |
| ------------------- | ------ | ----------------------------------------------------------- |
| `gl_Vertex`         | `vec4` | Position in model space                                     |
| `gl_Color`          | `vec4` | Vertex colour, including biome tint                         |
| `gl_MultiTexCoord0` | `vec4` | Texture coordinate in the atlas                             |
| `gl_MultiTexCoord1` | `vec4` | Lightmap coordinate                                         |
| `gl_Normal`         | `vec3` | Surface normal in model space                               |
| `mc_Entity`         | `vec3` | Block ID from `block.properties` in `x`                     |
| `mc_midTexCoord`    | `vec2` | Centre of the sprite's texture coordinates                  |
| `at_tangent`        | `vec4` | Tangent in `xyz`, handedness in `w`                         |
| `at_midBlock`       | `vec3` | Offset to the block centre in 1/64 block units, blocks only |

Declare a loader attribute with `in` to use it; OptiFine only supplies `mc_Entity`,
`mc_midTexCoord` and `at_tangent` to programs that declare them. In a fullscreen program the vertex
shader only places the corners of one rectangle.

```glsl title="shaders/gbuffers_terrain.vsh"
#version 330 compatibility

out vec2 texcoord;
out vec2 lmcoord;
out vec4 glcolor;
out vec3 normal;

void main() {
    gl_Position = ftransform();
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    lmcoord = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    glcolor = gl_Color;
    normal = normalize(gl_NormalMatrix * gl_Normal); // view space
}
```

## Passing data between stages

An `out` variable in one stage connects to the `in` variable with the same name and type in the
next. These are often called varyings. Between the vertex and fragment stages the GPU interpolates
them, so a pixel in the middle of a face receives a blend of its corners' values.

- Add `flat` to both declarations to switch interpolation off. The fragment then receives the value
  from a single vertex. Integer varyings must be `flat`.
- Normalise interpolated directions again in the fragment shader, because blending unit vectors
  makes them shorter.
- A name or type that does not match is a link error, and the program fails to load.

## Fragment stage

The fragment shader runs once for each pixel a primitive covers. It receives the interpolated
varyings and built-ins such as `gl_FragCoord`, the pixel position and depth. Output location 0 goes
to the first buffer in the `RENDERTARGETS` list, location 1 to the second, and so on.

```glsl title="shaders/gbuffers_terrain.fsh" {11-13}
#version 330 compatibility

uniform sampler2D gtexture;
uniform sampler2D lightmap;

in vec2 texcoord;
in vec2 lmcoord;
in vec4 glcolor;
in vec3 normal;

/* RENDERTARGETS: 0,2 */
layout(location = 0) out vec4 color;
layout(location = 1) out vec4 normalData;

void main() {
    color = texture(gtexture, texcoord) * glcolor;
    if (color.a < 0.1) discard;
    color *= texture(lightmap, lmcoord);
    normalData = vec4(normalize(normal) * 0.5 + 0.5, 1.0);
}
```

Here location 1 writes to `colortex2`. `discard` throws the fragment away, which is how cutout
textures such as leaves get their holes. Write every listed output on every path that does not
discard, because a skipped output receives undefined data, and keep the alpha of data buffers at
`1.0` so blending leaves your values intact. If you write `gl_FragDepth`, write it on every path.

## Geometry stage

The optional geometry shader runs once per primitive, after the vertex stage. It sees every vertex
of the primitive at once, so its inputs are arrays, and it can emit any number of primitives,
including none. Use it when one vertex is not enough, such as computing a face normal from three
corners. Because it sits between the other two stages, the vertex outputs need new names: here the
vertex shader writes `vTexcoord` and `vColor`, and the fragment shader reads `texcoord` and
`glcolor`.

```glsl title="shaders/gbuffers_terrain.gsh"
#version 330 compatibility

layout(triangles) in;
layout(triangle_strip, max_vertices = 3) out;

in vec2 vTexcoord[];
in vec4 vColor[];

out vec2 texcoord;
out vec4 glcolor;

void main() {
    for (int i = 0; i < 3; i++) {
        gl_Position = gl_in[i].gl_Position;
        texcoord = vTexcoord[i];
        glcolor = vColor[i];
        EmitVertex();
    }
    EndPrimitive();
}
```

Iris also supports tessellation shaders (`.tcs` and `.tes`) in geometry programs, for triangles
only, once the pack enables the `TESSELLATION_SHADERS` feature flag.

## Compute stage

A compute shader draws nothing. It runs a grid of invocations that read textures and write images.
Any fullscreen program can have them, named `composite.csh` and then `composite_a.csh` to
`composite_z.csh`; they run before that program's vertex stage. Iris adds a compute-only `setup`
pass that runs when the pack loads and when the window is resized.

Compute shaders need `#version 430` and a local size. `workGroupsRender` scales the number of work
groups to the screen; `vec2(1.0, 1.0)` covers every pixel, rounded up to whole groups, so check the
bounds:

```glsl title="shaders/composite.csh"
#version 430

layout(local_size_x = 16, local_size_y = 16) in;
const vec2 workGroupsRender = vec2(1.0, 1.0);

layout(rgba8) uniform image2D colorimg2;

void main() {
    ivec2 pixel = ivec2(gl_GlobalInvocationID.xy);
    ivec2 size = imageSize(colorimg2);
    if (pixel.x >= size.x || pixel.y >= size.y) return;

    vec2 uv = (vec2(pixel) + 0.5) / vec2(size);
    imageStore(colorimg2, pixel, vec4(uv, 0.0, 1.0));
}
```

`colorimgN` is the image view of `colortexN`, and the only way a compute shader can write a render
target. OptiFine offers `colorimg0` to `colorimg5`, plus `shadowcolorimg0` and `shadowcolorimg1`.
The `rgba8` qualifier must match the buffer's format; the default, RGBA, is RGBA8 on most systems.

## What you can leave out

| Program kind                               | Needs          | Optional                     |
| ------------------------------------------ | -------------- | ---------------------------- |
| Geometry programs (`gbuffers_*`, `shadow`) | `.vsh`, `.fsh` | `.gsh`; tessellation in Iris |
| Fullscreen programs                        | `.vsh`, `.fsh` | `.gsh`, `.csh`               |

A missing program is not an error: geometry programs fall back to a related one, and fullscreen
programs are skipped. The [programs reference](/docs/programs#fallbacks) lists the chains. Next,
learn how positions move between [coordinate spaces](/docs/coordinate-spaces).
