'use strict';

angular.module('hypermedia')

/**
 * @ngdoc type
 * @name BlobResource
 * @description
 *
 * Resource containing binary data.
 */
    .factory('BlobResource', ['Resource', 'HypermediaUtil', function (Resource, HypermediaUtil) {

      /**
       * Resource with a media type and some data.
       *
       * @constructor
       * @param {string} uri the resource URI
       * @param {ResourceContext} context the context object
       */
      function BlobResource(uri, context) {
        var instance = Resource.call(this, uri, context);

        /**
         * The resource data.
         *
         * @type {Blob}
         */
        instance.data = '';

        return instance;
      }

      // Prototype properties
      BlobResource.prototype = Object.create(Resource.prototype, {
        constructor: {value: BlobResource}
      });

      /**
       * Create a $http GET request configuration object.
       *
       * @function
       * @returns {object}
       */
      HypermediaUtil.defineProperty(BlobResource.prototype, '$getRequest', function () {
        return {
          method: 'get',
          url: this.$uri,
          headers: {'Accept': '*/*'},
          responseType: 'blob',
          addTransformResponse: function (data) {
            return {data: data};
          }
        };
      });

      /**
       * Create a $http PUT request configuration object.
       *
       * @function
       * @returns {object}
       */
      HypermediaUtil.defineProperty(BlobResource.prototype, '$putRequest', function () {
        return {
          method: 'put',
          url: this.$uri,
          data: this.data,
          headers: {'Content-Type': this.data.type || 'binary/octet-stream'}
        };
      });

      /**
       * Throw an error. Binary resources have no obvious PATCH semantics.
       */
      HypermediaUtil.defineProperty(BlobResource.prototype, '$patchRequest', function () {
        throw new Error('BlobResource does not support the PATCH method');
      });

      return BlobResource;
    }])

;
