# Plan de diseño — Salón Irene Rodríguez

Identidad visual compartida por la web pública (`apps/web`) y la agenda de staff
(`apps/agenda`). Este documento es la referencia: cualquier color o fuente nueva
debe derivarse de aquí.

## Diagnóstico del punto de partida

La landing anterior acumulaba los clichés reconocibles de plantilla generada:
cursor personalizado con anillo, marquee horizontal, bento grid con emojis como
iconos (✂️ 🎨 💆), numeración 01/02/03 sin secuencia real, contadores animados
con cifras inventadas y `rounded-2xl` uniforme. Todo eso se elimina.

## Paleta — "Tocador"

Derivada del rosa arcilla y champán que ya usaba el salón, pero con más
profundidad. El rosa pasa de acento a **superficie** (secciones enteras), y el
champán queda reservado a filetes y detalles finos.

| Nombre     | Hex       | Uso |
|------------|-----------|-----|
| Porcelana  | `#faf3ee` | Fondo base (rubor cálido, no crema genérica) |
| Espresso   | `#2b211c` | Tinta: titulares, secciones oscuras, footer |
| Arcilla    | `#a87d6f` | Marca. Superficies grandes (banda de reserva), CTA |
| Rubor      | `#e9d3ca` | Arcilla pálida: fondos de tarjeta, arcos |
| Champán    | `#c29a5f` | Solo filetes, reglas finas y micro-detalles |
| Humo cálido| `#7d6e66` | Texto secundario (neutro con sesgo hacia arcilla, no gris puro) |

Estados semánticos de la agenda (separados del color de marca):
pendiente `#b98a2f` (ámbar), confirmada `#3f7d5c` (verde salvia),
completada `#5b6c8f` (azul pizarra), cancelada `#a94b44` (teja).

## Tipografía

- **Display: Fraunces** (400/600, itálica) — serif óptica con carácter, ejes
  suaves; usada con moderación en titulares y palabras en itálica.
- **Cuerpo: Outfit** (300–600) — geométrica cálida, ya presente en el proyecto.
- **Utilitaria**: Outfit en versalitas simuladas (uppercase + tracking amplio)
  para etiquetas, precios y datos.

## Layout

Editorial asimétrico con reglas finas (1px champán) separando secciones, cada
una encabezada por una etiqueta en versalitas. Sin bento, sin marquee, sin
cursor custom. La sección de servicios es una **carta de salón**: lista con
puntos conductores (nombre … precio), como la carta impresa de un salón real.

## Elemento firma: el arco de tocador

Las fotos importantes se enmascaran con un arco de medio punto
(`border-radius: 999px 999px 0 0`) — el arco del espejo de tocador de salón.
Aparece en el hero, la galería y los detalles; es el motivo que hace la marca
reconocible. Las fotos de stock actuales son provisionales (TODO: sustituir por
fotografía real del salón); el tratamiento en arco + filtro cálido las unifica
mientras tanto.

## Movimiento

Un solo sistema: revelado suave al hacer scroll (opacity + translateY 12px),
respetando `prefers-reduced-motion`. Nada de contadores, parallax ni cursores.

## Agenda (apps/agenda)

Misma paleta y fuentes. Los estados de cita usan chips con los colores
semánticos de arriba (nunca el rosa de marca). Los estados vacíos siempre
explican la acción siguiente ("Añade la primera ficha"), no solo constatan la
ausencia.
