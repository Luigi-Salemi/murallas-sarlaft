/* ============================================================
   Murallas · Consultoría SARLAFT — interacciones del sitio
   ============================================================ */
(function () {
  "use strict";

  /* ---- Año dinámico en el pie de página ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Menú móvil ---- */
  var toggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("open");
      toggle.classList.toggle("open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    });
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("open");
        toggle.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Revelado al hacer scroll ---- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---- Validación del formulario de contacto ---- */
  var form = document.getElementById("contactForm");
  var status = document.getElementById("formStatus");

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;

      var required = form.querySelectorAll("[required]");
      required.forEach(function (input) {
        var field = input.closest(".field");
        var ok = input.value.trim() !== "";
        if (input.type === "email") ok = ok && isEmail(input.value.trim());
        if (field) field.classList.toggle("invalid", !ok);
        if (!ok) valid = false;
      });

      if (!valid) {
        status.textContent =
          "Por favor complete los campos obligatorios con información válida.";
        status.className = "form-status err";
        return;
      }

      status.textContent =
        "Gracias por su mensaje. Un consultor se comunicará con usted dentro de las próximas 24 horas hábiles.";
      status.className = "form-status ok";
      form.reset();
    });

    /* Limpia el estado de error al escribir */
    form.querySelectorAll("input, select, textarea").forEach(function (input) {
      input.addEventListener("input", function () {
        var field = input.closest(".field");
        if (field) field.classList.remove("invalid");
      });
    });
  }
})();
