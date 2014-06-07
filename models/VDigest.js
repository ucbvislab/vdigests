var mongoose = require('mongoose');
var User = require('./User');
var ShortId = require('mongoose-minid');

var vdSchema = new mongoose.Schema({
  _id: ShortId,
  ytid: String,
  rawTransName: String,
  preAlignTrans: [{speaker: String, line: String}],
  videoName: String,
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
  return this.curState > 1;
};

vdSchema.methods.isReady = function () {
  return this.curState === 1;
};


module.exports = mongoose.model('VDigest', vdSchema);
