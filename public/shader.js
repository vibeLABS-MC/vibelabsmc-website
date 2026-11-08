// Live background: a small fragment shader in the same style as the vibeLABS
// welcome cards (domain-warped field, violet ramp, topographic contour lines).
// Falls back to the CSS gradient when WebGL is unavailable, draws a single
// still frame for prefers-reduced-motion, and pauses when the tab is hidden.
(() => {
  const canvas = document.getElementById('bg');
  const gl = canvas && canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;

  const vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragment = `
    precision mediump float;
    uniform vec2 r;
    uniform float t;
    vec3 ramp(float x){
      vec3 a=vec3(.027,.020,.102), b=vec3(.118,.075,.322), c=vec3(.357,.278,.839), d=vec3(.780,.490,1.);
      if(x<.42) return mix(a,b,x/.42);
      if(x<.78) return mix(b,c,(x-.42)/.36);
      return mix(c,d,(x-.78)/.22);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/r.y;
      float s=t*.06;
      vec2 w=uv+.32*vec2(sin(uv.y*3.1+s*1.3), sin(uv.x*2.3-s));
      float f=(sin(w.x*3.4+s)+sin(w.y*4.6-s*1.1)+sin((w.x+w.y)*2.4+s*.7)
              +sin(length(w-vec2(r.x/r.y*.75,.6))*5.5-s*1.6))*.125+.5;
      vec3 col=ramp(pow(f,1.35));
      float band=abs(fract(f*14.)-.5);
      col+=smoothstep(.43,.49,band)*.16*vec3(.66,.61,1.);
      vec2 q=gl_FragCoord.xy/r-.5;
      col*=1.-.9*dot(q,q);
      col*=.55+.45*smoothstep(.1,.9,gl_FragCoord.x/r.x);
      gl_FragColor=vec4(col,1.);
    }`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  }

  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  // One triangle that covers the whole screen.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program, 'r');
  const time = gl.getUniformLocation(program, 't');

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scale = Math.min(window.devicePixelRatio || 1, 1.25);
  const start = performance.now();
  let frame = 0;

  function resize() {
    const w = Math.round(canvas.clientWidth * scale);
    const h = Math.round(canvas.clientHeight * scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw(now) {
    resize();
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(time, still ? 12.0 : (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!still && !document.hidden) frame = requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame);
    if (!document.hidden) frame = requestAnimationFrame(draw);
  });
  window.addEventListener('resize', () => { if (still) draw(performance.now()); });
  frame = requestAnimationFrame(draw);
})();
