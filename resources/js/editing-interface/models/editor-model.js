
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/models/digest-model", "editing-interface/models/transcript-model"], function (Backbone, _, $, DigestModel, TranscriptModel) {

  return Backbone.Model.extend({

    defaults: function () {
      return {
        digest: new DigestModel(),
        transcript: new TranscriptModel()
      };
    },

    initialize: function () {
    }
  });

});
