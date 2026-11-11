# PIXEL SKATE: LA NAVE — estado del trabajo (9-nov-2026)

## Qué hay
- `pixel-skate.html`: el juego ensamblado (≈2.980 líneas, un solo archivo, sin recursos externos).
- `src/`: las piezas. **Editar aquí y reconstruir** con `sh src/build.sh` (genera `../pixel-skate.html`).
  - `p0_head.html` cabecera · `p1_core.js` lienzo, paleta, Bayer, fuente 3x5, entrada
  - `p2_voxel.js` render de vóxeles, cuerpo, tabla (ruedas cilíndricas), ropa, tablas y ruedas
  - `p3_level.js` geometría y capas pre-renderizadas (valla fina cuando el skater pasa detrás)
  - `p4_player.js` física, trucos, grind, manual, caídas (delante/atrás/lado), combos, poses
  - `p7_extras.js` partículas, marcas de frenada, caminar, subir a plataformas, drop in, lip tricks
  - `p5_audio.js` sonido y música lo-fi
  - `p6a_meta.js` guardado (v2, migra la v1), 20 retos con medallas, contrarreloj, menús, vestidor
  - `p6b_draw.js` HUD, pantallas, bucle a 60 fps, ganchos de prueba (`window.update/render/PS`)
- Servidor de prueba: `.claude/launch.json` → «pixel-skate» (puerto 8765).

## Hecho y probado en el navegador (sesión del 9-nov)
- Bombeo arreglado: con buen bombeo, aires de ~2 m en la rampa grande; techo de 2,2 m en la mini y 4 m en la grande.
  La pirámide ya no lanza al skater salvo a más de 320 px/s.
- Drop in desde las dos plataformas; bajarse de la tabla (E), caminar, subir a la plataforma (↑) y bajar (↓).
- Lip tricks en el coping: W Coping 50-50 (se desliza a lo largo del coping), A Rock to Fakie, D Rock 'n' Roll, S Nose Stall.
- Ruedas redondas que giran, chispas en grinds, polvo al aterrizar/empujar/caer, marcas de frenada persistentes.
- Skater más expresivo: brazos al empujar, mira la tabla en los flips, aterrizajes «sketchy», celebración, mira alrededor parado, caídas variadas.
- Vestidor: estampado, pernera (corto), rodilleras/coderas, gafas, mochila; 13 tablas y 9 ruedas.
- Contrarreloj de 2 minutos con récord y medallas; 20 retos con bronce/plata/oro y desbloqueos.
- Regresión: kickflip, boardslide, manual, caída y levantarse OK. 1,75 ms por fotograma. Sin errores de consola.

## Ideas pendientes
- Probar a mano con teclado la sensación de los lip tricks y el drop in (solo probado por guion).
- Soporte de mando (no elegido aún).
- Comprobar en una pantalla ancha (W=640) que los menús quedan bien centrados.

## Cambios del 9-nov (segunda tanda, a petición del usuario)
- Lip tricks más fáciles: se mantiene W/A/S/D **desde el principio de la rampa** y te clavas en el coping a cualquier velocidad;
  sin tecla, sales en aire. Se suelta la tecla para volver a la rampa. Un manual con W que entra en la rampa enlaza con el Coping 50-50.
- Logo del usuario pintado en la pared del fondo (`src/p3b_logo.js`, convertido a pixel art 97×97 desde su imagen),
  con 3 tonos verde azulado nuevos en la paleta (índices 33-35, ahora 36 colores).

## Gran actualización del 9-nov (tercera tanda)
Piezas nuevas en `src/`: `p3c_scene.js` (pared, luces, palomas, ventilador), `p8a_tricks.js` (revert, impacto, special),
`p8b_replay.js` (modo vídeo), `p8c_input.js` (mando y táctil). Orden de montaje en `src/build.sh`.
- Visual: cámara un 25 % más cerca (ZM = 1,25; la física sigue en unidades de mundo, se dibuja con SX/SY/LY).
  Paredes, columnas y suelo de hormigón con árido, poros, juntas de encofrado, latiguillos, grietas, eflorescencia y parches.
  Hora del día en el menú (mañana / atardecer / noche) con luz tramada; tubos colgantes con halo (uno parpadea);
  reflejo tramado del skater en el suelo pulido; brillos que recorren los copings; sin graffitis (se quitó el estarcido).
  Vida: banco, mochilas, botella, tabla apoyada, radio con LED al ritmo, cono, puerta con SALIDA, extintor,
  carteles (casco obligatorio, horario, campeonato, prohibido fumar), ventilador girando y palomas que se espantan.
- Revert: Shift al caer en una rampa (o justo antes) → gira 180 y el combo dura 1,5 s más para enlazar un manual.
- Impacto: micropausa y temblor en golpes fuertes y caídas, «¡PERFECTO!» con bonus, barra del tiempo de combo.
- (Se añadieron un cajón y una barra baja, pero el usuario pidió quitarlos: solo queda la barandilla de la pirámide en RAILS.)
- Trucos: hardflip (A+D), Smith (W+A) y Feeble (W+D) en el coping, nombres «Fakie …»; barra de special que se llena
  con puntos; con ella llena, Shift + W/A/D/S en el aire = Christ Air / Kickflip McTwist / 360 Flip / Impossible.
- Modo vídeo: en pausa, «VER REPETICIÓN» (últimos 15 s) y «MEJOR CLIP» (mejor combo de la sesión);
  filtros NORMAL / MÓVIL / VHS / OJO DE PEZ y velocidad x1, x0,5, x0,25.
- Mando (Gamepad API) y botones táctiles en pantalla (aparecen al tocar).
- Probado por guion en el navegador: sin errores, 1,5 ms por fotograma. Mando y táctil sin probar con hardware real.

## Ajuste del 9-nov (cuarta tanda)
- Quitados el cajón y la barra baja (a petición del usuario). Queda solo la barandilla de la pirámide.
- Rampas y pirámide pegadas a la pared: WALLZ = -36 (borde trasero de los sólidos). Para que se vean pegadas,
  la pared se mueve con ellas (capa `wall`, parallax 1) y el parallax lo conservan el techo (`ceil`, 0,6) y la valla (1,35).
- Puerta y extintor movidos al tramo llano entre la pirámide y la rampa grande; logo, horario y columnas recolocados;
  objetos del suelo (banco, mochilas, botella, tabla, radio, cono) junto a la pared nueva.
- Tonos: pared de hormigón más oscura y suelo de hormigón claro, casi blanco (FLOOR_R hasta el índice 9).
- Bombeo más fácil: vale mantener Shift o pulsarlo hasta 0,45 s antes; se bombea al bajar y también al subir cada curva
  (menos ganancia al subir); en Fácil la ganancia es un 20 % mayor; aviso «SHIFT: ¡BOMBEA!» junto a la barra de velocidad.

## Publicado (9-nov)
- Repositorio: https://github.com/jfjmorgan-byte/skate-nave (rama main). Enlace para jugar: https://jfjmorgan-byte.github.io/skate-nave/
- Para actualizarlo: sh src/build.sh, commit y git push (Pages publica index.html de main).

## Mapas nuevos (11-nov)
- El nivel ya no está escrito a mano: `MAPS` en `src/p3_level.js` define cada mapa por piezas (rampa izquierda L con lip/R/base/vext,
  tramo central `mid` como polilínea, rampa derecha Rr, barandilla, lámparas, techo de aire, tempo de la música). `loadMap(id)` lo carga.
- Mapas: LA NAVE (el de siempre), EL SKATEPARK (exterior de hormigón, funbox con barandilla, ciudad, árboles, farolas de noche),
  LA PISCINA (piscina vacía en corte: parte baja a 52, pendiente y parte honda; azulejos, coping de piedra, escalera, palmeras)
  y EL PARKING (sótano con luz de sodio, rampas de madera, rampa de coches con barandilla, columnas, coches aparcados).
- Fondos de los mapas nuevos en `src/p3e_bgs.js`; objetos del suelo de todos los mapas en `src/p3d_props.js`.
- Menú: opción MAPA (← →). Sesión libre y contrarreloj usan el mapa elegido; los retos siempre van en La Nave.
