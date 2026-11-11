# Firma de distribución de la APK (Android)

La APK que se publica en GitHub Releases va firmada con un keystore de distribución.
Android solo deja actualizar una app instalada con un APK firmado con **la misma llave**,
así que este keystore no se puede perder ni cambiar: si se pierde, la app instalada
ya no se puede actualizar y habría que desinstalarla y volver a instalar.

## El keystore

- Archivo: `reypez-release.keystore` (JKS), alias `reypez`, RSA 2048, válido 10,000 días.
- **No está en el repo ni debe subirse a Git.** Hay una copia guardada en 1Password
  (Allan) y su contenido en base64 en el secreto `ANDROID_KEYSTORE_BASE64` del repo.
- Generarlo de nuevo (solo si se pierde todo y se asume que habrá que reinstalar):
  ```sh
  keytool -genkeypair -keystore reypez-release.keystore -alias reypez \
    -keyalg RSA -keysize 2048 -validity 10000
  ```

## Secretos en GitHub

Settings → Secrets and variables → Actions → New repository secret:

| Secreto | Contenido |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 reypez-release.keystore` (una sola línea) |
| `ANDROID_KEYSTORE_PASSWORD` | Contraseña del keystore |
| `ANDROID_KEY_ALIAS` | `reypez` |
| `ANDROID_KEY_PASSWORD` | Contraseña de la llave |

Las contraseñas no se pueden ver después en GitHub (solo sobreescribir), por eso
también están guardadas junto al keystore en 1Password.

## Publicar una APK

`.github/workflows/android-release.yml`: a mano en Actions → APK Android → Run workflow,
o creando la etiqueta `android-v<versión>` (`git tag android-v0.3.20 && git push origin
android-v0.3.20`). El workflow compila con `npm run android:apk:release`, verifica la
firma con `apksigner` y sube el APK a la release `android-v<versión>`.

## Primera instalación

La APK vieja de solo Inventarios estaba firmada con la llave debug de una computadora,
así que la APK firmada **no se instala encima**: hay que desinstalar Inventarios primero
y después instalar la APK de la release. Antes de desinstalar, abrir la app con internet
y dejar que se sincronicen los pendientes (Embarques → Respaldos); los datos ya
sincronizados viven en Firebase y no se pierden. Las instalaciones que ya recibieron
la app completa por el aviso de actualización dentro de la app no necesitan reinstalar
nada: siguen actualizándose solas.
