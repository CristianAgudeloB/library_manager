const express = require('express');
const router = express.Router();
const Comic = require('../models/comic');
const Series = require('../models/series');

// Ruta para buscar cómics
router.get('/buscar', async (req, res) => {
    try {
        const query = req.query.q; // Obtener el término de búsqueda
        const comics = await Comic.find({
            $or: [
                { title: { $regex: query, $options: 'i' } }, // Buscar por título
                { volume: { $regex: query, $options: 'i' } } // Buscar por volumen
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
        { $match: query }, // Filtra por la consulta (editorial o destacados)
        { $sample: { size: limit } } // Selecciona aleatoriamente
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

        res.render('index', {
            isHome: true,
            destacados,
            marvel,
            dc,
            indie
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

// Ruta para Novedades
router.get('/novedades', async (req, res) => {
    try {
      const comics = await Comic.find().sort({ _id: -1 }).limit(20);
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

        // Obtener cómics relacionados (misma editorial o título similar)
        const relacionados = await Comic.find({
            $or: [
                { editorial: comic.editorial }, // Misma editorial
                { title: { $regex: comic.title.split(' ')[0], $options: 'i' } } // Título similar
            ],
            _id: { $ne: comic._id } // Excluir el cómic actual
        }).limit(6); // Limitar a 4 cómics relacionados

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

module.exports = router;