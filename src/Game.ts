import Phaser from "phaser";

import Player from "./Player";
import MouseTileMarker from "./MouseTileMarker";
import TILES from "./TileMapping";

/**
 * A class that extends Phaser.Scene and wraps up the core logic for the platformer level.
 */
export default class Game extends Phaser.Scene {
  isPlayerDead = false;
  groundLayer!: Phaser.Tilemaps.DynamicTilemapLayer;
  player!: Player;
  marker!: MouseTileMarker;
  spikeGroup!: Phaser.Physics.Arcade.StaticGroup;
  particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;

  public static TILE_SPRITESHEET = "voxel_tiles";
  public static PLAYER_SPRITESHEET = "voxel_players";
  public static OLD_PLAYER_SPRITESHEET = "characters";
  public static DIRT_PARTICLE_IMAGE = "dirt_particle";
  public static PARTICLE_SPRITESHEET = "voxel_particles";

  preload() {
    this.load.atlasXML(
      Game.PARTICLE_SPRITESHEET,
      "assets/spritesheets/spritesheet_particles.png",
      "assets/spritesheets/spritesheet_particles.xml"
    );
    this.load.spritesheet(
      Game.TILE_SPRITESHEET,
      "../assets/images/spritesheet_tiles_extruded.png",
      {
        frameWidth: 128,
        frameHeight: 128,
        margin: 1,
        spacing: 2,
      }
    );
    this.load.spritesheet(
      Game.OLD_PLAYER_SPRITESHEET,
      "../assets/spritesheets/buch-characters-64px-extruded.png",
      {
        frameWidth: 64,
        frameHeight: 64,
        margin: 1,
        spacing: 1,
      }
    );
    // this.load.spritesheet(
    //   this.PLAYER_SPRITESHEET,
    //   "../assets/images/spritesheet_characters.png",
    //   {
    //     frameWidth: 32,
    //     frameHeight: 32,
    //     margin: 1,
    //     spacing: 2,
    //   }
    // );
  }

  create() {
    const camera = this.cameras.main;
    camera.setZoom(0.5);
    // Creating a blank tilemap
    const tileSize = 128;
    const pagesWide = 1;
    const pagesTall = 1;
    // All of these units are in *tiles*
    const totalWidth = Math.floor((camera.width * pagesWide) / tileSize);
    const totalHeight = Math.floor((camera.height * pagesTall) / tileSize);
    const skyHeight = Math.floor(camera.height / 2 / tileSize);
    const grassHeight = 1;

    const map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: totalWidth,
      height: totalHeight,
    });

    const tileset = map.addTilesetImage(
      Game.TILE_SPRITESHEET,
      undefined,
      tileSize,
      tileSize,
      1,
      2
    );

    this.groundLayer = map
      .createBlankDynamicLayer("Ground", tileset)
      .fill(TILES.BLANK)
      .fill(TILES.GRASS, 0, skyHeight, totalWidth, grassHeight)
      .weightedRandomize(
        0,
        skyHeight + grassHeight,
        totalWidth,
        totalHeight - skyHeight - grassHeight,
        TILES.DIRT
      )
      .setCollisionByExclusion([TILES.BLANK, TILES.STONE]);

    const x = map.tileToWorldX(totalWidth / 2);
    const y = map.tileToWorldY(skyHeight - 1);
    this.player = new Player(this, x, y);

    // Watch the player and tilemap layers for collisions, for the duration of the scene:
    this.physics.add.collider(this.player.sprite, this.groundLayer);

    // Constrain the camera so that it isn't allowed to move outside the width/height of tilemap
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.player.sprite);

    this.marker = new MouseTileMarker(this, map);
    this.particles = this.add.particles(Game.PARTICLE_SPRITESHEET);
  }

  update(time: number, delta: number) {
    this.player.update();
    this.marker.update();

    const pointer = this.input.activePointer;
    if (pointer.isDown) {
      const worldPoint = pointer.positionToCamera(
        this.cameras.main
      ) as Phaser.Math.Vector2;
      const tile = this.groundLayer.putTileAtWorldXY(
        TILES.STONE,
        worldPoint.x,
        worldPoint.y
      );
      tile.setCollision(false);
      const cam = this.cameras.main;
      cam.shake(50, 0.05);

      this.particles
        .createEmitter({
          frame: "square_orange.png",
          x: 0,
          y: 0,
          lifespan: 300,
          speed: { min: 300, max: 500 },
          scale: { start: 1, end: 0 },
        })
        .explode(1, worldPoint.x, worldPoint.y);
    }
  }
}
