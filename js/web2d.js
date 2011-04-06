(function() {
  var Buffer, Program, Texture, Tilemap, Tilemap2, camx, camy, cubeVertexIndexBuffer, cubeVertexPositionBuffer, cubeVertexTextureCoordBuffer, degToRad, drawScene, endsWith, flatten, getShader, gl, gridVerts, initBuffers, initGL, initShaders, isPowerOfTwo, key, keyPressed, keys, lastFrame, lastTime, loadData, loadJSON, logic, map, mvMatrix, mvMatrixStack, mvPopMatrix, mvPushMatrix, neheTexture, nextHighestPowerOfTwo, pMatrix, setMatrixUniforms, shaderProgram, tick, tilemap, timeMs, triangleStripGrid, triangleStripGrid2, uniformSetter, xRot, yRot, zRot, _linkProgramFromShaders;
  gl = void 0;
  key = {
    left: 37,
    up: 38,
    right: 39,
    down: 40
  };
  keys = {};
  document.onkeydown = function(e) {
    return keys[e.keyCode] = true;
  };
  document.onkeyup = function(e) {
    return keys[e.keyCode] = false;
  };
  keyPressed = function(code) {
    return keys[code];
  };
  isPowerOfTwo = function(x) {
    return (x & (x - 1)) === 0;
  };
  gridVerts = function(w, h, pixelWidth, pixelHeight) {
    var buffer, x, y;
    buffer = [];
    for (y = 0; (0 <= h ? y <= h : y >= h); (0 <= h ? y += 1 : y -= 1)) {
      for (x = 0; (0 <= w ? x <= w : x >= w); (0 <= w ? x += 1 : x -= 1)) {
        buffer.push(x * pixelWidth);
        buffer.push(y * pixelHeight);
      }
    }
    return buffer;
  };
  triangleStripGrid = function(w, h) {
    var indices, n, x, _ref;
    w += 1;
    h += 1;
    indices = [];
    n = 0;
    indices.push(n);
    for (x = 0, _ref = w - 1; (0 <= _ref ? x <= _ref : x >= _ref); (0 <= _ref ? x += 1 : x -= 1)) {
      n += w;
      indices.push(n);
      n -= w - 1;
      indices.push(n);
    }
    return indices;
  };
  loadData = function(url, callback, type) {
    var cb;
    cb = function(responseText, status, xhr) {
      return callback(status === 'success' ? responseText : void 0, status);
    };
    return $.ajax({
      url: url,
      success: cb,
      error: function(e) {
        return callback(void 0, e);
      },
      dataType: type,
      cache: false
    });
  };
  loadJSON = function(url, callback) {
    return loadData(url, callback, 'json');
  };
  triangleStripGrid2 = function(w, h, limit) {
    var n, points, x, y, _ref, _ref2;
    n = 0;
    points = [];
    for (y = 0, _ref = h * 2; (0 <= _ref ? y <= _ref : y >= _ref); (0 <= _ref ? y += 1 : y -= 1)) {
      for (x = 0, _ref2 = w * 2 - 2; (0 <= _ref2 ? x <= _ref2 : x >= _ref2); (0 <= _ref2 ? x += 1 : x -= 1)) {
        points.push(n);
        if (x % 2 === 0) {
          n += w;
        } else {
          n -= y % 2 === 0 ? h - 1 : h + 1;
        }
      }
      points.push(n);
    }
    if (limit) {
      points = points.slice(0, limit);
    }
    return points;
  };
  Tilemap2 = function(map, texinfo) {
    var addtex, addvert, img, numTilesWide, row, s, t, texcoords, texheight, texwidth, tile, tileCoord, tileheight, tilewidth, verts, x, y, _i, _j, _len, _len2, _ref;
    tilewidth = texinfo.tilewidth;
    tileheight = texinfo.tileheight;
    img = texinfo.texture.image;
    texwidth = tilewidth / img.width;
    texheight = tileheight / img.height;
    numTilesWide = texinfo.tilesWide || parseInt(img.width / ((texinfo.tilegapx || 0) + tilewidth));
    tileCoord = function(tileIndex) {
      var y;
      y = 0;
      while (tileIndex > texinfo.tilesWide) {
        tileIndex -= texinfo.tilesWide;
        y += 1;
      }
      return [tileIndex * (tilewidth + texinfo.tilegapx) / img.width, y * (tileheight + texinfo.tilegapy) / img.height];
    };
    console.log('texwidth:  ' + texwidth);
    console.log('texheight: ' + texheight);
    console.log('' + img.width + ' / ((' + (texinfo.tilegapx || 0) + ') + ' + tilewidth + '))');
    console.log('numTilesWide: ' + numTilesWide);
    verts = [];
    addvert = function(x, y) {
      verts.push(x);
      return verts.push(y);
    };
    texcoords = [];
    addtex = function(s, t) {
      texcoords.push(s);
      return texcoords.push(t);
    };
    y = x = 0;
    for (_i = 0, _len = map.length; _i < _len; _i++) {
      row = map[_i];
      x = 0;
      for (_j = 0, _len2 = row.length; _j < _len2; _j++) {
        tile = row[_j];
        if (tile !== 0) {
          addvert(x * tilewidth, y * tileheight);
          addvert(x * tilewidth + tilewidth, y * tileheight);
          addvert(x * tilewidth + tilewidth, y * tileheight + tileheight);
          addvert(x * tilewidth, y * tileheight);
          addvert(x * tilewidth + tilewidth, y * tileheight + tileheight);
          addvert(x * tilewidth, y * tileheight + tileheight);
          _ref = tileCoord(tile - 1), s = _ref[0], t = _ref[1];
          addtex(s, t);
          addtex(s + texwidth, t);
          addtex(s + texwidth, t + texheight);
          addtex(s, t);
          addtex(s + texwidth, t + texheight);
          addtex(s, t + texheight);
        }
        x += 1;
      }
      y += 1;
    }
    console.log('verts.length: ' + verts.length);
    console.log('texcoords.length: ' + texcoords.length);
    verts = Buffer(2, gl.ARRAY_BUFFER, verts);
    texcoords = Buffer(2, gl.ARRAY_BUFFER, texcoords);
    return {
      draw: function(program) {
        program.attrib.aVertexPosition(verts);
        program.attrib.aTextureCoord(texcoords);
        return verts.drawArrays(gl.TRIANGLES);
      }
    };
  };
  Tilemap = function() {
    var draw, grid, h, indices, tiles, w;
    w = 4;
    h = 4;
    grid = Buffer(2, gl.ARRAY_BUFFER, gridVerts(w, h, 16, 16));
    indices = Buffer(1, gl.ELEMENT_ARRAY_BUFFER, triangleStripGrid(w, h, 8));
    tiles = Buffer(1, gl.ARRAY_BUFFER, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    draw = function(program) {
      program.attrib.tileIndex(tiles);
      program.attrib.aVertexPosition(grid);
      return indices.drawElements(gl.TRIANGLE_STRIP);
    };
    return {
      verts: grid,
      indices: indices,
      draw: draw
    };
  };
  nextHighestPowerOfTwo = function(x) {
    var i;
    --x;
    i = 1;
    while (i < 32) {
      x = x | x >> i;
      i <<= 1;
    }
    return x + 1;
  };
  flatten = function(f) {
    return f;
  };
  endsWith = function(str, s) {
    return str.length >= s.length && str.substr(this.length - s.length) === s;
  };
  uniformSetter = function(program, info) {
    var loc, type;
    loc = gl.getUniformLocation(program, info.name);
    type = info.type;
    if (info.size > 1 && endsWith(info.name, "[0]")) {
      switch (type) {
        case gl.FLOAT:
          return function(v) {
            return gl.uniform1fv(loc, v);
          };
        case gl.FLOAT_VEC2:
          return function(v) {
            return gl.uniform2fv(loc, v);
          };
        case gl.FLOAT_VEC3:
          return function(v) {
            return gl.uniform3fv(loc, v);
          };
        case gl.FLOAT_VEC4:
          return function(v) {
            return gl.uniform4fv(loc, v);
          };
        case gl.INT:
          return function(v) {
            return gl.uniform1iv(loc, v);
          };
        case gl.INT_VEC2:
          return function(v) {
            return gl.uniform2iv(loc, v);
          };
        case gl.INT_VEC3:
          return function(v) {
            return gl.uniform3iv(loc, v);
          };
        case gl.INT_VEC4:
          return function(v) {
            return gl.uniform4iv(loc, v);
          };
        case gl.BOOL:
          return function(v) {
            return gl.uniform1iv(loc, v);
          };
        case gl.BOOL_VEC2:
          return function(v) {
            return gl.uniform2iv(loc, v);
          };
        case gl.BOOL_VEC3:
          return function(v) {
            return gl.uniform3iv(loc, v);
          };
        case gl.BOOL_VEC4:
          return function(v) {
            return gl.uniform4iv(loc, v);
          };
        case gl.FLOAT_MAT2:
          return function(v) {
            return gl.uniformMatrix2fv(loc, false, v);
          };
        case gl.FLOAT_MAT3:
          return function(v) {
            return gl.uniformMatrix3fv(loc, false, v);
          };
        case gl.FLOAT_MAT4:
          return function(v) {
            return gl.uniformMatrix4fv(loc, false, v);
          };
        case gl.SAMPLER_2D:
          return function(v) {
            return gl.uniform1iv(loc, v);
          };
        case gl.SAMPLER_CUBE_MAP:
          return function(v) {
            return gl.uniform1iv(loc, v);
          };
        default:
          throw "unknown type: 0x" + type.toString(16);
      }
    } else {
      switch (type) {
        case gl.FLOAT:
          return function(v) {
            return gl.uniform1f(loc, v);
          };
        case gl.FLOAT_VEC2:
          return function(v) {
            return gl.uniform2fv(loc, v);
          };
        case gl.FLOAT_VEC3:
          return function(v) {
            return gl.uniform3fv(loc, v);
          };
        case gl.FLOAT_VEC4:
          return function(v) {
            return gl.uniform4fv(loc, v);
          };
        case gl.INT:
          return function(v) {
            return gl.uniform1i(loc, v);
          };
        case gl.INT_VEC2:
          return function(v) {
            return gl.uniform2iv(loc, v);
          };
        case gl.INT_VEC3:
          return function(v) {
            return gl.uniform3iv(loc, v);
          };
        case gl.INT_VEC4:
          return function(v) {
            return gl.uniform4iv(loc, v);
          };
        case gl.BOOL:
          return function(v) {
            return gl.uniform1i(loc, v);
          };
        case gl.BOOL_VEC2:
          return function(v) {
            return gl.uniform2iv(loc, v);
          };
        case gl.BOOL_VEC3:
          return function(v) {
            return gl.uniform3iv(loc, v);
          };
        case gl.BOOL_VEC4:
          return function(v) {
            return gl.uniform4iv(loc, v);
          };
        case gl.FLOAT_MAT2:
          return function(v) {
            return gl.uniformMatrix2fv(loc, false, flatten(v));
          };
        case gl.FLOAT_MAT3:
          return function(v) {
            return gl.uniformMatrix3fv(loc, false, flatten(v));
          };
        case gl.FLOAT_MAT4:
          return function(v) {
            return gl.uniformMatrix4fv(loc, false, flatten(v));
          };
        case gl.SAMPLER_2D:
          return function(v) {
            return gl.uniform1i(loc, v);
          };
        case gl.SAMPLER_CUBE:
          return function(v) {
            return gl.uniform1i(loc, v);
          };
        default:
          throw "unknown type: 0x" + type.toString(16);
      }
    }
  };
  _linkProgramFromShaders = function(shaders) {
    var program, shader, _i, _len;
    program = gl.createProgram();
    for (_i = 0, _len = shaders.length; _i < _len; _i++) {
      shader = shaders[_i];
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      alert("Could not initialise shaders");
    }
    return program;
  };
  Program = function(shaders) {
    var i, info, loc, numAttribs, numUniforms, program, _fn, _name, _ref, _ref2;
    program = _linkProgramFromShaders(shaders);
    program.use = function() {
      return gl.useProgram(this);
    };
    _name = function(info) {
      var name;
      name = info.name;
      if (endsWith(name, '[0]')) {
        return name.substr(0, name.length - 3);
      } else {
        return name;
      }
    };
    numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    program.attrib = {};
    _fn = function() {
      var index, info, nicename;
      info = gl.getActiveAttrib(program, i);
      nicename = _name(info);
      index = gl.getAttribLocation(program, info.name);
      return program.attrib[nicename] = function(buffer) {
        buffer.bind();
        gl.enableVertexAttribArray(index);
        return gl.vertexAttribPointer(index, buffer.itemSize, gl.FLOAT, false, 0, buffer.offset);
      };
    };
    for (i = 0, _ref = numAttribs - 1; (0 <= _ref ? i <= _ref : i >= _ref); (0 <= _ref ? i += 1 : i -= 1)) {
      _fn();
    }
    numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    program.uniform = {};
    for (i = 0, _ref2 = numUniforms - 1; (0 <= _ref2 ? i <= _ref2 : i >= _ref2); (0 <= _ref2 ? i += 1 : i -= 1)) {
      info = gl.getActiveUniform(program, i);
      loc = gl.getUniformLocation(program, info.name);
      program.uniform[_name(info)] = uniformSetter(program, info);
    }
    return program;
  };
  Texture = function(src, cb) {
    var texture;
    texture = gl.createTexture();
    texture.image = new Image();
    texture.image.onload = function() {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.bindTexture(gl.TEXTURE_2D, null);
      if (cb) {
        return cb();
      }
    };
    texture.image.src = src;
    return texture;
  };
  Buffer = function(itemSize, arrayType, items) {
    var buf, types;
    buf = gl.createBuffer();
    buf.offset = 0;
    buf.arrayType = arrayType;
    buf.bind = function() {
      return gl.bindBuffer(this.arrayType, this);
    };
    buf.drawElements = function(mode) {
      this.bind();
      return gl.drawElements(mode, this.numItems, gl.UNSIGNED_SHORT, 0);
    };
    buf.drawArrays = function(mode, first) {
      this.bind();
      return gl.drawArrays(mode, first || 0, this.numItems);
    };
    buf.bind();
    types = {};
    types[gl.ARRAY_BUFFER] = Float32Array;
    types[gl.ELEMENT_ARRAY_BUFFER] = Uint16Array;
    gl.bufferData(buf.arrayType, new types[arrayType](items), gl.STATIC_DRAW);
    buf.itemSize = itemSize;
    buf.numItems = items.length / itemSize;
    return buf;
  };
  initGL = function(canvas) {
    try {
      gl = canvas.getContext("experimental-webgl");
      gl.viewportWidth = canvas.width;
      gl.viewportHeight = canvas.height;
    } catch (e) {
      void 0;
    }
    if (!gl) {
      return alert('could not initialize WebGL');
    }
  };
  getShader = function(gl, id) {
    var k, shader, shaderScript, str;
    shaderScript = document.getElementById(id);
    if (!shaderScript) {
      return null;
    }
    str = "";
    k = shaderScript.firstChild;
    while (k) {
      if (k.nodeType === 3) {
        str += k.textContent;
      }
      k = k.nextSibling;
    }
    shader = shaderScript.type === "x-shader/x-fragment" ? shader = gl.createShader(gl.FRAGMENT_SHADER) : shaderScript.type === "x-shader/x-vertex" ? shader = gl.createShader(gl.VERTEX_SHADER) : void 0;
    gl.shaderSource(shader, str);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  shaderProgram = void 0;
  initShaders = function() {
    var fragmentShader, vertexShader;
    fragmentShader = getShader(gl, "shader-fs");
    vertexShader = getShader(gl, "shader-vs");
    shaderProgram = Program([vertexShader, fragmentShader]);
    return shaderProgram.use();
  };
  neheTexture = void 0;
  mvMatrix = mat4.create();
  mvMatrixStack = [];
  pMatrix = mat4.create();
  mvPushMatrix = function() {
    var copy;
    copy = mat4.create();
    mat4.set(mvMatrix, copy);
    return mvMatrixStack.push(copy);
  };
  mvPopMatrix = function() {
    if (mvMatrixStack.length === 0) {
      throw "Invalid popMatrix!";
    }
    return mvMatrix = mvMatrixStack.pop();
  };
  setMatrixUniforms = function() {
    shaderProgram.uniform.uPMatrix(pMatrix);
    return shaderProgram.uniform.uMVMatrix(mvMatrix);
  };
  degToRad = function(degrees) {
    return degrees * Math.PI / 180;
  };
  cubeVertexPositionBuffer = void 0;
  cubeVertexTextureCoordBuffer = void 0;
  cubeVertexIndexBuffer = void 0;
  tilemap = void 0;
  initBuffers = function() {
    tilemap = Tilemap();
    cubeVertexPositionBuffer = Buffer(3, gl.ARRAY_BUFFER, [0, 0, 1.0, 16, 0, 1.0, 16, 16, 1.0, 0, 16, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0]);
    cubeVertexTextureCoordBuffer = Buffer(2, gl.ARRAY_BUFFER, [0.0, 0.0, 0.0625, 0.0, 0.0625, 0.0625, 0.0, 0.0625, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]);
    return cubeVertexIndexBuffer = Buffer(1, gl.ELEMENT_ARRAY_BUFFER, [0, 1, 2, 0, 2, 3]);
    /*
            4, 5, 6,      4, 6, 7,    # Back face
            8, 9, 10,     8, 10, 11,  # Top face
            12, 13, 14,   12, 14, 15, # Bottom face
            16, 17, 18,   16, 18, 19, # Right face
            20, 21, 22,   20, 22, 23  # Left face
        ])
        */
  };
  xRot = 0;
  yRot = 0;
  zRot = 0;
  camx = 0;
  camy = 0;
  drawScene = function() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.ortho(0, gl.viewportWidth / 2, gl.viewportHeight / 2, 0, -1.0, 1.0, pMatrix);
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [camx, camy, 0]);
    shaderProgram.attrib.aVertexPosition(cubeVertexPositionBuffer);
    shaderProgram.attrib.aTextureCoord(cubeVertexTextureCoordBuffer);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, neheTexture);
    shaderProgram.uniform.uSampler(0);
    setMatrixUniforms();
    return map.draw(shaderProgram);
  };
  lastTime = 0;
  timeMs = function() {
    return new Date().getTime();
  };
  lastFrame = timeMs();
  logic = function() {
    var cammove, delta, now;
    now = timeMs();
    delta = now - lastFrame;
    lastFrame = now;
    cammove = .55 * delta;
    if (keyPressed(key.left)) {
      camx += cammove;
    }
    if (keyPressed(key.right)) {
      camx -= cammove;
    }
    if (keyPressed(key.up)) {
      camy += cammove;
    }
    if (keyPressed(key.down)) {
      return camy -= cammove;
    }
  };
  tick = function() {
    requestAnimFrame(tick);
    logic();
    return drawScene();
  };
  map = void 0;
  window.webGLStart = function() {
    var canvas;
    console.log('----');
    console.log(triangleStripGrid(2, 1));
    console.log(gridVerts(2, 1, 16, 16));
    canvas = document.getElementById("lesson05-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.disable(gl.DEPTH_TEST);
    return neheTexture = Texture('data/mariotiles.gif', function() {
      return loadJSON('data/testmap.json', function(x, err) {
        map = Tilemap2(x, {
          texture: neheTexture,
          tilewidth: 16,
          tileheight: 16,
          tilegapx: 1,
          tilegapy: 1,
          tilesWide: 12
        });
        return tick();
      });
    });
  };
}).call(this);
