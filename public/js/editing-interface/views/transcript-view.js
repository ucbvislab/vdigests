
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/transcript-template.html"], function (Backbone, _, $, tmpl) {

  var consts = {
    wordClass: "word",
    transWordsClass: "transcript-words",
    startChapterClass: "start-chapter-marker",
    startSectionClass: "start-section-marker",
    startChapScrollClass: "start-chapter-scroll-marker",
    startSecScrollClass: "start-section-scroll-marker",
    segStClass: "start-marker",
    dragChapClass: "drag-chapter-word",
    dragSecClass: "drag-section-word",
    jspTrackClass: "jspTrack",
    scrollMarkPrefix: "scrollmark-",
    highlightClass: "word-highlight",
    blinkClass: "blink-me"
  };

  return Backbone.View.extend({
    template: _.template(tmpl),

    events: {
      "mousedown": "transMouseDown",
      "mouseup": "transMouseUp",
      "mouseenter .word": "wordMouseOver",
      "mouseleave .word": "wordMouseLeave"
    },

    initialize: function () {
      var thisView = this,
          words = thisView.model.get("words");
      // set up model listeners
      thisView.listenTo(words, "change:startSection", thisView.changeStartSection);
      thisView.listenTo(words, "change:startChapter", thisView.changeStartChapter);
      thisView.listenTo(words, "sectionToChapter", thisView.sectionToChapter);
      thisView.listenTo(words, "change:highlight", thisView.changeHighlight);
      thisView.listenTo(words, "focus", thisView.focusOnWord);
    },

    /**
     * Render the transcript words
     */
    render: function () {
      var thisView = this;
      thisView.$el.html(thisView.template(thisView.model.toJSON()));
      return thisView;
    },

    /**
     * decide whether to highlight a word
     */
    changeHighlight: function (wrd, val) {
      var $wrd = $("#" + wrd.cid);
      if (val) {
        $wrd.addClass(consts.highlightClass);
      } else {
        $wrd.removeClass(consts.highlightClass);
      }
    },

    /**
     * Mouse over a word in the transcript view
     */
    wordMouseOver: function (evt) {
      var thisView = this;
      if (thisView.$mdel && thisView.$mdel.mdStartPt) {
        // slight pause for smoother dragging
        var $curTar = $(evt.currentTarget);
        thisView.$mdel.$curWord = $curTar;
        thisView.lastEnterTimeout = window.setTimeout(function () {
          var widx = $curTar.data("idx"),
              revIndex = thisView.$mdel.revIndex,
              fwdIndex = thisView.$mdel.fwdIndex,
              $mdel = thisView.$mdel,
              $placeMdl = $curTar;
          if (widx < revIndex) {
            $placeMdl = $mdel.$minWord;
            $curTar.removeClass(thisView.$mdel.mouseOverClass);
          } else if (widx > fwdIndex) {
            $placeMdl = $mdel.$maxWord;
          } else {
            $curTar.addClass(thisView.$mdel.mouseOverClass);
          }
          $placeMdl.before($mdel);
          thisView.moveScrollMarker($mdel);
        }, 30);
      }
    },

    /**
     * Mouseleave a word in the transcript view
     */
    wordMouseLeave: function (evt) {
      var thisView = this;
      if (thisView.$mdel) {
        var $curTar = $(evt.currentTarget);
        $curTar.removeClass(thisView.$mdel.mouseOverClass);
      }
      if (thisView.lastEnterTimeout) {
        window.clearTimeout(thisView.lastEnterTimeout);
      }
    },

    /**
     * mouseup on the transcript area
     */
    transMouseUp: function (evt) {
      var thisView = this,
          $tar = $(evt.target);
      if (thisView.$mdel) {
        $("." + thisView.$mdel.mouseOverClass).removeClass(thisView.$mdel.mouseOverClass);
        var $newWord = thisView.$mdel.$curWord,
            oldWord = thisView.$mdel.origWordModel,
            words = thisView.model.get("words");
        if ($newWord){
          var newId = $newWord.attr("id");
          if (newId !== oldWord.cid) {
            var thisModel = thisView.model;
            thisModel.changeBreakStart(oldWord, words.get(newId));
          }
        }
        thisView.$mdel = null;
      }
    },

    /**
     * Listen for mousedowns on the transcript:
     * (i) normal click: start playing the video
     * (ii) shift click: create a new section
     * (iii) ctril+shift click: create a new chapter
     */
    transMouseDown: function (evt) {
      var thisView = this,
          thisModel = thisView.model,
          words = thisModel.get("words"),
          $tar = $(evt.target);
      // do nothing if we're mousedowning on a breakpoint

      thisView.$mdel = $tar;

      // add a section break
      if (evt.metaKey) {
        var $wordEl = $tar,
            changeType = "startSection";

        if (evt.altKey || evt.ctrlKey) {
          changeType = "startChapter";
        }

        // make sure we have a valid word element
        if (!$wordEl.hasClass(consts.wordClass)) {
          // check descendants
          var $tmpWordEl = $wordEl.find('.' + consts.wordClass).first();
          // check parents
          if (!$tmpWordEl.length) {
            $tmpWordEl = $wordEl.closest('.' + consts.wordClass);
          }
          // check siblings
          if (!$tmpWordEl.length) {
            $tmpWordEl = $wordEl.nextAll('.' + consts.wordClass).first();
            if (!$tmpWordEl.length) {
              $tmpWordEl = $wordEl.prevAll('.' + consts.wordClass);
            }
          }
          // throw an error if we can't find a word element
          if (!$tmpWordEl.length) {
            throw Error("unable to find word element near click");
          }
          $wordEl = $tmpWordEl;
        }

        var stWordModel = words.get($wordEl.attr('id'));
        // do nothing if the word already starts a section/chapter
        if (stWordModel.get("startChapter") || stWordModel.get("startSection")) {
          if (changeType === "startChapter" && !stWordModel.get("startChapter")){
            // change section to a chapter

            // USE STATS
            window.vdstats.nSec2Chap.push((new Date()).getTime());
            window.changingSecChap = true;

            thisView.changeStartSection (stWordModel, false);
            stWordModel.set("startChapter", true);

            // USE STATS
            window.changingSecChap = false;

          } else if (changeType === "startSection"
                     && stWordModel.get("startChapter")) {
            // change chapter to section

            // USE STATS
            window.vdstats.nChap2Sec.push((new Date()).getTime());
            window.changingSecChap = true;

            stWordModel.set("startChapter", false);
            thisView.changeStartSection (stWordModel, true);

            // USE STATS
            window.changingSecChap = false;
          }
          return;
        } else {
          // word does not already start a section/chapter
          stWordModel.set(changeType, true);
        }
      } // end alt-key
      else {
        var $fWord = thisView.$mdel.next();
        thisView.$mdel.origIndex = $fWord.data("idx");
        // make sure we leave the original segment
        if (thisView.$mdel.origIndex === 0) {
          return;
        }

        thisView.$mdel.mdStartPt = thisView.$mdel.hasClass(consts.segStClass);
        thisView.$mdel.isChap = thisView.$mdel.hasClass(consts.startChapterClass);
        if (thisView.$mdel.mdStartPt) {
          var revIndex = -1,
              fwdIndex = Infinity,
              $mdel = thisView.$mdel;
          thisView.$mdel.mouseOverClass = $mdel.isChap ? consts.dragChapClass : consts.dragSecClass;

          // get the forward section/chapter index
          var fwordModel = words.get($fWord.attr("id"));
          if ($fWord.hasClass(consts.wordClass)) {
            thisView.$mdel.origWordModel = fwordModel;
            var fstartModel = fwordModel.getNextSectionStart();
            if (fstartModel) {
              var $maxWord = $("#" + fstartModel.cid);
              $mdel.$maxWord = $maxWord;
              fwdIndex = $maxWord.data("idx");
            }
          }
          // get the backward section/chapter index
          if ($fWord.hasClass(consts.wordClass)) {
            var bstartModel = fwordModel.getPrevSectionStart();
            if (bstartModel) {
              var $minWord = $("#" + bstartModel.cid);
              $mdel.$minWord = $minWord;
              revIndex = $minWord.data("idx");
            }
          }
          console.log("rev index " + revIndex);
          console.log("fwd index " + fwdIndex);
          $mdel.revIndex = revIndex;
          $mdel.fwdIndex = fwdIndex;
        } else {
          // we're not clicking on a breakpoint
          if ($tar.hasClass(consts.wordClass)) {
            // we're mousedowning on a word
            var upword = words.get($tar.attr("id")),
                chstWord = upword.getPrevChapterStart(true),
                secWord = upword.getPrevSectionStart(true);;
            if (chstWord) {
              // USE STATS
              window.vdstats.nVideoStartsFromTrans.push((new Date()).getTime());
              window.startFromTran = true;

              chstWord.trigger("startVideo", upword.get("start"));
              secWord.trigger("infocus");

              // USE STATS
              window.setTimeout(function () {
                window.startFromTran = false;
              }, 800);

            }
          }
        }
      }
    },

    changeStartSection:  function (wmodel, newVal) {
      var thisView = this;

      if (!newVal || !wmodel.get("startChapter")) {
        var $secEl = thisView.changeSpanIndicator(wmodel, newVal, consts.startSectionClass);
        if (newVal) {
          // add marker to the scrollbar
          var  mpos = thisView.getScrollMarkPercent($secEl);
          thisView.addScrollMarker(mpos, consts.startSecScrollClass, $secEl.attr("id"));
        } else {
          // else remove the marker if one is present before the given word
          thisView.removeScrollMarker($secEl.attr("id"));
        }
      }
    },

    changeStartChapter:  function (wmodel, newVal) {
      var thisView = this,
          $chapEl = thisView.changeSpanIndicator(wmodel, newVal, consts.startChapterClass);
      if (newVal) {
        // add marker to the scrollbar
        var mpos = thisView.getScrollMarkPercent($chapEl);
        thisView.addScrollMarker(mpos, consts.startChapScrollClass, $chapEl.attr("id"));
      } else {
        // remove the marker from the scrollbar
        thisView.removeScrollMarker($chapEl.attr("id"));
      }
    },

    changeSpanIndicator: function (wmodel, newVal, spanClass) {
      var thisView = this,
          $wel = thisView.$el.find("#" + wmodel.cid),
          $startEl;
      if (newVal) {
        $startEl = $('<span>');
        $startEl.attr("id", Math.random().toString(36).substr(10));
        $startEl.addClass(spanClass);
        $startEl.addClass(consts.segStClass);
        $startEl.insertBefore($wel);
      } else {
        $startEl = $wel.prev();
        if ($startEl.hasClass(consts.segStClass)) {
          $startEl.remove();
        } else {
          $startEl = $();
        }
      }
      return $startEl;
    },

    sectionToChapter: function (startWord) {
      var thisView = this;
      // remove the section marker
      thisView.changeStartSection(startWord, false);
      // add a chapter marker
      thisView.changeStartChapter(startWord, true);
    },

    addScrollMarker: function (pos, mclass, relid) {
      var thisView = this,
          $smark = $("<div>");
      $smark.addClass(mclass);
      $smark.css("top", pos);
      $smark.attr("id", consts.scrollMarkPrefix + relid);
      $(document.body).append($smark);
    },

    removeScrollMarker: function (relid) {
      var $mpiece = $("#" + consts.scrollMarkPrefix + relid);
      $mpiece.remove();
    },

    moveScrollMarker: function ($corrEl) {
      var thisView = this,
          pos = thisView.getScrollMarkPercent($corrEl),
          $scrollEl = $("#" + consts.scrollMarkPrefix + $corrEl.attr("id"));
      $scrollEl.css("top", pos);
      return $scrollEl;
    },

    getScrollMarkPercent: function ($transEl) {
      var thisView = this;
      return $transEl.position().top/thisView.$el.find("." + consts.transWordsClass).height()*100 - 0.1 + "%";
    },

    focusOnWord: function (fword) {
      if (window.jspApi) {
        window.jspApi.scrollToElement("#" + fword.cid, true, true);
      }
      var $segMark =  $('#' + fword.cid).prevAll("." + consts.segStClass + ":first");
      $segMark.addClass(consts.blinkClass);
      window.setTimeout(function () {
        $segMark.removeClass(consts.blinkClass);
      }, 3300);
    }
  });
});
