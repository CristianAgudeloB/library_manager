// app.js

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
const sharp = require('sharp');
const axios = require('axios');               // ← Usamos axios en vez de node-fetch

const indexRouter = require('./routes/index');

const app = express();

// — Motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// — Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.error('Error conectando a MongoDB:', err));

/**
 * transformImage(buffer, { width, quality, format })
 */
function transformImage(inputBuffer, { width = 220, quality = 60, format = 'webp' } = {}) {
  let pipeline = sharp(inputBuffer)
    .rotate()
    .resize({ width, withoutEnlargement: true });

  switch (format) {
    case 'png':
      pipeline = pipeline.png({ compressionLevel: Math.round((100 - quality) / 10) });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true, progressive: true });
      break;
    case 'webp':
    default:
      pipeline = pipeline.webp({ quality });
      break;
  }

  return pipeline;
}

/**
 * RUTA /img?url=…&w=…&q=…&f=…
 */
app.get('/img', async (req, res, next) => {
  try {
    const { url, w, q, f } = req.query;

    if (!url) {
      return res.status(400).send('Parámetro "url" es obligatorio');
    }

    // Validar protocolo
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).send('URL inválida');
    }

    const width   = parseInt(w, 10) || 220;
    const quality = parseInt(q, 10) || 60;
    const format  = (f || 'webp').toLowerCase();

    // 1) Descargar imagen remota con axios
    const axiosRes = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (axiosRes.status !== 200) {
      console.error('Error al descargar:', axiosRes.status, axiosRes.statusText);
      return res.status(502).send('Error al descargar la imagen remota');
    }

    const buffer = Buffer.from(axiosRes.data, 'binary');

    // 2) Procesar con Sharp
    const transformer = transformImage(buffer, { width, quality, format });

    // Capturar errores de Sharp
    transformer.on('error', (err) => {
      console.error('Error en Sharp pipeline:', err);
      next(err);
    });

    // 3) Devolver resultado
    res.type(`image/${format}`);
    res.set('Cache-Control', 'public, max-age=86400'); // 1 día
    transformer.pipe(res);

  } catch (err) {
    console.error('Error en /img route:', err);
    next(err);
  }
});

// — Middleware estático para CSS/JS/icons…
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// — Rutas de tu app
app.use('/', indexRouter);

// — Levanta servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
