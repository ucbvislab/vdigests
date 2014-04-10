
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/word-collection"], function (Backbone, _, $, WordCollection) {

  return Backbone.Model.extend({
    // TODO fix hardcoding
    url: function () {
      return "resources/content/" + window.dataname + "_aligned.json";
    },

    defaults: function () {
      return {
        words: new WordCollection()
      };
    },

    /**
     * Parse the transcript model
     */
    parse: function (resp, jqxhr) {
      var words = this.get("words") || this.defaults().words;
      words.add(resp.words);
      // make the words a "linked list" TODO can the words change?
      var prevWord = null;
      words.each(function (wrd, i) {
        if (prevWord) {
          wrd.id = i;
          prevWord.next = wrd;
          wrd.prev = prevWord;
        }
        prevWord = wrd;
      });
      return {words: words};
    },

    /**
     * Change the chapter/section breakpoint -- fire a custom event
     */
    changeBreakStart: function (oldStartModel, newStartModel) {
      var thisModel = this,
          oldStartChap = oldStartModel.get("startChapter"),
          oldStartSec = oldStartModel.get("startSection");
      console.log("changing break start");
      oldStartModel.set("startChapter", false, {silent: true});
      oldStartModel.set("startSection", false, {silent: true});

      newStartModel.set("startChapter", oldStartChap, {silent: true});
      newStartModel.set("startSection", oldStartSec, {silent: true});
      oldStartModel.trigger("change:switchStartWord", oldStartModel, newStartModel);
      newStartModel.trigger("change:switchStartWord", oldStartModel, newStartModel);
    },

    resetState: function () {
      var thisModel = this;
      thisModel.get("words").each(function (wrd) {
        wrd.set("startChapter", false);
        wrd.set("startSection", false);
      });
    }
  });
});
