
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/models/digest-model", "editing-interface/models/transcript-model", "editing-interface/models/chapter-model", "editing-interface/models/section-model"], function (Backbone, _, $, DigestModel, TranscriptModel, ChapterModel, SectionModel) {

  return Backbone.Model.extend({

    defaults: function () {
      return {
        digest: new DigestModel(),
        transcript: new TranscriptModel()
      };
    },

    initialize: function () {
      var thisModel = this;
      thisModel.listenTo(thisModel.get("transcript").get("words"),
                        "change:startSection", thisModel.handleSectionChange);
      thisModel.listenTo(thisModel.get("transcript").get("words"),
                         "change:startChapter", thisModel.handleChapterChange);
    },

    /**
     * Make sure we have at least one chapter in our digest and transcript
     */
    postInit: function () {
      var thisModel = this;
      // mark the first chapter if no chapters are present
      var chaps = thisModel.get("digest").get("chapters");
      if (!chaps.length) {
        console.log("postinit");
        var fw = thisModel.get("transcript").get("words").first();
        fw.set("startChapter", true);
      }
    },

    /**
     * Listen for an event corresponing to a chapter change
     */
    handleChapterChange: function (chWord, newVal) {
      var thisModel = this,
          chaps = thisModel.get("digest").get("chapters"),
          chWordStTime = chWord.get("start");

      if (newVal) {
        console.log( "new chapter in editor model" );
        // we're creating a new chapter
        var newChap = new ChapterModel({startWord: chWord}),
            prevChWord = chWord.getPrevChapterStart();

        if (prevChWord) {
          var prevChap = chaps.findWhere({startWord: prevChWord});
          var addSecs = prevChap.get("sections").filter(function (sec) {
            var sw = sec.get("startWord");
            return sw.get("start") >= chWordStTime;
          });
          prevChap.get("sections").remove(addSecs);
          newChap.get("sections").add(addSecs);
        }
        chaps.add(newChap);

      } else {
        console.log("editor model false chapter");
      }
    },

    /**
     * Listen for an event corresponing to a section change
     */
    handleSectionChange: function (chWord, newVal) {
      var thisModel = this,
          chaps = thisModel.get("digest").get("chapters");

      if (newVal) {
        // we're adding a section
        var prevChapStWord = chWord.getPrevChapterStart(),
            prevSecStWord = chWord.getPrevSectionStart();

        if (chWord.get("startChapter")) {
          prevChapStWord = chWord;
        }
        if (!prevChapStWord) {
          throw Error("section marked without a chapter existing");
        }

        var prevChap = chaps.findWhere({startWord: prevChapStWord}),
            newSection = new SectionModel({startWord: chWord});
        prevChap.get("sections").add(newSection);

      } else {
          console.log("editor model false section");
        // we're removing a section
      }
    }
  });
});
