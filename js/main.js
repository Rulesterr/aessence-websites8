/* ============================================================
   Aessence — site interactions
   ============================================================ */
(function () {
  "use strict";

  // Current year in footers
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Mobile nav toggle
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Header shadow on scroll
  var header = document.querySelector("[data-header]");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Scroll reveal
  var revealables = document.querySelectorAll(
    ".feature, .value, .product-card, .split-text, .prose p"
  );
  revealables.forEach(function (el) {
    el.setAttribute("data-reveal", "");
  });

  if ("IntersectionObserver" in window && revealables.length) {
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
    revealables.forEach(function (el) {
      io.observe(el);
    });
  } else {
    revealables.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  // Product catalogue (rendered client-side so it's easy to edit in one place)
  var products = [
    {
      name: "Calm Botanical Oil",
      desc: "A weightless blend of jojoba and chamomile for evening wind-downs.",
      price: "$38",
    },
    {
      name: "Clarity Facial Mist",
      desc: "Witch hazel and neroli to reset and refresh between moments.",
      price: "$26",
    },
    {
      name: "Restore Hand Balm",
      desc: "Shea and calendula for hands that work hard all day.",
      price: "$22",
    },
    {
      name: "Grounding Bath Soak",
      desc: "Mineral salts and cedar for a slow, deliberate soak.",
      price: "$30",
    },
  ];

  var grid = document.querySelector("[data-products]");
  if (grid) {
    var frag = document.createDocumentFragment();
    products.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "product-card";
      card.innerHTML =
        '<div class="product-thumb" aria-hidden="true"></div>' +
        '<div class="product-body">' +
        "<h3>" + p.name + "</h3>" +
        '<p class="product-desc">' + p.desc + "</p>" +
        '<span class="product-price">' + p.price + "</span>" +
        "</div>";
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  // Contact form — client-side validation (no backend)
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var status = form.querySelector("[data-form-status]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll("input, textarea");
      var valid = true;

      fields.forEach(function (field) {
        var ok = field.checkValidity();
        field.setAttribute("aria-invalid", String(!ok));
        if (!ok) valid = false;
      });

      if (!valid) {
        status.textContent = "Please fill in all fields with a valid email.";
        status.className = "form-status error";
        return;
      }

      status.textContent = "Thanks — your message is on its way. We'll be in touch soon.";
      status.className = "form-status success";
      form.reset();
      fields.forEach(function (field) {
        field.removeAttribute("aria-invalid");
      });
    });
  }
})();
