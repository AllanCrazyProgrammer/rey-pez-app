# Revisión actualizada — Lag gde (p/macuil), Chila

Periodo: **1 de julio al 12 de septiembre de 2026**. Nueva consulta directa a Firestore: **12 de septiembre, 20:03, hora de Monterrey**. Esta revisión sustituye las conclusiones del primer análisis; el informe anterior se conserva como referencia histórica. No se modificaron registros de la aplicación.

## Resultado actualizado

| Concepto | Análisis anterior | Actual | Cambio |
|---|---:|---:|---:|
| Entradas | 4,654 kg | 4,654 kg | 0 kg |
| Salidas | 3,786.3 kg | 4,286.3 kg | +500 kg |
| Saldo registrado | 867.7 kg | **367.7 kg** | −500 kg |

Si el producto físicamente está agotado, **367.7 kg es la diferencia actual entre el saldo registrado y un conteo físico de cero**. No es evidencia de una pérdida física de esa cantidad: aún hay capturas y atribuciones de materia prima por aclarar.

Las omisiones anteriores del **19 y 25 de agosto están conciliadas: 60 kg contra 60 kg cada día**. La del **7 de septiembre ya tiene salida suficiente**, pero ahora hay 160 kg descontados contra 140 kg capturados en rendimientos.

## Cambios en salidas

| Fecha | Antes | Ahora | Incremento | Registro |
|---|---:|---:|---:|---|
| 2026-07-31 | 160 | 240 | 80 | [Crudos](http://localhost:8080/existencias-crudos/JAh202RCUmTV3a4t04T1) |
| 2026-08-01 | 100 | 120 | 20 | [Crudos](http://localhost:8080/existencias-crudos/EnJ0T6LD8B1t0cNXb1jM) |
| 2026-08-14 | 100 | 160 | 60 | [Crudos](http://localhost:8080/existencias-crudos/zYYCjhwRcfQTUTgmkID9) |
| 2026-08-19 | 0 | 60 | 60 | [Crudos](http://localhost:8080/existencias-crudos/mtYKI36bLPp7ZXy7KmDp) |
| 2026-08-25 | 0 | 60 | 60 | [Crudos](http://localhost:8080/existencias-crudos/SPhZggiRLpGj4NxufaBe) |
| 2026-09-07 | 20 | 160 | 140 | [Crudos](http://localhost:8080/existencias-crudos/a6BG2hGwTPYVoj7tDyzo) |
| 2026-09-12 | 0 | 80 | 80 | [Crudos](http://localhost:8080/existencias-crudos/q2pSQ8cmaa9KPcwbMzJ5) |

El 27 de julio también se capturaron 60 kg en rendimientos, que ahora coinciden con la salida de 60 kg. El 31 de julio ahora coincide en 240 kg en ambos módulos.

## Puntos prioritarios

**7 de septiembre — 20 kg por encima de rendimientos.** [El registro de crudos](http://localhost:8080/existencias-crudos/a6BG2hGwTPYVoj7tDyzo) conserva la salida original de 20 kg y una nueva de 140 kg: total 160 kg. [Rendimientos](http://localhost:8080/embarques/fdVqvMtdhS5LxehBvy30/rendimientos) sigue indicando 140 kg de Macuil Laguna. Si los 20 kg corresponden a otro consumo, ambas salidas pueden ser correctas. Si la intención era dejar 140 kg como total del día, se descontaron 20 kg adicionales. Solo en ese último caso el saldo pasaría de 367.7 a 387.7 kg.

**12 de septiembre — posible duplicación de 80 kg en rendimientos.** [El embarque de hoy](http://localhost:8080/embarques/ovGeUPMtstMOPgk7cMYu/rendimientos) tiene macuil = 80 y macuil laguna = 80. Los productos embarcados de Joselito y Catarro solo tienen medida macuil laguna; no hay una segunda categoría macuil con producto correspondiente. [La salida de hoy](http://localhost:8080/existencias-crudos/q2pSQ8cmaa9KPcwbMzJ5) es de 80 kg y coincide con macuil laguna. La suma literal de 160 kg puede contar dos veces el mismo consumo; no se justifica descontar otros 80 kg de inventario hasta comprobar si fueron dos consumos distintos.

**22 de julio — persiste la posible clave residual de 137.7 kg.** [El embarque](http://localhost:8080/embarques/KFLz6twyWXNbXs3z9V7x/rendimientos) mantiene macuil laguna = 137.5 y macuil = 137.7. Sus productos de Macuil siguen etiquetados solo como macuil laguna. [La salida de Chila](http://localhost:8080/existencias-crudos/kocIxTkNA9zc7hUfUYsz) es 137.5 kg y coincide con esa categoría. La cifra adicional requiere revisión, no un descuento automático.

**14 de agosto — hay dos orígenes bajo la medida macuil.** [La salida de Chila](http://localhost:8080/existencias-crudos/zYYCjhwRcfQTUTgmkID9) aumentó de 100 a 160 kg, pero [rendimientos](http://localhost:8080/embarques/ktwOjXbyGK5fSZfZnK39/rendimientos) continúa en cero. En los productos del embarque, Joselito tiene nombre alternativo “macuil Laguna” y Veronica “macuil Pac rosada”. Esto indica que no todo lo agrupado bajo macuil necesariamente corresponde al producto Laguna de Chila. Verificar el origen de los 60 kg añadidos. Los pesos embarcados son cocidos y no permiten inferir por sí solos la materia prima exacta.

**16 de julio — origen aún incierto.** Hay 40 kg crudos de Macuil en [rendimientos](http://localhost:8080/embarques/XLMxPdgfcyNHYG9E7Pwp/rendimientos) sin salida de este producto. El nombre alternativo es “Macuil Allan”, y en [inventario](http://localhost:8080/existencias-crudos/ch8ohTqxvDajmNsj0HgS) existe una salida de 39 kg de Pac cc de Rey Mar, además de otra de 205 kg. No hay vínculo suficiente para cargar esos 40 kg a Chila.

## Rendimientos pendientes de completar

En estas fechas existen **559 kg de salidas** de este producto y la categoría Macuil de rendimientos permanece en cero:

| Fecha | Salida registrada (kg) | Rendimientos (kg) | Enlace |
|---|---:|---:|---|
| 2026-07-28 | 78 | 0 | [Rendimientos](http://localhost:8080/embarques/tBUPWiRpm1cZFn20MC7l/rendimientos) |
| 2026-07-30 | 101 | 0 | [Rendimientos](http://localhost:8080/embarques/R6qsY2D34VDenAIBsdiZ/rendimientos) |
| 2026-08-01 | 120 | 0 | [Rendimientos](http://localhost:8080/embarques/VWOlRnnQyTISaVEyRFxc/rendimientos) |
| 2026-08-14 | 160 | 0 | [Rendimientos](http://localhost:8080/embarques/ktwOjXbyGK5fSZfZnK39/rendimientos) |
| 2026-08-15 | 100 | 0 | [Rendimientos](http://localhost:8080/embarques/ON8NNDH5wAXQhlNJObAd/rendimientos) |

Ya están descontadas de existencias: completar su captura de rendimientos no justifica volver a descontarlas. El 14 de agosto además requiere separar los orígenes descritos arriba.

Otras diferencias con salida mayor que rendimientos: 18/jul = 0.6 kg; 4/sep = 10 kg; 7/sep = 20 kg; 8/sep = 20 kg; 11/sep = 20 kg (sin categoría Macuil capturada). Total adicional: 70.6 kg. Sumadas a los días de rendimientos cero, las diferencias en este sentido totalizan **629.6 kg**; no equivalen a una pérdida confirmada.

## Por qué no basta con comparar los totales de los dos módulos

La suma literal guardada de Macuil/Macuil Laguna es **4,266.4 kg**, frente a 4,286.3 kg de salidas de Chila: diferencia de −19.9 kg. Esta cercanía no demuestra que el inventario esté conciliado:

- Incluye **352 kg del 7, 8 y 15 de julio**, antes del primer ingreso de este producto. En esas fechas existen salidas del mismo peso de otros productos/proveedores: 180 kg de Pac c/c de Quintin, 55 kg de Pac c/c (43 pcz) de Maria Guadalupe, y 117 kg de Pac cc de Rey Mar. Son coincidencias, no vínculos formales.
- Incluye **217.7 kg de posibles claves residuales**: 137.7 kg del 22 de julio y 80 kg del 12 de septiembre.
- Incluye los 40 kg del 16 de julio cuyo origen está por confirmar.
- Hay capturas de rendimientos en cero y salidas con otros usos posibles.

Si solo para análisis se apartan los 352 kg anteriores al primer ingreso y los 217.7 kg de posibles claves residuales, quedan **3,696.7 kg en rendimientos**. Es un escenario de depuración, no un total definitivo de consumo de Chila; aún incluye los 40 kg de origen incierto y faltan las capturas en cero.

## Resumen mensual literal

| Mes | Entradas (kg) | Salidas (kg) | Rendimientos Macuil/Laguna (kg) | Saldo registrado (kg) |
|---|---:|---:|---:|---:|
| 2026-07 | 2,675 | 1,107.3 | 1,457.4 | 1,567.7 |
| 2026-08 | 1,825 | 2,169 | 1,789 | 1,223.7 |
| 2026-09 | 154 | 1,010 | 1,020 | 367.7 |

## Detalle diario

Importes en kg. Diferencia = rendimientos seleccionados − salidas de Chila. El saldo es el registrado, sin correcciones hipotéticas. Se omiten fechas sin movimientos ni categorías relevantes.

| Fecha | Entradas | Salidas | Rendimientos | Diferencia | Saldo | Detalle | Registros |
|---|---:|---:|---:|---:|---:|---|---|
| 2026-07-06 | 0 | 0 | 0 | 0 | 0 | macuil=0 | [Rendimientos](http://localhost:8080/embarques/gTOPKFfCx9VP9BxcJ5LH/rendimientos) |
| 2026-07-07 | 0 | 0 | 180 | 180 | 0 | macuil=180 | [Rendimientos](http://localhost:8080/embarques/LQWkkTfICQWSrnmIu1FA/rendimientos) |
| 2026-07-08 | 0 | 0 | 55 | 55 | 0 | macuil=55; separado: macuil esp=50 | [Rendimientos](http://localhost:8080/embarques/tGnlLOAnpryT6OQPSbTk/rendimientos) |
| 2026-07-09 | 0 | 0 | 0 | 0 | 0 | Sin categoría; separado: macuil feo=100 |  |
| 2026-07-10 | 0 | 0 | 0 | 0 | 0 | Sin categoría; separado: macuil esp=60 |  |
| 2026-07-15 | 0 | 0 | 117 | 117 | 0 | macuil=117 | [Rendimientos](http://localhost:8080/embarques/yHaLswMKTbgmDgOLyVDU/rendimientos) |
| 2026-07-16 | 938 | 0 | 40 | 40 | 938 | Macuil=40 | [Crudos](http://localhost:8080/existencias-crudos/ch8ohTqxvDajmNsj0HgS) · [Rendimientos](http://localhost:8080/embarques/XLMxPdgfcyNHYG9E7Pwp/rendimientos) |
| 2026-07-17 | 759 | 0 | 0 | 0 | 1,697 | Sin categoría | [Crudos](http://localhost:8080/existencias-crudos/hMTDLfQzu8uXP4ug6Se0) |
| 2026-07-18 | 0 | 40 | 39.4 | -0.6 | 1,657 | macuil=39.4 | [Crudos](http://localhost:8080/existencias-crudos/Zi4I9PlqaJpn6kAqBv8k) · [Rendimientos](http://localhost:8080/embarques/Vl07es7y69vcIR3pg9yc/rendimientos) |
| 2026-07-20 | 342 | 98 | 98 | 0 | 1,901 | macuil=98 | [Crudos](http://localhost:8080/existencias-crudos/mKsfSsh5anEe5bh0A5iF) · [Rendimientos](http://localhost:8080/embarques/JqUZYW5LhWzp0S92bUTS/rendimientos) |
| 2026-07-22 | 0 | 137.5 | 275.2 | 137.7 | 1,763.5 | macuil laguna=137.5; macuil=137.7 | [Crudos](http://localhost:8080/existencias-crudos/kocIxTkNA9zc7hUfUYsz) · [Rendimientos](http://localhost:8080/embarques/KFLz6twyWXNbXs3z9V7x/rendimientos) |
| 2026-07-23 | 0 | 80 | 80 | 0 | 1,683.5 | macuil=80 | [Crudos](http://localhost:8080/existencias-crudos/7G24kAn41CAbWk581x2L) · [Rendimientos](http://localhost:8080/embarques/TP1uZXuIBSVnv7osQxP0/rendimientos) |
| 2026-07-24 | 0 | 156 | 156 | 0 | 1,527.5 | macuil=156 | [Crudos](http://localhost:8080/existencias-crudos/yw0oAAvQxqajeFw0STWC) · [Rendimientos](http://localhost:8080/embarques/CkLfsWtAZanBp7bSyxLt/rendimientos) |
| 2026-07-25 | 0 | 116.8 | 116.8 | 0 | 1,410.7 | macuil laguna=116.8 | [Crudos](http://localhost:8080/existencias-crudos/Ylkueg0V2HxkEl0myJxE) · [Rendimientos](http://localhost:8080/embarques/SmtqXwLb2SeDcwikcgMZ/rendimientos) |
| 2026-07-27 | 0 | 60 | 60 | 0 | 1,350.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/nxPnZp1hHjtnj6uYPa6u) · [Rendimientos](http://localhost:8080/embarques/iQJFExQa3MoCZYS3XhVf/rendimientos) |
| 2026-07-28 | 350 | 78 | 0 | -78 | 1,622.7 | macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/MBFtENmdwpsKa6fd675H) · [Rendimientos](http://localhost:8080/embarques/tBUPWiRpm1cZFn20MC7l/rendimientos) |
| 2026-07-30 | 286 | 101 | 0 | -101 | 1,807.7 | macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/Azu1Z2pQV7zkcUYJrKrm) · [Rendimientos](http://localhost:8080/embarques/R6qsY2D34VDenAIBsdiZ/rendimientos) |
| 2026-07-31 | 0 | 240 | 240 | 0 | 1,567.7 | macuil=240 | [Crudos](http://localhost:8080/existencias-crudos/JAh202RCUmTV3a4t04T1) · [Rendimientos](http://localhost:8080/embarques/bXVWLGMGPEZ06oMUl93v/rendimientos) |
| 2026-08-01 | 0 | 120 | 0 | -120 | 1,447.7 | Macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/EnJ0T6LD8B1t0cNXb1jM) · [Rendimientos](http://localhost:8080/embarques/VWOlRnnQyTISaVEyRFxc/rendimientos) |
| 2026-08-03 | 0 | 99 | 99 | 0 | 1,348.7 | macuil=99 | [Crudos](http://localhost:8080/existencias-crudos/Dx7HaA8gIBUNMapIXyJO) · [Rendimientos](http://localhost:8080/embarques/iffv6aDJd6yFepTWy3vE/rendimientos) |
| 2026-08-04 | 412 | 60 | 60 | 0 | 1,700.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/iXBWURIGmbPsO0rY8Xa8) · [Rendimientos](http://localhost:8080/embarques/G10DZotWJKCVxBfavJ3G/rendimientos) |
| 2026-08-06 | 228 | 180 | 180 | 0 | 1,748.7 | macuil=180; separado: macuil pac cc=65 | [Crudos](http://localhost:8080/existencias-crudos/nDxqHA7ZREaGUNhEAcj6) · [Rendimientos](http://localhost:8080/embarques/0M1JLtDdvNuWgIDMkyHO/rendimientos) |
| 2026-08-07 | 0 | 80 | 80 | 0 | 1,668.7 | macuil=80; separado: macuil pac cc=0 | [Crudos](http://localhost:8080/existencias-crudos/0QGDlURNDa3HrUF5bE54) · [Rendimientos](http://localhost:8080/embarques/Uo4Fg8LPVMiCP2xfckZi/rendimientos) |
| 2026-08-08 | 0 | 60 | 60 | 0 | 1,608.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/LwoKj0NnXMlZ4f9P91pW) · [Rendimientos](http://localhost:8080/embarques/sYOmhjlgtMgpvCJLD6al/rendimientos) |
| 2026-08-10 | 0 | 90 | 90 | 0 | 1,518.7 | macuil=90 | [Crudos](http://localhost:8080/existencias-crudos/Yus7crORCqEuPw5dNbCG) · [Rendimientos](http://localhost:8080/embarques/I9G9FdUHxWRStsbOaKPu/rendimientos) |
| 2026-08-11 | 214 | 100 | 100 | 0 | 1,632.7 | macuil=100 | [Crudos](http://localhost:8080/existencias-crudos/Y970RyW3MCPWU15ZaVz7) · [Rendimientos](http://localhost:8080/embarques/647u2IMwjpjIgvhADGkA/rendimientos) |
| 2026-08-12 | 0 | 100 | 100 | 0 | 1,532.7 | macuil=100 | [Crudos](http://localhost:8080/existencias-crudos/WsYnLDbWvRynU5MOoMlN) · [Rendimientos](http://localhost:8080/embarques/gsUGbzBlXLqiDQX2CPRe/rendimientos) |
| 2026-08-13 | 198 | 60 | 60 | 0 | 1,670.7 | macuil laguna=60; separado: macuil pac c/c=80 | [Crudos](http://localhost:8080/existencias-crudos/GApAru0VVGNrLXIf5X0T) · [Rendimientos](http://localhost:8080/embarques/j1FKIIFv4hgBlsJOavNU/rendimientos) |
| 2026-08-14 | 0 | 160 | 0 | -160 | 1,510.7 | macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/zYYCjhwRcfQTUTgmkID9) · [Rendimientos](http://localhost:8080/embarques/ktwOjXbyGK5fSZfZnK39/rendimientos) |
| 2026-08-15 | 0 | 100 | 0 | -100 | 1,410.7 | macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/CBiBAjDdzMy6nGoGbR8e) · [Rendimientos](http://localhost:8080/embarques/ON8NNDH5wAXQhlNJObAd/rendimientos) |
| 2026-08-18 | 282 | 160 | 160 | 0 | 1,532.7 | macuil=160 | [Crudos](http://localhost:8080/existencias-crudos/qLa6TADtxD9y1YsFtO7n) · [Rendimientos](http://localhost:8080/embarques/OelDhazwaqoa2uYExqVn/rendimientos) |
| 2026-08-19 | 0 | 60 | 60 | 0 | 1,472.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/mtYKI36bLPp7ZXy7KmDp) · [Rendimientos](http://localhost:8080/embarques/r9ruMQ63HiWWLQomvytl/rendimientos) |
| 2026-08-20 | 236 | 220 | 220 | 0 | 1,488.7 | macuil=220 | [Crudos](http://localhost:8080/existencias-crudos/GiMjAQCsxXt7NYZY8ixV) · [Rendimientos](http://localhost:8080/embarques/fX4m2EqtISsLDBUVL6Nt/rendimientos) |
| 2026-08-25 | 140 | 60 | 60 | 0 | 1,568.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/SPhZggiRLpGj4NxufaBe) · [Rendimientos](http://localhost:8080/embarques/FXC80Jo4ceuMo4JRFL6B/rendimientos) |
| 2026-08-26 | 0 | 160 | 160 | 0 | 1,408.7 | macuil=160 | [Crudos](http://localhost:8080/existencias-crudos/DcYI7GlM2pE6zx1H2Ggl) · [Rendimientos](http://localhost:8080/embarques/baj5crcoc7jovb6PvoAi/rendimientos) |
| 2026-08-27 | 115 | 0 | 0 | 0 | 1,523.7 | Sin categoría | [Crudos](http://localhost:8080/existencias-crudos/YF4g5IZehv7hot0yCQHP) |
| 2026-08-28 | 0 | 160 | 160 | 0 | 1,363.7 | macuil laguna=160 | [Crudos](http://localhost:8080/existencias-crudos/32QlzILlsewszrvKZ69F) · [Rendimientos](http://localhost:8080/embarques/Fb3l6yChNBW5VGQrCsjW/rendimientos) |
| 2026-08-31 | 0 | 140 | 140 | 0 | 1,223.7 | macuil laguna=140 | [Crudos](http://localhost:8080/existencias-crudos/fRUFcV9BsPycwoA45FAg) · [Rendimientos](http://localhost:8080/embarques/pMS50zBS9YNkgVhiF2pX/rendimientos) |
| 2026-09-01 | 154 | 100 | 100 | 0 | 1,277.7 | macuil laguna=100 | [Crudos](http://localhost:8080/existencias-crudos/tvdNwbooGivaX7TBJ1pH) · [Rendimientos](http://localhost:8080/embarques/unRyLdAUihAPXcMOUMcj/rendimientos) |
| 2026-09-03 | 0 | 100 | 100 | 0 | 1,177.7 | macuil laguna=100; separado: macuil mar=102 | [Crudos](http://localhost:8080/existencias-crudos/wareyNRShnlknZGwxbcI) · [Rendimientos](http://localhost:8080/embarques/u9PAxP98oXPlYV3eDL4K/rendimientos) |
| 2026-09-04 | 0 | 70 | 60 | -10 | 1,107.7 | macuil laguna=60 | [Crudos](http://localhost:8080/existencias-crudos/uGmM3wrC4vJfGOBG449U) · [Rendimientos](http://localhost:8080/embarques/JhZVVEv2e525yCoj7l7o/rendimientos) |
| 2026-09-05 | 0 | 160 | 160 | 0 | 947.7 | macuil laguna=160 | [Crudos](http://localhost:8080/existencias-crudos/xF2KrKKqTc8xGFrJF1Is) · [Rendimientos](http://localhost:8080/embarques/xup2q57pkh484vwA67kK/rendimientos) |
| 2026-09-07 | 0 | 160 | 140 | -20 | 787.7 | macuil laguna=140; macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/a6BG2hGwTPYVoj7tDyzo) · [Rendimientos](http://localhost:8080/embarques/fdVqvMtdhS5LxehBvy30/rendimientos) |
| 2026-09-08 | 0 | 80 | 60 | -20 | 707.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/tCnzvG8ZEia1rj3RmUyH) · [Rendimientos](http://localhost:8080/embarques/3dBzJdsyB5abUMgtaBMA/rendimientos) |
| 2026-09-09 | 0 | 60 | 60 | 0 | 647.7 | macuil laguna=60 | [Crudos](http://localhost:8080/existencias-crudos/9jKWeSoQTKFU7H2Q3IaQ) · [Rendimientos](http://localhost:8080/embarques/1iVVlYorFBVqXrh9NAzo/rendimientos) |
| 2026-09-10 | 0 | 180 | 180 | 0 | 467.7 | macuil laguna=180 | [Crudos](http://localhost:8080/existencias-crudos/P9xIzCUYeVmANjUwhHaa) · [Rendimientos](http://localhost:8080/embarques/Sk7fmtNjLBRh3gEHDyMB/rendimientos) |
| 2026-09-11 | 0 | 20 | 0 | -20 | 447.7 | Sin categoría | [Crudos](http://localhost:8080/existencias-crudos/ARAObLyLa2aVGUOuz9nX) |
| 2026-09-12 | 0 | 80 | 160 | 80 | 367.7 | macuil=80; macuil laguna=80 | [Crudos](http://localhost:8080/existencias-crudos/q2pSQ8cmaa9KPcwbMzJ5) · [Rendimientos](http://localhost:8080/embarques/ovGeUPMtstMOPgk7cMYu/rendimientos) |

## Verificación y límites

Se consultaron 275 documentos de existenciasCrudos y 573 embarques guardados en Firestore. Fechas de inventario convertidas a America/Monterrey; fechas de embarque YYYY-MM-DD respetadas como día del negocio. Se filtró estrictamente del 1 de julio al 12 de septiembre, sin ampliar el periodo.

Se mantuvo el criterio de categorías del primer análisis: Macuil/macuil y macuil laguna, considerando los nombres personalizados. Se separaron las variantes esp, feo, pac cc, pac c/c y mar. También se inspeccionaron los nombres alternativos de los productos, que muestran orígenes diferentes dentro de una misma categoría.

El producto exacto Lag gde (p/macuil) solo aparece con proveedor Chila y cuarto s/c. No hay movimientos anteriores al 16 de julio ni traslados de ese producto. Las entradas suman 4,654 kg y las salidas 4,286.3 kg, comprobadas independientemente con aritmética decimal. Al reproducir la distribución de salidas por precio y cuarto de ExistenciasCrudos.vue, el saldo también es 367.7 kg y no hay kilos ignorados por falta de saldo.

Se analizaron los datos guardados al momento de la consulta; no se inspeccionaron cambios locales sin sincronizar. No se cambiaron salidas, rendimientos ni entradas.
