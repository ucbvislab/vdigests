
/*global define */
define(["backbone", "underscore", "jquery", "editing-interface/models/editor-model", "editing-interface/views/editor-view", "editing-interface/views/output-digest-view", "editing-interface/views/video-form-view", "editing-interface/models/video-form-model", "toastr"], function (Backbone, _, $, EditorModel, EditorView, OutputView, VideoFormView, VideoFormModel, toastr) {
  "use strict";

  /**
   * Central router to control URL state
   */
  return (function () {
    var consts = {
      editingId: "editing-interface",
      editingClass: "editing",
      viewingClass: "viewing",
      videoFormId: "video-form"
    };

    var pvt = {};

    pvt.hideAllViews = function () {
      $("#" + consts.editingId).hide();
      $("#" + consts.viewingId).hide();
      $("#" + consts.videoFormId).hide();
    };

    return Backbone.Router.extend({

      navVideoId: function (vid) {
        this.navigate("edit/" + vid, {trigger: true, replace: false});
      },

      routes: {
        "": "noParams",
        "edit/:params": "editRoute",
        "preview/:params": "viewRoute"
      },

      noParams: function () {
        var thisRoute = this;
        if (!thisRoute.videoFormView) {
          thisRoute.videoFormView = new VideoFormView({model: new VideoFormModel(), router: thisRoute});
          thisRoute.videoFormView.render();
        }
        pvt.hideAllViews();
        thisRoute.videoFormView.$el.show();
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
        window.viewing = true;
        window.editing = false;

        $("[data-ph]").attr("contenteditable", false);
        thisRoute.editorView.$el.parent().removeClass(consts.editingClass);
        thisRoute.editorView.$el.parent().addClass(consts.viewingClass);
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
          thisRoute.$editingView = thisRoute.$editingView || $("#" + consts.editingId);
          thisRoute.editorView.$el.parent().removeClass(consts.viewingClass);
          thisRoute.editorView.$el.parent().addClass(consts.editingClass);
          window.viewing = false;
          window.editing = true;
          $("[data-ph]").attr("contenteditable", true);
          pvt.hideAllViews();
          thisRoute.$editingView.show();
        };

        if (!thisRoute.editorModel) {
          thisRoute.editorModel = new EditorModel({id: dataname});
          thisRoute.editorView =  new EditorView({model: thisRoute.editorModel});
          thisRoute.editorModel.fetch({success: function (mdl, inobj) {
            // create the editor view
            // now  show the editor view
            $("#" + consts.editingId).html(thisRoute.editorView.render().el);
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
            showCallback();
          }, // end success
          error: function (data, resp) {
            toastr.error((resp.responseJSON && resp.responseJSON.error) || "unable to load the video digest");
            console.log( "error fetching data" );
            console.log(resp);
          } // end error
          });
        } else {
          showCallback();
        }
      }
    });
  })();
});
