---
title: Performance tips
description: Raise your frame rate with shaders on by tuning shadows, render distance and render scale, using pack profiles, and making sure the right GPU does the work.
section: using
order: 5
updated: 2026-11-08
loaders: [iris, optifine]
---

This page is for players whose shaderpack runs but runs slowly. It shows how to find out what is
holding your frame rate back, which settings to change first, and how to make sure the right GPU is
doing the work.

## Find the bottleneck

Every frame needs work from both the processor (CPU) and the graphics card (GPU). Whichever finishes
last sets your frame rate. Shaders mostly add work for the GPU.

A quick test tells you which one is the limit:

1. Note your frame rate in a busy spot, using the `F3` debug screen.
2. Make the window much smaller, or lower the render scale described below.
3. If the frame rate rises a lot, you are **GPU-limited**. The shader settings on this page will help.
4. If it barely moves, you are **CPU-limited**. Lower the render distance and simulation distance,
   and check for heavy mods.

On Windows, the Performance tab in Task Manager also shows how busy each GPU is. A GPU near full
use while the frame rate is low points the same way as step 3.

## Lower the shadow cost

Shadows can be one of the most expensive parts of a pack. To draw them, the pack renders the world a
second time from the sun's point of view into a **shadow map**. Two settings control that cost.

- **Shadow distance** sets how far from you terrain can cast shadows. In Iris, use **Max Shadow
  Distance** in Sodium's video settings. Iris notes that lowering it can raise frame rates
  significantly. Some packs set their own distance, which locks the slider.
- **Shadow resolution** sets how detailed the shadow map is. If the pack's settings offer it, lower
  it. OptiFine also has **Shadow Quality** in the Shaders menu, from 0.5x to 2x. Higher values
  give sharper shadows but use more video memory and time.

> [!NOTE] Shadow distance is capped by render distance
> In Iris, the shadow distance cannot go past your render distance. Lowering render distance can
> therefore cut shadow work too.

## Lower the render distance

Render distance controls how many chunks the game draws. With shaders on, those chunks go through
the pack's programs, and the ones within shadow range go through the shadow pass as well. Dropping
it by a few chunks costs little in looks and saves work on both the CPU and the GPU.

## Lower the render scale

Render scale sets how many pixels the pack draws before the image is stretched to fit your screen.
Rendering fewer pixels cuts GPU work across the board.

- In OptiFine, **Render Quality** in the Shaders menu goes from 0.5x (fastest) to 2x (slowest). Values
  below 1x can help on high-resolution screens. Values above 1x act as anti-aliasing.
- In Iris, look for a resolution or render scale option in the pack's own settings, if it has one.

## Use the pack's profiles

Some packs bundle **profiles**, which are presets that change many options at once. They appear as
a **Profile** button in the pack's settings screen. Start from the lowest profile, check the frame
rate, and step up until it drops below what you are happy with. Then tune single options from there.

If a profile is still too slow, look at effects that often cost a lot: volumetric fog or light,
reflections and ambient occlusion. Turn those down one at a time so you can see what each one costs.

## Keep drivers up to date

Install the latest graphics driver from your GPU maker's website. Driver updates fix bugs that can
break packs, and the Iris team asks Linux users to update Mesa before reporting problems. If a new
driver causes trouble, roll back and report the problem to the pack author.

## Laptops with two GPUs

Many gaming laptops have a weak integrated GPU and a stronger dedicated one. If Minecraft runs on the
integrated one, shaders will be slow or broken. Task Manager's Performance tab shows which GPU is
busy while you play.

On Windows 11, set the preference yourself:

1. Open **Settings > System > Display > Graphics**.
2. Find the Java program your launcher uses, usually `javaw.exe`. If it is not listed, add it.
3. Select it, choose **Options**, then pick **High performance**.

Your GPU maker's control panel has a similar per-app setting. Keep the laptop plugged in while you
play, because many laptops cut GPU power on battery.

## Next steps

If changing settings makes things look wrong rather than faster, see
[fixing common problems](/docs/troubleshooting).
