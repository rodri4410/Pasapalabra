document.addEventListener('DOMContentLoaded', () => {
    // DOM element selections
    const roscoContainer = document.getElementById('rosco-container');
    const questionDisplay = document.getElementById('question-display');
    const answerDisplay = document.getElementById('answer-display');
    const pasapalabraBtn = document.getElementById('pasapalabra-btn');
    const correctBtn = document.getElementById('correct-btn');
    const incorrectBtn = document.getElementById('incorrect-btn');
    const playBtn = document.getElementById('play-btn'); // New play button
    const timerDisplay = document.getElementById('timer-display');
    const timeInput = document.getElementById('time-input');
    const scoreCorrect = document.getElementById('score-correct');
    const scoreIncorrect = document.getElementById('score-incorrect');
    const endScreen = document.getElementById('end-screen');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const endTitle = document.getElementById('end-title');
    const endMessage = document.getElementById('end-message');
    const correctSummary = document.getElementById('correct-summary');
    const incorrectSummary = document.getElementById('incorrect-summary');

    // Game state
    const GIST_URL = 'https://gist.githubusercontent.com/rodri4410/8e664eb1e59bf2057f0c950195303742/raw/e9260a0801c9dc470967972d4aaecdcb21d1deb7/json';
    let allQuestions = [];
    let gameQuestions = [];
    let currentIndex = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let timer;
    let timeLeft;
    let lastAction;

    // Question loading
    async function loadQuestionsFromUrl() {
        try {
            const response = await fetch(GIST_URL);
            if (!response.ok) throw new Error(`Error de red: ${response.status} ${response.statusText}`);
            
            const rawText = await response.text();
            console.log("--- INICIO DEL CONTENIDO RECIBIDO DEL GIST ---");
            console.log(rawText);
            console.log("--- FIN DEL CONTENIDO RECIBIDO DEL GIST ---");

            try {
                const data = JSON.parse(rawText);
                allQuestions = data.map(q => ({ ...q, status: 0 }));
            } catch (jsonError) {
                console.error("Error de formato JSON:", jsonError);
                questionDisplay.innerHTML = `<p style="color: var(--incorrect-color);">Error: El contenido del Gist no es un JSON válido. Revisa la sintaxis (comas, comillas, etc.) y la consola para más detalles.</p>`;
                setHostButtonsState(true);
                startBtn.disabled = true;
            }

        } catch (networkError) {
            console.error("Error de red al cargar el Gist:", networkError);
            questionDisplay.innerHTML = `<p style="color: var(--incorrect-color);">Error de red al cargar las preguntas. Revisa tu conexión o la URL del Gist.</p>`;
            setHostButtonsState(true);
            startBtn.disabled = true;
        }
    }

    function buildRandomRosco(questions) {
        const groupedByLetter = questions.reduce((acc, question) => {
            const letter = question.letter.toLowerCase();
            if (!acc[letter]) acc[letter] = [];
            acc[letter].push(question);
            return acc;
        }, {});

        const finalRosco = [];
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        
        for (const letter of alphabet) {
            if (groupedByLetter[letter] && groupedByLetter[letter].length > 0) {
                const options = groupedByLetter[letter];
                const randomIndex = Math.floor(Math.random() * options.length);
                finalRosco.push(options[randomIndex]);
            } else {
                console.warn(`No se encontraron preguntas para la letra: ${letter}`);
            }
        }
        
        return finalRosco;
    }

    // Game flow
    async function setupPreGame() {
        questionDisplay.innerHTML = '<p>Cargando preguntas...</p>';
        await loadQuestionsFromUrl();
        
        if (allQuestions.length === 0) return;

        endScreen.classList.remove('active');
        startBtn.classList.remove('hidden');
        playBtn.classList.add('hidden'); // Ensure play button is hidden initially
        timeInput.disabled = false;
        timeInput.classList.remove('hidden');
        timerDisplay.classList.add('hidden');
        setHostButtonsState(true);
        resetScores();
        createRosco(true);
        questionDisplay.innerHTML = '<p>Ajusta el tiempo y presiona "Empezar" en el centro del rosco.</p>';
        answerDisplay.textContent = '';
    }

    function initGame() {
        if (allQuestions.length === 0) return;
        gameQuestions = buildRandomRosco(allQuestions);

        if (gameQuestions.length < 26) {
            questionDisplay.innerHTML = `<p style="color: var(--incorrect-color);">Error: Faltan preguntas para una o más letras en el archivo de origen.</p>`;
            return;
        }

        startBtn.classList.add('hidden');
        timeInput.disabled = true;
        timeInput.classList.add('hidden');
        timerDisplay.classList.remove('hidden');
        const timeValue = parseInt(timeInput.value, 10);
        timeLeft = !isNaN(timeValue) && timeValue > 10 ? timeValue : 200;
        
        resetScores();
        timerDisplay.textContent = timeLeft;
        createRosco(false);
        correctSummary.innerHTML = '<h3>Aciertos</h3>';
        incorrectSummary.innerHTML = '<h3>Fallos</h3>';
        setHostButtonsState(false);
        startGameLoop();
        startTimer();
    }

    function startGameLoop() {
        moveToNextQuestion();
    }

    function startTimer() {
        timer = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timer);
                endGame(false);
            }
        }, 1000);
    }

    function endGame(completed) {
        clearInterval(timer);
        setHostButtonsState(true);
        playBtn.classList.add('hidden');
        questionDisplay.innerHTML = '<p>Juego terminado.</p>';
        answerDisplay.textContent = '';
        if (completed && incorrectCount === 0) {
            endTitle.textContent = '¡Felicidades!';
            endMessage.textContent = `¡Has completado el rosco con ${correctCount} aciertos!`;
        } else if (completed) {
            endTitle.textContent = 'Juego Terminado';
            endMessage.textContent = `Aciertos: ${correctCount}, Fallos: ${incorrectCount}.`;
        } else {
            endTitle.textContent = '¡Tiempo!';
            endMessage.textContent = `Se acabó el tiempo. Aciertos: ${correctCount}, Fallos: ${incorrectCount}.`;
        }
        displaySummary();
        endScreen.classList.add('active');
    }

    function createRosco(isEmpty = false) {
        roscoContainer.innerHTML = '';
        if (isEmpty) {
            roscoContainer.appendChild(startBtn);
        }
        // Always make sure the play button is in the DOM but hidden
        roscoContainer.appendChild(playBtn);
        playBtn.classList.add('hidden');

        const letters = isEmpty ? Array.from('abcdefghijklmnopqrstuvwxyz') : gameQuestions.map(q => q.letter);
        const radius = roscoContainer.offsetWidth / 2 - 30;
        letters.forEach((letter, i) => {
            const angle = (i / letters.length) * 2 * Math.PI - Math.PI / 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            const letterDiv = document.createElement('div');
            letterDiv.id = `letter-${letter}`;
            letterDiv.className = 'letter-circle';
            letterDiv.textContent = letter;
            letterDiv.style.transform = `translate(${x}px, ${y}px)`;
            roscoContainer.appendChild(letterDiv);
        });
    }

    function moveToNextQuestion() {
        const nextQuestionIndex = findNextQuestionIndex(currentIndex);
        if (nextQuestionIndex === -1) {
            if (gameQuestions.some(q => q.status === 3)) {
                currentIndex = 0;
                moveToNextQuestion();
            } else {
                endGame(true);
            }
            return;
        }
        currentIndex = nextQuestionIndex;
        updateCurrentLetter();
        displayQuestion();
    }

    function findNextQuestionIndex(startIndex) {
        for (let i = 0; i < gameQuestions.length; i++) {
            const idx = (startIndex + i) % gameQuestions.length;
            if (gameQuestions[idx].status === 0) return idx;
        }
        for (let i = 0; i < gameQuestions.length; i++) {
            const idx = (startIndex + i) % gameQuestions.length;
            if (gameQuestions[idx].status === 3) return idx;
        }
        return -1;
    }

    function displayQuestion() {
        questionDisplay.classList.remove('question-pasapalabra', 'question-correct', 'question-incorrect');
        const currentQ = gameQuestions[currentIndex];
        questionDisplay.innerHTML = `<p>${currentQ.question}</p>`;
        answerDisplay.textContent = currentQ.answer;
    }

    function handleCorrect() {
        const currentQ = gameQuestions[currentIndex];
        currentQ.status = 1;
        correctCount++;
        updateLetterClass(currentQ.letter, 'correct');
        updateScores();
        questionDisplay.classList.add('question-correct');
        lastAction = 'correct';
        ShowContinue();
    }

    function handleIncorrect() {
        const currentQ = gameQuestions[currentIndex];
        currentQ.status = 2;
        incorrectCount++;
        updateLetterClass(currentQ.letter, 'incorrect');
        updateScores();
        questionDisplay.classList.add('question-incorrect');
        lastAction = 'incorrect';
        pauseAndShowContinue();
    }

    function handlePasapalabra() {
        const currentQ = gameQuestions[currentIndex];
        if (currentQ.status === 0) {
            currentQ.status = 3;
            updateLetterClass(currentQ.letter, 'pasapalabra');
        }
        questionDisplay.classList.add('question-pasapalabra');
        lastAction = 'pasapalabra';
        pauseAndShowContinue();
    }

    function handlePlay() {
        playBtn.classList.add('hidden');
        if (lastAction === 'pasapalabra') {
            currentIndex++;
        }
        moveToNextQuestion();
        setHostButtonsState(false);
        startTimer(); // Reanudar el tiempo
    }

    function pauseAndShowContinue() {
        clearInterval(timer); // Pausar el tiempo
        setHostButtonsState(true);
        playBtn.classList.remove('hidden');
    }
     function ShowContinue() {
        playBtn.classList.add('hidden');
        moveToNextQuestion();
    }

    function resetScores() {
        correctCount = 0;
        incorrectCount = 0;
        updateScores();
    }

    function updateScores() {
        scoreCorrect.textContent = correctCount;
        scoreIncorrect.textContent = incorrectCount;
    }

    function updateLetterClass(letter, className) {
        const letterDiv = document.getElementById(`letter-${letter}`);
        if (letterDiv) {
            if (letterDiv.classList.contains('pasapalabra')) {
                letterDiv.classList.add('pasapalabra-answered');
            } else {
                letterDiv.classList.remove('current', 'correct', 'incorrect', 'pasapalabra');
            }
            letterDiv.classList.add(className);
        }
    }

    function updateCurrentLetter() {
        document.querySelectorAll('.letter-circle').forEach(c => c.classList.remove('current'));
        const currentQ = gameQuestions[currentIndex];
        const letterDiv = document.getElementById(`letter-${currentQ.letter}`);
        if (letterDiv) letterDiv.classList.add('current');
    }
    
    function setHostButtonsState(disabled) {
        correctBtn.disabled = disabled;
        incorrectBtn.disabled = disabled;
        pasapalabraBtn.disabled = disabled;
    }

    function displaySummary() {
        correctSummary.innerHTML = '<h3>Aciertos</h3>';
        incorrectSummary.innerHTML = '<h3>Fallos</h3>';
        let correctHTML = '';
        let incorrectHTML = '';
        gameQuestions.forEach(q => {
            if (q.status === 1) {
                correctHTML += `<p><span class="correct-word">${q.letter.toUpperCase()}:</span> ${q.answer}</p>`;
            } else if (q.status === 2) {
                incorrectHTML += `<p><span class="incorrect-word">${q.letter.toUpperCase()}:</span> ${q.answer}</p>`;
            }
        });
        correctSummary.innerHTML += correctHTML || '<p>No hubo aciertos.</p>';
        incorrectSummary.innerHTML += incorrectHTML || '<p>No hubo fallos.</p>';
    }

    // Event Listeners
    startBtn.addEventListener('click', initGame);
    restartBtn.addEventListener('click', setupPreGame);
    correctBtn.addEventListener('click', handleCorrect);
    incorrectBtn.addEventListener('click', handleIncorrect);
    pasapalabraBtn.addEventListener('click', handlePasapalabra);
    playBtn.addEventListener('click', handlePlay);
    
    // Initial load
    setupPreGame();
});
