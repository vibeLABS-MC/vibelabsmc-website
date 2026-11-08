---
title: Programs
description: The programs a shaderpack can contain, when each one runs, what it draws, and which program the loader uses when one is missing.
section: reference
order: 1
updated: 2026-11-08
tag: 'gbuffers_*'
loaders: [iris, optifine]
---

This page lists the programs Iris and OptiFine look for in a pack's `shaders/` folder. Use it as a
lookup table when you need to know which file draws something, where that file sits in the frame,
and what happens if you leave it out. For the bigger picture, read the
[rendering pipeline](/docs/rendering-pipeline#overview) first.

## Run order

Each frame runs the passes below from top to bottom. A program is named after its files, so
`composite.vsh` and `composite.fsh` together form `composite`.

```pipeline
shadow
shadowcomp
prepare
gbuffers-opaque
deferred
gbuffers-translucent
composite
final
```

- **Geometry programs** (`shadow` and every `gbuffers_*` program) draw the world's triangles and
  are the only programs with access to vertex attributes.
- **Fullscreen programs** (`shadowcomp`, `prepare`, `deferred`, `composite` and `final`) draw one
  rectangle over their target and read what earlier passes wrote.

`shadowcomp`, `prepare`, `deferred` and `composite` also accept numbered copies from 1 to 99, such
as `composite1` and `composite2`, which run in order after the unnumbered program. `final` has no
numbered copies.

## Iris-only passes

Iris adds two passes that OptiFine does not load.

| Program | Kind         | When it runs                                                                                        |
| ------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `setup` | Compute only | When the pack loads and whenever the window is resized. Accepts `setup1` to `setup99`.              |
| `begin` | Fullscreen   | Every frame, before the shadow pass. Use it to prepare data for that pass. Accepts numbered copies. |

## Shadow pass

| Program      | Kind       | What it does                                                            |
| ------------ | ---------- | ----------------------------------------------------------------------- |
| `shadow`     | Geometry   | Draws shadow-casting geometry from the sun or moon into the shadow map. |
| `shadowcomp` | Fullscreen | Runs straight after `shadow` and writes to the `shadowcolor` buffers.   |

One `shadow` program draws every kind of geometry. Read the `renderStage` uniform to tell terrain,
entities and the rest apart. The shadow camera uses an orthographic projection by default.

Iris 1.8 and later also look for programs that split the shadow pass by geometry type. Each falls
back to `shadow` when missing.

| Program           | Draws                        |
| ----------------- | ---------------------------- |
| `shadow_solid`    | Solid terrain                |
| `shadow_cutout`   | Cutout terrain               |
| `shadow_water`    | Translucent terrain          |
| `shadow_entities` | Entities and the beacon beam |
| `shadow_block`    | Block entities               |

## Prepare

`prepare` is a fullscreen program that runs after the shadow pass and before any `gbuffers`
program. Use it to compute data the geometry programs will read, and write it to `colortex`
buffers.

## Geometry programs

The `gbuffers_*` programs draw the visible world. The last column is the fallback, the program the
loader uses when this one is missing.

| Program                     | Draws                                               | Falls back to                             |
| --------------------------- | --------------------------------------------------- | ----------------------------------------- |
| `gbuffers_basic`            | Leads and the chunk border debug overlay            | none                                      |
| `gbuffers_line`             | Block selection outline, fishing line               | `gbuffers_basic`                          |
| `gbuffers_textured`         | Particles without lighting                          | `gbuffers_basic`                          |
| `gbuffers_textured_lit`     | Lit particles                                       | `gbuffers_textured`                       |
| `gbuffers_skybasic`         | Sky colour, horizon, stars and the void             | `gbuffers_basic`                          |
| `gbuffers_skytextured`      | Sun and moon                                        | `gbuffers_textured`                       |
| `gbuffers_clouds`           | Clouds                                              | see [Fallbacks](/docs/programs#fallbacks) |
| `gbuffers_terrain`          | Solid and cutout blocks                             | `gbuffers_textured_lit`                   |
| `gbuffers_damagedblock`     | Block-breaking cracks                               | `gbuffers_terrain`                        |
| `gbuffers_block`            | Block entities, such as chests and signs            | `gbuffers_terrain`                        |
| `gbuffers_beaconbeam`       | Beacon beam                                         | `gbuffers_textured`                       |
| `gbuffers_entities`         | Mobs, players and other entities                    | `gbuffers_textured_lit`                   |
| `gbuffers_entities_glowing` | Entities with the glowing effect (OptiFine)         | `gbuffers_entities`                       |
| `gbuffers_armor_glint`      | Enchantment glint                                   | `gbuffers_textured`                       |
| `gbuffers_spidereyes`       | Eyes of spiders, endermen and the ender dragon      | `gbuffers_textured`                       |
| `gbuffers_hand`             | Your hand and opaque held items                     | `gbuffers_textured_lit`                   |
| `gbuffers_weather`          | Rain and snow                                       | `gbuffers_textured_lit`                   |
| `gbuffers_water`            | Translucent blocks, such as water and stained glass | `gbuffers_terrain`                        |
| `gbuffers_hand_water`       | Translucent held items                              | `gbuffers_hand`                           |

> [!WARNING] gbuffers_entities_glowing is OptiFine only
> OptiFine draws entities with the glowing effect, such as those hit by a spectral arrow, in this
> program. The Iris documentation states that Iris does not recognise it, so a pack for both loaders
> should not depend on it.

Iris adds more geometry programs. OptiFine ignores them, so they are safe to include.

| Program                          | Draws                                                   | Falls back to           |
| -------------------------------- | ------------------------------------------------------- | ----------------------- |
| `gbuffers_particles`             | Particles                                               | `gbuffers_textured_lit` |
| `gbuffers_particles_translucent` | Translucent particles; needs `particles.ordering=mixed` | `gbuffers_particles`    |
| `gbuffers_terrain_solid`         | Solid terrain only                                      | `gbuffers_terrain`      |
| `gbuffers_terrain_cutout`        | Cutout terrain only, such as leaves and grass           | `gbuffers_terrain`      |
| `gbuffers_block_translucent`     | Translucent block entities                              | `gbuffers_block`        |
| `gbuffers_entities_translucent`  | Translucent entities                                    | `gbuffers_entities`     |
| `gbuffers_lightning`             | Lightning and the ender dragon's death beams            | `gbuffers_entities`     |

## Opaque and translucent

Opaque geometry draws before `deferred`, so `deferred` can light it. Translucent geometry draws
after `deferred`, so it can blend over the lit scene.

- In OptiFine, `gbuffers_water` and `gbuffers_hand_water` run after `deferred`.
- The Iris documentation lists `gbuffers_weather`, `gbuffers_water` and `gbuffers_hand_water` as
  the only vanilla programs that run after `deferred` by default. Translucent entities, block
  entities and particles otherwise draw before it. The Iris translucent programs above, and the
  `particles.ordering` property, give you control over that.

`depthtex0` contains every surface, while `depthtex1` leaves out translucent ones. Compare the two
to find out how much water or glass lies in front of the opaque scene.

## Deferred

| Program                                 | Runs                                               | Writes     |
| --------------------------------------- | -------------------------------------------------- | ---------- |
| `deferred`, `deferred1` to `deferred99` | After opaque geometry, before translucent geometry | `colortex` |

`deferred` sees the finished opaque scene and nothing translucent yet, which makes it the place for
lighting, ambient occlusion and shadows on opaque surfaces. `depthtex1` first holds useful data in
this pass.

## Composite

| Program                                    | Runs                                     | Writes     |
| ------------------------------------------ | ---------------------------------------- | ---------- |
| `composite`, `composite1` to `composite99` | After all geometry, translucent included | `colortex` |

`composite` passes handle post-processing that needs the whole scene, such as fog, reflections on
water, bloom and depth of field.

Any fullscreen program, not only `composite`, can also run compute shaders. They are named after the
program, `composite.csh` and then `composite_a.csh` to `composite_z.csh`, and run before that
program's vertex shader. See [shader stages](/docs/shader-stages) for the details.

## Final

| Program | Runs                 | Writes                           |
| ------- | -------------------- | -------------------------------- |
| `final` | Last, once per frame | The screen, at window resolution |

`final` is the only program that draws to the screen, and it always matches the window size
whatever scale other buffers use. If a pack has no `final`, Iris copies `colortex0` to the screen
unchanged.

## Fallbacks

When a geometry program is missing, the loader follows its fallback column until it finds a program
that exists. For example, a missing `gbuffers_damagedblock` resolves like this:

```text
gbuffers_damagedblock -> gbuffers_terrain -> gbuffers_textured_lit -> gbuffers_textured -> gbuffers_basic
```

If none of the chain exists, Iris uses a built-in program. The loaders agree on the chains with one
exception:

| Program           | Iris falls back to  | OptiFine falls back to |
| ----------------- | ------------------- | ---------------------- |
| `gbuffers_clouds` | `gbuffers_textured` | none                   |

Fullscreen programs have no fallback. A missing `shadowcomp`, `prepare`, `deferred` or `composite`
is skipped. The Iris shadow programs fall back to `shadow`, as described in
[Shadow pass](/docs/programs#shadow-pass).

> [!TIP] Write the general programs first
> Because of fallbacks, a pack with only `gbuffers_textured_lit` and `gbuffers_textured` already
> covers most of the world. Add specific programs such as `gbuffers_terrain` or `gbuffers_water`
> when they need different code.
