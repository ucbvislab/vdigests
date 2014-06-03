/*global define*/
define(["backbone", "underscore", "jquery", "text!templates/ytinfo-template.html"], function (Backbone, _, $, ytinfoTemplate) {
    var consts = {
      viewId: "video-form",
      pageHeaderClass: "page-header",
      firstFormClass: "first-form",
      secondFormClass: "second-form",
      loadingClass: "loading"
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
        var thisView = this;
        if (thisView.$el.hasClass(consts.firstFormClass)) {
          var ytinfoHtml = _.template(ytinfoTemplate, resobj);
          thisView.$el.find("." + consts.pageHeaderClass).html(ytinfoHtml);
          thisView.$el.removeClass(consts.firstFormClass);
          thisView.$el.addClass(consts.secondFormClass);
        } else {
          thisView.router.navVideoId(resobj.contentid);
        }
        console.log( "form success" );
      },

      handleFormError: function () {
        var thisView = this;
        console.log( "form error" );
      }
    });
});
