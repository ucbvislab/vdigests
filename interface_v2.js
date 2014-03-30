document.ready = (function ($, IUtils) {
  // make sure the resolution matches the imageView space

  // consts: don't change
  var consts = {
    docHeight: 900,
    summaryIdPrefix: "sumDiv"
  };

  // state: changes
  var sts = {
    transcriptFile: 'resources/HansRosling_aligned.json',
    video: undefined,
    $video: undefined,
    $scrolling: $('#scrolling'),
    summaries: {},
    capture: {},
    summaryIdIndex: 0,
    groupIndex: 0,
    // id: group number
    groups: {},
    lastGroup: "",
    lastSelection:[],
    vn: 0
  };


  //============== INTERFACE CONTROLS ==================
  var addTitle = function() {
    console.log("Adding title to group: " + sts.lastGroup);
    // $('#'+sts.lastGroup);
  };

  var createSummaryPlaceholder = function(groupId) {
    var imgid = IUtils.randomId();
    var $img = $('<img>')
          .attr('class', 'img-myThumbnail')
          .attr('id', imgid)
          .css('background-color', 'lightgrey');

    var cap = {
      $image: $img,
      image_id: imgid,
      image_time: 0.0
    };

    var sdid = createSummaryEntryReturnId([], {group: sts.groups[groupId]});
    addCompleteSummary(sdid, cap);
    // TODO bind mouseup
  };

  var bindGroupSummaryPlaceholder = function($groupRowDiv) {
    sts.lastGroup = $groupRowDiv.attr('id');
    var $ctrldiv = $('<div>').attr('class', 'groupCtrl');
    $ctrldiv.append($('<textarea>').attr('placeholder', 'Subtitle Here'));
    $ctrldiv.on('click',function(){
      sts.lastGroup = $groupRowDiv.attr('id');
      console.log("Last group is now: " + sts.groups[sts.lastGroup]);
    });
    var $buttonAdd = $('<button>')
          .html('<span class="glyphicon glyphicon-plus"></span>')
          .attr('class', 'add-section btn btn-sm')
          .click(function(){
            sts.lastGroup = $groupRowDiv.attr('id');
            console.log("Last group is now: " + sts.groups[sts.lastGroup]);
            findGroupSummaryPlaceholder();
          });
    var $buttonSubtract = $('<button>')
          .html('<span class="glyphicon glyphicon-minus"></span>')
          .attr('class', 'subtract-section btn btn-sm');
    $ctrldiv.append($buttonSubtract); $ctrldiv.append($buttonAdd);
    console.log("Made group control.");
    $groupRowDiv.append($ctrldiv);
  };

  var makeGroupRow = function(groupNumber){
    var gid = IUtils.randomId();
    var $groupRowDiv = $('<div>')
          .attr('class', 'row groupRow')
          .attr('id', gid);
    sts.groups[gid] = groupNumber;
    var $videoCol = $('<div>').attr('class', 'col-md-6 videoCol');
    //TODO: fix this awfulness
    var $video = $('<video id="video" controls preload="auto" width="415px" height="231px" poster="resources/HansRosling_poster.png"> <source src="resources/HansRosling'+sts.vn+'.mp4" type="video/mp4" /> </video>');
    var $summaryCol = $('<div>').attr('class', 'col-md-6 summaryCol');
    sts.vn++;
    $videoCol.append($video);
    $groupRowDiv.append($videoCol);
    $groupRowDiv.append($summaryCol);

    //TODO: add group-wise video back in
    if (sts.video === undefined) {
      sts.video = $video[0];
      sts.$video = $video;
    }

    return $groupRowDiv;
  };

  var makeNewGroupAndAppend = function(){
    console.log("Making new group.");
    var $groupRowDiv = makeGroupRow(sts.groupIndex);
    $('#outputSummary').append($groupRowDiv);

    bindGroupSummaryPlaceholder($groupRowDiv);
    sts.groupIndex++;
    return sts.groupIndex - 1;
  };

  //================= CONTROLLER =======================

  // seek and capture at time

  var seekThenCaptureImgTimes = function(time_list, cap_list, i, callback) {

    var vid = sts.video;

    console.log("seekThen", cap_list);

    if (i < time_list.length) {
      // set current time to timelist
      vid.currentTime = time_list[i];
      // when the video has seeked to that time
      $(vid).one('seeked', function(){
        // make a capture
        var cap = {};
        cap.image_time = time_list[i];
        cap.image_id = IUtils.randomId();

        var uri = IUtils.capture(sts.video);
        console.log(uri);
        cap.$image = $(uri)
          .attr('class', 'img-myThumbnail')
          .attr('id', cap.image_id);

        // add them to a global list
        cap_list.push(cap);

        // do it again
        seekThenCaptureImgTimes(time_list, cap_list, i+1, callback);
      });
    } else {
      console.log("Done capturing images.");
      callback(cap_list);
    }
  };

  //TODO: update summary list
  var captureAndBindThumbClick = function(){
    var time = sts.video.currentTime;
    sts.capture.image_time = time;
    sts.capture.image_id = IUtils.randomId();
    $('.summaryRow').unbind("click");

    seekThenCaptureImgTimes([time], [], 0, function (captures) {
      sts.capture.$image = captures[0].$image;
      $('.summaryRow').on("click", function(event){
        event.stopPropagation();
        if (event.target.classList[0] === "img-myThumbnail") {
          console.log("Thumbnail clicked.");
          // unbind the click
          $('.summaryRow').unbind("click");
          // $(this).replaceWith(img);
          // var sdid = $(this).parent().parent().parent().attr('id');
          var sdid = $(this).attr('id');
          sts.summaries[sdid].image_time = sts.capture.image_time;
          sts.summaries[sdid].image_id = sts.capture.image_id;
          sts.summaries[sdid].image_change = true;
          // refresh with current capture
          $(this).replaceWith(addCompleteSummary(sdid, sts.capture));
        }

      });
    });
  };

  // when the element is dropped
  // change start time, end time, and image time then
  var eDroppedOnEl = function(e, $el){
    var data = e.originalEvent.dataTransfer.getData('text/html');
    var ids = [];

    $(data).each(function(){
      var id = $(this).attr('id');
      if (id != undefined) {
        ids.push(id);
      }
    });

    console.log(ids);
    var sumId = $el.attr('id');

    var st = $('#' + ids[0]).data('start');
    var et = $('#' + ids[ids.length-1]).data('end');

    //update relevant information
    sts.summaries[sumId].start_time = st;
    sts.summaries[sumId].end_time = et;
    sts.summaries[sumId].image_time = st+(et-st)/2;
    sts.summaries[sumId].text = $(data).text();
    sts.summaries[sumId].text_change = true;

    seekThenCaptureImgTimes([st+(et-st)/2], [], 0, function(captures){
      $el.replaceWith(addCompleteSummary(sumId, captures[0]));
    });
  };

  function keyWhereValue(kvd, value){
    for (var i = 0; i < Object.keys(kvd).length; i++) {
      var key = Object.keys(kvd)[i];
      if (kvd[key] === value) {
        return key;
      }
    }
    return undefined;
  }

  var bindDragHandle = function($el){
    $el.on('dragenter', function(){
      $(this).css('opacity', '0.5');
    });
    $el.on('dragleave', function(){
      $(this).css('opacity', '1');
    });
    $el.on('drop', function(e){
      var v = keyWhereValue(sts.groups,sts.summaries[$(this).attr('id')].group);
      if (v != undefined) {
        sts.lastGroup = v;
      }
      $(this).css('opacity', '1');
      eDroppedOnEl(e, $(this));
    })
  };

  var addCompleteSummary = function(sdid, capture) {
    console.log("Adding summary with: ");
    console.log("sdid: " + sdid);
    console.log(capture);

    var $div = makeSummaryDiv(sdid);
    bindDragHandle($div);

    var group = sts.summaries[sdid].group;
    while (group > $('.groupRow').length - 1) {
      makeNewGroupAndAppend();
    }
    $($('.groupRow')[group]).find('.summaryCol').append($div);

    // append the capture
    $div.find('.keyframeCol').append(capture.$image);

    // TODO bind click to play
    // $div.on("click", function(){
    //     var id = $(this).attr('id');
    //     var group = sts.summaries[id].group;
    //     var video = $($('.groupRow')[group]).find('video')[0];
    //     video.currentTime =
    //       sts.summaries[sdid].start_time;
    //     video.play();
    //   });

    if (sts.summaries[sdid].text === "" && !sts.summaries[sdid].image_change){
      // add text area to enter summary
      $div.find('.textCol')
        .append('<textarea>')
        .attr('class', 'blendTextarea');

      // bind enter to updating the summary
      $div.find('textarea').on("keypress", function(e){
        if (e.keyCode === 13) {
          // get sdid
          var sdid = $(this).parent().parent().attr('id');
          //record text
          sts.summaries[sdid].text = $(this).val();
          //update summary
          sts.summaries[sdid].text_change = false;

          var cap = {};
          cap.$image = $(this).parent().parent().find('img');
          cap.image_id = $(this).parent().parent().find('img').attr('id');
          cap.image_time = sts.summaries[sdid].image_time;

          $div.replaceWith(addCompleteSummary(sdid, cap));
        }
      });

    } else if (sts.summaries[sdid].text_change === true) {
      var rid = IUtils.randomId();

      // update to have text instead of textarea

      // old code: puts text in textarea when you drag and drop
      // $div.find('.textCol')
      //   .append('<textarea>')
      //   .attr('rid', rid)
      //   .attr('class', 'blendTextarea')
      // $div.find('textarea')
      //   .html(replaceAll(' {p}','',sts.summaries[sdid].text));

      //new code: puts text as placeholder in textarea when you drag and drop
      var $ta = $('<textarea>')
            .attr('placeholder', IUtils.replaceAll(' {p}','',sts.summaries[sdid].text));

      $div.find('.textCol')
        .append($ta)
        .attr('rid', rid)
        .attr('class', 'blendTextarea');
      // end new code

      $div.find('textarea').on("keypress", function(e){
        if (e.keyCode === 13) {
          // get sdid
          var sdid = $(this).parent().parent().attr('id');
          //record text
          sts.summaries[sdid].text = $(this).val();
          //update summary
          sts.summaries[sdid].text_change = false;
          var cap = {};
          cap.$image = $(this).parent().parent().find('img');
          cap.image_id = $(this).parent().parent().find('img').attr('id');
          cap.image_time = sts.summaries[sdid].image_time;

          $div.replaceWith(addCompleteSummary(sdid, cap));
        }
      });

    } else {
      $div.find('.textCol').append($('<p>'))
        .html($('<p>').html(sts.summaries[sdid].text));
    }
    if (sts.summaries[sdid].image_change) {
      sts.summaries[sdid].image_change = false;
    }
    return $div;
  };

  var showControlsBindClicks = function() {
    $('#controls').show();
    $('#addControl').hide();
    $('#exportBtn').on("click", function(){
      console.log(sts.summaries);
      var k = sts.summaries;
      var keys = Object.keys(k);
      for (var i = 0; i < keys.length; i++) {
        if (k[keys[i]].text === "") {
          delete k[keys[i]];
        };
      };
      $('#addControl').show();
      $('#addControl').append('<textarea>');
      $('#addControl').find('textarea').val(JSON.stringify(k));
    });
    $('#importBtn').on('click',function(){
      $('#addControl').show();
      $('#addControl').append('<textarea>');
      $('#addControl').on('keypress', function (e){
        if (e.keyCode === 13) {
          $('#addControl').hide();
          var t = $('#addControl').find('textarea').val();
          $('#addControl').find('textarea').remove();
          console.log(t);
          var json = JSON.parse(t);
          var j = json;
          sts.summaries = j;
          var image_times = [];
          for (var i = 0; i < Object.keys(sts.summaries).length; i++) {
            var key = Object.keys(sts.summaries)[i];
            image_times.push(sts.summaries[key].image_time);
          }
          seekThenCaptureImgTimes(image_times, [], 0, function(captures){
            for (var i = 0; i < captures.length; i++) {
              var key = Object.keys(sts.summaries)[i];
              addCompleteSummary(key, captures[i]);
            };
          });
          $('#controls').hide();
        }
      });
    });
  };


  //================ GENERATING TRANSCRIPT VIEW=================

  // takes word json and outputs span for this word
  // input like: {
  //     paragraph: <paragraph number>,
  //     start: <start time>,
  //     end: <end time>,
  //     aligned: <aligned word>,
  //     word: <original word>,
  //     lineBreak: <yes if break should be put after>,
  //     overallIndex: <word index in transcript>
  //     idSuffix: obvious
  // }
  var createTranscriptWordInnerHTML =function(word) {
    if (word.lineBreak) {
      return word.word + "<br>";
    } else {
      return word.word + " ";
    }
  };

  var createTranscriptWordSpan = function(word) {

    var $span = $('<span>')
          .addClass('word')
          .attr('id', word.overallIndex + ""+ word.idSuffix)
          .html(createTranscriptWordInnerHTML(word))
          .data("start", word.start)
          .data("end", word.end)
          .data("word", word.word)
          .data("paragraph", word.paragraph)
          .data("ind", word.overallIndex)
          .on("click", function(){
            console.log($(this).data('word') + "  " + $(this).data('start'));
            var video = sts.video;
            video.currentTime = $(this).data('start');
            video.play();
          });

    return $span;
  };

  //================ END GENERATING TRANSCRIPT VIEW=================



  var makeThumbnail = function(seconds) {
    // change video time to this time
    var video = sts.video;
    video.currentTime = seconds;
    video.pause();

    var pic = IUtils.capture(sts.video);
    return pic;
  };

  var saveSummary = function(textarea, $summaryDiv) {
    // get text from text area
    var taText = $(textarea).val();
    // transfer style to paragraph
    var taStyle = $(textarea).attr('style');
    // delete text area

    var sdid = $summaryDiv.attr('id');
    console.log("Updating Status, Text, Style for " + sdid);
    sts.summaries[sdid].text = taText;
    sts.summaries[sdid].textStyle = taStyle;
    sts.summaries[sdid].state = 2;
    // TODO
    alert("TODO refreshSummary is missing");
    //refreshSummary(sdid);
  };

  var bindSummarySave = function($summaryDiv) {
    $summaryDiv.find('textarea').on("keypress", function(e){
      if (e.keyCode === 13) {
        saveSummary(this, $summaryDiv);
      }
    });
  };

  var getImageTime = function(start, end) {
    return (end-start)/2 + start;
  };

  // creates entry in summary dictionary
  var createSummaryEntryReturnId = function(spanIds, over){
    var summaryId = consts.summaryIdPrefix + sts.summaryIdIndex;
    sts.summaryIdIndex++;
    var entry;
    // if it isn't blank, then fill in with defaults
    if (!over) {
      var start_time = $('#'+spanIds[0]).data('start');
      var end_time = $('#' + spanIds[spanIds.length - 1]).data('end');
      entry = {
        image_time: getImageTime(start_time, end_time),
        start_time: start_time,
        end_time: end_time,
        text: "",
        span_ids: $.makeArray(spanIds),
        group: sts.groupIndex
      };
    } else {
      entry = {
        image_time: over.image_time === undefined ? 0.0 : over.image_time,
        start_time: over.start_time === undefined ? 0.0 : over.start_time,
        end_time: over.end_time === undefined ? 0.0 : over.end_time,
        text: over.text === undefined ? "" : over.text,
        span_ids: over.span_ids === undefined ? [] : over.span_ids,
        group: over.group === undefined ? sts.groupIndex : over.group
      };
    }

    sts.summaries[summaryId] = entry;
    console.log("Created summary entry with ID: " + summaryId);
    return summaryId;
  };

  var makeSummaryDiv = function(sdid) {
    var $mainDiv = $('<div>')
          .attr('id', sdid)
          .attr('class', ' row summaryRow')
          .on('mouseup', function(){
            var $spanIds = sts.lastSelection;
            var sdid = createSummaryEntryReturnId($spanIds);

            //sts.summaries[sdid].group =

          });
    var $keyframeCol = $('<div>').attr('class', 'col-md-3 keyframeCol');
    var $textCol = $('<div>').attr('class', 'col-md-9 textCol');

    $mainDiv.append($keyframeCol);
    $mainDiv.append($textCol);
    return $mainDiv;
  };

  var makeAndAppendFirstKeyframe = function(sdid, $summaryDiv) {
    var $imgDiv = $('<div>');

    $summaryDiv.find('.keyframeCol').append($imgDiv);

    sts.video.currentTime = sts.summaries[sdid].image_time;

    $(sts.video).one("seeked", function(){
      IUtils.capture($imgDiv);
      $imgDiv.find('img').attr('class', 'img-thumbnail');
    });
  };

  var makeAndAppendTextarea = function(sdid, $summaryDiv) {
    var $textarea = $('<textarea>').attr('class', 'blendTextarea');
    $summaryDiv.find('.textCol').append($textarea);
    return $textarea;
  };

  var getSpanIds = function(){
    var userSelection = window.getSelection(),
        rangeObject = userSelection.getRangeAt(0);

    var spanIds = null;
    if (rangeObject.startContainer == rangeObject.endContainer) {
      spanIds = [rangeObject.startContainer.parentNode.id];
    } else {
      var $sel = IUtils.getAllBetween(
        rangeObject.startContainer.parentNode,
        rangeObject.endContainer.parentNode);
      spanIds = $sel.map(function(){return $(this).attr('id');});
    }
    return spanIds;
  };

  var getSpanIdsCreateSummary = function(){
    var spanIds = getSpanIds();

    // make the new entry
    var sdid = createSummaryEntryReturnId(spanIds);
    seekThenCaptureImgTimes([sts.summaries[sdid].image_time],
                            [], 0,
                            function(cap_list){
                              addCompleteSummary(sdid, cap_list[0]);
                            });
  };

  function handleDragStart(e) {
    var ids = $(e.currentTarget.children).map(function(d, item){
      return $(item).attr('id');
    }),
        id_list = $.makeArray(ids);
    e.originalEvent.dataTransfer.dropEffect = "move";
    e.originalEvent.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
    e.data = {id_list: id_list};

  }

  var makeSelectionDraggable = function(){
    var $spanids = getSpanIds();
    sts.lastSelection = $spanids;
    var ids = $.makeArray($spanids);
    var subids = $(ids)
          .map(function(){
            if (this) { return this.split('main')[0] + 'sub';}
          });
    subids = $.makeArray(subids);
    var $subset = $('#'+subids.join(',#')).attr('class', 'selected');
    var $sel = $('#'+ids.join(',#')).attr('class', 'selected');
    // find id to append before
    var detached = $sel.detach();
    var afterLastId = parseInt(ids[ids.length-1].split('main')[0])+1;
    var beforeSel = '#' + afterLastId + 'main';
    var $draggableSpan = $('<span>')
          .append(detached)
          .attr('draggable', 'true');
    $(beforeSel).before($draggableSpan);

    $draggableSpan.on('dragstart', handleDragStart);
  };

  var findGroupSummaryPlaceholder = function() {
    var lastGroup = {key: "", value: -1};
    if (sts.lastGroup) {
      lastGroup.key = sts.lastGroup;
    } else {
      for (var i = 0; i < Object.keys(sts.groups).length; i++) {
        var key = Object.keys(sts.groups)[i];
        if (sts.groups[key] > lastGroup.value) {
          lastGroup.key = key; lastGroup.value = sts.groups[key];
        }
      };
    }
    createSummaryPlaceholder(lastGroup.key);
  };

  var bindKeypressin = function(){
    $(document).on("keypress", function(e){
      if(e.keyCode == 92){
        console.log("Calling makeSelectionDraggable");
        makeSelectionDraggable();
      } else if (e.keyCode === 93) {
        addTitle();
      } else if (e.keyCode === 99) {
        console.log("Calling captureAndBindThumbClick");
        captureAndBindThumbClick();
      } else if (e.keyCode === 49) {
        console.log("Calling makeNewGroupAndAppend");
        makeNewGroupAndAppend();
        // CODE to add seperating bar
        // var $b = $('<div>').attr('class', 'boundary');
        // var sh = $('#scrolling').scrollTop();
        // var th = $('#transcript').height();
        // $b.css('top', - (th - sh - 100) + 'px');
        // $b.draggable();
        // $('#transcript').append($b);
        console.log('appended seperation bar');

        //TODO make better way to do this
        for (var i = 0; i < 3; i++) {
          findGroupSummaryPlaceholder();
        };

      } else if (e.keyCode === 48) {
        console.log("Calling showControlsBindClicks");
        showControlsBindClicks();
      } else if (e.keyCode === 50) {
        findGroupSummaryPlaceholder();
        console.log("Pressed 2 on Document");
      }
    });
  };

  // attach scrollbox to timeline, then bind scroll events
  var createScrollBox = function(timelineId, transcriptId){

    var $timeline = $('#' + timelineId);
    var $transcript = $('#' + transcriptId);
    var timeHeight = $timeline[0].scrollHeight;
    var timeWidth = IUtils.getIntFromPx($timeline.css("width"));

    // how much of the timeline is in the transcript view?
    console.log("Constructing Scroll Box");
    var docHeight = consts.docHeight;
    var transHeight = $transcript[0].scrollHeight;
    var scrollBoxHeight = timeHeight*(docHeight/transHeight);

    var $scrollBox = $('<div>')
          .attr('id', 'scrollView')
          .css({
            position: 'absolute',
            top: '0px',
            left: '0px',
            opacity: .1,
            'background-color': 'black',
            width: timeWidth,
            height: scrollBoxHeight + 8
          });

    $timeline.append($scrollBox);

    return $scrollBox;
  };

  // input looks like {<paragraph number>: [{
  //     paragraph: <paragraph number>,
  //     start: <start time>,
  //     end: <end time>,
  //     aligned: <aligned word>,
  //     word: <original word>,
  //     lineBreak: <yes if break should be put after>,
  //     overallIndex: <word index in transcript>
  // }]}
  var layoutAndAppendParagraphs = function(pDict, id, fontSize){
    for (var i = 0; i < Object.keys(pDict).length; i++) {
      var key = parseInt(Object.keys(pDict)[i]);
      var $el = $('<p>');
      for (var j = 0; j < pDict[key].length; j++) {
        var word = pDict[key][j];
        var $span = createTranscriptWordSpan(word);
        $el.append($span);
      }
      $('#' + id).append($el);
      $el.css('font-size', fontSize);
      var a = $el.css('line-height');
      var newPx = IUtils.getIntFromPx(a)*4;
      $el.css('padding-bottom', newPx+"px");
    }
  };


  // just for attaching scroll events
  var attachScrollEvents = function(timelineId, transcriptId, scrollingId, $scrollBox) {
    var $scrolling = $('#' + scrollingId);
    var $timeline = $('#' + timelineId);
    var $transcript = $('#' + transcriptId);

    console.log("Attaching Scroll Events");

    // need scaling functions
    var trToTlHeight = function(n) {
      var tlHeight = 462;
      var tsHeight = IUtils.getIntFromPx($transcript.css('height'));
      return n * (tlHeight/tsHeight);
    };

    var tlToTrHeight = function(n) {
      var tlHeight = 462;
      var tsHeight = IUtils.getIntFromPx($transcript.css('height'));
      return n * (tsHeight/tlHeight);
    };

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
    $timeline.click(function(e){

      var x = e.pageX - e.target.offsetLeft,
          y = e.pageY - e.target.offsetTop;

      // move the scrollbox to click position
      $scrollBox.css('top', y);

      var newCPos = tlToTrHeight(y)
            - (consts.docHeight/2);
      if (newCPos < 0)  { newCPos = 0; }

      // move timeline to equivalent position centered
      $scrolling.scrollTop(newCPos);
    });
  };

  var loadTranscript = function(){
    $.ajax({
      url: sts.transcriptFile,
      async: false,
      dataType: 'json',
      success: function (response) {
        console.log('Loaded transcript');
        sts.transcript = response;
        var transcriptPDict = IUtils.pDictFromTranscript(response, 85, 'main');
        var timelinePDict = IUtils.pDictFromTranscript(response, 85, 'sub');
        layoutAndAppendParagraphs(transcriptPDict, 'transcript', '13px');
        layoutAndAppendParagraphs(timelinePDict, 'timeline', '2px');
        var $scrollbox = createScrollBox('timeline', 'transcript');
        attachScrollEvents('timeline', 'transcript', 'scrolling', $scrollbox);
        bindKeypressin();
      },
      error: function(e){
        console.log('Error occured when loading transcript');
        console.log(e);
      }
    });
  };

  var initialize = function(){
    $('#export').hide();
    $('#controls').hide();
    $('#exported').hide();
    makeNewGroupAndAppend();
    // TODO get better way to do this
    for (var i = 0; i < 3; i++) {
      findGroupSummaryPlaceholder();
    };
  };

  initialize();

  sts.video.addEventListener("loadedmetadata", function(){
    // need the meta data to do anything else
    console.log("Video meta data loaded.");
    loadTranscript();
  });

})(window.jQuery, window.IUtils);
