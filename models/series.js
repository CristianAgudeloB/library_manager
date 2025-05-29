const mongoose = require('mongoose');

const seriesSchema = new mongoose.Schema({
    name: String,
    description: String,
    comics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comic' }],
    editorial: String
}, { collection: 'series_info', timestamps: true });

module.exports = mongoose.model('Series', seriesSchema);