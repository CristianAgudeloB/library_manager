const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Comic = require('../models/comic');
const Series = require('../models/series');
const path = require('path');

function buildFlexibleRegex(query) {
  const escapeRegex = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

  if (/^[A-Za-z0-9]+$/.test(query)) {
    return query.split('').map(c => escapeRegex(c)).join('[-\\s\\/]*');
  } else {
    const words = query.split(/\s+/);
    return words.map(word => escapeRegex(word)).join('[-\\s\\/]*');
  }
}

// Helper: cómics aleatorios desde Comic directamente
const getRandomComics = async (query, limit) => {
  return await Comic.aggregate([
    { $match: query },
    { $sample: { size: limit } }
  ]);
};

// Helper: cómics aleatorios filtrados por editorial en Series
const getRandomComicsByEditorial = async (editorial, limit) => {
  const seriesList = await Series.find({ editorial })
    .populate('comics');
  const allComics = seriesList.flatMap(s => s.comics);
  return allComics.sort(() => 0.5 - Math.random()).slice(0, limit);
};

// Ruta para buscar cómics
router.get('/buscar', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.render('index', {
        isHome: false,
        category: 'No se ha ingresado ningún término de búsqueda',
        comics: []
      });
    }

    const pattern = buildFlexibleRegex(query);

    // Buscar en título y volumen
    const byText = await Comic.find({
      $or: [
        { title: { $regex: pattern, $options: 'i' } },
        { volume: { $regex: pattern, $options: 'i' } }
      ]
    });

    // Buscar series por editorial y luego sus cómics
    const seriesMatch = await Series.find({ editorial: { $regex: pattern, $options: 'i' } });
    const fromSeries = seriesMatch.length
      ? await Comic.find({ _id: { $in: seriesMatch.flatMap(s => s.comics) } })
      : [];

    // Unir resultados y eliminar duplicados
    const all = [...byText, ...fromSeries];
    const unique = [];
    const seen = new Set();
    all.forEach(c => {
      if (!seen.has(c._id.toString())) {
        seen.add(c._id.toString());
        unique.push(c);
      }
    });

    res.render('index', {
      isHome: false,
      category: `Resultados de búsqueda: "${query}"`,
      comics: unique
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al realizar la búsqueda');
  }
});

// Ruta principal
router.get('/', async (req, res) => {
  try {
    const destacados = await getRandomComics({}, 8);
    const marvel     = await getRandomComicsByEditorial('Marvel', 8);
    const dc         = await getRandomComicsByEditorial('DC', 8);
    const indie      = await getRandomComicsByEditorial('Indie', 8);
    const manga      = await getRandomComicsByEditorial('Manga', 8);

    res.render('index', {
      isHome: true,
      destacados,
      marvel,
      dc,
      indie,
      manga
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar los cómics');
  }
});

// Generador de rutas por editorial (#01 por serie)
async function handleEditorial(req, res, editorial) {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip  = (page - 1) * limit;

    // 1) Traer series por editorial ordenadas alfabéticamente por name
    const allSeries = await Series.find({ editorial }).sort({ name: 1 })
      .populate({
        path: 'comics',
        match: { title: { $regex: /#01/, $options: 'i' } },
        options: { sort: { volume: 1, createdAt: 1 } }
      });

    // 2) Obtener del primer tomo de cada serie
    let comics01 = allSeries
      .map(s => s.comics[0])
      .filter(c => c);

    // 3) Orden alfabético por volume (o título si prefieres):
    comics01 = comics01.sort((a, b) => a.volume.localeCompare(b.volume));

    // 4) Paginación
    const total      = comics01.length;
    const totalPages = Math.ceil(total / limit);
    const pageComics = comics01.slice(skip, skip + limit);

    res.render('editoriales', {
      isHome: false,
      editorial,
      comics: pageComics,
      currentPage: page,
      totalPages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(`Error al cargar los cómics de ${editorial}`);
  }
}

router.get('/marvel', (req, res) => handleEditorial(req, res, 'Marvel'));
router.get('/dc',     (req, res) => handleEditorial(req, res, 'DC'));
router.get('/indie',  (req, res) => handleEditorial(req, res, 'Indie'));
router.get('/manga',  (req, res) => handleEditorial(req, res, 'Manga'));

// Ruta para Novedades
router.get('/novedades', async (req, res) => {
  try {
    const comics = await Comic.find().sort({ _id: -1 }).limit(50);
    res.render('index', {
      isHome: false,
      category: 'Novedades',
      comics
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar las novedades');
  }
});

// Ruta para la página de El Corps
router.get('/el-corps', (req, res) => {
  res.render('el-corps');
});

// Detalle de un cómic + relacionados
router.get('/comic/:id', async (req, res) => {
  try {
    const comic = await Comic.findById(req.params.id);
    if (!comic) return res.status(404).send('Cómic no encontrado');

    // Encuentra editorial vía Series
    const parent = await Series.findOne({ comics: comic._id });
    const editorial = parent ? parent.editorial : null;

    // IDs de todos los cómics en esa editorial
    const editorialIds = editorial
      ? await Series.find({ editorial }).distinct('comics')
      : [];

    const objectIds = editorialIds.map(id => new mongoose.Types.ObjectId(id));

    const relacionados = await Comic.aggregate([
      { $match: {
          _id: { $ne: comic._id },
          $or: [
            { volume: comic.volume },
            {
              $and: [
                { title: { $regex: `^${comic.title.split(' ')[0]}`, $options: 'i' } },
                { volume: { $ne: comic.volume } }
              ]
            },
            ...(editorial
              ? [{ _id: { $in: objectIds } }]
              : [])
          ]
      }},
      { $addFields: {
          priority: {
            $switch: {
              branches: [
                { case: { $eq: ["$volume", comic.volume] }, then: 3 },
                { case: { $regexMatch: { input: "$title", regex: `^${comic.title.split(' ')[0]}`, options: "i" } }, then: 2 },
                { case: { $in: ["$_id", objectIds] }, then: 1 }
              ],
              default: 0
            }
          }
      }},
      { $sort: { priority: -1, createdAt: -1 } },
      { $limit: 6 }
    ]);

    res.render('comic', { comic, relacionados });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar el cómic');
  }
});

// Página de Serie
router.get('/series/:name', async (req, res) => {
  try {
    const series = await Series.findOne({ name: req.params.name }).populate('comics');
    if (!series) return res.status(404).send('Serie no encontrada');
    res.render('series', { series });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar la serie');
  }
});

// Lector web
router.get('/comic/:id/read', async (req, res) => {
  try {
    const comic = await Comic.findById(req.params.id);
    if (!comic) return res.status(404).send('Cómic no encontrado');
    res.render('comic-reader', { comic });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar el cómic');
  }
});

// Ads.txt
router.get('/ads.txt', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'ads.txt'));
});

module.exports = router;
