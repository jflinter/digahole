import Phaser from "phaser";
import _ from "lodash";

import Player from "./Player";
import { mobile } from "./isMobile";

import Reticle from "./Reticle";
import MapLoader, { TILE_SIZE } from "./MapLoader";
import { TileKey } from "./TileKey";
import { UIScene_Key } from "./UI";
import store, {
  setHoleDepth,
  setShovelContents,
  hasTouchedPortal,
  addChange,
} from "./store";
import { getKeys } from "./Keys";

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
  shovelContentsEnabled: boolean = true;
  static instance: Game;

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
    Game.instance = this;
    this.physics.world.setFPS(120);
    const camera = this.cameras.main;

    const [width, height] = [5120, 71680];

    this.mapLoader = new MapLoader(this, width, height);
    this.player = new Player(this, width / 2 + TILE_SIZE / 2, 0);
    this.physics.add.collider(this.player.sprite, this.mapLoader.layer);

    camera.setBounds(0, 0, width, 100_000_000);
    camera.startFollow(this.player.sprite);

    if (mobile) {
      camera.setZoom(1.5);
    } else {
      // DEBUG
      // camera.setZoom(0.2);
      this.marker = new Reticle(this, this.mapLoader);
    }

    this.particles = this.add.particles(PARTICLE_SPRITESHEET);
    this.scene.run(UIScene_Key);
    this.scene.bringToTop(UIScene_Key);
  }

  playerTile() {
    return this.mapLoader.worldToTileXY(
      this.player.sprite.x,
      this.player.sprite.y
    );
  }

  playerTileType(): TileKey | null {
    return this.mapLoader.getTileAtTileXY(this.playerTile())?.index as TileKey;
  }

  canActionAtWorldXY(x: integer, y: integer): boolean {
    const playerTile = this.playerTile();
    const clickedTile = this.mapLoader.worldToTileXY(x, y);
    const abovePlayer = playerTile.clone().add(new Phaser.Math.Vector2(0, -1));
    if (
      Math.abs(playerTile.x - clickedTile.x) > 1 ||
      Math.abs(playerTile.y - clickedTile.y) > 1
    ) {
      return false;
    }
    if (store.getState().player.shovelContents) {
      if (
        _.isEqual(playerTile, clickedTile) &&
        !this.mapLoader.canUndigAtTile(abovePlayer)
      ) {
        return false;
      }
      return this.mapLoader.canUnDigAtWorldXY(x, y);
    } else {
      return this.mapLoader.canDigAtWorldXY(x, y);
    }
  }

  digThrottled = false;
  warpThrottled = false;
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
    const playerTile = this.playerTile();
    const playerTileType = this.playerTileType();
    if (
      playerTileType === TileKey.PORTAL_BLUE ||
      playerTileType === TileKey.PORTAL_ORANGE
    ) {
      store.dispatch(hasTouchedPortal());
      if (getKeys().up) {
        if (!this.warpThrottled && !getKeys().left && !getKeys().right) {
          this.warpThrottled = true;
          this.warp();
        }
      } else {
        this.warpThrottled = false;
      }
    }
    if (!pointer.isDown) {
      this.digThrottled = false;
      return;
    }
    if (this.digThrottled) {
      return;
    }
    this.digThrottled = true;
    const worldPoint = pointer.positionToCamera(camera) as Phaser.Math.Vector2;
    const tilePoint = this.mapLoader.worldToTileXY(worldPoint.x, worldPoint.y);
    console.log(
      `clicked world point ${[worldPoint.x, worldPoint.y]} tile point ${[
        tilePoint.x,
        tilePoint.y,
      ]}. player tile is ${[playerTile.x, playerTile.y]}`
    );

    if (!this.canActionAtWorldXY(worldPoint.x, worldPoint.y)) {
      return;
    }

    const existingType = this.mapLoader.getTileAtWorldXY(
      worldPoint.x,
      worldPoint.y
    ).index as TileKey;

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
      if (
        playerTile.equals(clickedTile) &&
        ![TileKey.PORTAL_BLUE, TileKey.PORTAL_ORANGE].includes(shovelContents)
      ) {
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
      if (this.shovelContentsEnabled) {
        store.dispatch(setShovelContents(existingType));
      }
    }
    const [depth, _hasCaverns] = this.mapLoader.holeDepth();
    store.dispatch(setHoleDepth(depth));
  }

  warp() {
    const currentTileType = this.playerTileType();
    if (
      !currentTileType ||
      ![TileKey.PORTAL_BLUE, TileKey.PORTAL_ORANGE].includes(currentTileType)
    ) {
      return;
    }
    const { shovelContents, orangeTilePoint } = store.getState().player;
    if (
      shovelContents === TileKey.PORTAL_BLUE ||
      shovelContents === TileKey.PORTAL_ORANGE
    ) {
      return;
    }
    if (!orangeTilePoint) {
      this.mapLoader.placeInitialOrangeTile();
    }
    const player = store.getState().player;
    const destination =
      currentTileType === TileKey.PORTAL_BLUE
        ? player.orangeTilePoint
        : player.blueTilePoint;
    if (destination) {
      this.warpTo(destination[0], destination[1]);
    }
  }

  warping = false;
  warpTo(worldX, worldY) {
    if (this.warping) {
      return;
    }
    console.log("warrrpppp");
    this.warping = true;
    const camera = this.cameras.main;
    const distance = Phaser.Math.Distance.BetweenPoints(
      new Phaser.Math.Vector2(worldX, worldY),
      new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y)
    );
    console.log([worldX, worldY]);
    console.log([camera.centerX, camera.centerY]);
    console.log(JSON.stringify(distance));
    const speed = 10.0;
    const duration = distance / speed;

    camera.shake(duration, 0.01);
    this.add.tween({
      targets: [this.player.sprite],
      x: worldX,
      y: worldY,
      duration: duration,
      ease: "Quad.easeInOut",
      onComplete: () => (this.warping = false),
    });
  }
}
