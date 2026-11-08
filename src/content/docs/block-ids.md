---
title: Block IDs
description: Map blocks, items and entities to numbers with block.properties, item.properties and entity.properties, then read those numbers in your shaders.
section: reference
order: 3
updated: 2026-11-08
tag: 'block.properties'
loaders: [iris, optifine]
---

Shaders cannot see block names. To treat leaves, lava or glowstone differently, you give them
numbers in a properties file, and the loader hands those numbers to your programs. This page is for
pack authors who want per-block, per-item or per-entity effects. Afterwards you can write the three
ID files, read the IDs in GLSL, and build two common effects: waving leaves and emissive blocks.

## The three files

All three files live in `shaders/`, next to your programs.

| File                | Maps                          | Read in GLSL with                                              |
| ------------------- | ----------------------------- | -------------------------------------------------------------- |
| `block.properties`  | Blocks and block entities     | `mc_Entity.x` for terrain, `blockEntityId` for block entities  |
| `item.properties`   | Items, block items and armour | `heldItemId`, `heldItemId2`; Iris adds `currentRenderedItemId` |
| `entity.properties` | Entities                      | `entityId`                                                     |

Every line has the form `kind.id=names`, with names separated by spaces: `block.10001=...`,
`item.30001=...`, `entity.20001=...`. The namespace is optional for vanilla names and needed for
modded ones, such as `examplemod:crystal_ore`. One ID can cover many names, but list each name
under one ID only.

## Writing block.properties

```properties title="shaders/block.properties"
# Leaves that sway in the wind
block.10001=minecraft:oak_leaves minecraft:birch_leaves minecraft:spruce_leaves minecraft:jungle_leaves

# Blocks that glow; the redstone lamp only while it is lit
block.10002=minecraft:glowstone minecraft:sea_lantern minecraft:shroomlight minecraft:redstone_lamp:lit=true

# A block from a mod
block.10003=examplemod:crystal_ore
```

To match block states, append `:property=value` to the name. Commas list alternatives, and each
extra `:` group must also match. `minecraft:oak_door:facing=north,south:hinge=right` matches oak
doors that face north or south and are hinged on the right.

Both loaders run the file through the preprocessor, so `#if` and `#ifdef` work. Iris 1.7 and later
also accept data pack tags, written with `%`. Guard them so other loaders still get a plain list:

```properties title="shaders/block.properties"
#if IRIS_TAG_SUPPORT >= 2
block.10001=%minecraft:leaves
#else
block.10001=minecraft:oak_leaves minecraft:birch_leaves minecraft:spruce_leaves minecraft:jungle_leaves
#endif
```

Keep block IDs between 1 and 32767. OptiFine stores them as signed 16-bit numbers, and recent
versions of Iris allow far larger values but read them through a `float`, which loses precision at
high values.

## Reading IDs in the vertex shader

For terrain, the block ID arrives as the vertex attribute `mc_Entity`, with the ID in `x`. The Iris
documentation lists it for `gbuffers_terrain`, `gbuffers_water` and `shadow`. Declare it with `in`;
OptiFine only supplies it to programs that do. The value is a `float`, so round it to an `int`.

Block entities, such as chests, signs and beds, are not terrain. In `gbuffers_block`, read the
`blockEntityId` uniform instead. It is already an `int`.

## Passing IDs to the fragment shader

Fragment shaders cannot read attributes, so pass the ID on as a varying. Integer varyings must be
`flat`, which also stops the GPU from blending IDs across a triangle.

```glsl title="shaders/gbuffers_terrain.vsh" {8,13,18,20-26}
#version 330 compatibility

uniform mat4 gbufferModelView;
uniform mat4 gbufferModelViewInverse;
uniform vec3 cameraPosition;
uniform float frameTimeCounter;

in vec3 mc_Entity;

out vec2 texcoord;
out vec2 lmcoord;
out vec4 glcolor;
flat out int blockId;

const int LEAVES = 10001;

void main() {
    blockId = int(mc_Entity.x + 0.5);

    if (blockId == LEAVES) {
        vec4 viewPos = gl_ModelViewMatrix * gl_Vertex;
        vec3 playerPos = (gbufferModelViewInverse * viewPos).xyz;
        vec3 worldPos = playerPos + cameraPosition;
        float phase = frameTimeCounter * 1.5 + worldPos.x * 0.7 + worldPos.z * 0.5;
        playerPos.xz += vec2(sin(phase), cos(phase * 0.8)) * 0.03;
        gl_Position = gl_ProjectionMatrix * (gbufferModelView * vec4(playerPos, 1.0));
    } else {
        gl_Position = ftransform();
    }

    texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    lmcoord = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    glcolor = gl_Color;
}
```

## Waving leaves

The highlighted block in the vertex shader above moves leaves. It converts the vertex to player
space, adds `cameraPosition` to reach world space, and offsets the position by a small sine wave.
The phase depends on world position, so neighbouring leaves sway slightly out of step, while
vertices at the same spot in the world get the same offset and leaf blocks stay joined. It then converts back to
view space and on to clip space. [Coordinate spaces](/docs/coordinate-spaces) explains each step.

Shadows do not move by themselves. To make them sway too, read `mc_Entity` in `shadow.vsh` and apply
the same offset there.

## Emissive blocks

The fragment shader receives `blockId` and treats ID 10002 as a light source. Emissive blocks skip
the lightmap so they stay bright in the dark, and every block writes a mask to `colortex3` that
later passes, such as a bloom in `composite`, can read.

```glsl title="shaders/gbuffers_terrain.fsh" {9,11-13,21-23}
#version 330 compatibility

uniform sampler2D gtexture;
uniform sampler2D lightmap;

in vec2 texcoord;
in vec2 lmcoord;
in vec4 glcolor;
flat in int blockId;

/* RENDERTARGETS: 0,3 */
layout(location = 0) out vec4 color;
layout(location = 1) out vec4 material;

const int EMISSIVE = 10002;

void main() {
    color = texture(gtexture, texcoord) * glcolor;
    if (color.a < 0.1) discard;

    float emissive = blockId == EMISSIVE ? 1.0 : 0.0;
    color.rgb *= mix(texture(lightmap, lmcoord).rgb, vec3(1.0), emissive);
    material = vec4(emissive, 0.0, 0.0, 1.0);
}
```

`material` is written on every path that does not discard, and its alpha is 1.0 so blending cannot
change the mask.

## Items and entities

```properties title="shaders/item.properties"
item.30001=minecraft:torch minecraft:lantern minecraft:glowstone
```

```properties title="shaders/entity.properties"
entity.20001=minecraft:zombie minecraft:husk minecraft:drowned
```

`heldItemId` and `heldItemId2` hold the IDs of the items in the main hand and off hand. They are
uniforms, so any program can read them, for example to colour the light around a player holding a
torch. `entityId` holds the ID of the entity being drawn, in `gbuffers_entities` and the shadow pass.

Iris adds more. `currentRenderedItemId` is the ID of the item or armour being drawn, in geometry
programs and the shadow pass, and `currentSelectedBlockId` is the ID of the block under the
crosshair outline. Iris also defines names that do not exist in vanilla, such as
`minecraft:current_player` and `minecraft:name_tag` for `entity.properties`, and
`trim_<material>` entries such as `trim_emerald` for `item.properties`.

OptiFine also reads `assets/<modid>/shaders/block.properties` (and the item and entity files) from
inside mod files, so a mod can ship IDs for its own content.

## Things to watch for

- **Unlisted names do not share one value.** According to the Iris documentation, current Iris
  sends -1 in `mc_Entity.x` for blocks you did not list, `heldItemId` is -1 for unlisted items, and
  `entityId` and `blockEntityId` are 65535 for unlisted entities and block entities. Always compare
  against IDs you assigned, never against a "no ID" number, and do not use 0 as an ID.
- **Do not depend on missing files.** Without a `block.properties`, Iris falls back to the numeric
  block IDs Minecraft used before 1.13. New packs should always ship the file.
- **Render layers live here too.** `layer.solid`, `layer.cutout` and `layer.translucent` lines in
  `block.properties` move blocks between render layers, and so between programs such as
  `gbuffers_terrain` and `gbuffers_water`. OptiFine does not move full opaque cubes, and the Iris
  documentation warns that making opaque geometry translucent can leave holes in the world.

The [programs reference](/docs/programs) shows which program draws each kind of geometry, and the
[uniforms reference](/docs/uniforms) lists the other values you can combine with these IDs.
