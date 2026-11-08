---
title: Glossary
description: Short, plain definitions of the shader, rendering and material terms used across the vibeLABS docs, in alphabetical order.
section: reference
order: 4
updated: 2026-11-08
loaders: [iris, optifine]
---

This page is for anyone who meets an unfamiliar word in these docs, whether you play with shaders or
write them. Each entry gives a short definition and, where one exists, a link to the page that covers
the topic in depth.

## A

**Albedo.** The base colour of a surface before any lighting. In Minecraft this is the normal block,
item or entity texture.

**Ambient occlusion (AO).** Darkening in corners, cracks and gaps, where less surrounding light can
reach. It can come from Minecraft's smooth lighting, from a resource pack's normal texture, or from
the shaderpack itself (see SSAO).

**Anti-aliasing.** Any technique that smooths the jagged, stair-stepped edges of shapes on screen.
See FXAA and TAA.

**Attribute.** Data attached to each vertex, such as its position, normal, colour, texture
coordinates, lightmap values and block ID. Only geometry passes can read attributes.

## B

**Begin.** A fullscreen pass that runs at the start of each frame. It is specific to Iris.

**Block ID.** A number a shaderpack gives to a group of blocks in its `block.properties` file, so its
programs can treat them differently, for example to make leaves sway. Programs read it through the
`mc_Entity` attribute. See [block IDs](/docs/block-ids).

**Bloom.** A soft glow around bright areas. Packs make it by blurring the brightest parts of the image
and adding the result back on top.

## C

**Colortex.** The colour render targets, named `colortex0`, `colortex1` and so on. Passes write to
them and later passes read from them. They are cleared every frame unless the pack turns clearing off
for a target. How many exist depends on the loader and its version.

**Composite.** Fullscreen passes that run after all geometry is drawn, used for post-processing such
as fog, bloom and depth of field. A pack can chain them as `composite`, `composite1`, `composite2` and
so on.

**Compute shader.** A shader stage, in a `.csh` file, that does general calculations on the GPU
instead of drawing. Packs can attach compute shaders to fullscreen passes but not to gbuffers
programs. They need OpenGL 4.3, which macOS does not provide.

**Core shaders.** Vanilla Minecraft's own shader files, which resource packs can replace. They are not
part of a shaderpack. Iris cannot use resource packs that change them while a shaderpack is on.

## D

**Deferred.** Fullscreen passes that run after opaque geometry and before translucent geometry. Packs
usually do their main lighting here, using the surface data that the gbuffers programs stored. The
general approach of storing surface data first and lighting it afterwards is called deferred
rendering.

**Depth buffer.** A texture that stores how far each pixel's surface is from the camera.

**Depthtex.** The depth buffers a pack can read. `depthtex0` holds everything, `depthtex1` leaves out
translucent surfaces such as water and glass, and `depthtex2` also leaves out the player's hand.

**DRAWBUFFERS.** An older comment that tells the loader which colortex targets a program writes. New
packs use RENDERTARGETS instead.

## E

**Emission.** Light that a surface gives off by itself, as lava or glowstone does. LabPBR stores it
in the alpha channel of the specular texture.

## F

**F0.** How much light a surface reflects when you look at it head-on. Most non-metals reflect only a
little, while metals reflect a lot. LabPBR stores it in the green channel of the specular texture.

**Fabric.** A lightweight mod loader for Minecraft Java Edition. Iris and Sodium both run on it.

**Final.** The last fullscreen pass. It writes the finished image to the screen, and a pack can only
have one.

**Fragment shader.** The stage, in an `.fsh` file, that runs once for every pixel a shape covers and
decides what that pixel outputs. See [shader stages](/docs/shader-stages).

**Fullscreen pass.** A pass that draws one rectangle covering the whole screen and reads the render
targets that earlier passes filled. `begin`, `shadowcomp`, `prepare`, `deferred`, `composite` and
`final` all work this way.

**FXAA.** Fast approximate anti-aliasing. A cheap filter that runs on the finished image and softens
jagged edges. OptiFine offers it in its Shaders menu.

## G

**Gbuffers.** The geometry programs that draw the world from the camera, such as `gbuffers_terrain`
for blocks and `gbuffers_water` for translucent blocks. The name is short for geometry buffers, the
render targets they fill with surface data.

**Geometry pass.** A pass that draws the world's actual triangles. The `shadow` and `gbuffers`
programs work this way, and only they can read vertex attributes.

**Geometry shader.** An optional stage, in a `.gsh` file, that sits between the vertex and fragment
stages and can add, change or drop whole primitives.

**GLSL.** The OpenGL Shading Language, which shaderpack programs are written in. Its syntax is close
to C.

## H

**HDR.** High dynamic range. Working with brightness values far above what a screen can show, so the
sun can be many times brighter than a torch. Tone mapping brings the result back into a range the
screen can display.

**Height map.** A texture that stores how far each texel sits below the surface. Packs use it for
parallax effects. In LabPBR it is the alpha channel of the normal texture.

## I

**Iris.** An open-source shader loader for Fabric and NeoForge, built to run shaderpacks written for
OptiFine. It requires Sodium. See [installing Iris](/docs/install-iris).

## L

**LabPBR.** A shared standard for storing PBR material data in a resource pack's `_n` and `_s`
textures. See [PBR materials](/docs/labpbr).

**Lightmap.** Minecraft's own light values for each vertex: block light from torches and other light
sources, and sky light from the sky. Packs receive both as an attribute. Many use low sky light as a
hint that a spot is underground or indoors.

## M

**Macro.** A `#define` name that the loader sets before compiling, such as the Minecraft version or
the GPU vendor, so a pack can include or skip code. Pack options often work the same way.

## N

**NeoForge.** A mod loader for Minecraft Java Edition. Recent versions of Iris and Sodium run on it.

**Noise texture.** A texture of random values, available to programs as `noisetex`. Packs use it for
effects that need variation, such as clouds or ripples.

**Normal.** A direction that points straight out of a surface. How bright a surface looks depends on
the angle between its normal and the light.

**Normal map.** A texture that stores a normal for each texel, so a flat face can catch light as if
it had bumps and grooves. In LabPBR this is the `_n` texture.

## O

**OpenGL.** The graphics interface that Iris and OptiFine shaderpacks are written for. The Iris
starter guide targets version 3.3.

**OptiFine.** An optimisation mod for Minecraft Java Edition that also loads shaderpacks. It runs on
its own or with Forge, and its shader support grew out of the earlier Shaders Mod. See
[installing OptiFine](/docs/install-optifine).

## P

**Parallax occlusion mapping (POM).** An effect that uses a height map to shift where a texture is
read, so a flat surface appears to have real depth as you move past it.

**Pass.** One step of the frame, such as `shadow`, `deferred` or `composite`. Each pass is made of one
or more programs. See the [rendering pipeline](/docs/rendering-pipeline#overview).

**PBR.** Physically based rendering. Lighting surfaces from physical properties such as roughness,
reflectance and metalness, so different materials react to the same light in believable ways.

**Porosity.** How much a material soaks up water. LabPBR uses it to make porous surfaces darker and
less shiny when they are wet.

**Prepare.** A fullscreen pass that runs after the shadow pass and before the main geometry.

**Profile.** A preset in a pack's settings, such as low, medium or high, that changes many options at
once.

**Program.** A set of shader files with the same name, such as `composite.vsh` and `composite.fsh`,
that the loader runs together. See [programs](/docs/programs).

## R

**Render distance.** How many chunks around the player the game draws. In Iris it also caps the
shadow distance.

**Render scale.** The resolution a pack renders at, compared with the screen. OptiFine calls this
setting Render Quality.

**Render target.** A texture that a program writes into so that later passes can read it. The
colortex buffers are the main render targets.

**RENDERTARGETS.** A comment in a program, such as `/* RENDERTARGETS: 0,3 */`, that tells the loader
which colortex targets its outputs go to. See
[writing to render targets](/docs/rendering-pipeline#writing-to-render-targets).

**Resource pack.** A pack that changes Minecraft's textures, models, sounds and other assets. It can
also supply normal and specular textures for a shaderpack to use.

**Roughness.** How rough a surface is at a microscopic scale. Rough surfaces spread reflections out,
while smooth ones give sharp reflections. LabPBR stores the opposite value, smoothness.

## S

**Setup.** A compute-only pass that runs once when a pack loads and again when the window changes
size. It is specific to Iris.

**Shader.** A small program that runs on the GPU. Players often say "shaders" when they mean a whole
shaderpack.

**Shaderpack.** A `.zip` file or folder that contains a `shaders` folder of programs and settings.
Iris and OptiFine load packs from the `shaderpacks` folder in the game folder.

**shaders.properties.** A settings file in a pack's `shaders` folder. It defines the option screens,
profiles, custom uniforms and other rendering settings the loader should apply.

**Shadow acne.** Stripes or speckles of false shadow that appear when a surface shadows itself
because of limited depth precision. Packs fix it with a small offset called a bias.

**Shadow distance.** How far from the player, in blocks, the shadow map reaches. Terrain beyond it
casts no shadows.

**Shadow map.** A depth texture rendered from the sun's or moon's point of view by the `shadow` pass.
A pixel is in shadow if something closer to the light covers it in the map. Packs read it as
`shadowtex0`, which includes translucent geometry, and `shadowtex1`, which does not.

**Shadowcolor.** Optional colour targets that the shadow pass can write, for example to colour light
that passes through stained glass.

**Shadowcomp.** A fullscreen pass that runs straight after the shadow pass.

**Smoothness.** The opposite of roughness. LabPBR stores perceptual smoothness in the red channel of
the specular texture.

**Sodium.** A rendering optimisation mod for Fabric and NeoForge. Iris requires it, and it cannot be
used together with OptiFine.

**Specular map.** A texture that describes how a surface reflects light. In LabPBR this is the `_s`
texture, which holds smoothness, reflectance, porosity or subsurface scattering, and emission.

**SSAO.** Screen-space ambient occlusion. A way to estimate ambient occlusion from the depth buffer by
checking how much nearby geometry surrounds each pixel on screen.

**SSR.** Screen-space reflections. Reflections found by tracing through the current image and depth
buffer, so they cannot show anything that is off screen.

**Subsurface scattering.** Light that enters a material, spreads inside it and leaves at another
point. It gives leaves, skin and wax their soft look.

## T

**TAA.** Temporal anti-aliasing. The camera shifts very slightly every frame, and each new frame is
blended with earlier ones. This smooths edges and noise, but it can blur the image or leave trails
behind moving objects.

**Tone mapping.** Converting HDR brightness into the range a screen can show while keeping detail in
both bright and dark areas. Packs usually do it in one of their last passes.

**Translucent.** See-through surfaces such as water, stained glass and ice. They are drawn after the
deferred passes, so packs light them separately.

## U

**Uniform.** A value the loader sets for a whole draw, the same for every vertex and pixel. Examples
are the time of day, the camera position, rain strength and the view matrices. See
[uniforms](/docs/uniforms).

## V

**Vertex shader.** The stage, in a `.vsh` file, that runs once for each vertex. It works out where
the vertex lands on screen and passes data on to the next stage. See
[shader stages](/docs/shader-stages).

**Volumetric lighting.** Light that seems to fill the air, such as sunbeams through fog or between
trees. It can cost a lot of performance, so packs usually let you turn it down.
