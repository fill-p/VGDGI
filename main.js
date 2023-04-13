"use strict";

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.
let texture0, texture1;
let video, background;

const texturePoint = { x: 100, y: 400 };

// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iTextureBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices, textures) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textures), gl.STREAM_DRAW);

    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);

    this.count = vertices.length / 3;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iNormal);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };
  this.DrawBG = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
    gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iTextureCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  };
}

// Constructor
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  // Location of the uniform specifying a color for the primitive.
  this.iColor = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;

  this.iNormal = -1;
  this.iNormalMatrix = -1;

  this.iAmbientColor = -1;
  this.iDiffuseColor = -1;
  this.iSpecularColor = -1;

  this.iTextureCoords = -1;
  this.itextureU = -1;
  this.itexturePoint = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  let spans = document.getElementsByClassName("sliderValue");

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  let projection = m4.orthographic(0, 1, 0, 1, -1, 1);
  let convergence;
  let eyeSeparation;
  let ratio;
  let fieldOfViev;
  let near;

  let top;
  let bottom;
  let left;
  let right;
  let far;

  convergence = 2000.0;
  convergence = document.getElementById("convergence").value;
  spans[3].innerHTML = convergence;

  eyeSeparation = 20;
  eyeSeparation = document.getElementById("eyeSeparation").value;
  spans[0].innerHTML = eyeSeparation;

  ratio = 1.0;
  fieldOfViev = 2;
  fieldOfViev = document.getElementById("fieldOfViev").value;
  spans[1].innerHTML = fieldOfViev;

  near = 10.0;
  near = document.getElementById("near").value - 0.0;
  spans[2].innerHTML = near;
  far = 20000.0;

  top = near * Math.tan(fieldOfViev / 2.0);
  bottom = -top;

  let a = ratio * Math.tan(fieldOfViev / 2.0) * convergence;
  let b = a - eyeSeparation / 2;
  let c = a + eyeSeparation / 2;

  left = (-b * near) / convergence;
  right = (c * near) / convergence;

  let projectionLeft = m4.orthographic(left, right, bottom, top, near, far);

  left = (-c * near) / convergence;
  right = (b * near) / convergence;

  let projectionRight = m4.orthographic(left, right, bottom, top, near, far);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);
  let translateToPointZero = m4.translation(0, 0, -10);
  let translateToLeft = m4.translation(-0.03, 0, -20);
  let translateToRight = m4.translation(0.03, 0, -20);

  let noRot = m4.multiply(
    rotateToPointZero,
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  );
  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, noRot);
  const modelviewInverse = m4.inverse(matAccum1, new Float32Array(16));
  const normalMatrix = m4.transpose(modelviewInverse, new Float32Array(16));

  /* Multiply the projection matrix times the modelview matrix to give the
     combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  );
  gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

  gl.uniform3fv(shProgram.iAmbientColor, [0.5, 0, 0.4]);
  gl.uniform3fv(shProgram.iDiffuseColor, [1.3, 1.0, 0.0]);
  gl.uniform3fv(shProgram.iSpecularColor, [1.5, 1.0, 1.0]);
  /* Draw the six faces of a cube, with different colors. */
  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, noRot);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);
  gl.bindTexture(gl.TEXTURE_2D, texture0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  background.DrawBG();
  gl.uniform4fv(shProgram.iColor, [0, 0, 0, 1]);

  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1i(shProgram.itextureU, 0);

  gl.bindTexture(gl.TEXTURE_2D, texture1);
  gl.clear(gl.DEPTH_BUFFER_BIT);

  let matAccumLeft = m4.multiply(translateToLeft, matAccum0);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
  gl.colorMask(true, false, false, false);
  surface.Draw();
  gl.clear(gl.DEPTH_BUFFER_BIT);

  let matAccumRight = m4.multiply(translateToRight, matAccum0);
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
  gl.colorMask(false, true, true, false);
  surface.Draw();

  gl.colorMask(true, true, true, true);
}

let a = 0.5;
let b = 10;
let c = 0.5;

const step = (max, splines = 20) => {
  return max / (splines - 1);
};

const cos = (x) => {
  return Math.cos(x);
};

const sin = (x) => {
  return Math.sin(x);
};

function CreateSurfaceData() {
  let vertexList = [];
  let textureList = [];
  let splines = 100;

  let maxI = 10;
  let maxJ = 5.28;
  let stepI = step(maxI, splines);
  let stepJ = step(maxJ, splines);

  let getI = (i) => {
    return i / maxI;
  };

  let getJ = (j) => {
    return j / maxJ;
  };

  for (let i = -10; i <= maxI; i += stepI) {
    for (let j = -1; j <= maxJ; j += 0.1) {
      vertexList.push(
        (a * Math.sqrt(i * i + 5) * Math.cos(j)) / 3,
        (Math.sqrt(i * i + 5) * Math.sin(j)) / 3,
        (c * i) / 3
      );
      textureList.push(getI(i), getJ(j));
      vertexList.push(
        (a * Math.sqrt((i + stepI) * (i + stepI) + 5) * Math.cos(j + stepJ)) /
          3,
        (Math.sqrt((i + stepI) * (i + stepI) + 5) * Math.sin(j + stepJ)) / 3,
        (c * (i + stepI)) / 3
      );
      textureList.push(getI(i + stepI), getJ(j + stepJ));
    }
  }
  return { vertexList, textureList };
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    "ModelViewProjectionMatrix"
  );
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
  shProgram.iColor = gl.getUniformLocation(prog, "color");

  shProgram.iNormal = gl.getAttribLocation(prog, "normal");
  shProgram.iNormalMatrix = gl.getUniformLocation(prog, "normalMatrix");

  shProgram.iAmbientColor = gl.getUniformLocation(prog, "ambientColor");
  shProgram.iDiffuseColor = gl.getUniformLocation(prog, "diffuseColor");
  shProgram.iSpecularColor = gl.getUniformLocation(prog, "specularColor");
  shProgram.iColor = gl.getUniformLocation(prog, "colorU");

  shProgram.iTextureCoords = gl.getAttribLocation(prog, "textureCoords");
  shProgram.itextureU = gl.getUniformLocation(prog, "textureU");
  shProgram.itexturePoint = gl.getUniformLocation(prog, "texturePoint");

  surface = new Model("Surface");
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);
  background = new Model("Back");
  background.BufferData(
    [0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0],
    [1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]
  );

  LoadTexture();

  gl.enable(gl.DEPTH_TEST);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}

function loopDraw() {
  draw();
  window.requestAnimationFrame(loopDraw);
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {

  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    video = document.createElement("video");
    video.setAttribute("autoplay", true);
    window.vid = video;
    getWebcam();
    texture0 = CreateWebCamTexture();
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL(); // initialize the WebGL graphics context
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " +
      e +
      "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  loopDraw();
}

const reDraw = () => {
  const { vertexList, textureList } = CreateSurfaceData();
  surface.BufferData(vertexList, textureList);
  draw();
};

const LoadTexture = () => {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src =
    "https://www.the3rdsequence.com/texturedb/download/255/texture/jpg/1024/ice+frost-1024x1024.jpg";

  image.addEventListener("load", () => {
    texture1 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
};

function getWebcam() {
  navigator.getUserMedia(
    { video: true, audio: false },
    function (stream) {
      video.srcObject = stream;
    },
    function (e) {
      console.error("Rejected!", e);
    }
  );
}

function CreateWebCamTexture() {
  let textureID = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return textureID;
}
