/**
 * GET /editing-interface
 * Video digest editing interface
 */
/*global require exports*/

const { promises: fs } = require('fs');
const { R_OK } = require('fs').constants;
const mkdirp = require('mkdirp');
const ytdl = require('ytdl-core');
const multiparty = require('multiparty');
const url = require('url');
const sys = require('sys');
const { exec } = require('child_process');
const User = require('../models/User');
const util = require('util');
const slug = require('slug');
const querystring = require('querystring');
const path = require('path');
const VDigest = require('../models/VDigest');
const settings = require('../config/settings');
const spaths = settings.paths;
const pathUtils = require('../utils/fpaths');
const { returnError } = require('../utils/errors');
const cache = require('memory-cache');

var nodemailer = require('nodemailer');
var secrets = require('../config/secrets');
var smtpTransport = nodemailer.createTransport('SMTP', {
  service: 'Mailgun',
  auth: {
    user: secrets.mailgun.user,
    pass: secrets.mailgun.password,
  },
});

// Helper functions
var returnJson = function (res, data, code) {
  code = code || 200;
  res.writeHead(code, { 'content-type': 'application/json' });
  res.write(JSON.stringify(data));
  res.end();
};

var returnErrorJson = function (res, data, code) {
  code = code || 400;
  res.writeHead(code, { 'content-type': 'application/json' });
  res.write(JSON.stringify(data));
  res.end();
};

function youtubeUrlFromId(ytid) {
  return `https://www.youtube.com/watch?v=${ytid}`;
}

const VALID_TRANSCRIPT_TYPES = new Set(['asr', 'manual', 'upload']);

const DEFAULT_CAPTION_OPTIONS = { asr: false, manual: false };
function getYouTubeSubtitleOptions(ytdlInfo) {
  const { playerResponse } = ytdlInfo;
  if (!playerResponse) {
    return DEFAULT_CAPTION_OPTIONS;
  }
  const { captions } = playerResponse;
  if (!captions) {
    return DEFAULT_CAPTION_OPTIONS;
  }
  const { playerCaptionsTracklistRenderer } = captions;
  if (!playerCaptionsTracklistRenderer) {
    return DEFAULT_CAPTION_OPTIONS;
  }
  const { captionTracks } = playerCaptionsTracklistRenderer;
  if (!captionTracks) {
    return DEFAULT_CAPTION_OPTIONS;
  }
  const asr = captionTracks.some((track) => track.kind === 'asr');
  const manual = captionTracks.some(
    (track) => track.kind === undefined && track.languageCode.startsWith('en')
  );

  return {
    asr,
    manual,
  };
}

function srtToText(srtText) {
  var srtData = srtText.split(/\n\n/g),
    writeData = '';
  srtData.forEach(function (srCluster) {
    if (srCluster) {
      writeData += srCluster.split('\n').slice(2).join('. ');
      writeData += '\n';
    }
  });
  return writeData;
}

const cardTimingRegex = /^(\d\d):(\d\d):(\d\d[\.,]\d\d\d) --> (\d\d):(\d\d):(\d\d[\.,]\d\d\d)/;

function getTextForCurrentCard(cardText) {
  // Skip all VTT cards that contain a cue <c> tag, for now as the transcript is duplicated
  // in those cards
  if (cardText.indexOf('<c>') >= 0 || cardText.length === 0) {
    return '';
  }
  cardText = `${cardText.charAt(0).toUpperCase()}${cardText.slice(1)}`;
  if (!cardText.endsWith('.')) {
    cardText += '.';
  }
  return cardText;
}

function vttToText(vttText) {
  const vttLines = vttText.split('\n');
  let result = '';

  let foundFirstTiming = false;
  let currentCard = '';

  for (const line of vttLines) {
    const timingMatch = line.match(cardTimingRegex);
    if (timingMatch) {
      foundFirstTiming = true;
      result += getTextForCurrentCard(currentCard);
      currentCard = '';
    } else if (foundFirstTiming) {
      currentCard += line + '\n';
    }
  }
  result += getTextForCurrentCard(currentCard);
  return result;
}

function getAlignmentForVttWithoutCues(vttText) {
  const vttLines = vttText.split('\n');
  const words = [];
  let cardStart = 0;
  let cardEnd = 0;
  let sentenceNumber = 0;
  let currentCardParts = [];

  function flushCurrentCard() {
    if (currentCardParts.length > 0) {
      if (cardEnd > cardStart) {
        words.push({
          word: currentCardParts.join(' '),
          alignedWord: currentCardParts.join(' ').toUpperCase(),
          start: cardStart,
          end: cardEnd,
          speaker: sentenceNumber,
          sentenceNumber,
        });
        sentenceNumber++;
      }
      currentCardParts = [];
    }
  }

  for (const line of vttLines) {
    const timingMatch = line.match(cardTimingRegex);
    if (timingMatch) {
      flushCurrentCard();
      const [
        ,
        fromHours,
        fromMinutes,
        fromSeconds,
        toHours,
        toMinutes,
        toSeconds,
      ] = timingMatch;
      cardStart =
        parseInt(fromHours, 10) * 60 * 60 +
        parseInt(fromMinutes, 10) * 60 +
        parseFloat(fromSeconds);
      cardEnd =
        parseInt(toHours, 10) * 60 * 60 +
        parseInt(toMinutes, 10) * 60 +
        parseFloat(toSeconds);
    } else if (line.length > 0) {
      currentCardParts.push(line.trim());
    }
  }
  flushCurrentCard();
  return { words };
}

function getAlignmentForVttWithCues(vttText) {
  const vttLines = vttText.split('\n');
  const words = [];
  let cardStart = 0;
  let cardEnd = 0;
  let sentenceNumber = 0;
  for (const line of vttLines) {
    const timingMatch = line.match(cardTimingRegex);
    if (timingMatch) {
      const [
        ,
        fromHours,
        fromMinutes,
        fromSeconds,
        toHours,
        toMinutes,
        toSeconds,
      ] = timingMatch;
      cardStart =
        parseInt(fromHours, 10) * 60 * 60 +
        parseInt(fromMinutes, 10) * 60 +
        parseFloat(fromSeconds);
      cardEnd =
        parseInt(toHours, 10) * 60 * 60 +
        parseInt(toMinutes, 10) * 60 +
        parseFloat(toSeconds);
    } else if (cardStart !== cardEnd && line.indexOf('<c>') >= 0) {
      let wordStart = cardStart;
      let wordEnd = cardStart;
      for (const part of line.split('<c>')) {
        const match = part.match(
          /([^<>]+)(<\/c>)?(<(\d\d):(\d\d):(\d\d\.\d\d\d)>)?/
        );
        let word = part.trim();
        if (match) {
          const [, w, , , hours, minutes, seconds] = match;
          word = w.trim();
          if (hours && minutes && seconds) {
            wordEnd =
              parseInt(hours, 10) * 60 * 60 +
              parseInt(minutes, 10) * 60 +
              parseFloat(seconds);
          }
        } else {
          wordEnd = cardEnd;
        }
        words.push({
          word,
          alignedWord: word.toUpperCase(),
          start: wordStart,
          end: wordEnd,
          speaker: 0,
          sentenceNumber,
        });
        wordStart = wordEnd;
      }
      sentenceNumber++; // crude...
    }
  }
  return { words };
}

function getAlignmentForVtt(vttText) {
  return vttText.indexOf('<c>') === -1
    ? getAlignmentForVttWithoutCues(vttText)
    : getAlignmentForVttWithCues(vttText);
}

function getAlignmentForSrt(srtText) {
  let shouldAdd = false;
  let cardStart = 0;
  let cardEnd = 0;
  let currentCardParts = [];

  function flushCurrentCard() {
    if (currentCardParts.length > 0) {
      if (cardEnd > cardStart) {
        words.push({
          word: currentCardParts.join(' '),
          alignedWord: currentCardParts.join(' ').toUpperCase(),
          start: cardStart,
          end: cardEnd,
          speaker: sentenceNumber,
          sentenceNumber,
        });
        sentenceNumber++;
      }
      currentCardParts = [];
    }
  }

  for (const line of srtText.split('\n')) {
    const timingMatch = line.match(cardTimingRegex);
    if (timingMatch) {
      const [
        ,
        fromHours,
        fromMinutes,
        fromSeconds,
        toHours,
        toMinutes,
        toSeconds,
      ] = timingMatch;
      cardStart =
        parseInt(fromHours, 10) * 60 * 60 +
        parseInt(fromMinutes, 10) * 60 +
        parseFloat(fromSeconds);
      cardEnd =
        parseInt(toHours, 10) * 60 * 60 +
        parseInt(toMinutes, 10) * 60 +
        parseFloat(toSeconds);
      shouldAdd = true;
    } else if (line === '') {
      flushCurrentCard();
      shouldAdd = false;
    } else if (shouldAdd) {
      currentCardParts.push(line);
    }
  }
  flushCurrentCard();
  return { words };
}

async function createVideoDigest(
  res,
  { userId, ytid, tfname, videoLength, title, alignTrans }
) {
  const vd = new VDigest({
    ytid,
    rawTransName: tfname,
    videoName: ytid,
    videoLength,
    digest: { title },
    alignTrans,
    state: 1,
  });

  try {
    await vd.validate();
    await vd.save();
  } catch (err) {
    returnError(
      res,
      'problem saving video digest to the database -- please try again',
      next
    );
  }

  // add video digest to this user's account
  User.findById(userId, async function (err, user) {
    if (err) return next(err);
    if (user.vdigests.indexOf(vd.id) === -1) {
      user.vdigests.push(vd.id);
      await user.save();
    }

    const payload = { intrmid: vd._id, title };

    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(JSON.stringify(payload));
    res.end();
  });
}

async function getTranscriptAndCreateDigest({
  res,
  userId,
  title,
  videoLength,
  ytid,
  captionsPath,
  next,
}) {
  // read the text so we can store it into
  var tfname, rawTransFile, alignTrans;

  tfname = ytid + '.srt';

  let writeData = undefined;
  let srtData = undefined;
  let vttData = undefined;

  try {
    if (captionsPath) {
      const captionsPathData = await fs.readFile(captionsPath, 'utf-8');
      if (captionsPath.endsWith('.srt')) {
        srtData = captionsPathData;
      } else if (captionsPath.endsWith('.vtt')) {
        vttData = captionsPathData;
      }
    }

    if (vttData) {
      writeData = vttToText(vttData);
      alignTrans = getAlignmentForVtt(vttData);
    } else if (srtData) {
      writeData = srtToText(srtData);
      alignTrans = getAlignmentForSrt(srtData);
    } else {
      throw new Error('No vttData or srtData');
    }
  } catch (err) {
    console.log(err);
    console.log('No transcript available', err);
    return returnError(res, 'unable to retrieve or parse captions');
  }

  tfname = ytid + '.txt';
  rawTransFile = path.join(spaths.rawTrans, ytid + '.txt');
  try {
    await fs.writeFile(rawTransFile, writeData);
  } catch (err) {
    console.log(err);
    return returnError(res, 'unable to get YouTube transcript');
  }

  createVideoDigest(res, {
    userId,
    ytid,
    tfname,
    videoLength,
    title,
    alignTrans,
    next,
  });
}

async function getSmallVideo({ ytid }) {
  console.log('Checking video file for: ', ytid);
  const filename = `${ytid}.mp4`;
  const videoPath = path.join(spaths.videos, filename);
  try {
    await fs.access(videoPath, R_OK);
    // The file already exists
    console.log('Video file already downloaded for: ', ytid);
    return;
  } catch (err) {
    // we need to download it
  }

  console.log('Downloading video file for: ', ytid);

  // get the worst quality video because we only need it for screenshots
  const ytdlCommand = `youtube-dl -f worst --recode-video mp4 -o '${path.join(
    spaths.videos,
    `${ytid}.%(ext)s`
  )}' ${youtubeUrlFromId(ytid)}`;
  console.log('cmd: ' + ytdlCommand);
  return new Promise((resolve, reject) => {
    exec(ytdlCommand, async function (error, stdout, stderr) {
      if (error) {
        console.log('error: ' + error);
        console.log('stderror: ' + stderr);
        reject('unable to get YouTube video video');
      } else {
        try {
          // make sure it exists now
          await fs.access(videoPath, R_OK);
          console.log('Downloaded video file for: ', ytid);
          resolve();
        } catch (err) {
          reject(err);
        }
      }
    });
  });
}

async function getTranscript({
  res,
  userId,
  title,
  videoLength,
  next,
  ytid,
  transcriptType,
}) {
  console.log('Trying to download subtitle file for: ' + ytid);

  if (videoLength > settings.max_yt_length) {
    returnError(
      res,
      'Video length exceeds ' +
        Math.floor(settings.max_yt_length / 60) +
        ' minutes',
      next
    );
    return;
  }

  // download the video transcript
  const subCommand =
    transcriptType === 'asr' ? '--write-auto-sub' : '--write-sub';
  const filePrefix = `${ytid}-${transcriptType}`;
  const ytdlCommand = `youtube-dl --skip-download ${subCommand} --sub-format vtt -o '${path.join(
    spaths.videos,
    `${filePrefix}.%(ext)s`
  )}' ${youtubeUrlFromId(ytid)}`;

  console.log('cmd: ' + ytdlCommand);
  return new Promise((resolve) => {
    exec(ytdlCommand, async function (error, stdout, stderr) {
      if (error) {
        console.log('error: ' + error);
        console.log('stderror: ' + stderr);
        return resolve(
          returnError(res, 'unable to get YouTube video captions')
        );
      }

      // find the file we just wrote
      const files = await fs.readdir(spaths.videos);
      const transcriptFile = files.find((file) => file.startsWith(filePrefix));
      if (transcriptFile === undefined) {
        return resolve(
          returnError(res, 'unable to get YouTube video captions')
        );
      }

      await getTranscriptAndCreateDigest({
        res,
        userId,
        title,
        ytid,
        videoLength,
        next,
        captionsPath: path.join(spaths.videos, transcriptFile),
      });
      resolve();
    });
  });
}

/**
 * Returns the editor js template (TODO consider bootstraping data)
 */
exports.getEditor = function (req, res) {
  // console.log(req.params);
  res.render('editor', {
    title: 'Video Digest Editor',
  });
};

/**
 * Returns the readyness/processing status of the video digest
 */
exports.getStatus = function (req, res) {
  var uparsed = url.parse(req.url),
    did = uparsed.query && querystring.parse(uparsed.query).id;

  VDigest.findById(did, function (err, vd) {
    var vstatus = 0;
    var msg = '';
    console.log(vd.state);
    if (err || !vd) {
      msg = 'unable to load the video digest';
    } else if (vd.isProcessing()) {
      vstatus = 3;
      msg = 'video digest is processing';
    } else if (vd.isReady()) {
      vstatus = 1;
      msg = 'video digest is ready for editing';
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: vstatus, message: msg }));
  });
};

function getCanUserEdit(user, vdid) {
  return Boolean(user && user.vdigests.indexOf(vdid) !== -1);
}

/**
 * Returns the digest data needed for the editor /digestdata/:vid
 */
exports.getDigestData = function (req, res, next) {
  console.log('Getting digest data...');
  const vdid = req.params.vdid;
  const userCanEdit = getCanUserEdit(req.user, vdid);
  const task = req.query.task;

  if (task !== 'edit' && task !== 'view') {
    returnError(res, `invalid data task: ${task}`);
    return;
  }
  if (task === 'edit' && !userCanEdit) {
    returnError(res, 'user does not have access to digest', next);
    return;
  }

  const cachedData = cache.get(vdid);

  if (
    cachedData &&
    ((task === 'view' && cachedData.pubdisplay) ||
      (task === 'edit' && userCanEdit))
  ) {
    console.log('using vdid cache for: ' + vdid);
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(cachedData);
  }

  VDigest.findById(vdid, function (err, vd) {
    if (err || !vd) {
      returnError(res, 'unable to load the specified video digest data', next);
    } else if (task === 'view' && !vd.pubdisplay) {
      returnError(res, 'video digest is not published', next);
    } else if (task === 'edit' && !userCanEdit) {
      returnError(res, 'user does not have access to digest', next);
    } else if (vd.isProcessing()) {
      returnError(res, 'the video digest is currently processing', next);
    } else if (!vd.isReady()) {
      returnError(
        res,
        'the transcript did not upload correctly: please create the video digest from scratch',
        next
      );
    } else {
      res.writeHead(200, { 'content-type': 'application/json' });
      var jsonStrResp = JSON.stringify({
        digest: vd.digest,
        transcript: vd.alignTrans,
        ytid: vd.ytid,
        videoLength: vd.videoLength,
      });
      res.end(jsonStrResp);
      cache.put(vdid, jsonStrResp, 10000000);
    }
  });
};

/**
 * Post to the digest data /digestdata/:vid
 */
exports.postPublishDigest = function (req, res, next) {
  var vdid = req.params.vdid;
  if (!getCanUserEdit(req.user, vdid)) {
    returnError(res, 'you do not have the access to publish this digest', next);
    return;
  }

  const publish = Boolean(req.body.publish);
  const unlisted = Boolean(req.body.unlisted);

  VDigest.findById(vdid, function (err, vd) {
    if (err || !vd) {
      returnError(res, 'unable to save the video digest data', next);
      return;
    }
    let changed = false;
    if (publish) {
      vd.pubdisplay = !unlisted;
      if (!vd.puburl) {
        vd.puburl = slug(vd.digest.title + ' ' + vd.id);
      }
      vd.save();
    } else {
      vd.pubdisplay = false;
      vd.puburl = null;
      vd.save();
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'success',
        message: 'published the video digest',
        puburl: vd.puburl,
      })
    );
  });
};

/**
 * Post to the digest data /digestdata/:vid
 */
exports.postDigestData = function (req, res, next) {
  var vdid = req.params.vdid;

  VDigest.findById(vdid, function (err, vd) {
    if (err || !vd) {
      returnError(res, 'unable to save the video digest data', next);
      return;
    }

    // TODO remove audioName check used for VD experiment
    if (
      (!req.user || req.user.vdigests.indexOf(vdid) === -1) &&
      vd.audioName != 'Fpz-stC1uh8'
    ) {
      returnError(
        res,
        'you do not have the access to change this digest',
        next
      );
      return;
    }

    vd.digest = req.body.object;
    vd.save(function (err) {
      // TODO check that the the user can save the data
      if (err) {
        returnError(res, 'unable to save the video digest data', next);
        return;
      }

      // update memory cache
      var jsonStrResp = JSON.stringify({
        digest: vd.digest,
        transcript: vd.alignTrans,
        ytid: vd.ytid,
        videoLength: vd.videoLength,
      });
      cache.put(vdid, jsonStrResp, 10000000);

      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'success',
          message: 'saved the video digest data',
        })
      );
    });
  });
};

// multipart process for loading a new video
exports.postNewVD = function (req, res, next) {
  req.assert('yturl', 'YouTube URL is not a valid URL').isURL();

  if (!req.user) {
    returnError(res, 'You must be logged in to create a video digest', next);
    return;
  }

  // 5 minute timeout should allow most youtube videos to download
  req.setTimeout(300000);

  var form = new multiparty.Form({
    maxFilesSize: settings.maxTransUploadSize,
    uploadDir: spaths.rawTrans,
  });

  form.parse(req, async function (err, fields, files) {
    if (err) {
      returnError(res, err.message, next);
      return;
    }

    const ytparsed = url.parse(fields.yturl && fields.yturl[0]);
    const ytid = ytparsed.query && querystring.parse(ytparsed.query).v;
    const userId = req.user.id;

    if (
      !(
        ytparsed.hostname === 'youtube.com' ||
        ytparsed.hostname === 'www.youtube.com'
      ) ||
      !ytid
    ) {
      //  TODO return informative messages to the user (how to do this?)
      returnError(
        res,
        'You must provide a YouTube url in the format: https://www.youtube.com/watch?v=someIdValue',
        next
      );
      return;
    }

    const step = fields.step[0];

    if (step === '1') {
      let info = undefined;
      try {
        info = await ytdl.getInfo(youtubeUrlFromId(ytid));
      } catch (err) {
        console.log(err);
        console.log(err.message);
        returnError(
          res,
          'Unable to find a YouTube Video with the given URL',
          next
        );
        return;
      }

      const { videoDetails } = info.playerResponse;
      const imageUrl = videoDetails.thumbnail.thumbnails[0].url;
      const { title, lengthSeconds } = videoDetails;

      const subopts = getYouTubeSubtitleOptions(info);

      const payload = {
        iurl: imageUrl,
        title,
        subopts,
        lengthSeconds: parseInt(lengthSeconds, 10),
      };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write(JSON.stringify(payload));
      res.end();
      return;
    } else if (step === '2') {
      if (fields.trantype && VALID_TRANSCRIPT_TYPES.has(fields.trantype[0])) {
        const transcriptType = fields.trantype[0];
        if (transcriptType === 'upload') {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.write(JSON.stringify({ tranupload: true }));
          res.end();
          return;
        }
        try {
          await getSmallVideo({ ytid });
        } catch (err) {
          returnError(
            res,
            'Unable to get YouTube Video with the given URL',
            next
          );
        }
        await getTranscript({
          res,
          userId,
          title: fields.yttitle[0],
          videoLength: parseInt(fields.lengthSeconds[0], 10),
          next,
          ytid,
          transcriptType,
        });
        return;
      }
    } else if (step === '3') {
      // handle custom captions upload
      if (files.tranupload && files.tranupload[0]) {
        const captionsPath = files.tranupload[0].path;
        console.log(files.tranupload, captionsPath);
        try {
          await getSmallVideo({ ytid });
        } catch (err) {
          returnError(
            res,
            'Unable to get YouTube Video with the given URL',
            next
          );
        }
        return await getTranscriptAndCreateDigest({
          res,
          userId,
          title: fields.yttitle[0],
          videoLength: parseInt(fields.lengthSeconds[0], 10),
          ytid,
          captionsPath,
          next,
        });
      }
    }

    returnError(res, 'Unknown error! Please try again', next);
  });

  return;
};

exports.getAutoSeg = function (req, res, next) {
  // get the transcript
  VDigest.findById(req.params.vdid, async function (err, vdigest) {
    if (err || !vdigest) {
      return returnErrorJson(res, err);
    }

    if (!vdigest.rawTransName) {
      var transText = vdigest.alignTrans.words
        .map(function (wrd) {
          return wrd.word;
        })
        .join(' ')
        .replace(' {p}', '');
      vdigest.rawTransName = Math.random().toString(36).substr(6) + '.txt';
      var outfile = path.join(spaths.rawTrans, vdigest.rawTransName);
      try {
        await fs.writeFile(outfile, transText);
      } catch (err) {
        return returnErrorJson(res, err, 500);
      }
    }
    doSysCall();

    function doSysCall() {
      var rtxtfile = vdigest.getSSFile();
      var segSysCall =
        'python adv_seg.py eval ' + spaths.segConfigFile + ' ' + rtxtfile;
      // execute system call
      if (!vdigest.sentSepTransName) {
        console.log('trying to generate separated transcript');
        var scmd = 'python add_sentences.py ' + vdigest.id;
        console.log(scmd);

        exec(scmd, { cwd: spaths.utils }, function (err, stdout, stderr) {
          console.log('error: ' + err);
          console.log('error: ' + stderr);
          if (err || !vdigest.sentSepTransName) {
            return returnErrorJson(
              res,
              { msg: 'error processing transcript - please try again later' },
              500
            );
          } else {
            doSysCall();
          }
        });
      } else {
        console.log(segSysCall);
        var segProc = exec(segSysCall, { cwd: spaths.analysis }, function (
          error,
          stdout,
          stderr
        ) {
          console.log('finished segmentation');
          console.log('error: ' + error);
          console.log('stderror: ' + stderr);
          console.log('stdout: ' + stdout);
          // get sentence breaks from stdout
          if (error || stderr) {
            return returnErrorJson(res, {
              msg: 'Segmentation error -- please try again: ' + stderr,
            });
          }
          try {
            var sps = stdout.split('\n');
            var sentBreaks = sps[sps.length - 4];
            return returnJson(res, { breaks: sentBreaks });
          } catch (e) {
            return returnErrorJson(res, {
              msg: 'Segmentation error -- please try again',
            });
          }
          // read results from system call or return error
          // return the word/sentence numbers
        });
      }
    }
  });
};
