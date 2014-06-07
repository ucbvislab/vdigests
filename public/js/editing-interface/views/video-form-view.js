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
      finalUrlId: "finalurl",
      intrmId: "intrmid"
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
        if ($el.hasClass(consts.firstFormClass)) {
          var ytinfoHtml = _.template(ytinfoTemplate, resobj);
          thisView.$el.find("." + consts.pageHeaderClass).html(ytinfoHtml);
          thisView.$el.removeClass(consts.firstFormClass);
          thisView.$el.addClass(consts.secondFormClass);
        } else if ($el.hasClass(consts.secondFormClass)){
          if (resobj.intrmid) {
            thisView.$el.removeClass(consts.secondFormClass);
            thisView.$el.addClass(consts.thirdFormClass);
            var $finalUrl = thisView.$el.find("#" + consts.finalUrlId),
            finalHref = window.location.href + "#" + resobj.intrmid;
            $finalUrl.text(finalHref);
            $finalUrl.attr("href", finalHref);
            $("#" + consts.tranUploadId).val("");
            $("#" + consts.intrmId).val(resobj.intrmid);
          } else {
            toastr.error("unable to process request correctly: try resubmitting");
          }
          // thisView.router.navVideoId(resobj.contentid);
        } else {
          // final class
        }
        console.log( "form success" );
      },

      handleFormError: function (errResp) {
        var thisView = this;
        toastr.error( (errResp.responseJSON && errResp.responseJSON.error) || "error processing the form" );
      }
    });
});
