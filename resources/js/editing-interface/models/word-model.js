
/*global define */
define(["backbone", "underscore", "jquery"], function (Backbone, _, $) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        start: -1,
        end: -1,
        word: "",
        alignedWord: "",
        speaker: -1,
        startSection: false,
        endSection: false,
        startChapter: false,
        endChapter: false
      };
    }
  });

});
