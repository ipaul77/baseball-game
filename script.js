// =======================================================================
// ☁️ 0. Firebase 데이터베이스 설정
// =======================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBjwePOTKRF2TRYNwqREg9lyQdZ7BEtEMk",
    authDomain: "baseball-game-68fbb.firebaseapp.com",
    databaseURL: "https://baseball-game-68fbb-default-rtdb.firebaseio.com",
    projectId: "baseball-game-68fbb",
    storageBucket: "baseball-game-68fbb.firebasestorage.app",
    messagingSenderId: "188603859302",
    appId: "1:188603859302:web:87ded952a72ed35b3088a7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();


// =======================================================================
// 📺 1. 화면 전환 및 공통 UI 로직
// =======================================================================
function showScreen(screenId) {
    // 모든 게임 컨테이너 숨기기
    document.querySelectorAll('.game-container').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active-screen');
    });
    // 특정 컨테이너만 보여주기
    const target = document.getElementById(screenId);
    target.classList.remove('hidden');
    target.classList.add('active-screen');
}

// 메뉴 바 로직
const list = document.querySelectorAll('.list');
let isSoundOn = true; 
list.forEach((item) => item.addEventListener('click', function() {
    list.forEach((i) => i.classList.remove('active'));
    this.classList.add('active');

    const menuId = this.id;
    if (menuId === 'menu-help') alert("⚾ 싱글: 컴퓨터 숫자 맞추기 (8번 제한, 시간 측정)\n⚔️ 대전: 상대가 설정한 숫자 맞추기 (턴제 진행)\n\n💡 힌트 사용 시 15초 페널티 (싱글 전용)");
    else if (menuId === 'menu-sound') {
        isSoundOn = !isSoundOn;
        document.getElementById('sound-icon-svg').setAttribute('name', isSoundOn ? 'volume-high-outline' : 'volume-mute-outline');
    } else if (menuId === 'menu-hint') useHint(); // 싱글 모드용
    else if (menuId === 'menu-game') showScreen('screen-mode-select'); // 홈으로
}));

// 사운드 및 이펙트
const outSound = new Audio('out.mp3');
const winSound = new Audio('win.mp3');
const strikeSound = new Audio('strike.mp3');
const ballSound = new Audio('ball.mp3');
function playSound(audio) { if (isSoundOn) { audio.currentTime = 0; audio.play(); } }

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


// =======================================================================
// 👤 2. 싱글 플레이 로직 (기존 기능 완벽 보존)
// =======================================================================
const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
function getSeasonData() {
    const sNum = Math.floor(Date.now() / threeDaysInMs);
    return { current: "season_" + sNum, prev: "season_" + (sNum - 1), nextTime: (sNum + 1) * threeDaysInMs };
}
const seasonData = getSeasonData();
const rankRef = db.ref('leaderboard/' + seasonData.current);

// 타이머 및 랭킹 세팅
setInterval(() => {
    const diff = seasonData.nextTime - Date.now();
    if (diff <= 0) { location.reload(); return; }
    document.getElementById('season-countdown').innerText = `⏳ 초기화까지: ${Math.floor(diff / 86400000)}일 ${Math.floor((diff / 3600000) % 24)}시간 ${Math.floor((diff / 60000) % 60)}분 ${Math.floor((diff / 1000) % 60)}초 남음`;
}, 1000);

db.ref('leaderboard/' + seasonData.prev).orderByChild('time').limitToFirst(1).once('value').then(snap => {
    let prev = document.getElementById('prev-winner');
    if (snap.exists()) { snap.forEach(c => prev.innerHTML = `👑 지난 시즌 1등: <strong>${c.val().name}</strong> (${c.val().time}초)`); }
});

let currentTop10 = [];
rankRef.orderByChild('time').limitToFirst(10).on('value', (snap) => {
    let list = document.getElementById('rank-list'); list.innerHTML = ''; currentTop10 = [];
    if (!snap.exists()) { list.innerHTML = '<li style="justify-content:center; color:#8b949e;">새로운 시즌이 시작되었습니다!</li>'; return; }
    snap.forEach(c => currentTop10.push(c.val())); currentTop10.sort((a,b)=>a.time-b.time);
    currentTop10.forEach((r, i) => list.innerHTML += `<li><span>${i<3 ? ['🥇','🥈','🥉'][i] : (i+1)+'.'} ${r.name}</span> <span style="color:#ffeb3b;">${r.time}초</span></li>`);
});

let targetNumbers=[], attempts=0, MAX_ATTEMPTS=8, timerInterval, elapsedTime=0, isTimerRunning=false, hintUsed=false;
function initSingleGame() {
    targetNumbers=[]; attempts=0; elapsedTime=0; isTimerRunning=false; hintUsed=false;
    clearInterval(timerInterval); document.getElementById('timer-display').innerText="⏱ 00:00";
    document.getElementById('timer-display').style.color="#8b949e";
    document.getElementById('result-board').innerHTML='';
    document.getElementById('submit-btn').disabled=false; document.getElementById('user-input').disabled=false;
    document.getElementById('restart-btn').style.display='none';
    let nums=[0,1,2,3,4,5,6,7,8,9];
    for(let i=0; i<3; i++) targetNumbers.push(nums.splice(Math.floor(Math.random()*nums.length), 1)[0]);
    console.log("싱글 정답:", targetNumbers.join(''));
}

function useHint() {
    if(attempts===0 || hintUsed) return;
    alert(`💡 힌트: 정답에 [ ${targetNumbers[Math.floor(Math.random()*3)]} ] 가 포함됨! (+15초)`);
    elapsedTime+=15; hintUsed=true;
}

document.getElementById('user-input').addEventListener('input', () => {
    if(!isTimerRunning && document.getElementById('user-input').value.length > 0) {
        isTimerRunning=true; timerInterval=setInterval(() => { elapsedTime++; 
        let m=Math.floor(elapsedTime/60).toString().padStart(2,'0'), s=(elapsedTime%60).toString().padStart(2,'0');
        document.getElementById('timer-display').innerText=`⏱ ${m}:${s}`; document.getElementById('timer-display').style.color="#ffeb3b";
        }, 1000);
    }
});

document.getElementById('submit-btn').addEventListener('click', playSingle);
document.getElementById('user-input').addEventListener('keypress', e => { if(e.key==='Enter') playSingle(); });

function playSingle() {
    let gStr = document.getElementById('user-input').value;
    if(gStr.length!==3 || isNaN(gStr) || new Set(gStr.split('')).size!==3) { alert("올바른 3자리 숫자를 입력하세요."); return; }
    
    let gArr = gStr.split('').map(Number), s=0, b=0; attempts++;
    for(let i=0; i<3; i++) { if(gArr[i]===targetNumbers[i]) s++; else if(targetNumbers.includes(gArr[i])) b++; }

    let pText="", pColor="", resHTML=`<div class="log-entry"><span class="attempt-count">[${attempts}/${MAX_ATTEMPTS}]</span> 입력: <strong>${gStr}</strong> ➔ `;
    if(s===3) { pText="정답! 🎉"; pColor="#4caf50"; clearInterval(timerInterval); playSound(winSound); shootConfetti(); resHTML+=`<span class="strike">정답! (${elapsedTime}초)</span></div>`; }
    else if(s===0 && b===0) { pText="아웃!"; pColor="#f44336"; resHTML+=`<span class="out">아웃!</span></div>`; }
    else { if(s>0) pText+=`${s}S `; if(b>0) pText+=`${b}B`; pColor="#ffeb3b"; resHTML+=`${s>0?`<span class="strike">${s}S</span> `:''}${b>0?`<span class="ball">${b}B</span>`:''}</div>`; }

    // 팝업 애니메이션
    const pEff = document.getElementById('pop-effect');
    pEff.innerText=pText; pEff.style.color=pColor; pEff.classList.remove('pop-animate'); void pEff.offsetWidth; pEff.classList.add('pop-animate');

    let rb = document.getElementById('result-board'); rb.insertAdjacentHTML('beforeend', resHTML); rb.scrollTop=rb.scrollHeight;

    if(s===3) {
        document.getElementById('submit-btn').disabled=true; document.getElementById('user-input').disabled=true; document.getElementById('restart-btn').style.display="inline-block";
        if(currentTop10.length<10 || elapsedTime < currentTop10[currentTop10.length-1].time) {
            setTimeout(()=> { document.getElementById('record-time').innerText=elapsedTime; document.getElementById('name-modal').classList.remove('hidden'); }, 1000);
        }
    } else if(attempts>=MAX_ATTEMPTS) {
        clearInterval(timerInterval); playSound(outSound); pEff.innerText="실패!"; pEff.style.color="#f44336";
        rb.insertAdjacentHTML('beforeend', `<div class="fail-message"><h1>실패!</h1><p>정답: <strong>[ ${targetNumbers.join('')} ]</strong></p></div>`);
        document.getElementById('submit-btn').disabled=true; document.getElementById('user-input').disabled=true; document.getElementById('restart-btn').style.display="inline-block"; rb.scrollTop=rb.scrollHeight;
    } else { s===0&&b===0 ? playSound(outSound) : playSound(strikeSound); }
    
    document.getElementById('user-input').value=''; document.getElementById('user-input').focus();
}

document.getElementById('save-name-btn').addEventListener('click', () => {
    rankRef.push({ name: document.getElementById('player-name').value.trim().toUpperCase()||'ANON', time: elapsedTime });
    document.getElementById('name-modal').classList.add('hidden'); document.getElementById('player-name').value='';
});

// 버튼 연결
document.getElementById('btn-single-play').addEventListener('click', () => { showScreen('screen-single'); initSingleGame(); });
document.getElementById('restart-btn').addEventListener('click', () => { showScreen('screen-mode-select'); });


// =======================================================================
// ⚔️ 3. 온라인 1:1 대전 플레이 로직 (초특급 신규 기능!)
// =======================================================================
const myUid = "user_" + Math.random().toString(36).substr(2, 9); // 내 브라우저 전용 난수 ID
let currentRoomId = null;
let myRole = null; // 'p1' 또는 'p2'
let multiPhase = ''; // 'setting' 또는 'playing'
let currentTurn = 1;

// [대전 시작] 대기실 입장 및 매칭
document.getElementById('btn-multi-play').addEventListener('click', () => {
    showScreen('screen-lobby');
    const roomsRef = db.ref('rooms');
    
    // 1. 대기 중인 빈 방이 있는지 찾습니다.
    roomsRef.orderByChild('status').equalTo('waiting').limitToFirst(1).once('value', snapshot => {
        if (snapshot.exists()) {
            // 빈 방 발견! p2로 난입합니다.
            snapshot.forEach(child => { currentRoomId = child.key; });
            myRole = 'p2';
            roomsRef.child(currentRoomId).update({ p2: myUid, status: 'playing' });
            startMultiGame();
        } else {
            // 빈 방이 없으면 내가 방장(p1)이 되어 방을 만듭니다.
            const newRoom = roomsRef.push();
            currentRoomId = newRoom.key;
            myRole = 'p1';
            newRoom.set({ status: 'waiting', p1: myUid, p1_target: "", p2_target: "", turn: 1 });
            
            // 누군가(p2) 들어와서 상태가 playing으로 바뀌길 기다립니다.
            db.ref('rooms/' + currentRoomId + '/status').on('value', snap => {
                if (snap.val() === 'playing' && myRole === 'p1') startMultiGame();
            });
        }
    });
});

// [대기실] 매칭 취소
document.getElementById('btn-cancel-match').addEventListener('click', () => {
    if (currentRoomId && myRole === 'p1') db.ref('rooms/' + currentRoomId).remove(); // 내가 만든 방 폭파
    currentRoomId = null;
    showScreen('screen-mode-select');
});

// [게임 시작] 매칭 성공 후 실제 대전 화면 세팅
function startMultiGame() {
    showScreen('screen-multi');
    document.getElementById('multi-result-board').innerHTML = '';
    document.getElementById('multi-exit-btn').style.display = 'none';
    document.getElementById('multi-input').disabled = false;
    document.getElementById('multi-submit-btn').disabled = false;
    document.getElementById('multi-input').value = '';
    
    multiPhase = 'setting';
    currentTurn = 1;
    document.getElementById('multi-status-msg').innerText = "⚔️ 매칭 성공! 상대방이 맞출 내 숫자를 설정하세요!";

    // 방의 실시간 데이터 변경 감지 (이 게임의 핵심 심장부!)
    db.ref('rooms/' + currentRoomId).on('value', snap => {
        const roomData = snap.val();
        if (!roomData) return;

        // 1. 누군가 도망갔을 때
        if (roomData.status === 'abandoned') {
            alert("⚠️ 상대방이 도망갔거나 연결이 끊어졌습니다.");
            leaveMultiGame();
            return;
        }

        // 2. 숫자를 설정하는 단계 (둘 다 설정했는지 확인)
        if (multiPhase === 'setting') {
            if (roomData.p1_target !== "" && roomData.p2_target !== "") {
                multiPhase = 'playing';
                document.getElementById('multi-status-msg').innerText = "🔥 전투 시작! [1턴] 상대방의 숫자를 맞춰보세요!";
                document.getElementById('multi-input').disabled = false;
                document.getElementById('multi-submit-btn').disabled = false;
            }
        }

        // 3. 전투 단계 (서로 턴을 주고받음)
        if (multiPhase === 'playing') {
            const turnData = roomData.guesses ? roomData.guesses[currentTurn] : null;
            
            // 이번 턴에 P1과 P2가 모두 답을 입력했다면? 결과를 계산해서 보여주자!
            if (turnData && turnData.p1 && turnData.p2) {
                const myTarget = myRole === 'p1' ? roomData.p1_target : roomData.p2_target;
                const oppTarget = myRole === 'p1' ? roomData.p2_target : roomData.p1_target;
                const myGuess = myRole === 'p1' ? turnData.p1 : turnData.p2;
                const oppGuess = myRole === 'p1' ? turnData.p2 : turnData.p1;

                processTurnResult(myGuess, oppGuess, myTarget, oppTarget);
                currentTurn++; // 다음 턴으로 넘어감
            }
        }
    });
}

// [공격 제출] 대전에서 확인 버튼 눌렀을 때
document.getElementById('multi-submit-btn').addEventListener('click', () => {
    const val = document.getElementById('multi-input').value;
    if (val.length !== 3 || isNaN(val) || new Set(val.split('')).size !== 3) {
        alert("0~9 사이의 중복되지 않는 3자리 숫자를 입력하세요!"); return;
    }

    document.getElementById('multi-input').value = '';
    document.getElementById('multi-input').disabled = true;
    document.getElementById('multi-submit-btn').disabled = true;

    // 타겟 설정 모드일 때
    if (multiPhase === 'setting') {
        document.getElementById('multi-status-msg').innerText = "⏳ 상대방이 설정할 때까지 기다리는 중...";
        const updates = {}; updates[myRole + '_target'] = val;
        db.ref('rooms/' + currentRoomId).update(updates);
    } 
    // 전투 모드일 때 (내 공격을 서버에 전송)
    else if (multiPhase === 'playing') {
        document.getElementById('multi-status-msg').innerText = "⏳ 상대방의 공격을 기다리는 중...";
        const updates = {}; updates[`guesses/${currentTurn}/${myRole}`] = val;
        db.ref('rooms/' + currentRoomId).update(updates);
    }
});

// [결과 판정] 턴이 끝났을 때 서로의 스트라이크/볼 계산
function processTurnResult(myGuess, oppGuess, myTarget, oppTarget) {
    let myS = 0, myB = 0, oppS = 0, oppB = 0;
    
    // 내 공격 성공 여부
    for(let i=0; i<3; i++) { if(myGuess[i] === oppTarget[i]) myS++; else if(oppTarget.includes(myGuess[i])) myB++; }
    // 상대 공격 성공 여부
    for(let i=0; i<3; i++) { if(oppGuess[i] === myTarget[i]) oppS++; else if(myTarget.includes(oppGuess[i])) oppB++; }

    // 화면에 기록 그리기
    const board = document.getElementById('multi-result-board');
    let resHTML = `
        <div class="log-entry" style="display:flex; justify-content:space-between; border-bottom: 1px dashed #484f58; padding: 10px 0;">
            <div style="flex:1; text-align:left;">
                <span style="color:#2196f3; font-weight:bold;">[나]</span> ${myGuess} ➔ <br>
                <span style="color:#4caf50; font-weight:bold;">${myS}S</span> <span style="color:#ff9800; font-weight:bold;">${myB}B</span>
            </div>
            <div style="flex:1; text-align:right;">
                <span style="color:#f44336; font-weight:bold;">[상대]</span> ${oppGuess} ➔ <br>
                <span style="color:#4caf50; font-weight:bold;">${oppS}S</span> <span style="color:#ff9800; font-weight:bold;">${oppB}B</span>
            </div>
        </div>`;
    board.insertAdjacentHTML('beforeend', resHTML);
    board.scrollTop = board.scrollHeight;

    // 멀티플레이 전용 빠방 효과!
    const mpEff = document.getElementById('multi-pop-effect');
    mpEff.innerText = (myS === 3) ? "정답!" : (myS === 0 && myB === 0 ? "아웃!" : `${myS}S ${myB}B`);
    mpEff.style.color = (myS === 3) ? "#4caf50" : (myS === 0 && myB === 0 ? "#f44336" : "#ffeb3b");
    mpEff.classList.remove('pop-animate'); void mpEff.offsetWidth; mpEff.classList.add('pop-animate');

    // 승패 확인
    if(myS === 3 && oppS === 3) finishMultiGame("🤝 무승부! 둘 다 동시에 맞췄습니다!", oppTarget);
    else if(myS === 3) finishMultiGame("🎉 승리! 상대방의 숫자를 먼저 맞췄습니다!", oppTarget);
    else if(oppS === 3) finishMultiGame("💀 패배... 상대가 먼저 맞췄습니다.", oppTarget);
    else {
        // 둘 다 못 맞췄으면 다음 턴 준비!
        document.getElementById('multi-status-msg').innerText = `[${currentTurn + 1}턴] 다음 숫자를 입력하세요!`;
        document.getElementById('multi-input').disabled = false;
        document.getElementById('multi-submit-btn').disabled = false;
        document.getElementById('multi-input').focus();
        (myS===0&&myB===0) ? playSound(outSound) : playSound(strikeSound);
    }
}

function finishMultiGame(msg, oppTarget) {
    if(msg.includes("승리")) { playSound(winSound); shootConfetti(); } else playSound(outSound);
    document.getElementById('multi-status-msg').innerHTML = `${msg} <br><span style="font-size:0.8em; color:#fff;">상대의 숫자: ${oppTarget}</span>`;
    document.getElementById('multi-exit-btn').style.display = 'inline-block';
    db.ref('rooms/' + currentRoomId).off(); // 방 리스너 종료
}

// 나가기 로직
document.getElementById('multi-exit-btn').addEventListener('click', leaveMultiGame);
function leaveMultiGame() {
    if (currentRoomId) {
        db.ref('rooms/' + currentRoomId).update({status: 'abandoned'}); // 방 폭파 신호 전송
        db.ref('rooms/' + currentRoomId).off();
    }
    currentRoomId = null;
    showScreen('screen-mode-select');
}