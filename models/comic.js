const mongoose = require('mongoose');

const comicSchema = new mongoose.Schema({
    title: String,
    coverUrl: String,
    volume: String,
    downloadUrls: [String],
    descripcion: String,
    traductor: String,
    maqueta: String,
    corrector: String,
    pages: [String]
}, { collection: 'Library Info', timestamps: true });

module.exports = mongoose.model('Comic', comicSchema);