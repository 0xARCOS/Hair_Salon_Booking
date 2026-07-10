"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect } from "react";
import type { Service } from "@irene/supabase";
import { ServiceList } from "@/components/landing/ServiceList";
import "@/app/landing.css";

// TODO: reemplazar con los datos reales del negocio antes de publicar.
const PHONE_DISPLAY = "+52 33 0000 0000";
const PHONE_TEL = "+523300000000";
const WHATSAPP_NUMBER = "523300000000"; // formato wa.me: solo dígitos, sin '+'
const WHATSAPP_MESSAGE = "Hola, me gustaría reservar una cita en Irene Hair Salon.";
const ADDRESS = "Av. Ejemplo 123, Guadalajara, Jalisco, México"; // TODO: dirección real
const GOOGLE_MAPS_REVIEWS_URL = "https://www.google.com/maps"; // TODO: link al perfil real de Google Business

// TODO: sustituir por fotografía real del salón. El tratamiento en arco y el
// filtro cálido (ver landing.css) unifican las provisionales mientras tanto.
const PHOTOS = {
  hero: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=85",
  about: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80",
  gallery: [
    ["https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=700&q=80", "Coloración y mechas"],
    ["https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?auto=format&fit=crop&w=700&q=80", "Balayage natural"],
    ["https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=700&q=80", "Recogido para evento"],
    ["https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=700&q=80", "Corte masculino"],
  ] as const,
};

const HOURS: ReadonlyArray<readonly [string, string]> = [
  ["Lunes", "9:00 – 20:00"],
  ["Martes", "9:00 – 20:00"],
  ["Miércoles", "9:00 – 20:00"],
  ["Jueves", "9:00 – 20:00"],
  ["Viernes", "9:00 – 20:00"],
  ["Sábado", "9:00 – 14:00"],
  ["Domingo", "Cerrado"],
];

// TODO: sustituir por reseñas reales copiadas del perfil de Google Business.
const REVIEWS = [
  {
    quote:
      "Llevo cinco años viniendo a Irene y jamás he salido decepcionada. Cada vez que necesito un cambio de look ella sabe exactamente lo que necesito, incluso mejor que yo misma.",
    name: "María López",
    context: "Clienta habitual",
  },
  {
    quote:
      "Fui para el balayage de mi boda y quedé absolutamente maravillada. Irene se aseguró de que todo fuera perfecto hasta el último detalle.",
    name: "Sara García",
    context: "Servicio para boda",
  },
  {
    quote:
      "El mejor corte de barba que me han hecho en Guadalajara. Ambiente acogedor, atención impecable. Ya no voy a otro sitio.",
    name: "Javier Moreno",
    context: "Corte y barba",
  },
];

function IconPin() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 18s6-5.2 6-9.5A6 6 0 0 0 4 8.5C4 12.8 10 18 10 18Z" />
      <circle cx="10" cy="8.5" r="2" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 3h3l1.5 4L6.8 8.6a11 11 0 0 0 4.6 4.6L13 11.5l4 1.5v3a1.5 1.5 0 0 1-1.6 1.5C8.6 17 3 11.4 2.5 4.6A1.5 1.5 0 0 1 4 3Z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="14" height="14" rx="4" />
      <circle cx="10" cy="10" r="3.2" />
      <circle cx="14.2" cy="5.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface LandingClientProps {
  services: Service[];
}

export function LandingClient({ services }: LandingClientProps) {
  // Comportamiento mínimo: navbar al hacer scroll, menú móvil, revelado
  // suave de secciones y resaltar el horario de hoy.
  useEffect(() => {
    const navbar = document.getElementById("navbar");
    function onScroll() {
      navbar?.classList.toggle("scrolled", window.scrollY > 40);
    }
    window.addEventListener("scroll", onScroll, { passive: true });

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

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealEls = document.querySelectorAll(".reveal");
    let revealObserver: IntersectionObserver | undefined;
    if (reduceMotion) {
      revealEls.forEach((el) => el.classList.add("in-view"));
    } else {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              revealObserver?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );
      revealEls.forEach((el) => revealObserver?.observe(el));
    }

    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const today = days[new Date().getDay()];
    document.querySelectorAll(".hours-row").forEach((row) => {
      const dayEl = row.querySelector(".hours-day");
      row.classList.toggle("today", dayEl?.textContent?.trim() === today);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      hamburger?.removeEventListener("click", toggleMenu);
      linkEls.forEach((a) => a.removeEventListener("click", closeMenu));
      revealObserver?.disconnect();
    };
  }, []);

  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <div className="landing">
      {/* NAV */}
      <nav id="navbar">
        <a href="#inicio" className="nav-logo">
          Irene <em>Rodríguez</em>
        </a>
        <ul className="nav-links" id="navLinks">
          <li><a href="#servicios">La carta</a></li>
          <li><a href="#nosotros">El salón</a></li>
          <li><a href="#galeria">Trabajos</a></li>
          <li><a href="#contacto">Visítanos</a></li>
          <li>
            <a href={`tel:${PHONE_TEL}`} className="nav-cta">Llamar y reservar</a>
          </li>
        </ul>
        <button className="hamburger" id="hamburger" aria-label="Abrir menú">
          <span /><span /><span />
        </button>
      </nav>

      {/* HERO */}
      <header className="hero" id="inicio">
        <div className="hero-content">
          <p className="eyebrow">Salón de belleza unisex · Guadalajara</p>
          <h1>
            Tu pelo,<br />en <em>buenas</em><br />manos.
          </h1>
          <p className="hero-desc">
            Corte, color, tratamientos y estética con más de diez años de
            oficio. Sin reservas online: nos llamas, te escuchamos y te damos
            hora — así empezamos a conocerte antes de que te sientes.
          </p>
          <div className="hero-actions">
            <a href={`tel:${PHONE_TEL}`} className="btn-solid">Llamar y reservar</a>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-line">
              Escribir por WhatsApp
            </a>
          </div>
          <p className="hero-phone">
            <span>Atendemos el teléfono en horario del salón</span>
            <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
          </p>
        </div>

        <figure className="hero-visual">
          <div className="arch arch-hero">
            <img src={PHOTOS.hero} alt="Interior del salón Irene Rodríguez" loading="eager" />
          </div>
          <div className="arch-outline" aria-hidden />
          <figcaption>El salón, un martes por la mañana</figcaption>
        </figure>
      </header>

      {/* EL SALÓN */}
      <section className="about" id="nosotros">
        <p className="section-label reveal">El salón</p>
        <div className="about-grid">
          <figure className="about-visual reveal">
            <div className="arch arch-small">
              <img src={PHOTOS.about} alt="Trabajando el color en el salón" loading="lazy" />
            </div>
            <figcaption>Diez años de oficio, formación constante</figcaption>
          </figure>
          <div className="about-content reveal">
            <h2>
              No hay dos cabezas <em>iguales</em>
            </h2>
            <p>
              En el Salón Irene Rodríguez llevamos más de diez años realzando la
              belleza de cada persona que cruza la puerta. Cada servicio se
              decide contigo, delante del espejo — no en un catálogo.
            </p>
            <p>
              Trabajamos solo con productos de primera calidad y nos formamos
              continuamente en las técnicas más actuales. Hombres, mujeres,
              toda la familia.
            </p>
            <ul className="about-list">
              {[
                "Profesionales especializadas",
                "Productos de alta calidad",
                "Servicio unisex, toda la familia",
                "Trato completamente personalizado",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* LA CARTA */}
      <section className="services" id="servicios">
        <p className="section-label reveal">La carta</p>
        <div className="services-head reveal">
          <h2>
            Servicios y <em>precios</em>
          </h2>
          <p>
            Precios orientativos: el precio final se confirma contigo por
            teléfono según largo, estado del cabello y técnica.
          </p>
        </div>
        <ServiceList services={services} />
        <p className="services-note reveal">
          ¿No ves lo que buscas? Llámanos — casi seguro que lo hacemos.
        </p>
      </section>

      {/* BANDA DE RESERVA */}
      <section className="booking-band">
        <div className="booking-band-inner reveal">
          <h2>
            Se reserva <em>hablando</em>
          </h2>
          <p>
            No hay agenda online a propósito: una llamada de dos minutos nos
            deja prepararte el hueco, el producto y la silla adecuados.
          </p>
          <div className="booking-band-actions">
            <a href={`tel:${PHONE_TEL}`} className="btn-cream">
              {PHONE_DISPLAY}
            </a>
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-cream-line">
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* OPINIONES */}
      <section className="reviews">
        <p className="section-label reveal">Opiniones de Google</p>
        <div className="reviews-list">
          {REVIEWS.map((r) => (
            <blockquote className="review reveal" key={r.name}>
              <p>&ldquo;{r.quote}&rdquo;</p>
              <footer>
                <cite>{r.name}</cite>
                <span>{r.context} · ★★★★★</span>
              </footer>
            </blockquote>
          ))}
        </div>
        <div className="reviews-cta reveal">
          <a href={GOOGLE_MAPS_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="btn-line">
            Ver todas las reseñas en Google
          </a>
        </div>
      </section>

      {/* TRABAJOS */}
      <section className="gallery" id="galeria">
        <p className="section-label reveal">Trabajos</p>
        <div className="gallery-head reveal">
          <h2>
            Salidos de <em>estas sillas</em>
          </h2>
        </div>
        <div className="gallery-grid">
          {PHOTOS.gallery.map(([src, label], i) => (
            <figure className={`gallery-item reveal ${i % 2 === 1 ? "raised" : ""}`} key={label}>
              <div className="arch arch-gallery">
                <img src={src} alt={label} loading="lazy" />
              </div>
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* VISÍTANOS */}
      <section className="contact" id="contacto">
        <p className="section-label reveal">Visítanos</p>
        <div className="contact-grid">
          <div className="contact-info reveal">
            <h2>
              Te esperamos en <em>Guadalajara</em>
            </h2>
            <ul className="info-list">
              <li>
                <span className="info-icon"><IconPin /></span>
                <div>
                  <span className="info-label">Dirección</span>
                  <span className="info-value">{ADDRESS}</span>
                </div>
              </li>
              <li>
                <span className="info-icon"><IconPhone /></span>
                <div>
                  <span className="info-label">Teléfono y WhatsApp</span>
                  <span className="info-value">
                    <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
                  </span>
                </div>
              </li>
              <li>
                <span className="info-icon"><IconInstagram /></span>
                <div>
                  <span className="info-label">Instagram</span>
                  <span className="info-value">@irenesalon</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="hours-card reveal">
            <h3>Horario</h3>
            <div className="hours-table">
              {HOURS.map(([day, time]) => (
                <div className="hours-row" key={day}>
                  <span className="hours-day">{day}</span>
                  <span className={time === "Cerrado" ? "hours-closed" : "hours-time"}>
                    {time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MAPA */}
      {/* TODO: reemplazar por el embed real del salón (Google Maps → Compartir → Insertar un mapa) */}
      <div className="map-wrap">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3733.0!2d-103.3475!3d20.6767!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjDCsDQwJzM2LjEiTiAxMDPCsDIwJzUxLjAiVw!5e0!3m2!1ses!2smx!4v1719219600000!5m2!1ses!2smx"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ubicación del salón Irene Rodríguez en Guadalajara, México"
        />
      </div>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-inner">
          <a href="#inicio" className="footer-logo">
            Irene <em>Rodríguez</em>
          </a>
          <nav className="footer-nav" aria-label="Pie de página">
            <a href="#servicios">La carta</a>
            <a href="#nosotros">El salón</a>
            <a href="#galeria">Trabajos</a>
            <a href="#contacto">Visítanos</a>
          </nav>
          <p className="footer-legal">
            © {new Date().getFullYear()} Salón de Belleza Unisex Irene Rodríguez · Guadalajara
          </p>
        </div>
      </footer>

      {/* WHATSAPP FLOAT */}
      <a
        href={waHref}
        className="wa-float"
        title="Escríbenos por WhatsApp"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
