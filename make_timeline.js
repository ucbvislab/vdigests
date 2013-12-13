// make sure the resolution matches the imageView space

var settings = {
  transcriptFile: 'resources/HansRosling_aligned.json',
  // thumbnailTimes: [15.0, 77.63333333333333, 161.2, 162.83333333333334, 254.56666666666666, 
  // 296.43333333333334, 355.43333333333334, 409.7666666666667, 478.43333333333334, 517.7666666666667, 
  // 546.9333333333334, 617.7333333333333, 694.0, 728.8333333333334, 785.6, 833.8, 882.4, 937.4, 
  // 987.8333333333334, 1074.8333333333333, 1120.0666666666668],
  resolution: {width: 200, height: 150},
  thumbnailTimes: [0.0, 24.861798937499998, 49.723597874999996, 74.5853968125, 99.44719574999999, 
  124.30899468749999, 149.170793625, 174.03259256249999, 198.89439149999998, 223.75619043749998, 
  248.61798937499998, 273.4797883125, 298.34158725, 323.2033861875, 348.06518512499997, 
  372.92698406249997, 397.78878299999997, 422.65058193749996, 447.51238087499996, 472.37417981249996, 
  497.23597874999996, 522.0977776875, 546.959576625, 571.8213755625, 596.6831745, 621.5449734375, 
  646.406772375, 671.2685713125, 696.1303702499999, 720.9921691874999, 745.8539681249999, 
  770.7157670624999, 795.5775659999999, 820.4393649374999, 845.3011638749999, 870.1629628124999, 
  895.0247617499999, 919.8865606874999, 944.7483596249999, 969.6101585624999, 994.4719574999999, 
  1019.3337564374999, 1044.195555375, 1069.0573543125, 1093.91915325, 1118.7809521875, 1143.642751125, 1168.5045500625],
  video: document.getElementById('video'),
  createdParagraphDiv: false,
  thumbnails: null,
  thumbnailTimeInd: 0,
  thumbnailImgType: 'png',
  timelineTop: 0,
  timelineLeft: 0,
  $timelineContiner: $('body'),
  paragraphCSS: {
    "font-size": "13px",
    "width": "500px"
  }
}

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
      settings.resolution.width, 
      settings.resolution.height,
      settings.thumbnailImgType);
}

function capture() {
  var video = settings.video;

  var canvasDraw = document.getElementById('imageView');
  var w = canvasDraw.width;
  var h = canvasDraw.height;
  var ctxDraw = canvasDraw.getContext('2d');

  ctxDraw.clearRect(0, 0, w, h);

  ctxDraw.drawImage(video, 0, 0, w, h);
  ctxDraw.save();
  return getURIformcanvas();   
}
// =============== END FOR GETTING CAPTURES ===============

// This takes in transcript json and gives back something
// set of jquery paragraphs where words have time information
// attached
var transcriptParagraphs = function(data) {
  var words = data.words;
  var paragraphs = [$(document.createElement('p'))];
  var speakers = [0];
  for (var i = 0; i < words.length; i++) {

    if (words[i].speaker != undefined
        && speakers.indexOf(words[i].speaker) < 0) {

      var $paragraph = $(document.createElement('p'));
      paragraphs.push($paragraph);
      speakers.push(words[i].speaker);

    }

    var word = data.words[i];
    var $span = $(document.createElement('span'))
        .addClass('word')
        .attr('id', i)
        .html(word.word + " ")
        .data("start", word.start)
        .data("end", word.end)
        .data("word", word.word)
        .data("paragraph", paragraphs.length - 1)
        .on("click", function(){
          console.log($(this).data('word') + "  " + $(this).data('start'));
          var video = settings.video;
          video.currentTime = $(this).data('start');
          video.play();
        });

    $(paragraphs[paragraphs.length-1]).append($span);
  }

  return paragraphs;
};

var thumbailPositions = function(xInit, yInit){
  var times = settings.thumbnailTimes;
  var positions = [];
  for (var i = 0; i < times.length; i++) {
    var y = yInit + i*settings.resolution.height;
    var x = xInit;
    positions.push({x: x,y: y})
  };

  return positions;
};

var paragraphPositions = function(xInit, yInit, paragraphs, yppSec){
  var positions = [];

  for (var i = 0; i < paragraphs.length; i++) {
    var $pChildren = $(paragraphs[i]).children();
    var start = $pChildren.first().data('start');
    var x = xInit;
    var y = start*yppSec;
    positions.push({x: x, y: y});
  };

  return positions;
}

var makeThumbnail = function(seconds) {
  // change video time to this time
  var video = settings.video;
  video.currentTime = seconds;
  video.pause();

  var pic = capture();
  return pic;
}

var generateThumbnails = function(times){
  var thumbnails = [];
  var video = settings.video;
  var times = settings.thumbnailTimes;
  for (var i = 0; i < times.length; i++) {
    thumbnails.push({time: times[i]});
  };

  video.currentTime = 
      thumbnails[settings.thumbnailTimeInd].time;

  settings.thumbnails = thumbnails;

  video.addEventListener('seeked', function(){
    var img = capture();

    settings.thumbnails[settings.thumbnailTimeInd].image = img;

    settings.thumbnailTimeInd++;

    if (settings.thumbnailTimeInd < settings.thumbnailTimes.length) {
      video.currentTime = settings.thumbnails[settings.thumbnailTimeInd].time;
    } else {
      layoutTimeline();
    }

  });
}


var layoutTimeline = function(transcript){
  // capture all the pictures in the video
  // as each captures, append it to the video id portion
  if (!transcript) {
    transcript = settings.transcript;
  }

  if (settings.thumbnails === null) {
    // go generate the thumbnails, it will come back here
    var thumnails = generateThumbnails();
    console.log("Setting thumbnails not found, generating thumbnails.");
  } else {
    // yay you have your thumbnails now lay them out
    console.log("Number of Thumbnail Images: " 
      + settings.thumbnails.length);

    var paragraphs = transcriptParagraphs(transcript);
    console.log("Number of Paragraphs in Transcript: " 
      + paragraphs.length);

    var positions = {};
    positions.thumbnails = thumbailPositions(
      settings.timelineLeft,
      settings.timelineTop);

    console.log("Number of Thumbnail Positions: " 
      + positions.thumbnails.length);

    var yPxPerSec = settings.resolution.height
        *settings.thumbnailTimes.length/settings.video.duration;

    console.log("Y Pixels in a Second: " 
      + yPxPerSec);

    positions.paragraphs = paragraphPositions(
      settings.timelineLeft + settings.resolution.width,
      settings.timelineTop,
      paragraphs,
      yPxPerSec);

    console.log("Number of Paragraph Positions: " 
      + positions.paragraphs.length);

    var thumbnails = settings.thumbnails;
    
    // hide the video
    $(video).hide();

    for (var i = 0; i < positions.thumbnails.length; i++) {
      var $thumb = $(document.createElement('div'))
        .css({
          position: 'absolute',
          top: positions.thumbnails[i].y,
          left: positions.thumbnails[i].x
        })
        .append(
          settings.thumbnails[i].image
        );
      settings.$timelineContiner.append($thumb);
    };

    for (var i = 0; i < positions.paragraphs.length; i++) {
      var $paragraph = $(document.createElement('div'))
        .css({
          position: 'relative',
          top: positions.paragraphs[i].y,
          left: positions.paragraphs[i].x
        })
        .append($(paragraphs[i]).css(settings.paragraphCSS));

      settings.$timelineContiner.append($paragraph);
    };

  }
  
};

var loadTranscript = function(){
  $.ajax({
    url: settings.transcriptFile,
    async: false,
    dataType: 'json',
    success: function (response) {
      settings.transcript = response;

      layoutTimeline(response);
    }
  });
};

video.addEventListener("loadedmetadata", function(){
  // need the meta data to do anything else

  loadTranscript();
});




// }, 2000);

// setTimeout(function(){
// meow = 0;
// var videoId = 'video',
//     transcriptId = 'transcript',
//     initSpeakers = [0],
//     initParagraphs = [$(document.createElement('p'))],
//     picTimeIndex = 0,
//     thumbnails = [],
//     thumbnailsGenerated = false,
//     hi = "meow";

// var thumbnail = {
//   height: 75,
//   width: 75 * (455/300),
//   imgtype: 'png'
// }

// var newTranscriptRow = function(){
//   var $row = $($(document.createElement('div')).attr('class', 'row'));
//   var $frames = $($(document.createElement('div')).attr('class', 'col-md-4 frames'));
//   var $transcript = $($(document.createElement('div')).attr('class', 'col-md-8 transcript'));
//   $row.append($frames);
//   $row.append($transcript);
//   return {row: $row, transcript: $transcript, frames: $frames};
// };

// var makeTranscriptRow = function(paragraph, pics){
//   var newRow = newTranscriptRow();
//   newRow.transcript.append(paragraph);
//   for (var i = 0; i < pics.length; i++) {
//     newRow.frames.append(pics[i].image);
//   };

//   return $(newRow.row);
// }






// function export_config() {
//   var out = {}
//   var vid_file = $('#'+videoId+' source').attr('src');
//   var vid_type = $('#'+videoId+' source').attr('type');
//   out.source = {file: vid_file, file_type: vid_type}; 
//   out.summary = [];

//   $('.keyframe').each(function(){
//     var time = $(this).data('time');
//     var text = $(this).next().text();
//     var image = $(this).find('img').attr('src');
//     out.summary.push({ 
//       time: time, 
//       text: text,
//       image: image
//     });   
//   });

//   var str_json = JSON.stringify(out);
//   var $div = $(document.createElement('div')).attr("class", "row").css("padding-top", "20px");
//   var $textarea = $(document.createElement('textarea')).attr("class", "form-control").text(str_json);
//   $('.container').append($div.append($textarea));

// }

// $(window).keypress(function(e) {
//     if (e.which === 96) {
//         var summary = $('textarea').val();
//         var $summary = $('textarea').parent();
//         $summary.html('');
//         $summary.append($(document.createElement('p')).text(summary));
//     }
// });

// var selectPicTimes = function(paragraphs, fades) {
//   var picTimes = [];
//   for (var i = 0; i < paragraphs.length; i++) {
//     var start = $(paragraphs[i].children('span')[0]).data('start');
//     var end = $(paragraphs[i].children('span')[paragraphs[i].children('span').length-1]).data('end');

//     var currentFades = [];
//     for (var j = 0; j < fades.length; j++) {
//       if (fades[j].value >= start && fades[j].value <= end) {

//         currentFades.push(fades[j]);
//       }
//     };

//     picTimes.push(currentFades);
//   };

//   return picTimes;
// };

// var makePic = function(seconds) {
//   // change video time to this time
//   var $video = $('#'+videoId)[0];
//   $video.currentTime = seconds;
//   $video.pause();

//   var pic = capture();
//   return pic;
// }

// var layoutSummary = function(paragraphs, picTimes) {

//   if (!thumbnailsGenerated) {
//     var pics = [];
//     for (var i = 0; i < picTimes.length; i++) {
//       for (var j = 0; j < picTimes[i].length; j++) {
//         // make a picture at the video time
//         var pic = {
//           paragraph: i, 
//           index: j, 
//           time: picTimes[i][j].value, 
//           fade: picTimes[i][j].type
//         };
//         pics.push(pic);
//       }
//     };

//     var video = $('#' + videoId)[0];
//     video.currentTime = pics[picTimeIndex].time;

    // video.addEventListener('seeked', function(){

    //   var img = capture();
    //   pics[picTimeIndex].image = img;
    //   thumbnails.push(pics[picTimeIndex]);
    //   picTimeIndex++;

    //   if (picTimeIndex < pics.length) {
    //     video.currentTime = pics[picTimeIndex].time;
    //   } else {
    //     thumbnailsGenerated = true;
    //     layoutSummary(paragraphs, picTimes);
    //   }

    // });

    
//   } else {
//     for (var i = 0; i < paragraphs.length; i++) {
//       var pThumbnails = thumbnails.filter(function(t){
//         return i === t.paragraph;
//       });

//       var $row = makeTranscriptRow(paragraphs[i], pThumbnails);
//       $("#transcript").append($row);
//     };
//     meow = thumbnails;
//     console.log(thumbnails);

//   }
// };
  

// var auto_summary = function(transcript, fades) {
//   // get the paragraphs from the transcript w/ durations
//   var paragraphs = transcriptParagraphs(transcript);

//   // select times for vid capture using paragraphs and fades
//   var picTimes = selectPicTimes(paragraphs, fades);

//   // Layout the summary with the paragraphs and pictimes
//   layoutSummary(paragraphs, picTimes);

// }

// var load_fades = function(transcript) {
//   $.ajax({
//     url: 'resources/DavidGallo_fades.json',
//     async: false,
//     dataType: 'json',
//     success: function (response) {
//       var fades = response;
//       auto_summary(transcript, fades);
//     }
//   });
// };



// $.ajax({
//     url: settings.transcriptFile,
//     async: false,
//     dataType: 'json',
//     success: function (response) {
//       var data = response;
//       load_fades(data);
//     }
// });

// }, 2000);