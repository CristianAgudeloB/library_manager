const mongoose = require('mongoose');

const comicSchema = new mongoose.Schema({
    title: String,
    coverUrl: String,
    volume: String,
    downloadUrls: [String],
    editorial: String,
    descripcion: String,
    traductor: String,
    maqueta: String,
    corrector: String
}, { collection: 'Library Info' });

module.exports = mongoose.model('comic', comicSchema);