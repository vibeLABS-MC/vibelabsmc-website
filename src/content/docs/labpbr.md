---
title: PBR materials (LabPBR)
description: What the LabPBR material standard is, what each channel of the _n and _s textures stores, and how resource packs and shaderpacks use them.
section: standards
order: 1
updated: 2026-11-08
tag: '_n · _s'
loaders: [iris, optifine]
---

This page is for resource pack artists who want their textures to react to light, and for shaderpack
developers who want to read those textures. After reading it you will know which files LabPBR adds,
what each colour channel means, and how both sides find each other. For exact encodings and edge
cases, use the [official LabPBR specification](https://shaderlabs.org/wiki/LabPBR_Material_Standard).

## What LabPBR is

PBR (physically based rendering) describes a surface by physical properties such as how smooth it
is, how much light it reflects and whether it is a metal. A shaderpack can then light every surface
with the same rules and still get stone, gold and water to look different.

Vanilla textures only store colour. LabPBR, specified by the shaderLABS community, is a shared
agreement on how to pack the extra material data into two more images per texture. A resource pack
that follows it can be used with any shaderpack that supports the standard, without either side
knowing about the other.

## The two textures

Each texture in a resource pack can have two companions with the same name and a suffix.

```text
assets/minecraft/textures/block/
├── cobblestone.png      colour (albedo)
├── cobblestone_n.png    normal texture
└── cobblestone_s.png    specular texture
```

Both are RGBA images, and each of the four channels stores a different property.

## Normal texture (`_n`)

| Channel | Stores                                                                     |
| ------- | -------------------------------------------------------------------------- |
| Red     | Normal direction, X component.                                             |
| Green   | Normal direction, Y component, in the DirectX ("Y down") convention.       |
| Blue    | Ambient occlusion. 0 is fully occluded, 255 is not occluded.               |
| Alpha   | Height, for parallax effects. 255 is the surface, lower values sit deeper. |

The normal's Z component is not stored. A shaderpack rebuilds it from X and Y, which frees the blue
channel for ambient occlusion.

> [!WARNING] Check the green channel's direction
> Texture tools can export normal maps in either the DirectX or the OpenGL convention, and the two
> store green in opposite directions. If bumps look lit from the wrong side, flip the green channel.

## Specular texture (`_s`)

| Channel | Stores                                                                |
| ------- | --------------------------------------------------------------------- |
| Red     | Perceptual smoothness. 0 is fully rough, 255 is fully smooth.         |
| Green   | Reflectance (F0) for non-metals; values from 230 upwards mark metals. |
| Blue    | Porosity in the low range; subsurface scattering in the high range.   |
| Alpha   | Emission. Higher values glow more; 255 means no emission.             |

Only the red and green channels are required. Blue and alpha are optional.

Some details matter when you author or decode these values:

- **Smoothness is perceptual.** Before lighting, shaders convert it to roughness with
  `roughness = (1 - smoothness)²`.
- **Green covers two jobs.** Values from 0 to 229 store reflectance directly. A short run above that
  selects a list of predefined metals, such as iron and gold. 255 means "use the albedo colour as
  the reflectance", for metals that are not on the list.
- **Blue splits at 64.** Values up to 64 describe porosity, which controls how much darker and less
  shiny a surface gets when wet. Values from 65 up describe subsurface scattering, light passing into
  materials such as leaves or skin.
- **Alpha 255 is special.** It means no glow, which is also what an image without an alpha channel
  gives you. Emitted light takes its colour from the albedo texture.

The specification lists the exact numbers for every metal and range.

## Declaring the format in a resource pack

A resource pack states which format its `_n` and `_s` textures use in a small properties file. Iris
and OptiFine both read it from the same path.

```properties title="assets/minecraft/optifine/texture.properties"
format=lab-pbr/1.3
```

The part after the slash is the version of the standard. A shaderpack can then test for it with the
preprocessor macro `MC_TEXTURE_FORMAT_LAB_PBR`, and for that exact version with
`MC_TEXTURE_FORMAT_LAB_PBR_1_3`.

An older, informal convention exists that uses the channels differently. The two are not
interchangeable, so a pack that expects one will show odd materials with the other.

## Reading the textures in a shaderpack

Gbuffers programs get the current surface's normal and specular textures through two samplers,
`normals` and `specular`. They share the texture coordinates of the colour texture.

```glsl title="shaders/lib/labpbr.glsl"
uniform sampler2D normals;
uniform sampler2D specular;

// Tangent-space normal from a LabPBR _n texel.
vec3 labNormal(vec4 texel) {
    vec2 xy = texel.rg * 2.0 - 1.0;
    float z = sqrt(max(1.0 - dot(xy, xy), 0.0));
    return vec3(xy, z);
}

// Linear roughness from a LabPBR _s texel.
float labRoughness(vec4 texel) {
    float r = 1.0 - texel.r;
    return r * r;
}
```

Turn the tangent-space normal into a world or view normal with the tangent attribute and the vertex
normal. [Coordinate spaces](/docs/coordinate-spaces) covers those transforms. In OptiFine, players
can switch normal and specular maps off in the Shaders menu, so test for `MC_NORMAL_MAP` and
`MC_SPECULAR_MAP` before you rely on them there.

## Next steps

Read the [specification](https://shaderlabs.org/wiki/LabPBR_Material_Standard) before you encode
metals or emission. To see where gbuffers programs sit in a frame, go to the
[rendering pipeline](/docs/rendering-pipeline#programs).
