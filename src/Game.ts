import Phaser from "phaser";
import _ from "lodash";

import Player from "./Player";
import PersistentStore from "./PersistentStore";
import MouseTileMarker from "./MouseTileMarker";
import MapLoader, { TILE_SIZE } from "./MapLoader";

const PARTICLE_SPRITESHEET = "voxel_particles";

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

  preload() {
    Player.preload(this);
    MapLoader.preload(this);
    this.load.atlasXML(
      PARTICLE_SPRITESHEET,
      "assets/spritesheets/spritesheet_particles.png",
      "assets/spritesheets/spritesheet_particles.xml"
    );
  }

  create() {
    const store = PersistentStore.shared();
    this.physics.world.setFPS(120);
    const camera = this.cameras.main;

    const [width, height] = [5120, 7168];

    this.mapLoader = new MapLoader(this, store.getRandomSeed(), width, height);
    this.player = new Player(this, width / 2 + TILE_SIZE / 2, 0);
    this.physics.add.collider(this.player.sprite, this.mapLoader.layer);

    camera.setBounds(0, 0, width, 100_000_000);
    camera.startFollow(this.player.sprite);

    // this.marker = new MouseTileMarker(this, this.chunkManager.map);
    this.particles = this.add.particles(PARTICLE_SPRITESHEET);
    this.depthText = this.add
      .text(20, 20, `Hole Depth: ${this.mapLoader.holeDepth()}m`, {
        fontSize: "32px",
        fill: "#000",
      })
      .setDepth(100)
      .setScrollFactor(0);
  }

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

      const playerTile = this.mapLoader.worldToTileXY(
        this.player.sprite.x,
        this.player.sprite.y
      );
      const clickedTile = this.mapLoader.worldToTileXY(
        worldPoint.x,
        worldPoint.y
      );

      const abovePlayer = playerTile
        .clone()
        .add(new Phaser.Math.Vector2(0, -1));

      if (
        Math.abs(playerTile.x - clickedTile.x) > 1 ||
        Math.abs(playerTile.y - clickedTile.y) > 1 ||
        (_.isEqual(playerTile, clickedTile) &&
          this.mapLoader.canDigAtTile(abovePlayer))
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
        this.depthText.setText(`Hole Depth: ${this.mapLoader.holeDepth()}m`);
      } else if (
        this.mapLoader.canUnDigAtWorldXY(worldPoint.x, worldPoint.y) &&
        this.hasDirt
      ) {
        this.mapLoader.unDigTileAtWorldXY(worldPoint.x, worldPoint.y);
        this.hasDirt = false;
        this.depthText.setText(`Hole Depth: ${this.mapLoader.holeDepth()}m`);
        if (playerTile.equals(clickedTile)) {
          this.player.jump();
        }
      }
    }
  }
}
