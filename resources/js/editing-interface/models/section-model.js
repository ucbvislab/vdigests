
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/section-collection"], function (Backbone, _, $, SectionCollection) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        summary: "",
        startWord: null,
        thumbnail: null
      };
    },

    initialize: function () {
      var thisModel = this;
      thisModel.listenToOnce(thisModel.get("startWord"), "change:switchStartWord", thisModel.switchStartWord);
    },

    switchStartWord: function (oldWord, newWord) {
      var thisModel = this;
      thisModel.set("startWord", newWord);
      thisModel.listenToOnce(newWord, "change:switchStartWord", thisModel.switchStartWord);
    }
  });
});
