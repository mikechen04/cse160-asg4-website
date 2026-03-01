class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.useTexture = false;
    this.textureIndex = 0;
  }

  render() {
    // cube is centered so translate by center works nicely
    let model = new Matrix4(this.matrix);
    model.translate(-0.5, -0.5, -0.5);
    setModelAndNormalMatrices(model);

    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    if (typeof u_UseTexture !== 'undefined' && u_UseTexture !== null) {
      gl.uniform1i(u_UseTexture, this.useTexture ? 1 : 0);
    }

    if (
      this.useTexture &&
      typeof g_textures !== 'undefined' &&
      g_textures[this.textureIndex]
    ) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, g_textures[this.textureIndex]);
      if (typeof u_Sampler0 !== 'undefined' && u_Sampler0 !== null) {
        gl.uniform1i(u_Sampler0, 0);
      }
    }

    if (!Cube._posBuffer) {
      Cube._posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube._posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, Cube._verts, gl.STATIC_DRAW);
    }

    if (!Cube._normalBuffer) {
      Cube._normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube._normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, Cube._normals, gl.STATIC_DRAW);
    }

    if (!Cube._uvBuffer) {
      Cube._uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube._uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, Cube._uvs, gl.STATIC_DRAW);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._posBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.bindBuffer(gl.ARRAY_BUFFER, Cube._uvBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}

Cube._posBuffer = null;
Cube._normalBuffer = null;
Cube._uvBuffer = null;

// 12 triangles, 36 vertices
Cube._verts = new Float32Array([
  // front (z=1)
  0,0,1,  1,0,1,  1,1,1,
  0,0,1,  1,1,1,  0,1,1,

  // back (z=0)
  0,0,0,  1,1,0,  1,0,0,
  0,0,0,  0,1,0,  1,1,0,

  // left (x=0)
  0,0,0,  0,0,1,  0,1,1,
  0,0,0,  0,1,1,  0,1,0,

  // right (x=1)
  1,0,0,  1,1,1,  1,0,1,
  1,0,0,  1,1,0,  1,1,1,

  // top (y=1)
  0,1,0,  0,1,1,  1,1,1,
  0,1,0,  1,1,1,  1,1,0,

  // bottom (y=0)
  0,0,0,  1,0,1,  0,0,1,
  0,0,0,  1,0,0,  1,0,1
]);

Cube._normals = new Float32Array([
  // front
  0,0,1,  0,0,1,  0,0,1,
  0,0,1,  0,0,1,  0,0,1,
  // back
  0,0,-1, 0,0,-1, 0,0,-1,
  0,0,-1, 0,0,-1, 0,0,-1,
  // left
  -1,0,0, -1,0,0, -1,0,0,
  -1,0,0, -1,0,0, -1,0,0,
  // right
  1,0,0,  1,0,0,  1,0,0,
  1,0,0,  1,0,0,  1,0,0,
  // top
  0,1,0,  0,1,0,  0,1,0,
  0,1,0,  0,1,0,  0,1,0,
  // bottom
  0,-1,0, 0,-1,0, 0,-1,0,
  0,-1,0, 0,-1,0, 0,-1,0
]);

Cube._uvs = new Float32Array([
  // front
  0,0, 1,0, 1,1,
  0,0, 1,1, 0,1,

  // back
  0,0, 1,1, 1,0,
  0,0, 0,1, 1,1,

  // left
  0,0, 1,0, 1,1,
  0,0, 1,1, 0,1,

  // right
  0,0, 1,0, 1,1,
  0,0, 1,1, 0,1,

  // top
  0,0, 1,0, 1,1,
  0,0, 1,1, 0,1,

  // bottom
  0,0, 1,0, 1,1,
  0,0, 1,1, 0,1
]);
