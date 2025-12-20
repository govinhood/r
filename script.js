document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('radio-stream');
    const playPauseBtn = document.getElementById('play-pause');
    const playIcon = document.getElementById('play-icon');
    const recordBtn = document.getElementById('record-btn');
    const recTimerDisplay = document.getElementById('record-timer');
    const timerDisplay = document.getElementById('play-time');
    const trackSpan = document.getElementById('track-text');
    const trackDisplay = document.getElementById('now-playing-title');
    const volumeSlider = document.getElementById('volume');
    const themeToggle = document.getElementById('theme-toggle');
    const spectrumContainer = document.getElementById('spectrum');
    const body = document.body;

    let seconds = 0;
    let timerInterval = null;
    let recSeconds = 0;
    let recInterval = null;
    let audioCtx, analyser, dataArray, source;
    let mediaRecorder, audioChunks = [], isRecording = false;

    // 1. Spectrum Generation
    const barCount = 30;
    const bars = [];
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'bar';
        spectrumContainer.appendChild(bar);
        bars.push(bar);
    }
    
    // 2. Visualizer
    function initVisualizer() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        // Settings for more activity
        analyser.fftSize = 256; // Increased detail
        analyser.smoothingTimeConstant = 0.8; // Makes movement fluid
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        draw();
    }

    function draw() {
        requestAnimationFrame(draw);
        if (audio.paused) return;
        analyser.getByteFrequencyData(dataArray);

        for (let i = 0; i < bars.length; i++) {
            // LOGARITHMIC MAPPING: 
            // Instead of i*2, we use a formula that pulls more data from the 
            // active low/mid range and spreads it across the 30 bars.
            const index = Math.floor(Math.pow(i / barCount, 1.5) * (dataArray.length * 0.8));
            let val = dataArray[index];

            // Boost higher frequencies slightly so the right side isn't flat
            if (i > barCount / 2) {
                val = val * (1 + (i / barCount) * 0.5); 
            }

            const barHeight = (val / 255) * 85; 
            // Maintain a 2% minimum height so bars don't disappear
            bars[i].style.height = `${Math.max(barHeight, 2)}%`;
        }
    }

    // 3. Playback
    playPauseBtn.addEventListener('click', () => {
        initVisualizer();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        if (audio.paused) {
            audio.play().catch(console.error);
            playIcon.className = "fas fa-pause";
            timerInterval = setInterval(() => {
                seconds++;
                let h = Math.floor(seconds / 3600).toString().padStart(2, '0');
                let m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
                let s = (seconds % 60).toString().padStart(2, '0');
                timerDisplay.textContent = `${h}:${m}:${s}`;
            }, 1000);
        } else {
            audio.pause();
            playIcon.className = "fas fa-play";
            clearInterval(timerInterval);
        }
    });

    // 4. Recording
    recordBtn.addEventListener('click', () => {
        if (!isRecording) {
            if (audio.paused) return alert("Please start the radio to record.");
            const stream = audio.captureStream ? audio.captureStream() : audio.mozCaptureStream();
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            recSeconds = 0;
            recTimerDisplay.textContent = "00:00";
            recInterval = setInterval(() => {
                recSeconds++;
                let m = Math.floor(recSeconds / 60).toString().padStart(2, '0');
                let s = (recSeconds % 60).toString().padStart(2, '0');
                recTimerDisplay.textContent = `${m}:${s}`;
            }, 1000);
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { type: 'audio/mp3' });
                const url = URL.createObjectURL(blob);
                const a = document.getElementById('download-link');
                a.href = url;
                a.download = `GovinhoodFM_Rec_${Date.now()}.mp3`;
                a.click();
            };
            mediaRecorder.start();
            isRecording = true;
            recordBtn.classList.add('recording');
            recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
        } else {
            clearInterval(recInterval);
            mediaRecorder.stop();
            isRecording = false;
            recordBtn.classList.remove('recording');
            recordBtn.innerHTML = '<i class="fas fa-circle"></i>';
        }
    });

    // 5. Utilities
    function updateMarquee() {
        const containerWidth = trackDisplay.parentElement.offsetWidth;
        const textWidth = trackDisplay.scrollWidth;
        if (textWidth > containerWidth) trackDisplay.classList.add('animate-marquee');
        else trackDisplay.classList.remove('animate-marquee');
    }

    (function connectMetadata() {
        const source = new EventSource(`https://api.zeno.fm/mounts/metadata/subscribe/uzcb0kbmc2zuv`);
        source.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                const title = data.streamTitle || "Govinhood FM";
                trackSpan.textContent = `Now Playing : ${title}`;
                document.title = title;
                setTimeout(updateMarquee, 100);
            } catch (err) { trackSpan.textContent = "Govinhood FM"; }
        };
    })();

    window.addEventListener('resize', updateMarquee);
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-theme');
        const isLight = body.classList.contains('light-theme');
        themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i> Light Mode' : '<i class="fas fa-moon"></i> Dark Mode';
    });
    volumeSlider.addEventListener('input', (e) => audio.volume = e.target.value);
});