'use strict';

angular.module('hypermedia')

  .run(function ($q, ResourceContext, VndError) {
    var vndErrorHandler = function (response) {
      return new VndError(response.data);
    };

    ResourceContext.registerErrorHandler('application/vnd.error+json', vndErrorHandler);
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
    var VndError = function (data) {
      this.message = data.message;
      this.logref = data.logref;
      this.path = data.path;
      this.$links = data._links || [];

      this.$nested = [];
      var embeds = data._embedded && data._embedded.errors;
      if (embeds) {
        if (!Array.isArray(embeds)) {
          embeds = [embeds];
        }
        embeds.forEach(function (embed) {
          this.$nested.push(new VndError(embed));
        }, this);
      }
    };

    return VndError;
  })


;
