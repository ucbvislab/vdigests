
/*global require exports*/

var mongoose = require('mongoose'),
    User = require('./User'),
    ShortId = require('mongoose-minid'),
    spaths = require('../config/settings').paths,
    path = require('path'),
    pathUtils = require('../utils/fpaths');

var vdSchema = new mongoose.Schema({
  _id: { type: ShortId, length: 7},
  ytid: String,
  pubdisplay: {type: Boolean, default: false},
  rawTransName: String,
  sentSepTransName: String,
  nSentences: Number,
  preAlignTrans: [{speaker: String, line: String}],
  videoName: String,
  videoLength: Number,
  puburl: {
    type: String,
    unique: true,
    sparse: true
  },
  audioName: String,
  alignTrans:{words: [{"start": Number,
                       "speaker": Number,
                       "end": Number,
                       "word": String,
                       "sentenceNumber": Number,
                       "alignedWord": String}]
             },
  uploadDate: {type: Date, default: Date.now},
  uploadUser: {type: mongoose.Schema.ObjectId, ref: "User"},
  state: {type: Number, default: 0},
  // TODO DB migration after migrating old data
  digest: {
    author: String,
    title: {
      type: String,
    default: "Video Digest"
    },
    chapters: [{
      title: String,
      start: Number,
      end: Number,
      ytid: String,
      sections: [{
        end: Number,
        start: Number,
        summary: [String],
        thumbnail: {
          time: Number,
          data: String
        }
    }]}]
  }
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

vdSchema.methods.getSSFile = function () {
  return pathUtils.getSSTransFile(this._id);
};

  
module.exports = mongoose.model('VDigest', vdSchema);
