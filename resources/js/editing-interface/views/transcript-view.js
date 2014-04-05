
/*global define */
define(["backbone", "underscore", "jquery", "text!templates/transcript-template.html"], function (Backbone, _, $, tmpl) {
  var consts = {
    wordClass: "word",
    startSectionClass: "start-section-marker"
  };

  return Backbone.View.extend({
    template: _.template(tmpl),

    events: {
      "mousedown": "transMouseDown"
    },

    initialize: function () {
      var thisView = this;

      // set up model listeners
      thisView.listenTo(thisView.model.get("words"), "change:startSection", thisView.changeStartSection);
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
     * Listen for mousedowns on the transcript:
     * (i) normal click: start playing the video
     * (ii) shift click: create a new section
     * (iii) ctril+shift click: create a new chapter
     */
    transMouseDown: function (evt) {
      var thisView = this,
          thisModel = thisView.model,
          $tar = $(evt.target);
      // do nothing if we're mousedowning on a breakpoint

      // add a section break
      if (evt.shiftKey) {
        var $wordEl = $tar;

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

        var stWordModel = thisModel.get("words").get($wordEl.attr('id'));

        // do nothing if the word already starts a section
        if (stWordModel.get("startSection")) {
          return;
        }
        console.log("start section");
        stWordModel.set('startSection', true);
      }
    },

    changeStartSection:  function (wmodel) {
      var thisView = this,
          $wel = thisView.$el.find("#" + wmodel.cid),
          $startEl = $('<span>');
      $startEl.data("word", wmodel.cid);
      $startEl.addClass(consts.startSectionClass);
      $startEl.insertBefore($wel);
    }
  });
});
