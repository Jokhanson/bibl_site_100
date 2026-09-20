var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

(function () {
  document.documentElement.classList.add("js");

  var supportsObserver = "IntersectionObserver" in window;

  function showAll() {
    document.querySelectorAll("[data-reveal]").forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  if (reduceMotion.matches || !supportsObserver) {
    showAll();
  } else {
    var targets = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (targets.length) {
      var observer = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      targets.forEach(function (el) { observer.observe(el); });

      window.addEventListener("load", function () {
        window.setTimeout(showAll, 2400);
      });
    }
  }

  initReadingProgress();
  initCarousel();
})();

function initReadingProgress() {
  var bar = document.querySelector(".progress__bar");
  if (!bar) return;

  function update() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? (window.scrollY || doc.scrollTop) / max : 0;
    bar.style.width = (ratio * 100).toFixed(2) + "%";
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

function initCarousel() {
  var root = document.querySelector("[data-carousel]");
  if (!root) return;

  var viewport = root.querySelector("[data-carousel-viewport]");
  var track = root.querySelector("[data-carousel-track]");
  var slides = Array.prototype.slice.call(root.querySelectorAll("[data-carousel-slide]"));
  var prevBtn = root.querySelector("[data-carousel-prev]");
  var nextBtn = root.querySelector("[data-carousel-next]");
  var dotsWrap = document.querySelector("[data-carousel-dots]");
  var currentEl = document.querySelector("[data-carousel-current]");
  var totalEl = document.querySelector("[data-carousel-total]");

  if (!track || !slides.length) return;

  var N = slides.length;
  var total = N * 3;
  var pos = N;
  var index = 0;
  var DURATION = 600;
  var timer = null;

  if (totalEl) totalEl.textContent = String(N);

  // Три подряд идущие копии S1..SN для бесшовного кругового переноса
  function cloneSet(dest) {
    slides.forEach(function (slide) {
      var c = slide.cloneNode(true);
      c.removeAttribute("loading");
      dest.appendChild(c);
    });
  }

  function clearTrack() {
    while (track.firstChild) track.removeChild(track.firstChild);
  }

  clearTrack();
  cloneSet(track);   // копия для «назад» (индексы 0..N-1)
  cloneSet(track);   // оригиналы (N..2N-1)
  cloneSet(track);   // копия для «вперёд» (2N..3N-1)

  var nodes = Array.prototype.slice.call(track.querySelectorAll("[data-carousel-slide]"));

  function slideW() {
    return root.clientWidth * 0.46;
  }

  function transformFor(p) {
    var w = slideW();
    return "translate3d(" + (root.clientWidth / 2 - (p * w + w / 2)) + "px, 0, 0)";
  }

  function centerPos(p) {
    return root.clientWidth / 2 - (p * slideW() + slideW() / 2);
  }

  function setTransform(p, animate) {
    track.style.transition = animate ? "" : "none";
    track.style.transform = transformFor(p);
    if (!animate) void track.offsetWidth;
  }

  function applyClasses(instant) {
    nodes.forEach(function (node, i) {
      var active = i === pos;
      var prev = !active && inBounds(pos - 1) && i === pos - 1;
      var next = !active && inBounds(pos + 1) && i === pos + 1;
      var changed = active !== node.classList.contains("is-active") ||
                    prev !== node.classList.contains("is-prev") ||
                    next !== node.classList.contains("is-next");
      if (instant && changed) node.style.transition = "none";
      node.classList.toggle("is-active", active);
      node.classList.toggle("is-prev", prev);
      node.classList.toggle("is-next", next);
    });
    if (instant) {
      void track.offsetWidth;
      nodes.forEach(function (node) { node.style.transition = ""; });
    }
  }

  function inBounds(p) {
    return p >= 0 && p < nodes.length;
  }

  function syncChrome() {
    if (currentEl) currentEl.textContent = String(index + 1);
    if (dotsWrap) {
      dotsWrap.querySelectorAll(".carousel__dot").forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });
    }
  }

  function normalize() {
    if (pos >= 2 * N) pos -= N;
    else if (pos < N) pos += N;
    setTransform(pos, false);
    applyClasses(true);
  }

  function fitWithinTrack(dir) {
    if (dir > 0 && pos > total - 2) {
      setTransform(pos - N, false);
      pos -= N;
    } else if (dir < 0 && pos < 1) {
      setTransform(pos + N, false);
      pos += N;
    }
  }

  var isInstant = reduceMotion.matches;

  function scheduleSettle() {
    if (isInstant) { normalize(); return; }
    if (timer) { window.clearTimeout(timer); timer = null; }
    timer = window.setTimeout(normalize, DURATION + 160);
  }

  track.addEventListener("transitionend", function (e) {
    if (timer && e.target === track && e.propertyName === "transform") {
      window.clearTimeout(timer);
      timer = null;
      normalize();
    }
  });

  function go(dir) {
    if (timer) { window.clearTimeout(timer); timer = null; }
    fitWithinTrack(dir);
    pos += dir;
    index = (index + dir + N) % N;
    setTransform(pos, !isInstant);
    applyClasses();
    syncChrome();
    scheduleSettle();
  }

  function jumpTo(i) {
    if (timer) { window.clearTimeout(timer); timer = null; }
    var steps = i - index;
    pos += steps;
    while (pos < 0) pos += N;
    while (pos >= total) pos -= N;
    index = i;
    setTransform(pos, !isInstant);
    applyClasses();
    syncChrome();
    scheduleSettle();
  }

  if (prevBtn) prevBtn.addEventListener("click", function () { go(-1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { go(1); });

  if (dotsWrap) {
    for (var d = 0; d < N; d++) {
      (function (i) {
        var dot = document.createElement("button");
        dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
        dot.type = "button";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", "Фото " + (i + 1));
        dot.addEventListener("click", function () { jumpTo(i); });
        dotsWrap.appendChild(dot);
      })(d);
    }
  }

  // Позиция и видимость без анимации
  setTransform(pos, false);
  applyClasses(true);
  syncChrome();

  // Клавиатура
  root.setAttribute("tabindex", "0");
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
  });

  // Свайпы / перетаскивание
  var dragging = false;
  var touchX = null;

  track.addEventListener("pointerdown", function (e) {
    if (reduceMotion.matches) return;
    if (timer) { window.clearTimeout(timer); timer = null; }
    dragging = true;
    touchX = e.clientX;
    track.setPointerCapture(e.pointerId);
  });

  track.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - touchX;
    track.style.transition = "none";
    track.style.transform = "translate3d(" + (centerPos(pos) + dx) + "px, 0, 0)";
  });

  track.addEventListener("pointerup", function (e) {
    if (!dragging) return;
    dragging = false;
    var dx = e.clientX - touchX;
    var threshold = root.clientWidth * 0.14;
    if (dx > threshold) go(-1);
    else if (dx < -threshold) go(1);
    else if (isInstant) setTransform(pos, false);
    else setTransform(pos, true);
    touchX = null;
  });

  if (reduceMotion.matches) track.style.transition = "none";

  window.addEventListener("resize", function () { setTransform(pos, false); });
}