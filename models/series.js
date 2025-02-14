const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
    name: String, // Nombre de la serie
    description: String, // Descripción de la serie
    comics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comic' }]
}, { collection: 'series_info', timestamps: true });

module.exports = mongoose.model('Series', seriesSchema);