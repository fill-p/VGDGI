'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let texture0;
let cameraText;
let video;
let BG;
let orient = null;

let orientationEvent = { alpha: 0, beta: 0, gamma: 0 };

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, textureList) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureList), gl.STREAM_DRAW);
  
      gl.enableVertexAttribArray(shProgram.itextureCoords);
      gl.vertexAttribPointer(shProgram.itextureCoords, 2, gl.FLOAT, false, 0, 0);
  
      this.count = vertices.length / 3;
    }

    this.Draw = function() {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
      gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shProgram.iAttribVertex);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
      gl.vertexAttribPointer(shProgram.itextureCoords, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(shProgram.itextureCoords);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.itextureCoords = -1;
    this.iTextUnit = -1;

    this.Use = function() {
      gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eyeSeparation = parseFloat(document.getElementById('eyeSeparation').value);
    const convergence = parseFloat(document.getElementById('convergence').value);
    const fieldOfViev = parseFloat(document.getElementById('fieldOfViev').value);
    const near = parseFloat(document.getElementById('near').value);
    
    let top = 2000;
    let bottom = 2000;
    let left = 2000;
    let right = 2000;
    let far = 2000;
    
    top = near * Math.tan(fieldOfViev / 2.0);
    bottom = -top;

    let a = Math.tan(fieldOfViev / 2.0) * convergence;
    let b = a - eyeSeparation / 2;
    let c = a + eyeSeparation / 2;

    left = -b * near / convergence;
    right = c * near / convergence;

    let leftP = m4.orthographic(left, right, bottom, top, near, far);

    left = -c * near / convergence;
    right = b * near / convergence;

    let rightP = m4.orthographic(left, right, bottom, top, near, far);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();

  if (orientationEvent.alpha && orientationEvent.beta && orientationEvent.gamma) {
    let alpha = orientationEvent.alpha * (Math.PI / 180);
    let beta = orientationEvent.beta * (Math.PI / 180);
    let gamma = orientationEvent.gamma * (Math.PI / 180);

    let rotationMatZ = m4.axisRotation([0, 0, 1], alpha);
    let rotationMatX = m4.axisRotation([1, 0, 0], -beta);
    let rotationMayY = m4.axisRotation([0, 1, 0], gamma);

    let rotationMatrix = m4.multiply(m4.multiply(rotationMatX, rotationMayY), rotationMatZ);
    let translationMatrix = m4.translation(0, 0, -2);

    modelView = m4.multiply(rotationMatrix, translationMatrix);
  }

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0);

    let leftTrans = m4.translation(-0.01, 0, -20);
    let rightTrans = m4.translation(0.01, 0, -20);

    let matrixMult = m4.multiply(rotateToPointZero, modelView);

    if (document.getElementById('camera').checked) {
      const projection = m4.orthographic(0, 1, 0, 1, -1, 1);
      const noRot = m4.multiply(rotateToPointZero, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

      gl.uniformMatrix4fv(shProgram.iModelViewMat, false, noRot);
      gl.uniformMatrix4fv(shProgram.iProjectionMat, false, projection);

      gl.bindTexture(gl.TEXTURE_2D, cameraText);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      BG?.Draw();
    }

    gl.bindTexture(gl.TEXTURE_2D, texture0);

    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(shProgram.iModelViewMat, false, m4.multiply(leftTrans, matrixMult));
    gl.uniformMatrix4fv(shProgram.iProjectionMat, false, leftP);

    gl.colorMask(true, false, false, false);

    surface.Draw();
  
    gl.clear(gl.DEPTH_BUFFER_BIT);
  
    gl.uniformMatrix4fv(shProgram.iModelViewMat, false, m4.multiply(rightTrans, matrixMult));
    gl.uniformMatrix4fv(shProgram.iProjectionMat, false, rightP);

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
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex             = gl.getAttribLocation(prog, 'vertex');
    shProgram.iModelViewMat             = gl.getUniformLocation(prog, 'ModelViewMatrix');
    shProgram.iProjectionMat            = gl.getUniformLocation(prog, 'ProjectionMatrix');
  
    shProgram.itextureCoords               = gl.getAttribLocation(prog, 'textureCoords');
    shProgram.iTextUnit                 = gl.getUniformLocation(prog, 'textureU');

    surface = new Model('Surface');
    BG = new Model('Background');
    const { vertexList, textureList } = CreateSurfaceData();
    surface.BufferData(vertexList, textureList);
    BG.BufferData(
      [ 0.0, 0.0, 0.0, 1.0,  0.0, 0.0, 1.0, 1.0,  0.0, 1.0, 1.0, 0.0,  0.0, 1.0, 0.0, 0.0, 0.0, 0.0],
      [ 1, 1, 0, 1,  0, 0, 0, 0,  1, 0, 1, 1],
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
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

const rerender = () => {
  draw();
  window.requestAnimationFrame(rerender);
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");

        video = document.createElement('video');
        video.setAttribute('autoplay', 'true');
        cameraText = getCameraText(gl);

        document.getElementById('camera').addEventListener('change', async (e) => {
          if (document.getElementById('camera').checked) {
            getCamera().then((stream)=> video.srcObject = stream)
          } else {
            video.srcObject = null;
          }
        });

        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
  
    document.getElementById('eyeSeparation').addEventListener('input', draw);
    document.getElementById('convergence').addEventListener('input', draw);
    document.getElementById('fieldOfViev').addEventListener('input', draw);
    document.getElementById('near').addEventListener('input', draw);

  document.getElementById('orientation').addEventListener('change', async () => {
    if (document.getElementById('orientation').checked) {
      startDeviceOrientation();
    }
  });

  rerender();
}

const LoadTexture = () => {
  const image = new Image();
  image.src =
    'https://www.the3rdsequence.com/texturedb/download/116/texture/jpg/1024/irregular+wood+planks-1024x1024.jpg';
  image.crossOrigin = 'anonymous';


  image.addEventListener('load', () => {
    texture0 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  });
}

const getCamera = () => new Promise(
  (resolve) => navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then((s) => resolve(s))
  );

const getCameraText = (gl) => {
  const text = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, text);
  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return text;
};

const startDeviceOrientation = async () => {
  if (
    typeof DeviceOrientationEvent?.requestPermission !== 'function' ||
    typeof DeviceOrientationEvent === 'undefined'
  )
    throw new Error('DeviceOrientationEvent === undefined');

  try {
    const permission = await DeviceOrientationEvent.requestPermission();
    if (permission === 'granted') {
      orient = (event) => {
        const { alpha, beta, gamma } = event;
        orientationEvent.alpha = alpha;
        orientationEvent.beta = beta;
        orientationEvent.gamma = gamma;
      };
      window.addEventListener('deviceorientation', orient, true);
    }
  } catch (e) {
    alert(e);
    console.error('e', e);
  }
};
