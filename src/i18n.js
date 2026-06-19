// 다국어 문자열. 사용자에게 보이는 모든 단어를 여기 모아둔다.
// node(메인/state)와 렌더러(preload 경유) 양쪽에서 쓰므로 순수 데이터만 둔다(함수 X).
// {name} 같은 자리표시자는 사용하는 쪽에서 replace 한다.

const STRINGS = {
  ko: {
    // 상태 패널 라벨 (이모지는 렌더러에서 붙임)
    happiness: '행복도',
    food: '밥',
    energy: '체력',
    feedPoints: '먹이 포인트',
    sinceInstall: '설치 후 사용량',
    feedBtn: '밥 주기',
    playBtn: '놀아주기',
    today: '오늘 활동',
    total: '누적 토큰',
    lastActive: '마지막 활동',
    closeHint: '바깥을 클릭하면 닫힘',
    restartBtn: '재시작',
    hideBtn: '넣어두기',
    showBtn: '꺼내기',

    // 경과 시간
    justNow: '방금',
    minAgo: '분 전',
    hourAgo: '시간 전',
    dayAgo: '일 전',
    none: '–',

    // 기분 배지
    mood: { happy: '행복', hungry: '배고픔', tired: '피곤', working: '열일중' },

    // 클릭 시 보여줄 기분 메시지
    messages: {
      hungry:  ['배고파요... 밥 좀 주세요 🥺', '꼬르륵... 토큰이 필요해요', '며칠 굶은 것 같아요...'],
      tired:   ['졸려요... 놀아주세요 😴', '체력이 바닥났어요', '같이 좀 쉬어요...'],
      working: ['열일 중! 🔥', '오늘 코드가 술술!', '같이 달려요 ⚡'],
      happy:   ['기분 좋아요 ✨', '오늘도 함께해요!', '뭐 도와드릴까요?'],
    },

    // 펫이 스스로 띄우는 단계별 말풍선 (상태가 떨어질 때 = 우클릭 안내도 섞임)
    alerts: {
      food:   { 1: ['출출해요 🍚', '슬슬 배가 고파요', '우클릭해서 밥 주세요 🍚'],
                2: ['배고파요 🥺', '꼬르륵... 우클릭으로 밥 주세요', '며칠 굶었어요... 우클릭해서 밥 주세요'] },
      energy: { 1: ['심심해요... 우클릭으로 놀아줄래요? 🎮', '조금 지루해요', '우클릭해서 같이 놀아요'],
                2: ['기운이 없어요 😴 우클릭해서 놀아주세요', '너무 지쳤어요...', '졸려요... 우클릭으로 놀아주세요'] },
    },

    // 클릭 수에 따라 변하는 대사 (early→mid→late). 초반엔 조작법 안내도 섞임.
    chatter: {
      early: ['밥 주세요! 🍚', 'API로 키워주세요!', '우클릭하면 저에게 밥을 줄 수 있어요 🍚', '우클릭으로 제 상태를 봐주세요 📊', '우클릭해서 저랑 놀아줄래요? 🎮', '저 좀 키워주실래요? 🌱'],
      mid:   ['같이 코딩해요! 💻', '심심한데 놀아줄래요? 🎮', '우클릭으로 상태를 확인해보세요 📊', '오늘 컨디션 좋아요 ✨', '커밋 자주 해요~'],
      late:  ['그만 놀고 일에 집중해주세요 😅', '저 신경 쓰지 말고 코드 짜세요!', '딴짓 그만~ 마감 안 급해요? ⏰', '저 여기 잘 있으니 일하세요 🙂', '클릭 그만하고 빌드 돌려요!'],
    },

    // 먹이/놀이/이름 반응
    reactEat: '냠냠 😋',
    reactPlay: '신난다! 🎉',
    reactNamed: '난 이제 {name}! 🌱',

    // 이름 짓기 창
    nameTitle: '새 친구가 찾아왔어요!',
    nameDesc: "이 클로(Claw'd)의 <b>이름</b>을 지어주세요.<br />앞으로 이 이름으로 함께해요.",
    namePlaceholder: '예: 또또, 클로비, 게딱지…',
    nameButton: '이 이름으로 키우기 🌱',
  },

  en: {
    happiness: 'Happiness',
    food: 'Food',
    energy: 'Energy',
    feedPoints: 'Feed points',
    sinceInstall: 'since install',
    feedBtn: 'Feed',
    playBtn: 'Play',
    today: 'Today',
    total: 'Total tokens',
    lastActive: 'Last active',
    closeHint: 'click outside to close',
    restartBtn: 'Restart',
    hideBtn: 'Tuck away',
    showBtn: 'Bring out',

    justNow: 'just now',
    minAgo: 'm ago',
    hourAgo: 'h ago',
    dayAgo: 'd ago',
    none: '–',

    mood: { happy: 'happy', hungry: 'hungry', tired: 'tired', working: 'working' },

    messages: {
      hungry:  ["I'm hungry... please feed me 🥺", 'Rumble... I need tokens', 'Feels like days since I ate...'],
      tired:   ['So sleepy... play with me 😴', "I'm out of energy", "Let's take a break..."],
      working: ['Hard at work! 🔥', 'Code is flowing today!', "Let's go ⚡"],
      happy:   ['Feeling great ✨', 'Glad to be with you!', 'How can I help?'],
    },

    alerts: {
      food:   { 1: ['Feeling peckish 🍚', 'Getting a bit hungry', 'Right-click to feed me 🍚'],
                2: ["I'm hungry 🥺", 'Rumble... right-click to feed me', 'Starving... right-click to feed me'] },
      energy: { 1: ["I'm bored... right-click to play? 🎮", 'A little bored', 'Right-click to play with me'],
                2: ["No energy left 😴 right-click to play", "I'm so worn out...", 'So sleepy... right-click to play'] },
    },

    chatter: {
      early: ['Feed me! 🍚', 'Raise me with the API!', 'Right-click to feed me 🍚', 'Right-click to check my status 📊', 'Right-click to play with me 🎮', 'Will you raise me? 🌱'],
      mid:   ["Let's code together! 💻", 'Bored... wanna play? 🎮', 'Right-click to see my status 📊', 'Feeling great today ✨', 'Commit often~'],
      late:  ['Stop playing, focus on work 😅', "Don't mind me, go write code!", 'Quit slacking~ no deadline? ⏰', "I'm fine here, get to work 🙂", 'Stop clicking, run the build!'],
    },

    reactEat: 'Yum yum 😋',
    reactPlay: 'So fun! 🎉',
    reactNamed: "I'm {name} now! 🌱",

    nameTitle: 'A new friend appeared!',
    nameDesc: "Give this <b>Claw'd</b> a name.<br />You'll raise it together from now on.",
    namePlaceholder: 'e.g. Clawdia, Pinchy, Sebastian…',
    nameButton: 'Raise with this name 🌱',
  },
};

// lang 정규화 헬퍼 (node 측에서 사용)
function pack(lang) { return STRINGS[lang] || STRINGS.ko; }

module.exports = { STRINGS, pack };
