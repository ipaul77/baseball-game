// --- ☁️ 0. Firebase 데이터베이스 설정 (본인 키와 databaseURL 필수 입력!) ---
const firebaseConfig = {
    apiKey: "본인의 API 키를 여기에 붙여넣으세요",
    authDomain: "본인의 프로젝트명.firebaseapp.com",
    databaseURL: "https://본인의-데이터베이스-주소.firebaseio.com",
    projectId: "본인의 프로젝트명",
    storageBucket: "본인의 프로젝트명.appspot.com",
    messagingSenderId: "숫자",
    appId: "본인의 앱 ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();


// --- 📅 1. 3일 주기 시즌제 및 남은 시간 카운트다운 로직 ---
const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3일 = 밀리초

// 현재 시즌 번호와 다음 시즌 초기화 시간 계산
function getSeasonData() {
    const currentMs = Date.now();
    const seasonNumber = Math.floor(currentMs / threeDaysInMs);
    const nextSeasonMs = (seasonNumber + 1) * threeDaysInMs;
    return {
        current: "season_" + seasonNumber,
        prev: "season_" + (seasonNumber - 1),
        nextTime: nextSeasonMs
    };
}

const seasonData = getSeasonData();
const rankRef = db.ref('leaderboard/' + seasonData.current); // 이번 시즌 DB 연결

// 카운트다운 타이머 (1초마다 실행)
function updateSeasonCountdown() {
    const now = Date.now();
    const diff = seasonData.nextTime - now;

    // 만약 타이머가 다 지나서 새로운 시즌이 되었다면 브라우저 새로고침!
    if (diff <= 0) {
        location.reload(); 
        return;
    }

    // 남은 밀리초를 일, 시간, 분, 초로 예쁘게 변환
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    document.getElementById('season-countdown').innerText = `⏳ 초기화까지: ${d}일 ${h}시간 ${m}분 ${s}초 남음`;
}
setInterval(updateSeasonCountdown, 1000);
updateSeasonCountdown(); // 화면 켜자마자 바로 1번 실행


// --- 👑 지난 시즌 1등 기록 불러오기 (1회성 읽기) ---
db.ref('leaderboard/' + seasonData.prev)
  .orderByChild('time')
  .limitToFirst(1)
  .once('value')
  .then((snapshot) => {
    const prevWinnerEl = document.getElementById('prev-winner');
    if (snapshot.exists()) {
        let winner = null;
        // 1개만 가져왔지만 파이어베이스 구조상 forEach로 까봐야 함
        snapshot.forEach(child => { winner = child.val(); });
        prevWinnerEl.innerHTML = `👑 지난 시즌 1등: <strong>${winner.name}</strong> (${winner.time}초)`;
    } else {
        prevWinnerEl.innerHTML = `👑 지난 시즌: 아쉽게도 기록이 없습니다.`;
    }
});


// --- 2. 동적 메뉴 로직 ---
const list = document.querySelectorAll('.list');
let isSoundOn = true; 

function activeLink() {
    list.forEach((item) => item.classList.remove('active'));
    this.classList.add('active');

    const menuId = this.id;
    if (menuId === 'menu-help') {
        alert("⚾ 게임 규칙\n\n1. 컴퓨터의 3자리 숫자 맞추기!\n2. 8번의 기회 제한\n- 스트라이크: 숫자&위치 맞음\n- 볼: 숫자만 맞음\n\n⏱ 첫 숫자 입력 시 타이머 시작!\n💡 힌트 사용 시 시간에 +15초 페널티!\n🏆 랭킹은 3일마다 자동으로 초기화됩니다!");
    } else if (menuId === 'menu-sound') {
        isSoundOn = !isSoundOn;
        document.getElementById('sound-icon-svg').setAttribute('name', isSoundOn ? 'volume-high-outline' : 'volume-mute-outline');
    } else if (menuId === 'menu-hint') {
        useHint(); 
    }
}
list.forEach((item) => item.addEventListener('click', activeLink));


// --- 3. 사운드 및 꽃가루 효과 ---
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


// --- 4. 타이머 및 파이어베이스 명예의 전당 (현재 시즌 실시간 업데이트) ---
let timerInterval;
let elapsedTime = 0;
let isTimerRunning = false;
let currentTop10 = []; 

const timerDisplay = document.getElementById('timer-display');
const rankList = document.getElementById('rank-list');
const nameModal = document.getElementById('name-modal');
const playerNameInput = document.getElementById('player-name');
const recordTimeDisplay = document.getElementById('record-time');

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

// 실시간 랭킹 가져오기
rankRef.orderByChild('time').limitToFirst(10).on('value', (snapshot) => {
    rankList.innerHTML = '';
    currentTop10 = [];
    
    if (!snapshot.exists()) {
        rankList.innerHTML = '<li style="justify-content:center; color:#8b949e; text-align:center; padding:15px 0;">새로운 시즌이 시작되었습니다!<br>지금 당장 1등에 도전하세요!</li>';
        return;
    }

    snapshot.forEach((childSnapshot) => {
        currentTop10.push(childSnapshot.val());
    });
    currentTop10.sort((a, b) => a.time - b.time);

    let medals = ['🥇', '🥈', '🥉'];
    currentTop10.forEach((record, index) => {
        let rankBadge = index < 3 ? medals[index] : `<span style="display:inline-block; width:1.5em; text-align:center;">${index + 1}.</span>`;
        rankList.innerHTML += `<li><span>${rankBadge} ${record.name}</span> <span style="color:#ffeb3b;">${record.time}초</span></li>`;
    });
});


// --- 5. 숫자 야구 게임 핵심 로직 ---
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
        
        // 현재 시즌 Top 10 확인
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