/* ============================================================
   Mojtaba — resume site · vanilla JS
   - Theme toggle (persisted, respects system preference)
   - Mobile nav
   - Scroll reveal (IntersectionObserver, reduced-motion aware)
   - Footer year
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Theme ---- */
  var toggle = document.getElementById("theme-toggle");
  var stored = null;
  try { stored = localStorage.getItem("theme"); } catch (e) {}

  if (!stored) {
    stored = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  applyTheme(stored);

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  /* ---- Mobile nav ---- */
  var nav = document.querySelector(".nav");
  var navToggle = document.querySelector(".nav__toggle");
  var navMenu = document.getElementById("nav-menu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      var open = navMenu.classList.toggle("is-open");
      nav.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navMenu.classList.remove("is-open");
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Scroll reveal ---- */
  var animated = document.querySelectorAll(".section");
  animated.forEach(function (el) { el.setAttribute("data-animate", ""); });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    animated.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    animated.forEach(function (el) { io.observe(el); });
  }

  /* ---- Blog teaser ----
     Reads the JSON feed the blog build already publishes. Progressive
     enhancement: if the fetch fails (offline, file://, blog not built yet) the
     section keeps its static "Read the blog" call to action and nothing else
     changes. */
  var writingList = document.getElementById("writing-list");
  if (writingList && window.fetch) {
    fetch("/blog/feed.json")
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        return response.json();
      })
      .then(function (feed) {
        (feed.items || []).slice(0, 3).forEach(function (item) {
          var li = document.createElement("li");
          li.className = "writing__item";

          var meta = document.createElement("p");
          meta.className = "writing__meta";
          var extra = item._blog || {};
          var type = document.createElement("span");
          type.className = "writing__type";
          type.textContent = extra.type_label || extra.type || "Post";
          meta.appendChild(type);

          var when = new Date(item.date_published);
          if (!isNaN(when)) {
            var time = document.createElement("time");
            time.dateTime = item.date_published;
            time.textContent = when.toLocaleDateString("en-GB", {
              day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
            });
            meta.appendChild(document.createTextNode(" · "));
            meta.appendChild(time);
          }

          var title = document.createElement("h3");
          title.className = "writing__title";
          var link = document.createElement("a");
          // JSON Feed urls are absolute by spec; use the path so the link stays
          // on whatever host is serving this page (localhost included).
          link.href = extra.path || item.url;
          link.textContent = item.title;
          link.dir = "auto"; // titles may be Persian
          title.appendChild(link);

          var desc = document.createElement("p");
          desc.className = "writing__desc";
          desc.textContent = item.summary || "";
          desc.dir = "auto";

          li.appendChild(meta);
          li.appendChild(title);
          li.appendChild(desc);
          writingList.appendChild(li);
        });
      })
      .catch(function () { /* static CTA already covers this case */ });
  }

  /* ---- Footer year ---- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
