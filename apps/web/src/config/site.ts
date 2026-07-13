// URL canónica del sitio público. En Netlify conviene definir
// NEXT_PUBLIC_SITE_URL con el dominio final (propio o *.netlify.app);
// el fallback es el subdominio actual del deploy de este proyecto.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://irene-rodriguez-unisex.netlify.app"
).replace(/\/$/, "");
