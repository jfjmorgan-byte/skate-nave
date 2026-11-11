# PIXEL SKATE: LA NAVE

Juego de skate 2D en pixel art, ambientado en un skatepark dentro de una nave industrial.
Es un solo archivo HTML, sin librerías ni recursos externos: los sprites, el escenario, el sonido y la música se generan por código.

**▶ Jugar en el navegador:** https://jfjmorgan-byte.github.io/skate-nave/

También puedes descargar `pixel-skate.html` y abrirlo con doble clic.

## Qué tiene

- Pixel art de verdad: lienzo de 270 px de alto, paleta limitada, tramado Bayer y fuente propia de 3×5 con tildes y Ñ.
- Skater y tabla en vóxeles con render 3D (flips, giros de 180/360/540, grabs, manuals, grinds y caídas).
- Cuatro mapas, con hora del día (mañana, atardecer, noche):
  - **La Nave**: skatepark dentro de una nave de hormigón, con mini rampa, pirámide con barandilla y rampa grande,
    tubos fluorescentes, ventana con haz de luz y polvo, palomas y ventilador.
  - **El Skatepark**: exterior de hormigón con funbox y barandilla, ciudad, árboles y farolas.
  - **La Piscina**: piscina vacía en corte, con parte baja, parte honda, azulejos y coping de piedra.
  - **El Parking**: sótano con luz de sodio, rampas de madera, rampa de coches y coches aparcados.
- Drop in desde las plataformas, caminar fuera de la tabla y lip tricks en el coping.
- Revert, barra de special, «¡PERFECTO!», 20 retos con medallas, contrarreloj, vestidor y modo vídeo
  (repetición con filtros de móvil, VHS y ojo de pez).
- Teclado, mando y controles táctiles.

## Controles (teclado)

| Tecla | Acción |
| --- | --- |
| ↑ / ↓ | Empujar / frenar |
| ← / → | Backside / frontside: giros en el aire, kickturn arriba de una rampa |
| Shift | Bombear (mantenido) · revert al caer en una rampa · special con la barra llena |
| Espacio | Ollie (mantén para cargar) |
| A · D · S | Kickflip · heelflip · pop shove-it (A+S y D+S: varial; dos veces: doble) |
| W | Grab en el aire · manual en el suelo |
| W A S D al subir una rampa | Lip tricks en el coping |
| E | Bajarte o subirte a la tabla |
| P / Esc | Pausa (con repetición y mejor clip) · M silencia |

## Código

El juego se escribe por piezas en `src/` y se ensambla con:

```bash
sh src/build.sh
```

Eso genera `pixel-skate.html` e `index.html` (son el mismo archivo). `NOTAS-PROGRESO.md` recoge el historial de cambios.
