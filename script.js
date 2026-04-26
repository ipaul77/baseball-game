// --- 1. 동적 메뉴 로직 ---
const list = document.querySelectorAll('.list');
let isSoundOn = true; 

function activeLink() {
    list.forEach((item) => item.classList.remove('active'));
    this.classList.add('active');

    const menuId = this.id;
    if (menuId === 'menu-help') {
        // 규칙 설명 창에서도 8번으로 안내를 수정했습니다.
        alert("⚾ 게임 규칙\n\n1. 컴퓨터의 3자리 숫자 맞추기!\n2. 8번의 기회 제한\n- 스트라이크: 숫자&위치 맞음\n- 볼: 숫자만 맞음\n\n⏱ 첫 숫자 입력 시 타이머 시작!\n💡 힌트 사용 시 시간에 +15초 페널티!");
    } else if (menuId === 'menu-sound') {
        isSoundOn = !isSoundOn;
        document.getElementById('sound-icon-svg').setAttribute('name', isSoundOn ? 'volume-high-outline' : 'volume-mute-outline');
    } else if (menuId === 'menu-hint') {
        useHint(); // 힌트 함수 실행
    }
}
list.forEach((item) => item.addEventListener('click', activeLink));


// --- 2. 사운드 및 꽃가루 효과 ---
const outSound = new Audio('out.mp3');
const winSound = new Audio('win.mp3');
const strikeSound = new Audio('strike.mp3');
const ballSound = new Audio('ball.mp3');

function playSound(audioObject) {
    if (isSoundOn) { audioObject.currentTime = 0; audioObject.play(); }
}

// 꽃가루 생성 함수
function shootConfetti() {
    const colors = ['#f44336', '#4caf50', '#ffeb3b', '#2196f3', '#9c27b0'];
    for(let i = 0; i < 50; i++) {
        let div = document.createElement('div');
        div.className = 'confetti';
        div.style.left = Math.random() * 100 + 'vw';
        div.style.animationDelay = Math.random() * 2 + 's';
        div.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000); // 3초 뒤 화면에서 삭제
    }
}


// --- 3. 타이머 및 명예의 전당(리더보드) 로직 ---
let timerInterval;
let elapsedTime = 0;
let isTimerRunning = false;
let leaderboard = JSON.parse(localStorage.getItem('baseballRank')) || []; // 로컬 저장소에서 불러오기

const timerDisplay = document.getElementById('timer-display');
const rankList = document.getElementById('rank-list');
const nameModal = document.getElementById('name-modal');
const playerNameInput = document.getElementById('player-name');
const recordTimeDisplay = document.getElementById('record-time');

// 화면에 타이머 00:00 형식으로 그리기
function updateTimerDisplay() {
    let m = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    let s = (elapsedTime % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `⏱ ${m}:${s}`;
    if(elapsedTime > 0) timerDisplay.style.color = "#ffeb3b"; // 시작되면 노란색
}

function startTimer() {
    if(isTimerRunning) return;
    isTimerRunning = true;
    timerInterval = setInterval(() => {
        elapsedTime++;
        updateTimerDisplay();
    }, 1000);
}

// 명예의 전당 화면에 그리기
function renderLeaderboard() {
    rankList.innerHTML = '';
    if(leaderboard.length === 0) {
        rankList.innerHTML = '<li style="justify-content:center; color:#8b949e;">아직 기록이 없습니다.</li>';
        return;
    }
    // 시간을 기준으로 오름차순(빠른 순) 정렬
    leaderboard.sort((a, b) => a.time - b.time);
    leaderboard.slice(0, 3).forEach((record, index) => {
        let medals = ['🥇', '🥈', '🥉'];
        rankList.innerHTML += `<li><span>${medals[index]} ${record.name}</span> <span style="color:#ffeb3b;">${record.time}초</span></li>`;
    });
}
renderLeaderboard();


// --- 4. 숫자 야구 게임 핵심 로직 ---
let targetNumbers = [];
let attempts = 0;
const MAX_ATTEMPTS = 8; // ⭐ 실패 횟수를 6에서 8로 변경했습니다!
let hintUsed = false; 

const userInput = document.getElementById('user-input');
const submitBtn = document.getElementById('submit-btn');
const resultBoard = document.getElementById('result-board');
const restartBtn = document.getElementById('restart-btn');

function initGame() {
    targetNumbers = [];
    attempts = 0;
    elapsedTime = 0;
    isTimerRunning = false;
    hintUsed = false;
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerDisplay.style.color = "#8b949e"; 
    
    let numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = 0; i < 3; i++) {
        let randomIndex = Math.floor(Math.random() * numbers.length);
        targetNumbers.push(numbers[randomIndex]);
        numbers.splice(randomIndex, 1); 
    }
    console.log("치트키(정답):", targetNumbers.join(''));
}

// 💡 힌트 사용
function useHint() {
    if (attempts === 0 && !isTimerRunning) { alert("게임을 시작한 뒤에 힌트를 쓸 수 있습니다!"); return; }
    if (hintUsed) { alert("힌트는 게임당 한 번만 사용할 수 있습니다!"); return; }
    
    let randomTarget = targetNumbers[Math.floor(Math.random() * 3)];
    alert(`💡 힌트: 정답에 숫자 [ ${randomTarget} ] 가 포함되어 있습니다!\n(페널티: 시간 15초 증가)`);
    elapsedTime += 15;
    updateTimerDisplay();
    hintUsed = true;
}

// 첫 입력 시 타이머 시작
userInput.addEventListener('input', () => {
    if (userInput.value.length > 0) startTimer();
});

submitBtn.addEventListener('click', playGame);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') playGame(); });

function playGame() {
    const guessStr = userInput.value;
    if (guessStr.length !== 3 || isNaN(guessStr) || new Set(guessStr.split('')).size !== 3) {
        alert("0~9 사이의 중복되지 않는 3자리 '숫자'를 입력해주세요!");
        userInput.value = ""; return;
    }

    const guessArr = guessStr.split('').map(Number);
    let strikes = 0; let balls = 0;
    attempts++; 

    for (let i = 0; i < 3; i++) {
        if (guessArr[i] === targetNumbers[i]) strikes++;
        else if (targetNumbers.includes(guessArr[i])) balls++;
    }

    let resultHTML = `<div class="log-entry"><span class="attempt-count">[${attempts}/${MAX_ATTEMPTS}]</span> 입력: <strong>${guessStr}</strong> ➔ `;
    
    if (strikes === 3) {
        // [정답]
        clearInterval(timerInterval); 
        playSound(winSound);
        shootConfetti(); 
        
        resultHTML += `<span class="strike">정답! (${elapsedTime}초) 🎉</span></div>`;
        resultBoard.insertAdjacentHTML('beforeend', resultHTML); 
        endGame(`<div style="color:#4caf50; font-size:1.2em; font-weight:bold; margin-top:10px; text-align:center;">승리! 경과 시간: ${elapsedTime}초</div>`);
        
        // Top 3 진입 확인
        if (leaderboard.length < 3 || elapsedTime < leaderboard[2].time || (leaderboard[2] && elapsedTime === leaderboard[2].time)) {
            setTimeout(() => {
                recordTimeDisplay.innerText = elapsedTime;
                nameModal.classList.remove('hidden');
                playerNameInput.focus();
            }, 1000); 
        }
    } else {
        // [오답]
        if (strikes === 0 && balls === 0) resultHTML += `<span class="out">아웃!</span>`;
        else {
            if (strikes > 0) resultHTML += `<span class="strike">${strikes}S</span> `;
            if (balls > 0) resultHTML += `<span class="ball">${balls}B</span>`;
        }
        resultHTML += `</div>`;
        resultBoard.insertAdjacentHTML('beforeend', resultHTML);
        resultBoard.scrollTop = resultBoard.scrollHeight;

        if (attempts >= MAX_ATTEMPTS) {
            clearInterval(timerInterval); 
            playSound(outSound);
            endGame(`<div class="fail-message"><h1>실패!</h1><p>정답: <strong>[ ${targetNumbers.join('')} ]</strong></p></div>`);
        } else {
            if (strikes === 0 && balls === 0) playSound(outSound);
            else if (strikes > 0 && balls > 0) { playSound(strikeSound); setTimeout(() => playSound(ballSound), 400); }
            else if (strikes > 0) playSound(strikeSound);
            else if (balls > 0) playSound(ballSound);
        }
    }
    userInput.value = ""; userInput.focus();
}

function endGame(messageHTML) {
    resultBoard.insertAdjacentHTML('beforeend', messageHTML);
    submitBtn.disabled = true; userInput.disabled = true; 
    restartBtn.style.display = "inline-block"; 
    resultBoard.scrollTop = resultBoard.scrollHeight; 
}

// 닉네임 저장
document.getElementById('save-name-btn').addEventListener('click', () => {
    let name = playerNameInput.value.trim().toUpperCase() || 'ANON';
    leaderboard.push({ name: name, time: elapsedTime });
    leaderboard.sort((a, b) => a.time - b.time);
    if(leaderboard.length > 3) leaderboard.pop(); 
    
    localStorage.setItem('baseballRank', JSON.stringify(leaderboard)); 
    renderLeaderboard(); 
    
    nameModal.classList.add('hidden'); 
    playerNameInput.value = '';
});

restartBtn.addEventListener('click', () => {
    resultBoard.innerHTML = ''; 
    submitBtn.disabled = false; userInput.disabled = false; 
    restartBtn.style.display = 'none'; 
    userInput.focus(); initGame(); 
});

initGame();