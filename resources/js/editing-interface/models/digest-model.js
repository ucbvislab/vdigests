
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/chapter-collection", "editing-interface/models/chapter-model"], function (Backbone, _, $, ChapterCollection, ChapterModel) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        title: "",
        chapters: new ChapterCollection()
      };
    },

    initialize: function () {
      var thisModel = this;
      // thisModel.listenTo(thisModel.get("chapters"), "add", function (newChap) {
      //   window.setTimeout(function(){
      //     var newStartWord = newChap.get("startWord");
      //     newStartWord.set("startChapter", true);
      //   }, 200);
      // });
      // thisModel.listenTo(thisModel.get("chapters"), "remove", function (rmChap) {
      //     var newStartWord = rmChap.get("startWord");
      //     newStartWord.set("startChapter", false);
      // });
    }
  });
});
