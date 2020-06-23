/*global define*/
define(["backbone", "underscore", "jquery", "toastr", "text!templates/ytinfo-template.html"], function (Backbone, _, $, toastr, ytinfoTemplate) {
    var consts = {
      viewId: "video-form",
      pageHeaderClass: "page-header",
      firstFormClass: "first-form",
      secondFormClass: "second-form",
      thirdFormClass: "third-form",
      loadingClass: "loading",
      tranUploadId: "tranupload",
      gtransId: "usegtrans",
      processingFormClass: "processing-form",
      finalUrlClass: "finalurl",
      intrmId: "intrmid",
      yttitleId: "yttitle"
    };
    return Backbone.View.extend({
      el: document.getElementById(consts.viewId),

      initialize: function (inp) {
        this.router = inp.router;
      },

      render: function () {
        var thisView = this;
        thisView.$el.find("form").ajaxForm({
          beforeSubmit: function () {
            thisView.$el.addClass(consts.loadingClass);
          },
          complete: function () {
            thisView.$el.removeClass(consts.loadingClass);
          },
          success: function () {
            thisView.handleFormSuccess.apply(thisView, arguments);
          },
          error: function () {
            thisView.handleFormError.apply(thisView, arguments);
          }
        });
      },

      handleFormSuccess: function (resobj) {
        var thisView = this,
            $el = thisView.$el;
        
        // TODO: check for if we couldn't get a transcript from youtube

        if (resobj.intrmid) {
          // redirect to the video digest editor
          thisView.intrmid = resobj.intrmid;
          var $finalUrls = thisView.$el.find("." + consts.finalUrlClass);
          window.location = window.location.href + "#edit/" + resobj.intrmid;
          return;
        }

        if ($el.hasClass(consts.firstFormClass)) {
          var ytinfoHtml = _.template(ytinfoTemplate, resobj);
          thisView.$el.find("." + consts.pageHeaderClass).html(ytinfoHtml);
          thisView.$el.find("#" + consts.yttitleId).val(resobj.title);
          thisView.$el.removeClass(consts.firstFormClass);
          thisView.$el.addClass(consts.secondFormClass);
        } else if ($el.hasClass(consts.secondFormClass)){
          if (resobj.intrmid) {
            thisView.intrmid = resobj.intrmid;
            var $finalUrls = thisView.$el.find("." + consts.finalUrlClass);
            window.location = window.location.href + "#edit/" + resobj.intrmid;
          } else {
            toastr.error("Unable to process request correctly: try again");
          }
        } else {
          toastr.error("Unable to process request: try again");
        }
      },

      handleFormError: function (errResp) {
        var thisView = this;
        toastr.error( (errResp.responseJSON && errResp.responseJSON.error) || "error processing the form" );
      }
    });
});
