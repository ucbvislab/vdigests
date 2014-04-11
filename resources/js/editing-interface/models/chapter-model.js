
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/collections/section-collection", "editing-interface/models/section-model"], function (Backbone, _, $, SectionCollection, SectionModel) {

  return Backbone.Model.extend({
    defaults: function () {
      return {
        sections: new SectionCollection(),
        startWord: null,
        title: ""
      };
    },

    initialize: function (args) {
      var thisModel = this,
          startWord = thisModel.get("startWord");

      // FIXME HACK to keep track of videos
      thisModel.set("vct", window.vct++);
      thisModel.switchStartWordListeners(null, startWord);

      // chapters should have at least one section
      if (thisModel.get("sections").length === 0 && !args.sec2Chap) {
        startWord.set("startSection", true, {silent: true});
        thisModel.get("sections").add(new SectionModel({startWord: startWord}));
      }
    },

    switchStartWordListeners: function (oldWord, newWord) {
      var thisModel = this;

      console.log( "switch start word listeners" );

      // USE STATS
      if (oldWord) {
        window.vdstats.nChapMoves.push((new Date()).getTime());
      }

      thisModel.set("startWord", newWord);
      thisModel.listenToOnce(newWord, "change:switchStartWord", thisModel.switchStartWordListeners);
      thisModel.listenTo(newWord, "startVideo", function (stTime) {
        thisModel.trigger("startVideo", stTime);
      });
      thisModel.listenTo(newWord, "change:startChapter", function (wrd, val) {
        if (!val) {

          // USE STATS
          window.vdstats.nChapDeletion.push((new Date()).getTime());

          thisModel.destroy();
        }
      });

      // stop listening to the old word
      if (oldWord) {
        thisModel.stopListening(oldWord);
      }
    }

  });
});
