// --- 1. 내비게이션 메뉴 로직 ---
// 아이콘 메뉴를 클릭했을 때 'active' 클래스를 이동시켜서
// 둥근 배경(인디케이터)이 움직이도록 하는 로직입니다.
const list = document.querySelectorAll('.list');
function activeLink() {
    list.forEach((item) => item.classList.remove('active'));
    this.classList.add('active');
}
list.forEach((item) => item.addEventListener('click', activeLink));


// --- 🎵 2. 외부 오디오 파일 미리 불러오기 ---
// HTML에 <audio> 태그 없이 자바스크립트로 바로 사운드를 준비합니다.
// 주의: 4개의 mp3 파일이 반드시 같은 폴더 안에 있어야 합니다!
const outSound = new Audio('out.mp3');
const winSound = new Audio('win.mp3');
const strikeSound = new Audio('strike.mp3');
const ballSound = new Audio('ball.mp3');


// --- 3. 숫자 야구 게임 로직 ---
let targetNumbers = []; // 컴퓨터가 정한 정답 배열을 저장할 변수
let attempts = 0;       // 사용자가 시도한 횟수를 기억할 변수
const MAX_ATTEMPTS = 6; // 최대 시도 가능 횟수 (상수로 고정)

// 게임을 초기화하고 난수를 생성하는 함수
function initGame() {
    targetNumbers = [];
    attempts = 0; // 새 게임이 시작되면 횟수를 0으로 되돌립니다.
    let numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    // 0~9 중에서 중복 없이 3개의 숫자를 뽑습니다.
    for (let i = 0; i < 3; i++) {
        let randomIndex = Math.floor(Math.random() * numbers.length);
        targetNumbers.push(numbers[randomIndex]);
        numbers.splice(randomIndex, 1); // 뽑은 숫자는 배열에서 삭제하여 중복 방지
    }
    // (테스트용) F12 개발자 도구 콘솔창에서 정답을 미리 확인할 수 있습니다.
    console.log("치트키(정답):", targetNumbers.join(''));
}

// HTML에 있는 요소들을 자바스크립트 변수로 가져옵니다.
const userInput = document.getElementById('user-input');
const submitBtn = document.getElementById('submit-btn');
const resultBoard = document.getElementById('result-board');
const restartBtn = document.getElementById('restart-btn');

// '확인' 버튼을 클릭했을 때 playGame 함수를 실행합니다.
submitBtn.addEventListener('click', playGame);

// 입력창에서 'Enter' 키를 눌렀을 때도 버튼을 누른 것과 같이 동작하게 합니다.
userInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') playGame();
});

// 핵심 게임 판정 로직
function playGame() {
    const guessStr = userInput.value;

    // --- 입력값 검증 ---
    // 1. 3자리 숫자인가?
    // 2. 문자가 아닌 숫자로만 이루어져 있는가? (isNaN)
    // 3. 중복된 숫자가 없는가? (Set 활용)
    if (guessStr.length !== 3 || isNaN(guessStr) || new Set(guessStr.split('')).size !== 3) {
        alert("0~9 사이의 중복되지 않는 3자리 '숫자'를 입력해주세요!");
        userInput.value = "";
        userInput.focus();
        return;
    }

    // 입력받은 문자열("123")을 숫자 배열([1, 2, 3])로 변환합니다.
    const guessArr = guessStr.split('').map(Number);
    let strikes = 0;
    let balls = 0;
    
    attempts++; // 제대로 된 값을 입력했으므로 시도 횟수를 1 증가시킵니다.

    // --- 스트라이크/볼 판정 ---
    for (let i = 0; i < 3; i++) {
        if (guessArr[i] === targetNumbers[i]) {
            // 위치와 숫자가 모두 일치하면 스트라이크
            strikes++;
        } else if (targetNumbers.includes(guessArr[i])) {
            // 위치는 다르지만 정답에 포함되어 있으면 볼
            balls++;
        }
    }

    // --- 결과 텍스트 (리스트 아이템) 생성 ---
    let resultHTML = `<div class="log-entry">
        <span class="attempt-count">[${attempts}/${MAX_ATTEMPTS}]</span>
        입력: <strong>${guessStr}</strong> ➔ `;
    
    // --- 상황별 사운드 재생 및 출력 분기 ---
    if (strikes === 3) {
        // [정답] 3개의 위치와 숫자를 모두 맞춘 경우
        winSound.play();
        resultHTML += `<span class="strike">정답입니다! 🎉</span></div>`;
        resultBoard.insertAdjacentHTML('beforeend', resultHTML); 
        
        // 게임 승리 처리
        endGame(`<div style="color:#4caf50; font-size:1.2em; font-weight:bold; margin-top:15px; text-align:center;">축하합니다! 게임 승리!</div>`);
    } else {
        // [오답] 맞추지 못한 경우
        if (strikes === 0 && balls === 0) {
            resultHTML += `<span class="out">아웃!</span>`;
        } else {
            if (strikes > 0) resultHTML += `<span class="strike">${strikes} 스트라이크</span> `;
            if (balls > 0) resultHTML += `<span class="ball">${balls} 볼</span>`;
        }
        resultHTML += `</div>`;
        
        // 만들어진 텍스트를 게임 보드 아래쪽에 추가합니다.
        resultBoard.insertAdjacentHTML('beforeend', resultHTML);
        
        // 목록이 길어지면 스크롤을 맨 아래로 자동으로 내려줍니다.
        resultBoard.scrollTop = resultBoard.scrollHeight;

        // --- 6번 모두 틀렸는지 (게임 오버) 확인 ---
        if (attempts >= MAX_ATTEMPTS) {
            outSound.play(); // 게임 오버 사운드
            
            // 크고 강렬한 실패 메시지를 화면에 띄웁니다. (CSS 스타일과 연결됨)
            endGame(`
                <div class="fail-message">
                    <h1>실패!</h1>
                    <p>정답은 <strong>[ ${targetNumbers.join('')} ]</strong> 였습니다.</p>
                </div>
            `);
        } else {
            // 아직 기회가 남아있을 때 일반 판정 사운드 재생
            if (strikes === 0 && balls === 0) {
                outSound.play();
            } else if (strikes > 0 && balls > 0) {
                // 스트라이크와 볼이 같이 있을 때는 소리가 겹치지 않게 시차를 둡니다.
                strikeSound.play();
                setTimeout(() => ballSound.play(), 400); 
            } else if (strikes > 0) {
                strikeSound.play();
            } else if (balls > 0) {
                ballSound.play();
            }
        }
    }

    // 다음 입력을 편하게 하도록 입력창을 비우고 커서를 깜빡이게 합니다.
    userInput.value = "";
    userInput.focus();
}

// 게임이 끝났을 때(승리 or 패배) 화면을 잠그는 헬퍼 함수
function endGame(messageHTML) {
    resultBoard.insertAdjacentHTML('beforeend', messageHTML);
    submitBtn.disabled = true; // 확인 버튼 비활성화
    userInput.disabled = true; // 입력창 비활성화
    restartBtn.style.display = "inline-block"; // '게임 다시 시작' 버튼 보여주기
    resultBoard.scrollTop = resultBoard.scrollHeight; // 메시지가 잘 보이게 끝까지 스크롤
}

// '게임 다시 시작' 버튼을 눌렀을 때 동작
restartBtn.addEventListener('click', () => {
    resultBoard.innerHTML = ''; // 화면에 쌓인 기록 지우기
    submitBtn.disabled = false; // 버튼 다시 활성화
    userInput.disabled = false; // 입력창 다시 활성화
    restartBtn.style.display = 'none'; // 다시 시작 버튼 숨기기
    userInput.focus(); // 커서 위치시키기
    initGame(); // 새로운 문제 출제 및 횟수 초기화
});

// 처음 웹페이지가 켜졌을 때 게임을 한 번 실행(난수 생성)합니다.
initGame();