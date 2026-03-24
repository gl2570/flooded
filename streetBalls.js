// streetBalls.js - 弹力球物理效果模块（修复弹跳版本）
import {
  World,
  Body,
  Sphere,
  Plane,
  Vec3,
  Material,
  ContactMaterial
} from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.1/three.module.min.js';
export class StreetBalls {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.world = null;
    this.balls = [];
    this.physicsBodies = [];
    this.isRaining = false;
    this.ballInterval = null;
    this.totalBallsTarget = 500;
    this.ballsCreated = 0;
    // 倾倒参数
    this.dropStartZ = -180;
    this.dropEndZ = 0;
    this.dropHeight = 50;
    this.dropWidth = 50;
    this.currentDropZ = this.dropStartZ;
    this.colors = [
      0xff0000, 0xff3300, 0xff6600, 0xff9900, 0xffcc00,
      0xffff00, 0xccff00, 0x99ff00, 0x66ff00, 0x33ff00,
      0x00ff00, 0x00ff33, 0x00ff66, 0x00ff99, 0x00ffcc,
      0x00ffff, 0x00ccff, 0x0099ff, 0x0066ff, 0x0033ff,
      0x0000ff, 0x3300ff, 0x6600ff, 0x9900ff, 0xcc00ff,
      0xff00ff, 0xff00cc, 0xff0099, 0xff0066, 0xff0033,
      0xffffff, 0xffaaaa, 0xaaffaa, 0xaaaaff, 0xffffaa
    ];
    this.initPhysics();
    this.setupLights();
  }
  initPhysics() {
    this.world = new World({
      gravity: new Vec3(0, -30, 0), // 较强重力
    });
    // 创建共享材质
    this.groundMaterial = new Material('ground');
    this.ballMaterial = new Material('ball');
    // 关键：创建接触材质定义球与地面的碰撞属性
    const ballGroundContact = new ContactMaterial(
      this.groundMaterial,
      this.ballMaterial, {
        friction: 0.1, // 低摩擦
        restitution: 0.9 // 极高弹性 - 接近完美弹性碰撞
      }
    );
    this.world.addContactMaterial(ballGroundContact);
    // 球与球的碰撞属性
    const ballBallContact = new ContactMaterial(
      this.ballMaterial,
      this.ballMaterial, {
        friction: 0.1,
        restitution: 0.15 // 球之间也很弹
      }
    );
    this.world.addContactMaterial(ballBallContact);
    // 创建水平地面（不倾斜，让球自然弹跳堆积）
    const groundShape = new Plane();
    const groundBody = new Body({
      mass: 0,
      shape: groundShape,
      position: new Vec3(0, -8, 0),
      material: this.groundMaterial // 应用材质
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // 完全水平
    this.world.addBody(groundBody);
    this.createBoundaries();
  }
  createBoundaries() {
    const wallShape = new Plane();
    const wallMaterial = new Material('wall');
    // 创建球与墙的接触材质
    const ballWallContact = new ContactMaterial(
      this.ballMaterial,
      wallMaterial, {
        friction: 0.1,
        restitution: 0.9
      }
    );
    this.world.addContactMaterial(ballWallContact);
    // 左右墙
    const leftWall = new Body({
      mass: 0,
      shape: wallShape,
      position: new Vec3(-this.dropWidth, 0, 0),
      material: wallMaterial
    });
    leftWall.quaternion.setFromEuler(0, Math.PI / 2, 0);
    this.world.addBody(leftWall);
    const rightWall = new Body({
      mass: 0,
      shape: wallShape,
      position: new Vec3(this.dropWidth, 0, 0),
      material: wallMaterial
    });
    rightWall.quaternion.setFromEuler(0, -Math.PI / 2, 0);
    this.world.addBody(rightWall);
    // 后墙
    const backWall = new Body({
      mass: 0,
      shape: wallShape,
      position: new Vec3(0, 0, this.dropStartZ - 10),
      material: wallMaterial
    });
    this.world.addBody(backWall);
    // 前墙（透明，防止球砸相机）
    const frontWall = new Body({
      mass: 0,
      shape: wallShape,
      position: new Vec3(0, 0, this.dropEndZ + 5),
      material: wallMaterial
    });
    frontWall.quaternion.setFromEuler(0, Math.PI, 0);
    this.world.addBody(frontWall);
  }
  setupLights() {
    const ballLight = new THREE.PointLight(0xffffff, 1.0, 150);
    ballLight.position.set(0, 40, -30);
    this.scene.add(ballLight);
    this.ballLight = ballLight;
    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.5);
    fillLight.position.set(0, 20, 50);
    this.scene.add(fillLight);
  }
  createBall() {
    const progress = this.ballsCreated / this.totalBallsTarget;
    const targetZ = this.dropStartZ + (this.dropEndZ - this.dropStartZ) * progress;
    const radius = 0.5 + Math.random() * 0.6;
    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    // 从远处高空生成，向近处抛射
    const spreadX = this.dropWidth * (0.8 + progress * 0.4);
    const x = (Math.random() - 0.5) * spreadX * 2;
    const y = this.dropHeight + Math.random() * 20;
    // Z轴散布，形成"浪"的效果
    const z = targetZ + (Math.random() - 0.5) * 15;
    // Three.js 网格
    const geometry = new THREE.SphereGeometry(radius, 24, 24);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 200,
      specular: 0xaaaaaa,
      emissive: color,
      emissiveIntensity: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.balls.push(mesh);
    // Cannon.js 物理体 - 关键修复
    const shape = new Sphere(radius);
    const body = new Body({
      mass: 1,
      shape: shape,
      position: new Vec3(x, y, z),
      material: this.ballMaterial, // 使用共享的球材质
      linearDamping: 0.003, // 几乎无阻尼
      angularDamping: 0.003, // 几乎无阻尼
      // allowSleep: false // 禁止休眠，保持运动
    });
    // 给球向前的初速度（向相机方向）
    body.velocity.set(
      (Math.random() - 0.5) * 3, // 轻微横向
      -10 - Math.random() * 10, // 向下速度
      8 + Math.random() * 12 // 向前的速度（关键！）
    );
    // 随机旋转
    body.angularVelocity.set(
      Math.random() * 10,
      Math.random() * 10,
      Math.random() * 10
    );
    this.world.addBody(body);
    this.physicsBodies.push(body);
    this.ballsCreated++;
    return {
      mesh,
      body
    };
  }
  startRain() {
    if (this.isRaining) return;
    this.isRaining = true;
    this.ballsCreated = 0;
    console.log(`🌊 开始倾倒 ${this.totalBallsTarget} 个弹力球...`);
    // 快速生成，但分批避免卡顿
    const batchSize = 15;
    this.ballInterval = setInterval(() => {
      for (let i = 0; i < batchSize; i++) {
        if (this.ballsCreated >= this.totalBallsTarget) {
          this.stopRain();
          console.log('✅ 5000个弹力球倾倒完成！');
          return;
        }
        this.createBall();
      }
      if (this.ballsCreated % 1000 === 0) {
        const progress = (this.ballsCreated / this.totalBallsTarget * 100).toFixed(1);
        console.log(`进度: ${progress}%`);
      }
    }, 10);
  }
  stopRain() {
    if (this.ballInterval) {
      clearInterval(this.ballInterval);
      this.ballInterval = null;
    }
    this.isRaining = false;
  }
  clearAll() {
    this.stopRain();
    this.ballsCreated = 0;
    while (this.balls.length > 0) {
      const mesh = this.balls.pop();
      const body = this.physicsBodies.pop();
      this.scene.remove(mesh);
      this.world.removeBody(body);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    console.log('🧹 清除完成');
  }
  explode() {
    this.physicsBodies.forEach(body => {
      body.velocity.set(
        (Math.random() - 0.5) * 40,
        30 + Math.random() * 20,
        (Math.random() - 0.5) * 40
      );
      body.angularVelocity.set(
        Math.random() * 30,
        Math.random() * 30,
        Math.random() * 30
      );
    });
    console.log('💥 爆炸！');
  }
  update(deltaTime = 1 / 60) {
    if (!this.world) return;
    // 固定时间步长确保物理稳定
    this.world.step(1 / 60);
    // 同步
    for (let i = 0; i < this.balls.length; i++) {
      const mesh = this.balls[i];
      const body = this.physicsBodies[i];
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
      // 重置掉出世界的球
      if (body.position.y < -50) {
        body.position.set(
          (Math.random() - 0.5) * 20,
          this.dropHeight,
          this.dropStartZ + Math.random() * 20
        );
        body.velocity.set(0, -5, 10);
      }
    }
    // 光源跟随
    if (this.ballLight && this.balls.length > 50) {
      const recentBall = this.balls[this.balls.length - 1];
      this.ballLight.position.z = recentBall.position.z;
    }
  }
  getBallCount() {
    return this.balls.length;
  }
}
export function createStreetBalls(scene, camera) {
  return new StreetBalls(scene, camera);
}
