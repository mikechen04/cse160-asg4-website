class OBJModel {
  constructor(url) {
    this.url = url;
    this.matrix = new Matrix4();
    this.color = [0.8, 0.8, 0.8, 1.0];
    this.loaded = false;
    this.vertices = null;
    this.normals = null;
    this.vertexCount = 0;
    this.posBuffer = null;
    this.normalBuffer = null;
  }

  load(onDone) {
    fetch(this.url)
      .then((res) => {
        if (!res.ok) throw new Error('obj fetch failed');
        return res.text();
      })
      .then((txt) => {
        this.parseOBJ(txt);
        this.loaded = true;
        if (onDone) onDone(true);
      })
      .catch((e) => {
        console.log('obj load error:', e);
        this.loaded = false;
        if (onDone) onDone(false);
      });
  }

  parseOBJ(text) {
    let rawPos = [];
    let rawNormals = [];
    let outPos = [];
    let outNormals = [];

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0 || line[0] === '#') continue;
      const parts = line.split(/\s+/);

      if (parts[0] === 'v') {
        rawPos.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      } else if (parts[0] === 'vn') {
        rawNormals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
      } else if (parts[0] === 'f') {
        // fan triangulation for faces with 3+ points
        for (let k = 2; k < parts.length - 1; k++) {
          const tri = [parts[1], parts[k], parts[k + 1]];
          this.pushFaceTri(tri, rawPos, rawNormals, outPos, outNormals);
        }
      }
    }

    this.vertices = new Float32Array(outPos);
    this.normals = new Float32Array(outNormals);
    this.vertexCount = this.vertices.length / 3;
  }

  pushFaceTri(triTokens, rawPos, rawNormals, outPos, outNormals) {
    let triPos = [];
    let triNorm = [];
    let hasAllNormals = true;

    for (let i = 0; i < 3; i++) {
      const token = triTokens[i];
      const seg = token.split('/');
      const vi = parseInt(seg[0], 10) - 1;
      const p = rawPos[vi];
      triPos.push(p);

      // supports v//vn and v/vt/vn
      let n = null;
      if (seg.length >= 3 && seg[2] !== '') {
        let ni = parseInt(seg[2], 10) - 1;
        n = rawNormals[ni];
      }
      if (!n) hasAllNormals = false;
      triNorm.push(n);
    }

    if (!hasAllNormals) {
      // if file has no normals, we build flat normal for triangle
      let e1 = [
        triPos[1][0] - triPos[0][0],
        triPos[1][1] - triPos[0][1],
        triPos[1][2] - triPos[0][2]
      ];
      let e2 = [
        triPos[2][0] - triPos[0][0],
        triPos[2][1] - triPos[0][1],
        triPos[2][2] - triPos[0][2]
      ];
      let n = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0]
      ];
      let len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
      if (len < 0.00001) len = 1;
      n[0] /= len; n[1] /= len; n[2] /= len;
      triNorm = [n, n, n];
    }

    for (let i = 0; i < 3; i++) {
      outPos.push(triPos[i][0], triPos[i][1], triPos[i][2]);
      outNormals.push(triNorm[i][0], triNorm[i][1], triNorm[i][2]);
    }
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
    if (!this.loaded) return;
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
