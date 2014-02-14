function replaceAll(find, replace, str) {
  return str.replace(new RegExp(find, 'g'), replace);
} 


// ========== RANGE FUNCITON =========        
function range(start, stop, step){
    if (typeof stop=='undefined'){
        // one param defined
        stop = start;
        start = 0;
    };
    if (typeof step=='undefined'){
        step = 1;
    };
    if ((step>0 && start>=stop) || (step<0 && start<=stop)){
        return [];
    };
    var result = [];
    for (var i=start; step>0 ? i<stop : i>stop; i+=step){
        result.push(i);
    };
    return result;
};

//======= id selection from range =========
var selFromIdRange = function(first, last, suffix) {
  var r = range(first, last);
  var $sel = $('#' + r.join(suffix+',#') + suffix);
  return $sel;
}
// ===== RANDOM ID ===========
var randomId = function() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for( var i=0; i < 5; i++ )
      text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

// =============== START FOR SPAN HIGHLIGHTING ==============
var getAllBetween = function (firstEl,lastEl) {
        var $fel = $(firstEl); // First Element
        var $lel = $(lastEl); // Last Element
        // assuming either main or sub
        // TODO make this general
        var offset; var idSuffix;

        if ($fel.attr('id').indexOf('main') > -1) {
          offset = 4; idSuffix = "main";
        } else if ($fel.attr('id').indexOf('sub') > -1) {
          offset = 3; idSuffix = "sub";
        }
        var first = parseInt($fel.attr('id')
            .slice(0,$fel.attr('id').length-offset));
        var last = parseInt($lel.attr('id')
            .slice(0,$lel.attr('id').length-offset));

        var $sel = selFromIdRange(first, last+1, idSuffix);

        return $sel; 
};
// =============== START FOR GETTING CAPTURES ===============
function getURIformcanvas() {
  var ImageURItoShow = "";
  var canvasFromVideo = document.getElementById("imageView");
  if (canvasFromVideo.getContext) {
     var ctx = canvasFromVideo.getContext("2d"); // Get the context for the canvas.canvasFromVideo.
     var ImageURItoShow = canvasFromVideo.toDataURL("image/png");
  }
  var imgs = document.getElementById("imgs");

  return Canvas2Image.convertToImage(
      canvasFromVideo, 
      sts.thumbRes.width, 
      sts.thumbRes.height,
      sts.thumbnailImgType);
}

// optionally pass a div to paste the picture to
function capture($div) {
  // var video = $($('.groupRow')[sts.groups[sts.lastGroup]]).find('video')[0];
  // if (video === undefined) {
  //   video = sts.video;
  // }

  var video = sts.video;
  if ($div === undefined) {
    
    var canvasDraw = document.getElementById('imageView');
    var w = canvasDraw.width;
    var h = canvasDraw.height;
    var ctxDraw = canvasDraw.getContext('2d');

    ctxDraw.clearRect(0, 0, w, h);

    ctxDraw.drawImage(video, 0, 0, w, h);
    ctxDraw.save();
    return getURIformcanvas();  

  } else {
    var canvasDraw = document.getElementById('imageView');
    var w = canvasDraw.width;
    var h = canvasDraw.height;
    var ctxDraw = canvasDraw.getContext('2d');

    ctxDraw.clearRect(0, 0, w, h);

    ctxDraw.drawImage(video, 0, 0, w, h);
    ctxDraw.save();
    $div.append(getURIformcanvas());   
  }
}
//============LAYOUT TEXT======================
//SOURCE: http://jsfiddle.net/jahroy/Rwr7q/18/
// s          -  input string
// n          -  number of chars at which to separate lines
// useSpaces  -  if true, attempt to insert newlines at whitespace
// a          -  array used to build result

function fold(s, n, useSpaces, a) {
    a = a || [];
    if (s.length <= n) {
        a.push(s);
        return a;
    }
    var line = s.substring(0, n);
    if (! useSpaces) { // insert newlines anywhere
        a.push(line);
        return fold(s.substring(n), n, useSpaces, a);
    }
    else { // attempt to insert newlines after whitespace
        var lastSpaceRgx = /\s(?!.*\s)/;
        var idx = line.search(lastSpaceRgx);
        var nextIdx = n;
        if (idx > 0) {
            line = line.substring(0, idx);
            nextIdx = idx;
        }
        a.push(line);
        return fold(s.substring(nextIdx), n, useSpaces, a);
    }
}
//==============TRANSCRIPT TO WORD LIST ==============
// output looks like {<paragraph number>: [{
//     paragraph: <paragraph number>,
//     start: <start time>,
//     end: <end time>,
//     aligned: <aligned word>,
//     word: <original word>,
//     lineBreak: <yes if break should be put after>,
//     overallIndex: <word number in transcript>,
// }]}

function getIntFromPx(s) {
  return parseInt(s.slice(0, s.length-2));
}


function pDictFromTranscript(transcript, characterWidth, idSuffix) {
  var p = {};
  var latestSpeaker = 0;
  for (var i = 0; i < transcript.words.length; i++) {
    var word = transcript.words[i];
    var entry= {
      start: word.start,
      end: word.end,
      aligned: word.alignedWord,
      word: word.word,
      lineBreak: false,
      overallIndex: i,
      idSuffix: idSuffix
    }

    // give paragraph number
    if (word.speaker === undefined) {
      entry.paragraph = latestSpeaker;
    } else {
      entry.paragraph = word.speaker;
      latestSpeaker = entry.paragraph;
    }

    if (Object.keys(p).indexOf(entry.paragraph+"") < 0) {
      p[entry.paragraph] = [];
    }

    p[entry.paragraph].push(entry);
  }
  // now go through and put in the breaks for each paragraph
  for (var i = 0; i < Object.keys(p).length; i++) {
     var key = parseInt(Object.keys(p)[i]);
     var map = Array.prototype.map;
     var strwords = map.call(p[key], function(x) { return x.word; });
     var pstr = strwords.join(" ");
     // heres where the breaks are
     var splits = fold(pstr,characterWidth,true);
     // for each line, place the split in 
     // the paragraph entry
     var tracker = 0;
     for (var j = 0; j < splits.length; j++) {
       var wordcount = splits[j].trim(' ').split(' ').length;
       p[key][wordcount-1+tracker].lineBreak = true;
       tracker += wordcount;
     }
  }
  // return paragraph dictionary
  return p;
}