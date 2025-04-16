const express = require('express');
const router = express.Router();
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

      const comics = await Comic.find({
          $or: [
              { title: { $regex: pattern, $options: 'i' } },
              { volume: { $regex: pattern, $options: 'i' } }
          ]
      });

      res.render('index', {
          isHome: false,
          category: `Resultados de búsqueda: "${query}"`,
          comics
      });
  } catch (err) {
      console.error(err);
      res.status(500).send('Error al realizar la búsqueda');
  }
});

// Función para obtener cómics aleatorios
const getRandomComics = async (query, limit) => {
    const comics = await Comic.aggregate([
        { $match: query },
        { $sample: { size: limit } }
    ]);
    return comics;
};

// Ruta principal
router.get('/', async (req, res) => {
    try {
        // Obtener cómics aleatorios para cada sección
        const destacados = await getRandomComics({}, 8);
        const marvel = await getRandomComics({ editorial: 'Marvel' }, 8);
        const dc = await getRandomComics({ editorial: 'DC' }, 8);
        const indie = await getRandomComics({ editorial: 'Indie' }, 8);
        const manga = await getRandomComics({ editorial: 'Manga' }, 8);

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

// Ruta para Marvel mostrando solo #01 por serie
router.get('/marvel', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Obtener series únicas con al menos un #01
    const volumes = await Comic.distinct('volume', { 
      editorial: 'Marvel',
      title: { $regex: /#01/, $options: 'i' } 
    });
    const total = volumes.length;
    const totalPages = Math.ceil(total / limit);

    const comics = await Comic.aggregate([
      { 
        $match: { 
          editorial: 'Marvel',
          title: { $regex: /#01/, $options: 'i' } 
        } 
      },
      { $sort: { volume: 1, createdAt: 1 } },
      { $group: { _id: "$volume", comic: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$comic" } },
      { $sort: { volume: 1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    res.render('editoriales', { 
      isHome: false,
      editorial: 'Marvel',
      comics,
      currentPage: page,
      totalPages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar los cómics de Marvel');
  }
});

// Ruta para DC mostrando solo #01 por serie
router.get('/dc', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const volumes = await Comic.distinct('volume', { 
      editorial: 'DC',
      title: { $regex: /#01/, $options: 'i' } 
    });
    const total = volumes.length;
    const totalPages = Math.ceil(total / limit);

    const comics = await Comic.aggregate([
      { 
        $match: { 
          editorial: 'DC',
          title: { $regex: /#01/, $options: 'i' } 
        } 
      },
      { $sort: { volume: 1, createdAt: 1 } },
      { $group: { _id: "$volume", comic: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$comic" } },
      { $sort: { volume: 1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    res.render('editoriales', { 
      isHome: false,
      editorial: 'DC',
      comics,
      currentPage: page,
      totalPages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar los cómics de DC');
  }
});

// Ruta para Indie mostrando solo #01 por serie
router.get('/indie', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const volumes = await Comic.distinct('volume', { 
      editorial: 'Indie',
      title: { $regex: /#01/, $options: 'i' } 
    });
    const total = volumes.length;
    const totalPages = Math.ceil(total / limit);

    const comics = await Comic.aggregate([
      { 
        $match: { 
          editorial: 'Indie',
          title: { $regex: /#01/, $options: 'i' } 
        } 
      },
      { $sort: { volume: 1, createdAt: 1 } },
      { $group: { _id: "$volume", comic: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$comic" } },
      { $sort: { volume: 1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    res.render('editoriales', { 
      isHome: false,
      editorial: 'Indie',
      comics,
      currentPage: page,
      totalPages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar los cómics independientes');
  }
});

// Ruta para Manga mostrando solo #01 por serie
router.get('/manga', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const volumes = await Comic.distinct('volume', { 
      editorial: 'Manga',
      title: { $regex: /#01/, $options: 'i' } 
    });
    const total = volumes.length;
    const totalPages = Math.ceil(total / limit);

    const comics = await Comic.aggregate([
      { 
        $match: { 
          editorial: 'Manga',
          title: { $regex: /#01/, $options: 'i' } 
        } 
      },
      { $sort: { volume: 1, createdAt: 1 } },
      { $group: { _id: "$volume", comic: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$comic" } },
      { $sort: { volume: 1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    res.render('editoriales', { 
      isHome: false,
      editorial: 'Manga',
      comics,
      currentPage: page,
      totalPages
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar los mangas');
  }
});

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

// Ruta para ver detalles de un cómic
router.get('/comic/:id', async (req, res) => {
    try {
        const comic = await Comic.findById(req.params.id);
        if (!comic) {
            return res.status(404).send('Cómic no encontrado');
        }

// Obtener cómics relacionados con prioridad
const relacionados = await Comic.aggregate([
  {
      $match: {
          _id: { $ne: comic._id },
          $or: [
              { volume: comic.volume },
              { 
                  $and: [
                      { title: { $regex: `^${comic.title.split(' ')[0]}`, $options: 'i' } }, // Título similar
                      { volume: { $ne: comic.volume } }
                  ]
              },
              { editorial: comic.editorial }
          ]
      }
  },
  {
      $addFields: {
          priority: {
              $switch: {
                  branches: [
                      { case: { $eq: ["$volume", comic.volume] }, then: 3 },
                      { case: { $regexMatch: { input: "$title", regex: `^${comic.title.split(' ')[0]}`, options: "i" } }, then: 2 },
                      { case: { $eq: ["$editorial", comic.editorial] }, then: 1 }
                  ],
                  default: 0
              }
          }
      }
  },
  { $sort: { priority: -1, createdAt: -1 } },
  { $limit: 6 }
]);

res.render('comic', { comic, relacionados });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar el cómic');
    }
});

// Ruta para la página de la serie
router.get('/series/:name', async (req, res) => {
    try {
        const series = await Series.findOne({ name: req.params.name }).populate('comics');
        if (!series) {
            return res.status(404).send('Serie no encontrada');
        }
        res.render('series', { series });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar la serie');
    }
});

// Ruta para el lector web
router.get('/comic/:id/read', async (req, res) => {
    try {
        const comic = await Comic.findById(req.params.id);
        if (!comic) {
            return res.status(404).send('Cómic no encontrado');
        }
        res.render('comic-reader', { comic });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar el cómic');
    }
});

// Ruta para servir ads.txt
router.get('/ads.txt', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'ads.txt'));
});

module.exports = router;