(function() {
  var Buffer, Program, Texture, Tilemap, Tilemap2, camx, camy, degToRad, drawScene, endsWith, flatten, getShader, gl, gridVerts, initGL, initShaders, isPowerOfTwo, key, keyPressed, keys, lastFrame, lastTime, loadData, loadJSON, logic, map, mvMatrix, mvMatrixStack, mvPopMatrix, mvPushMatrix, neheTexture, nextHighestPowerOfTwo, pMatrix, setMatrixUniforms, shaderProgram, tick, timeMs, triangleStripGrid, triangleStripGrid2, uniformSetter, _linkProgramFromShaders;
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
  window.onblur = function(e) {
    return keys = {};
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
    var addTile, addtex, addvert, img, layer, layers, numTilesWide, row, texcoords, texheight, texwidth, tile, tileCoord, tileheight, tilewidth, verts, x, y, _i, _j, _k, _len, _len2, _len3, _ref;
    tilewidth = texinfo.tilewidth;
    tileheight = texinfo.tileheight;
    img = texinfo.texture.image;
    texwidth = tilewidth / img.width;
    texheight = tileheight / img.height;
    numTilesWide = texinfo.tilesWide || parseInt(img.width / ((texinfo.tilegapx || 0) + tilewidth));
    tileCoord = function(tileIndex) {
      var y;
      y = 0;
      while (tileIndex > numTilesWide) {
        tileIndex -= numTilesWide;
        y += 1;
      }
      return [tileIndex * (tilewidth + texinfo.tilegapx) / img.width, y * (tileheight + texinfo.tilegapy) / img.height];
    };
    console.log('texwidth: ' + texwidth + ', texheight: ' + texheight);
    console.log('' + img.width + ' / ((' + (texinfo.tilegapx || 0) + ') + ' + tilewidth + '))');
    console.log('numTilesWide: ' + numTilesWide);
    layers = [];
    for (_i = 0, _len = map.length; _i < _len; _i++) {
      layer = map[_i];
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
      addTile = function(x, y, tile) {
        var s, t, _ref;
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
        return addtex(s, t + texheight);
      };
      y = x = 0;
      _ref = layer.tiles;
      for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
        row = _ref[_j];
        x = 0;
        for (_k = 0, _len3 = row.length; _k < _len3; _k++) {
          tile = row[_k];
          if (tile !== 0) {
            addTile(x, y, tile);
          }
          x += 1;
        }
        y += 1;
      }
      console.log('verts.length: ' + verts.length);
      console.log('texcoords.length: ' + texcoords.length);
      layers.push({
        verts: Buffer(2, gl.ARRAY_BUFFER, verts),
        texcoords: Buffer(2, gl.ARRAY_BUFFER, texcoords),
        distance: layer.distance
      });
    }
    return {
      draw: function(program, x, y) {
        var layer, layerMat, layerx, layery, _i, _len, _results;
        _results = [];
        for (_i = 0, _len = layers.length; _i < _len; _i++) {
          layer = layers[_i];
          layerx = x / layer.distance;
          layery = y / layer.distance;
          program.attrib.aVertexPosition(layer.verts);
          program.attrib.aTextureCoord(layer.texcoords);
          layerMat = mat4.create(mvMatrix);
          mat4.translate(layerMat, [parseInt(layerx), parseInt(layery), 0]);
          shaderProgram.uniform.uMVMatrix(layerMat);
          _results.push(layer.verts.drawArrays(gl.TRIANGLES));
        }
        return _results;
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
      gl.texParameteri(gl.TEXTURE_2D, gl.GL_TEXTURE_WRAP_S, gl.CLAMP);
      gl.texParameteri(gl.TEXTURE_2D, gl.GL_TEXTURE_WRAP_T, gl.CLAMP);
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
  camx = 0;
  camy = 0;
  drawScene = function() {
    var zoom;
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    zoom = 1;
    mat4.ortho(0, gl.viewportWidth / zoom, gl.viewportHeight / zoom, 0, -1.0, 1.0, pMatrix);
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [parseInt(camx), parseInt(camy), 0]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, neheTexture);
    shaderProgram.uniform.uSampler(0);
    setMatrixUniforms();
    return map.draw(shaderProgram, camx, camy);
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
