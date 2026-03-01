class Triangle {
    constructor() {
        this.type = 'triangle';
        this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.size = 5.0;
    }

    render() {
        var xy = this.position;
        var rgba = this.color;
        var size = this.size;
        // triangles are never textured in this assignment code
        if (typeof u_TexColorWeight !== 'undefined' && u_TexColorWeight) {
            gl.uniform1f(u_TexColorWeight, 0.0);
        }
        // var xy = g_shapesList[i].position;
        // var rgba = g_shapesList[i].color;
        // var size = g_shapesList[i].size;
        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        // Pass the size of a point to u_Size variable
        gl.uniform1f(u_Size, size);
        // Draw triangle (position comes from buffer in drawTriangle)
        drawTriangle( [xy[0], xy[1], xy[0]+0.1, xy[1], xy[0], xy[1]+0.1]);
    }
}

// reuse buffers so we dont create 1000s of them (this helps a lot once we add the 32x32 world)
let g_vertexBuffer2D = null;
let g_vertexBuffer3D = null;
let g_uvBuffer3D = null;

function drawTriangle(vertices) {
    var n = 3;
    if (!g_vertexBuffer2D) g_vertexBuffer2D = gl.createBuffer();
    if (!g_vertexBuffer2D) { console.log('Failed to create the buffer object'); return -1; }
  
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer2D);
    // Write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  
    // Get the storage location of a_Position
    /*var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
      console.log('Failed to get the storage location of a_Position');
      return -1;
    }*/
    
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);
  
    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, n);
    
    // Disable vertex attrib array after drawing to avoid conflicts with Point rendering
    gl.disableVertexAttribArray(a_Position);
    // also make sure uv is a constant again so non-textured shapes dont freak out
    if (typeof a_UV !== 'undefined' && a_UV >= 0) {
      gl.disableVertexAttribArray(a_UV);
      gl.vertexAttrib2f(a_UV, 0.0, 0.0);
    }
    
    return n;
  }

function drawTriangle3D(vertices) {
    var n = 3;
    if (!g_vertexBuffer3D) g_vertexBuffer3D = gl.createBuffer();
    if (!g_vertexBuffer3D) { console.log('Failed to create the buffer object'); return -1; }
  
    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer3D);
    // Write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  
    // Get the storage location of a_Position
    /*var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
      console.log('Failed to get the storage location of a_Position');
      return -1;
    }*/
    
    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);
  
    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, n);
    
    // Disable vertex attrib array after drawing to avoid conflicts with Point rendering
    gl.disableVertexAttribArray(a_Position);
    if (typeof a_UV !== 'undefined' && a_UV >= 0) {
      gl.disableVertexAttribArray(a_UV);
      gl.vertexAttrib2f(a_UV, 0.0, 0.0);
    }
    
    return n;
  }

// draws a single 3d triangle but also lets you pass per-vertex uv coords (2 floats each)
// vertices = 9 floats (x,y,z) * 3
// uvs = 6 floats (u,v) * 3
function drawTriangle3DUV(vertices, uvs) {
    var n = 3;
    if (!g_vertexBuffer3D) g_vertexBuffer3D = gl.createBuffer();
    if (!g_uvBuffer3D) g_uvBuffer3D = gl.createBuffer();
    if (!g_vertexBuffer3D || !g_uvBuffer3D) {
      console.log('Failed to create the buffer object(s)');
      return -1;
    }

    // position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer3D);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // uv buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, g_uvBuffer3D);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    gl.drawArrays(gl.TRIANGLES, 0, n);

    // cleanup attrib state
    gl.disableVertexAttribArray(a_Position);
    gl.disableVertexAttribArray(a_UV);
    gl.vertexAttrib2f(a_UV, 0.0, 0.0);

    return n;
}