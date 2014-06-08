
/*global require exports*/

var mongoose = require('mongoose'),
    User = require('./User'),
    ShortId = require('mongoose-minid'),
    spaths = require('../config/settings').paths,
    path = require('path'),
    pathUtils = require('../utils/fpaths');

var vdSchema = new mongoose.Schema({
  _id: ShortId,
  ytid: String,
  rawTransName: String,
  preAlignTrans: [{speaker: String, line: String}],
  videoName: String,
  videoLength: Number,
  audioName: String,
  alignTrans:{words: [{"start": Number,
                       "speaker": Number,
                       "end": Number,
                       "word": String,
                       "alignedWord": String}]
             },
  uploadDate: {type: Date, default: Date.now},
  uploadUser: {type: mongoose.Schema.ObjectId, ref: "User"},
  state: {type: Number, default: 0},
  digest: Object
});

vdSchema.methods.isProcessing = function () {
  return this.state > 1;
};

vdSchema.methods.isReady = function () {
  return this.state === 1;
};

vdSchema.methods.getVideoFile = function () {
  return pathUtils.getVideoFile(this.videoName);
};

vdSchema.methods.getAudioFile = function () {
  return pathUtils.getVideoFile(this.audioName);
};

module.exports = mongoose.model('VDigest', vdSchema);
