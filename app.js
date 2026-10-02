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
  initMemoryToggle();
  initHistoryToggle();
  initAnchorScroll();
})();

function initAnchorScroll() {
  if (reduceMotion.matches) return;
  var scrollToken = null;

  function stopAnimation() {
    if (scrollToken) {
      cancelAnimationFrame(scrollToken);
      scrollToken = null;
    }
    window.removeEventListener("wheel", stopAnimation, { passive: true });
    window.removeEventListener("touchstart", stopAnimation, { passive: true });
    window.removeEventListener("keydown", cancelOnKey, { passive: true });
  }

  function cancelOnKey(e) {
    var k = e.key;
    if (k === "Tab" || k === "Enter" || k === " " || k.indexOf("Arrow") === 0) {
      stopAnimation();
    }
  }

  function scrollToTarget(target) {
    stopAnimation();
    var startY = window.scrollY;
    var targetY = window.scrollY + target.getBoundingClientRect().top - 120;
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    targetY = Math.max(0, Math.min(targetY, maxY));

    var dist = targetY - startY;
    if (Math.abs(dist) < 2) return;

    var dur = Math.min(900, Math.max(260, Math.abs(dist) * 0.45));
    var t0 = null;

    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 4);
      window.scrollTo(0, startY + dist * eased);
      if (p < 1) {
        scrollToken = requestAnimationFrame(frame);
      } else {
        window.scrollTo(0, startY + dist);
        stopAnimation();
      }
    }

    window.addEventListener("wheel", stopAnimation, { passive: true });
    window.addEventListener("touchstart", stopAnimation, { passive: true });
    window.addEventListener("keydown", cancelOnKey, { passive: true });
    scrollToken = requestAnimationFrame(frame);
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      if (link.classList.contains("skip-link") || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      var id = link.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      scrollToTarget(target);
      history.replaceState(null, "", "#" + id);
    });
  });
}

function initHistoryToggle() {
  var story = document.querySelector(".history__story");
  if (!story) return;
  var paras = Array.prototype.slice.call(story.querySelectorAll("p"));
  if (paras.length < 2) return;

  var cutIdx = paras.findIndex(function (p) {
    return p.textContent.replace(/\s+/g, " ").trim().indexOf("Возможно, на старых фотографиях") === 0;
  });
  if (cutIdx === -1) return;

  var shown = paras.slice(0, cutIdx + 1);
  var hidden = paras.slice(cutIdx + 1);
  if (!hidden.length) return;

  hidden.forEach(function (p) { p.setAttribute("data-history-hidden", ""); });

  var walker = story;
  while (walker = walker.nextElementSibling) {
    walker.setAttribute("data-history-hidden", "");
  }

  var bar = document.createElement("div");
  bar.className = "history__more";

  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "history__toggle";
  toggle.id = "history-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "history-story");
  toggle.setAttribute("aria-label", "Читать дальше");
  toggle.innerHTML = '<span class="history__toggle__text">Читать дальше</span><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>';

  story.id = "history-story";
  bar.appendChild(toggle);
  shown[shown.length - 1].insertAdjacentElement("afterend", bar);
  story.classList.add("is-collapsed");
  document.documentElement.classList.add("is-history-collapsed");

  function showPreview() {
    document.documentElement.classList.add("is-history-collapsed");
    story.classList.add("is-collapsed");
    toggle.querySelector(".history__toggle__text").textContent = "Читать дальше";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Читать дальше");
  }

  function showFull() {
    document.documentElement.classList.remove("is-history-collapsed");
    story.classList.remove("is-collapsed");
    toggle.querySelector(".history__toggle__text").textContent = "Свернуть";
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Свернуть");
  }

  toggle.addEventListener("click", function () {
    if (story.classList.contains("is-collapsed")) showFull();
    else showPreview();
  });
}

function initMemoryToggle() {
  var LIMIT = 145;
  var memories = Array.prototype.slice.call(document.querySelectorAll(".memory"));
  memories.forEach(function (memory, idx) {
    var textEl = memory.querySelector(".memory__text");
    if (!textEl) return;
    var paras = Array.prototype.slice.call(textEl.querySelectorAll("p"));
    if (!paras.length) return;

    var full = paras.map(function (p) { return p.textContent.replace(/\s+/g, " ").trim(); }).join(" ");
    if (full.length <= LIMIT) return;

    var cut = full.slice(0, LIMIT);
    var sp = cut.lastIndexOf(" ");
    if (sp > LIMIT * 0.5) {
      cut = cut.slice(0, sp);
    } else {
      var next = full.indexOf(" ", LIMIT);
      if (next !== -1 && next - LIMIT < 24) cut = full.slice(0, next);
    }
    cut = cut.trim();

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "memory__toggle";
    toggle.id = "memory-toggle-" + idx;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "memory-text-" + idx);
    toggle.setAttribute("aria-label", "Развернуть воспоминание");
    toggle.innerHTML = '<span class="memory__toggle__text">Читать дальше</span><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>';

    textEl.id = "memory-text-" + idx;
    memory.appendChild(toggle);

    var preview = document.createElement("p");
    preview.className = "memory__preview";
    preview.textContent = cut + "…";

    textEl.insertBefore(preview, paras[0]);
    memory.classList.add("is-collapsed");

    function showPreview() {
      memory.classList.add("is-collapsed");
      toggle.querySelector(".memory__toggle__text").textContent = "Читать дальше";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Развернуть воспоминание");
    }

    function showFull() {
      memory.classList.remove("is-collapsed");
      toggle.querySelector(".memory__toggle__text").textContent = "Свернуть";
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Свернуть воспоминание");
    }

    toggle.addEventListener("click", function () {
      if (memory.classList.contains("is-collapsed")) showFull();
      else showPreview();
    });
  });
}

function initReadingProgress() {
  var bar = document.querySelector(".progress__bar");
  if (!bar || reduceMotion.matches) return;
  var ticking = false;

  function update() {
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    var p = max > 0 ? (window.scrollY || doc.scrollTop) / max : 0;
    bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
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
  var dragFrac = 0;
  var DURATION = 800;
  var timer = null;
  var autoTimer = null;
  var paused = false;

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
    return root.clientWidth * 0.5;
  }

  var PER = {
    0: { t: 0, s: 1, ry: 0, op: 1, z: 30, b: 1 },
    1: { t: 0.85, s: 0.82, ry: 26, op: 0.72, z: 20, b: 0.8 },
    2: { t: 1.7, s: 0.68, ry: 44, op: 0.4, z: 10, b: 0.6 }
  }; // t — множитель ширины слайда; ry — угол боковых.

  function nodeStyleAt(i) {
    var off = i - pos; // смещение слайда от центра
    var abs = Math.abs(off);
    var cfg = null;
    if (abs <= 2) {
      cfg = PER[abs];
    } else {
      cfg = { t: 4, s: 0.55, ry: 52, op: 0, z: 1, b: 0.4 };
    }
    var dir = off < 0 ? -1 : 1;
    var w = slideW();
    var tx = cfg.t * w * dir + dragFrac * w;
    var ry = -cfg.ry * dir;
    if (reduceMotion.matches) ry = 0;
    return {
      transform: "translate(-50%, -50%) translate3d(" + tx + "px, 0, 0) scale(" + cfg.s + ") rotateY(" + ry + "deg)",
      opacity: cfg.op,
      zIndex: cfg.z,
      filter: "brightness(" + cfg.b + ")",
      active: off === 0,
      visible: abs <= 2
    };
  }

  function applyPose(instant) {
    nodes.forEach(function (node, i) {
      var p = nodeStyleAt(i);
      if (instant) node.style.transition = "none";
      node.style.transform = p.transform;
      node.style.opacity = p.opacity;
      node.style.zIndex = p.zIndex;
      node.style.filter = p.filter;
      node.style.pointerEvents = p.visible ? "" : "none";
      node.classList.toggle("is-active", p.active);
    });
    if (instant) {
      void track.offsetWidth;
      nodes.forEach(function (node) { node.style.transition = ""; });
    } else {
      void track.offsetWidth;
    }
  }

  function applyDragPose() {
    nodes.forEach(function (node, i) {
      var p = nodeStyleAt(i);
      node.style.transform = p.transform;
      node.style.opacity = p.opacity;
      node.style.zIndex = p.zIndex;
      node.style.filter = p.filter;
      node.style.pointerEvents = p.visible ? "" : "none";
      node.classList.toggle("is-active", p.active);
    });
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
    applyPose(true);
  }

  function beginAnimating() {
    track.classList.add("is-animating");
    if (wcTimer) { window.clearTimeout(wcTimer); wcTimer = null; }
  }

  function endAnimating() {
    track.classList.remove("is-animating");
    wcTimer = null;
  }

  var wcTimer = null;

  function fitWithinTrack(dir) {
    if (dir > 0 && pos > total - 2) {
      pos -= N;
      applyPose(true);
    } else if (dir < 0 && pos < 1) {
      pos += N;
      applyPose(true);
    }
  }

  var isInstant = reduceMotion.matches;

  function scheduleSettle() {
    if (isInstant) { normalize(); return; }
    if (timer) { window.clearTimeout(timer); timer = null; }
    timer = window.setTimeout(normalize, DURATION + 120);
  }

  function go(dir) {
    if (timer) { window.clearTimeout(timer); timer = null; }
    fitWithinTrack(dir);
    pos += dir;
    index = (index + dir + N) % N;
    beginAnimating();
    applyPose(isInstant);
    syncChrome();
    scheduleSettle();
    if (isInstant) endAnimating();
    else wcTimer = window.setTimeout(endAnimating, DURATION + 200);
  }

  function jumpTo(i) {
    if (timer) { window.clearTimeout(timer); timer = null; }
    var steps = i - index;
    pos += steps;
    while (pos < 0) pos += N;
    while (pos >= total) pos -= N;
    index = i;
    beginAnimating();
    applyPose(!isInstant);
    syncChrome();
    scheduleSettle();
    if (isInstant) endAnimating();
    else wcTimer = window.setTimeout(endAnimating, DURATION + 200);
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

  // Позиция без анимации
  applyPose(true);
  syncChrome();

  // Клавиатура
  root.setAttribute("tabindex", "0");
  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
  });

  // Автопрокрутка с паузой на hover / фокус
  if (!reduceMotion.matches) {
    function tick() {
      if (paused) return;
      if (!root.matches(":hover") && document.activeElement !== root) go(1);
    }
    autoTimer = window.setInterval(tick, 5000);
    root.addEventListener("pointerenter", function () { paused = true; });
    root.addEventListener("pointerleave", function () { paused = false; });
    root.addEventListener("focusin", function () { paused = true; });
    root.addEventListener("focusout", function () { paused = false; });
  }

  // Свайпы: лента следует за пальцем 1:1, отпускание — инерционный долёт или откат
  var dragStartX = null;
  var dragStartY = null;
  var lastMoveX = 0;
  var lastMoveT = 0;
  var velocity = 0;
  var dragging = false;
  var downNode = null;

  nodes.forEach(function (node) {
    node.addEventListener("pointerdown", function () {
      downNode = node;
    });
  });

  track.addEventListener("pointerdown", function (e) {
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastMoveX = e.clientX;
    lastMoveT = performance.now();
    velocity = 0;
    try { track.setPointerCapture(e.pointerId); } catch (err) {}
  });

  track.addEventListener("pointermove", function (e) {
    if (dragStartX === null) return;
    var dx = e.clientX - dragStartX;
    if (!dragging) {
      var dy = e.clientY - dragStartY;
      if (e.pointerType === "mouse") return;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { dragStartX = null; return; }
      dragging = true;
      paused = true;
      beginAnimating();
      track.classList.add("is-dragging");
    }
    var now = performance.now();
    var dt = now - lastMoveT;
    if (dt > 0) {
      var v = (e.clientX - lastMoveX) / dt;
      velocity = 0.75 * velocity + 0.25 * v;
    }
    lastMoveX = e.clientX;
    lastMoveT = now;
    dragFrac = Math.max(-1.2, Math.min(1.2, dx / slideW()));
    applyDragPose();
  });

  track.addEventListener("pointerup", function (e) {
    if (dragStartX === null) return;
    var dx = e.clientX - dragStartX;
    dragStartX = null;

    if (dragging) {
      dragging = false;
      track.classList.remove("is-dragging");
      var frac = dragFrac;
      dragFrac = 0;
      var dir = 0;
      if (Math.abs(frac) > 0.18) dir = frac > 0 ? -1 : 1;
      else if (velocity > 0.5 && frac < -0.02) dir = 1;
      else if (velocity < -0.5 && frac > 0.02) dir = -1;
      velocity = 0;
      paused = root.matches(":hover");
      if (dir) {
        pos += dir;
        index = (index + dir + N) % N;
        applyPose(false);
        syncChrome();
        scheduleSettle();
        wcTimer = window.setTimeout(endAnimating, DURATION + 200);
      } else {
        applyPose(false);
        wcTimer = window.setTimeout(endAnimating, DURATION + 200);
      }
      downNode = null;
      return;
    }

    var threshold = root.clientWidth * 0.1;
    if (dx > threshold) go(-1);
    else if (dx < -threshold) go(1);
    else if (downNode) {
      if (downNode.classList.contains("is-active")) {
        openLightbox();
      } else if (parseFloat(downNode.style.opacity || "0") > 0.01) {
        jumpTo(nodes.indexOf(downNode) % N);
      }
    }
    downNode = null;
  });

  track.addEventListener("pointercancel", function () {
    if (!dragging) return;
    dragging = false;
    dragStartX = null;
    track.classList.remove("is-dragging");
    dragFrac = 0;
    velocity = 0;
    paused = root.matches(":hover");
    applyPose(false);
    wcTimer = window.setTimeout(endAnimating, DURATION + 200);
  });

  // === Полноэкранный просмотр фото ===
  var lightbox = document.querySelector("[data-lightbox]");
  var lbFrame = document.querySelector("[data-lightbox-frame]");
  var lbPicture = document.querySelector("[data-lightbox-picture]");
  var lbCurrent = document.querySelector("[data-lightbox-current]");
  var lbOpen = false;
  var lbLastFocus = null;
  var openLightbox = function () {};

  if (lightbox && lbPicture) {
    var lbImg = document.createElement("img");
    lbImg.alt = "";
    lbImg.decoding = "async";
    lbPicture.appendChild(lbImg);

    function lbUpdateImage() {
      var node = nodes[pos];
      var imgEl = node ? node.querySelector("img") : null;
      lbImg.alt = imgEl ? imgEl.alt : "Фото " + (index + 1);
      lbPicture.querySelectorAll("source").forEach(function (s) { s.remove(); });
      var sourceEl = node ? node.querySelector("picture source") : null;
      if (sourceEl && sourceEl.srcset) {
        var sup = document.createElement("source");
        sup.type = "image/webp";
        sup.srcset = sourceEl.srcset;
        lbPicture.insertBefore(sup, lbImg);
      }
      lbImg.src = imgEl ? imgEl.src : "";
      if (lbCurrent) lbCurrent.textContent = String(index + 1);
    }

    function lbClose() {
      if (!lbOpen) return;
      lbOpen = false;
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-locked");
      document.documentElement.classList.remove("is-locked");
      if (lbLastFocus && lbLastFocus.focus) lbLastFocus.focus();
      paused = root.matches(":hover");
    }

    function lbGo(dir) {
      go(dir);
      lbUpdateImage();
    }

    function openLightbox() {
      if (lbOpen) return;
      if (!nodes[pos]) return;
      if (nodes[pos].classList.contains("is-empty")) return;
      lbOpen = true;
      paused = true;
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
      document.documentElement.classList.add("is-locked");
      lbLastFocus = document.activeElement;
      lbUpdateImage();
      var closeBtn = lightbox.querySelector("[data-lightbox-close]");
      if (closeBtn && closeBtn.focus) closeBtn.focus();
    }

    lbFrame.addEventListener("click", function (e) {
      if (lbJustSwiped) { lbJustSwiped = false; return; }
      if (e.target === lbPicture || e.target === lbImg) return;
      lbClose();
    });

    var lbCloseBtns = lightbox.querySelectorAll("[data-lightbox-close]");
    lbCloseBtns.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (lbJustSwiped) { lbJustSwiped = false; return; }
        lbClose();
      });
    });

    var lbPrevBtn = lightbox.querySelector("[data-lightbox-prev]");
    var lbNextBtn = lightbox.querySelector("[data-lightbox-next]");
    if (lbPrevBtn) lbPrevBtn.addEventListener("click", function () { lbGo(-1); });
    if (lbNextBtn) lbNextBtn.addEventListener("click", function () { lbGo(1); });

    // Свайп в полноэкранном режиме: изображение следует за пальцем 1:1,
    // отпускание — инерционный долёт с въездом следующего кадра.
    // touch-action: none + запрет перетаскивания картинки не дают браузеру
    // превратить жест в скролл/драг.
    var lbDrag = null;
    var lbJustSwiped = false;
    var lbSettleTimer = null;

    lightbox.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.target.closest("button")) return;
      if (reduceMotion.matches) return;
      lbDrag = { x: e.clientX, y: e.clientY };
      if (lbSettleTimer) { window.clearTimeout(lbSettleTimer); lbSettleTimer = null; }
    });

    lightbox.addEventListener("pointermove", function (e) {
      if (!lbDrag) return;
      var dx = e.clientX - lbDrag.x;
      var dy = e.clientY - lbDrag.y;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { lbDrag = null; return; }
      var w = window.innerWidth;
      var k = Math.max(-0.85, Math.min(0.85, dx / w));
      lbImg.style.transition = "none";
      lbImg.style.transform = "translateX(" + (k * w).toFixed(1) + "px)";
    });

    function lbFlyOut(dir) {
      var w = window.innerWidth;
      lbImg.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
      lbImg.style.transform = "translateX(" + (-dir * w) + "px)";
      lbSettleTimer = window.setTimeout(function () {
        lbGo(dir);
        lbSettleTimer = null;
        lbImg.style.transition = "";
        lbImg.style.transform = "translateX(" + (dir * w) + "px)";
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            lbImg.style.transition = "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)";
            lbImg.style.transform = "translateX(0px)";
            lbSettleTimer = window.setTimeout(function () {
              lbImg.style.transition = "";
              lbSettleTimer = null;
            }, 380);
          });
        });
      }, 340);
    }

    function lbSpringBack() {
      lbImg.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
      lbImg.style.transform = "translateX(0px)";
      lbSettleTimer = window.setTimeout(function () {
        lbImg.style.transition = "";
        lbSettleTimer = null;
      }, 340);
    }

    lightbox.addEventListener("pointerup", function (e) {
      if (!lbDrag) return;
      var dx = e.clientX - lbDrag.x;
      lbDrag = null;
      var w = window.innerWidth;
      if (dx > w * 0.12) { lbJustSwiped = true; lbFlyOut(-1); }
      else if (dx < -w * 0.12) { lbJustSwiped = true; lbFlyOut(1); }
      else lbSpringBack();
    });

    lightbox.addEventListener("pointercancel", function () {
      if (!lbDrag) return;
      lbDrag = null;
      lbSpringBack();
    });

    // Клавиатура (глобально — фокус не обязан быть внутри лайтбокса)
    document.addEventListener("keydown", function (e) {
      if (!lbOpen) return;
      if (e.key === "Escape") { e.preventDefault(); lbClose(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); lbGo(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); lbGo(1); }
      else if (e.key === "Tab") {
        var focusables = lightbox.querySelectorAll("button");
        if (focusables.length) {
          var first = focusables[0];
          var last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    });
  }

  window.addEventListener("resize", function () { applyPose(true); });
}