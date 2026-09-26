import { CameraPosition, CameraShape } from '@/types/electron';

export interface VideoCompositor {
  canvas: HTMLCanvasElement;
  render: () => void;
  destroy: () => void;
  updateConfig: (position: CameraPosition, shape: CameraShape) => void;
}

export function createWebGLCompositor(
  screenVid: HTMLVideoElement,
  camVid: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
  initialPosition: CameraPosition = 'bottom-right',
  initialShape: CameraShape = 'circle'
): VideoCompositor | null {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    console.warn('WebGL not available for hardware compositor');
    return null;
  }

  const vsSource = `
    attribute vec2 a_pos;
    varying vec2 v_uv;
    void main() {
      v_uv = vec2((a_pos.x + 1.0) * 0.5, 1.0 - (a_pos.y + 1.0) * 0.5);
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  const fsSource = `
    precision mediump float;
    uniform sampler2D u_screen;
    uniform sampler2D u_camera;
    uniform vec4 u_camRect; // [x, y, width, height] in 0..1
    uniform int u_camShape; // 0 = circle, 1 = rectangle
    uniform int u_hasCam;   // 1 if camera ready
    varying vec2 v_uv;

    void main() {
      vec4 screenColor = texture2D(u_screen, v_uv);

      if (u_hasCam == 1 &&
          v_uv.x >= u_camRect.x && v_uv.x <= (u_camRect.x + u_camRect.z) &&
          v_uv.y >= u_camRect.y && v_uv.y <= (u_camRect.y + u_camRect.w)) {

        vec2 camUv = vec2(
          (v_uv.x - u_camRect.x) / u_camRect.z,
          (v_uv.y - u_camRect.y) / u_camRect.w
        );
        // Mirror horizontally for natural webcam feel
        camUv.x = 1.0 - camUv.x;

        if (u_camShape == 0) {
          // Circular PiP
          float dist = distance(camUv, vec2(0.5, 0.5));
          if (dist < 0.485) {
            gl_FragColor = texture2D(u_camera, camUv);
            return;
          } else if (dist <= 0.5) {
            // Accent purple border (#6366f1)
            gl_FragColor = vec4(0.388, 0.4, 0.945, 1.0);
            return;
          }
        } else {
          // Rectangle PiP
          float bx = 0.012;
          float by = 0.02;
          if (camUv.x < bx || camUv.x > (1.0 - bx) || camUv.y < by || camUv.y > (1.0 - by)) {
            gl_FragColor = vec4(0.388, 0.4, 0.945, 1.0);
            return;
          }
          gl_FragColor = texture2D(u_camera, camUv);
          return;
        }
      }

      gl_FragColor = screenColor;
    }
  `;

  function createShader(type: number, src: string): WebGLShader | null {
    if (!gl) return null;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  const vs = createShader(gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return null;
  }

  gl.useProgram(program);

  // Screen Quad Vertices
  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPosLoc = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPosLoc);
  gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

  // Setup Textures
  function createTexture(): WebGLTexture | null {
    if (!gl) return null;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  const screenTex = createTexture();
  const camTex = createTexture();

  const uScreenLoc = gl.getUniformLocation(program, 'u_screen');
  const uCamLoc = gl.getUniformLocation(program, 'u_camera');
  const uCamRectLoc = gl.getUniformLocation(program, 'u_camRect');
  const uCamShapeLoc = gl.getUniformLocation(program, 'u_camShape');
  const uHasCamLoc = gl.getUniformLocation(program, 'u_hasCam');

  gl.uniform1i(uScreenLoc, 0);
  gl.uniform1i(uCamLoc, 1);

  let currentPosition = initialPosition;
  let currentShape = initialShape;

  function calculateCamRect() {
    const pad = Math.round(targetWidth * (40 / 1920));
    let pixelW = 0;
    let pixelH = 0;

    if (currentShape === 'circle') {
      const diameter = Math.round(targetWidth * (320 / 1920));
      pixelW = diameter;
      pixelH = diameter;
    } else {
      pixelW = Math.round(targetWidth * (420 / 1920));
      pixelH = Math.round(targetHeight * (236 / 1080));
    }

    let rx = targetWidth - pad - pixelW;
    let ry = targetHeight - pad - pixelH;

    if (currentPosition === 'bottom-left') {
      rx = pad;
      ry = targetHeight - pad - pixelH;
    } else if (currentPosition === 'top-right') {
      rx = targetWidth - pad - pixelW;
      ry = pad;
    } else if (currentPosition === 'top-left') {
      rx = pad;
      ry = pad;
    }

    return [
      rx / targetWidth,
      ry / targetHeight,
      pixelW / targetWidth,
      pixelH / targetHeight,
    ];
  }

  gl.viewport(0, 0, targetWidth, targetHeight);

  return {
    canvas,
    updateConfig: (position: CameraPosition, shape: CameraShape) => {
      currentPosition = position;
      currentShape = shape;
    },
    render: () => {
      if (!gl || !program) return;
      gl.useProgram(program);

      // 1. Upload screen video frame to GPU texture
      if (screenVid.readyState >= 2) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, screenTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, screenVid);
      }

      // 2. Upload camera video frame to GPU texture if active
      const hasCam = camVid && camVid.readyState >= 2;
      gl.uniform1i(uHasCamLoc, hasCam ? 1 : 0);

      if (hasCam) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, camTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, camVid);
      }

      // 3. Set camera rect & shape
      const rect = calculateCamRect();
      gl.uniform4f(uCamRectLoc, rect[0], rect[1], rect[2], rect[3]);
      gl.uniform1i(uCamShapeLoc, currentShape === 'circle' ? 0 : 1);

      // 4. Single-pass GPU composite
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    destroy: () => {
      try {
        if (gl) {
          if (screenTex) gl.deleteTexture(screenTex);
          if (camTex) gl.deleteTexture(camTex);
          if (quadBuffer) gl.deleteBuffer(quadBuffer);
          if (program) gl.deleteProgram(program);
          if (vs) gl.deleteShader(vs);
          if (fs) gl.deleteShader(fs);
        }
      } catch {}
    },
  };
}
