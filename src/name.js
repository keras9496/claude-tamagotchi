const input = document.getElementById('name');
const ok = document.getElementById('ok');
const langKo = document.getElementById('langKo');
const langEn = document.getElementById('langEn');

let lang = 'ko';

// 선택한 언어로 창 문구를 즉시 바꾼다
function applyLang() {
  const s = window.petAPI.strings[lang];
  document.getElementById('nTitle').textContent = s.nameTitle;
  document.getElementById('nDesc').innerHTML = s.nameDesc;
  input.placeholder = s.namePlaceholder;
  ok.textContent = s.nameButton;
  langKo.classList.toggle('active', lang === 'ko');
  langEn.classList.toggle('active', lang === 'en');
}

function submit() {
  const v = input.value.trim();
  if (!v) { input.focus(); return; }
  ok.disabled = true;
  window.petAPI.setName(v, lang); // 메인이 저장 후 이 창을 닫아줌
}

langKo.addEventListener('click', () => { lang = 'ko'; applyLang(); input.focus(); });
langEn.addEventListener('click', () => { lang = 'en'; applyLang(); input.focus(); });
ok.addEventListener('click', submit);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

applyLang();
input.focus();
