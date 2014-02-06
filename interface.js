// make sure the resolution matches the imageView space

var settings = {
  docHeight: 900,
  timelineFile: 'resources/timeline.png',
  transcriptFile: 'resources/HansRosling_aligned.json',
  yppSec: 6.033352629754772,
  timelineDim: {
    oHeight: 7200,
    oWidth: 700,
    nHeight: 900,
    nWidth: 88
  },
  videoResolution: {width: 200, height: 150},
  video: document.getElementById('video'),
  $video: $(document.getElementById('video')),
  createdParagraphDiv: false,
  thumbnails: null,
  thumbRes: {
    width: 200,
    height: 150
  },
  thumbnailTimeInd: 0,
  thumbnailImgType: 'png',
  timelineTop: 0,
  timelineLeft: 0,
  $transcriptContainer: $('#transcript'),
  $timelineImage: $('#tl'),
  $timelineContainer: $('#timeline'),
  $scrolling: $('#scrolling'),
  $summaryContainer: $('#summary'),
  totalSummaryHeight: 0,
  paragraphCSS: {
    "font-size": "13px",
    "width": "500px"
  }
}

$('#exported').hide()

$('#export').on("click", function(){
  var k = []; 
  var k = []; $('.sumDiv').each(function(){
   k.push({start: $(this).data('start'), img: $(this).find('img').attr('src'), text: $(this).text()})
  })

  $('#exported').text(JSON.stringify(k));
  $('#exported').show();
});

// =============== START FOR SPAN HIGHLIGHTING ==============
var getAllBetween = function (firstEl,lastEl) {
        var firstElement = $(firstEl); // First Element
        var lastElement = $(lastEl); // Last Element
        var collection = new Array(); // Collection of Elements
        collection.push(firstElement.attr('id')); // Add First Element to Collection
        $(firstEl).nextAll().each(function(){ // Traverse all siblings
            var siblingID  = $(this).attr('id'); // Get Sibling ID
            if (siblingID != $(lastElement).attr('id')) { // If Sib is not LastElement
                collection.push($(this).attr('id')); // Add Sibling to Collection
            } else { // Else, if Sib is LastElement
                collection.push(lastElement.attr('id')); // Add Last Element to Collection
                return false; // Break Loop
            }
        });         
        return collection; // Return Collection
};

$('#getSelectedSpans').click(function(event){

    userSelection = window.getSelection();
    rangeObject = userSelection.getRangeAt(0);
    if (rangeObject.startContainer == rangeObject.endContainer) {
        alert(rangeObject.startContainer.parentNode.id);
    } else {
        alert(getAllBetween(
            rangeObject.startContainer.parentNode,
            rangeObject.endContainer.parentNode));
    }
});

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
      settings.thumbRes.width, 
      settings.thumbRes.height,
      settings.thumbnailImgType);
}

// optionally pass a div to paste the picture to
function capture($div) {
  if ($div === undefined) {
    var video = settings.video;
    var canvasDraw = document.getElementById('imageView');
    var w = canvasDraw.width;
    var h = canvasDraw.height;
    var ctxDraw = canvasDraw.getContext('2d');

    ctxDraw.clearRect(0, 0, w, h);

    ctxDraw.drawImage(video, 0, 0, w, h);
    ctxDraw.save();
    return getURIformcanvas();  

  } else {
    var video = settings.video;
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

$(document).on("keypress", function(e){
  if (e.keyCode === 99) {
    // if the key code is capture, you will capture
    // an image at the current time set one time listener
    var img = capture();

    $('.myThumb').on("click", function(){
      // unbind the click
      $('.myThumb').unbind("click");
      $(this).find('img').replaceWith(img);

    });
  }
});
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

var positionSummary = function(spanIds) {
  var position = {};
  var $first = $('#'+spanIds[0]), 
      $last = $('#'+spanIds[spanIds.length-1]);

  // this is apparently relative to scroll top
  // so add the scroll to the top parent positions
  var st = settings.$scrolling.scrollTop();
  var firstPos = $first.position();
  var lastPos = $last.position();
  var firstPPos = $first.parent().parent().position();
  var lastPPos = $last.parent().parent().position();
  firstPPos.top += st;
  lastPPos.top += st;
  var lineHeight = parseInt($first.css('line-height').split('px')[0]);

  var selectionTop = (firstPos.top + firstPPos.top);
  var selectionBottom = (lastPos.top + lastPPos.top + lineHeight);
  var selectionHeight = selectionBottom - selectionTop;

  // naively position summary
  position.middle = selectionTop 
    + (selectionHeight)/2;
  position.top = selectionTop;
  position.bottom = selectionBottom;
  position.start = $first.data('start');
  position.end = $last.data('end');
  return position;
};

var saveSummary = function($summaryDiv) {
  $summaryDiv.find('textarea').on("keypress", function(e){
    if (e.keyCode === 13) {
      // get text from text area
      var taText = $(this).val();
      // transfer style to paragraph
      var taStyle = $(this).attr('style');
      // delete text area 
      $(this).remove();
      // replace with paragraph
      var $summary = $(document.createElement('p'))
        .attr('style', taStyle)
        .css('height', 'auto')
        .css('width', 490-115-2)
        .text(taText);

      $summaryDiv.append($summary);
      $summaryDiv.on("click", function(){
        settings.video.currentTime = $(this).data('start');
        settings.video.play();
      });
    }
  }); 
}

var createSummary = function(spanIds) {
  var summaryPosition = positionSummary(spanIds);
  console.log(summaryPosition);

  var sHeight = summaryPosition.bottom - summaryPosition.top;

  var $summaryDiv = $(document.createElement('div')).css({
      position: 'relative',
      top: (summaryPosition.top - settings.totalSummaryHeight) + 'px',
      left: 0,
      height: sHeight + 'px',
      width: '100%',
      'background-color': ''
    })
    .data(summaryPosition)
    .attr('class', 'sumDiv');
  // needs to exactly equal the normal height
  var $barDiv = $(document.createElement('div')).css({
    position: 'relative',
    top:'0px',
    left:'0px',
    height: '100%',
    width: '5px',
    'background-color': '#0c5111'
  }).attr('class', 'myBar');

  var $imgDiv = $(document.createElement('div')).css({
    position: 'relative',
    top: -sHeight+'px',
    left:'10px',
    height: '75px',
    width: '100px',
    'background-color': 'black'
  }).attr('class', 'myThumb');

  var $textDiv = $(document.createElement('textarea')).css({
    position: 'relative',
    top: -(sHeight + 75)+'px',
    left:'115px',
    height: '75px',
    width: 490-115,
    'font-size': '13px',
    'background-color': '#deebde'
  }).attr('class', 'myEntry');

  $summaryDiv.append($barDiv);
  $summaryDiv.append($imgDiv);
  $summaryDiv.append($textDiv);

  settings.totalSummaryHeight += sHeight;
  settings.$summaryContainer.append($summaryDiv);

  saveSummary($summaryDiv);

  settings.video.currentTime = summaryPosition.start;

  // settings.video.currentTime = (summaryPosition.end 
  //     - summaryPosition.start)/2 
  //   + summaryPosition.start;
  
  $(settings.video).one("seeked", function(){
    capture($imgDiv);
  });
  
};

var bindSummaryKeypress = function(){

    $(document).on("keypress", function(e){
      if(e.keyCode == 92){
        userSelection = window.getSelection();
        rangeObject = userSelection.getRangeAt(0);

        var spanIds = null;
        if (rangeObject.startContainer == rangeObject.endContainer) {
          spanIds = [rangeObject.startContainer.parentNode.id];
        } else {
          spanIds= getAllBetween(
          rangeObject.startContainer.parentNode,
          rangeObject.endContainer.parentNode);
        }

        console.log("Trigger Create Summary");

        createSummary(spanIds);
      }
    });
};

var attachScrollEvents = function($scrollBox, $scrolling){
  console.log("Attaching Scroll Events");

  // need scaling functions
  var trToTlHeight = function(n) {
    var tlHeight = settings.timelineDim.nHeight;
    var tsHeight = settings.$transcriptContainer[0].scrollHeight;
    return n * (tlHeight/tsHeight);
  }

  var tlToTrHeight = function(n) {
    var tlHeight = settings.timelineDim.nHeight;
    var tsHeight = settings.$transcriptContainer[0].scrollHeight;
    return n * (tsHeight/tlHeight);
  }

  // if you scroll the tl/summary scroll box
  // then the timeline view will update
  $scrolling.on('scroll', function(){
    var newBoxPosition = trToTlHeight(this.scrollTop);
    $scrollBox.css({
      top: newBoxPosition + 'px'
    });
  });

  // if you click anywhere on the timeline image
  // the center scrollbox will update
  settings.$timelineImage.click(function(e){

    var x = e.pageX - e.target.offsetLeft,
        y = e.pageY - e.target.offsetTop;

    // move the scrollbox to click position
    $scrollBox.css('top', y);

    var newCPos = tlToTrHeight(y)
      - (settings.docHeight/2);
    if (newCPos < 0)  { newCPos = 0; }

    // move timeline to equivalent position centered
    $scrolling.scrollTop(newCPos);
  });

  bindSummaryKeypress();

};
var enableScrolling = function(){
  if (settings.timelineDim === undefined) {
    console.log("Make a timeline dimension object with oHeight, nHeight, oWidth, nWidth");
  } else {
    console.log("Constructing Scroll Box");
    // how much of a timeline is in a transcript view?
    var docHeight = settings.docHeight;
    // overall height
    var transHeight = settings.$transcriptContainer[0].scrollHeight;
    // what height should the timeline box be that
    // represents the current view
    var tlBoxHeight = settings.timelineDim.nHeight
      *(docHeight/transHeight);

    var $scrollBox = $(document.createElement('div'))
      .attr('id', 'scrollView')
      .css({
        position: 'absolute',
        top: '0px',
        left: '0px',
        opacity: .2,
        'background-color': 'black',
        width: settings.timelineDim.nWidth,
        height: tlBoxHeight
      });
    settings.$timelineContainer.append($scrollBox);

    attachScrollEvents(
      $scrollBox,
      settings.$scrolling
    );
  }
}


var layoutTimeline = function(transcript){
  // capture all the pictures in the video
  // as each captures, append it to the video id portion
  if (!transcript) {
    transcript = settings.transcript;
  }
    var paragraphs = transcriptParagraphs(transcript);
    console.log("Number of Paragraphs in Transcript: " 
      + paragraphs.length);

    var positions = {};
    var yPxPerSec = settings.yppSec;

    console.log("Y Pixels in a Second: " 
      + yPxPerSec);

    positions.paragraphs = paragraphPositions(
      0,
      settings.timelineTop,
      paragraphs,
      yPxPerSec);

    var past = 0;

    for (var i = 0; i < positions.paragraphs.length; i++) {
      var $paragraph = $(document.createElement('div'))
        .css({
          position: 'relative',
          top: positions.paragraphs[i].y - past,
          left: positions.paragraphs[i].x
        })
        .append($(paragraphs[i]).css(settings.paragraphCSS));

      settings.$transcriptContainer.append($paragraph);

      // faking the absolute positioning
      past += $('p').last().height()+parseInt($('p')
        .last().css('margin-bottom'));
    };

    // make sure the transcript has the scroll height of the
    // scrolling box
    var sh = settings.$transcriptContainer.parent()[0].scrollHeight;
    settings.$transcriptContainer.height(sh);

    var sh2 = settings.$summaryContainer.parent()[0].scrollHeight;
    settings.$summaryContainer.height(sh2);

    enableScrolling();
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
