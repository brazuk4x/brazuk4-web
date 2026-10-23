# 🚀 Brazuk4 Web Loader

**Brazuk4 Web Loader** es una plataforma moderna para subir, desplegar y visualizar páginas y proyectos web instantáneamente con enlaces personalizados y rutas públicas aleatorias.

---

## ✨ Características Principales

1. **Paso 1 - Nombre Personalizado**: 
   - Escribe el nombre de tu página web y presiona `Enter ↵` o el botón de flecha `→`.
2. **Paso 2 - Zona "Drop here your project"**: 
   - Arrastra y suelta tu carpeta completa, archivo `.ZIP` o tus archivos `index.html`, `style.css` y `script.js`.
   - También puedes pulsar para seleccionar archivos o carpeta directamente.
3. **Paso 3 - Barra de Carga & Progreso**: 
   - Animación visual de despliegue con porcentaje en tiempo real y lectura de recursos.
4. **Paso 4 - Enlace Público Personalizado**: 
   - Genera tu enlace con ruta aleatoria tipo:  
     `/p/tu-nombre/asdjsdasd1asdas/asdasd1asdasd/1sasd`
   - Botón directo para copiar enlace y abrir la web en vivo.
5. **Dashboard de Proyectos Subidos**: 
   - Vista en cuadrícula con todas tus páginas publicadas.
   - Botón **Actualizar**: para mandar nuevos archivos y actualizar tu web conservando el mismo enlace.
   - Botón **Ver Web**: previsualizador con modos responsive (Escritorio, Tablet y Móvil).
   - Botón **Descargar ZIP**: exporta todo el código de tu proyecto cuando quieras.
   - Botón **Eliminar**: borra proyectos que ya no necesites.
6. **Botón Superior "+ Make a new web"**: 
   - Con un solo clic reinicia el asistente para crear otra página web desde cero.

---

## 🛠️ Cómo Subir este Proyecto a GitHub y Vercel

### 1. Subir a GitHub
Abre la terminal en la carpeta del proyecto y ejecuta:

```bash
# Inicializar repositorio git
git init

# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "feat: Brazuk4 Web Loader inicial"

# Crear tu rama principal
git branch -M main

# Conectar con tu repositorio en GitHub (reemplaza con tu URL de GitHub)
git remote add origin https://github.com/TU-USUARIO/webpagesloader.git

# Subir los archivos
git push -u origin main
```

### 2. Desplegar en Vercel (En 1 Minuto)
1. Ve a [vercel.com](https://vercel.com/) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** -> **"Project"**.
3. Selecciona tu repositorio recién subido (`webpagesloader`).
4. En la configuración del proyecto, Vercel detectará automáticamente que es un proyecto web estático con `vercel.json`.
5. Haz clic en **"Deploy"**.
6. ¡Listo! En menos de 30 segundos tu plataforma **Brazuk4 Web Loader** estará 100% en vivo con HTTPS gratuito.

---

## 🌐 Tecnologías Utilizadas
- **HTML5 & CSS3** con diseño Glassmorphism y Dark Cyber Aesthetic.
- **Tailwind CSS CDN** para estilos ultra-rápidos y responsivos.
- **FontAwesome CDN** para iconografía moderna.
- **JSZip CDN** para descompresión y empaquetado automático de archivos ZIP.
- **IndexedDB API** para almacenamiento persistente local de proyectos y recursos sin límites de tamaño.
- **Virtual Blob Filesystem** en `view.html` para renderizado dinámico con soporte de rutas relativas de CSS, JS e imágenes.
