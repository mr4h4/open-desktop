# Open Desktop Server
Este es un servidor ligero basado en Node.js diseñado para exponer una carpeta local al público, permitiendo la visualización y descarga de su contenido de forma remota o local.

## 🚀 Requisitos Previos
Antes de comenzar, asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (Versión LTS recomendada)
- npm (se instala automáticamente con Node)

## 🛠️ Instalación y Configuración
Sigue estos pasos para configurar el proyecto en tu entorno local:

### 1. Clonar o descargar el proyecto
Si has descargado el archivo ZIP, extráelo en tu carpeta de preferencia.

### 2. Configurar variables de entorno
Crea un archivo llamado `.env` en la raíz del proyecto y añade las siguientes variables con tus credenciales:

```env
PORT=3000
AUTH_USER=tu_usuario
AUTH_PASS=tu_contraseña
ROOT_DIR=./open-desktop
