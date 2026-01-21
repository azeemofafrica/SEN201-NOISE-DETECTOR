const startButton = document.getElementById('startButton');
const statusText = document.getElementById('statusText');
const detectionScene = document.getElementById('detection-scene');

let audioContext;
let analyser;
let source;
let animationFrameId;

let isDetecting = false;
let isBeeping = false;
let oscillator;

const NOISE_THRESHOLD = 80;

startButton.addEventListener('click', toggleDetection);

function toggleDetection() {
    if (isDetecting) {
        stopDetection();
    } else {
        startDetection();
    }
}

async function startDetection() {
    isBeeping = false;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        source = audioContext.createMediaStreamSource(stream);
        
        source.connect(analyser);

        analyser.fftSize = 512;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        isDetecting = true;
        startButton.textContent = 'Stop Detection';
        statusText.textContent = 'Detecting...';
        
        detectionScene.classList.add('detecting');

        detectNoise(dataArray, bufferLength);

    } catch (err) {
        console.error('Failed to start detection:', err);
        statusText.textContent = 'Error: Mic access denied or failed.';
    }
}

function stopDetection() {
    stopBeep();
    isDetecting = false;
    startButton.textContent = 'Start Detection';
    statusText.textContent = 'Idle';

    detectionScene.classList.remove('detecting', 'noise-detected');

    if (source) {
        source.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
    }
    cancelAnimationFrame(animationFrameId);
}

function detectNoise(dataArray, bufferLength) {
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
    }
    let average = sum / bufferLength;
    console.log('Average Frequency:', average);
    if (average > NOISE_THRESHOLD && !isBeeping) {
        console.log('NOISE DETECTED!');
        statusText.textContent = 'Noise Detected!';
        detectionScene.classList.add('noise-detected');
        startBeep(); 
    }

    if (isDetecting) {
        animationFrameId = requestAnimationFrame(() => detectNoise(dataArray, bufferLength));
    }
}

function startBeep() {
    if (isBeeping || !audioContext) return;
    isBeeping = true;
    oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    oscillator.start();
}

function stopBeep() {
    if (isBeeping && oscillator) {
        oscillator.stop();
        oscillator.disconnect();
        isBeeping = false;
    }
}

const bgCanvas = document.getElementById('background-canvas');
const bgCtx = bgCanvas.getContext('2d');
bgCanvas.width = window.innerWidth;
bgCanvas.height = window.innerHeight;

let particlesArray;

class Particle {
    constructor(x, y, directionX, directionY, size, color) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
    }
    draw() {
        bgCtx.beginPath();
        bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        bgCtx.fillStyle = '#8C9BAB';
        bgCtx.fill();
    }
    update() {
        if (this.x > bgCanvas.width || this.x < 0) { this.directionX = -this.directionX; }
        if (this.y > bgCanvas.height || this.y < 0) { this.directionY = -this.directionY; }
        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
    }
}

function initParticles() {
    particlesArray = [];
    let numberOfParticles = (bgCanvas.height * bgCanvas.width) / 9000;
    for (let i = 0; i < numberOfParticles; i++) {
        let size = (Math.random() * 2) + 1;
        let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
        let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
        let directionX = (Math.random() * 0.4) - 0.2;
        let directionY = (Math.random() * 0.4) - 0.2;
        particlesArray.push(new Particle(x, y, directionX, directionY, size, ''));
    }
}

function connectParticles() {
    let opacityValue = 1;
    for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
            let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) + ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
            if (distance < (bg
