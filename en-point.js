// 森のしおり — 英語でひとこと（単語の吹き出し・英文の読み上げ）
(function () {
  var bubble = document.createElement('div');
  bubble.className = 'en-bubble';
  bubble.setAttribute('role', 'status');
  document.body.appendChild(bubble);
  var active = null;

  // ---- 単語と前後の記号（" . , ! など）が別の行に分かれないようにする ----
  document.querySelectorAll('.en-point .w').forEach(function (btn) {
    var prev = btn.previousSibling, next = btn.nextSibling;
    var before = prev && prev.nodeType === 3 ? (prev.textContent.match(/["'“‘]+$/) || [''])[0] : '';
    var after = next && next.nodeType === 3 ? (next.textContent.match(/^[.,!?:;"'”’…]+/) || [''])[0] : '';
    if (!before && !after) return;
    var span = document.createElement('span');
    span.style.whiteSpace = 'nowrap';
    btn.parentNode.insertBefore(span, btn);
    if (before) {
      prev.textContent = prev.textContent.slice(0, -before.length);
      span.appendChild(document.createTextNode(before));
    }
    span.appendChild(btn);
    if (after) {
      next.textContent = next.textContent.slice(after.length);
      span.appendChild(document.createTextNode(after));
    }
  });

  // ---- 吹き出し ----
  function showBubble(btn) {
    bubble.innerHTML = '';
    var b = document.createElement('b');
    b.textContent = btn.textContent.trim();
    bubble.appendChild(b);
    bubble.appendChild(document.createTextNode(btn.dataset.ja));
    bubble.classList.add('show');

    var r = btn.getBoundingClientRect();
    var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    var center = r.left + r.width / 2;
    var left = Math.max(12, Math.min(center - bw / 2, document.documentElement.clientWidth - bw - 12));
    bubble.style.left = (left + window.scrollX) + 'px';
    bubble.style.top = (r.top + window.scrollY - bh - 10) + 'px';
    bubble.style.setProperty('--arrow', (center - left) + 'px');
  }

  function hideBubble() {
    bubble.classList.remove('show');
    if (active) active.classList.remove('active');
    active = null;
  }

  document.querySelectorAll('.en-point .w').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (active === btn) { hideBubble(); return; }
      if (active) active.classList.remove('active');
      active = btn;
      btn.classList.add('active');
      showBubble(btn);
    });
  });

  document.addEventListener('click', hideBubble);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hideBubble();
  });
  // スマホでスクロールしたときの小さなリサイズでは閉じない（横幅が変わったときだけ）
  var lastWidth = document.documentElement.clientWidth;
  window.addEventListener('resize', function () {
    var w = document.documentElement.clientWidth;
    if (w !== lastWidth) hideBubble();
    lastWidth = w;
  });

  // ---- 英文の読み上げ（押すと読む。読んでいる間にもう一度押すと止める） ----
  var synth = window.speechSynthesis;
  var buttons = document.querySelectorAll('.en-listen');
  if (!synth || !window.SpeechSynthesisUtterance) {
    buttons.forEach(function (btn) {
      btn.disabled = true;
      btn.textContent = 'このブラウザでは音声が使えません';
    });
    return;
  }

  var voice = null, playing = null;

  // 英語の声をえらぶ（なめらかな声があれば、それを使う）
  function pickVoice() {
    // iPhone には機械のような声や遊びの声（Albert など）があり、名前順で先に来るので使わない
    var odd = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Deranged|Hysterical|Junior|Kathy|Princess|Ralph|Fred|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b|eloquence|speech\.synthesis/i;
    var all = synth.getVoices().filter(function (v) { return /^en[-_]/i.test(v.lang) && !odd.test(v.name + ' ' + v.voiceURI); });
    var us = all.filter(function (v) { return /en[-_]US/i.test(v.lang); });
    var good = function (v) { return /Google|Natural|Online|Premium|Enhanced/i.test(v.name); };
    var tessa = function (v) { return /Tessa/i.test(v.name); }; // iPhone で聞き比べて選んだ声
    var samantha = function (v) { return /Samantha/i.test(v.name); };
    // 人らしい声が見つからないときは voice を指定せず、端末の英語の声にまかせる
    voice = us.filter(good)[0] || all.filter(good)[0] || all.filter(tessa)[0] || us.filter(samantha)[0] || us[0] || all[0] || null;
  }
  pickVoice();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice);

  function reset() {
    if (!playing) return;
    playing.btn.textContent = '🔊 英文を聞く';
    playing.sentence.classList.remove('speaking');
    playing = null;
  }

  function speak(btn, sentence) {
    var u = new SpeechSynthesisUtterance(sentence.textContent.replace(/\s+/g, ' ').trim());
    u.lang = voice ? voice.lang : 'en-US';
    if (voice) u.voice = voice;
    u.rate = 0.85;
    u.onend = function () { if (playing && playing.u === u) reset(); };
    playing = { btn: btn, sentence: sentence, u: u };
    btn.textContent = '⏸ 止める';
    sentence.classList.add('speaking');
    synth.speak(u);
  }

  buttons.forEach(function (btn) {
    var sentence = btn.closest('.en-point').querySelector('.en-sentence');
    btn.addEventListener('click', function () {
      var same = playing && playing.btn === btn;
      var busy = synth.speaking || synth.pending;
      reset();
      synth.cancel();
      if (same) return;
      if (busy) {
        // cancel のすぐあとに speak すると読まないブラウザがあるので、少し待つ
        setTimeout(function () { speak(btn, sentence); }, 80);
      } else {
        // iPhone などでは、押したその場で読みはじめないと音が出ない
        speak(btn, sentence);
      }
    });
  });

  // ページを離れたら止める
  window.addEventListener('pagehide', function () { reset(); synth.cancel(); });
})();
