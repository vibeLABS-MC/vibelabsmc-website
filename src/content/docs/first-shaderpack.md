---
title: Your first shaderpack
description: Build a minimal pack step by step, from an empty folder to a pass-through final program and a visible greyscale and vignette effect.
section: developing
order: 2
updated: 2026-11-08
loaders: [iris, optifine]
---

This page walks you through the smallest shaderpack worth having. It is for readers who have set up
a test instance as described in [getting started](/docs/getting-started). By the end you will have a
pack that loads on Iris and OptiFine, passes the image through untouched, then turns it grey and
darkens the corners. You will also know how to fix the errors most people hit on day one.

## Make the folder

Shaderpacks live in the `shaderpacks` folder of your game directory, next to `saves` and
`resourcepacks`. Create a folder for your pack, and a folder called `shaders` inside it. Every
program file goes in `shaders/`.

```text
shaderpacks/
└── my-first-pack/
    └── shaders/
        ├── final.vsh
        └── final.fsh
```

The name shown in the shader pack list is the folder name. When you share a pack later, zip it so
that `shaders/` sits at the top level of the archive, not inside another folder.

## Pass the image through

The `final` program runs last and draws to the screen. Like every fullscreen program it covers the
screen with one rectangle. Its vertex shader places the corners and hands a texture coordinate to
the fragment shader.

```glsl title="shaders/final.vsh"
#version 330 compatibility

out vec2 texcoord;

void main() {
    gl_Position = ftransform();
    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
}
```

`ftransform()` transforms the vertex the way the old fixed-function pipeline would. Iris rewrites it
into modern code for you. The fragment shader then runs once per pixel, reads the finished scene
from `colortex0` and writes it out unchanged.

```glsl title="shaders/final.fsh"
#version 330 compatibility

uniform sampler2D colortex0;

in vec2 texcoord;

layout(location = 0) out vec4 color;

void main() {
    color = texture(colortex0, texcoord);
}
```

`final` draws to the screen rather than to a render target, so it has no `RENDERTARGETS` comment.
The world itself still draws as normal, because you have not written any geometry programs yet.

## Load and reload it

1. Start the game and open the shader pack screen. In Iris the default key is O.
2. Select `my-first-pack` and apply it. The game should look much like vanilla.
3. Leave the game running while you edit. After each save, press R in Iris, or F3 + R in OptiFine,
   to reload the pack.

If you cannot find the shader pack screen, see [installing Iris](/docs/install-iris) or
[installing OptiFine](/docs/install-optifine).

## Add a visible effect

A pass-through pack is hard to tell apart from vanilla, so add a `composite` program that turns the
image grey. `composite` runs before `final` and writes back into `colortex0`, which `final` then
reads. Copy `final.vsh` to `composite.vsh` without changes, then create the fragment shader:

```glsl title="shaders/composite.fsh" {12-13}
#version 330 compatibility

uniform sampler2D colortex0;

in vec2 texcoord;

/* RENDERTARGETS: 0 */
layout(location = 0) out vec4 color;

void main() {
    color = texture(colortex0, texcoord);
    float grey = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    color.rgb = vec3(grey);
}
```

The `RENDERTARGETS` comment tells the loader that output 0 goes to `colortex0`. Reading and writing
the same buffer in one fullscreen pass is safe, because the loader gives the pass a second copy to
write into and swaps the two afterwards. The three weights are the standard Rec. 709 luminance
coefficients, which weight green far more heavily than blue to match how sensitive the eye is to
each. Save, reload, and the world turns grey.

> [!NOTE] Packs without a final program
> If a pack has no `final`, Iris copies `colortex0` to the screen as it is, so a `composite` alone
> would show the same result there. Writing a `final` keeps the behaviour explicit on both loaders.

## Darken the corners

Effects can live in `final` as well. Replace `final.fsh` with this version, which adds a vignette:

```glsl title="shaders/final.fsh" {11-13}
#version 330 compatibility

uniform sampler2D colortex0;

in vec2 texcoord;

layout(location = 0) out vec4 color;

void main() {
    color = texture(colortex0, texcoord);
    vec2 offset = texcoord - 0.5;
    float vignette = 1.0 - dot(offset, offset) * 1.2;
    color.rgb *= clamp(vignette, 0.0, 1.0);
}
```

`offset` is the distance from the centre of the screen in texture coordinates, and
`dot(offset, offset)` is its squared length, so the darkening grows towards the corners. Change
`1.2`, reload, and watch the strength change.

## Common first errors

- **The pack is not in the list.** The `shaders` folder is missing, misspelt or one level too deep,
  for example `my-first-pack/my-first-pack/shaders/` after unzipping a download.
- **The pack loads but nothing changes.** A file name is wrong. Windows hides known extensions by
  default, so `final.fsh` may really be `final.fsh.txt`. Turn on file name extensions in your file
  manager and check.
- **A program fails to compile.** The game log names the file and the line, and Iris debug mode
  shows it in game. Typical causes are a `#version` line that is not the first line of the file, a
  missing semicolon, or a varying whose name differs between stages, such as `out vec2 texcoord` in
  the vertex shader and `in vec2 texCoord` in the fragment shader.
- **The screen is black or full of noise.** An output was declared but never written, or the vertex
  shader never assigns `texcoord`. Values that are never written are undefined, so the result
  changes from one GPU to the next.

## Next steps

You now have the shape every pack builds on: geometry programs fill render targets, fullscreen
programs read and rewrite them, and `final` puts the result on screen. Read the
[rendering pipeline](/docs/rendering-pipeline) to see where each program fits, then
[shader stages](/docs/shader-stages) to learn what the vertex and fragment shaders above are doing.
The full list of programs is in the [programs reference](/docs/programs#final).
