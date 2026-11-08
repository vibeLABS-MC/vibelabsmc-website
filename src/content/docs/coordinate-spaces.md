---
title: Coordinate spaces
description: The spaces a position passes through in an Iris or OptiFine pack, the matrices that convert between them, and how to rebuild a position from depth.
section: developing
order: 5
updated: 2026-11-08
loaders: [iris, optifine]
---

Almost every effect needs a position in the right space. Lighting works in view or player space,
waving plants and noise want world space, and shadows need shadow space. This page is for readers
who know what the [shader stages](/docs/shader-stages) do and now want to move positions around with
confidence. Afterwards you will know what each space means, which uniform converts between them, and
how to rebuild a pixel's position from the depth buffer in a fullscreen pass.

## The spaces

| Space      | What it is                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| Model      | The raw position in `gl_Vertex`. Its origin depends on what is drawn and on the loader, so convert it before you use it. |
| View (eye) | Relative to the camera and turned with it. X points right, Y points up, and the camera looks down negative Z.            |
| Player     | Relative to the camera, but with axes that stay lined up with the world: +Y is always up.                                |
| World      | Player space plus `cameraPosition`, close to Minecraft's block coordinates.                                              |
| Clip       | What a vertex shader writes to `gl_Position`, before the perspective divide.                                             |
| NDC        | Normalised device coordinates: clip space divided by `w`. Every axis runs from -1 to 1.                                  |
| Screen     | NDC remapped to 0 to 1. It matches `texcoord` in a fullscreen pass and the values stored in `depthtex0`.                 |

Multiply screen-space `xy` by `vec2(viewWidth, viewHeight)` to get pixel coordinates, the same
values `gl_FragCoord.xy` holds in a fragment shader.

> [!NOTE] Feet and eye player space
> The Iris documentation splits player space in two. `gbufferModelViewInverse` gives feet player
> space, which ignores view bobbing. Eye player space follows the bobbing camera. Subtract
> `gbufferModelViewInverse[3].xyz` from a feet position to get the eye position, and add it to go
> back. World space is built from feet player space.

## Matrices

| From        | To          | How                                                                      |
| ----------- | ----------- | ------------------------------------------------------------------------ |
| Model       | View        | `gl_ModelViewMatrix`, in geometry programs only                          |
| View        | Clip        | `gl_ProjectionMatrix` in geometry programs, `gbufferProjection` anywhere |
| Clip        | NDC         | Divide `xyz` by `w`                                                      |
| NDC         | Screen      | `* 0.5 + 0.5`                                                            |
| Screen      | NDC         | `* 2.0 - 1.0`                                                            |
| NDC         | View        | `gbufferProjectionInverse`, then divide by `w`                           |
| View        | Player      | `gbufferModelViewInverse`                                                |
| Player      | View        | `gbufferModelView`                                                       |
| Player      | World       | Add `cameraPosition`                                                     |
| Player      | Shadow view | `shadowModelView`                                                        |
| Shadow view | Shadow clip | `shadowProjection`                                                       |

`shadowModelViewInverse` and `shadowProjectionInverse` go the other way. Inside the `shadow`
program itself, `gl_ModelViewMatrix` and `gl_ProjectionMatrix` already belong to the shadow camera.

To move a direction such as a normal or light vector, use only the rotation part of the matrix:
`mat3(gbufferModelViewInverse) * viewNormal` turns a view-space normal into a player-space one
without adding the camera offset.

## Reconstructing a position from depth

A fullscreen pass has no vertex positions for the scene, only a texture coordinate. The depth
buffer supplies the missing third number. Together they give a screen-space position, and the
matrices above walk it back to view, player and world space. This `composite` program uses the
result to add distance fog:

```glsl title="shaders/composite.fsh" {20-24}
#version 330 compatibility

uniform sampler2D colortex0;
uniform sampler2D depthtex0;
uniform mat4 gbufferProjectionInverse;
uniform mat4 gbufferModelViewInverse;
uniform vec3 cameraPosition;
uniform float far;

in vec2 texcoord;

/* RENDERTARGETS: 0 */
layout(location = 0) out vec4 color;

void main() {
    color = texture(colortex0, texcoord);
    float depth = texture(depthtex0, texcoord).r;
    if (depth == 1.0) return; // cleared depth: no geometry here

    vec3 ndcPos = vec3(texcoord, depth) * 2.0 - 1.0;
    vec4 viewPos = gbufferProjectionInverse * vec4(ndcPos, 1.0);
    viewPos.xyz /= viewPos.w;
    vec3 playerPos = (gbufferModelViewInverse * vec4(viewPos.xyz, 1.0)).xyz;
    vec3 worldPos = playerPos + cameraPosition; // for noise or height effects

    float fog = clamp(length(playerPos) / far, 0.0, 1.0);
    color.rgb = mix(color.rgb, vec3(0.7, 0.8, 0.9), fog * fog);
}
```

Step by step:

1. Depth textures store screen-space depth from 0 to 1, and are cleared to 1.0 each frame. Pixels
   that still hold 1.0 had nothing drawn into them, so the code leaves them alone.
2. `* 2.0 - 1.0` turns the screen-space position into NDC.
3. The inverse projection turns NDC into view space. It leaves a `w` other than 1, so divide by it.
4. The inverse model-view matrix gives feet player space. `length(playerPos)` is the distance from
   the camera, in blocks.
5. Adding `cameraPosition` gives world space.

`far` holds the render distance in blocks, so the fog reaches full strength at the edge of the
loaded world.

> [!WARNING] World space drifts in Iris
> Iris resets `cameraPosition` every 30000 blocks, or every 1000 blocks when you teleport, so world
> space does not always equal your in-game coordinates. For exact positions, Iris offers
> `cameraPositionInt` and `cameraPositionFract`.

## Shadow space

Shadow maps are drawn from the sun or moon. To look a pixel up in one, take its feet player
position and run it through the shadow matrices:

```glsl
vec3 shadowView = (shadowModelView * vec4(playerPos, 1.0)).xyz;
vec4 shadowClip = shadowProjection * vec4(shadowView, 1.0);
vec3 shadowCoord = shadowClip.xyz / shadowClip.w * 0.5 + 0.5;
float lit = shadowCoord.z > texture(shadowtex0, shadowCoord.xy).r ? 0.0 : 1.0;
```

`shadowCoord.xy` is where to sample, and `shadowCoord.z` is the pixel's depth as the sun sees it.
If the stored depth is closer to the sun, something blocks the light. In practice you also subtract
a small bias from `z` to avoid speckled self-shadowing. If you distort shadow clip space to spend
more of the shadow map near the player, apply the same distortion in the `shadow` program and here,
before the divide.

## Previous frame

Temporal effects need to know where a point was on screen last frame. For geometry that did not
move, take its world position and use last frame's camera:

```glsl
vec3 previousPlayerPos = worldPos - previousCameraPosition;
vec4 previousClip = gbufferPreviousProjection * (gbufferPreviousModelView * vec4(previousPlayerPos, 1.0));
vec2 previousTexcoord = previousClip.xy / previousClip.w * 0.5 + 0.5;
```

The [uniforms reference](/docs/uniforms) lists every matrix used on this page, with its type.
