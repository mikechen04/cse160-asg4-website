// camera.js

class Camera {
  constructor(canvas) {
    this.fov = 60.0;

    // start the player above the ground looking into the world
    this.eye = new Vector3([0, 2.0, 6.0]);
    this.at  = new Vector3([0, 2.0, 5.0]);
    this.up  = new Vector3([0, 1, 0]);

    // yaw/pitch in degrees (mouse look)
    this.yaw = 0.0;   // 0 means looking down -z
    this.pitch = 0.0; // positive looks up

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();

    // build starting matrices
    this.updateAtFromAngles();
    this.updateView();
    this.updateProjection(canvas);
  }

  updateAtFromAngles() {
    // convert degrees to radians
    let yawRad = this.yaw * Math.PI / 180.0;
    let pitchRad = this.pitch * Math.PI / 180.0;

    // forward direction
    // yaw rotates around y axis, pitch rotates up/down
    let fx = Math.cos(pitchRad) * Math.sin(yawRad);
    let fy = Math.sin(pitchRad);
    let fz = -Math.cos(pitchRad) * Math.cos(yawRad);

    this.at.elements[0] = this.eye.elements[0] + fx;
    this.at.elements[1] = this.eye.elements[1] + fy;
    this.at.elements[2] = this.eye.elements[2] + fz;
  }

  updateView() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );
  }

  updateProjection(canvas) {
    // canvas might not be ready yet in some cases, but it should be in our program
    var aspect = canvas.width / canvas.height;
    this.projectionMatrix.setPerspective(this.fov, aspect, 0.1, 1000);
  }

  moveForward(speed) {
    // move on xz plane so you dont "fly" when looking up/down
    let f = this.getForwardXZ();
    this.eye.elements[0] += f[0] * speed;
    this.eye.elements[2] += f[2] * speed;
    this.updateAtFromAngles();
    this.updateView();
  }

  moveBackwards(speed) {
    let f = this.getForwardXZ();
    this.eye.elements[0] -= f[0] * speed;
    this.eye.elements[2] -= f[2] * speed;
    this.updateAtFromAngles();
    this.updateView();
  }

  moveLeft(speed) {
    let r = this.getRightXZ();
    this.eye.elements[0] -= r[0] * speed;
    this.eye.elements[2] -= r[2] * speed;
    this.updateAtFromAngles();
    this.updateView();
  }

  moveRight(speed) {
    let r = this.getRightXZ();
    this.eye.elements[0] += r[0] * speed;
    this.eye.elements[2] += r[2] * speed;
    this.updateAtFromAngles();
    this.updateView();
  }

  // yaw left/right (keyboard Q/E + mouse dx)
  panYaw(alpha) {
    this.yaw += alpha;
    // keep yaw in a reasonable range so numbers dont explode
    if (this.yaw > 360) this.yaw -= 360;
    if (this.yaw < -360) this.yaw += 360;
    this.updateAtFromAngles();
    this.updateView();
  }

  // pitch up/down (mouse dy)
  panPitch(alpha) {
    this.pitch += alpha;
    if (this.pitch > 89) this.pitch = 89;
    if (this.pitch < -89) this.pitch = -89;
    this.updateAtFromAngles();
    this.updateView();
  }

  // return forward vector for movement (xz only)
  getForwardXZ() {
    let yawRad = this.yaw * Math.PI / 180.0;
    let fx = Math.sin(yawRad);
    let fz = -Math.cos(yawRad);
    // normalize just in case
    let len = Math.sqrt(fx*fx + fz*fz) || 1;
    return [fx/len, 0, fz/len];
  }

  // right vector in xz plane
  getRightXZ() {
    let yawRad = this.yaw * Math.PI / 180.0;
    let rx = Math.cos(yawRad);
    let rz = Math.sin(yawRad);
    let len = Math.sqrt(rx*rx + rz*rz) || 1;
    return [rx/len, 0, rz/len];
  }
}

// ---- tiny helpers for cuon-matrix Vector3 (it only ships with normalize) ----
// just patching the prototype is easiest for this class assignment
if (typeof Vector3 !== 'undefined') {
  if (!Vector3.prototype.set) {
    Vector3.prototype.set = function(v) {
      // v can be Vector3 or array
      if (v.elements) {
        this.elements[0] = v.elements[0];
        this.elements[1] = v.elements[1];
        this.elements[2] = v.elements[2];
      } else {
        this.elements[0] = v[0];
        this.elements[1] = v[1];
        this.elements[2] = v[2];
      }
      return this;
    };
  }

  if (!Vector3.prototype.add) {
    Vector3.prototype.add = function(v) {
      this.elements[0] += v.elements[0];
      this.elements[1] += v.elements[1];
      this.elements[2] += v.elements[2];
      return this;
    };
  }

  if (!Vector3.prototype.sub) {
    Vector3.prototype.sub = function(v) {
      this.elements[0] -= v.elements[0];
      this.elements[1] -= v.elements[1];
      this.elements[2] -= v.elements[2];
      return this;
    };
  }

  if (!Vector3.prototype.mul) {
    Vector3.prototype.mul = function(s) {
      this.elements[0] *= s;
      this.elements[1] *= s;
      this.elements[2] *= s;
      return this;
    };
  }

  if (!Vector3.cross) {
    Vector3.cross = function(a, b) {
      // returns new Vector3 = a x b
      let ae = a.elements;
      let be = b.elements;
      return new Vector3([
        ae[1] * be[2] - ae[2] * be[1],
        ae[2] * be[0] - ae[0] * be[2],
        ae[0] * be[1] - ae[1] * be[0]
      ]);
    };
  }
}


