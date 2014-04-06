
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
      thisModel.listenTo(thisModel.get("startWord"), "change:switchStartWord", function (oldWord, newWord) {
        thisModel.set("startWord", newWord);
      });
    }
  });
});
