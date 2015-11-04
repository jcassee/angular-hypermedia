'use strict';

angular.module('hypermedia')

  .run(function ($q, ResourceContext, VndError) {
    var vndErrorHandler = function (response) {
      return new VndError(response.data);
    };

    ResourceContext.registerErrorHandler('application/vnd+error', vndErrorHandler);
  })

  /**
   * @ngdoc type
   * @name VndError
   * @description
   *
   * VndError represents errors from server with content type 'application/vnd+error',
   * see: https://github.com/blongden/vnd.error
   */
  .factory('VndError', function () {
    var HalError = function (data) {
      var self = this;
      this.message = data.message;
      this.errors = [];

      var embeds = (data._embedded ? data._embedded.errors : undefined);
      if (embeds) {
        if (!Array.isArray(embeds)) {
          embeds = [embeds];
        }
        embeds.forEach(function (embed) {
          self.errors.push(new HalError(embed));
        });
      }
    };

    return HalError;
  })


;
