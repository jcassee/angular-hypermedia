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

    HypermediaUtil.defineProperties(BlobResource.prototype, {
      /**
       * Create a $http GET request configuration object.
       *
       * @function
       * @param {object} [params] additional GET parameters
       * @returns {object}
       */
      $getRequest: {value: function (params) {
        var config = {
          method: 'get',
          url: this.$uri,
          headers: {'Accept': '*/*'},
          responseType: 'blob',
          addTransformResponse: function (data) {
            return {data: data};
          }
        };
        if (params) config.params = params;
        return config;
      }},

      /**
       * Create a $http PUT request configuration object.
       *
       * @function
       * @returns {object}
       */
      $putRequest: {value: function () {
        return {
          method: 'put',
          url: this.$uri,
          data: this.data,
          headers: {'Content-Type': this.data.type || 'binary/octet-stream'}
        };
      }},

      /**
       * Throw an error. Binary resources have no obvious PATCH semantics.
       */
      $patchRequest: {value: function () {
        throw new Error('BlobResource does not support the PATCH method');
      }}
    });

    return BlobResource;
  }])

;
