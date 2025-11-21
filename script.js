const MAX_SESSION_QUESTIONS = 5;
const SKIP_LIMIT = 2;

const state = {
    questions: [],
    usedQuestionIndexes: [],
    sessionQuestions: [],
    questionStatuses: [],
    skipCount: 0,
    timerId: null,
    timeLeft: 0,
    isPaused: false,
    warningPlayed: false,
    dangerPlayed: false,
    files: {},
    currentFileName: '',
    recorder: null,
    recordingStream: null,
    audioChunks: [],
    isRecording: false
};

const ui = {
    fileInput: document.getElementById('fileInput'),
    fileSelect: document.getElementById('fileSelect'),
    timerMinutesInput: document.getElementById('timerMinutes'),
    timerDisplay: document.getElementById('timer'),
    questionDisplay: document.getElementById('question'),
    drawButton: document.getElementById('drawButton'),
    pauseButton: document.getElementById('pauseButton'),
    skipButton: document.getElementById('skipButton'),
    resetButton: document.getElementById('resetButton'),
    recordingIndicator: document.getElementById('recordingIndicator'),
    dots: [
        document.getElementById('dot1'),
        document.getElementById('dot2'),
        document.getElementById('dot3'),
        document.getElementById('dot4'),
        document.getElementById('dot5')
    ]
};

init();

function init() {
    bindEvents();
    setTimerDimmed();
    renderPlaceholder();
    updateProgressIndicator();
}

function bindEvents() {
    ui.fileInput.addEventListener('change', handleFileInput);
    ui.fileSelect.addEventListener('change', handleFileChange);
    ui.drawButton.addEventListener('click', drawQuestion);
    ui.pauseButton.addEventListener('click', togglePause);
    ui.skipButton.addEventListener('click', skipQuestion);
    ui.resetButton.addEventListener('click', () => resetSession({ stopRecording: true }));
    document.addEventListener('keydown', handleShortcuts);
}

function handleFileInput(event) {
    Array.from(event.target.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = ({ target }) => {
            state.files[file.name] = target?.result || '';
            refreshFileSelect();
        };
        reader.readAsText(file);
    });
}

function refreshFileSelect() {
    ui.fileSelect.innerHTML = '<option value="">Escolha a prova</option>';
    const fileNames = Object.keys(state.files);

    fileNames.forEach((fileName) => {
        const option = document.createElement('option');
        option.value = fileName;
        option.textContent = fileName;
        ui.fileSelect.appendChild(option);
    });

    if (fileNames.length === 1) {
        ui.fileSelect.style.display = 'none';
        ui.fileSelect.value = fileNames[0];
        state.currentFileName = stripExtension(fileNames[0]);
        handleFileChange();
    } else if (fileNames.length > 1) {
        ui.fileSelect.style.display = 'inline-block';
    }
}

function handleFileChange() {
    const selectedFile = ui.fileSelect.value;
    const content = state.files[selectedFile];

    if (!selectedFile || !content) {
        resetQuestions();
        return;
    }

    state.currentFileName = stripExtension(selectedFile);
    state.questions = parseQuestions(content);
    state.usedQuestionIndexes = [];
    resetSession();
    renderPlaceholder('Clique em "Próxima" para começar');
    ui.drawButton.disabled = state.questions.length === 0;
}

function parseQuestions(content) {
    const questions = [];
    const lines = content.split('\n');

    lines.forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) return;

        if (/^\d+[\.\)]/.test(line)) {
            const question = line.replace(/^\d+[\.\)]\s*/, '').trim();
            if (question) {
                questions.push(question);
            }
        }
    });

    return questions;
}

function drawQuestion() {
    if (!state.questions.length) return;

    if (shouldShowSummary()) {
        showSummary();
        disableSessionControls();
        return;
    }

    if (state.sessionQuestions.length === 0 && !state.isRecording) {
        startRecording();
    }

    if (state.sessionQuestions.length >= MAX_SESSION_QUESTIONS) {
        alert('Este aluno já tem 5 questões designadas! Use "Nova Prova" para começar uma nova sessão.');
        return;
    }

    if (state.usedQuestionIndexes.length === state.questions.length) {
        state.usedQuestionIndexes = [];
    }

    const availableIndexes = state.questions
        .map((_, index) => index)
        .filter((index) => !state.usedQuestionIndexes.includes(index));

    const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
    const selectedQuestion = state.questions[randomIndex];

    state.usedQuestionIndexes.push(randomIndex);
    state.sessionQuestions.push(selectedQuestion);
    state.questionStatuses.push('answered');

    renderQuestion(selectedQuestion);
    updateProgressIndicator();
    startTimer();

    ui.skipButton.disabled = state.skipCount >= SKIP_LIMIT;
    ui.drawButton.disabled = false;
}

function skipQuestion() {
    if (state.questionStatuses.length > 0) {
        state.questionStatuses[state.questionStatuses.length - 1] = 'skipped';
        state.skipCount += 1;
    }

    stopTimer();
    updateProgressIndicator();

    if (shouldShowSummary()) {
        showSummary();
        disableSessionControls();
        return;
    }

    if (state.sessionQuestions.length < MAX_SESSION_QUESTIONS) {
        drawQuestion();
    }
}

function shouldShowSummary() {
    const answeredCount = state.questionStatuses.filter((status) => status === 'answered').length;
    const skippedCount = state.questionStatuses.filter((status) => status === 'skipped').length;
    return (answeredCount === 3 && skippedCount === 0) || state.sessionQuestions.length === MAX_SESSION_QUESTIONS;
}

function showSummary() {
    ui.timerDisplay.classList.add('hidden');
    renderProgressDotsForSummary();

    const summaryList = document.createElement('ul');
    summaryList.className = 'summary-list';

    state.sessionQuestions.forEach((question, index) => {
        const listItem = document.createElement('li');
        listItem.dataset.number = `${index + 1}.`;
        listItem.textContent = question;
        if (state.questionStatuses[index] === 'skipped') {
            listItem.classList.add('skipped');
        }
        summaryList.appendChild(listItem);
    });

    ui.questionDisplay.innerHTML = '';
    ui.questionDisplay.appendChild(summaryList);
    ui.questionDisplay.classList.remove('placeholder');
}

function resetSession(options = {}) {
    const { stopRecording: shouldStopRecording = false } = options;

    state.sessionQuestions = [];
    state.questionStatuses = [];
    state.skipCount = 0;
    stopTimer();
    if (shouldStopRecording) {
        stopRecording();
    }

    setTimerDimmed();
    updateProgressIndicator();
    ui.drawButton.disabled = state.questions.length === 0;
    ui.skipButton.disabled = true;
}

function resetQuestions() {
    state.questions = [];
    state.usedQuestionIndexes = [];
    resetSession();
    renderPlaceholder();
}

function renderQuestion(text) {
    ui.questionDisplay.textContent = text;
    ui.questionDisplay.classList.remove('placeholder');
    ui.timerDisplay.classList.remove('hidden');
}

function renderPlaceholder(message = 'Carregue um arquivo e clique em "Próxima" para começar') {
    ui.questionDisplay.textContent = message;
    ui.questionDisplay.classList.add('placeholder');
    ui.timerDisplay.classList.remove('hidden');
}

function disableSessionControls() {
    ui.drawButton.disabled = true;
    ui.skipButton.disabled = true;
}

function updateProgressIndicator() {
    ui.dots.forEach((dot, index) => {
        dot.classList.remove('completed', 'current', 'skipped');

        if (index < state.sessionQuestions.length - 1) {
            const status = state.questionStatuses[index];
            dot.classList.add(status === 'skipped' ? 'skipped' : 'completed');
        } else if (index === state.sessionQuestions.length - 1) {
            dot.classList.add('current');
        }
    });
}

function renderProgressDotsForSummary() {
    ui.dots.forEach((dot, index) => {
        dot.classList.remove('completed', 'current', 'skipped');
        if (index < state.sessionQuestions.length) {
            const status = state.questionStatuses[index];
            dot.classList.add(status === 'skipped' ? 'skipped' : 'completed');
        }
    });
}

function handleShortcuts(event) {
    if (event.key === 'Enter' && !ui.drawButton.disabled) {
        event.preventDefault();
        drawQuestion();
    } else if (event.key === ' ' && !ui.skipButton.disabled) {
        event.preventDefault();
        skipQuestion();
    } else if ((event.key === 'p' || event.key === 'P') && !ui.pauseButton.disabled) {
        event.preventDefault();
        togglePause();
    } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        resetSession({ stopRecording: true });
    }
}

function setTimerDimmed() {
    state.timeLeft = 0;
    ui.timerDisplay.classList.remove('hidden', 'normal', 'warning', 'danger');
    ui.timerDisplay.classList.add('dimmed');
    ui.timerDisplay.textContent = '0:00';
    resetPauseButton();
}

function startTimer() {
    stopTimer();

    state.isPaused = false;
    state.warningPlayed = false;
    state.dangerPlayed = false;
    state.timeLeft = (parseInt(ui.timerMinutesInput.value, 10) || 5) * 60;

    ui.pauseButton.disabled = false;
    ui.timerDisplay.classList.remove('dimmed', 'hidden');
    updateTimerDisplay();
    playStartSound();

    state.timerId = setInterval(() => {
        if (state.isPaused) return;

        state.timeLeft -= 1;
        updateTimerDisplay();
        handleTimerSounds();

        if (state.timeLeft <= 0) {
            playEndSound();
            stopTimer();
        }
    }, 1000);
}

function stopTimer() {
    if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
    }
    state.timeLeft = 0;
    state.isPaused = false;
    ui.pauseButton.disabled = true;
    resetPauseButton();
}

function togglePause() {
    state.isPaused = !state.isPaused;
    ui.pauseButton.innerHTML = state.isPaused ? playButtonContent() : pauseButtonContent();
}

function resetPauseButton() {
    ui.pauseButton.innerHTML = pauseButtonContent();
}

function pauseButtonContent() {
    return `
        <svg class="icon" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
        </svg>
        Pausa<span class="keyboard-hint">p</span>
    `;
}

function playButtonContent() {
    return `
        <svg class="icon" viewBox="0 0 24 24">
            <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Retomar<span class="keyboard-hint">p</span>
    `;
}

function updateTimerDisplay() {
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = state.timeLeft % 60;
    ui.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (ui.timerDisplay.classList.contains('dimmed')) return;

    ui.timerDisplay.classList.remove('normal', 'warning', 'danger');
    if (state.timeLeft <= 30) {
        ui.timerDisplay.classList.add('danger');
    } else if (state.timeLeft <= 60) {
        ui.timerDisplay.classList.add('warning');
    } else {
        ui.timerDisplay.classList.add('normal');
    }
}

function handleTimerSounds() {
    if (state.timeLeft === 60 && !state.warningPlayed) {
        playWarningSound();
        state.warningPlayed = true;
    }

    if (state.timeLeft === 30 && !state.dangerPlayed) {
        playDangerSound();
        state.dangerPlayed = true;
    }
}

function playSound(frequency, duration, type = 'sine') {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playStartSound() {
    playSound(523.25, 0.15);
    setTimeout(() => playSound(659.25, 0.15), 100);
    setTimeout(() => playSound(783.99, 0.2), 200);
}

function playWarningSound() {
    playSound(440, 0.2);
    setTimeout(() => playSound(440, 0.2), 250);
}

function playDangerSound() {
    playSound(659.25, 0.15);
    setTimeout(() => playSound(659.25, 0.15), 150);
    setTimeout(() => playSound(659.25, 0.2), 300);
}

function playEndSound() {
    playSound(783.99, 0.15);
    setTimeout(() => playSound(659.25, 0.15), 150);
    setTimeout(() => playSound(523.25, 0.3), 300);
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType =
            (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus') && 'audio/webm;codecs=opus') ||
            (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm') && 'audio/webm') ||
            (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4') && 'audio/mp4') ||
            undefined;

        state.recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        state.recordingStream = stream;
        state.audioChunks = [];

        state.recorder.ondataavailable = ({ data }) => {
            if (data.size > 0) state.audioChunks.push(data);
        };

        state.recorder.onerror = (event) => {
            console.error('Recorder error:', event.error);
        };

        state.recorder.onstop = () => {
            const blobType = mimeType || 'audio/webm';
            const audioBlob = new Blob(state.audioChunks, { type: blobType });
            if (state.audioChunks.length > 0) {
                downloadAudio(audioBlob, blobType);
            }
            if (state.recordingStream) {
                state.recordingStream.getTracks().forEach((track) => track.stop());
                state.recordingStream = null;
            }
            state.isRecording = false;
            ui.recordingIndicator.classList.remove('active');
        };

        state.recorder.start(1000); // timeslice para evitar estouro de buffer no Safari/iPad
        state.isRecording = true;
        ui.recordingIndicator.classList.add('active');
    } catch (error) {
        console.error('Erro ao iniciar gravação:', error);
        alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
}

function stopRecording() {
    if (state.recorder && state.isRecording) {
        state.recorder.stop();
        state.isRecording = false;
        ui.recordingIndicator.classList.remove('active');
    }

    if (state.recordingStream) {
        state.recordingStream.getTracks().forEach((track) => track.stop());
        state.recordingStream = null;
    }
}

function downloadAudio(audioBlob, mimeType) {
    const url = URL.createObjectURL(audioBlob);
    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = url;

    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    const extension = mimeType && mimeType.includes('mp4') ? 'm4a' : 'webm';
    const fileName = `prova_${state.currentFileName}_${timestamp}.${extension}`;

    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }, 100);
}

function stripExtension(fileName) {
    return fileName.replace(/\.(md|txt)$/i, '');
}
