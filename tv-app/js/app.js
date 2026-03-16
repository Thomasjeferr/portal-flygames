/**
 * Fly Games - Samsung Smart TV app
 * Navegação D-pad, foco visível, sem login na TV (autorização via QR no celular).
 */
(function () {
  var API_BASE = (function () {
    try {
      if (window.location.protocol === 'https:' || window.location.protocol === 'http:') {
        return window.location.origin;
      }
    } catch (e) {}
    return 'https://flygames.app';
  })();

  var STORAGE_TOKEN = 'fly_tv_session_token';
  var STORAGE_DEVICE_ID = 'fly_tv_device_id';
  var POLL_INTERVAL_MS = 2000;

  var currentCode = null;
  var pollTimer = null;
  var focusedIndex = 0;
  var games = [];

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.remove('active');
    });
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function getStoredToken() {
    try {
      return localStorage.getItem(STORAGE_TOKEN);
    } catch (e) {
      return null;
    }
  }

  function getStoredDeviceId() {
    try {
      return localStorage.getItem(STORAGE_DEVICE_ID);
    } catch (e) {
      return null;
    }
  }

  function setStoredSession(token, deviceId) {
    try {
      if (token) localStorage.setItem(STORAGE_TOKEN, token);
      if (deviceId) localStorage.setItem(STORAGE_DEVICE_ID, deviceId);
    } catch (e) {}
  }

  function clearStoredSession() {
    try {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_DEVICE_ID);
    } catch (e) {}
  }

  function request(method, path, body) {
    var url = API_BASE + path;
    var opts = { method: method, headers: {} };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Erro de rede');
        return data;
      });
    });
  }

  function getCode() {
    return request('POST', '/api/tv/code', {}).then(function (data) {
      currentCode = data.code;
      return data;
    });
  }

  function showAuthScreen() {
    showScreen('screen-auth');
    getCode()
      .then(function (data) {
        document.getElementById('qr-image').src =
          API_BASE + '/api/tv/qr?code=' + encodeURIComponent(data.code);
        document.getElementById('auth-code').textContent =
          data.codeFormatted || data.code.slice(0, 3) + '-' + data.code.slice(3);
        var exp = new Date(data.expiresAt);
        document.getElementById('auth-expiry').textContent =
          'Código válido até ' + exp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        startPolling();
      })
      .catch(function (err) {
        document.getElementById('auth-expiry').textContent = err.message || 'Erro ao gerar código.';
      });
  }

  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (!currentCode) return;
      request('GET', '/api/tv/status?code=' + encodeURIComponent(currentCode))
        .then(function (data) {
          if (data.status === 'authorized') {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
            setStoredSession(data.tvSessionToken, data.deviceId);
            currentCode = null;
            showCatalog();
          } else if (data.status === 'expired' || data.status === 'invalid') {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
            document.getElementById('auth-expiry').textContent = data.message || 'Código expirado.';
          }
        })
        .catch(function () {});
    }, POLL_INTERVAL_MS);
  }

  function showCatalog() {
    showScreen('screen-catalog');
    var grid = document.getElementById('catalog-grid');
    grid.innerHTML = '';
    document.getElementById('catalog-message').textContent = '';

    request('GET', '/api/games')
      .then(function (list) {
        games = list || [];
        if (games.length === 0) {
          document.getElementById('catalog-message').textContent = 'Nenhum jogo disponível.';
          return;
        }
        var token = getStoredToken();
        games.forEach(function (g, i) {
          var card = document.createElement('div');
          card.className = 'game-card';
          card.setAttribute('data-focusable', 'true');
          card.setAttribute('tabindex', '0');
          card.setAttribute('data-index', String(i));
          card.innerHTML =
            '<img class="game-card-poster" src="' +
            (g.thumbnailUrl || '') +
            '" alt="" />' +
            '<div class="game-card-info">' +
            '<p class="game-card-title">' +
            escapeHtml(g.title || '') +
            '</p>' +
            '<p class="game-card-meta">' +
            escapeHtml(g.championship || '') +
            '</p>' +
            '</div>';
          card.addEventListener('click', function () {
            selectGame(g);
          });
          card.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === 'OK') {
              e.preventDefault();
              selectGame(g);
            }
          });
          grid.appendChild(card);
        });
        focusedIndex = 0;
        focusCard();
      })
      .catch(function (err) {
        document.getElementById('catalog-message').textContent =
          err.message || 'Erro ao carregar jogos.';
      });
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function focusCard() {
    var cards = document.querySelectorAll('.game-card');
    cards.forEach(function (c) {
      c.classList.remove('focused');
    });
    if (cards[focusedIndex]) {
      cards[focusedIndex].classList.add('focused');
      cards[focusedIndex].focus();
    }
  }

  function selectGame(game) {
    var token = getStoredToken();
    if (!token) {
      showScreen('screen-expired');
      return;
    }
    request('GET', '/api/games/' + encodeURIComponent(game.slug) + '?tvSessionToken=' + encodeURIComponent(token))
      .then(function (detail) {
        if (detail.tvSessionExpired) {
          clearStoredSession();
          showScreen('screen-expired');
          return;
        }
        if (!detail.canWatch || !detail.videoId) {
          document.getElementById('catalog-message').textContent =
            'Você não tem acesso a este jogo ou o vídeo não está disponível.';
          return;
        }
        playGame(detail.videoId, detail.slug, token);
      })
      .catch(function (err) {
        if (err.message && err.message.indexOf('expirada') !== -1) {
          clearStoredSession();
          showScreen('screen-expired');
        } else {
          document.getElementById('catalog-message').textContent =
            err.message || 'Erro ao carregar o jogo.';
        }
      });
  }

  function playGame(videoId, gameSlug, token) {
    showScreen('screen-player');
    var video = document.getElementById('video-player');
    var backBtn = document.getElementById('player-back');

    var url =
      API_BASE +
      '/api/video/stream-playback?videoId=' +
      encodeURIComponent(videoId) +
      '&gameSlug=' +
      encodeURIComponent(gameSlug) +
      '&tvSessionToken=' +
      encodeURIComponent(token);

    fetch(url, { credentials: 'omit' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        var hlsUrl = data.hlsUrl;
        if (Hls.isSupported() && hlsUrl) {
          var hls = new Hls();
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = hlsUrl;
        } else {
          throw new Error('Reprodução não suportada neste dispositivo.');
        }
        video.play().catch(function () {});
      })
      .catch(function (err) {
        if (err.message && err.message.indexOf('expirada') !== -1) {
          clearStoredSession();
          showScreen('screen-expired');
        }
      });

    backBtn.onclick = function () {
      video.pause();
      video.src = '';
      showCatalog();
    };
    backBtn.onkeydown = function (e) {
      if (e.key === 'Enter' || e.key === 'OK' || e.key === 'Back') {
        e.preventDefault();
        backBtn.onclick();
      }
    };
  }

  function initDpad() {
    document.addEventListener('keydown', function (e) {
      var screen = document.querySelector('.screen.active');
      if (!screen) return;

      if (screen.id === 'screen-catalog') {
        var cards = document.querySelectorAll('.game-card');
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          focusedIndex = Math.min(focusedIndex + 1, cards.length - 1);
          focusCard();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          focusedIndex = Math.max(focusedIndex - 1, 0);
          focusCard();
        }
      }

      if (e.key === 'Back') {
        e.preventDefault();
        if (screen.id === 'screen-player') {
          document.getElementById('player-back').click();
        } else if (screen.id === 'screen-catalog') {
          clearStoredSession();
          showAuthScreen();
        }
      }
    });
  }

  document.getElementById('btn-refresh-auth').addEventListener('click', function () {
    showAuthScreen();
  });
  document.getElementById('btn-refresh-auth').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === 'OK') showAuthScreen();
  });

  initDpad();

  if (getStoredToken()) {
    showCatalog();
  } else {
    showAuthScreen();
  }
})();
