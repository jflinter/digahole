import Phaser from "phaser";
import _ from "lodash";

import Player from "./Player";
import { mobile } from "./isMobile";

import Reticle from "./Reticle";
import MapLoader, { TILE_SIZE } from "./MapLoader";
import { TileKey } from "./TileKey";
import { UIScene_Key } from "./UI";
import store, { setHoleDepth, setShovelContents } from "./store";

export const GAMESCENE_KEY = "game-scene";
const PARTICLE_SPRITESHEET = "voxel_particles";

/**
 * A class that extends Phaser.Scene and wraps up the core logic for the platformer level.
 */
export default class Game extends Phaser.Scene {
  player!: Player;
  marker?: Reticle;
  spikeGroup!: Phaser.Physics.Arcade.StaticGroup;
  particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
  mapLoader!: MapLoader;

  preload() {
    Player.preload(this);
    MapLoader.preload(this);
    this.load.atlasXML(
      PARTICLE_SPRITESHEET,
      "assets/spritesheets/spritesheet_particles.png",
      "assets/spritesheets/spritesheet_particles.xml"
    );
  }

  constructor() {
    super(GAMESCENE_KEY);
  }

  create() {
    this.physics.world.setFPS(120);
    const camera = this.cameras.main;

    const [width, height] = [5120, 7168];

    this.mapLoader = new MapLoader(this, width, height);
    this.player = new Player(this, width / 2 + TILE_SIZE / 2, 0);
    this.physics.add.collider(this.player.sprite, this.mapLoader.layer);

    camera.setBounds(0, 0, width, 100_000_000);
    camera.startFollow(this.player.sprite);

    if (mobile) {
      camera.setZoom(1.5);
    } else {
      this.marker = new Reticle(this, this.mapLoader);
    }

    this.particles = this.add.particles(PARTICLE_SPRITESHEET);
    this.scene.run(UIScene_Key);
    this.scene.bringToTop(UIScene_Key);
  }

  canActionAtWorldXY(x: integer, y: integer): boolean {
    const playerTile = this.mapLoader.worldToTileXY(
      this.player.sprite.x,
      this.player.sprite.y
    );
    const clickedTile = this.mapLoader.worldToTileXY(x, y);
    const abovePlayer = playerTile.clone().add(new Phaser.Math.Vector2(0, -1));
    if (
      Math.abs(playerTile.x - clickedTile.x) > 1 ||
      Math.abs(playerTile.y - clickedTile.y) > 1 ||
      (_.isEqual(playerTile, clickedTile) &&
        this.mapLoader.canDigAtTile(abovePlayer))
    ) {
      return false;
    }
    if (store.getState().player.shovelContents) {
      return this.mapLoader.canUnDigAtWorldXY(x, y);
    } else {
      return this.mapLoader.canDigAtWorldXY(x, y);
    }
  }

  lastDug = 0;
  update(time: number, delta: number) {
    this.player.update();
    this.marker?.update();
    // world-wrapping
    // if (this.player.sprite.x < 0) {
    //   this.player.sprite.setX(this.mapLoader.width - this.player.sprite.width);
    // }
    // if (this.player.sprite.x > this.mapLoader.width) {
    //   this.player.sprite.setX(0);
    // }
    if (this.player.sprite.x < this.player.sprite.width) {
      this.player.sprite.setX(this.player.sprite.width);
    }
    if (
      this.player.sprite.x >
      this.mapLoader.width - this.player.sprite.width
    ) {
      this.player.sprite.setX(this.mapLoader.width - this.player.sprite.width);
    }
    const camera = this.cameras.main;
    const pointer = this.input.activePointer;
    // throttle digging
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

      if (!this.canActionAtWorldXY(worldPoint.x, worldPoint.y)) {
        return;
      }

      const existingType = this.mapLoader.getTileAtWorldXY(
        worldPoint.x,
        worldPoint.y
      ).index as TileKey;

      const playerTile = this.mapLoader.worldToTileXY(
        this.player.sprite.x,
        this.player.sprite.y
      );
      const clickedTile = this.mapLoader.worldToTileXY(
        worldPoint.x,
        worldPoint.y
      );

      const shovelContents = store.getState().player.shovelContents;
      if (shovelContents) {
        this.mapLoader.unDigTileAtWorldXY(
          worldPoint.x,
          worldPoint.y,
          shovelContents
        );
        store.dispatch(setShovelContents(null));
        if (playerTile.equals(clickedTile)) {
          this.player.jump();
        }
      } else {
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
        store.dispatch(setShovelContents(existingType));
      }
      const [depth, _hasCaverns] = this.mapLoader.holeDepth();
      store.dispatch(setHoleDepth(depth));
    }
  }
}
