setTimeout(function(){
meow = 0;
var videoId = 'video',
    transcriptId = 'transcript',
    initSpeakers = [0],
    initParagraphs = [$(document.createElement('p'))],
    picTimeIndex = 0,
    thumbnails = [],
    thumbnailsGenerated = false,
    hi = "meow";

var thumbnail = {
  height: 75,
  width: 75 * (455/300),
  imgtype: 'png'
}

var newTranscriptRow = function(){
  var $row = $($(document.createElement('div')).attr('class', 'row'));
  var $frames = $($(document.createElement('div')).attr('class', 'col-md-4 frames'));
  var $transcript = $($(document.createElement('div')).attr('class', 'col-md-8 transcript'));
  $row.append($frames);
  $row.append($transcript);
  return {row: $row, transcript: $transcript, frames: $frames};
};

var makeTranscriptRow = function(paragraph, pics){
  var newRow = newTranscriptRow();
  newRow.transcript.append(paragraph);
  for (var i = 0; i < pics.length; i++) {
    newRow.frames.append(pics[i].image);
  };

  return $(newRow.row);
}


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
      thumbnail.width, 
      thumbnail.height,
      thumbnail.imgtype);
}

function capture() {
  var video = document.getElementById(videoId);

  var canvasDraw = document.getElementById('imageView');
  var w = canvasDraw.width;
  var h = canvasDraw.height;
  var ctxDraw = canvasDraw.getContext('2d');

  ctxDraw.clearRect(0, 0, w, h);

  ctxDraw.drawImage(video, 0, 0, w, h);
  ctxDraw.save();
  return getURIformcanvas();	 
}

function export_config() {
  var out = {}
  var vid_file = $('#'+videoId+' source').attr('src');
  var vid_type = $('#'+videoId+' source').attr('type');
  out.source = {file: vid_file, file_type: vid_type}; 
  out.summary = [];

  $('.keyframe').each(function(){
    var time = $(this).data('time');
    var text = $(this).next().text();
    var image = $(this).find('img').attr('src');
    out.summary.push({ 
      time: time, 
      text: text,
      image: image
    });   
  });

  var str_json = JSON.stringify(out);
  var $div = $(document.createElement('div')).attr("class", "row").css("padding-top", "20px");
  var $textarea = $(document.createElement('textarea')).attr("class", "form-control").text(str_json);
  $('.container').append($div.append($textarea));

}

$(window).keypress(function(e) {
    if (e.which === 96) {
        var summary = $('textarea').val();
        var $summary = $('textarea').parent();
        $summary.html('');
        $summary.append($(document.createElement('p')).text(summary));
    }
});

var selectPicTimes = function(paragraphs, fades) {
  var picTimes = [];
  for (var i = 0; i < paragraphs.length; i++) {
    var start = $(paragraphs[i].children('span')[0]).data('start');
    var end = $(paragraphs[i].children('span')[paragraphs[i].children('span').length-1]).data('end');

    var currentFades = [];
    for (var j = 0; j < fades.length; j++) {
      if (fades[j].value >= start 
          && fades[j].value <= end) {

        currentFades.push(fades[j]);
      }
    };

    picTimes.push(currentFades);
  };

  return picTimes;
};

var makePics = function(seconds) {
  // change video time to this time
  var $video = $('#'+videoId)[0];
  $video.currentTime = seconds;
  $video.pause();

  var pic = capture();
  return pic;
}

var layoutSummary = function(paragraphs, picTimes) {

  if (!thumbnailsGenerated) {
    var pics = [];
    var lastPicTime = 0;
    for (var i = 0; i < picTimes.length; i++) {
      for (var j = 0; j < picTimes[i].length; j++) {
        // make a picture at the video time

        if (picTimes[i][j].type == "IN") {
          var pic = {
            paragraph: i, 
            index: j, 
            time: picTimes[i][j].value + .1, 
            fade: picTimes[i][j].type
          };

        } else {
          var pic = {
            paragraph: i, 
            index: j, 
            time: picTimes[i][j].value - .5, 
            fade: picTimes[i][j].type
          };
        }

        

        //pics.push(pic);

        if (pic.time >= lastPicTime + .1) {
          pics.push(pic);
          lastPicTime = pic.time;
        }
      }
    };

    var video = $('#' + videoId)[0];
    video.currentTime = pics[picTimeIndex].time;

    video.addEventListener('seeked', function(){

      var img = capture();
      pics[picTimeIndex].image = img;
      thumbnails.push(pics[picTimeIndex]);
      picTimeIndex++;

      if (picTimeIndex < pics.length) {
        video.currentTime = pics[picTimeIndex].time;
      } else {
        thumbnailsGenerated = true;
        layoutSummary(paragraphs, picTimes);
      }

    });

    
  } else {
    for (var i = 0; i < paragraphs.length; i++) {
      var pThumbnails = thumbnails.filter(function(t){
        return i === t.paragraph;
      });

      var $row = makeTranscriptRow(paragraphs[i], pThumbnails);
      $("#transcript").append($row);
    };
    meow = thumbnails;
    console.log(thumbnails);

  }
};
  

var auto_summary = function(transcript, fades) {
  // get the paragraphs from the transcript w/ durations
  var paragraphs = transcriptParagraphs(transcript);

  // select times for vid capture using paragraphs and fades
  var picTimes = selectPicTimes(paragraphs, fades);

  // Layout the summary with the paragraphs and pictimes
  layoutSummary(paragraphs, picTimes);

}

var load_fades = function(transcript) {
  $.ajax({
    url: 'resources/DavidGallo_fades.json',
    async: false,
    dataType: 'json',
    success: function (response) {
      var fades = response;
      auto_summary(transcript, fades);
    }
  });
};

var transcriptParagraphs = function(data) {
  var words = data.words;
  var paragraphs = initParagraphs;
  var speakers = initSpeakers;
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
          var $video = $('#'+videoId)[0];
          $video.currentTime = $(this).data('start');
          $video.play();
        });

    $(paragraphs[paragraphs.length-1]).append($span);
  }

  return paragraphs;

};

$.ajax({
    url: 'resources/DavidGallo_aligned.json',
    async: false,
    dataType: 'json',
    success: function (response) {
      var data = response;
      load_fades(data);
    }
});

}, 2000);