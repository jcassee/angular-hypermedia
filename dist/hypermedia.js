'use strict';

/**
 * @ngdoc module
 * @name halresource
 * @description
 *
 * This module contains classes and services to work with hypermedia APIs.
 */
angular.module('hypermedia', []);

'use strict';

angular.module('hypermedia')

  /**
   * @ngdoc type
   * @name BlobResource
   * @description
   *
   * Resource containing binary data.
   */
  .factory('BlobResource', ['Resource', function (Resource) {

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
      constructor: {value: BlobResource},

      /**
       * Create a $http GET request configuration object.
       *
       * @function
       * @returns {object}
       */
      $getRequest: {value: function () {
        return {
          method: 'get',
          url: this.$uri,
          headers: {'Accept': '*/*'},
          responseType: 'blob',
          addTransformResponse: function (data) {
            return {data: data};
          }
        };
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

'use strict';

angular.module('hypermedia')

  /**
   * @ngdoc type
   * @name ResourceContext
   * @description
   *
   * Context for working with hypermedia resources. The context has methods
   * for making HTTP requests and acts as an identity map.
   */
  .factory('ResourceContext', ['$http', '$log', '$q', 'Resource', function ($http, $log, $q, Resource) {

    var busyRequests = 0;

    /**
     * Resource context.
     *
     * @constructor
     * @param {ResourceFactory} [resourceFactory]
     */
    function ResourceContext(resourceFactory) {
      this.resourceFactory = resourceFactory || ResourceContext.defaultResourceFactory;
      this.resources = {};
    }

    ResourceContext.prototype = Object.create(Object.prototype, {
      constructor: {value: ResourceContext},

      /**
       * Get the resource for an URI. Creates a new resource if not already in the context.
       *
       * @function
       * @param {string} uri
       * @param {ResourceFactory} [Factory] optional resource creation function
       * @returns {Resource}
       */
      get: {value: function (uri, Factory) {
        var resource = this.resources[uri];
        if (!resource) {
          Factory = (Factory || this.resourceFactory);
          if (!Factory) throw new Error('No resource factory: ' + uri);
          resource = this.resources[uri] = new Factory(uri, this);
        }
        return resource;
      }},

      /**
       * Copy a resource into this context.
       *
       * @function
       * @param {Resource} resource
       * @returns {Resource} a copy of the resource in this context
       */
      copy: {value: function (resource) {
        var copy = this.get(resource.$uri);
        copy.$update(resource, resource.$links);
        return copy;
      }},

      /**
       * Perform a HTTP GET request on a resource.
       *
       * @function
       * @param {Resource} resource
       * @returns a promise that is resolved to the resource
       * @see Resource#$getRequest
       */
      httpGet: {value: function (resource) {
        var self = this;
        busyRequests += 1;
        var request = updateHttp(resource.$getRequest());
        return $http(request).then(function (response) {
          var links = parseLinkHeader(response.headers('Link'));

          // Convert media type profile to profile link
          var mediaType = mediaTypeParser.parse(response.headers('Content-Type'));
          if (!('profile' in links) && 'profile' in mediaType.params) {
            links.profile = {href: mediaType.params.profile};
          }

          var updatedResources = resource.$update(response.data, links);
          return self.markSynced(updatedResources, Date.now());
        }).then(function () {
          return resource;
        }).finally(function () {
          busyRequests -= 1;
        });
      }},

      /**
       * Perform a HTTP PUT request.
       *
       * @function
       * @param {Resource} resource
       * @returns a promise that is resolved to the resource
       * @see Resource#$putRequest
       */
      httpPut: {value: function (resource) {
        var self = this;
        busyRequests += 1;
        var request = updateHttp(resource.$putRequest());
        return $http(request).then(function () {
          return self.markSynced(resource, Date.now());
        }).then(function () {
          return resource;
        }).finally(function () {
          busyRequests -= 1;
        });
      }},

      /**
       * Perform a HTTP PATCH request.
       *
       * @function
       * @param {Resource} resource
       * @returns a promise that is resolved to the resource
       * @see Resource#$patchRequest
       */
      httpPatch: {value: function (resource, data) {
        var self = this;
        busyRequests += 1;
        var request = updateHttp(resource.$patchRequest(data));
        return $http(request).then(function () {
          Resource.prototype.$merge.call(resource, request.data);
          return self.markSynced(resource, Date.now());
        }).then(function () {
          return resource;
        }).finally(function () {
          busyRequests -= 1;
        });
      }},

      /**
       * Perform a HTTP DELETE request and unmark the resource as synchronized.
       *
       * @function
       * @param {Resource} resource
       * @returns a promise that is resolved to the resource
       * @see Resource#$deleteRequest
       */
      httpDelete: {value: function (resource) {
        var self = this;
        busyRequests += 1;
        var request = updateHttp(resource.$deleteRequest());
        return $http(request).then(function () {
          return self.markSynced(resource, null);
        }).then(function () {
          return resource;
        }).finally(function () {
          busyRequests -= 1;
        });
      }},

      /**
       * Perform a HTTP POST request.
       *
       * @function
       * @param {Resource} resource
       * @param {*} data request body
       * @param {object} [headers] request headers
       * @param {ConfigHttp} [callback] a function that changes the $http request config
       * @returns a promise that is resolved to the response
       * @see Resource#$postRequest
       */
      httpPost: {value: function (resource, data, headers, callback) {
        busyRequests += 1;
        var request = updateHttp(resource.$postRequest(data, headers, callback));
        return $http(request).finally(function () {
          busyRequests -= 1;
        });
      }},

      /**
       * Mark a resource as synchronized with the server.
       *
       * @function
       * @param {Resource|Resource[]} resources
       * @param {number} syncTime the timestamp of the last synchronization
       * @returns a promise that is resolved when the resources have been marked
       * @see Resource#syncTime
       */
      markSynced: {value: function (resources, syncTime) {
        resources = angular.isArray(resources) ? resources : [resources];
        resources.forEach(function (resource) {
          resource.$syncTime = syncTime;
        });
        return $q.when();
      }}
    });

    Object.defineProperties(ResourceContext, {

      /**
       * The default resource factory.
       *
       * @property {resourceFactory}
       */
      defaultResourceFactory: {value: Resource, writable: true},

      /**
       * The number of current HTTP requests.
       *
       * @property {number}
       */
      busyRequests: {get: function () {
        return busyRequests;
      }}
    });

    return ResourceContext;


    function appendTransform(defaults, transform) {
      if (!transform) return defaults;
      defaults = angular.isArray(defaults) ? defaults : [defaults];
      return defaults.concat(transform);
    }

    function updateHttp(config) {
      config.transformRequest = appendTransform($http.defaults.transformRequest, config.addTransformRequest);
      config.transformResponse = appendTransform($http.defaults.transformResponse, config.addTransformResponse);
      return config;
    }

    function parseLinkHeader(header) {
      return header ? linkHeaderParser.parse(header) : {};
    }
  }])

;

/**
 * A callback function used by the context to create resources. Will be called
 * with the 'new' operator, so can be a constructor.
 *
 * @callback ResourceFactory
 * @returns {Resource} the created resource
 * @see ResourceContext
 */

'use strict';

angular.module('hypermedia')

  /**
   * @ngdoc type
   * @name HalResource
   * @description
   *
   * HAL resource.
   */
  .factory('HalResource', ['$log', 'HypermediaUtil', 'Resource', function ($log, HypermediaUtil, Resource) {
    var forArray = HypermediaUtil.forArray;

    /**
     * HAL resource.
     *
     * @constructor
     * @param {string} uri the resource URI
     * @param {ResourceContext} context the context object
     */
    function HalResource(uri, context) {
      return Resource.call(this, uri, context);
    }

    // Prototype properties
    HalResource.prototype = Object.create(Resource.prototype, {
      constructor: {value: HalResource},

      /**
       * Create a $http GET request configuration object.
       *
       * @function
       * @returns {object}
       */
      $getRequest: {value: function () {
        return {
          method: 'get',
          url: this.$uri,
          headers: {'Accept': 'application/hal+json'}
        };
      }},

      /**
       * Update the resource with new data.
       *
       * @function
       * @param {object} data
       * @param {object} [links]
       * @returns all updated resources
       */
      $update: {value: function (data, links) {
        links = links || {};
        var selfHref = ((data._links || {}).self || {}).href;
        if (!selfHref) selfHref = (links.self || {}).href;
        if (selfHref != this.$uri) {
          throw new Error("Self link href differs: expected '" + this.$uri + "', was " + angular.toJson(selfHref));
        }

        return extractAndUpdateResources(data, links, this);
      }}
    });

    return HalResource;


    /**
     * Recursively extract embedded resources and update them in the context, then update the resource itself.
     *
     * @param {object} data
     * @param {object} [links]
     * @param {Resource} self
     */
    function extractAndUpdateResources(data, links, self) {
      var resources = [];

      // Extract links
      angular.extend(links, data._links);
      delete data._links;

      // Extract and update embedded resources
      Object.keys(data._embedded || []).forEach(function (rel) {
        var embeds = data._embedded[rel];

        // Add link to embedded resource if missing
        if (!(rel in links)) {
          links[rel] = forArray(embeds, function (embedded) {
            return {href: embedded._links.self.href};
          });
        }
        // Recurse into embedded resource
        forArray(embeds, function (embedded) {
          resources = resources.concat(extractAndUpdateResources(embedded, {}, self));
        });
      });
      delete data._embedded;

      // Update resource
      var resource = self.$context.get(links.self.href, self.constructor);
      Resource.prototype.$update.call(resource, data, links);
      resources.push(resource);

      return resources;
    }
  }])

;

'use strict';

angular.module('hypermedia')

  /**
   * @ngdoc type
   * @name Resource
   * @description
   *
   * Hypermedia resource.
   */
  .factory('Resource', ['$log', '$q', 'HypermediaUtil', function ($log, $q, HypermediaUtil) {
    var forArray = HypermediaUtil.forArray;

    var registeredProfiles = {};

    /**
     * Resource.
     *
     * @constructor
     * @param {string} uri the resource URI
     * @param {ResourceContext} context the resource context
     */
    function Resource(uri, context) {
      // This constructor does not use the automatically created object but instantiate from a subclass instead

      // Intermediate prototype to add profile-specific properties to
      var prototype = Object.create(Object.getPrototypeOf(this));

      // Current profile(s)
      var profile = null;

      // Instantiated object
      return Object.create(prototype, {

        /**
         * The resource URI.
         *
         * @property {string}
         */
        $uri: {value: uri},

        /**
         * The resource context. Can be used to get related resources.
         *
         * @property {ResourceContext}
         */
        $context: {value: context},

        /**
         * Links to other resources.
         *
         * @property {object}
         */
        $links: {value: {}, writable: true},

        /**
         * The timestamp of the last successful GET or PUT request.
         *
         * @property {number} Resource.syncTime
         * @see ResourceContext#markSynced
         */
        $syncTime: {value: null, writable: true},

        /**
         * The resource profile URI(s). If profile properties have been registered for this URI (using
         * HalContextProvider.registerProfile or ResourceContext.registerProfile), the properties will be defined on the
         * resource.
         *
         * Setting the profile to 'undefined' or 'null' will remove the profile.
         *
         * @property {string|string[]}
         */
        $profile: {
          get: function () {
            return profile;
          },
          set: function (value) {
            // Remove old profile properties
            if (profile) {
              var oldProfiles = angular.isArray(profile) ? profile : [profile];
              oldProfiles.forEach(function (profile) {
                var properties = registeredProfiles[profile] || {};
                Object.keys(properties).forEach(function (key) {
                  delete prototype[key];
                });
              });
            }

            // Apply new profile properties
            if (value) {
              var newProfiles = angular.isArray(value) ? value : [value];
              newProfiles.forEach(function (profile) {
                var properties = registeredProfiles[profile] || {};
                Object.defineProperties(prototype, properties);
              });
            }

            profile = value;
          }
        }
      });
    }

    // Prototype properties
    Resource.prototype = Object.create(Object.prototype, {
      constructor: {value: Resource},

      /**
       * Resolve the href of a property.
       *
       * @function
       * @param {string} prop the property name
       * @param {object} [vars] URI template variables
       * @returns {string|string[]} the link href or hrefs
       */
      $propHref: {value: function (prop, vars) {
        return forArray(this[prop], function (uri) {
          if (vars) uri = new UriTemplate(uri).fillFromObject(vars);
          return uri;
        });
      }},

      /**
       * Follow a property relation to another resource.
       *
       * @function
       * @param {string} prop the property name
       * @param {object} [vars] URI template variables
       * @param {ResourceFactory} [factory] the factory for creating the resource
       * @returns {Resource|Resource[]} the linked resource or resources
       */
      $propRel: {value: function (prop, vars, factory) {
        if (angular.isFunction(vars)) {
          factory = vars;
          vars = undefined;
        }
        return forArray(this.$propHref(prop, vars), function (uri) {
          return this.$context.get(uri, factory);
        }, this);
      }},

      /**
       * Resolve the href of a link relation.
       *
       * @function
       * @param {string} rel the link relation
       * @param {object} [vars] URI template variables
       * @returns {string|string[]} the link href or hrefs
       */
      $linkHref: {value: function (rel, vars) {
        var templated = false;
        var nonTemplated = false;
        var deprecation = {};

        var linkHrefs = forArray(this.$links[rel], function (link) {
          if ('templated' in link) templated = true;
          if (!('templated' in link)) nonTemplated = true;
          if ('deprecation' in link) deprecation[link.deprecation] = true;

          var uri = link.href;
          if (vars) uri = new UriTemplate(uri).fillFromObject(vars);
          return uri;
        }, this);

        if (templated && !vars) {
          $log.warn("Following templated link relation '" + rel + "' without variables");
        }
        if (nonTemplated && vars) {
          $log.warn("Following non-templated link relation '" + rel + "' with variables");
        }
        var deprecationUris = Object.keys(deprecation);
        if (deprecationUris.length > 0) {
          $log.warn("Following deprecated link relation '" + rel + "': " + deprecationUris.join(', '));
        }

        return linkHrefs;
      }},

      /**
       * Follow a link relation to another resource.
       *
       * @function
       * @param {string} rel the link relation
       * @param {object} [vars] URI template variables
       * @param {ResourceFactory} [factory] the factory for creating the related resource
       * @returns {Resource|Resource[]} the linked resource or resources
       */
      $linkRel: {value: function (rel, vars, factory) {
        if (angular.isFunction(vars)) {
          factory = vars;
          vars = undefined;
        }
        return forArray(this.$linkHref(rel, vars), function (uri) {
          return this.$context.get(uri, factory);
        }, this);
      }},

      /**
       * Perform an HTTP GET request if the resource is not synchronized.
       *
       * @function
       * @returns a promise that is resolved to the resource
       * @see Resource#$syncTime
       */
      $load: {value: function () {
        if (this.$syncTime) {
          return $q.when(this);
        } else {
          return this.$context.httpGet(this);
        }
      }},

      /**
       * Load all resources reachable from a resource using one or more paths.
       * A path is on object hierarchy containing property or relation names.
       * If the name matches a property it is loaded, otherwise it is
       * interpreted as a link relation.
       *
       * Examples:
       *   context.loadPaths(resource, {team_url: {}})
       *   context.loadPaths(resource, {'http://example.com/owner': {}})
       *   context.loadPaths(resource, {
       *     home: {
       *       address: {}
       *     }
       *   })
       *   context.loadPaths(resource, {
       *     'ex:car': {},
       *     'ex:friends': {
       *       'ex:car': {}
       *     }
       *   })
       *
       * @function
       * @param {Resource} resource
       * @param {object} paths
       * @return {Promise} a promise that resolves to the resource once all
       *                   paths have been loaded
       */
      $loadPaths: {value: function (paths) {
        var self = this;
        return self.$load().then(function () {
          var promises = [];
          Object.keys(paths).forEach(function (key) {
            var uris = self.$propHref(key);
            if (!uris) uris = self.$linkHref(key);
            if (!uris) return;

            uris = angular.isArray(uris) ? uris : [uris];
            uris.forEach(function (uri) {
              var related = (typeof uri === 'string') ? self.$context.get(uri) : uri;
              promises.push(related.$loadPaths(paths[key]));
            });
          });
          return $q.all(promises);
        }).then(function () {
          return self;
        });
      }},

      /**
       * Create a $http GET request configuration object.
       *
       * @function
       * @returns {object}
       */
      $getRequest: {value: function () {
        return {
          method: 'get',
          url: this.$uri,
          headers: {'Accept': 'application/json'}
        };
      }},

      /**
       * Perform an HTTP GET request.
       *
       * @function
       * @returns a promise that is resolved to the resource
       */
      $get: {value: function () {
        return this.$context.httpGet(this);
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
          data: this,
          headers: {'Content-Type': 'application/json'}
        };
      }},

      /**
       * Perform an HTTP PUT request with the resource state.
       *
       * @function
       * @returns a promise that is resolved to the resource
       */
      $put: {value: function () {
        return this.$context.httpPut(this);
      }},

      /**
       * Create a $http PATCH request configuration object.
       *
       * @function
       * @returns {object}
       */
      $patchRequest: {value: function (data) {
        return {
          method: 'patch',
          url: this.$uri,
          data: data,
          headers: {'Content-Type': 'application/merge-patch+json'}
        };
      }},

      /**
       * Perform an HTTP PATCH request with the resource state.
       *
       * @function
       * @returns a promise that is resolved to the resource
       */
      $patch: {value: function (data) {
        return this.$context.httpPatch(this, data);
      }},

      /**
       * Create a $http DELETE request configuration object.
       *
       * @function
       * @returns {object}
       */
      $deleteRequest: {value: function () {
        return {
          method: 'delete',
          url: this.$uri
        };
      }},

      /**
       * Perform an HTTP DELETE request.
       *
       * @function
       * @returns a promise that is resolved to the resource
       */
      $delete: {value: function () {
        return this.$context.httpDelete(this);
      }},

      /**
       * Create a $http POST request configuration object.
       *
       * @function
       * @param {*} data request body
       * @param {object} [headers] request headers
       * @param {ConfigHttp} [callback] a function that changes the $http request config
       * @returns {object}
       */
      $postRequest: {value: function (data, headers, callback) {
        callback = callback || angular.identity;
        return callback({
          method: 'post',
          url: this.$uri,
          data: data,
          headers: headers || {}
        });
      }},

      /**
       * Perform an HTTP POST request.
       *
       * @function
       * @param {*} data request body
       * @param {object} [headers] request headers
       * @param {ConfigHttp} [callback] a function that changes the $http request config
       * @returns a promise that is resolved to the response
       */
      $post: {value: function (data, headers, callback) {
        return this.$context.httpPost(this, data, headers, callback);
      }},

      /**
       * Update the resource with new data by clearing all existing properties
       * and then copying all properties from 'data'.
       *
       * @function
       * @param {object} data
       * @param {object} [links]
       * @returns the resource
       */
      $update: {value: function (data, links) {
        links = links || {};
        if (links.self && links.self.href !== this.$uri) {
          throw new Error('Self link href differs: expected "' + this.$uri + '", was ' +
              angular.toJson(links.self.href));
        }

        // Update state
        Object.keys(this).forEach(function (key) {
          delete this[key];
        }, this);
        Object.keys(data).forEach(function (key) {
          this[key] = data[key];
        }, this);

        // Update links
        this.$links = links;

        // Optionally apply profile(s)
        var profileUris = forArray(links.profile, function (link) {
          return link.href;
        });
        if (profileUris) this.$profile = profileUris;

        return this;
      }},

      /**
       * Merges the resource with new data following algorithm defined
       * in JSON Merge Patch specification (RFC 7386, https://tools.ietf.org/html/rfc7386).
       *
       * @function
       * @param {object} data
       * @param {object} [links]
       * @returns the resource
       */
      $merge: {value: function (data) {
        var mergePatch = function (target, patch) {
          if (!angular.isObject(patch) || patch === null || Array.isArray(patch)) {
            return patch;
          }

          if (!angular.isObject(target) || target === null || Array.isArray(target)) {
            target = {};
          }

          Object.keys(patch).forEach(function (key) {
            var value = patch[key];
            if (value === null) {
              delete target[key];
            } else {
              target[key] = mergePatch(target[key], value);
            }
          });

          return target;
        };

        return mergePatch(this, data);
      }}
    });

    // Class properties
    Object.defineProperties(Resource, {

      /**
       * Register a profile.
       *
       * @function
       * @param {string} profile the profile URI
       * @param {object} properties a properties object as used in 'Object.defineProperties()'
       */
      registerProfile: {value: function (profile, properties) {
        // Make sure properties can be removed when applying a different profile
        var props = angular.copy(properties);
        angular.forEach(props, function (prop) {
          prop.configurable = true;
        });
        registeredProfiles[profile] = props;
      }},

      /**
       * Register profiles.
       *
       * @function
       * @param {object} profiles an object mapping profile URIs to properties objects as used in
       *                          'Object.defineProperties()'
       */
      registerProfiles: {value: function (profiles) {
        angular.forEach(profiles, function (properties, profile) {
          Resource.registerProfile(profile, properties);
        });
      }}
    });

    return Resource;
  }])

;

/**
 * A callback function used to change a $http config object.
 *
 * @callback ConfigHttp
 * @param {object} config the $http config object
 * @returns {object} the $http config object
 */

'use strict';

angular.module('hypermedia')

  /**
   * @ngdoc object
   * @name HypermediaUtil
   * @description
   *
   * Utility functions used in the hypermedia module.
   */
  .factory('HypermediaUtil', function () {
    return {

      /**
       * Call a function on an argument or every element of an array.
       *
       * @param {Array|*|undefined} arg the variable or array of variables to apply 'func' to
       * @param {function} func the function
       * @param {object} [context] object to bind 'this' to when applying 'func'
       * @returns {Array|*|undefined} the result of applying 'func' to 'arg'; undefined if 'arg' is undefined
       */
      forArray: function forArray(arg, func, context) {
        if (angular.isUndefined(arg)) return undefined;
        if (Array.isArray(arg)) {
          return arg.map(function (elem) {
            return func.call(context,  elem);
          });
        } else {
          return func.call(context,  arg);
        }
      }
    };
  })

;
