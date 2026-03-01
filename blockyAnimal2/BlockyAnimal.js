// a4 lighting scene
var VSHADER_SOURCE = `
attribute vec4 a_Position;
attribute vec3 a_Normal;
attribute vec2 a_UV;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_NormalMatrix;

varying vec3 v_Normal;
varying vec3 v_WorldPos;
varying vec2 v_UV;

void main() {
  vec4 worldPos = u_ModelMatrix * a_Position;
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;
  v_WorldPos = worldPos.xyz;
  v_Normal = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);
  v_UV = a_UV;
}
`;

var FSHADER_SOURCE = `
precision mediump float;

uniform vec4 u_FragColor;
uniform vec3 u_CameraPos;
uniform vec3 u_LightPos;
uniform vec3 u_LightColor;
uniform vec3 u_SpotPos;
uniform vec3 u_SpotDir;
uniform float u_SpotCutoff;
uniform bool u_UseTexture;
uniform sampler2D u_Sampler0;

uniform bool u_LightingOn;
uniform bool u_NormalVisOn;
uniform bool u_PointLightOn;
uniform bool u_SpotLightOn;

varying vec3 v_Normal;
varying vec3 v_WorldPos;
varying vec2 v_UV;

void main() {
  vec3 N = normalize(v_Normal);

  if (u_NormalVisOn) {
    vec3 normalColor = N * 0.5 + 0.5;
    gl_FragColor = vec4(normalColor, 1.0);
    return;
  }

  vec3 baseColor = u_FragColor.rgb;
  if (u_UseTexture) {
    baseColor = texture2D(u_Sampler0, v_UV).rgb;
  }
  if (!u_LightingOn) {
    gl_FragColor = vec4(baseColor, u_FragColor.a);
    return;
  }

  vec3 V = normalize(u_CameraPos - v_WorldPos);
  vec3 result = 0.20 * baseColor; // ambient

  if (u_PointLightOn) {
    vec3 L = normalize(u_LightPos - v_WorldPos);
    float diff = max(dot(N, L), 0.0);
    vec3 R = reflect(-L, N);
    float spec = pow(max(dot(V, R), 0.0), 24.0);
    result += baseColor * diff * u_LightColor;
    result += spec * u_LightColor * 0.5;
  }

  if (u_SpotLightOn) {
    vec3 SL = normalize(u_SpotPos - v_WorldPos);
    float theta = dot(normalize(-u_SpotDir), SL);

    if (theta > u_SpotCutoff) {
      float spotAmount = smoothstep(u_SpotCutoff, u_SpotCutoff + 0.08, theta);
      float sDiff = max(dot(N, SL), 0.0) * spotAmount;
      vec3 sR = reflect(-SL, N);
      float sSpec = pow(max(dot(V, sR), 0.0), 28.0) * spotAmount;
      vec3 spotColor = vec3(1.0, 0.95, 0.8);
      result += baseColor * sDiff * spotColor;
      result += sSpec * spotColor * 0.45;
    }
  }

  gl_FragColor = vec4(result, u_FragColor.a);
}
`;

let canvas;
let gl;
let g_camera = null;

// attributes and uniforms
let a_Position;
let a_Normal;
let a_UV;
let u_ModelMatrix;
let u_ViewMatrix;
let u_ProjectionMatrix;
let u_NormalMatrix;
let u_FragColor;
let u_CameraPos;
let u_LightPos;
let u_LightColor;
let u_SpotPos;
let u_SpotDir;
let u_SpotCutoff;
let u_LightingOn;
let u_NormalVisOn;
let u_PointLightOn;
let u_SpotLightOn;
let u_UseTexture;
let u_Sampler0;

// ui + state
let g_lightingOn = true;
let g_normalVisOn = false;
let g_pointLightOn = true;
let g_spotLightOn = true;
let g_nightMode = false;
let g_spinLight = true;
let g_lightPos = [2.0, 4.2, 2.0];
let g_lightColor = [1.0, 1.0, 1.0];
let g_lightSpinAngle = 0.0;
let g_lightSpinSpeed = 0.8;
let g_spotSpeed = 0.0;
let g_spotAngle = 0.0;
let g_moveSpeed = 0.18;
let g_panSpeed = 3.0;

// world data (a3 style block map)
let g_mapSize = 20;
let g_map = [];
let g_terrain = [];
let g_baseGroundY = -2.0;

// sheep
let g_sheepList = [
  { x: -4.5, z: -2.8, dir: 160.0, speed: 0.008, turnTimer: 0.0, phase: 0.0, stuckFrames: 0 },
  { x: 4.8, z: 3.8, dir: 130.0, speed: 0.007, turnTimer: 0.0, phase: 1.7, stuckFrames: 0 }
];

// texture state
let g_textures = [null, null, null, null]; // 0 dirt, 1 hay, 2 grass, 3 sky
let g_textureReady = [false, false, false, false];

// shapes / models
let g_sphere1;
let g_sphere2;
let g_loadedObj = null;
let g_objReady = false;

let g_startTime = performance.now() / 1000.0;

function setupWebGL() {
  canvas = document.getElementById('webgl');
  if (!canvas) {
    console.log('setupWebGL: canvas #webgl not found');
    return false;
  }

  // try webgl2 first, then webgl1 fallbacks
  gl =
    canvas.getContext('webgl2') ||
    canvas.getContext('webgl') ||
    canvas.getContext('experimental-webgl');

  if (!gl) {
    console.log('setupWebGL: could not create webgl context');
    return false;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  console.log('setupWebGL: context created');
  return true;
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return false;

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_CameraPos = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_LightPos = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_SpotPos = gl.getUniformLocation(gl.program, 'u_SpotPos');
  u_SpotDir = gl.getUniformLocation(gl.program, 'u_SpotDir');
  u_SpotCutoff = gl.getUniformLocation(gl.program, 'u_SpotCutoff');
  u_LightingOn = gl.getUniformLocation(gl.program, 'u_LightingOn');
  u_NormalVisOn = gl.getUniformLocation(gl.program, 'u_NormalVisOn');
  u_PointLightOn = gl.getUniformLocation(gl.program, 'u_PointLightOn');
  u_SpotLightOn = gl.getUniformLocation(gl.program, 'u_SpotLightOn');
  u_UseTexture = gl.getUniformLocation(gl.program, 'u_UseTexture');
  u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');

  // check required shader vars in a safer way
  // note: uniform locations can be objects and should be checked against null
  if (a_Position < 0 || a_Normal < 0 || a_UV < 0) {
    console.log('missing attrib location:', a_Position, a_Normal, a_UV);
    return false;
  }

  if (u_ModelMatrix === null || u_ViewMatrix === null || u_ProjectionMatrix === null || u_NormalMatrix === null) {
    console.log('missing matrix uniform');
    return false;
  }

  if (u_FragColor === null || u_CameraPos === null || u_LightPos === null || u_LightColor === null) {
    console.log('missing core lighting uniform');
    return false;
  }

  if (u_UseTexture === null || u_Sampler0 === null) {
    console.log('missing texture uniform');
    return false;
  }

  gl.uniform1i(u_UseTexture, 0);
  gl.uniform1i(u_Sampler0, 0);
  gl.disableVertexAttribArray(a_UV);
  gl.vertexAttrib2f(a_UV, 0.0, 0.0);

  // these are optional if compiler optimizes them away on some systems
  if (u_SpotPos === null) console.log('warning: u_SpotPos optimized out');
  if (u_SpotDir === null) console.log('warning: u_SpotDir optimized out');
  if (u_SpotCutoff === null) console.log('warning: u_SpotCutoff optimized out');
  if (u_LightingOn === null) console.log('warning: u_LightingOn optimized out');
  if (u_NormalVisOn === null) console.log('warning: u_NormalVisOn optimized out');
  if (u_PointLightOn === null) console.log('warning: u_PointLightOn optimized out');
  if (u_SpotLightOn === null) console.log('warning: u_SpotLightOn optimized out');

  return true;
}

function setModelAndNormalMatrices(modelMatrix) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  // normal matrix = inverse transpose of model matrix
  let normalMat = new Matrix4();
  normalMat.setInverseOf(modelMatrix);
  normalMat.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMat.elements);
}

function setupUI() {
  const lightingBtn = document.getElementById('lightingToggleBtn');
  const normalsBtn = document.getElementById('normalToggleBtn');
  const pointBtn = document.getElementById('pointToggleBtn');
  const spotBtn = document.getElementById('spotToggleBtn');
  const nightBtn = document.getElementById('nightToggleBtn');
  const spinCheck = document.getElementById('spinLightCheck');
  const sliderX = document.getElementById('lightX');
  const sliderY = document.getElementById('lightY');
  const sliderZ = document.getElementById('lightZ');
  const sliderR = document.getElementById('lightR');
  const sliderG = document.getElementById('lightG');
  const sliderB = document.getElementById('lightB');
  const sliderLightSpinSpeed = document.getElementById('lightSpinSpeed');
  const sliderSpotSpeed = document.getElementById('spotSpeed');

  // start light higher up by default
  sliderY.value = '4.2';

  function syncLightLabels() {
    document.getElementById('lightXVal').textContent = sliderX.value;
    document.getElementById('lightYVal').textContent = sliderY.value;
    document.getElementById('lightZVal').textContent = sliderZ.value;
    document.getElementById('lightRVal').textContent = sliderR.value;
    document.getElementById('lightGVal').textContent = sliderG.value;
    document.getElementById('lightBVal').textContent = sliderB.value;
    document.getElementById('lightSpinSpeedVal').textContent = sliderLightSpinSpeed.value;
    document.getElementById('spotSpeedVal').textContent = sliderSpotSpeed.value;
  }

  function updateLightFromSliders() {
    g_lightPos[0] = parseFloat(sliderX.value);
    g_lightPos[1] = parseFloat(sliderY.value);
    g_lightPos[2] = parseFloat(sliderZ.value);
    g_lightColor[0] = parseFloat(sliderR.value);
    g_lightColor[1] = parseFloat(sliderG.value);
    g_lightColor[2] = parseFloat(sliderB.value);
    g_lightSpinSpeed = parseFloat(sliderLightSpinSpeed.value);
    g_spotSpeed = parseFloat(sliderSpotSpeed.value);
    syncLightLabels();
  }

  lightingBtn.onclick = function() {
    g_lightingOn = !g_lightingOn;
    lightingBtn.textContent = g_lightingOn ? 'lighting: on' : 'lighting: off';
  };

  normalsBtn.onclick = function() {
    g_normalVisOn = !g_normalVisOn;
    normalsBtn.textContent = g_normalVisOn ? 'normals: on' : 'normals: off';
  };

  pointBtn.onclick = function() {
    g_pointLightOn = !g_pointLightOn;
    pointBtn.textContent = g_pointLightOn ? 'point light: on' : 'point light: off';
  };

  spotBtn.onclick = function() {
    g_spotLightOn = !g_spotLightOn;
    spotBtn.textContent = g_spotLightOn ? 'spot light: on' : 'spot light: off';
  };

  nightBtn.onclick = function() {
    g_nightMode = !g_nightMode;
    nightBtn.textContent = g_nightMode ? 'night: on' : 'night: off';
  };

  spinCheck.onchange = function() {
    g_spinLight = !!spinCheck.checked;
  };

  sliderX.oninput = updateLightFromSliders;
  sliderY.oninput = updateLightFromSliders;
  sliderZ.oninput = updateLightFromSliders;
  sliderR.oninput = updateLightFromSliders;
  sliderG.oninput = updateLightFromSliders;
  sliderB.oninput = updateLightFromSliders;
  sliderLightSpinSpeed.oninput = updateLightFromSliders;
  sliderSpotSpeed.oninput = updateLightFromSliders;

  updateLightFromSliders();
}

function setupCameraAndKeyboard() {
  g_camera = new Camera(canvas);
  g_camera.eye = new Vector3([0, 3.0, 9.0]);
  g_camera.yaw = 0;
  g_camera.pitch = -12;
  g_camera.updateAtFromAngles();
  g_camera.updateView();

  document.addEventListener('keydown', function(ev) {
    if (!g_camera) return;
    if (ev.key === 'w' || ev.key === 'W') g_camera.moveForward(g_moveSpeed);
    if (ev.key === 's' || ev.key === 'S') g_camera.moveBackwards(g_moveSpeed);
    if (ev.key === 'a' || ev.key === 'A') g_camera.moveLeft(g_moveSpeed);
    if (ev.key === 'd' || ev.key === 'D') g_camera.moveRight(g_moveSpeed);
    if (ev.key === 'q' || ev.key === 'Q') g_camera.panYaw(-g_panSpeed);
    if (ev.key === 'e' || ev.key === 'E') g_camera.panYaw(g_panSpeed);
  });
}

function initWorld() {
  g_map = [];
  g_terrain = [];

  for (let z = 0; z < g_mapSize; z++) {
    let mapRow = [];
    let terrainRow = [];
    for (let x = 0; x < g_mapSize; x++) {
      mapRow.push(0);

      // small rolling terrain
      let h = 1 + Math.floor(1.2 + Math.sin(x * 0.35) * 0.8 + Math.cos(z * 0.28) * 0.7);
      if (h < 1) h = 1;
      if (h > 3) h = 3;
      terrainRow.push(h);
    }
    g_map.push(mapRow);
    g_terrain.push(terrainRow);
  }

  // border walls
  for (let i = 0; i < g_mapSize; i++) {
    g_map[0][i] = 2;
    g_map[g_mapSize - 1][i] = 2;
    g_map[i][0] = 2;
    g_map[i][g_mapSize - 1] = 2;
  }

  // some inner wall lines
  for (let x = 3; x < g_mapSize - 3; x++) {
    g_map[6][x] = 1;
  }
  for (let z = 9; z < g_mapSize - 2; z++) {
    g_map[z][12] = 2;
  }
  g_map[10][4] = 3;
  g_map[11][4] = 2;
  g_map[10][5] = 2;
}

function initTextures() {
  loadTextureFile('lib/dirt.png', 0);
  loadTextureFile('lib/hay.webp', 1);
  loadTextureFile('lib/grass_256.svg', 2);
  loadTextureFile('lib/sky_256.svg', 3);
}

function loadTextureFile(src, idx) {
  let img = new Image();
  img.onload = function() {
    let tex = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    g_textures[idx] = tex;
    g_textureReady[idx] = true;
  };
  img.onerror = function() {
    console.log('texture failed to load:', src);
  };
  img.src = src;
}

function worldToMapXZ(wx, wz) {
  let mx = Math.floor(wx + g_mapSize / 2 + 0.5);
  let mz = Math.floor(wz + g_mapSize / 2 + 0.5);
  return [mx, mz];
}

function terrainHeightAtWorld(wx, wz) {
  let tile = worldToMapXZ(wx, wz);
  let mx = tile[0];
  let mz = tile[1];
  if (mx < 0 || mz < 0 || mx >= g_mapSize || mz >= g_mapSize) return 1;
  return g_terrain[mz][mx];
}

function sheepHitsWall(wx, wz, radius) {
  // keep some distance from map edge too
  let half = g_mapSize / 2;
  if (wx < -half + radius || wx > half - radius || wz < -half + radius || wz > half - radius) {
    return true;
  }

  // check nearby wall tiles using circle-vs-box overlap
  let tile = worldToMapXZ(wx, wz);
  let cx = tile[0];
  let cz = tile[1];

  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      let mx = cx + dx;
      let mz = cz + dz;
      if (mx < 0 || mz < 0 || mx >= g_mapSize || mz >= g_mapSize) continue;
      if (g_map[mz][mx] <= 0) continue;

      // wall block footprint in world coords
      let bx = mx - g_mapSize / 2;
      let bz = mz - g_mapSize / 2;
      let minX = bx - 0.5;
      let maxX = bx + 0.5;
      let minZ = bz - 0.5;
      let maxZ = bz + 0.5;

      let closestX = Math.max(minX, Math.min(wx, maxX));
      let closestZ = Math.max(minZ, Math.min(wz, maxZ));
      let ddx = wx - closestX;
      let ddz = wz - closestZ;
      if (ddx * ddx + ddz * ddz < radius * radius) {
        return true;
      }
    }
  }

  return false;
}

function updateSheep() {
  // keep movement slow
  for (let i = 0; i < g_sheepList.length; i++) {
    let s = g_sheepList[i];
    let sheepRadius = 0.33;
    s.turnTimer -= 1.0 / 60.0;

    if (s.turnTimer <= 0.0) {
      s.dir += (Math.random() * 70.0 - 35.0);
      s.turnTimer = 1.5 + Math.random() * 2.0;
    }

    let rad = s.dir * Math.PI / 180.0;
    let nx = s.x + Math.sin(rad) * s.speed;
    let nz = s.z + -Math.cos(rad) * s.speed;

    let blocked = sheepHitsWall(nx, nz, sheepRadius);

    if (!blocked) {
      s.x = nx;
      s.z = nz;
      s.stuckFrames = 0;
    } else {
      s.dir += 150 + Math.random() * 60;
      s.turnTimer = 0.5 + Math.random() * 0.8;
      s.stuckFrames += 1;
    }

    let b = g_mapSize / 2 - 2;
    if (s.x > b) { s.x = b; s.dir += 180; }
    if (s.x < -b) { s.x = -b; s.dir += 180; }
    if (s.z > b) { s.z = b; s.dir += 180; }
    if (s.z < -b) { s.z = -b; s.dir += 180; }

    // if a sheep keeps colliding, reset to an open area so it doesn't look broken/frozen
    if (s.stuckFrames > 80) {
      if (i === 0) { s.x = -4.5; s.z = -2.8; }
      if (i === 1) { s.x = 4.8; s.z = 3.8; }
      s.dir += 90;
      s.stuckFrames = 0;
    }
  }
}

function initSceneObjects() {
  g_sphere1 = new Sphere(18, 18);
  g_sphere2 = new Sphere(24, 24);

  g_loadedObj = new OBJModel('models/twist.obj');
  g_loadedObj.load(function(ok) {
    g_objReady = ok;
  });
}

function updatePerFrameUniforms() {
  g_camera.updateProjection(canvas);
  g_camera.updateView();

  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniform3f(
    u_CameraPos,
    g_camera.eye.elements[0],
    g_camera.eye.elements[1],
    g_camera.eye.elements[2]
  );

  if (u_LightPos !== null) gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  if (u_LightColor !== null) {
    let lightScale = g_nightMode ? 0.45 : 1.0;
    gl.uniform3f(
      u_LightColor,
      g_lightColor[0] * lightScale,
      g_lightColor[1] * lightScale,
      g_lightColor[2] * lightScale
    );
  }

  // spotlight sweeps around the map, speed comes from slider
  let sweepRad = g_spotAngle * Math.PI / 180.0;
  let sx = Math.cos(sweepRad) * 4.2;
  let sy = 4.8;
  let sz = Math.sin(sweepRad) * 4.2;
  let dx = 0.0 - sx;
  let dy = -1.4;
  let dz = 0.0 - sz;
  let len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 0.0001) len = 1.0;
  dx /= len; dy /= len; dz /= len;

  if (u_SpotPos !== null) gl.uniform3f(u_SpotPos, sx, sy, sz);
  if (u_SpotDir !== null) gl.uniform3f(u_SpotDir, dx, dy, dz);
  if (u_SpotCutoff !== null) gl.uniform1f(u_SpotCutoff, 0.90); // tighter cone

  if (u_LightingOn !== null) gl.uniform1i(u_LightingOn, g_lightingOn ? 1 : 0);
  if (u_NormalVisOn !== null) gl.uniform1i(u_NormalVisOn, g_normalVisOn ? 1 : 0);
  if (u_PointLightOn !== null) gl.uniform1i(u_PointLightOn, g_pointLightOn ? 1 : 0);
  if (u_SpotLightOn !== null) gl.uniform1i(u_SpotLightOn, g_spotLightOn ? 1 : 0);
}

function drawGroundAndWalls() {
  // ground
  let ground = new Cube();
  ground.color = [0.24, 0.70, 0.24, 1.0];
  ground.matrix.translate(0, -1.05, 0);
  ground.matrix.scale(12, 0.2, 12);
  ground.render();

  // simple wall ring around scene
  for (let i = -5; i <= 5; i++) {
    let wallA = new Cube();
    wallA.color = [0.50, 0.44, 0.36, 1.0];
    wallA.matrix.translate(i, 0.0, -5.5);
    wallA.render();

    let wallB = new Cube();
    wallB.color = [0.50, 0.44, 0.36, 1.0];
    wallB.matrix.translate(i, 0.0, 5.5);
    wallB.render();

    if (i > -5 && i < 5) {
      let wallC = new Cube();
      wallC.color = [0.50, 0.44, 0.36, 1.0];
      wallC.matrix.translate(-5.5, 0.0, i);
      wallC.render();

      let wallD = new Cube();
      wallD.color = [0.50, 0.44, 0.36, 1.0];
      wallD.matrix.translate(5.5, 0.0, i);
      wallD.render();
    }
  }
}

function drawSimpleAnimal() {
  let ax = -2.3;
  let az = 0.0;
  let ay = g_baseGroundY + terrainHeightAtWorld(ax, az) + 0.7;

  // body
  let body = new Cube();
  body.color = [0.92, 0.85, 0.70, 1.0];
  body.matrix.translate(ax, ay, az);
  body.matrix.scale(1.4, 0.8, 0.8);
  body.render();

  // head
  let head = new Cube();
  head.color = [0.90, 0.80, 0.65, 1.0];
  head.matrix.translate(ax + 1.25, ay + 0.25, az + 0.12);
  head.matrix.scale(0.6, 0.6, 0.55);
  head.render();

  // legs
  const legPos = [
    [ax + 0.15, ay - 0.70, az + 0.08],
    [ax + 1.10, ay - 0.70, az + 0.08],
    [ax + 0.15, ay - 0.70, az + 0.58],
    [ax + 1.10, ay - 0.70, az + 0.58]
  ];
  for (let i = 0; i < legPos.length; i++) {
    let leg = new Cube();
    leg.color = [0.32, 0.24, 0.16, 1.0];
    leg.matrix.translate(legPos[i][0], legPos[i][1], legPos[i][2]);
    leg.matrix.scale(0.22, 0.75, 0.22);
    leg.render();
  }
}

function drawSpheres() {
  // center sphere at ground level (lit normally)
  let s1x = 0.0;
  let s1z = 0.0;
  let s1Scale = 0.7;
  let s1Radius = 0.5 * s1Scale;
  let s1y = g_baseGroundY + terrainHeightAtWorld(s1x, s1z) + s1Radius;

  // second sphere still in world
  let s2x = 2.2;
  let s2z = -0.8;
  let s2y = g_baseGroundY + terrainHeightAtWorld(s2x, s2z) + 1.2;

  g_sphere1.color = [0.30, 0.50, 0.95, 1.0];
  g_sphere1.matrix.setIdentity();
  g_sphere1.matrix.translate(s1x, s1y, s1z);
  g_sphere1.matrix.scale(s1Scale, s1Scale, s1Scale);
  g_sphere1.render();

  g_sphere2.color = [0.95, 0.35, 0.35, 1.0];
  g_sphere2.matrix.setIdentity();
  g_sphere2.matrix.translate(s2x, s2y, s2z);
  g_sphere2.matrix.scale(0.8, 0.8, 0.8);
  g_sphere2.render();
}

function drawLoadedOBJ() {
  if (!g_objReady || !g_loadedObj) return;
  let ox = 2.9;
  let oz = -0.8;
  let oy = g_baseGroundY + terrainHeightAtWorld(ox, oz) + 0.4;
  g_loadedObj.matrix.setIdentity();
  g_loadedObj.matrix.translate(ox, oy, oz);
  g_loadedObj.matrix.scale(0.8, 0.8, 0.8);
  g_loadedObj.color = [0.70, 0.75, 0.80, 1.0];
  g_loadedObj.render();
}

function drawLightMarker() {
  // render marker unlit so its always visible
  if (u_LightingOn !== null) gl.uniform1i(u_LightingOn, 0);
  if (u_NormalVisOn !== null) gl.uniform1i(u_NormalVisOn, 0);

  let marker = new Cube();
  marker.color = [1.0, 1.0, 0.2, 1.0];
  marker.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  marker.matrix.scale(0.16, 0.16, 0.16);
  marker.render();

  if (u_LightingOn !== null) gl.uniform1i(u_LightingOn, g_lightingOn ? 1 : 0);
  if (u_NormalVisOn !== null) gl.uniform1i(u_NormalVisOn, g_normalVisOn ? 1 : 0);
}

function drawA3World() {
  // sky background cube like a3 world feel
  if (u_LightingOn !== null) gl.uniform1i(u_LightingOn, 0);
  if (u_NormalVisOn !== null) gl.uniform1i(u_NormalVisOn, 0);
  let sky = new Cube();
  if (g_nightMode) {
    sky.color = [0.04, 0.05, 0.10, 1.0];
    sky.useTexture = false; // keep night dark
  } else {
    sky.color = [0.42, 0.68, 0.98, 1.0];
    sky.useTexture = g_textureReady[3];
  }
  sky.textureIndex = 3; // sky texture for background
  sky.matrix.translate(0, 14, 0);
  sky.matrix.scale(85, 85, 85);
  sky.render();
  if (u_LightingOn !== null) gl.uniform1i(u_LightingOn, g_lightingOn ? 1 : 0);
  if (u_NormalVisOn !== null) gl.uniform1i(u_NormalVisOn, g_normalVisOn ? 1 : 0);

  // big dirt base
  let base = new Cube();
  base.color = [0.33, 0.24, 0.15, 1.0];
  base.useTexture = g_textureReady[1];
  base.textureIndex = 1; // hay texture in terrain base
  base.matrix.translate(0, g_baseGroundY - 0.55, 0);
  base.matrix.scale(g_mapSize + 8, 0.1, g_mapSize + 8);
  base.render();

  // draw terrain + block walls
  for (let z = 0; z < g_mapSize; z++) {
    for (let x = 0; x < g_mapSize; x++) {
      let wx = x - g_mapSize / 2;
      let wz = z - g_mapSize / 2;
      let tH = g_terrain[z][x];
      let wH = g_map[z][x];

      // terrain stack
      for (let y = 0; y < tH; y++) {
        let c = new Cube();
        if (y === tH - 1) {
          c.color = [0.16, 0.73, 0.24, 1.0];
          c.useTexture = g_textureReady[2];
          c.textureIndex = 2; // grass top
        } else {
          c.color = [0.44, 0.32, 0.21, 1.0];
          c.useTexture = g_textureReady[0];
          c.textureIndex = 0; // dirt body
        }
        c.matrix.translate(wx, g_baseGroundY + 0.5 + y, wz);
        c.render();
      }

      // extra dirt walls
      for (let y = 0; y < wH; y++) {
        let c = new Cube();
        c.color = [0.50, 0.38, 0.24, 1.0];
        c.useTexture = g_textureReady[0];
        c.textureIndex = 0; // dirt walls
        c.matrix.translate(wx, g_baseGroundY + 0.5 + tH + y, wz);
        c.render();
      }
    }
  }
}

function drawSheepAt(sheep, walkT) {
  let groundH = terrainHeightAtWorld(sheep.x, sheep.z);
  let yBase = g_baseGroundY + groundH + 1.05;
  let legSwing = Math.sin(walkT * 2.2 + sheep.phase) * 10.0;
  let bodyBob = Math.max(0.0, Math.sin(walkT * 2.2 + sheep.phase)) * 0.03;

  // build a shared root so parts stay together
  let root = new Matrix4();
  root.translate(sheep.x, yBase + bodyBob, sheep.z);
  root.rotate(sheep.dir, 0, 1, 0);

  let body = new Cube();
  body.color = [0.95, 0.95, 0.95, 1.0];
  body.matrix = new Matrix4(root);
  body.matrix.scale(0.86, 0.50, 0.56);
  body.render();

  let head = new Cube();
  head.color = [0.88, 0.84, 0.78, 1.0];
  head.matrix = new Matrix4(root);
  head.matrix.translate(0.0, 0.10, -0.42);
  head.matrix.scale(0.30, 0.30, 0.26);
  head.render();

  let legData = [
    [-0.20, -0.40, -0.14, legSwing],
    [0.20, -0.40, -0.14, -legSwing],
    [-0.20, -0.40, 0.14, -legSwing],
    [0.20, -0.40, 0.14, legSwing]
  ];

  for (let i = 0; i < legData.length; i++) {
    let ld = legData[i];
    let leg = new Cube();
    leg.color = [0.27, 0.24, 0.22, 1.0];
    leg.matrix = new Matrix4(root);
    leg.matrix.translate(ld[0], ld[1], ld[2]);
    leg.matrix.translate(0.0, 0.14, 0.0);
    leg.matrix.rotate(ld[3], 1, 0, 0);
    leg.matrix.translate(0.0, -0.14, 0.0);
    leg.matrix.scale(0.12, 0.34, 0.12);
    leg.render();
  }
}

function renderScene() {
  if (g_nightMode) {
    gl.clearColor(0.01, 0.01, 0.03, 1.0);
  } else {
    gl.clearColor(0.08, 0.08, 0.11, 1.0);
  }
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  updatePerFrameUniforms();

  drawA3World();
  drawSpheres();

  let sec = (performance.now() / 1000.0) - g_startTime;
  for (let i = 0; i < g_sheepList.length; i++) {
    drawSheepAt(g_sheepList[i], sec * 7.0);
  }

  drawLoadedOBJ();
  drawLightMarker();

  const hud = document.getElementById('numdot');
  if (hud) {
    hud.textContent = 'time: ' + sec.toFixed(1) + '   controls: wasd move, q/e turn';
  }
}

function tick() {
  // animate point light in a circle when checkbox is on
  if (g_spinLight) {
    g_lightSpinAngle += g_lightSpinSpeed;
    if (g_lightSpinAngle > 360) g_lightSpinAngle -= 360;
    let rad = g_lightSpinAngle * Math.PI / 180.0;
    g_lightPos[0] = Math.cos(rad) * 2.8;
    g_lightPos[2] = Math.sin(rad) * 2.8;

    // keep sliders synced while spinning
    document.getElementById('lightX').value = g_lightPos[0].toFixed(2);
    document.getElementById('lightZ').value = g_lightPos[2].toFixed(2);
    document.getElementById('lightXVal').textContent = g_lightPos[0].toFixed(2);
    document.getElementById('lightZVal').textContent = g_lightPos[2].toFixed(2);
  }

  // spin spotlight using slider speed
  g_spotAngle += g_spotSpeed;
  if (g_spotAngle > 360) g_spotAngle -= 360;

  updateSheep();
  renderScene();
  requestAnimationFrame(tick);
}

function main() {
  if (!setupWebGL()) {
    console.log('webgl setup failed');
    let hud = document.getElementById('numdot');
    if (hud) hud.textContent = 'error: webgl setup failed';
    return;
  }
  if (!connectVariablesToGLSL()) {
    console.log('shader setup failed');
    let hud = document.getElementById('numdot');
    if (hud) hud.textContent = 'error: shader setup failed (check browser console)';
    return;
  }

  setupUI();
  setupCameraAndKeyboard();
  initWorld();
  initSceneObjects();
  initTextures();
  tick();
}
