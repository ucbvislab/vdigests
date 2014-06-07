/**
 * GET /editing-interface
 * Video digest editing interface
 */
/*global require exports*/
var fs = require('fs'),
    ytdl = require('ytdl'),
    multiparty = require('multiparty'),
    url = require('url'),
    sys = require('sys'),
    exec = require('child_process').exec,
    util = require('util'),
    querystring = require('querystring'),
    path = require('path'),
    settings = require('../config/settings'),
    VDigest = require('../models/VDigest'),
    spaths = settings.paths;

var returnError = function (res, errMsg, errCode) {
  errCode = errCode || 400;
  res.writeHead(errCode, {'content-type': 'application/json'});
  res.end('{"error":"' + errMsg + '"}' );
  return;
};

/**
 * Returns the editor js template (TODO consider bootstraping data)
 */
exports.getEditor = function(req, res) {
  res.render('editor', {
    title: 'Video Digest Editor'
  });
};

/**
 * Returns the digest data needed for the editor
 */
exports.getDigestData = function (req, res) {
  var uparsed = url.parse(req.url),
      did = uparsed.query && querystring.parse(uparsed.query).id;
  VDigest.findById(did, function (err, vd) {
    if (err || !vd) {
      returnError(res, "unable to load the specified video digest data");
    }
    else if (vd.state !== 1) {
      returnError(res, "the video digest is currently processing");
    } else {
      res.writeHead(200, {"content-type": "application/json"});
      debugger;
      res.end(JSON.stringify({"transcript": vd.alignTrans, "ytid": vd.ytid}));
    }
  });
};

exports.postNewVD = function(req, res) {
  req.assert('yturl', 'YouTube URL is not a valid URL').isURL();
  var form = new multiparty.Form({
    maxFilesSize: settings.maxTransUploadSize,
    uploadDir: spaths.rawTrans
  });

  form.parse(req, function (err, fields, files) {
    if (err) {
      returnError(res, err.message);
      return;
    }

    // TODO check yturl
    var ytparsed = url.parse(fields.yturl && fields.yturl[0]),
        ytid = ytparsed.query && querystring.parse(ytparsed.query).v;
    if (!(ytparsed.hostname === "youtube.com" || ytparsed.hostname === "www.youtube.com") || !ytid) {
      //  TODO return informative messages to the user (how to do this?)
      returnError(res, "you must proivde a YouTube url in the format: http://www.youtube.com/watch?v=someIdValue");
      return;
    }
    var ytaddr = "http://www.youtube.com/watch?v=" + ytid;

    if (files.tranupload) {
      var sendGoodResponse = function () {
        // TODO add user to the model
        // read the text so we can store it into
        var fp = files.tranupload[0].path.split(path.sep),
            tfname = fp[fp.length - 1];
        var vd = new VDigest({ytid: ytid, rawTransName: tfname, videoName: ytid});
        vd.save(function (err) {
          if (err) {
            returnError(res, "problem saving video digest to the database -- please try again");
            return;
          } else {
            res.writeHead(200, {'content-type': 'application/json'});
            res.write('{"intrmid":"' + vd._id +'"}');
            res.end();
            return;
          }
        });
      };

      // download the yt video
      fs.exists(path.join(spaths.videos, ytid + ".mp4"), function (exists) {
        if (exists) {
          sendGoodResponse();
        } else {
          var video = ytdl(ytaddr, {filter: function(format) { return format.container === 'mp4'; } }),
              vidWS = fs.createWriteStream(path.join(spaths.videos, ytid + '.mp4'));
          vidWS.on("close", sendGoodResponse);
          vidWS.on("error", function () {
            returnError(res, "unable to load the YouTube video properly");
          });
          video.pipe(vidWS);
        }
      });

    } else if (fields.intrmid && fields.intrmid[0]) {
      if (!Number(fields.createdigest[0])) {
        returnError(res, "you must select 'yes' to continue");
        return;
      }
      var intrmid = fields.intrmid[0];
      // set the state to 2
      // first clean the text
      VDigest.findById(intrmid, function (err1, vdigest) {
        if (err1 || !vdigest || !vdigest.rawTransName || ! vdigest.videoName) {
          returnError(res, "encountered a problem loading the video digest data: please try resubmitting");
          return;
        }
        vdigest.state = 2;
        vdigest.save();

        var vname = vdigest.videoName,
            aname = vname,
            inVideoFile = path.join(spaths.videos, vname + ".mp4"),
            outAudioFile = path.join(spaths.audio, aname + ".wav"),
            outAlignTrans = path.join(spaths.tmp, aname + "_aligned.json"),
            state = 0;
        //
        // Clean up the text
        //
        var rtxtfile = path.join(spaths.rawTrans, vdigest.rawTransName);
        fs.readFile(rtxtfile, 'utf8', function (err2, data) {
          if (err2) {
            returnError(res, "encountered a problem processing the transcript: is it a plain text file?");
            return;
          }

          var paragraphs = data.split("\n\n"),
              out = [],
              line;
          paragraphs.forEach(function (para, i) {
            para = para.replace("\n", " ");
            para = para.replace(/\(laughter\)/ig, "");
            para = para.replace(/\(applause\)/ig, "");
            para = para.replace(/[^-\w,.?!' ]/g, "");
            para = para.replace(/\s+[^\w]\s+/g, "");
            para = para.replace(/\s+/g, " ");
            if (para !== "") {
              line = {
                speaker: "1",
                "line": para
              };
              out.push(line);
            }
          });
          vdigest.preAlignTrans = out;
          vdigest.save(function (err) {
            if (err) {
              returnError(res, "encountered a problem processing the transcript: is it a plain text file?");
              return;
            }
            console.log("transcript is finished");
            if (state === 3) {
              alignTranscript();
            } else {
              state = 3;
              vdigest.state = state;
              vdigest.save();
            }
          });
        });

        //
        // Extract the audio from the video in the appropriate format
        //
        var child,
            cmd;
        cmd = "ffmpeg -i " + inVideoFile + " -acodec pcm_s16le -y " + outAudioFile;
        console.log(cmd);
        // executes `pwd`
        child = exec(cmd, function (error, stdout, stderr) {
          if (error !== null) {
            returnError(res, "error processing the video");
            console.log('exec error: ' + error);
            return;
          }
          vdigest.audioName = aname;
          vdigest.save();
          console.log("audio is finished");
          if (state === 3) {
            alignTranscript();
          } else {
            state = 3;
            vdigest.state = state;
            vdigest.save();
          }
        });

        var alignTranscript = function () {
          var outPreFile = path.join(spaths.tmp, vdigest.videoName + ".json");
          fs.writeFile(outPreFile, JSON.stringify(vdigest.preAlignTrans), function (err) {
            if (err) {
              returnError(res, "error parsing video transcript");
              return;
            }

            // TODO htk creates a local dir: could conflict with itself (need to cd into a sandbox first)
            var alignCmd = "python " + spaths.alignpy + " "
                  + outAudioFile + " " + outPreFile + " " + outAlignTrans;
            console.log("starting alignment command");
            console.log(alignCmd);
            child = exec(alignCmd, function (error, stdout, stderr) {
              if (error !== null) {
                console.log('exec error: ' + error);
                returnError(res, "error creating the aligned transcript");
                return;
              }
              console.log("finished processing vdigest");
              fs.readFile(outAlignTrans, 'utf8', function (err2, data) {
                console.log("done reading the aligned transcript");
                vdigest.alignTrans = JSON.parse(data);
                vdigest.state = 1;
                vdigest.save(function (err) {
                  if (err) {
                    console.log(err);
                    returnError(res, "unable to open aligned transcript");
                    return;
                  }
                  res.writeHead(200, {'content-type': 'application/json'});
                  res.write('{"readyid":"' + vdigest._id +'"}');
                  res.end();
                });
              });
            });
          });
        };
      });
      // also extract the audio from the video
      // then make the aligned json!
      // convert raw to ready text
      // extract audio from video in the appropriate format
      // combined ready text and audio to create the aligned transcript
    } else {
      // No files: first upload
      // TODO check/handle for existing transcript
      // obtain video info and save to DB if video does not exist
      // TODO handle incorrect urls ? what happens?
      ytdl.getInfo(ytaddr, function(err, info) {
        if (err && err.message) {
          returnError(res, "unable to find a YouTube Video with the given URL");
          return;
        }
        res.writeHead(200, {'content-type': 'application/json'});
        res.write(JSON.stringify(info));
        res.end();
      });
    }
  });
  return;
};
