const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
    name: String, // Nombre de la serie
    description: String, // Descripción de la serie
    comics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comic' }] // Referencia a los cómics
}, { collection: 'series_info' }); // Nombre de la colección en MongoDB

module.exports = mongoose.model('Series', seriesSchema);