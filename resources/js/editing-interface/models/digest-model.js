
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
        thisModel.listenTo(thisModel.get("chapters"), "remove", function (chp) {
          // move section of the chapter to the preceding chapter if it exists
          console.log("remove chapter from digest model");
          var chpStartTime = chp.get("sections").models[0].get("startWord").get("start"),
              closestChapter,
              curMin = Infinity;
          thisModel.get("chapters").each(function (ochap) {
            var cstime = ochap.get("sections").models[0].get("startWord").get("start"),
                tDiff = chpStartTime - cstime;

            if (tDiff > 0 && tDiff < curMin ) {
              curMin = tDiff;
              closestChapter = ochap;
            }
          });
          if (closestChapter) {
            closestChapter.get("sections").add(chp.get("sections").models);
          } else {
            throw Error("Changed chapter does not have a preceeding chapter");
          }
        });
    },

    getOutputJSON: function () {
      var thisModel = this,
          outjson = {},
          ij = 0;
      thisModel.get("chapters").each(function (chap, i) {
        chap.get("sections").each(function (sec, j) {
          var secjson = {
            group: i,
            group_title: chap.get("title"),
            text: sec.get("summary"),
            start_time: sec.get("startWord").get("start"),
            text_change: false,
            image_change: false,
            image_id: sec.get("thumbnail").cid,
            image_time: sec.get("thumbnail").get("time")
          };
          outjson[ij++] = secjson;
        });
      });
      return outjson;
    }
  });
});
