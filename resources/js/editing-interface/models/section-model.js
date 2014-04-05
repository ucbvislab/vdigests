
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/section-collection"], function (Backbone, _, $, SectionCollection) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        summary: "",
        startWord: null,
        endWord: null,
        thumbnail: ""
      };
    },

    initialize: function () {
    }
  });

});
