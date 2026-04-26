// --- 1. 내비게이션 메뉴 로직 ---
const list = document.querySelectorAll('.list');
function activeLink() {
    list.forEach((item) => item.classList.remove('active'));
    this.classList.add('active');
}
list.forEach((item) => item.addEventListener('click', activeLink));


// --- 🎵 2. 외부 오디오 파일 미리 불러오기 ---
const outSound = new Audio('out.mp3');
const winSound = new Audio('win.mp3');
const strikeSound = new Audio('strike.mp3');
const ballSound = new Audio('ball.mp3');


// --- 3. 숫자 야구 게임 로직 ---
let targetNumbers = []; 
let attempts = 0; // 시도 횟수를 기억할 변수 추가
const MAX_ATTEMPTS = 6; // 최대 시도 가능 횟수

function initGame() {
    targetNumbers = [];
    attempts = 0; // 게임 시작 시 횟수 초기화
    let numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    for (let i = 0; i < 3; i++) {
        let randomIndex = Math.floor(Math.random() * numbers.length);
        targetNumbers.push(numbers[randomIndex]);
        numbers.splice(randomIndex, 1);
    }
    console.log("치트키(정답):", targetNumbers.join(''));
}

const userInput = document.getElementById('user-input');
const submitBtn = document.getElementById('submit-btn');
const resultBoard = document.getElementById('result-board');
const restartBtn = document.getElementById('restart-btn');

submitBtn.addEventListener('click', playGame);

userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') playGame();
});

function playGame() {
    const guessStr = userInput.value;

    if (guessStr.length !== 3 || isNaN(guessStr) || new Set(guessStr.split('')).size !== 3) {
        alert("0~9 사이의 중복되지 않는 3자리 '숫자'를 입력해주세요!");
        userInput.value = "";
        userInput.focus();
        return;
    }

    const guessArr = guessStr.split('').map(Number);
    let strikes = 0;
    let balls = 0;
    
    attempts++; // 정상적인 입력이 들어오면 시도 횟수 1 증가

    for (let i = 0; i < 3; i++) {
        if (guessArr[i] === targetNumbers[i]) {
            strikes++;
        } else if (targetNumbers.includes(guessArr[i])) {
            balls++;
        }
    }

    // --- 리스트에 쌓일 HTML 결과 텍스트 생성 ---
    let resultHTML = `<div class="log-entry">
        <span class="attempt-count">[${attempts}/${MAX_ATTEMPTS}]</span>
        입력: <strong>${guessStr}</strong> ➔ `;
    
    if (strikes === 3) {
        // [정답] 3 스트라이크일 경우
        winSound.play();
        resultHTML += `<span class="strike">정답입니다! 🎉</span></div>`;
        resultBoard.insertAdjacentHTML('beforeend', resultHTML); // 아래로 리스트 추가
        
        endGame(`<div style="color:#4caf50; font-size:1.2em; font-weight:bold; margin-top:15px; text-align:center;">축하합니다! 게임 승리!</div>`);
    } else {
        // [오답] 정답이 아닐 경우 스트라이크/볼 판정
        if (strikes === 0 && balls === 0) {
            resultHTML += `<span class="out">아웃!</span>`;
        } else {
            if (strikes > 0) resultHTML += `<span class="strike">${strikes} 스트라이크</span> `;
            if (balls > 0) resultHTML += `<span class="ball">${balls} 볼</span>`;
        }
        resultHTML += `</div>`;
        resultBoard.insertAdjacentHTML('beforeend', resultHTML); // 아래로 리스트 추가

        // 스크롤이 생길 경우 항상 가장 아래쪽(최신 입력)을 보여주기 위함
        resultBoard.scrollTop = resultBoard.scrollHeight;

// --- 6번 모두 틀렸는지 (게임 오버) 확인 ---
        if (attempts >= MAX_ATTEMPTS) {
            outSound.play(); // 실패 시 아웃 사운드 재생
            
            // 크고 멋진 실패 메시지 HTML 구조 삽입
            endGame(`
                <div class="fail-message">
                    <h1>실패!</h1>
                    <p>정답은 <strong>[ ${targetNumbers.join('')} ]</strong> 였습니다.</p>
                </div>
            `);
        } else {
            // 게임 오버가 아닐 때만 일반 사운드 재생
            if (strikes === 0 && balls === 0) {
                outSound.play();
            } else if (strikes > 0 && balls > 0) {
                strikeSound.play();
                setTimeout(() => ballSound.play(), 400); 
            } else if (strikes > 0) {
                strikeSound.play();
            } else if (balls > 0) {
                ballSound.play();
            }
        }

    userInput.value = "";
    userInput.focus();
}

// 게임 종료 처리를 담당하는 헬퍼 함수
function endGame(messageHTML) {
    resultBoard.insertAdjacentHTML('beforeend', messageHTML);
    submitBtn.disabled = true; // 입력 금지
    userInput.disabled = true; // 텍스트창 입력 금지
    restartBtn.style.display = "inline-block"; // 다시 시작 버튼 표시
}

// 게임 다시 시작 버튼 로직
restartBtn.addEventListener('click', () => {
    resultBoard.innerHTML = '';
    submitBtn.disabled = false;
    userInput.disabled = false;
    restartBtn.style.display = 'none';
    userInput.focus();
    initGame();
});

initGame();