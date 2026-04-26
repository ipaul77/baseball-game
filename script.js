// --- 1. 내비게이션 메뉴 로직 (기존과 동일) ---
const list = document.querySelectorAll('.list');
function activeLink() {
    list.forEach((item) => item.classList.remove('active'));
    this.classList.add('active');
}
list.forEach((item) => item.addEventListener('click', activeLink));


// --- 🎵 오디오 객체 미리 불러오기 (여기를 추가하세요!) ---
const outSound = new Audio('out.mp3');
const winSound = new Audio('win.mp3');
const strikeSound = new Audio('strike.mp3');
const ballSound = new Audio('ball.mp3');


// --- 2. 숫자 야구 게임 로직 ---
let targetNumbers = [];

function initGame() {
    targetNumbers = [];
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

    for (let i = 0; i < 3; i++) {
        if (guessArr[i] === targetNumbers[i]) {
            strikes++;
        } else if (targetNumbers.includes(guessArr[i])) {
            balls++;
        }
    }

    let resultHTML = `<span class="log-entry">입력: <strong>${guessStr}</strong> ➔ `;
    
    // --- 🎵 사운드 재생 로직 및 텍스트 추가 (이 부분을 수정하세요!) ---
    if (strikes === 3) {
        // 정답일 때: 폭죽 사운드
        winSound.play();
        resultBoard.insertAdjacentHTML('afterbegin', `<div style="color:#4caf50; font-size:1.2em; font-weight:bold; margin-bottom:10px;">🎉 축하합니다! 정답입니다!</div>`);
        submitBtn.disabled = true;
        restartBtn.style.display = "inline-block";
    } else if (strikes === 0 && balls === 0) {
        // 아웃일 때: 아웃 사운드
        outSound.play();
        resultHTML += `<span class="out">아웃!</span>`;
    } else {
        // 스트라이크나 볼이 있을 때
        if (strikes > 0 && balls > 0) {
            // 둘 다 있을 때는 소리가 겹치지 않게 스트라이크 소리 후 0.4초 뒤에 볼 소리 재생
            strikeSound.play();
            setTimeout(() => ballSound.play(), 400); 
        } else if (strikes > 0) {
            strikeSound.play();
        } else if (balls > 0) {
            ballSound.play();
        }
        
        // 텍스트 출력
        if (strikes > 0) resultHTML += `<span class="strike">${strikes} 스트라이크</span> `;
        if (balls > 0) resultHTML += `<span class="ball">${balls} 볼</span>`;
    }
    resultHTML += `</span>`;

    if (strikes !== 3) {
        resultBoard.insertAdjacentHTML('afterbegin', resultHTML);
    }
    // -----------------------------------------------------------

    userInput.value = "";
    userInput.focus();
}

restartBtn.addEventListener('click', () => {
    resultBoard.innerHTML = '';
    submitBtn.disabled = false;
    restartBtn.style.display = 'none';
    initGame();
});

initGame();