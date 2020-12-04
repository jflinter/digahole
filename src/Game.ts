import Phaser from "phaser";

import Player from "./Player";
import MouseTileMarker from "./MouseTileMarker";
import TILES from "./TileMapping";
import ChunkManager from "./ChunkManager";

/**
 * A class that extends Phaser.Scene and wraps up the core logic for the platformer level.
 */
export default class Game extends Phaser.Scene {
  player!: Player;
  marker!: MouseTileMarker;
  spikeGroup!: Phaser.Physics.Arcade.StaticGroup;
  particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
  chunkManager!: ChunkManager;

  public static TILE_SPRITESHEET = "voxel_tiles";
  public static PLAYER_SPRITESHEET = "voxel_players";
  public static OLD_PLAYER_SPRITESHEET = "characters";
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

    camera.setZoom(0.6);

    this.player = new Player(this, 50, 50);

    this.chunkManager = new ChunkManager(this, camera.width, camera.height);
    const physics = this.physics;
    const player = this.player;
    this.chunkManager.chunks.forEach((chunk) => {
      physics.add.collider(player.sprite, chunk.layer);
    });
    this.chunkManager.onLayerCreated((layer) => {
      physics.add.collider(player.sprite, layer);
    });

    // const x = this.chunkManager.map.tileToWorldX(totalWidth / 2);
    // const y = this.chunkManager.map.tileToWorldY(skyHeight - 1);

    // Watch the player and tilemap layers for collisions, for the duration of the scene:

    // Constrain the camera so that it isn't allowed to move outside the width/height of tilemap
    camera.setBounds(
      0,
      0,
      this.chunkManager.map.widthInPixels,
      this.chunkManager.map.heightInPixels
    );
    camera.startFollow(this.player.sprite);

    // this.marker = new MouseTileMarker(this, map);
    this.particles = this.add.particles(Game.PARTICLE_SPRITESHEET);
  }

  update(time: number, delta: number) {
    this.player.update();
    // this.marker.update();
    this.chunkManager.update();

    // const pointer = this.input.activePointer;
    // if (pointer.isDown) {
    //   const worldPoint = pointer.positionToCamera(
    //     this.cameras.main
    //   ) as Phaser.Math.Vector2;
    //   const tile = this.groundLayer.putTileAtWorldXY(
    //     TILES.STONE,
    //     worldPoint.x,
    //     worldPoint.y
    //   );
    //   tile.setCollision(false);
    //   const cam = this.cameras.main;
    //   cam.shake(50, 0.05);

    //   this.particles
    //     .createEmitter({
    //       frame: "square_orange.png",
    //       x: 0,
    //       y: 0,
    //       lifespan: 300,
    //       speed: { min: 300, max: 500 },
    //       scale: { start: 1, end: 0 },
    //     })
    //     .explode(1, worldPoint.x, worldPoint.y);
    // }
  }
}
