# Hypermedia REST API client for AngularJS applications

[![Build Status](https://travis-ci.org/jcassee/angular-hypermedia.svg?branch=master)](https://travis-ci.org/jcassee/angular-hypermedia)
[![Coverage Status](https://coveralls.io/repos/jcassee/angular-hypermedia/badge.svg?branch=master&service=github)](https://coveralls.io/github/jcassee/angular-hypermedia?branch=master)
[![Bower](https://img.shields.io/bower/v/angular-hypermedia.svg)](http://bower.io/search/?q=angular-hypermedia)
[![npm](https://img.shields.io/npm/v/angular-hypermedia.svg)](https://www.npmjs.com/package/angular-hypermedia)
[![npm downloads](https://img.shields.io/npm/dm/angular-hypermedia.svg)](https://www.npmjs.com/package/angular-hypermedia)
[![License](https://img.shields.io/github/license/jcassee/angular-hypermedia.svg)](https://github.com/jcassee/angular-hypermedia/blob/master/LICENSE.md)


A hypermedia client for AngularJS applications. Supports relations in HTTP [Link
headers](http://tools.ietf.org/html/rfc5988), JSON properties and
[JSON HAL](http://tools.ietf.org/html/draft-kelly-json-hal), and resource
[profiles](http://tools.ietf.org/html/rfc6906).

An extension module
[angular-hypermedia-offline](https://github.com/jcassee/angular-hypermedia-offline)
is available that adds offline caching of resources.


* [Installation](#installation)
* [Quickstart](#quickstart)
* [Provided services](#provided-services)
* [Resources and contexts](#resources-and-contexts)
* [GET, PUT, DELETE requests: state synchronization](#get-put-delete-requests-state-synchronization)
* [PATCH requests: synchronization using JSON Merge Patch](#patch-requests-synchronization-using-json-merge-patch)
* [POST requests](#post-requests)
* [Relations](#relations)
* [URI Templates](#uri-templates)
* [Links](#links)
* [Profiles](#profiles)
* [Loading and refreshing resources](#loading-and-refreshing-resources)
* [JSON HAL](#json-hal)
* [Blob resources](#blob-resources)
* [Error handlers](#error-handlers)


## Installation

Install using Bower.

    bower install angular-hypermedia --save

Then include it (and its dependencies) in your HTML page.

    <script src="bower_components/angular-hypermedia/dist/hypermedia.js"></script>
    <script src="bower_components/linkheader-parser/dist/linkheader-parser-browser.js"></script>
    <script src="bower_components/mediatype-parser/dist/mediatype-parser-browser.js"></script>
    <script src="bower_components/uri-templates/uri-templates.js"></script>

Alternatively, install using NPM

    npm install angular-hypermedia --save

## Webpack integration

You can use Webpack ProvidePlugin to integrate dependencies as follows:
  
    new webpack.ProvidePlugin({
      mediaTypeParser: 'mediatype-parser',
      linkHeaderParser: 'linkheader-parser',
      UriTemplate: 'uri-templates'
    }),

Since [mediatype-parser](https://github.com/jcassee/mediatype-parser) and [linkheader-parser](https://github.com/jcassee/linkheader-parser) releases `v0.1.2` you also need to add aliases to your Webpack configuration:

    resolve: {
      ...
      alias: {
        'mediatype-parser': 'mediatype-parser/dist/mediatype-parser-node.js',
        'linkheader-parser': 'linkheader-parser/dist/linkheader-parser-node.js'
      }

## Quickstart

Consider a controller that lists [all GitHub notifications for the current
user](https://developer.github.com/v3/activity/notifications/#list-your-notifications).
It can use the `next` and `prev` links provided by [the GitHub API for
pagination](https://developer.github.com/v3/#pagination).

This could be an implementation of the controller:

    angular.module('myGitHubBrowser', ['hypermedia'])

      .controller('NotificationsController', function (ResourceContext) {
        $scope.page = null;

        new ResourceContext().get('https://api.github.com/notifications').then(function (page) {
          $scope.page = page;
        });

        $scope.followRel = function (rel) {
          $scope.page.$linkRel(rel).$get().then(function (page) {
            $scope.page = page;
          })
        };

        $scope.hasRel = function (rel) {
          return rel in $scope.page.$links;
        };
      });

The accompanying HTML template:

    <div>
      <!-- List the notifications on the current page -->

      <ul class="pagination">
        <li>
          <a ng-click="{{ followRel('prev') }}" ng-class="{disabled: !hasRel('prev')}">&laquo;</a>
        </li>
        <li>
          <a ng-click="{{ followRel('next') }}" ng-class="{disabled: !hasRel('next')}">&raquo;</a>
        </li>
      </ul>
    </div>


## Provided services

To use this module, import `hypermedia` in your Angular module and inject any of
the exported services.

**Example:**

    angular.module('myApp', ['hypermedia'])
      .factory('MyController', function (ResourceContext, Resource, HalContext, BlobContext) {
        ...
      });


## Resources and contexts

This module assumes that a hypermedia API client often interacts with
multiple related resources for the functionality provided by a page. The
`ResourceContext` is responsible for keeping together resources that are being
used together. Resources are bound to a single context.

Resources are represented by a `Resource` or one of its subclasses. A resource
is a unit of data that can be synchronized with its authoritative source using
HTTP requests. In this way, it is similar to a AngularJS `$resource` instance.

**Example:**

    var context = new ResourceContext();
    var person = context.get('http://example.com/composer/john');
    expect(person.$uri).toBe('http://example.com/composer/john');

The context acts like an identity map, in the sense that calling `context.get`
with the same URI returns the same `Resource` object.

If a subclass of `Resource` is required, a second argument may be used.

**Example:**

    var movie = context.get('http://example.com/movie/jaws', HalResource);

If you are using an API that is based on a media type for which a Resource
subclass exists (JSON HAL, for example) it is useful to create a context with a
default factory.

**Example:**

    var context2 = new ResourceContext(HalResource);
    var movie2 = context.get('http://example.com/movie/jaws');


## GET, PUT, DELETE requests: state synchronization

Resources are synchronized using GET, PUT and DELETE requests. The methods on
the resource object are `$get`, `$put` and `$delete` respectively. These
methods return a promise that is resolved with the `Resource` when the request
completes successfully.

**Example:**

    context.get('http://example.com/composer/john').$get().then(function (composer) {
      expect(composer.firstName).toBe('John');
      expect(composer.lastName).toBe('Williams');
    });

    person.email = 'john@example.com';
    person.favoriteMovie = 'Close Encounters';
    person.$put().then(function () {
      console.log('success!');
    });

The `$get` method can also be called with optional parameters.

**Example**

    // requests 'http://example.com/composer/john?food=pineapple'
    context.get('http://example.com/composer/john').$get({food: 'pineapple'});

## PATCH requests: synchronization using JSON Merge Patch

The PATCH request method updates a resources by only sending a "diff" of the
state. `Resource` uses [JSON Merge Patch](https://tools.ietf.org/html/rfc7386).
It is a very simple JSON patch format suitable for describing modifications to
JSON documents that primarily use objects for their structure and do not make
use of explicit `null` values. Subclasses of `Resource` may choose to support
other formats by overriding the `$patchRequest` method.

The `$patch` method accepts a mapping of (new or existing) properties to updated
values; mapping a property to `null` will delete the property. Objects are
merged recursively, but arrays are replaced. The algorithm is [specified in the
RFC](https://tools.ietf.org/html/rfc7386#section-2). The changes are applied to
the `Resource` object after the HTTP request has completed successfully; if it
fails the object remains unchanged.

**Example:**

    person.$patch({email: 'johnwilliams@example.com', favoriteMovie: null}).then(function () {
      console.log('email changed to ' + person.email);
    }, function () {
      console.log('request failed, email is still ' + person.email);
    });


## POST requests

A POST request is used to "operate on" data instead of synchronizing it. What
the "operate" means is up to the server, and depends on the resource. It is
often used to create new resources. The `$post` method accepts as arguments the
data to be sent in the body and a mapping of headers.

**Example:**

    person.$post({password: 'secret'}, {'Content-Type': 'text/plain'}).then(function () {
      console.log('password changed');
    });


## Relations

The essence of hypermedia is the linking of resources. In its simplest form,
a resource can link to another resource by including its URI as a property.
Because a reference to another resource is a hypermedia reference, such a
property is sometimes called an "href".

Note: a relation can be a string or an array of string.

**Example:**

    person.carHref = 'http://example.com/car/mercedes-sedan';
    person.friendHrefs = [
      'http://example.com/director/george',
      'http://example.com/director/steven'
    ];

Of course, it is possible to look up URIs in the context, but `Resource` has the
convenience method `$propRel` for getting related resources. If the property
value is an array of URIs then an array of resources is returned.

**Example:**

    var car = person.$propRel('carHref');
    var friends = person.$propRel('friendHrefs');

If the target resource is not created using the default context factory, you can
add the factory as the last parameter.

**Example:**

    car.manufacturerHref = 'http://example.com/hal/companies/mercedes';
    var manufacturer = car.$propRel('manufacturerHref', HalResource)


## URI Templates

A reference can also be a [URI Template](http://tools.ietf.org/html/rfc6570),
containing parameters that need to be substituted before it can be resolved. The
`$propRel` accepts a second argument of variables (a mapping of names to values)
to resolve a URI Template reference.

**Example:**

    person.appointmentsHref = 'http://example.com/appointments/john/{date}'
    var todaysAppointments = person.$propRel('appointmentsHref', {date: '2015-03-05'});

URI Template variables and resource factory can be specified at the same time.

**Example:**

    manufacturer.modelsHref = 'http://example.com/hal/companies/mercedes/models{?current}'
    var currentModels = manufacturer.$propRel('modelsHref', {current: true}, HalResource);


## Links

Instead of referencing other resources in properties, it is also possible to use
links. Links are returned by the server as
[Link headers](http://tools.ietf.org/html/rfc5988).

The `$links` property is a mapping of relations to link objects. A link object
has an `href` property containing the relation target URI. Other properties are
link attributes as [listed in the RFC](http://tools.ietf.org/html/rfc5988).

Relations are either keywords from the [IANA
list](http://www.iana.org/assignments/link-relations/link-relations.xhtml) or
URIs. (These URIs are used as references, but may point to documentation that
describes the relationship.)

**Example:**

    car.$links['http://example.com/rels/owner'] = {
      href: 'http://example.com/composer/john',
      title: 'Owner'
    };

Link relations are followed in much the same way as property relations, using
the `$linkRel` method.

**Example:**

    expect(car.$linkRel('http://example.com/rels/owner')).toBe(person);


### Self links and URI aliases

The *self* relation identifies the resource itself. If a HTTP GET response
contains a self link to a URI different from resource URI, that URI is added to
the context as an alias. In other words, the resource will be available under
both the original URI and the self href.

**Example:**

    var movie = context.get('http://example.com/movie/jaws-4');
    movie.$get().then(function () {
      // GET response contains self link to "http://example.com/movie/jaws-the-revenge"
      expect(context.get('http://example.com/movie/jaws-the-revenge')).toBe(movie);
    });

This behavior can be disabled by setting `context.enableAliases` to `false`, or
globally by setting `ResourceContext.defaultEnableAliases`. If aliases are
disabled, trying to update a resource with a self link different to the resource
URI will throw an error.


## Profiles

Resources can often be said to be of a certain type, in the sense that in the
examples, the resource referenced by `http://example.com/composer/john` "is a
person". This is called a [profile](http://tools.ietf.org/html/rfc6906).
Profiles are identified by a URI. (As with relations, they may double as a
pointer to the profile documentation.) Resources have a `$profile` property
containing the profile URI.

It is possible to add functionality to resources of specific profiles by
registering properties. Setting `$profile` immediately applies the properties
registered with that profile. (The properties are set on a per-resource
prototype, so they do not interfere with the resource data and are removed when
the profile is removed.)

Note: if using an array, adding profiles to the array after setting `$profile`
will not update the properties.

Profiles are registered using `Resource.registerProfile(profile, properties)`
or `Resource.registerProfiles(profileProperties)`. Properties are applied to
resources using `Object.defineProperties`.

**Example:**

    Resource.registerProfiles({
      'http://example.com/profiles/person': {
        fullName: {get: function () {
          return this.firstName + ' ' + this.lastName;
        }},

        car: {get: function () {
          return this.propRel('carHref');
        }}
      }
    });

    person.$profile = 'http://example.com/profiles/person';

    expect(person.fullName).toBe('John Williams');
    expect(person.car.brand).toBe('Mercedes');

The profile is automatically set if the response of a GET request contains
either a profile link or the profile parameter in the Content-Type header.


## Loading and refreshing resources

Because different relations may point to the same URI, just calling `$get` on
all followed resources risks issuing GET requests for the same resource multiple
times. By using `$load` instead of `$get` a GET request will only be issued if
the resource was not already synchronized with the server.

**Example:**

    person.$links['http://example.com/rels/artistic-works'] = 'http://example.com/composers/john/works'
    person.$linkRel('http://example.com/rels/artistic-works').$load().then(function (works) {
      console.log("John's works: " + works.map(function (work) { return work.title; }).join(', '));
    });

When using resources in Angular views, it is important that all information
needed to render the template has been loaded. Often, this means loading all
resources that are reached by following a specific path through the resource
relations. The `$loadPaths` method loads all resources reached by follow
relation paths. The argument is a nested object hierarchy where the keys
represent link or property relations, or computed properties that return other
resources directly (such as the `car` profile property in the examples).

**Example:**

    person.$loadPaths({
      car: {},
      friendHrefs: {
        car: {}
      },
      'http://example.com/rels/artistic-works': {}
    });

Loading related resources is usually done in resolve functions of a URL route.

**Example:**

    $routeProvider.when('/composers', {
      templateUrl: 'composers.html',
      controller: 'ComposersController',
      resolve: {
        composers: function (ResourceContext) {
          var context = new ResourceContext();
          return context.get('http://example.com/composers').$loadPaths({
            item: {
              car: {},
              friendHrefs: {
                car: {}
              }
            }
          });
        }
      }
    });

It is often useful to make sure the resource data is not too old. You can pass a
timestamp to the `$load` and `$loadPaths` methods to issue a GET request if the
last synchronization was before that time. The `$refresh` and
`$refreshPaths` methods work similarly, but use `Date.now()` as a default
timestamp.

**Example:**

    var oneHourAgo = Date.now() - 60*60*1000;
    movie.$load(oneHourAgo);
    person.$loadPaths({car: {}}, oneHourAgo);

    car.$refresh();
    manufacturer.$refreshPaths({modelsHref: {}})


## JSON HAL

The
[JSON Hypertext Application Language](https://tools.ietf.org/html/draft-kelly-json-hal)
is a JSON-based media type that reserves properties to include links and
embedded resources. `HalResource` is a subclass of `Resource` that understands
these properties. It accepts the `application/hal+json` media type, but will use
`application/json` for PUT requests. The idea is that links are API wiring, and
not application state.

On GET requests, links are copied from the `_links` property and embedded
resources are extracted from `_embedded` and added to the context. Both
properties are then deleted.

Using `$load` and `$loadPaths` makes sense especially with HAL, as this makes
the client robust with regard to the presence or absence of embedded resources.

**Example:**

    var root = new ResourceContext(HalResource).get('http://example.com/hal');
    root.$loadPaths({
      'ex:manufacturers': {
        'items': {
          'ex:models: {
            'items': {}
          },
          'ex:subsidiaries': {
            'items': {}
          }
        }
      }
    });


## Blob resources

A `BlobResource` can be used to represent binary data. The data received from
the server will be stored as a `Blob` in the `data` property of the object.

**Example:**

    person.profilePhotoHref = 'http://example.com/photos/johnwilliams.jpg';
    person.$propRel('profilePhotoHref', BlobResource).$load().then(function (photo) {
      $scope.photoImgSrc = $window.URL.createObjectURL(resource.data);
    });


## Error handlers

Many APIs will use the body of a 4xx or 5xx response to inform the client of
the type of error. An error media type, such as
[vnd.error](https://github.com/blongden/vnd.error), can be used as a formal
description of the problem. The `ResourceContext` HTTP methods can automatically
convert such responses to an `error` property on the response result.

The vnd.error media type is supported automatically. You can register handlers
for other media types:

**Example:**

    ResourceContext.registerErrorHandler('text/plain', function (response) {
      return {message: response.data};
    });

A handler must return an object with a `message` property containing a
human-readable error message. It may add other properties. For example, the
handler for vnd.error will add the following properties:

* `message`: the error message
* `logref`: an error identifier
* `path`: a pointer to the JSON field relevant to the error
* `$links`: hyperlinks to error metadata
* `$nested`: embedded error objects

The context will return the error object as the `error` property of the
rejection response.  If no response body is returned or the media type has not
been registered, `response.error.message` is set to the HTTP response status message.

**Example:**

    person.$get().catch(function (response) {
      console.log('Error: ' + response.error.message);
      console.log('Logref: ' + response.error.logref);
      console.log('Path: ' + response.error.path);
      if (response.error.$nested) {
        response.error.$nested.forEach(function (error) {
          console.log('Nested error: ' + error.message;
        });
      }
    });
