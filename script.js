const MAX_SESSION_QUESTIONS = 5;
const SKIP_LIMIT = 2;

const state = {
    questions: [],
    sessionQuestions: [],
    questionStatuses: [],
    currentQuestionIndex: 0,
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
    fileLabel: document.getElementById('fileLabel'),
    fileSelect: document.getElementById('fileSelect'),
    settings: document.getElementById('settings'),
    timerMinutesInput: document.getElementById('timerMinutes'),
    timerDisplay: document.getElementById('timer'),
    questionDisplay: document.getElementById('question'),
    drawButton: document.getElementById('drawButton'),
    pauseButton: document.getElementById('pauseButton'),
    skipButton: document.getElementById('skipButton'),
    undoButton: document.getElementById('undoButton'),
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
    updateFileLabel();
    updateResetButton();
    updateSettingsVisibility();
}

function bindEvents() {
    ui.fileInput.addEventListener('change', handleFileInput);
    ui.fileSelect.addEventListener('change', handleFileChange);
    ui.drawButton.addEventListener('click', drawQuestion);
    ui.pauseButton.addEventListener('click', togglePause);
    ui.skipButton.addEventListener('click', skipQuestion);
    ui.undoButton.addEventListener('click', undoLastAction);
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

    updateFileLabel();

    if (fileNames.length === 1) {
        ui.fileSelect.style.display = 'none';
        ui.fileSelect.value = fileNames[0];
        state.currentFileName = stripExtension(fileNames[0]);
        handleFileChange();
    } else if (fileNames.length > 1) {
        ui.fileSelect.style.display = 'inline-block';
    }
}

function updateFileLabel() {
    const fileNames = Object.keys(state.files);
    if (fileNames.length >= 1) {
        ui.fileLabel.classList.add('dimmed');
    } else {
        ui.fileLabel.classList.remove('dimmed');
    }
}

function updateResetButton() {
    if (state.sessionQuestions.length === 0) {
        ui.resetButton.classList.add('dimmed');
    } else {
        ui.resetButton.classList.remove('dimmed');
    }
}

function updateSettingsVisibility() {
    if (state.sessionQuestions.length === 0) {
        ui.settings.classList.remove('hidden');
    } else {
        ui.settings.classList.add('hidden');
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
    resetSession({ stopRecording: true });
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

    // Se é a primeira questão, sorteia todas as 5 de uma vez
    if (state.sessionQuestions.length === 0) {
        drawAllQuestions();
        if (!state.isRecording) {
            startRecording();
        }
        // Mostra a primeira questão
        showCurrentQuestion();
        return;
    }

    // Se há uma questão sendo exibida, marca como 'answered' antes de avançar
    if (state.currentQuestionIndex < state.sessionQuestions.length &&
        state.currentQuestionIndex < MAX_SESSION_QUESTIONS) {

        // Marca a questão atual como 'answered' se ainda não tem status
        if (!state.questionStatuses[state.currentQuestionIndex]) {
            state.questionStatuses[state.currentQuestionIndex] = 'answered';
        }

        state.currentQuestionIndex++;

        // Verifica se já deve mostrar o resumo
        if (shouldShowSummary()) {
            showSummary();
            disableSessionControls();
            return;
        }

        // Se ainda há questões, mostra a próxima
        if (state.currentQuestionIndex < MAX_SESSION_QUESTIONS) {
            showCurrentQuestion();
        }
    }
}

function showCurrentQuestion() {
    if (state.currentQuestionIndex >= state.sessionQuestions.length) return;

    const currentQuestion = state.sessionQuestions[state.currentQuestionIndex];

    renderQuestion(currentQuestion);
    updateProgressIndicator();
    updateUndoButton();
    updateResetButton();
    updateSettingsVisibility();
    startTimer();

    ui.skipButton.disabled = state.skipCount >= SKIP_LIMIT;
    ui.drawButton.disabled = false;
}

function drawAllQuestions() {
    if (!state.questions.length) return;

    // Verifica se há questões suficientes
    if (state.questions.length < MAX_SESSION_QUESTIONS) {
        alert(`O arquivo precisa ter pelo menos ${MAX_SESSION_QUESTIONS} questões. Encontradas: ${state.questions.length}`);
        return;
    }

    // Sorteia 5 questões únicas
    const shuffled = [...state.questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    state.sessionQuestions = shuffled.slice(0, MAX_SESSION_QUESTIONS);
    state.questionStatuses = [];
    state.currentQuestionIndex = 0;
}

function skipQuestion() {
    // Marca a questão atual como 'skipped'
    if (state.currentQuestionIndex < state.sessionQuestions.length) {
        state.questionStatuses[state.currentQuestionIndex] = 'skipped';
        state.skipCount += 1;
    }

    state.currentQuestionIndex++;
    stopTimer();
    updateProgressIndicator();

    // Verifica se deve mostrar o resumo
    if (shouldShowSummary()) {
        showSummary();
        disableSessionControls();
        return;
    }

    // Se ainda há questões, mostra a próxima
    if (state.currentQuestionIndex < MAX_SESSION_QUESTIONS) {
        showCurrentQuestion();
    }
}

function undoLastAction() {
    if (state.currentQuestionIndex === 0) return;

    // Volta uma questão
    state.currentQuestionIndex--;

    // Remove o status da questão se ela já tinha um
    if (state.questionStatuses.length > state.currentQuestionIndex) {
        const lastStatus = state.questionStatuses.pop();
        if (lastStatus === 'skipped') {
            state.skipCount -= 1;
        }
    }

    stopTimer();

    // Mostra a questão atual (após voltar o índice)
    if (state.currentQuestionIndex >= 0) {
        const currentQuestion = state.sessionQuestions[state.currentQuestionIndex];
        renderQuestion(currentQuestion);
        startTimer();
    }

    updateProgressIndicator();
    updateUndoButton();
    updateResetButton();
    updateSettingsVisibility();
    ui.skipButton.disabled = state.skipCount >= SKIP_LIMIT;
    ui.drawButton.disabled = false;
}

function updateUndoButton() {
    ui.undoButton.disabled = state.currentQuestionIndex === 0;
}

function shouldShowSummary() {
    const answeredCount = state.questionStatuses.filter((status) => status === 'answered').length;
    return answeredCount === 3;
}

function showSummary() {
    ui.timerDisplay.classList.add('hidden');
    renderProgressDotsForSummary();

    const summaryList = document.createElement('ul');
    summaryList.className = 'summary-list';

    // Mostra apenas as questões que foram exibidas (até currentQuestionIndex)
    for (let index = 0; index < state.currentQuestionIndex; index++) {
        const question = state.sessionQuestions[index];
        const listItem = document.createElement('li');
        listItem.dataset.number = `${index + 1}.`;
        listItem.textContent = question;
        if (state.questionStatuses[index] === 'skipped') {
            listItem.classList.add('skipped');
        }
        summaryList.appendChild(listItem);
    }

    ui.questionDisplay.innerHTML = '';
    ui.questionDisplay.appendChild(summaryList);
    ui.questionDisplay.classList.remove('placeholder');
}

function resetSession(options = {}) {
    const { stopRecording: shouldStopRecording = false } = options;

    state.sessionQuestions = [];
    state.questionStatuses = [];
    state.currentQuestionIndex = 0;
    state.skipCount = 0;
    stopTimer();
    if (shouldStopRecording) {
        stopRecording();
        renderPlaceholder('Clique em "Próxima" para começar');
    }

    setTimerDimmed();
    updateProgressIndicator();
    updateUndoButton();
    updateResetButton();
    updateSettingsVisibility();
    ui.drawButton.disabled = state.questions.length === 0;
    ui.skipButton.disabled = true;
}

function resetQuestions() {
    state.questions = [];
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

        // Se a questão já tem status (foi respondida ou pulada)
        if (state.questionStatuses[index] !== undefined) {
            const status = state.questionStatuses[index];
            dot.classList.add(status === 'skipped' ? 'skipped' : 'completed');
        }
        // Se é a questão atual sendo exibida (sem status ainda)
        else if (index === state.currentQuestionIndex) {
            dot.classList.add('current');
        }
        // Caso contrário, mantém o estilo padrão (cinza)
    });
}

function renderProgressDotsForSummary() {
    ui.dots.forEach((dot, index) => {
        dot.classList.remove('completed', 'current', 'skipped');
        if (index < state.currentQuestionIndex) {
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
    } else if ((event.key === 'z' || event.key === 'Z') && !ui.undoButton.disabled) {
        event.preventDefault();
        undoLastAction();
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
        <span class="keyboard-hint">p</span>
    `;
}

function playButtonContent() {
    return `
        <svg class="icon" viewBox="0 0 24 24">
            <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        <span class="keyboard-hint">p</span>
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
