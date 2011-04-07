gl = undefined

key =
    left: 37
    up: 38
    right: 39
    down: 40

keys = {}
document.onkeydown = (e) -> keys[e.keyCode] = true
document.onkeyup = (e) -> keys[e.keyCode] = false
window.onblur = (e) -> keys = {}
keyPressed = (code) -> return keys[code]

isPowerOfTwo = (x) -> (x & (x - 1)) == 0

NUM_FRAMES_TO_AVERAGE = 16
class FPSTimer
    constructor: ->
        @totalTime = NUM_FRAMES_TO_AVERAGE
        @timeTable = []
        for n in [0..NUM_FRAMES_TO_AVERAGE-1]
            @timeTable.push(1.0)
        @timeTableCursor = 0

    update: (elapsedTime) ->
        @totalTime = @totalTime + (elapsedTime - @timeTable[@timeTableCursor])
        @timeTable[@timeTableCursor] = elapsedTime
        @timeTableCursor += 1
        if @timeTableCursor == NUM_FRAMES_TO_AVERAGE
            @timeTableCursor = 0

        @instantaneousFPS = Math.floor(1.0 / elapsedTime + 0.5)

        @averageFPS = Math.floor(
            (1.0 / (@totalTime / NUM_FRAMES_TO_AVERAGE)) + 0.5)


loadData = (url, callback, type) ->
    cb = (responseText, status, xhr) ->
        callback(responseText if status == 'success', status)

    $.ajax(
        url: url
        success: cb
        error: (e) -> callback(undefined, e)
        dataType: type
        cache: false
    )

loadJSON = (url, callback) -> loadData(url, callback, 'json')

Tilemap = (map, texinfo) ->
    tilewidth = texinfo.tilewidth
    tileheight = texinfo.tileheight

    img = texinfo.texture.image

    texwidth  = tilewidth / img.width
    texheight = tileheight / img.height

    numTilesWide = texinfo.tilesWide || parseInt(img.width / ((texinfo.tilegapx || 0) + tilewidth))
    tileCoord = (tileIndex) ->
        y = 0
        while (tileIndex > numTilesWide)
            tileIndex -= numTilesWide
            y += 1

        return [tileIndex * (tilewidth + texinfo.tilegapx) / img.width,
                y * (tileheight + texinfo.tilegapy) / img.height]

    console.log('texwidth: ' + texwidth + ', texheight: '+ texheight)
    console.log('' + img.width + ' / ((' + (texinfo.tilegapx || 0) + ') + ' + tilewidth + '))')
    console.log('numTilesWide: ' + numTilesWide)

    layers = []

    for layer in map
        verts = []
        addvert = (x, y) -> verts.push(x); verts.push(y)

        texcoords = []
        addtex = (s, t) -> texcoords.push(s); texcoords.push(t)

        addTile = (x, y, tile) ->
            # TODO: use indexes! there are a lot of shared verts/coords here.
            # vertices
            addvert(x*tilewidth,             y*tileheight)
            addvert(x*tilewidth + tilewidth, y*tileheight)
            addvert(x*tilewidth + tilewidth, y*tileheight + tileheight)

            addvert(x*tilewidth,             y*tileheight)
            addvert(x*tilewidth + tilewidth, y*tileheight + tileheight)
            addvert(x*tilewidth,             y*tileheight + tileheight)

            # texcoords
            [s, t] = tileCoord(tile - 1)
            addtex(s, t)
            addtex(s + texwidth, t)
            addtex(s + texwidth, t + texheight)

            addtex(s, t)
            addtex(s + texwidth, t + texheight)
            addtex(s, t + texheight)


        y = x = 0
        for row in layer.tiles
            x = 0
            for tile in row
                if tile != 0
                    addTile(x, y, tile)
                x +=1
            y += 1

        console.log('verts.length: ' + verts.length)
        console.log('texcoords.length: ' + texcoords.length)

        layers.push({
            verts: Buffer(2, gl.ARRAY_BUFFER, verts)
            texcoords: Buffer(2, gl.ARRAY_BUFFER, texcoords)
            distance: layer.distance
        })

    return {
        draw: (program, x, y) ->
            for layer in layers
                layerx = x/layer.distance
                layery = y/layer.distance
                program.attrib.aVertexPosition(layer.verts)
                program.attrib.aTextureCoord(layer.texcoords)

                layerMat = mat4.create(mvMatrix)
                mat4.translate(layerMat, [parseInt(layerx), parseInt(layery), 0])
                program.uniform.uMVMatrix(layerMat)
                layer.verts.drawArrays(gl.TRIANGLES)
    }

nextHighestPowerOfTwo = (x) ->
    --x
    i = 1
    while i < 32
        x = x | x >> i
        i <<= 1
    return x + 1

flatten = (f) -> f

endsWith = (str, s) ->
  str.length >= s.length && str.substr(this.length - s.length) == s

uniformSetter = (program, info) ->
    loc = gl.getUniformLocation(program, info.name)
    type = info.type
    if info.size > 1 && endsWith(info.name, "[0]")
      # It's an array.
      switch type
        when gl.FLOAT then return (v) -> gl.uniform1fv(loc, v)
        when gl.FLOAT_VEC2 then return (v) -> gl.uniform2fv(loc, v)
        when gl.FLOAT_VEC3 then return (v) -> gl.uniform3fv(loc, v)
        when gl.FLOAT_VEC4 then return (v) -> gl.uniform4fv(loc, v)
        when gl.INT then return (v) -> gl.uniform1iv(loc, v)
        when gl.INT_VEC2 then return (v) -> gl.uniform2iv(loc, v)
        when gl.INT_VEC3 then return (v) -> gl.uniform3iv(loc, v)
        when gl.INT_VEC4 then return (v) -> gl.uniform4iv(loc, v)
        when gl.BOOL then return (v) -> gl.uniform1iv(loc, v)
        when gl.BOOL_VEC2 then return (v) -> gl.uniform2iv(loc, v)
        when gl.BOOL_VEC3 then return (v) -> gl.uniform3iv(loc, v)
        when gl.BOOL_VEC4 then return (v) -> gl.uniform4iv(loc, v)
        when gl.FLOAT_MAT2 then return (v) -> gl.uniformMatrix2fv(loc, false, v)
        when gl.FLOAT_MAT3 then return (v) -> gl.uniformMatrix3fv(loc, false, v)
        when gl.FLOAT_MAT4 then return (v) -> gl.uniformMatrix4fv(loc, false, v)
        when gl.SAMPLER_2D then return (v) -> gl.uniform1iv(loc, v)
        when gl.SAMPLER_CUBE_MAP then return (v) -> gl.uniform1iv(loc, v)
        else throw ("unknown type: 0x" + type.toString(16))
    else
      switch type
        when gl.FLOAT then return (v) -> gl.uniform1f(loc, v)
        when gl.FLOAT_VEC2 then return (v) -> gl.uniform2fv(loc, v)
        when gl.FLOAT_VEC3 then return (v) -> gl.uniform3fv(loc, v)
        when gl.FLOAT_VEC4 then return (v) -> gl.uniform4fv(loc, v)
        when gl.INT then return (v) -> gl.uniform1i(loc, v)
        when gl.INT_VEC2 then return (v) -> gl.uniform2iv(loc, v)
        when gl.INT_VEC3 then return (v) -> gl.uniform3iv(loc, v)
        when gl.INT_VEC4 then return (v) -> gl.uniform4iv(loc, v)
        when gl.BOOL then return (v) -> gl.uniform1i(loc, v)
        when gl.BOOL_VEC2 then return (v) -> gl.uniform2iv(loc, v)
        when gl.BOOL_VEC3 then return (v) -> gl.uniform3iv(loc, v)
        when gl.BOOL_VEC4 then return (v) -> gl.uniform4iv(loc, v)
        when gl.FLOAT_MAT2 then return (v) -> gl.uniformMatrix2fv(loc, false, flatten(v))
        when gl.FLOAT_MAT3 then return (v) -> gl.uniformMatrix3fv(loc, false, flatten(v))
        when gl.FLOAT_MAT4 then return (v) -> gl.uniformMatrix4fv(loc, false, flatten(v))
        when gl.SAMPLER_2D then return (v) -> gl.uniform1i(loc, v)
        when gl.SAMPLER_CUBE then return (v) -> gl.uniform1i(loc, v)
        else throw ("unknown type: 0x" + type.toString(16))

_linkProgramFromShaders = (shaders) ->
    program = gl.createProgram()
    for shader in shaders
        gl.attachShader(program, shader)
    gl.linkProgram(program)

    if not gl.getProgramParameter(program, gl.LINK_STATUS)
        alert("Could not initialise shaders")

    return program




Program = (shaders) ->
    program = _linkProgramFromShaders(shaders)
    program.use = -> gl.useProgram(this)

    _name = (info) ->
        name = info.name
        return if endsWith(name, '[0]') then name.substr(0, name.length - 3) else name

    # attributes
    numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
    program.attrib = {}
    for i in [0..numAttribs-1]
        ( ->
            info = gl.getActiveAttrib(program, i)
            nicename = _name(info)
            index = gl.getAttribLocation(program, info.name)

            program.attrib[nicename] = (buffer) ->
                buffer.bind()
                gl.enableVertexAttribArray(index)
                gl.vertexAttribPointer(index, buffer.itemSize, gl.FLOAT, false, 0, buffer.offset)
        )()


    # uniforms
    numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    program.uniform = {}
    for i in [0..numUniforms-1]
        info = gl.getActiveUniform(program, i)
        loc = gl.getUniformLocation(program, info.name)
        program.uniform[_name(info)] = uniformSetter(program, info)

    return program

Texture = (src, cb) ->
    texture = gl.createTexture()
    texture.image = new Image()
    texture.image.onload = ->
        # http://jvitela.com/blog/?p=124
        # NPOT http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences
        gl.bindTexture(gl.TEXTURE_2D, texture)
        #gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.GL_TEXTURE_WRAP_S, gl.CLAMP)
        gl.texParameteri(gl.TEXTURE_2D, gl.GL_TEXTURE_WRAP_T, gl.CLAMP)
        gl.bindTexture(gl.TEXTURE_2D, null)

        if cb
            cb()

    texture.image.src = src
    return texture

Buffer = (itemSize, arrayType, items) ->
    buf = gl.createBuffer()
    buf.offset = 0
    buf.arrayType = arrayType

    buf.bind = ->
        gl.bindBuffer(this.arrayType, this)

    buf.drawElements = (mode) ->
        this.bind()
        gl.drawElements(mode, this.numItems, gl.UNSIGNED_SHORT, 0)

    buf.drawArrays = (mode, first) ->
        this.bind()
        gl.drawArrays(mode, first || 0, this.numItems)

    buf.bind()

    types = {}
    types[gl.ARRAY_BUFFER] = Float32Array
    types[gl.ELEMENT_ARRAY_BUFFER] = Uint16Array

    gl.bufferData(buf.arrayType, new types[arrayType](items), gl.STATIC_DRAW)
    buf.itemSize = itemSize
    buf.numItems = items.length / itemSize
    return buf


initGL = (canvas) ->
    try
        gl = WebGLUtils.setupWebGL(canvas)
        gl.viewportWidth = canvas.width
        gl.viewportHeight = canvas.height
    catch e
        undefined

    if !gl
        alert('could not initialize WebGL')


getShader = (gl, id) ->
    shaderScript = document.getElementById(id)
    if !shaderScript
        return null

    str = ""
    k = shaderScript.firstChild
    while (k)
        if k.nodeType == 3
            str += k.textContent
        k = k.nextSibling

    shader = if shaderScript.type == "x-shader/x-fragment"
        shader = gl.createShader(gl.FRAGMENT_SHADER)
    else if shaderScript.type == "x-shader/x-vertex"
        shader = gl.createShader(gl.VERTEX_SHADER)

    gl.shaderSource(shader, str)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        alert(gl.getShaderInfoLog(shader))
        return null

    return shader

shaderProgram = undefined

initShaders = ->
    fragmentShader = getShader(gl, "shader-fs")
    vertexShader = getShader(gl, "shader-vs")

    shaderProgram = Program([vertexShader, fragmentShader])
    shaderProgram.use()

neheTexture = undefined

mvMatrix = mat4.create()
mvMatrixStack = []
pMatrix = mat4.create()

mvPushMatrix = ->
    copy = mat4.create()
    mat4.set(mvMatrix, copy)
    mvMatrixStack.push(copy)

mvPopMatrix = ->
    if (mvMatrixStack.length == 0)
        throw "Invalid popMatrix!"
    mvMatrix = mvMatrixStack.pop()

setMatrixUniforms = ->
    shaderProgram.uniform.uPMatrix(pMatrix)
    shaderProgram.uniform.uMVMatrix(mvMatrix)


degToRad = (degrees) ->
    degrees * Math.PI / 180

camx = 0
camy = 0


drawScene = ->
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    #mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix)
    zoom = 1
    mat4.ortho(0, gl.viewportWidth/zoom, gl.viewportHeight/zoom, 0, -1.0, 1.0, pMatrix)
    mat4.identity(mvMatrix)
    mat4.translate(mvMatrix, [parseInt(camx), parseInt(camy), 0])
    #mat4.translate(mvMatrix, [0.0, 0.0, -5.0])

    #mat4.rotate(mvMatrix, degToRad(xRot), [1, 0, 0])
    #mat4.rotate(mvMatrix, degToRad(yRot), [0, 1, 0])
    #mat4.rotate(mvMatrix, degToRad(zRot), [0, 0, 1])

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, neheTexture)
    shaderProgram.uniform.uSampler(0)

    #mat4.translate(mvMatrix, [0.0, 32.0, 0.0])
    setMatrixUniforms()

    map.draw(shaderProgram, camx, camy)


fps = new FPSTimer()
lastTime = 0

timeMs = -> new Date().getTime()
lastFrame = timeMs()

beginMs = timeMs()


warp = 0

logic = ->
    now = timeMs()
    delta = now - lastFrame

    fps.update(delta * 0.001)
    fpsElem = document.getElementById('fps')
    if fpsElem then fpsElem.innerHTML = fps.averageFPS + ' FPS'

    shaderProgram.uniform.time((now-beginMs)/1000)
    shaderProgram.uniform.warp(warp)

    lastFrame = now

    cammove = .55 * delta

    if keyPressed(key.left) then camx += cammove
    if keyPressed(key.right) then camx -= cammove
    if keyPressed(key.up) then camy += cammove
    if keyPressed(key.down) then camy -= cammove


tick = ->
    requestAnimFrame(tick)
    logic()
    drawScene()

map = undefined

window.webGLStart = ->
    canvas = document.getElementById("main-canvas")
    initGL(canvas)
    initShaders()

    $("#warp").change ->
        warp = if warp then 0.0 else 1.0

    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.disable(gl.DEPTH_TEST)

    neheTexture = Texture('data/mariotiles.gif', ->
        loadJSON('data/testmap.json', (x, err) ->
            map = Tilemap(x, {
                texture: neheTexture,
                tilewidth: 16,
                tileheight: 16,
                tilegapx: 1,
                tilegapy: 1,
                tilesWide: 12})
            tick()
        )
    )

