"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Service } from "@/types/database";
import { GuestBookingForm } from "@/components/landing/GuestBookingForm";
import "@/app/landing.css";

interface LandingClientProps {
  services: Service[];
  user: User | null;
}

export function LandingClient({ services, user }: LandingClientProps) {
  // Comportamientos del demo: cursor, scroll de navbar, menú móvil,
  // reveals al hacer scroll, contadores animados y horario de hoy.
  useEffect(() => {
    const dot = document.getElementById("cursorDot");
    const ring = document.getElementById("cursorRing");
    let mx = 0,
      my = 0,
      rx = 0,
      ry = 0;
    let raf = 0;

    function onMove(e: MouseEvent) {
      mx = e.clientX;
      my = e.clientY;
      if (dot) {
        dot.style.left = mx + "px";
        dot.style.top = my + "px";
      }
    }
    document.addEventListener("mousemove", onMove);

    function animRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      if (ring) {
        ring.style.left = rx + "px";
        ring.style.top = ry + "px";
      }
      raf = requestAnimationFrame(animRing);
    }
    animRing();

    const hoverEls = document.querySelectorAll(
      ".landing a, .landing button, .bento-card, .testi-card, .g-item"
    );
    const enter = () => {
      if (!ring) return;
      ring.style.width = "56px";
      ring.style.height = "56px";
      ring.style.opacity = "0.3";
    };
    const leave = () => {
      if (!ring) return;
      ring.style.width = "36px";
      ring.style.height = "36px";
      ring.style.opacity = "0.5";
    };
    hoverEls.forEach((el) => {
      el.addEventListener("mouseenter", enter);
      el.addEventListener("mouseleave", leave);
    });

    // Navbar scroll
    const navbar = document.getElementById("navbar");
    function onScroll() {
      navbar?.classList.toggle("scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    // Hamburger
    const hamburger = document.getElementById("hamburger");
    const navLinks = document.getElementById("navLinks");
    function toggleMenu() {
      hamburger?.classList.toggle("active");
      navLinks?.classList.toggle("open");
    }
    hamburger?.addEventListener("click", toggleMenu);
    const linkEls = navLinks?.querySelectorAll("a") ?? [];
    const closeMenu = () => {
      hamburger?.classList.remove("active");
      navLinks?.classList.remove("open");
    };
    linkEls.forEach((a) => a.addEventListener("click", closeMenu));

    // Reveal on scroll
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

    // Animated counters
    function animateCounter(el: HTMLElement) {
      const target = parseInt(el.dataset.count ?? "0", 10);
      const duration = 1800;
      const stepMs = 16;
      const increment = target / (duration / stepMs);
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        const suffix =
          target >= 100 ? "+" : target === 5 ? "★" : target === 10 ? "+" : "";
        el.textContent = Math.floor(current) + suffix;
      }, stepMs);
    }
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target as HTMLElement);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    document
      .querySelectorAll("[data-count]")
      .forEach((el) => counterObserver.observe(el));

    // Highlight today's hours
    const days = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    const today = days[new Date().getDay()];
    document.querySelectorAll(".hours-row").forEach((row) => {
      const dayEl = row.querySelector(".hours-day");
      if (dayEl && dayEl.textContent?.trim() === today) {
        row.classList.add("today");
        dayEl.classList.add("bold");
      } else {
        row.classList.remove("today");
        dayEl?.classList.remove("bold");
      }
    });

    return () => {
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      hamburger?.removeEventListener("click", toggleMenu);
      linkEls.forEach((a) => a.removeEventListener("click", closeMenu));
      hoverEls.forEach((el) => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
      });
      revealObserver.disconnect();
      counterObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="landing">
      {/* Cursor */}
      <div className="cursor-dot" id="cursorDot" />
      <div className="cursor-ring" id="cursorRing" />

      {/* NAV */}
      <nav id="navbar">
        <a href="#inicio" className="nav-logo">
          Irene <em>Rodríguez</em>
        </a>
        <ul className="nav-links" id="navLinks">
          <li><a href="#servicios">Servicios</a></li>
          <li><a href="#nosotros">Nosotros</a></li>
          <li><a href="#galeria">Galería</a></li>
          <li><a href="#contacto">Contacto</a></li>
          <li>
            <Link href={user ? "/dashboard" : "/login"}>
              {user ? "Mi panel" : "Acceder"}
            </Link>
          </li>
          <li>
            <a href="#reserva" className="nav-cta">Reservar cita</a>
          </li>
        </ul>
        <button className="hamburger" id="hamburger" aria-label="Abrir menú">
          <span /><span /><span />
        </button>
      </nav>

      {/* HERO */}
      <section className="hero" id="inicio">
        <div className="hero-content">
          <div className="hero-kicker">
            <div className="hero-kicker-line" />
            <span>Salón unisex · Guadalajara</span>
          </div>
          <h1>
            El arte<br />de <em>cuidarte</em><br /><strong>bien.</strong>
          </h1>
          <p className="hero-desc">
            Más de diez años creando experiencias únicas de belleza. Cortes,
            color, tratamientos y estética con la atención personalizada que
            mereces.
          </p>
          <div className="hero-actions">
            <a href="#reserva" className="btn-dark">
              Reservar cita
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              >
                <path d="M2 7h10M8 3l4 4-4 4" />
              </svg>
            </a>
            <a href="#servicios" className="btn-ghost">Ver servicios</a>
          </div>
          <div className="hero-stats">
            <div>
              <div className="hero-stat-num" data-count="10">0</div>
              <div className="hero-stat-label">Años de experiencia</div>
            </div>
            <div>
              <div className="hero-stat-num" data-count="2000">0</div>
              <div className="hero-stat-label">Clientes felices</div>
            </div>
            <div>
              <div className="hero-stat-num" data-count="6">0</div>
              <div className="hero-stat-label">Servicios especializados</div>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <img
            className="hero-photo"
            src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85"
            alt="Peluquería profesional Irene Rodríguez"
            loading="eager"
          />
          <div className="hero-visual-bg" />
          <div className="hero-tag-float" style={{ zIndex: 4 }}>
            <div className="hero-tag-icon">⭐</div>
            <div className="hero-tag-text">
              <div className="tt">Valoración media</div>
              <div className="tv">5.0 en Google Maps</div>
            </div>
          </div>
          <div className="hero-scroll-cue">
            <div className="scroll-line" />
            <span>Scroll</span>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-strip">
        <div className="marquee-track">
          {[0, 1].flatMap((dup) =>
            [
              "Corte de cabello",
              "Color & mechas",
              "Tratamientos capilares",
              "Peinados y recogidos",
              "Barba y afeitado",
              "Estética facial",
              "Keratina",
              "Balayage",
              "Cejas y pestañas",
              "Servicio unisex",
            ].map((item) => (
              <span className="marquee-item" key={`${dup}-${item}`}>
                {item}
                <span className="marquee-dot" />
              </span>
            ))
          )}
        </div>
      </div>

      {/* ABOUT */}
      <section className="about" id="nosotros">
        <div className="about-visual-wrap">
          <div className="about-card-main">
            <div className="about-card-pattern">
              <svg viewBox="0 0 400 480" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <radialGradient id="rg1" cx="50%" cy="30%">
                    <stop offset="0%" stopColor="#c9a46c" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#c9a46c" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="200" cy="120" r="180" fill="url(#rg1)" />
                <path d="M0,240 Q100,180 200,240 Q300,300 400,240" stroke="rgba(201,164,108,0.3)" strokeWidth="1" fill="none" />
                <path d="M0,280 Q100,220 200,280 Q300,340 400,280" stroke="rgba(201,164,108,0.2)" strokeWidth="1" fill="none" />
                <path d="M0,320 Q100,260 200,320 Q300,380 400,320" stroke="rgba(201,164,108,0.15)" strokeWidth="1" fill="none" />
                <circle cx="320" cy="80" r="60" stroke="rgba(201,164,108,0.15)" strokeWidth="1" fill="none" />
                <circle cx="320" cy="80" r="90" stroke="rgba(201,164,108,0.08)" strokeWidth="1" fill="none" />
              </svg>
            </div>
            <div className="about-card-label">
              <div className="about-card-label-small">Nuestra filosofía</div>
              <div className="about-card-label-big">Belleza<br />con alma</div>
            </div>
          </div>
          <div className="about-badge">
            <span className="about-badge-num">+10</span>
            <span className="about-badge-text">años de experiencia</span>
          </div>
        </div>

        <div className="about-content reveal">
          <div className="section-label">
            <div className="section-label-line" />
            <span>Sobre nosotras</span>
          </div>
          <h2>
            Pasión por<br />la <em>belleza natural</em>
          </h2>
          <p>
            En el Salón de Belleza Irene Rodríguez llevamos más de diez años
            dedicándonos en cuerpo y alma a realzar la belleza de cada persona
            que cruza nuestra puerta. No hay dos clientes iguales — por eso cada
            servicio es completamente personalizado.
          </p>
          <p>
            Trabajamos solo con productos de primera calidad y nos formamos
            continuamente para ofrecerte las técnicas más actuales. Hombres,
            mujeres, toda la familia.
          </p>
          <div className="about-checklist">
            {[
              "Profesionales especializadas",
              "Productos de alta calidad",
              "Ambiente cálido y acogedor",
              "Servicio unisex",
              "Trato completamente personalizado",
              "Técnicas y tendencias actuales",
            ].map((item) => (
              <span className="check-item" key={item}>
                <span className="check-bullet">
                  <svg viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="services" id="servicios">
        <div className="services-head reveal">
          <div>
            <div className="section-label" style={{ marginBottom: "0.8rem" }}>
              <div className="section-label-line" />
              <span>Lo que hacemos</span>
            </div>
            <h2>
              Todo lo que<br />necesitas en<br /><em>un solo lugar</em>
            </h2>
          </div>
          <p className="services-head-desc">
            Una gama completa de servicios para que salgas sintiéndote en tu
            mejor versión, cada vez.
          </p>
        </div>

        <div className="bento">
          <div className="bento-card featured reveal reveal-delay-1">
            <span className="bento-num">01</span>
            <div className="bento-icon">✂️</div>
            <h3>Corte de cabello</h3>
            <p>
              Cortes modernos y clásicos para hombre y mujer. Adaptados a tu
              tipo de cabello, estructura facial y estilo de vida.
            </p>
            <div className="bento-card-arrow">
              <svg viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
            </div>
          </div>
          <div className="bento-card reveal reveal-delay-2">
            <span className="bento-num">02</span>
            <div className="bento-icon">🎨</div>
            <h3>Color y mechas</h3>
            <p>Tintes, balayage, highlights y técnicas de coloración de última generación.</p>
            <div className="bento-card-arrow">
              <svg viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
            </div>
          </div>
          <div className="bento-card reveal reveal-delay-3">
            <span className="bento-num">03</span>
            <div className="bento-icon">💆</div>
            <h3>Tratamientos</h3>
            <p>Hidratación, keratina y nutrición. Le devolvemos la vida a tu cabello.</p>
            <div className="bento-card-arrow">
              <svg viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
            </div>
          </div>
          <div className="bento-card wide reveal reveal-delay-1">
            <span className="bento-num">04</span>
            <div className="bento-icon">💅</div>
            <h3>Peinados y recogidos</h3>
            <p>
              Peinados para bodas, comuniones y eventos especiales. También
              alisados permanentes y rizados de larga duración.
            </p>
            <div className="bento-card-arrow">
              <svg viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
            </div>
          </div>
          <div className="bento-card reveal reveal-delay-2">
            <span className="bento-num">05</span>
            <div className="bento-icon">🪒</div>
            <h3>Barba y afeitado</h3>
            <p>Perfilado y arreglo de barba con acabados de precisión para el caballero moderno.</p>
            <div className="bento-card-arrow">
              <svg viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
            </div>
          </div>
          <div className="bento-card reveal reveal-delay-1">
            <span className="bento-num">06</span>
            <div className="bento-icon">✨</div>
            <h3>Estética facial</h3>
            <p>Diseño de cejas, depilación con hilo y tratamientos faciales complementarios.</p>
            <div className="bento-card-arrow">
              <svg viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="stats-bar">
        <div className="stat-item reveal">
          <span className="stat-num" data-count="10">0</span>
          <span className="stat-label">Años en el sector</span>
        </div>
        <div className="stat-item reveal reveal-delay-1">
          <span className="stat-num" data-count="2000">0</span>
          <span className="stat-label">Clientes atendidos</span>
        </div>
        <div className="stat-item reveal reveal-delay-2">
          <span className="stat-num" data-count="6">0</span>
          <span className="stat-label">Servicios especializados</span>
        </div>
        <div className="stat-item reveal reveal-delay-3">
          <span className="stat-num" data-count="5">0</span>
          <span className="stat-label">Estrellas en Google</span>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="testimonials-head reveal">
          <div className="section-label" style={{ justifyContent: "center" }}>
            <div className="section-label-line" />
            <span>Opiniones</span>
          </div>
          <h2>
            Lo que dicen<br />nuestras <em>clientas</em>
          </h2>
        </div>

        <div className="testimonials-grid">
          <div className="testi-card reveal reveal-delay-1">
            <div className="testi-stars">
              {"★★★★★".split("").map((s, i) => (
                <span className="star" key={i}>{s}</span>
              ))}
            </div>
            <p className="testi-quote">
              &ldquo;Llevo cinco años viniendo a Irene y jamás he salido
              decepcionada. Cada vez que necesito un cambio de look ella sabe
              exactamente lo que necesito, incluso mejor que yo misma.&rdquo;
            </p>
            <div className="testi-author">
              <div className="testi-avatar testi-avatar-a">ML</div>
              <div>
                <div className="testi-name">María López</div>
                <div className="testi-when">Clienta habitual · hace 2 semanas</div>
              </div>
            </div>
          </div>

          <div className="testi-card accent-card reveal reveal-delay-2">
            <div className="testi-stars">
              {"★★★★★".split("").map((s, i) => (
                <span className="star" key={i}>{s}</span>
              ))}
            </div>
            <p className="testi-quote">
              &ldquo;Fui para el balayage de mi boda y quedé absolutamente
              maravillada. Irene se aseguró de que todo fuera perfecto hasta el
              último detalle. ¡Repetiré seguro!&rdquo;
            </p>
            <div className="testi-author">
              <div className="testi-avatar testi-avatar-c">SG</div>
              <div>
                <div className="testi-name">Sara García</div>
                <div className="testi-when">Servicio para boda · hace 1 mes</div>
              </div>
            </div>
          </div>

          <div className="testi-card reveal reveal-delay-3">
            <div className="testi-stars">
              {"★★★★★".split("").map((s, i) => (
                <span className="star" key={i}>{s}</span>
              ))}
            </div>
            <p className="testi-quote">
              &ldquo;El mejor corte de barba que me han hecho en Guadalajara. Un
              ambiente muy acogedor, atención impecable y resultados excelentes.
              Ya no voy a otro sitio.&rdquo;
            </p>
            <div className="testi-author">
              <div className="testi-avatar testi-avatar-b">JM</div>
              <div>
                <div className="testi-name">Javier Moreno</div>
                <div className="testi-when">Corte y barba · hace 3 semanas</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="gallery" id="galeria">
        <div className="gallery-head reveal">
          <div>
            <div className="section-label" style={{ marginBottom: "0.8rem" }}>
              <div className="section-label-line" style={{ background: "var(--gold)" }} />
              <span style={{ color: "var(--gold)" }}>Galería</span>
            </div>
            <h2>
              Nuestro trabajo<br />habla por sí <em>solo</em>
            </h2>
          </div>
          <p className="gallery-head-note">
            Resultados reales,<br />clientes de verdad.
          </p>
        </div>

        <div className="gallery-masonry">
          {[
            ["https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80", "Coloración & mechas"],
            ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80", "Corte moderno"],
            ["https://images.unsplash.com/photo-1487412947147-5cebf100d293?auto=format&fit=crop&w=600&q=80", "Tratamiento capilar"],
            ["https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=800&q=80", "Balayage natural"],
            ["https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80", "Recogido para evento"],
            ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80", "Corte masculino"],
            ["https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=600&q=80", "Estética facial"],
          ].map(([src, label]) => (
            <div className="g-item" key={label}>
              <div className="g-inner">
                <img src={src} alt={label} loading="lazy" />
              </div>
              <div className="g-art-overlay">
                <span>{label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section className="contact" id="contacto">
        <div className="contact-info-side reveal">
          <div className="section-label" style={{ marginBottom: "1.2rem" }}>
            <div className="section-label-line" />
            <span>Encuéntranos</span>
          </div>
          <h2>
            Ven a visitarnos<br />o reserva tu <em>cita</em>
          </h2>
          <p>
            Estamos en Guadalajara y encantadas de atenderte. Llámanos, pásate
            por el salón o reserva tu cita online.
          </p>

          <div className="info-blocks">
            <div className="info-block">
              <div className="info-block-icon">📍</div>
              <div>
                <div className="info-block-label">Dirección</div>
                <div className="info-block-value">Guadalajara, España</div>
              </div>
            </div>
            <div className="info-block">
              <div className="info-block-icon">📞</div>
              <div>
                <div className="info-block-label">Teléfono</div>
                <div className="info-block-value">Consultar en Google Maps</div>
              </div>
            </div>
            <div className="info-block">
              <div className="info-block-icon">📸</div>
              <div>
                <div className="info-block-label">Instagram</div>
                <div className="info-block-value">@irenesalon · síguenos</div>
              </div>
            </div>
          </div>

          <div className="hours-table" style={{ marginTop: "2rem" }}>
            {[
              ["Lunes", "9:00 – 20:00"],
              ["Martes", "9:00 – 20:00"],
              ["Miércoles", "9:00 – 20:00"],
              ["Jueves", "9:00 – 20:00"],
              ["Viernes", "9:00 – 20:00"],
              ["Sábado", "9:00 – 14:00"],
              ["Domingo", "Cerrado"],
            ].map(([day, time]) => (
              <div className="hours-row" key={day}>
                <span className="hours-day">{day}</span>
                {time === "Cerrado" ? (
                  <span className="hours-closed">Cerrado</span>
                ) : (
                  <span className="hours-time">{time}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <GuestBookingForm services={services} user={user} />
      </section>

      {/* MAP */}
      <div className="map-wrap">
        <div className="map-pill">Salón Irene Rodríguez · Guadalajara</div>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3032!2d-3.1580604!3d40.6370101!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd43ab182c2218ab%3A0xce689ce442787ae6!2zU2Fsw7NuIGRlIGJlbGxlemEgdW5pc2V4IElyZW5lIFJvZHJpZ3Vleg!5e0!3m2!1ses!2ses!4v1719219600000!5m2!1ses!2ses"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ubicación del salón Irene Rodríguez"
        />
      </div>

      {/* FOOTER */}
      <footer>
        <div className="footer-top">
          <div>
            <a href="#inicio" className="footer-brand-logo">
              Irene <em>Rodríguez</em>
            </a>
            <p className="footer-tagline">
              Tu salón de confianza en Guadalajara. Más de diez años cuidando de
              ti con la profesionalidad y calidez que mereces.
            </p>
            <div className="footer-socials">
              <a href="#" className="soc-btn" title="Facebook">f</a>
              <a href="#" className="soc-btn" title="Instagram">ig</a>
              <a
                href="https://wa.me/34000000000"
                className="soc-btn"
                title="WhatsApp"
                target="_blank"
                rel="noopener noreferrer"
              >
                wa
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Servicios</h4>
            <ul>
              <li><a href="#servicios">Corte de cabello</a></li>
              <li><a href="#servicios">Color y mechas</a></li>
              <li><a href="#servicios">Tratamientos</a></li>
              <li><a href="#servicios">Peinados</a></li>
              <li><a href="#servicios">Barba y afeitado</a></li>
              <li><a href="#servicios">Estética facial</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Información</h4>
            <ul>
              <li><a href="#nosotros">Sobre nosotras</a></li>
              <li><a href="#galeria">Galería</a></li>
              <li><a href="#contacto">Contacto</a></li>
              <li><a href="#reserva">Reservar cita</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Salón de Belleza Unisex Irene Rodríguez ·
            Guadalajara · Todos los derechos reservados
          </span>
          <span>Hecho con ♥</span>
        </div>
      </footer>

      {/* WHATSAPP FLOAT */}
      <a
        href="https://wa.me/34000000000"
        className="wa-float"
        title="Escríbenos por WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
