
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/models/editor-model", "editing-interface/views/editor-view", "editing-interface/views/output-digest-view"], function (Backbone, _, $, EditorModel, EditorView, OutputView) {
  "use strict";

  /**
   * Central router to control URL state
   */
  return (function () {
    var pvt = {};
    pvt.consts = {};

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
        // TODO better switching between views (use meta method)
        thisRoute.outputView = new OutputView({model: thisRoute.editorModel});
        $("body").html(thisRoute.outputView.render().el);
      },

      /**
       * Main route for editing interface
       * TODO allow input video to be specified as a param?
       */
      editRoute: function (dataname, toView) {
        var thisRoute = this,
            reloadTrans = true;
        // create the editor model which has the trans and digest views
        if (thisRoute.editorModel) {
          if (!confirm("Do you want to remove your current work?")) {
            reloadTrans = false;
            return;
          }
        }

        window.dataname = dataname;
        thisRoute.editorModel = new EditorModel();

        if (reloadTrans) {
          thisRoute.editorModel.get("transcript").fetch({success: function () {
            // create the editor view
            thisRoute.editorView =  new EditorView({model: thisRoute.editorModel});

            // now  show the editor view
            $("body").html(thisRoute.editorView.render().el);
            thisRoute.editorModel.postInit();
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
        }else {
          $("body").html(thisRoute.editorView.render().el);
        }
      }
    });
  })();
});
