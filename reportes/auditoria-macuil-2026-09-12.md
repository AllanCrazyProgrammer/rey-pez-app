# Revisión de Lag gde (p/macuil) — Chila

Periodo: **1 de julio al 12 de septiembre de 2026**, fechas de inventario en America/Monterrey. Consulta realizada el 12 de septiembre de 2026, aproximadamente a las 18:15, hora de Monterrey.

## Resultado principal

El saldo registrado es **867.7 kg**: 4,654 kg de entradas menos 3,786.3 kg de salidas. Se encontraron **240 kg de posibles salidas faltantes** en tres fechas. Si se confirma que esos consumos pertenecen a este producto y no se registraron en otra fecha, el saldo bajaría a **627.7 kg**. Por tanto, estos tres casos no explican por sí solos que el producto esté físicamente agotado.

No se modificaron datos de inventario ni embarques.

## Alcance y criterio

- Se consultaron directamente los datos guardados en Firestore: 273 documentos de existenciasCrudos y 573 embarques. Se filtraron localmente las fechas porque los embarques usan formatos de fecha diferentes.
- El producto exacto encontrado es **Lag gde (p/macuil)**, proveedor **Chila**, cuarto **s/c**. Tiene 14 entradas y 37 líneas de salida. No se encontraron movimientos de ese producto anteriores al 16 de julio ni traslados entre cuartos. Saldo registrado inicial de julio: 0 kg.
- Se comparó el campo **kilosCrudos** de rendimientos, que representa materia prima. No se compararon directamente los kilos de camarón cocido con los kilos crudos.
- Se agruparon Macuil/macuil y macuil laguna, incluyendo nombres personalizados equivalentes. Se dejaron separados macuil esp, macuil feo, macuil pac cc, macuil pac c/c y macuil mar: no hay evidencia suficiente para cargarlos al producto de Chila.
- La suma literal de las categorías seleccionadas es **3,806.4 kg**, pero contiene consumos anteriores al primer ingreso de este producto y una posible clave residual. No es un total atribuible íntegramente a Chila.
- El último registro de existenciasCrudos es del 11 de septiembre. El embarque del 12 existe, pero tiene kilosCrudos vacío y sus renglones Macuil no tienen pesadas; el consumo de ese día no puede cuantificarse. No se inspeccionaron cambios locales aún no sincronizados.

## Tres diferencias prioritarias

| Fecha | Salida de Lag gde (p/macuil) | Kilos crudos en rendimientos | Diferencia por revisar | Evidencia |
|---|---:|---:|---:|---|
| 19/08/2026 | 0 kg | 60 kg | 60 kg | [Embarque](http://localhost:8080/embarques/r9ruMQ63HiWWLQomvytl/rendimientos); no existe registro de crudos de ese día. Macuil para Catarro. |
| 25/08/2026 | 0 kg | 60 kg | 60 kg | [Crudos](http://localhost:8080/existencias-crudos/SPhZggiRLpGj4NxufaBe): entrada de 140 kg y ninguna salida. [Embarque](http://localhost:8080/embarques/FXC80Jo4ceuMo4JRFL6B/rendimientos): Macuil para Catarro. |
| 07/09/2026 | 20 kg | 140 kg | 120 kg | [Crudos](http://localhost:8080/existencias-crudos/a6BG2hGwTPYVoj7tDyzo) y [Embarque](http://localhost:8080/embarques/fdVqvMtdhS5LxehBvy30/rendimientos). Macuil Laguna para Joselito y Catarro. |
| **Total** | **20 kg** | **260 kg** | **240 kg** | Confirmar materia prima y fecha de consumo antes de ajustar. |

## Casos que pueden falsear la comparación

**Antes del primer ingreso:** el 7, 8 y 15 de julio hay 180, 55 y 117 kg de Macuil, respectivamente: **352 kg**. En inventario existen salidas del mismo peso de otros productos: Pac c/c de Quintin (180), Pac c/c (43 pcz) de Maria Guadalupe (55), y Pac cc de Rey Mar (117). Es evidencia de que Macuil puede elaborarse con otros orígenes; la coincidencia de fecha y peso no establece una relación formal entre los registros. No se deben descontar automáticamente estos 352 kg de Chila.

**16 de julio:** [rendimientos](http://localhost:8080/embarques/XLMxPdgfcyNHYG9E7Pwp/rendimientos) registra 40 kg de Macuil y [crudos](http://localhost:8080/existencias-crudos/ch8ohTqxvDajmNsj0HgS) no tiene salida de Lag gde. Sí hay una salida de 39 kg de Pac cc de Rey Mar, además de otra de 205 kg. Se requiere identificar la materia prima: los 40 kg son una diferencia adicional posible, no confirmada de Chila.

**22 de julio:** [el mismo embarque](http://localhost:8080/embarques/KFLz6twyWXNbXs3z9V7x/rendimientos) conserva dos claves: macuil laguna = 137.5 kg y macuil = 137.7 kg. Sus productos embarcados de Macuil están etiquetados únicamente macuil laguna. La [salida de Chila](http://localhost:8080/existencias-crudos/kocIxTkNA9zc7hUfUYsz) es de 137.5 kg y coincide con esa categoría. Los 137.7 kg adicionales parecen una clave residual o duplicada; no hay base para descontarlos como un segundo consumo sin revisar. El modal Salidas Rendimientos suma todas las claves guardadas, aunque no tengan producto embarcado correspondiente.

## Salidas que exceden lo capturado en rendimientos

También hay **749.6 kg** de diferencias en el sentido contrario. Ya están descontadas de existencias, por lo que no deben descontarse de nuevo. Un cero o ausencia de captura en rendimientos no demuestra ausencia de consumo.

| Fecha | Salida de crudos | Rendimientos seleccionados | Exceso de salida |
|---|---:|---:|---:|
| 2026-07-18 | 40 | 39.4 | 0.6 |
| 2026-07-27 | 60 | 0 | 60 |
| 2026-07-28 | 78 | 0 | 78 |
| 2026-07-30 | 101 | 0 | 101 |
| 2026-07-31 | 160 | 0 | 160 |
| 2026-08-01 | 100 | 0 | 100 |
| 2026-08-14 | 100 | 0 | 100 |
| 2026-08-15 | 100 | 0 | 100 |
| 2026-09-04 | 70 | 60 | 10 |
| 2026-09-08 | 80 | 60 | 20 |
| 2026-09-11 | 20 | 0 | 20 |

## Comparación mensual literal

Los rendimientos de esta tabla incluyen los 352 kg anteriores al primer ingreso y los 137.7 kg de la posible clave residual. Sirve como control de suma, no como conciliación definitiva de este producto.

| Mes | Entradas Chila | Salidas Chila | Rendimientos Macuil/Laguna | Saldo de inventario al cierre |
|---|---:|---:|---:|---:|
| 2026-07 | 2,675 | 1,027.3 | 1,157.4 | 1,647.7 |
| 2026-08 | 1,825 | 1,969 | 1,789 | 1,503.7 |
| 2026-09 | 154 | 790 | 860 | 867.7 |

## Detalle diario y enlaces a los registros

Todos los importes están en kg. Diferencia = rendimientos seleccionados − salidas de Chila. El saldo es el registrado, sin ajustes propuestos. Las fechas sin movimientos ni categorías relevantes se omiten. Un rendimiento 0 puede ser una captura vacía, cero explícito o ausencia de la categoría; véase la columna de detalle.

| Fecha | Entradas | Salidas | Rendimientos | Diferencia | Saldo | Detalle rendimientos | Registros |
|---|---:|---:|---:|---:|---:|---|---|
| 2026-07-06 | 0 | 0 | 0 | 0 | 0 | macuil=0 | [Embarque](http://localhost:8080/embarques/gTOPKFfCx9VP9BxcJ5LH/rendimientos) |
| 2026-07-07 | 0 | 0 | 180 | 180 | 0 | macuil=180 | [Embarque](http://localhost:8080/embarques/LQWkkTfICQWSrnmIu1FA/rendimientos) |
| 2026-07-08 | 0 | 0 | 55 | 55 | 0 | macuil=55; separado: macuil esp=50 | [Embarque](http://localhost:8080/embarques/tGnlLOAnpryT6OQPSbTk/rendimientos) |
| 2026-07-09 | 0 | 0 | 0 | 0 | 0 | Sin categoría capturada; separado: macuil feo=100 |  |
| 2026-07-10 | 0 | 0 | 0 | 0 | 0 | Sin categoría capturada; separado: macuil esp=60 |  |
| 2026-07-15 | 0 | 0 | 117 | 117 | 0 | macuil=117 | [Embarque](http://localhost:8080/embarques/yHaLswMKTbgmDgOLyVDU/rendimientos) |
| 2026-07-16 | 938 | 0 | 40 | 40 | 938 | Macuil=40 | [Crudos](http://localhost:8080/existencias-crudos/ch8ohTqxvDajmNsj0HgS) · [Embarque](http://localhost:8080/embarques/XLMxPdgfcyNHYG9E7Pwp/rendimientos) |
| 2026-07-17 | 759 | 0 | 0 | 0 | 1,697 | Sin categoría capturada | [Crudos](http://localhost:8080/existencias-crudos/hMTDLfQzu8uXP4ug6Se0) |
| 2026-07-18 | 0 | 40 | 39.4 | -0.6 | 1,657 | macuil=39.4 | [Crudos](http://localhost:8080/existencias-crudos/Zi4I9PlqaJpn6kAqBv8k) · [Embarque](http://localhost:8080/embarques/Vl07es7y69vcIR3pg9yc/rendimientos) |
| 2026-07-20 | 342 | 98 | 98 | 0 | 1,901 | macuil=98 | [Crudos](http://localhost:8080/existencias-crudos/mKsfSsh5anEe5bh0A5iF) · [Embarque](http://localhost:8080/embarques/JqUZYW5LhWzp0S92bUTS/rendimientos) |
| 2026-07-22 | 0 | 137.5 | 275.2 | 137.7 | 1,763.5 | macuil laguna=137.5; macuil=137.7 | [Crudos](http://localhost:8080/existencias-crudos/kocIxTkNA9zc7hUfUYsz) · [Embarque](http://localhost:8080/embarques/KFLz6twyWXNbXs3z9V7x/rendimientos) |
| 2026-07-23 | 0 | 80 | 80 | 0 | 1,683.5 | macuil=80 | [Crudos](http://localhost:8080/existencias-crudos/7G24kAn41CAbWk581x2L) · [Embarque](http://localhost:8080/embarques/TP1uZXuIBSVnv7osQxP0/rendimientos) |
| 2026-07-24 | 0 | 156 | 156 | 0 | 1,527.5 | macuil=156 | [Crudos](http://localhost:8080/existencias-crudos/yw0oAAvQxqajeFw0STWC) · [Embarque](http://localhost:8080/embarques/CkLfsWtAZanBp7bSyxLt/rendimientos) |
| 2026-07-25 | 0 | 116.8 | 116.8 | 0 | 1,410.7 | macuil laguna=116.8 | [Crudos](http://localhost:8080/existencias-crudos/Ylkueg0V2HxkEl0myJxE) · [Embarque](http://localhost:8080/embarques/SmtqXwLb2SeDcwikcgMZ/rendimientos) |
| 2026-07-27 | 0 | 60 | 0 | -60 | 1,350.7 | macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/nxPnZp1hHjtnj6uYPa6u) · [Embarque](http://localhost:8080/embarques/iQJFExQa3MoCZYS3XhVf/rendimientos) |
| 2026-07-28 | 350 | 78 | 0 | -78 | 1,622.7 | macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/MBFtENmdwpsKa6fd675H) · [Embarque](http://localhost:8080/embarques/tBUPWiRpm1cZFn20MC7l/rendimientos) |
| 2026-07-30 | 286 | 101 | 0 | -101 | 1,807.7 | Sin categoría capturada | [Crudos](http://localhost:8080/existencias-crudos/Azu1Z2pQV7zkcUYJrKrm) |
| 2026-07-31 | 0 | 160 | 0 | -160 | 1,647.7 | Sin categoría capturada | [Crudos](http://localhost:8080/existencias-crudos/JAh202RCUmTV3a4t04T1) |
| 2026-08-01 | 0 | 100 | 0 | -100 | 1,547.7 | Sin categoría capturada | [Crudos](http://localhost:8080/existencias-crudos/EnJ0T6LD8B1t0cNXb1jM) |
| 2026-08-03 | 0 | 99 | 99 | 0 | 1,448.7 | macuil=99 | [Crudos](http://localhost:8080/existencias-crudos/Dx7HaA8gIBUNMapIXyJO) · [Embarque](http://localhost:8080/embarques/iffv6aDJd6yFepTWy3vE/rendimientos) |
| 2026-08-04 | 412 | 60 | 60 | 0 | 1,800.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/iXBWURIGmbPsO0rY8Xa8) · [Embarque](http://localhost:8080/embarques/G10DZotWJKCVxBfavJ3G/rendimientos) |
| 2026-08-06 | 228 | 180 | 180 | 0 | 1,848.7 | macuil=180; separado: macuil pac cc=65 | [Crudos](http://localhost:8080/existencias-crudos/nDxqHA7ZREaGUNhEAcj6) · [Embarque](http://localhost:8080/embarques/0M1JLtDdvNuWgIDMkyHO/rendimientos) |
| 2026-08-07 | 0 | 80 | 80 | 0 | 1,768.7 | macuil=80; separado: macuil pac cc=0 | [Crudos](http://localhost:8080/existencias-crudos/0QGDlURNDa3HrUF5bE54) · [Embarque](http://localhost:8080/embarques/Uo4Fg8LPVMiCP2xfckZi/rendimientos) |
| 2026-08-08 | 0 | 60 | 60 | 0 | 1,708.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/LwoKj0NnXMlZ4f9P91pW) · [Embarque](http://localhost:8080/embarques/sYOmhjlgtMgpvCJLD6al/rendimientos) |
| 2026-08-10 | 0 | 90 | 90 | 0 | 1,618.7 | macuil=90 | [Crudos](http://localhost:8080/existencias-crudos/Yus7crORCqEuPw5dNbCG) · [Embarque](http://localhost:8080/embarques/I9G9FdUHxWRStsbOaKPu/rendimientos) |
| 2026-08-11 | 214 | 100 | 100 | 0 | 1,732.7 | macuil=100 | [Crudos](http://localhost:8080/existencias-crudos/Y970RyW3MCPWU15ZaVz7) · [Embarque](http://localhost:8080/embarques/647u2IMwjpjIgvhADGkA/rendimientos) |
| 2026-08-12 | 0 | 100 | 100 | 0 | 1,632.7 | macuil=100 | [Crudos](http://localhost:8080/existencias-crudos/WsYnLDbWvRynU5MOoMlN) · [Embarque](http://localhost:8080/embarques/gsUGbzBlXLqiDQX2CPRe/rendimientos) |
| 2026-08-13 | 198 | 60 | 60 | 0 | 1,770.7 | macuil laguna=60; separado: macuil pac c/c=80 | [Crudos](http://localhost:8080/existencias-crudos/GApAru0VVGNrLXIf5X0T) · [Embarque](http://localhost:8080/embarques/j1FKIIFv4hgBlsJOavNU/rendimientos) |
| 2026-08-14 | 0 | 100 | 0 | -100 | 1,670.7 | macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/zYYCjhwRcfQTUTgmkID9) · [Embarque](http://localhost:8080/embarques/ktwOjXbyGK5fSZfZnK39/rendimientos) |
| 2026-08-15 | 0 | 100 | 0 | -100 | 1,570.7 | macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/CBiBAjDdzMy6nGoGbR8e) · [Embarque](http://localhost:8080/embarques/ON8NNDH5wAXQhlNJObAd/rendimientos) |
| 2026-08-18 | 282 | 160 | 160 | 0 | 1,692.7 | macuil=160 | [Crudos](http://localhost:8080/existencias-crudos/qLa6TADtxD9y1YsFtO7n) · [Embarque](http://localhost:8080/embarques/OelDhazwaqoa2uYExqVn/rendimientos) |
| 2026-08-19 | 0 | 0 | 60 | 60 | 1,692.7 | macuil=60 | [Embarque](http://localhost:8080/embarques/r9ruMQ63HiWWLQomvytl/rendimientos) |
| 2026-08-20 | 236 | 220 | 220 | 0 | 1,708.7 | macuil=220 | [Crudos](http://localhost:8080/existencias-crudos/GiMjAQCsxXt7NYZY8ixV) · [Embarque](http://localhost:8080/embarques/fX4m2EqtISsLDBUVL6Nt/rendimientos) |
| 2026-08-25 | 140 | 0 | 60 | 60 | 1,848.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/SPhZggiRLpGj4NxufaBe) · [Embarque](http://localhost:8080/embarques/FXC80Jo4ceuMo4JRFL6B/rendimientos) |
| 2026-08-26 | 0 | 160 | 160 | 0 | 1,688.7 | macuil=160 | [Crudos](http://localhost:8080/existencias-crudos/DcYI7GlM2pE6zx1H2Ggl) · [Embarque](http://localhost:8080/embarques/baj5crcoc7jovb6PvoAi/rendimientos) |
| 2026-08-27 | 115 | 0 | 0 | 0 | 1,803.7 | Sin categoría capturada | [Crudos](http://localhost:8080/existencias-crudos/YF4g5IZehv7hot0yCQHP) |
| 2026-08-28 | 0 | 160 | 160 | 0 | 1,643.7 | macuil laguna=160 | [Crudos](http://localhost:8080/existencias-crudos/32QlzILlsewszrvKZ69F) · [Embarque](http://localhost:8080/embarques/Fb3l6yChNBW5VGQrCsjW/rendimientos) |
| 2026-08-31 | 0 | 140 | 140 | 0 | 1,503.7 | macuil laguna=140 | [Crudos](http://localhost:8080/existencias-crudos/fRUFcV9BsPycwoA45FAg) · [Embarque](http://localhost:8080/embarques/pMS50zBS9YNkgVhiF2pX/rendimientos) |
| 2026-09-01 | 154 | 100 | 100 | 0 | 1,557.7 | macuil laguna=100 | [Crudos](http://localhost:8080/existencias-crudos/tvdNwbooGivaX7TBJ1pH) · [Embarque](http://localhost:8080/embarques/unRyLdAUihAPXcMOUMcj/rendimientos) |
| 2026-09-03 | 0 | 100 | 100 | 0 | 1,457.7 | macuil laguna=100; separado: macuil mar=102 | [Crudos](http://localhost:8080/existencias-crudos/wareyNRShnlknZGwxbcI) · [Embarque](http://localhost:8080/embarques/u9PAxP98oXPlYV3eDL4K/rendimientos) |
| 2026-09-04 | 0 | 70 | 60 | -10 | 1,387.7 | macuil laguna=60 | [Crudos](http://localhost:8080/existencias-crudos/uGmM3wrC4vJfGOBG449U) · [Embarque](http://localhost:8080/embarques/JhZVVEv2e525yCoj7l7o/rendimientos) |
| 2026-09-05 | 0 | 160 | 160 | 0 | 1,227.7 | macuil laguna=160 | [Crudos](http://localhost:8080/existencias-crudos/xF2KrKKqTc8xGFrJF1Is) · [Embarque](http://localhost:8080/embarques/xup2q57pkh484vwA67kK/rendimientos) |
| 2026-09-07 | 0 | 20 | 140 | 120 | 1,207.7 | macuil laguna=140; macuil=0 | [Crudos](http://localhost:8080/existencias-crudos/a6BG2hGwTPYVoj7tDyzo) · [Embarque](http://localhost:8080/embarques/fdVqvMtdhS5LxehBvy30/rendimientos) |
| 2026-09-08 | 0 | 80 | 60 | -20 | 1,127.7 | macuil=60 | [Crudos](http://localhost:8080/existencias-crudos/tCnzvG8ZEia1rj3RmUyH) · [Embarque](http://localhost:8080/embarques/3dBzJdsyB5abUMgtaBMA/rendimientos) |
| 2026-09-09 | 0 | 60 | 60 | 0 | 1,067.7 | macuil laguna=60 | [Crudos](http://localhost:8080/existencias-crudos/9jKWeSoQTKFU7H2Q3IaQ) · [Embarque](http://localhost:8080/embarques/1iVVlYorFBVqXrh9NAzo/rendimientos) |
| 2026-09-10 | 0 | 180 | 180 | 0 | 887.7 | macuil laguna=180 | [Crudos](http://localhost:8080/existencias-crudos/P9xIzCUYeVmANjUwhHaa) · [Embarque](http://localhost:8080/embarques/Sk7fmtNjLBRh3gEHDyMB/rendimientos) |
| 2026-09-11 | 0 | 20 | 0 | -20 | 867.7 | Sin categoría capturada | [Crudos](http://localhost:8080/existencias-crudos/ARAObLyLa2aVGUOuz9nX) |

## Entradas para contrastar con comprobantes y conteo físico

| Fecha | Entrada (kg) | Registro |
|---|---:|---|
| 2026-07-16 | 938 | [Ver entrada](http://localhost:8080/existencias-crudos/ch8ohTqxvDajmNsj0HgS) |
| 2026-07-17 | 759 | [Ver entrada](http://localhost:8080/existencias-crudos/hMTDLfQzu8uXP4ug6Se0) |
| 2026-07-20 | 342 | [Ver entrada](http://localhost:8080/existencias-crudos/mKsfSsh5anEe5bh0A5iF) |
| 2026-07-28 | 350 | [Ver entrada](http://localhost:8080/existencias-crudos/MBFtENmdwpsKa6fd675H) |
| 2026-07-30 | 286 | [Ver entrada](http://localhost:8080/existencias-crudos/Azu1Z2pQV7zkcUYJrKrm) |
| 2026-08-04 | 412 | [Ver entrada](http://localhost:8080/existencias-crudos/iXBWURIGmbPsO0rY8Xa8) |
| 2026-08-06 | 228 | [Ver entrada](http://localhost:8080/existencias-crudos/nDxqHA7ZREaGUNhEAcj6) |
| 2026-08-11 | 214 | [Ver entrada](http://localhost:8080/existencias-crudos/Y970RyW3MCPWU15ZaVz7) |
| 2026-08-13 | 198 | [Ver entrada](http://localhost:8080/existencias-crudos/GApAru0VVGNrLXIf5X0T) |
| 2026-08-18 | 282 | [Ver entrada](http://localhost:8080/existencias-crudos/qLa6TADtxD9y1YsFtO7n) |
| 2026-08-20 | 236 | [Ver entrada](http://localhost:8080/existencias-crudos/GiMjAQCsxXt7NYZY8ixV) |
| 2026-08-25 | 140 | [Ver entrada](http://localhost:8080/existencias-crudos/SPhZggiRLpGj4NxufaBe) |
| 2026-08-27 | 115 | [Ver entrada](http://localhost:8080/existencias-crudos/YF4g5IZehv7hot0yCQHP) |
| 2026-09-01 | 154 | [Ver entrada](http://localhost:8080/existencias-crudos/tvdNwbooGivaX7TBJ1pH) |

## Qué falta para cerrar el faltante

1. Confirmar el origen de los 60 kg del 19 y 25 de agosto y de los 140 kg del 7 de septiembre, y si alguna salida se anotó en otra fecha. Revisar primero el 7 de septiembre, que identifica explícitamente Macuil Laguna.
2. Revisar el origen del Macuil del 16 de julio y la posible clave residual del 22 de julio.
3. Si se confirman los 240 kg como omisiones, contrastar los **627.7 kg restantes** con conteo físico, comprobantes de entrada (incluidos los primeros 938 y 759 kg), otras salidas o ajustes, y consumos pendientes del 12 de septiembre. No hay evidencia suficiente en esta comparación para asignar una causa al resto.

El saldo de 867.7 kg también se verificó reproduciendo la lógica de distribución por precio y cuarto de ExistenciasCrudos.vue: coincide con entradas menos salidas y no hubo kilos de salidas ignorados por falta de saldo para este producto. Las sumas se verificaron independientemente con aritmética decimal.
