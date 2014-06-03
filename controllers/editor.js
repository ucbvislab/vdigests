/**
 * GET /editing-interface
 * Video digest editing interface
 */
/*global require exports*/
var secrets = require('../config/secrets');
var User = require('../models/User');
var async = require('async');
var fs = require('fs');
var youtubedl = require('youtube-dl');
var formidable = require('formidable');
var tmpDir = "/tmp/fsuploads";
var util = require('util');



exports.getEditor = function(req, res) {
  res.render('editor', {
    title: 'Video Digest Editor'
  });
};

exports.postNewVD = function(req, res) {
  req.assert('yturl', 'YouTube URL is not a valid URL').isURL();
    var form = new formidable.IncomingForm();
    form.uploadDir = tmpDir;
    form.parse(req, function(err, fields, files) {
      // TODO figure out file size limits, file checking, etc
      // need to download the youtube video if it doesn't exist
      // need to convert the transcript
      // TODO first check if video exists
      // TODO -- don't download until we need a screenshot

      debugger;
      var video = youtubedl(fields.yturl,
                            // Optional arguments passed to youtube-dl.
                            ['--max-quality=12'],
                            // Additional options can be given for calling `child_process.execFile()`.
                            { cwd: tmpDir});

      // Will be called when the download starts.
      if (files.tranupload) {
        video.pipe(fs.createWriteStream(tmpDir + '/tmpvid.mp4'));
        res.writeHead(200, {'content-type': 'application/json'});
        res.write('{"contentid": "HansRosling"}');
        res.end();
      } else {
        // TODO check for existing transcript
        // obtain video info and save to DB if video does not exist
        // TODO handle incorrect urls
        video.on('info', function(info) {
          res.writeHead(200, {'content-type': 'application/json'});
          res.write(JSON.stringify(info));
          res.end();
        });
      }
    });
  return;
};
