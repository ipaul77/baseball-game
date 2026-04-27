// --- ☁️ 0. Firebase 데이터베이스 설정 (본인 키와 databaseURL 필수 입력!) ---
const firebaseConfig = {
  apiKey: "AIzaSyBjwePOTKRF2TRYNWqrEg9lyQdZ7BEtEMk",
  authDomain: "baseball-game-68fbb.firebaseapp.com",
  projectId: "baseball-game-68fbb",
  storageBucket: "baseball-game-68fbb.firebasestorage.app",
  messagingSenderId: "188603859302",
  appId: "1:188603859302:web:87ded952a72ed35b3088a7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const rankRef = db.ref('leaderboard');


// --- 1. 동적 메뉴 로직 ---
const list = document.querySelectorAll('.list');
let isSoundOn = true; 

function activeLink() {
    list.forEach((item) => item.classList.remove('active'));
    this.classList.add('active');

    const menuId = this.id;
    if (menuId === 'menu-help') {
        alert("⚾ 게임 규칙\n\n1. 컴퓨터의 3자리 숫자 맞추기!\n2. 8번의 기회 제한\n- 스트라이크: 숫자&위치 맞음\n- 볼: 숫자만 맞음\n\n⏱ 첫 숫자 입력 시 타이머 시작!\n💡 힌트 사용 시 시간에 +15초 페널티!");
    } else if (menuId === 'menu-sound') {
        isSoundOn = !isSoundOn;
        document.getElementById('sound-icon-svg').setAttribute('name', isSoundOn ? 'volume-high-outline' : 'volume-mute-outline');
    } else if (menuId === 'menu-hint') {
        useHint(); 
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

function shootConfetti() {
    const colors = ['#f44336', '#4caf50', '#ffeb3b', '#2196f3', '#9c27b0'];
    for(let i = 0; i < 50; i++) {
        let div = document.createElement('div');
        div.className = 'confetti';
        div.style.left = Math.random() * 100 + 'vw';
        div.style.animationDelay = Math.random() * 2 + 's';
        div.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000); 
    }
}


// --- 3. 타이머 및 파이어베이스 명예의 전당 로직 (Top 10 반영) ---
let timerInterval;
let elapsedTime = 0;
let isTimerRunning = false;

// 10등 순위를 담을 배열
let currentTop10 = []; 

const timerDisplay = document.getElementById('timer-display');
const rankList = document.getElementById('rank-list');
const nameModal = document.getElementById('name-modal');
const playerNameInput = document.getElementById('player-name');
const recordTimeDisplay = document.getElementById('record-time');
const resetRankBtn = document.getElementById('reset-rank-btn');

function updateTimerDisplay() {
    let m = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
    let s = (elapsedTime % 60).toString().padStart(2, '0');
    timerDisplay.innerText = `⏱ ${m}:${s}`;
    if(elapsedTime > 0) timerDisplay.style.color = "#ffeb3b"; 
}

function startTimer() {
    if(isTimerRunning) return;
    isTimerRunning = true;
    timerInterval = setInterval(() => {
        elapsedTime++;
        updateTimerDisplay();
    }, 1000);
}

// ☁️ 실시간 랭킹 (10개로 증가)
rankRef.orderByChild('time').limitToFirst(10).on('value', (snapshot) => {
    rankList.innerHTML = '';
    currentTop10 = [];
    
    if (!snapshot.exists()) {
        rankList.innerHTML = '<li style="justify-content:center; color:#8b949e;">아직 기록이 없습니다. 1등에 도전하세요!</li>';
        return;
    }

    snapshot.forEach((childSnapshot) => {
        currentTop10.push(childSnapshot.val());
    });
    currentTop10.sort((a, b) => a.time - b.time);

    // 1~3등은 메달, 4~10등은 숫자로 표시
    let medals = ['🥇', '🥈', '🥉'];
    currentTop10.forEach((record, index) => {
        let rankBadge = index < 3 ? medals[index] : `<span style="display:inline-block; width:1.5em; text-align:center;">${index + 1}.</span>`;
        rankList.innerHTML += `<li><span>${rankBadge} ${record.name}</span> <span style="color:#ffeb3b;">${record.time}초</span></li>`;
    });
});

// 🗑️ 파이어베이스 랭킹 초기화 버튼 기능
resetRankBtn.addEventListener('click', () => {
    // 실수로 누르는 것을 방지하기 위한 확인창
    if (confirm("⚠️ 정말로 명예의 전당 기록을 모두 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다!")) {
        rankRef.remove()
            .then(() => alert("랭킹이 초기화되었습니다. 새로운 시즌을 시작하세요!"))
            .catch((error) => alert("초기화 중 오류가 발생했습니다: " + error));
    }
});


// --- 4. 숫자 야구 게임 핵심 로직 ---
let targetNumbers = [];
let attempts = 0;
const MAX_ATTEMPTS = 8; 
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

function useHint() {
    if (attempts === 0 && !isTimerRunning) { alert("게임을 시작한 뒤에 힌트를 쓸 수 있습니다!"); return; }
    if (hintUsed) { alert("힌트는 게임당 한 번만 사용할 수 있습니다!"); return; }
    
    let randomTarget = targetNumbers[Math.floor(Math.random() * 3)];
    alert(`💡 힌트: 정답에 숫자 [ ${randomTarget} ] 가 포함되어 있습니다!\n(페널티: 시간 15초 증가)`);
    elapsedTime += 15;
    updateTimerDisplay();
    hintUsed = true;
}

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
        clearInterval(timerInterval); 
        playSound(winSound);
        shootConfetti(); 
        
        resultHTML += `<span class="strike">정답! (${elapsedTime}초) 🎉</span></div>`;
        resultBoard.insertAdjacentHTML('beforeend', resultHTML); 
        endGame(`<div style="color:#4caf50; font-size:1.2em; font-weight:bold; margin-top:10px; text-align:center;">승리! 경과 시간: ${elapsedTime}초</div>`);
        
        // ☁️ Top 10 진입 확인으로 수정
        if (currentTop10.length < 10 || elapsedTime < currentTop10[currentTop10.length - 1].time) {
            setTimeout(() => {
                recordTimeDisplay.innerText = elapsedTime;
                nameModal.classList.remove('hidden');
                playerNameInput.focus();
            }, 1000); 
        }
    } else {
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

// ☁️ 닉네임을 파이어베이스 서버에 저장
document.getElementById('save-name-btn').addEventListener('click', () => {
    let name = playerNameInput.value.trim().toUpperCase() || 'ANON';
    
    rankRef.push({ name: name, time: elapsedTime });
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