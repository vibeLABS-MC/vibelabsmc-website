---
title: Uniforms
description: The uniforms most packs read, grouped by topic, with their GLSL types and what each value means on Iris and OptiFine.
section: reference
order: 2
updated: 2026-11-08
tag: 'uniform'
loaders: [iris, optifine]
---

A uniform is a value the loader sets before a program runs. It is the same for every vertex and
every pixel in that draw. This page lists the uniforms most packs use, grouped by topic, so you can
look up a name, its exact type and what it means. Everything here works on both Iris and OptiFine
unless it sits in the [Iris-only uniforms](/docs/uniforms#iris-only-uniforms) table.

## Declaring a uniform

Declare a uniform at the top of any shader file with exactly the name and type shown here, and the
loader fills in its value:

```glsl
uniform float frameTimeCounter;
uniform vec3 cameraPosition;
uniform sampler2D colortex0;
```

The names are case-sensitive. A misspelt name still compiles, but the loader never sets it, so it
keeps its default value: zero for numbers, vectors and matrices, and texture unit 0 for samplers.
The same happens when you use an Iris-only uniform on OptiFine.

## Time

| Name               | Type    | Meaning                                                                                                    |
| ------------------ | ------- | ---------------------------------------------------------------------------------------------------------- |
| `frameTimeCounter` | `float` | Seconds since the game started. Wraps to 0 after 3600 seconds and keeps counting while the game is paused. |
| `frameTime`        | `float` | Length of the previous frame, in seconds.                                                                  |
| `frameCounter`     | `int`   | Index of the current frame. Returns to 0 after 720719.                                                     |
| `worldTime`        | `int`   | Time of day in ticks, from 0 to 23999.                                                                     |
| `worldDay`         | `int`   | In-game days since the world began.                                                                        |
| `moonPhase`        | `int`   | Moon phase, from 0 (full moon) to 7.                                                                       |

Use `frameTimeCounter` for animation such as waving leaves or moving water, and expect a jump once
an hour when it wraps. Use `worldTime` for anything tied to the day and night cycle.

## Camera

| Name                        | Type    | Meaning                                                     |
| --------------------------- | ------- | ----------------------------------------------------------- |
| `cameraPosition`            | `vec3`  | Camera position in world space.                             |
| `previousCameraPosition`    | `vec3`  | `cameraPosition` from the previous frame.                   |
| `eyeAltitude`               | `float` | Y position of the viewing entity, in blocks.                |
| `gbufferModelView`          | `mat4`  | Player space to view space.                                 |
| `gbufferModelViewInverse`   | `mat4`  | View space to player space.                                 |
| `gbufferProjection`         | `mat4`  | View space to clip space, as used for the world's geometry. |
| `gbufferProjectionInverse`  | `mat4`  | Clip or NDC space back to view space; divide by `w` after.  |
| `gbufferPreviousModelView`  | `mat4`  | `gbufferModelView` from the previous frame.                 |
| `gbufferPreviousProjection` | `mat4`  | `gbufferProjection` from the previous frame.                |

There are no inverses of the previous-frame matrices. For how these fit together, and an example of
reprojecting into last frame, see [coordinate spaces](/docs/coordinate-spaces#previous-frame).

## Sun, moon and shadows

| Name                      | Type    | Meaning                                                                    |
| ------------------------- | ------- | -------------------------------------------------------------------------- |
| `sunPosition`             | `vec3`  | Sun position in view space, 100 units from the camera.                     |
| `moonPosition`            | `vec3`  | Moon position in view space, 100 units from the camera.                    |
| `shadowLightPosition`     | `vec3`  | Position in view space of whichever body casts shadows, sun or moon.       |
| `upPosition`              | `vec3`  | The up direction in view space.                                            |
| `sunAngle`                | `float` | Progress through the day from 0 to 1: 0 is sunrise, 0.25 noon, 0.5 sunset. |
| `shadowAngle`             | `float` | Like `sunAngle`, but for the body that casts shadows.                      |
| `shadowModelView`         | `mat4`  | Player space to shadow view space.                                         |
| `shadowModelViewInverse`  | `mat4`  | Shadow view space to player space.                                         |
| `shadowProjection`        | `mat4`  | Shadow view space to shadow clip space.                                    |
| `shadowProjectionInverse` | `mat4`  | Shadow clip space to shadow view space.                                    |

`normalize(shadowLightPosition)` is the light direction in view space. Multiply it by
`mat3(gbufferModelViewInverse)` to get the same direction in player space.

## Screen

| Name          | Type    | Meaning                                                                                              |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `viewWidth`   | `float` | Width of the screen in pixels.                                                                       |
| `viewHeight`  | `float` | Height of the screen in pixels.                                                                      |
| `aspectRatio` | `float` | `viewWidth / viewHeight`.                                                                            |
| `near`        | `float` | Distance to the near clipping plane, usually 0.05.                                                   |
| `far`         | `float` | Render distance in blocks. The Iris documentation notes that this is not the projection's far plane. |

The size of one pixel in texture coordinates is `1.0 / vec2(viewWidth, viewHeight)`, which you need
for blurs and edge detection.

## World and player

| Name                  | Type    | Meaning                                                                                          |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `rainStrength`        | `float` | Rain from 0 (clear) to 1 (full storm), blended during changes in weather.                        |
| `wetness`             | `float` | `rainStrength` smoothed over time, so surfaces dry slowly.                                       |
| `isEyeInWater`        | `int`   | What the camera is inside: 0 nothing, 1 water, 2 lava, 3 powder snow.                            |
| `eyeBrightness`       | `ivec2` | Light at the player: `x` is block light, `y` is sky light, from 0 to 240 (light level times 16). |
| `eyeBrightnessSmooth` | `ivec2` | `eyeBrightness` smoothed over time, good for auto-exposure.                                      |
| `nightVision`         | `float` | Night vision strength, from 0 to 1.                                                              |
| `blindness`           | `float` | Blindness strength, from 0 to 1.                                                                 |
| `fogColor`            | `vec3`  | Colour of the horizon fog.                                                                       |
| `skyColor`            | `vec3`  | Colour of the upper sky.                                                                         |

`eyeBrightnessSmooth.y / 240.0` gives the sky light at the player as a value from 0 to 1, which
helps you darken or fog caves.

## Samplers

Samplers are uniforms too. Declare them with the type shown.

| Name                           | Type        | Contents                                                    |
| ------------------------------ | ----------- | ----------------------------------------------------------- |
| `colortex0` to `colortex15`    | `sampler2D` | The render targets your programs write.                     |
| `depthtex0`                    | `sampler2D` | Depth of everything.                                        |
| `depthtex1`                    | `sampler2D` | Depth without translucent surfaces such as water and glass. |
| `depthtex2`                    | `sampler2D` | Depth without translucent surfaces or the hand.             |
| `shadowtex0`                   | `sampler2D` | Shadow map depth of everything.                             |
| `shadowtex1`                   | `sampler2D` | Shadow map depth without translucent surfaces.              |
| `shadowcolor0`, `shadowcolor1` | `sampler2D` | Colour buffers written by the shadow pass.                  |
| `noisetex`                     | `sampler2D` | A noise texture; `noiseTextureResolution` sets its size.    |

Geometry programs have four more: `gtexture` (the texture of the surface being drawn), `lightmap`,
`normals` and `specular`. The last two hold the resource pack's normal and specular maps; see
[LabPBR](/docs/labpbr) for what is in them.

> [!WARNING] colortex0 to colortex3 in geometry programs
> In `gbuffers` programs, `colortex0` to `colortex3` share texture units with `gtexture`,
> `lightmap`, `normals` and `specular`. Sampling them there does not give you the render target.
> Read them in fullscreen programs, and keep data that geometry programs must read in `colortex4`
> or above.

Depth textures contain garbage until the geometry programs that fill them have run, and `depthtex1`
first holds useful data in `deferred`. If the pack sets `shadowHardwareFiltering`, the shadow
textures become `sampler2DShadow` samplers that return a filtered comparison instead of a depth.

## Iris-only uniforms

These are documented by the Iris project and are not set by OptiFine.

| Name                    | Type    | Meaning                                                                                            |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `cameraPositionInt`     | `ivec3` | Whole-block part of the camera position.                                                           |
| `cameraPositionFract`   | `vec3`  | Fractional part of the camera position.                                                            |
| `thunderStrength`       | `float` | Thunderstorm strength from 0 to 1, non-zero only during thunder.                                   |
| `isSpectator`           | `bool`  | True in spectator mode.                                                                            |
| `currentDate`           | `ivec3` | The computer's date as year, month, day.                                                           |
| `currentTime`           | `ivec3` | The computer's time as hour, minute, second, in 24-hour format.                                    |
| `currentRenderedItemId` | `int`   | ID of the item or armour being drawn, from `item.properties` (block items use `block.properties`). |

`cameraPositionInt` and `cameraPositionFract` together give an exact position, which matters
because Iris resets `cameraPosition` every 30000 blocks. For IDs, see [block IDs](/docs/block-ids).
The full list of uniforms, including many rarely used ones, is on
[shaders.properties](https://shaders.properties/current/reference/uniforms/overview/) and in
[OptiFine's shaders.txt](https://github.com/sp614x/optifine/blob/master/OptiFineDoc/doc/shaders.txt).
