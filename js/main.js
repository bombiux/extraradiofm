// Audio element and playback controls
const audio = document.getElementById('radio-stream');
const playPauseBtn = document.getElementById('play-pause-btn');
const volumeSlider = document.getElementById('volume-slider');
const playIcon = '<i class="fas fa-play"></i>';
const pauseIcon = '<i class="fas fa-pause"></i>';
let isPlaying = false;

// Set initial volume
audio.volume = 0.7;

// Initialize audio context on page load
ensureAudioContextIsRunning();

document.addEventListener('DOMContentLoaded', () => {
    // Automatically click the play button to start the radio
    if (playPauseBtn) {
        playPauseBtn.click();
    }
});

// Visualizer setup
const svg = document.getElementById('waveform-svg');
let animationFrameId;
let audioContext = null; 
let analyser;
let source;
let barCount;
const bars = [];
const svgNS = "http://www.w3.org/2000/svg";

// --- Funciones del AudioContext para Visualización ---

/**
 * Inicializa el AudioContext y configura el analizador.
 * Solo se ejecuta la primera vez.
 */
function initAudioContext() {
    if (!audioContext) {
        // Creamos el contexto de audio
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Configuramos la cadena de análisis
        analyser = audioContext.createAnalyser();
        source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        // Configuramos el analizador para la visualización
        analyser.fftSize = 256;
        barCount = analyser.frequencyBinCount;

        // Limpiamos el contenido de fallback del SVG y creamos las barras
        if (svg) {
            svg.innerHTML = '';

            // No crear gradientes, usar color blanco directamente
            // No es necesario el elemento defs para gradientes si usamos color sólido

            const barWidth = 2;
            const barSpacing = 0.5;
            const totalBarWidth = barCount * (barWidth + barSpacing);
            const svgWidth = 300; // From viewBox
            const startX = (svgWidth - totalBarWidth) / 2;

            for (let i = 0; i < barCount; i++) {
                const rectUp = document.createElementNS(svgNS, 'rect');
                const rectDown = document.createElementNS(svgNS, 'rect');

                rectUp.setAttribute('x', startX + i * (barWidth + barSpacing));
                rectUp.setAttribute('y', 25); // Initial y, will be updated
                rectUp.setAttribute('width', barWidth);
                rectUp.setAttribute('height', 0); // Initial height, will be updated
                rectUp.setAttribute('fill', 'white');
                svg.appendChild(rectUp);
                bars.push(rectUp);

                rectDown.setAttribute('x', startX + i * (barWidth + barSpacing));
                rectDown.setAttribute('y', 25); // Initial y, will be updated
                rectDown.setAttribute('width', barWidth);
                rectDown.setAttribute('height', 0); // Initial height, will be updated
                rectDown.setAttribute('fill', 'white');
                svg.appendChild(rectDown);
                bars.push(rectDown);
            }
        }
    }
}

/**
 * Función que se ejecuta en la primera interacción del usuario para 
 * desbloquear y reanudar el AudioContext (esencial para móviles).
 */
async function ensureAudioContextIsRunning() {
    if (!audioContext) {
        initAudioContext();
    }
    
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log('AudioContext resumed successfully on user interaction.');
    }

    // Remove listeners once the context is running
    if (audioContext.state === 'running') {
        document.removeEventListener('click', ensureAudioContextIsRunning);
        document.removeEventListener('touchstart', ensureAudioContextIsRunning);
    }
    return audioContext;
}

// Inicializar el AudioContext en la primera interacción de la página
document.addEventListener('click', ensureAudioContextIsRunning);
document.addEventListener('touchstart', ensureAudioContextIsRunning);

// --- Manejo del Reproductor ---

if (audio && playPauseBtn) {
    
    // Se elimina la lógica del spinner de 'loadstart' para controlarla solo desde el 'click'
    audio.addEventListener('loadstart', () => {
        console.log("Loading radio stream...");
        // Ya no necesitamos mostrar el spinner aquí.
    });

    audio.addEventListener('canplay', () => {
        console.log("Radio stream is ready to play");
    });

    audio.addEventListener('playing', () => {
        console.log("Radio stream is playing");
        // Actualizar el estado de reproducción incluso si está silenciado (para autoplay)
        playPauseBtn.innerHTML = pauseIcon;
        isPlaying = true;

        // Cambiar el indicador LIVE a verde cuando está sonando
        const liveIndicator = document.querySelector('.live-text');
        if (liveIndicator) {
            liveIndicator.textContent = 'LIVE';
            liveIndicator.parentElement.style.backgroundColor = '#4CAF50'; // Verde
            liveIndicator.parentElement.classList.add('live'); // Añadir animación de pulso
        }

        // Ensure visualizer animation starts when playing
        if (!animationFrameId) {
            animateVisualizer();
        }
    });

    audio.addEventListener('pause', () => {
        console.log("Radio stream is paused");
        playPauseBtn.innerHTML = playIcon;
        isPlaying = false;

        // Cambiar el indicador LIVE a amarillo cuando está en pausa
        const liveIndicator = document.querySelector('.live-text');
        if (liveIndicator) {
            liveIndicator.textContent = 'Pausa';
            liveIndicator.parentElement.style.backgroundColor = '#FFC107'; // Amarillo
            liveIndicator.parentElement.classList.remove('live'); // Quitar animación de pulso
        }
    });

    audio.addEventListener('error', (e) => {
        console.error("Error loading radio stream:", e);
        // Si hay un error, mantener el icono de play
        playPauseBtn.innerHTML = playIcon;
        isPlaying = false;

        // Cambiar el indicador LIVE a rojo con texto de "OFFLINE"
        const liveIndicator = document.querySelector('.live-text');
        if (liveIndicator) {
            liveIndicator.textContent = 'OFFLINE';
            liveIndicator.parentElement.style.backgroundColor = '#9E9E9E'; // Gris
            liveIndicator.parentElement.classList.remove('live'); // Quitar animación de pulso
        }
    });

    audio.addEventListener('ended', () => {
        console.log("Radio stream ended");
        playPauseBtn.innerHTML = playIcon;
        isPlaying = false;

        // Cambiar el indicador LIVE a gris cuando termina
        const liveIndicator = document.querySelector('.live-text');
        if (liveIndicator) {
            liveIndicator.textContent = 'OFFLINE';
            liveIndicator.parentElement.style.backgroundColor = '#9E9E9E'; // Gris
            liveIndicator.parentElement.classList.remove('live'); // Quitar animación de pulso
        }
    });

    playPauseBtn.addEventListener('click', async () => { // Make the function async
        // Ensure AudioContext is running before attempting to play
        try {
            await ensureAudioContextIsRunning();
        } catch (e) {
            console.error("Failed to ensure AudioContext is running:", e);
            // Optionally, show an error to the user
            playPauseBtn.innerHTML = playIcon; // Revert to play icon
            return; // Stop execution if AudioContext can't be started
        }

        // Case 1: It's playing but muted (first click after autoplay)
        if (!audio.paused && audio.muted) {
            audio.muted = false;
            // Manually trigger the "playing" UI, since the event may have already fired
            playPauseBtn.innerHTML = pauseIcon;
            isPlaying = true;
        }
        // Case 2: It's audibly playing, so pause it
        else if (isPlaying) {
            audio.pause();
        }
        // Case 3: It's paused, so play it (or if it was initially paused, attempt to play)
        else {
            // First, try to unmute if it was muted by autoplay policy
            if (audio.muted) {
                audio.muted = false;
            }

            playPauseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log("Playback started successfully");
                    })
                    .catch(e => {
                        console.error("Playback failed:", e);
                        playPauseBtn.innerHTML = playIcon;
                    });
            }
        }
    });

    // Volume control functionality
    if (volumeSlider) {
        volumeSlider.addEventListener('input', function() {
            audio.volume = this.value;
        });
    }
    
    // --- Lógica de Visualización (Animación) ---
    
    function animateVisualizer() {
        if (isPlaying && analyser) {
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            analyser.getByteFrequencyData(dataArray);

            const isAudioDataAvailable = dataArray.some(value => value > 0);

            for (let i = 0; i < barCount; i++) {
                let value;
                if (isAudioDataAvailable) {
                    // Para crear el efecto de onda que sale del centro y se ramifica hacia los lados,
                    // calculamos la distancia desde el centro y ajustamos el valor en consecuencia
                    const center = barCount / 2;
                    const distanceFromCenter = Math.abs(i - center);

                    // Mapear la barra actual a un índice de frecuencia
                    const dataIndex = Math.min(Math.floor((distanceFromCenter / (barCount/2)) * (bufferLength/2)), bufferLength - 1);

                    if (dataIndex < dataArray.length) {
                        // Aplicar una transformación logarítmica para mayor sensibilidad
                        value = Math.pow(dataArray[dataIndex] / 255, 0.8) * 255;

                        // Aplicar una atenuación basada en la distancia del centro para simular la propagación
                        const attenuation = 1 - (distanceFromCenter / center);
                        value = value * attenuation;
                    } else {
                        value = 0;
                    }
                } else {
                    // Fallback para una animación sutil si no hay audio (o está silenciado)
                    value = Math.random() * 50;
                }

                // Normaliza el valor para la altura del SVG con una escala más dinámica
                const normalizedValue = value / 256 * 45 + 3;

                // Update the two bars for each frequency bin
                const rectUp = bars[i * 2];
                const rectDown = bars[i * 2 + 1];

                // Para crear el efecto de barras que se extienden desde el centro hacia los lados,
                // necesitamos modificar la lógica de posición y tamaño
                rectUp.setAttribute('height', normalizedValue);
                rectUp.setAttribute('y', 25 - normalizedValue);

                rectDown.setAttribute('height', normalizedValue);
                rectDown.setAttribute('y', 25);
            }
        }

        animationFrameId = requestAnimationFrame(animateVisualizer);
    }

    // Controlar el inicio y fin de la animación
    audio.addEventListener('playing', () => {
        if (!animationFrameId) {
            animateVisualizer();
        }
    });

    audio.addEventListener('pause', () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    });

    audio.addEventListener('ended', () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    });

    // Controlar el inicio y fin de la animación
    audio.addEventListener('playing', () => {
        if (!animationFrameId) {
            animateVisualizer();
        }
    });

    audio.addEventListener('pause', () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    });

    audio.addEventListener('ended', () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    });
}