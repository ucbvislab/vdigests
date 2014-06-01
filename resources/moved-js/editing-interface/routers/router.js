
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/models/editor-model", "editing-interface/views/editor-view", "editing-interface/views/output-digest-view"], function (Backbone, _, $, EditorModel, EditorView, OutputView) {
  "use strict";

  /**
   * Central router to control URL state
   */
  return (function () {
    var consts = {
      editingId: "editing-interface",
      viewingId: "viewing-interface"
    };
    return Backbone.Router.extend({

      routes: {
        "": "noParams",
        "edit/:params": "editRoute",
        "view/:params": "viewRoute"
      },

      noParams: function () {
        alert("you must set the desired data after the hashbang, e.g. #edit/skhci");
      },

      /**
       * Main route for the viewing interface
       */
      viewRoute: function (dataname) {
        var thisRoute = this;
        if (!thisRoute.editorModel) {
          thisRoute.editRoute(dataname, true);
          return;
        }
        thisRoute.outputView = new OutputView({model: thisRoute.editorModel});
        $("#" + consts.viewingId).html(thisRoute.outputView.render().el);
        thisRoute.$editingInterface = thisRoute.$editingInterface || $("#" + consts.editingId);
        // pause any playing videos
          thisRoute.$editingInterface.find("video").each(function (i, vid) {
            vid.pause();
          });
         thisRoute.$editingInterface.hide();
        thisRoute.$viewingView = thisRoute.$viewingView || $("#" + consts.viewingId);
        thisRoute.$viewingView.show();
      },

      /**
       * Main route for editing interface
       * TODO allow input video to be specified as a param?
       */
      editRoute: function (dataname, toView) {
        var thisRoute = this,
            reloadTrans = true;
        // create the editor model which has the trans and digest views

        window.dataname = dataname;

        var showCallback = function () {
          thisRoute.$viewingView = thisRoute.$viewingView || $("#" + consts.viewingId);
          thisRoute.$editingView = thisRoute.$editingView || $("#" + consts.editingId);
          thisRoute.$editingView.show();
          thisRoute.$viewingView.hide();
        };

        if (!thisRoute.editorModel) {
          thisRoute.editorModel = new EditorModel();
          thisRoute.editorView =  new EditorView({model: thisRoute.editorModel});
          thisRoute.editorModel.get("transcript").fetch({success: function () {
            // create the editor view
            // now  show the editor view
            $("#" + consts.editingId).html(thisRoute.editorView.render().el);
            thisRoute.editorModel.postInit();
            showCallback();
            if (toView) {
              window.setTimeout(function () {
                thisRoute.editorModel.get("digest").set("title", "The best stats you've ever seen - Hans Rosling");
                thisRoute.editorModel.get("digest").get("chapters").models[0].set("title", "Chapter 1: Introduction");
                thisRoute.editorModel.get("digest").get("chapters").models[0].get("sections").models[0].set("summary", "After 20 years studying hunger in Africa, I started teaching global development to undergraduate students.");
                thisRoute.viewRoute(dataname);
                return;
              }, 500);
            }

          }});
        } else {
          showCallback();
        }
      }
    });
  })();
});
