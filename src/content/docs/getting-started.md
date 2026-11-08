---
title: Getting started
description: What to learn, what to install and where the official references live before you write your first line of shader code.
section: developing
order: 1
updated: 2026-11-08
loaders: [iris, optifine]
---

This page is for people who want to write their own shaderpack rather than install one. It covers the
background knowledge that pays off most, the tools to set up, and the official references to keep
open while you work. When you finish it you will have a test setup that reloads your code in a few
seconds, and a plan for reading the rest of these docs.

## What to know first

You do not need to be a graphics programmer, but two kinds of knowledge make every later page
quicker to follow.

**Basic GLSL.** Shaderpacks are written in GLSL, the OpenGL Shading Language. You should be
comfortable with:

- the vector and matrix types `vec2`, `vec3`, `vec4`, `mat3` and `mat4`, and swizzles such as
  `color.rgb` or `position.xz`
- built-in functions such as `dot`, `normalize`, `mix`, `clamp` and `texture`
- `in` and `out` variables, and `uniform` values that the loader sets from outside the shader
- the preprocessor (`#define`, `#if`, `#ifdef`), which packs also use for user options

The [GLSL 3.30 specification](https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.3.30.pdf)
is the final word on syntax. These docs write every example as `#version 330 compatibility`, so that
is the version to check against.

**Linear algebra intuition.** You will not prove theorems, but you will move positions between
spaces all the time. It helps to know that:

- a `vec3` can be a position (a point) or a direction (an arrow), and the two behave differently
- the dot product of two unit vectors is the cosine of the angle between them, which sits at the
  heart of most lighting
- multiplying a `vec4` by a `mat4` moves it into another coordinate space; positions use
  `w = 1.0` and directions use `w = 0.0`
- after a perspective projection you divide by `w` to find where a point lands on screen

[Coordinate spaces](/docs/coordinate-spaces) puts all of this to work.

> [!NOTE] Hardware
> `#version 330` needs OpenGL 3.3, which most computers from the last decade or so support.
> Compute shaders need OpenGL 4.3. macOS stops at OpenGL 4.1, so compute-based features do not run
> there.

## Tools

- **A code editor with GLSL support.** Any text editor works, but syntax highlighting and error
  underlining save a lot of time. Visual Studio Code has extensions for GLSL and for Minecraft
  shaderpacks in particular.
- **A development instance.** Keep a separate Minecraft instance for shader work, with Iris
  installed (see [installing Iris](/docs/install-iris)) and as few other mods as possible. A
  creative superflat world with a few test builds loads fast and makes every change obvious.
- **OptiFine, if you plan to support it.** The two loaders differ in small ways, so test on both
  before you publish. Give OptiFine its own instance (see
  [installing OptiFine](/docs/install-optifine)).
- **A graphics debugger, later on.** [RenderDoc](https://renderdoc.org) captures a single frame and
  lets you inspect every pass, render target and uniform value in it.

## Reloading and reading errors

You will reload hundreds of times, so learn the keys first. Iris uses these defaults, which you can
rebind in the game's controls menu:

| Key | What it does in Iris          |
| --- | ----------------------------- |
| R   | Reload the current shaderpack |
| K   | Turn shaders on or off        |
| O   | Open the shader pack screen   |

OptiFine reloads the current pack with F3 + R, or with the `/reloadShaders` command.

When a program fails to compile, the reason is written to the game log. Turn on your launcher's
option to show the log while the game runs, and keep that window visible. In Iris, also enable
debug mode: press Ctrl + D on the shader pack screen, then restart the game. Debug mode shows
compile errors in game and writes the patched source of every program to a `patched_shaders`
folder in the game directory.

> [!TIP] Line numbers point at patched code
> Iris rewrites your source before it compiles it, so the line number in an error refers to the
> patched file, not your original. Open the matching file in `patched_shaders` to find the real
> line, especially when you use `#include`.

## Official references

These docs explain ideas and give working examples. For exhaustive lists and edge cases, go to the
sources maintained by the loaders themselves:

- [shaders.properties](https://shaders.properties) is the Iris project's shader documentation. It
  covers programs, uniforms, attributes, buffers and every properties file, and marks the features
  that only Iris supports.
- [OptiFine's shaders.txt](https://github.com/sp614x/optifine/blob/master/OptiFineDoc/doc/shaders.txt)
  is OptiFine's own reference for the format, including its full uniform tables and the
  `block.properties`, `item.properties` and `entity.properties` files.
- [Iris on GitHub](https://github.com/IrisShaders/Iris) has the source code, the issue tracker and
  a list of known limitations.

When the two loaders' documents disagree, trust each one for its own loader, and test on both.

## Reading order

The developing pages build on each other, so read them in this order:

1. This page.
2. [Your first shaderpack](/docs/first-shaderpack): a minimal pack that loads, then a visible
   effect.
3. [Rendering pipeline](/docs/rendering-pipeline): the order in which programs run each frame.
4. [Shader stages](/docs/shader-stages): what happens inside one program, and how data moves
   between its files.
5. [Coordinate spaces](/docs/coordinate-spaces): moving positions between spaces, and rebuilding
   them from depth.

Keep the reference pages open while you code: [programs](/docs/programs),
[uniforms](/docs/uniforms) and [block IDs](/docs/block-ids). Terms you do not recognise are
explained in the [glossary](/docs/glossary).
