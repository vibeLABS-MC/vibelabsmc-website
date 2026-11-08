---
title: Installing Iris
description: Install Iris with the official installer or by hand on Fabric or NeoForge, add a shaderpack and switch it on from the Shader Packs screen.
section: using
order: 1
updated: 2026-11-08
loaders: [iris]
---

This page is for players who want to run shaderpacks on Minecraft Java Edition with Iris. By the end
you will have Iris and Sodium installed, a shaderpack in the right folder, and you will know how to
turn it on, change its settings and switch it off again.

## What you need

- **Minecraft Java Edition.** Bedrock Edition cannot load mods, so Iris does not work there.
- **A mod loader.** Iris runs on Fabric, and on NeoForge from Minecraft 1.21.1 onwards. Forge is not
  supported.
- **Sodium.** Iris depends on this rendering mod and will not start without a matching version. The
  installer adds it for you. For a manual install you download it yourself.
- **No OptiFine.** Iris and OptiFine cannot be installed together, and the game crashes if you try.
  The same goes for Canvas and for mods that replace the renderer with Vulkan.

> [!NOTE] Iris only does shaders
> OptiFine also adds zoom, connected textures, custom item textures and more. Iris does not copy
> those features. Separate mods cover many of them, so add those if you miss them.

## Option 1: the Iris installer

The installer is the quickest route. It sets up Fabric, Iris and Sodium in one step, so it does not
help if you want NeoForge.

1. Download the installer from the [Iris download page](https://irisshaders.dev/download). There is a
   Windows `.exe` and a universal `.jar`. The `.jar` needs Java installed to open.
2. Close the Minecraft Launcher. The installer will not continue while it is open.
3. Choose your Minecraft version.
4. Decide on **Enable Fabric mod support**. Leave it off for a profile with only Iris and Sodium. Turn
   it on if you want to add other Fabric mods to the same game folder later.
5. Leave the install target on **Minecraft Launcher**, or pick a custom folder if you use another
   launcher.
6. Click **Install** and wait for it to finish. Then open the launcher and play with the new profile.

## Option 2: install the mods yourself

Use this route for NeoForge, for a launcher with separate instances, or when you already run other
mods.

1. Install the loader: Fabric with the [Fabric installer](https://fabricmc.net/use/installer/), or
   NeoForge from [neoforged.net](https://neoforged.net/).
2. Download Iris and Sodium from [Modrinth](https://modrinth.com/mod/iris) or
   [CurseForge](https://www.curseforge.com/minecraft/mc-mods/irisshaders). Both files must match your
   Minecraft version and your loader.
3. Put both `.jar` files in the `mods` folder of your game folder. Create the folder if it is
   missing.
4. Start the game with your loader's profile.

| System  | Default `mods` folder                          |
| ------- | ---------------------------------------------- |
| Windows | `%APPDATA%\.minecraft\mods`                    |
| macOS   | `~/Library/Application Support/minecraft/mods` |
| Linux   | `~/.minecraft/mods`                            |

Launchers with instances give each instance its own game folder, so use that one instead. Iris
itself does not need Fabric API, but many other Fabric mods do.

## Add a shaderpack

Iris looks for packs in a folder called `shaderpacks`, next to `mods` in your game folder.

```text
.minecraft/
├── mods/
│   ├── iris-<version>.jar
│   └── sodium-<version>.jar
└── shaderpacks/
    ├── my-pack.zip
    └── my-pack.zip.txt
```

You do not have to find the folder by hand. Open the Shader Packs screen and either drag the pack's
file onto the list, or click **Open Shader Pack Folder...** and copy it in. Click **Refresh** if it
does not appear straight away.

Keep the `.zip` as you downloaded it. If you unzip a pack, its `shaders` folder must sit directly
inside the pack's folder. The `.txt` file next to a pack is where Iris saves your settings for it.

## Turn a pack on

1. Open **Options > Video Settings** and choose **Shader Packs...**, or press **O** in game.
2. Select a pack in the list and click **Apply**.
3. Click **Shader Pack Settings...** to change the pack's own options, then **Apply** again.

The same screen has a **Shaders: Enabled** button. Click it to switch to **Shaders: Disabled** and
back. Iris also gives you three keys:

| Key | What it does                   |
| --- | ------------------------------ |
| `O` | Opens the Shader Packs screen. |
| `K` | Turns shaders on or off.       |
| `R` | Reloads the current pack.      |

You can change these keys in the game's controls menu, under the Iris category.

> [!TIP] Shadows are the first thing to lower
> Iris adds a **Max Shadow Distance** slider to Sodium's video settings. Iris notes that lowering it
> can raise frame rates significantly. See [performance tips](/docs/performance) for more.

## Next steps

Pick something to load with [choosing a shaderpack](/docs/choosing-a-shaderpack). If a pack does not
appear or the game crashes, go to [fixing common problems](/docs/troubleshooting).
