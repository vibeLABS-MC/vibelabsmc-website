---
title: Rendering pipeline
description: What Iris and OptiFine do every frame, which of your programs run when, and how data moves from one pass to the next.
section: developing
order: 3
updated: 2026-11-08
loaders: [iris, optifine]
---

This page explains the order in which a shaderpack's programs run. Read it after
[your first shaderpack](/docs/first-shaderpack) and before you write any lighting code: almost every
question about "why can't I read X here" is answered by where a program sits in this order.

## Overview

A shaderpack is a folder of small GLSL programs. Minecraft still decides _what_ to draw, but your
programs decide _how_ it looks. They run in a fixed order every frame, and each one can read what
earlier passes wrote to the render targets `colortex0` to `colortex15`.

```pipeline
shadow
prepare
gbuffers-opaque
deferred
gbuffers-translucent
composite
final
```

There are two kinds of pass:

- A **geometry pass** draws the world's triangles: blocks, entities, the sky, your hand. Its
  programs run once per vertex and once per covered pixel, and write surface data such as colour,
  normals and material IDs.
- A **fullscreen pass** draws one rectangle that covers the screen. Its programs run once per pixel
  and read the render targets that earlier passes filled. Lighting, fog and bloom live here.

> [!NOTE] Iris and OptiFine share this order
> Iris adds a few passes of its own, such as `setup` and `begin`, along with custom images and
> storage buffers. OptiFine does not load programs it does not know, so a pack can include them and
> still work on both loaders.

## Programs

Each pass is made of one or more programs. A program is a pair of files with the same name, such
as `composite.vsh` and `composite.fsh`. If a geometry program is missing, the loader falls back to
a more general one: `gbuffers_terrain` falls back to `gbuffers_textured_lit`, then
`gbuffers_textured`, then `gbuffers_basic`. A missing fullscreen program is skipped.

| Program             | Kind       | What it draws                                                       |
| ------------------- | ---------- | ------------------------------------------------------------------- |
| `shadow`            | Geometry   | The scene from the sun or moon, into the shadow map.                |
| `gbuffers_terrain`  | Geometry   | Opaque blocks such as stone, grass and leaves.                      |
| `gbuffers_entities` | Geometry   | Mobs, players, item frames and dropped items.                       |
| `deferred`          | Fullscreen | Lighting for everything opaque.                                     |
| `gbuffers_water`    | Geometry   | Translucent blocks such as water and stained glass, after lighting. |
| `composite`         | Fullscreen | Post-processing such as fog, bloom and depth of field.              |
| `final`             | Fullscreen | Writes the finished image to the screen.                            |

`deferred` and `composite` can be chained: `composite1`, `composite2` and so on run after
`composite`, each one reading what the last one wrote. The full list is in the
[programs reference](/docs/programs).

## Writing to render targets

Fullscreen passes read the previous result and write a new one. The `RENDERTARGETS` comment tells
the loader which `colortex` buffers this program writes, in the same order as its outputs.

```glsl title="shaders/composite.fsh" {6-7}
#version 330 compatibility

uniform sampler2D colortex0;
in vec2 texcoord;

/* RENDERTARGETS: 0 */
layout(location = 0) out vec4 color;

void main() {
    color = texture(colortex0, texcoord);
    color.rgb = pow(color.rgb, vec3(1.0 / 2.2)); // gamma
}
```

Older packs use `/* DRAWBUFFERS:0 */` and write to `gl_FragData[0]` instead. Both loaders still
accept that form, but `RENDERTARGETS` with `layout(location = ...)` outputs is what new packs use,
and it is the form these docs follow.

> [!WARNING] Buffers are cleared every frame
> To keep data between frames for temporal effects, declare `const bool colortex5Clear = false;`
> in any program, then read last frame's value before you overwrite it.

## Next steps

Now that you know the order, learn what each [shader stage](/docs/shader-stages) does inside a
program, or look up how positions move between [coordinate spaces](/docs/coordinate-spaces).
