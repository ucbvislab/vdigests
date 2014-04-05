
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/word-collection"], function (Backbone, _, $, WordCollection) {

  return Backbone.Model.extend({
    // TODO fix hardcoding
    url: "resources/content/HansRosling_aligned.json",

    defaults: function () {
      return {
        words: new WordCollection()
      };
    },

    parse: function (resp, jqxhr) {
      var words = this.get("words") || this.defaults().words;
      words.add(resp.words);
      // make the words a "linked list" TODO can the words change?
      var prevWord = null;
      words.each(function (wrd) {
        if (prevWord) {
          prevWord.next = wrd;
          wrd.prev = prevWord;
        }
        prevWord = wrd;
      });
      return {words: words};
    }
  });
});
