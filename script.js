// --- 1. 내비게이션 메뉴 로직 ---
const list = document.querySelectorAll('.list');
function activeLink() {
    list.forEach((item) => item.classList.remove('active'));
    this.classList.add('active');
}
list.forEach((item) => item.addEventListener('click', activeLink));

// --- 2. 숫자 야구 게임 로직 ---
let targetNumbers = []; // 컴퓨터가 정한 정답 배열

// 게임을 시작하고 중복 없는 난수 3개를 생성하는 함수
function initGame() {
    targetNumbers = [];
    let numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    for (let i = 0; i < 3; i++) {
        // 배열에서 랜덤한 위치의 숫자를 뽑아 정답에 추가하고 배열에서 제거
        let randomIndex = Math.floor(Math.random() * numbers.length);
        targetNumbers.push(numbers[randomIndex]);
        numbers.splice(randomIndex, 1);
    }
    console.log("치트키(정답):", targetNumbers.join('')); // 개발자 도구에서 정답 확인 가능
}

const userInput = document.getElementById('user-input');
const submitBtn = document.getElementById('submit-btn');
const resultBoard = document.getElementById('result-board');
const restartBtn = document.getElementById('restart-btn');

// 확인 버튼 클릭 이벤트
submitBtn.addEventListener('click', playGame);

// 엔터키를 눌러도 확인 버튼이 눌리도록 처리
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        playGame();
    }
});

function playGame() {
    const guessStr = userInput.value;

    // --- 입력값 유효성 검사 ---
    // 1. 3자리인지 확인
    // 2. 숫자인지 확인
    // 3. 중복된 숫자가 없는지 확인 (Set 객체를 이용해 중복 제거 후 길이 비교)
    if (guessStr.length !== 3 || isNaN(guessStr) || new Set(guessStr.split('')).size !== 3) {
        alert("0~9 사이의 중복되지 않는 3자리 '숫자'를 입력해주세요!");
        userInput.value = "";
        userInput.focus();
        return;
    }

    // 문자열을 숫자 배열로 변환
    const guessArr = guessStr.split('').map(Number);
    
    let strikes = 0;
    let balls = 0;

    // --- 스트라이크/볼 판정 로직 ---
    for (let i = 0; i < 3; i++) {
        if (guessArr[i] === targetNumbers[i]) {
            // 위치와 숫자가 모두 같으면 스트라이크
            strikes++;
        } else if (targetNumbers.includes(guessArr[i])) {
            // 위치는 다르지만 정답 배열에 숫자가 포함되어 있으면 볼
            balls++;
        }
    }

    // --- 결과 텍스트 생성 ---
    let resultHTML = `<span class="log-entry">입력: <strong>${guessStr}</strong> ➔ `;
    
    if (strikes === 0 && balls === 0) {
        // 사용자가 요청한 규칙: 모든 숫자가 틀리면 아웃
        resultHTML += `<span class="out">아웃!</span>`;
    } else {
        if (strikes > 0) resultHTML += `<span class="strike">${strikes} 스트라이크</span> `;
        if (balls > 0) resultHTML += `<span class="ball">${balls} 볼</span>`;
    }
    resultHTML += `</span>`;

    // 게임 보드 맨 위에 결과 추가
    resultBoard.insertAdjacentHTML('afterbegin', resultHTML);

    // --- 정답 처리 ---
    if (strikes === 3) {
        resultBoard.insertAdjacentHTML('afterbegin', `<div style="color:#4caf50; font-size:1.2em; font-weight:bold; margin-bottom:10px;">🎉 축하합니다! 정답입니다!</div>`);
        submitBtn.disabled = true; // 입력 금지
        restartBtn.style.display = "inline-block"; // 다시 시작 버튼 표시
    }

    // 입력창 초기화
    userInput.value = "";
    userInput.focus();
}

// 다시 시작 버튼 클릭 이벤트
restartBtn.addEventListener('click', () => {
    resultBoard.innerHTML = ''; // 보드 지우기
    submitBtn.disabled = false; // 버튼 활성화
    restartBtn.style.display = 'none'; // 다시 시작 버튼 숨기기
    initGame(); // 새로운 난수 생성
});

// 게임 최초 실행 시 난수 생성
initGame();