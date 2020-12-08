import Phaser from "phaser";
import _ from "lodash";

import Player from "./Player";
import MouseTileMarker from "./MouseTileMarker";
import TILES from "./TileMapping";
import MapLoader, { TILE_SIZE } from "./MapLoader";

/**
 * A class that extends Phaser.Scene and wraps up the core logic for the platformer level.
 */
export default class Game extends Phaser.Scene {
  player!: Player;
  marker!: MouseTileMarker;
  spikeGroup!: Phaser.Physics.Arcade.StaticGroup;
  particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
  mapLoader!: MapLoader;
  depthText!: Phaser.GameObjects.Text;

  public static GNOME_IMAGE = "voxel_gnome";
  public static TILE_SPRITESHEET = "voxel_tiles";
  public static PLAYER_SPRITESHEET = "voxel_players";
  public static PARTICLE_SPRITESHEET = "voxel_particles";
  public static ITEM_SPRITESHEET = "voxel_items";

  preload() {
    this.load.image(Game.GNOME_IMAGE, "assets/images/gnome.png");
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
    this.load.atlasXML(
      Game.PLAYER_SPRITESHEET,
      "../assets/spritesheets/spritesheet_characters.png",
      "../assets/spritesheets/spritesheet_characters.xml"
    );
    this.load.atlasXML(
      Game.ITEM_SPRITESHEET,
      "../assets/spritesheets/spritesheet_items.png",
      "../assets/spritesheets/spritesheet_items.xml"
    );
  }

  create() {
    const camera = this.cameras.main;

    // hard-coding a large window for now.
    // const width = 5120;
    // const height = 7168;
    // const [width, height] = [1280, 1280];
    const [width, height] = [5120, 7168];

    this.mapLoader = new MapLoader(this, width, height);
    this.player = new Player(this, width / 2 + TILE_SIZE / 2, 0);
    this.physics.add.collider(this.player.sprite, this.mapLoader.layer);

    camera.setBounds(0, 0, width, 100_000_000);
    camera.startFollow(this.player.sprite);

    // this.marker = new MouseTileMarker(this, this.chunkManager.map);
    this.particles = this.add.particles(Game.PARTICLE_SPRITESHEET);
    this.depthText = this.add
      .text(20, 20, "Hole Depth: 0m", {
        fontSize: "32px",
        fill: "#000",
      })
      .setDepth(100)
      .setScrollFactor(0);
  }

  // canDig(worldX, worldY): boolean {
  //   // is the tile earth
  //   // is the tile directly adjacent to the player
  //   // if not, is it on a diagonal but can be reached
  //   this.chunkManager.map.worldToTileXY;
  //   this.chunkManager.map.getTileAtWorldXY(
  //     this.player.sprite.x,
  //     this.player.sprite.y
  //   );
  // }

  // canPlace(worldX, worldY): boolean {
  //   // is the tile empty
  //   // if we are above the surface, is there earth adjacent ot the tile
  //   // are we on the tile? if so, is the space above us open
  //   // are we next to the tile
  //   this.chunkManager.map.getTileAtWorldXY(
  //     this.player.sprite.x,
  //     this.player.sprite.y
  //   );
  // }

  hasDirt: boolean = false;
  lastDug = 0;
  update(time: number, delta: number) {
    this.player.update();
    // world-wrapping
    if (this.player.sprite.x < this.cameras.main.width / 2) {
      this.player.sprite.setX(
        this.mapLoader.width - this.cameras.main.width / 2
      );
    }
    if (
      this.player.sprite.x >
      this.mapLoader.width - this.cameras.main.width / 2
    ) {
      this.player.sprite.setX(this.cameras.main.width / 2);
    }
    const camera = this.cameras.main;
    const viewport = new Phaser.Geom.Rectangle(
      camera.scrollX,
      camera.scrollY,
      camera.width,
      camera.height
    );
    this.mapLoader.update(viewport);
    this.depthText.setText(`Hole Depth: ${this.mapLoader.holeDepth()}m`);
    // this.chunkManager.update(viewport);
    // this.marker.update();
    const pointer = this.input.activePointer;
    if (pointer.isDown && time - this.lastDug > 500 /* millis */) {
      this.lastDug = time;
      const worldPoint = pointer.positionToCamera(
        camera
      ) as Phaser.Math.Vector2;
      const tilePoint = this.mapLoader.worldToTileXY(
        worldPoint.x,
        worldPoint.y
      );
      console.log(
        `clicked world point ${[worldPoint.x, worldPoint.y]} tile point ${[
          tilePoint.x,
          tilePoint.y,
        ]}`
      );

      const playerTile = this.mapLoader.worldToTileXY(
        this.player.sprite.x,
        this.player.sprite.y
      );
      const clickedTile = this.mapLoader.worldToTileXY(
        worldPoint.x,
        worldPoint.y
      );

      if (
        Math.abs(playerTile.x - clickedTile.x) > 1 ||
        Math.abs(playerTile.y - clickedTile.y) > 1 ||
        (playerTile.x == clickedTile.x && clickedTile.y == playerTile.y - 1)
      ) {
        return;
      }

      if (
        this.mapLoader.canDigAtWorldXY(worldPoint.x, worldPoint.y) &&
        !this.hasDirt
      ) {
        this.mapLoader.digTileAtWorldXY(worldPoint.x, worldPoint.y);
        this.cameras.main.shake(20, 0.005);

        this.particles
          .createEmitter({
            frame: "square_orange.png",
            x: 0,
            y: 0,
            lifespan: 300,
            speed: { min: 300, max: 500 },
            scale: { start: 1, end: 0 },
          })
          .explode(10, worldPoint.x, worldPoint.y);
        this.hasDirt = true;
      } else if (
        this.mapLoader.canUnDigAtWorldXY(worldPoint.x, worldPoint.y) &&
        this.hasDirt
      ) {
        this.mapLoader.unDigTileAtWorldXY(worldPoint.x, worldPoint.y);
        this.hasDirt = false;
        if (playerTile.equals(clickedTile)) {
          this.player.jump();
        }
      }
    }
  }
}