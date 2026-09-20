(function () {
  var CONFIG = window.SUPABASE_COMMENTS_CONFIG;
  if (!CONFIG || !CONFIG.url || !CONFIG.anonKey) return;
  if (CONFIG.url.startsWith("YOUR") || CONFIG.anonKey.startsWith("YOUR")) return;

  var client = window.supabase.createClient(CONFIG.url, CONFIG.anonKey);

  var form = document.querySelector("[data-comments-form]");
  var listEl = document.querySelector("[data-comments-list]");
  var statusEl = document.querySelector("[data-comments-status]");
  if (!form || !listEl) return;

  function esc(str) {
    var d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit", month: "long", year: "numeric"
    });
  }

  function render(items) {
    listEl.innerHTML = "";
    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "comments__empty";
      empty.textContent = "Пока комментариев нет. Будьте первым, кто поделится воспоминанием.";
      listEl.appendChild(empty);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "comment";
      var meta = document.createElement("div");
      meta.className = "comment__meta";
      var name = document.createElement("span");
      name.className = "comment__name";
      name.textContent = item.name;
      var date = document.createElement("span");
      date.className = "comment__date";
      date.textContent = formatDate(item.created_at);
      meta.appendChild(name);
      meta.appendChild(date);
      var text = document.createElement("p");
      text.className = "comment__text";
      text.textContent = item.text;
      li.appendChild(meta);
      li.appendChild(text);
      listEl.appendChild(li);
    });
  }

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", !!isError);
  }

  function load() {
    client
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(function (res) {
        if (res.error) { console.error("comments load:", res.error); return; }
        render(res.data || []);
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nameInput = form.querySelector("[name=\"name\"]");
    var textInput = form.querySelector("[name=\"text\"]");
    var name = (nameInput.value || "").trim();
    var text = (textInput.value || "").trim();
    if (!name || !text) { setStatus("Заполните имя и текст комментария.", true); return; }
    var btn = form.querySelector(".comments__submit");
    btn.disabled = true;
    setStatus("Отправляем…");
    client
      .from("comments")
      .insert({
        name: name,
        text: text,
        status: "approved"
      })
      .then(function (res) {
        btn.disabled = false;
        if (res.error) {
          setStatus("Не удалось отправить: " + (res.error.message || "ошибка сервера."), true);
          return;
        }
        nameInput.value = "";
        textInput.value = "";
        setStatus("Спасибо! Комментарий опубликован.");
        load();
      });
  });

  load();
})();