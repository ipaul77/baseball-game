// =======================================================================
// ☁️ 0. Firebase 설정
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

let globalNickname = "익명";

// =======================================================================
// 📺 1. 화면 전환 및 공통 로직
// =======================================================================
function showScreen(screenId) {
    document.querySelectorAll('.game-container').forEach(el => {
        el.classList.add('hidden'); el.classList.remove('active-screen');
    });
    const target = document.getElementById(screenId);
    target.classList.remove('hidden'); target.classList.add('active-screen');
}

const list = document.querySelectorAll('.list');
let isSoundOn = true; 
list.forEach((item) => item.addEventListener('click', function() {
    list.forEach((i) => i.classList.remove('active')); this.classList.add('active');
    const menuId = this.id;
    if (menuId === 'menu-help') alert("⚾ 싱글: 기록 경쟁\n⚔️ 대전: 상대방 숫자 맞추기 (턴제 진행)\n\n💡 힌트 사용 시 15초 페널티 (싱글 전용)");
    else if (menuId === 'menu-sound') { isSoundOn = !isSoundOn; document.getElementById('sound-icon-svg').setAttribute('name', isSoundOn ? 'volume-high-outline' : 'volume-mute-outline'); }
    else if (menuId === 'menu-hint') useHint();
    else if (menuId === 'menu-game') showScreen('screen-mode-select');
}));

const outSound = new Audio('out.mp3'); const winSound = new Audio('win.mp3'); const strikeSound = new Audio('strike.mp3'); const ballSound = new Audio('ball.mp3');
function playSound(audio) { if (isSoundOn) { audio.currentTime = 0; audio.play(); } }

function shootConfetti() {
    const colors = ['#f44336', '#4caf50', '#ffeb3b', '#2196f3', '#9c27b0'];
    for(let i=0; i<50; i++) {
        let div = document.createElement('div'); div.className = 'confetti';
        div.style.left = Math.random() * 100 + 'vw'; div.style.animationDelay = Math.random() * 2 + 's';
        div.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        document.body.appendChild(div); setTimeout(() => div.remove(), 3000); 
    }
}

function updateNickname() {
    let inputName = document.getElementById('global-nickname').value.trim();
    globalNickname = inputName || "익명";
    document.getElementById('player-name').value = globalNickname;
}

// =======================================================================
// 👤 2. 싱글 플레이 로직
// =======================================================================
const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
function getSeasonData() { const sNum = Math.floor(Date.now() / threeDaysInMs); return { current: "season_" + sNum, prev: "season_" + (sNum - 1), nextTime: (sNum + 1) * threeDaysInMs }; }
const seasonData = getSeasonData(); const rankRef = db.ref('leaderboard/' + seasonData.current);

setInterval(() => {
    const diff = seasonData.nextTime - Date.now(); if (diff <= 0) { location.reload(); return; }
    document.getElementById('season-countdown').innerText = `⏳ 초기화: ${Math.floor(diff/86400000)}일 ${Math.floor((diff/3600000)%24)}시간 ${Math.floor((diff/60000)%60)}분 ${Math.floor((diff/1000)%60)}초`;
}, 1000);

db.ref('leaderboard/' + seasonData.prev).orderByChild('time').limitToFirst(1).once('value').then(snap => {
    let prev = document.getElementById('prev-winner');
    if (snap.exists()) { snap.forEach(c => prev.innerHTML = `👑 지난 시즌 1등: <strong>${c.val().name}</strong> (${c.val().time}초)`); }
});

let currentTop10 = [];
rankRef.orderByChild('time').limitToFirst(10).on('value', (snapshot) => {
    const list = document.getElementById('rank-list'); list.innerHTML = ''; currentTop10 = [];
    if (!snapshot.exists()) { list.innerHTML = '<li style="justify-content:center; color:#8b949e; text-align:center; padding:15px 0;">시즌이 시작되었습니다!<br>첫 기록을 남겨보세요!</li>'; return; }
    snapshot.forEach((childSnapshot) => { currentTop10.push(childSnapshot.val()); });
    currentTop10.sort((a, b) => a.time - b.time);
    let listHTML = ''; const medals = ['🥇', '🥈', '🥉'];
    currentTop10.forEach((record, index) => {
        const rankBadge = index < 3 ? medals[index] : `<span style="display:inline-block; width:1.5em; text-align:center;">${index + 1}.</span>`;
        listHTML += `<li><span>${rankBadge} ${record.name}</span> <span style="color:#ffeb3b;">${record.time}초</span></li>`;
    });
    list.innerHTML = listHTML;
});

let targetNumbers=[], attempts=0, MAX_ATTEMPTS=8, timerInterval, elapsedTime=0, isTimerRunning=false, hintUsed=false;
function initSingleGame() {
    targetNumbers=[]; attempts=0; elapsedTime=0; isTimerRunning=false; hintUsed=false;
    clearInterval(timerInterval); document.getElementById('timer-display').innerText="⏱ 00:00"; document.getElementById('timer-display').style.color="#ffeb3b";
    document.getElementById('result-board').innerHTML=''; document.getElementById('submit-btn').disabled=false; document.getElementById('user-input').disabled=false;
    document.getElementById('single-end-btns').style.display='none';
    let nums=[0,1,2,3,4,5,6,7,8,9]; for(let i=0; i<3; i++) targetNumbers.push(nums.splice(Math.floor(Math.random()*nums.length), 1)[0]);
}

function useHint() {
    if(attempts===0 || hintUsed) return;
    alert(`💡 힌트: 정답에 [ ${targetNumbers[Math.floor(Math.random()*3)]} ] 가 포함됨! (+15초)`); elapsedTime+=15; hintUsed=true;
}

document.getElementById('user-input').addEventListener('input', () => {
    if(!isTimerRunning && document.getElementById('user-input').value.length > 0) {
        isTimerRunning=true; timerInterval=setInterval(() => { elapsedTime++; 
        let m=Math.floor(elapsedTime/60).toString().padStart(2,'0'), s=(elapsedTime%60).toString().padStart(2,'0');
        document.getElementById('timer-display').innerText=`⏱ ${m}:${s}`;
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
    else if(s===0 && b===0) { pText="아웃!"; pColor="#ef5350"; resHTML+=`<span class="out">아웃!</span></div>`; }
    else { if(s>0) pText+=`${s}S `; if(b>0) pText+=`${b}B`; pColor="#ffeb3b"; resHTML+=`${s>0?`<span class="strike">${s}S</span> `:''}${b>0?`<span class="ball">${b}B</span>`:''}</div>`; }

    const pEff = document.getElementById('pop-effect'); pEff.innerText=pText.trim(); pEff.style.color=pColor; pEff.classList.remove('pop-animate'); void pEff.offsetWidth; pEff.classList.add('pop-animate');

    let rb = document.getElementById('result-board'); rb.insertAdjacentHTML('beforeend', resHTML); rb.scrollTop=rb.scrollHeight;

    if(s===3) {
        document.getElementById('submit-btn').disabled=true; document.getElementById('user-input').disabled=true; 
        document.getElementById('single-end-btns').style.display="flex"; 
        if(currentTop10.length<10 || elapsedTime < currentTop10[currentTop10.length-1].time) {
            setTimeout(()=> { document.getElementById('record-time').innerText=elapsedTime; document.getElementById('name-modal').classList.remove('hidden'); }, 1000);
        }
    } else if(attempts>=MAX_ATTEMPTS) {
        clearInterval(timerInterval); playSound(outSound); pEff.innerText="실패!"; pEff.style.color="#ef5350";
        rb.insertAdjacentHTML('beforeend', `<div class="fail-message"><h1>실패!</h1><p>정답: <strong>[ ${targetNumbers.join('')} ]</strong></p></div>`);
        document.getElementById('submit-btn').disabled=true; document.getElementById('user-input').disabled=true; 
        document.getElementById('single-end-btns').style.display="flex"; rb.scrollTop=rb.scrollHeight;
    } else { s===0&&b===0 ? playSound(outSound) : playSound(strikeSound); }
    document.getElementById('user-input').value=''; document.getElementById('user-input').focus();
}

document.getElementById('save-name-btn').addEventListener('click', () => {
    let finalName = document.getElementById('player-name').value.trim() || '익명';
    rankRef.push({ name: finalName, time: elapsedTime }); document.getElementById('name-modal').classList.add('hidden');
});

document.getElementById('btn-single-play').addEventListener('click', () => { updateNickname(); showScreen('screen-single'); initSingleGame(); });
document.getElementById('retry-btn').addEventListener('click', initSingleGame);
document.getElementById('home-btn').addEventListener('click', () => showScreen('screen-mode-select'));


// =======================================================================
// ⚔️ 3. 온라인 1:1 대전 플레이 로직 (유령 방 완벽 청소 적용)
// =======================================================================
const myUid = "user_" + Math.random().toString(36).substr(2, 9);
let currentRoomId = null, myRole = null, multiPhase = '', currentTurn = 1, oppName = "상대방";

document.getElementById('btn-multi-play').addEventListener('click', () => {
    updateNickname(); 
    showScreen('screen-lobby'); 
    
    db.ref('rooms').on('value', (snap) => {
        const listEl = document.getElementById('room-list'); listEl.innerHTML = '';
        let hasActiveRooms = false;

        if (snap.exists()) {
            snap.forEach(child => {
                const room = child.val();
                const roomId = child.key;
                
                if (room.status !== 'waiting' && room.status !== 'playing') return;
                
                hasActiveRooms = true;
                const isWaiting = room.status === 'waiting';
                const statusText = isWaiting ? '🟢 대기 중 (1/2)' : '🔴 게임 중 (2/2)';
                const statusClass = isWaiting ? 'status-waiting' : 'status-playing';
                const itemClass = isWaiting ? 'waiting' : 'playing';

                const li = document.createElement('li');
                li.className = `room-item ${itemClass}`;
                li.innerHTML = `<span class="room-title">${room.p1_name}님의 방</span><span class="room-status ${statusClass}">${statusText}</span>`;

                if (isWaiting) li.addEventListener('click', () => joinRoom(roomId));
                listEl.appendChild(li);
            });
        }

        if (!hasActiveRooms) {
            listEl.innerHTML = '<li style="text-align:center; padding:30px 0; color:#8b949e;">현재 개설된 방이 없습니다.<br>새로운 방을 만들어보세요!</li>';
        }
    });
});

document.getElementById('btn-leave-lobby').addEventListener('click', () => {
    db.ref('rooms').off(); showScreen('screen-mode-select');
});

document.getElementById('btn-create-room').addEventListener('click', () => {
    db.ref('rooms').off(); 
    const newRoom = db.ref('rooms').push();
    currentRoomId = newRoom.key; myRole = 'p1';
    
    newRoom.set({ status: 'waiting', p1: myUid, p1_name: globalNickname, p1_target: "", p2_target: "", turn: 1 });
    
    // ✨ 방장이 창을 닫으면 즉시 방 삭제 예약
    newRoom.onDisconnect().remove();
    
    enterMultiRoom(); 
});

function joinRoom(roomId) {
    db.ref('rooms').off(); 
    currentRoomId = roomId; myRole = 'p2';
    
    const roomRef = db.ref('rooms/' + roomId);
    roomRef.update({ p2: myUid, p2_name: globalNickname, status: 'playing' });
    
    // ✨ 참가자가 창을 닫으면 상태를 abandoned로 변경 예약
    roomRef.child('status').onDisconnect().set('abandoned');
    
    enterMultiRoom(); 
}

function enterMultiRoom() {
    showScreen('screen-multi'); 
    document.getElementById('multi-result-board').innerHTML = '';
    document.getElementById('multi-exit-btn').style.display = 'none';
    document.getElementById('multi-input').disabled = true; document.getElementById('multi-submit-btn').disabled = true;
    document.getElementById('multi-input').value = '';
    document.getElementById('my-secret-box').classList.add('hidden'); document.getElementById('my-secret-number').innerText = '';

    multiPhase = 'waiting_player'; currentTurn = 1;
    document.getElementById('multi-my-name').innerText = globalNickname;
    document.getElementById('multi-opp-name').innerText = "대기 중...";
    document.getElementById('multi-status-msg').innerText = "⏳ 상대방이 들어오기를 기다리는 중입니다...";

    db.ref('rooms/' + currentRoomId).on('value', snap => {
        const rData = snap.val(); if (!rData) return;
        
        if (rData.status === 'abandoned') { alert(`⚠️ 상대방이 도망갔습니다.`); leaveMultiGame(); return; }

        if (multiPhase === 'waiting_player' && rData.status === 'playing') {
            multiPhase = 'setting';
            if (myRole === 'p1') oppName = rData.p2_name || "상대방";
            if (myRole === 'p2') oppName = rData.p1_name || "상대방";
            
            document.getElementById('multi-opp-name').innerText = oppName;
            document.getElementById('multi-status-msg').innerText = "⚔️ 매칭 성공! 상대가 맞출 내 비밀 숫자를 설정하세요.";
            document.getElementById('multi-input').disabled = false; document.getElementById('multi-submit-btn').disabled = false;
        }

        if (multiPhase === 'setting' && rData.p1_target !== "" && rData.p2_target !== "") {
            multiPhase = 'playing';
            document.getElementById('multi-status-msg').innerText = `🔥 전투 시작! [1턴] ${oppName}의 숫자를 맞춰보세요!`;
            document.getElementById('multi-input').disabled = false; document.getElementById('multi-submit-btn').disabled = false;
        }

        if (multiPhase === 'playing') {
            const tData = rData.guesses ? rData.guesses[currentTurn] : null;
            if (tData && tData.p1 && tData.p2) {
                const myTarget = myRole === 'p1' ? rData.p1_target : rData.p2_target;
                const oppTarget = myRole === 'p1' ? rData.p2_target : rData.p1_target;
                const myGuess = myRole === 'p1' ? tData.p1 : tData.p2;
                const oppGuess = myRole === 'p1' ? tData.p2 : tData.p1;
                processTurnResult(myGuess, oppGuess, myTarget, oppTarget);
                currentTurn++;
            }
        }
    });
}

document.getElementById('multi-submit-btn').addEventListener('click', () => {
    const val = document.getElementById('multi-input').value;
    if (val.length !== 3 || isNaN(val) || new Set(val.split('')).size !== 3) { alert("중복 없는 3자리 숫자를 입력하세요!"); return; }

    document.getElementById('multi-input').value = ''; document.getElementById('multi-input').disabled = true; document.getElementById('multi-submit-btn').disabled = true;

    if (multiPhase === 'setting') {
        document.getElementById('multi-status-msg').innerText = "⏳ 상대방 설정을 기다리는 중...";
        document.getElementById('my-secret-number').innerText = val; document.getElementById('my-secret-box').classList.remove('hidden');
        const updates = {}; updates[myRole + '_target'] = val; db.ref('rooms/' + currentRoomId).update(updates);
    } else if (multiPhase === 'playing') {
        document.getElementById('multi-status-msg').innerText = "⏳ 상대방 공격을 기다리는 중...";
        const updates = {}; updates[`guesses/${currentTurn}/${myRole}`] = val; db.ref('rooms/' + currentRoomId).update(updates);
    }
});

function processTurnResult(myGuess, oppGuess, myTarget, oppTarget) {
    let myS = 0, myB = 0, oppS = 0, oppB = 0;
    for(let i=0; i<3; i++) { if(myGuess[i] === oppTarget[i]) myS++; else if(oppTarget.includes(myGuess[i])) myB++; }
    for(let i=0; i<3; i++) { if(oppGuess[i] === myTarget[i]) oppS++; else if(myTarget.includes(oppGuess[i])) oppB++; }

    let myResText = "", oppResText = "";
    if (myS > 0) myResText += `<span class="strike">${myS}S</span> `;
    if (myB > 0) myResText += `<span class="ball">${myB}B</span>`;
    if (myS === 0 && myB === 0) myResText = `<span class="out">아웃!</span>`;

    if (oppS > 0) oppResText += `<span class="strike">${oppS}S</span> `;
    if (oppB > 0) oppResText += `<span class="ball">${oppB}B</span>`;
    if (oppS === 0 && oppB === 0) oppResText = `<span class="out">아웃!</span>`;

    const board = document.getElementById('multi-result-board');
    let resHTML = `
        <div class="log-entry" style="display:flex; justify-content:space-between; border-bottom: 1px dashed rgba(255,255,255,0.1); padding: 12px 0;">
            <div style="flex:1; text-align:left;"><span style="color:#2196f3; font-weight:bold;">${globalNickname}</span> ${myGuess} ➔ <br>${myResText}</div>
            <div style="flex:1; text-align:right;"><span style="color:#ef5350; font-weight:bold;">${oppName}</span> ${oppGuess} ➔ <br>${oppResText}</div>
        </div>`;
    board.insertAdjacentHTML('beforeend', resHTML); board.scrollTop = board.scrollHeight;

    const mpEff = document.getElementById('multi-pop-effect'); let popText = "";
    if (myS === 3) { popText = "정답! 🎉"; mpEff.style.color = "#4caf50"; }
    else if (myS === 0 && myB === 0) { popText = "아웃!"; mpEff.style.color = "#ef5350"; }
    else { popText = `${myS > 0 ? myS+'S ' : ''}${myB > 0 ? myB+'B' : ''}`.trim(); mpEff.style.color = "#ffeb3b"; }

    mpEff.innerText = popText; mpEff.classList.remove('pop-animate'); void mpEff.offsetWidth; mpEff.classList.add('pop-animate');

    if(myS === 3 && oppS === 3) finishMultiGame("🤝 무승부! 둘 다 동시에 맞췄습니다!", oppTarget);
    else if(myS === 3) finishMultiGame(`🎉 승리! ${oppName}의 숫자를 먼저 맞췄습니다!`, oppTarget);
    else if(oppS === 3) finishMultiGame(`💀 패배... ${oppName}님이 먼저 맞췄습니다.`, oppTarget);
    else {
        document.getElementById('multi-status-msg').innerText = `[${currentTurn + 1}턴] 다음 숫자를 입력하세요!`;
        document.getElementById('multi-input').disabled = false; document.getElementById('multi-submit-btn').disabled = false;
        document.getElementById('multi-input').focus(); (myS===0&&myB===0) ? playSound(outSound) : playSound(strikeSound);
    }
}

function finishMultiGame(msg, oppTarget) {
    if(msg.includes("승리")) { playSound(winSound); shootConfetti(); } else playSound(outSound);
    document.getElementById('multi-status-msg').innerHTML = `${msg} <br><span style="font-size:0.9em; color:#8b949e; display:block; margin-top:8px;">${oppName}의 숫자: ${oppTarget}</span>`;
    document.getElementById('multi-exit-btn').style.display = 'inline-block';
    db.ref('rooms/' + currentRoomId).update({status: 'finished'}); 
    db.ref('rooms/' + currentRoomId).off(); 
}

document.getElementById('multi-exit-btn').addEventListener('click', leaveMultiGame);

function leaveMultiGame() {
    if (currentRoomId) { 
        // ✨ 정상적으로 나갈 때는 예약된 onDisconnect 삭제 명령을 취소!
        db.ref('rooms/' + currentRoomId).onDisconnect().cancel();
        
        db.ref('rooms/' + currentRoomId).update({status: 'abandoned'}); 
        const roomIdToDelete = currentRoomId; 
        setTimeout(() => { db.ref('rooms/' + roomIdToDelete).remove(); }, 2000); 
        db.ref('rooms/' + currentRoomId).off(); 
    }
    currentRoomId = null; 
    document.getElementById('btn-multi-play').click(); 
}