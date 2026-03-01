class Sphere {
  constructor(latBands, longBands) {
    this.type = 'sphere';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.latBands = latBands || 16;
    this.longBands = longBands || 16;

    this.vertices = null;
    this.normals = null;
    this.posBuffer = null;
    this.normalBuffer = null;
    this.vertexCount = 0;

    this.buildMesh();
  }

  buildMesh() {
    // sphere centered at origin with radius 0.5
    let verts = [];
    let norms = [];

    for (let lat = 0; lat < this.latBands; lat++) {
      let t0 = (lat / this.latBands) * Math.PI;
      let t1 = ((lat + 1) / this.latBands) * Math.PI;

      for (let lon = 0; lon < this.longBands; lon++) {
        let p0 = (lon / this.longBands) * Math.PI * 2.0;
        let p1 = ((lon + 1) / this.longBands) * Math.PI * 2.0;

        let a = this.makeSpherePoint(t0, p0);
        let b = this.makeSpherePoint(t1, p0);
        let c = this.makeSpherePoint(t1, p1);
        let d = this.makeSpherePoint(t0, p1);

        // tri 1: a b c
        verts.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
        norms.push(a[3], a[4], a[5], b[3], b[4], b[5], c[3], c[4], c[5]);

        // tri 2: a c d
        verts.push(a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
        norms.push(a[3], a[4], a[5], c[3], c[4], c[5], d[3], d[4], d[5]);
      }
    }

    this.vertices = new Float32Array(verts);
    this.normals = new Float32Array(norms);
    this.vertexCount = this.vertices.length / 3;
  }

  makeSpherePoint(theta, phi) {
    // unit sphere normal first
    let nx = Math.sin(theta) * Math.cos(phi);
    let ny = Math.cos(theta);
    let nz = Math.sin(theta) * Math.sin(phi);

    // position is radius 0.5
    let px = nx * 0.5;
    let py = ny * 0.5;
    let pz = nz * 0.5;
    return [px, py, pz, nx, ny, nz];
  }

  ensureBuffers() {
    if (!this.posBuffer) {
      this.posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    }

    if (!this.normalBuffer) {
      this.normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
    }
  }

  render() {
    this.ensureBuffers();
    setModelAndNormalMatrices(this.matrix);

    if (typeof u_UseTexture !== 'undefined' && u_UseTexture !== null) {
      gl.uniform1i(u_UseTexture, 0);
    }
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
  }
}
