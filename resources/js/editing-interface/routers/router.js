
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/models/editor-model", "editing-interface/views/editor-view"], function (Backbone, _, $, EditorModel, EditorView) {
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
        ":params": "mainRoute"
      },

      noParams: function () {
        alert("you must set the desired data after the hashbang");
      },

      /**
       * Main route for editing interface
       * TODO allow input video to be specified as a param?
       */
      mainRoute: function (dataname) {
        var thisRoute = this;
        console.log("in router with params: " + dataname);
        window.dataname = dataname;

        // create the editor model which has the trans and digest views
        thisRoute.editorModel = new EditorModel();
        thisRoute.editorModel.get("transcript").fetch({success: function () {
          // create the editor view
          thisRoute.editorView =  new EditorView({model: thisRoute.editorModel});

          // now  show the editor view
          $("body").html(thisRoute.editorView.render().el);
          thisRoute.editorModel.postInit();
        }});
      }
    });
  })();
});
