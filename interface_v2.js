document.ready = (function ($, IUtils) {
  // make sure the resolution matches the imageView space

  // consts: don't change
  var consts = {
    docHeight: 900,
    timelineFontSize: 2,
    transFontSize: 13,
    linkedFocusTextAreaClass: 'linked-summary-focus',
    hightlightTransClass: 'highlight-trans',
    summaryIdPrefix: "sumDiv",
    eventsAddedData: "events-added",
    transWrapId: "transcript-wrap",
    keyFrameCol: "keyframeCol",
    curSelTransTextClass: "cur-sel-trans-text",
    transId: "transcript",
    outputSummaryId: "outputSummary",
    timelineId: "timeline",
    thumbClass: "img-myThumbnail",
    assocClass: "summary-associated-text",
    absSummaryClass: "abs-summary",
    transSegClass: "trans-seg",
    numInitSegs: 3,
    ssImgPath: "resources/img/camera-icon.png",
    endSegmentClass: "end-segment-word",
    RETURN_KEY_CODE: 13
  };

  // state: changes
  var sts = {
    transcriptFile: 'resources/HansRosling_aligned.json',
    video: undefined,
    $video: undefined,
    summaries: {},
    capture: {},
    summaryIdIndex: 0,
    groupIndex: 0,
    // id: group number
    groups: {},
    lastGroup: "",
    lastSelection:[],
    // TODO make an object for these
    sumToTransWrapId: {},
    transWrapToSumId: {},
    vn: 0
  };

  // helper functions
  var handleSummaryChange = function(e){
    var $this = $(this),
        $thisGP = $(this.parentElement.parentElement),
        sdid = $thisGP.attr("id"),
        cap = {};

    //record text
    sts.summaries[sdid].text = $this.val();
    //update summary
    sts.summaries[sdid].text_change = false;
    cap.$image = $thisGP.find('img');
    cap.image_id = $thisGP.find('img').attr('id');
    cap.image_time = sts.summaries[sdid].image_time;

    var $spanEls = sts.lastSelection;
    if ($spanEls.length) {
      // mark span els as associated
      var curSelClass = consts.curSelTransTextClass,
          assocClass = consts.assocClass;

      $spanEls.removeClass(curSelClass);
      $spanEls.attr("draggable", false);
      var $segWrap = $("<span>");
      $segWrap.addClass(consts.transSegClass);
      var lastEl = $spanEls.eq($spanEls.length-1);
      $segWrap.attr("draggable", true).attr("id", $spanEls.get(0).id + lastEl.attr("id") + "-swrap");

      $spanEls.eq(0).nextUntil(lastEl).andSelf().add(lastEl).wrapAll($segWrap);
      sts.sumToTransWrapId[sdid] = $segWrap.attr("id");
      sts.transWrapToSumId[$segWrap.attr("id")] = sdid;
      sts.lastSelection = [];
    } else {
      $("#" + sts.sumToTransWrapId[sdid]).removeClass(consts.hightlightTransClass);
    }
    $this.removeClass(consts.linkedFocusTextAreaClass);
  };

  // Global listeners
  var $body = $(document.body);
  var setBodyHeight = function (inHeight) {
    $body.height(inHeight);
  };

  var $window = $(window);
  $window.resize(function () {
    setBodyHeight($window.height());
  });
  // init
  setBodyHeight($window.height());


  //============== INTERFACE CONTROLS ==================
  var addTitle = function() {
    // $('#'+sts.lastGroup);
  };

  var createSummaryPlaceholder = function(groupId) {
    var imgid = IUtils.randomId();
    var $img = $('<img>')
          .attr('class', consts.thumbClass)
          .attr('id', imgid)
          .attr("src", consts.ssImgPath);

    var cap = {
      $image: $img,
      image_id: imgid,
      image_time: 0.0
    };

    var sdid = createSummaryEntryReturnId([], {group: sts.groups[groupId]});
    var $sdiv = addCompleteSummary(sdid, cap);
    // TODO bind mouseup
  };

  var bindGroupSummaryPlaceholder = function($groupRowDiv) {
    sts.lastGroup = $groupRowDiv.attr('id');
    var $ctrldiv = $('<div>').attr('class', 'groupCtrl');
    $ctrldiv.append($('<input>').attr('placeholder', 'Subtitle'));
    $ctrldiv.on('click',function(){
      sts.lastGroup = $groupRowDiv.attr('id');
    });
    $groupRowDiv.prepend($ctrldiv);
  };

  var makeGroupRow = function(groupNumber){
    var gid = IUtils.randomId();
    var $groupRowDiv = $('<div>')
          .attr('class', 'row groupRow')
          .attr('id', gid);

    sts.groups[gid] = groupNumber;
    var $videoCol = $('<div>').attr('class', 'col-xs-6 videoCol');
    //TODO: fix this awfulness
    var $video = $('<video controls preload="auto" width="315px" height="236px" poster="resources/HansRosling_poster.png"> <source src="resources/HansRosling'+sts.vn+'.mp4" type="video/mp4" /> </video>');
    var $summaryCol = $('<div>').attr('class', 'col-xs-6 summaryCol');
    sts.vn++;
    $videoCol.append($video);

    var $groupIcon = $('<div>').attr('class', 'add-group-icon');
    $groupIcon.text("+ add group");
    $groupIcon.on("click", function () {
      makeNewGroupAndAppend();
    });
    $videoCol.append($groupIcon);

    $groupRowDiv.append($videoCol);
    $groupRowDiv.append($summaryCol);

    //TODO: add group-wise video back in
    if (sts.video === undefined) {
      sts.video = $video[0];
      sts.$video = $video;
    }

    var $buttonAdd = $('<button>')
          .html('<span class="">+ add segment</span>')
          .attr('class', 'add-segment btn btn-sm')
          .click(function(){
            sts.lastGroup = $groupRowDiv.attr('id');
            findGroupSummaryPlaceholder();
          });
    $summaryCol.append($buttonAdd);

    return $groupRowDiv;
  };

  var makeNewGroupAndAppend = function(){
    var $groupRowDiv = makeGroupRow(sts.groupIndex);
    bindGroupSummaryPlaceholder($groupRowDiv);
    $('#outputSummary').append($groupRowDiv);
    sts.groupIndex++;
    for (var i = 0; i < consts.numInitSegs; i++) {
      findGroupSummaryPlaceholder();
    };
    return sts.groupIndex - 1;
  };

  //================= CONTROLLER =======================

  var bindGlobalListeners = function () {
    var $doc = $(document),
        $trans = $("#" + consts.transWrapId);

    $trans.on("mousedown", function (evt) {
      // if not inside a selected element, remove the previous selected range
      // TODO check if shift is pressed
    });
    $trans.on("mouseup", function (evt) {
      // TODO breaks I.E. (use HTML5 shim)
      var sel = document.getSelection();
      if (sel.type === "Range") {
        // TODO if shift is pressed and have a current selection, adjust current
        // the selected region should behave like standard highlighted text
        // TODO how to handle overlapping selections?
        makeSelectionDraggable();
      } else {
        // show the corresponding segment summary
        var $tar = $(evt.target),
            $seg = $tar.closest("." + consts.transSegClass);
        if ($seg.length) {
          // if we're inside a segment: highlight and show the corresponding summary
          var sumId = sts.transWrapToSumId[$seg.attr("id")];
          if (sumId) {
            var $sumEl = $("#" + sumId);
            // bring it into view and then
            $("#" + consts.outputSummaryId).scrollTo($sumEl, {
              offsetTop : $seg.offset().top,
              duration: 250
              },
              function () {
                console.log("scroll complete");
                $sumEl.find("." + consts.absSummaryClass).focus();
              }
            );
          }
        }
      }
    });

    $doc.on("mousedown", function (event) {
      // deselect selected transcript text if we're not clicking on that text
      var $tar = $(event.target),
          curSelTransTextClass = consts.curSelTransTextClass;
      if (sts.lastSelection.length && !$tar.hasClass(curSelTransTextClass) && !$(document.activeElement).hasClass(consts.absSummaryClass)) {
        sts.lastSelection.each(function (i, sel) {
          $(sel).removeClass(curSelTransTextClass)
            .attr("draggable", false);

        });
        sts.lastSelection = [];
      }
    });

    $doc.on("keypress", function(e){
      // TODO be careful about context (e.g. while a input element isn't focused)
      if (e.keyCode === consts.RETURN_KEY_CODE) {
        e.target.blur();
      } else if (e.keyCode === 99) {
        captureAndBindThumbClick();
      } else if (e.keyCode === 49) {
        makeNewGroupAndAppend();
      // } // else if (e.keyCode === 48) {
        // showControlsBindClicks();
      } else if (e.keyCode === 50) {
        findGroupSummaryPlaceholder();
      }
    });
  };

  // seek and capture at time
  var seekThenCaptureImgTimes = function(time_list, cap_list, i, callback) {
    var vid = sts.video;
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
        cap.$image = $(uri)
          .attr('class', 'img-myThumbnail')
          .attr('id', cap.image_id);

        // add them to a global list
        cap_list.push(cap);

        // do it again
        seekThenCaptureImgTimes(time_list, cap_list, i+1, callback);
      });
    } else {
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
          // unbind the click
          $('.summaryRow').unbind("click");
          var $this = $(this),
              sdid = $(this).attr('id');
          sts.summaries[sdid].image_time = sts.capture.image_time;
          sts.summaries[sdid].image_id = sts.capture.image_id;
          sts.summaries[sdid].image_change = true;
          // add current capture
          $this.find('.' + consts.keyFrameCol).html(sts.capture.$image);
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
      $el.find('.' + consts.keyFrameCol).html(captures[0].$image);
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
    $el.on('dragover', function(evt){
      $(this).css('opacity', '0.5');
      evt.stopPropagation();
    });
    $el.on('dragenter', function(evt){
      $(this).css('opacity', '0.5');
      evt.stopPropagation();
    });
    $el.on('dragleave', function(){
      $(this).css('opacity', '1');
    });
    $el.on('drop', function(evt){
      console.log("drop");
      var v = keyWhereValue(sts.groups,sts.summaries[$(this).attr('id')].group);
      if (v != undefined) {
        sts.lastGroup = v;
      }
      $(this).css('opacity', '1');
      eDroppedOnEl(evt, $(this));
      var $ftextarea = $($el.find('.' + consts.absSummaryClass));
      $ftextarea.focus();
      $ftextarea.attr("data-ph", "provide a brief summary of the highlighted text");
      $ftextarea.addClass(consts.linkedFocusTextAreaClass);
      // don't fill the textarea with text
      evt.preventDefault();
    });
  };

  /**
   * This function adds a complete summary [placeholder] with a specified id and capture object
   * this should only be called when creating a new summary (don't replace old ones)
   */
  var addCompleteSummary = function(sdid, capture) {
    var $div = makeSummaryDiv(sdid),
        group = sts.summaries[sdid].group;

    bindDragHandle($div);
    while (group > $('.groupRow').length - 1) {
      makeNewGroupAndAppend();
    }
    // COLO TODO this shouldn't go here
    $($('.groupRow')[group]).find('.summaryCol').append($div);

    var $textA = $("<div>").addClass(consts.absSummaryClass);
    $textA.attr("contenteditable", true);
    $div.find('.textCol')
      .append($textA)
      .attr('class', 'blendTextarea');
    $textA.on("blur", handleSummaryChange);
    $textA.on("focus", function (evt) {
      var curTar = evt.currentTarget,
          transSpanId = sts.sumToTransWrapId[$div.attr("id")];
      console.log( transSpanId );
      var $transSpan = $("#" + transSpanId);
      if ($transSpan.length) {
        $transSpan.addClass(consts.hightlightTransClass);
        $textA.addClass(consts.linkedFocusTextAreaClass);
        $("#" + consts.transWrapId).scrollTo($transSpan, {offsetTop : $textA.offset().top});
          // $('#transcript-wrap').animate({
          //   scrollTop: $transSpan.position().top
          // }, 800);
      }

      // get the transcript div and highlight
      // form a dict that links to the transcript and vice-versa and highlight back and forth
    });

    // TODO bind click to play
    // $div.on("click", function(){
    //     var id = $(this).attr('id');
    //     var group = sts.summaries[id].group;
    //     var video = $($('.groupRow')[group]).find('video')[0];
    //     video.currentTime =
    //       sts.summaries[sdid].start_time;
    //     video.play();
    //   });

    // place the capture
    $div.find('.' + consts.keyFrameCol).html(capture.$image);

    if (sts.summaries[sdid].image_change) {
      sts.summaries[sdid].image_change = false;
    }
    return $div;
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
    return word.word + " ";
    // if (word.lineBreak) {
    //   return word.word + "<br>";
    // } else {
    //   return word.word + " ";
    // }
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
            var video = sts.video;
            video.currentTime = $(this).data('start');
            video.play();
          });

    return $span;
  };

  //================ END GENERATING TRANSCRIPT VIEW=================

  var getImageTime = function(start, end) {
    return (end-start)/2 + start;
  };

  // creates entry in summary dictionary
  var createSummaryEntryReturnId = function(spanEls, over){
    var summaryId = consts.summaryIdPrefix + sts.summaryIdIndex,
        entry;
    sts.summaryIdIndex++;

    // if it isn't blank, then fill in with defaults
    if (!over) {
      var start_time = spanEls.eq(0).data('start');
      var end_time = spanEls.eq(spanEls.length - 1).data('end');
      entry = {
        image_time: getImageTime(start_time, end_time),
        start_time: start_time,
        end_time: end_time,
        text: "",
        span_els: spanEls,
        group: sts.groupIndex
      };
    } else {
      entry = {
        image_time: over.image_time === undefined ? 0.0 : over.image_time,
        start_time: over.start_time === undefined ? 0.0 : over.start_time,
        end_time: over.end_time === undefined ? 0.0 : over.end_time,
        text: over.text === undefined ? "" : over.text,
        span_els: over.span_els === undefined ? [] : over.span_ids,
        group: over.group === undefined ? sts.groupIndex : over.group
      };
    }

    sts.summaries[summaryId] = entry;
    return summaryId;
  };

  var makeSummaryDiv = function(sdid) {
    var $keyframeCol = $('<div>').attr('class', 'col-xs-3 keyframeCol');
    var $textCol = $('<div>').attr('class', 'col-xs-9 textCol');
    var $removeEl = $('<div>').attr('class', 'subtract-icon iconicfill-x-alt');

    var $mainDiv = $('<div>')
          .attr('id', sdid)
          .attr('class', ' row summaryRow')
          .on('mouseenter', function (evt) {
            $removeEl.show();
          })
          .on('mouseleave', function (evt) {
            $removeEl.hide();
          });

    $mainDiv.append($keyframeCol);
    $mainDiv.append($textCol);
    $mainDiv.append($removeEl);

    $removeEl.on('click', function (evt) {
      if (confirm("Do you want to delete this segment (this can't be undone)?")) {
        var mainId = $mainDiv.attr("id"),
            segId = sts.sumToTransWrapId[mainId];
        $("#" + segId).contents().unwrap();
        delete sts.sumToTransWrapId[mainId];
        delete sts.transWrapToSumId[mainId];
        delete sts.summaries[mainId];
        $mainDiv.remove();
      }
    });

    return $mainDiv;
  };

  // var makeAndAppendFirstKeyframe = function(sdid, $summaryDiv) {
  //   var $imgDiv = $('<div>');

  //   $summaryDiv.find('.keyframeCol').append($imgDiv);

  //   sts.video.currentTime = sts.summaries[sdid].image_time;

  //   $(sts.video).one("seeked", function(){
  //     IUtils.capture($imgDiv);
  //     $imgDiv.find('img').attr('class', 'img-thumbnail');
  //   });
  // };

  // var makeAndAppendTextarea = function(sdid, $summaryDiv) {
  //   var $textarea = $('<textarea>').attr('class', 'blendTextarea');
  //   $summaryDiv.find('.textCol').append($textarea);
  //   return $textarea;
  // };

  /**
   * Return an array of jquery objects corresponding to the currently highlighted span elements
   */
  var getSelSpanEls = function(){
    var userSelection = window.getSelection(),
        rangeObject = userSelection.getRangeAt(0);

    var $spanEls = null;
    if (rangeObject.startContainer == rangeObject.endContainer) {
      $spanEls = $(rangeObject.startContainer.parentNode);
    } else {
      $spanEls = IUtils.getAllBetween(
        rangeObject.startContainer.parentNode,
        rangeObject.endContainer.parentNode);
    }
    return $spanEls;
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

  /**
   * Add the appropriate class and draggable property to the current selection of span elements
   */
  var makeSelectionDraggable = function(){
    var $spanels = getSelSpanEls();
    sts.lastSelection = $spanels;
    $spanels.addClass(consts.curSelTransTextClass).attr("draggable", true);
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

  var layoutAndAppendParagraphs = function(pDict, id, fontSize){
    for (var i = 0; i < Object.keys(pDict).length; i++) {
      var key = parseInt(Object.keys(pDict)[i]);
      var $el = $('#' + id);
      for (var j = 0; j < pDict[key].length; j++) {
        var word = pDict[key][j];
        var $span = createTranscriptWordSpan(word);
        $el.append($span);
      }
      // $('#' + id).append($el);
      $el.append("<br>");
      $el.append("<br>");
    }
  };

  var loadTranscript = function(){
    $.ajax({
      url: sts.transcriptFile,
      async: false,
      dataType: 'json',
      success: function (response) {
        sts.transcript = response;
        var transcriptPDict = IUtils.pDictFromTranscript(response, 85, 'main'),
            timelinePDict = IUtils.pDictFromTranscript(response, 85, 'sub');
        //$scrollbox = createScrollBox(consts.timelineId, consts.transId);

        layoutAndAppendParagraphs(transcriptPDict, consts.transId, consts.transFontSize + 'px');
        layoutAndAppendParagraphs(timelinePDict, consts.timelineId, consts.timelineFontSize + 'px');
        bindGlobalListeners();
      },
      error: function(e){
      }
    });
  };

  var initialize = function(){
    $('#export').hide();
    $('#controls').hide();
    $('#exported').hide();
    makeNewGroupAndAppend();
    // TODO get better way to do this

  };

  initialize();

  sts.video.addEventListener("loadedmetadata", function(){
    // need the meta data to do anything else
    loadTranscript();
  });

  // REMOVE ME -- TODO FIXME DEVELOPMENT
  $("video").prop('muted', true); //mute: Colorado's tired of hearing Han go on about Swedish students and chimpanzees
})(window.jQuery, window.IUtils);
