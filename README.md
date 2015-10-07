# Hypermedia REST API client for AngularJS applications

A hypermedia client for AngularJS applications. Supports relations in HTTP
[Link headers](http://tools.ietf.org/html/rfc5988), JSON properties and
[JSON HAL](http://tools.ietf.org/html/draft-kelly-json-hal), and resource
[profiles](http://tools.ietf.org/html/rfc6906).


## Quickstart

    angular.module('myApp', ['hypermedia'])

      // Register profile properties
      .run(function (Resource) {
        Resource.registerProfile('http://example.com/profiles/composer': {
          fullName: {get: function () {
            return this.firstName + ' ' + this.lastName;
          }},
          
          car: {get: function () {
            return this.propRel('carHref');
          }}
        });
      })
      
      // Load all required resources during the route resolve phase
      .config(function($routeProvider) {
        $routeProvider.when('/composers', {
          templateUrl: 'composers.html',
          controller: 'ComposersController',
          resolve: {
            composers: function (ResourceContext) {
              var context = new ResourceContext();
              return context.get('http://example.com/composers').$loadPaths({
                car: {},
                friends: {
                  car: {}
                }
              });
            }
          }
        });
      });

      // Set the resource on the scope
      .factory('ComposerController', function (composers) {
        $scope.composers = composers;
      })

    ;


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

    var context, composer;

    context = new ResourceContext();
    composer = context.get('http://example.com/composer/john');
    expect(composer.$uri).toBe('http://example.com/composer/john');

The context acts like an identity map, in the sense that calling `context.get`
with the same URI returns the same `Resource` object.

If a subclass of `Resource` is required, a second argument may be used.

**Example:**

    var movie;
    
    movie = context.get('http://example.com/movie/jaws', HalResource);

If you are using an API that is based on a media type for which a Resource
subclass exists (JSON HAL, for example) it is useful to create a context with a
default factory.

**Example:**

    var context2, movie2;
    
    context2 = new ResourceContext(HalResource);
    movie2 = context.get('http://example.com/movie/jaws');


## GET, PUT, DELETE requests: synchronization

Resources are synchronized using GET, PUT and DELETE requests. The methods on
the resource object are `$get`, `$put` and `$delete` respectively. These
methods return a promise that is resolved with `resource` when the request
completes successfully.

(Note: the PATCH method is not -- yet? -- supported.)

**Example:**

    composer.$get().then(function () {
      expect(composer.firstName).toBe('John');
      expect(composer.lastName).toBe('Williams');
    });

    composer.email = 'john@example.com';
    composer.$put().then(function () {
      console.log('success!');
    });


## POST requests

A POST request is used to "operate on" data instead of synchronizing it. What
the "operate" means is up to the server, and depends on the resource. For
example, it is often used to create new resources. The `$post` method accepts
as arguments the data to be sent in the body and a mapping of headers.

**Example:**

    composer.$post({password: 'secret'}, {'Content-Type': 'text/plain'}).then(function () {
      console.log('password changed');
    });


## Relations

The essence of hypermedia is the linking of resources. In its simplest form,
a resource can link to another resource by including its URI as a property.
Because a reference to another resource is a hypermedia reference, such a
property is sometimes called an "href".

Note: a relation can be a string or an array of string.

**Example:**

    composer.carHref = 'http://example.com/car/mercedes-sedan';
    composer.friendHrefs = [
      'http://example.com/composer/george',
      'http://example.com/composer/steven'
    ];

Of course, it is possible to look up URIs in the context, but `Resource` has the
convenience method `$propRel` for getting related resources. If the property
value is an array or URIs then an array of resources is returned.

**Example:**

    var car, friends;

    car = composer.$propRel('carHref');
    friends = composer.$propRel('friendHrefs');
    
If the target resource is not created using the default context factory, you can
add the factory as the last parameter.

**Example:**

    var manufacturer;

    car.manufacturerHref = 'http://example.com/hal/companies/mercedes';
    manufacturer = car.$propRel('manufacturerHref', HalResource)


## URI Templates

A reference can also be a [URI Template](http://tools.ietf.org/html/rfc6570),
containing paramaters that need to be substituted before it can be resolved. The
`$propRel` accepts a second argument of variables to resolve a URI Template
reference.

**Example:**

    var todaysAppointments;

    composer.appointmentsHref = 'http://example.com/appointments/john/{date}'
    todaysAppointments = composer.$propRel('appointmentsHref', {date: '2015-03-05'});

URI Template variables and resource factory can be specified at the same time.

**Example:**

    var currentModels;
    
    manufacturer.modelsHref = 'http://example.com/hal/companies/mercedes/models{?discontinued}'
    currentModels = manufacturer.$propRel('modelsHref', {discontinued: false}, HalResource);


## Links

Instead of referencing other resources in properties, it is also possible to use
links. Links are returned by the server as
[Link headers](http://tools.ietf.org/html/rfc5988).

The `$links` property is a mapping of relations to link objects. A link object
has an `href` property containing the relation target URI and any other link
attributes. Often used attributes are listed in the RFC.

Relations are either keywords from the 
[IANA list](http://www.iana.org/assignments/link-relations/link-relations.xhtml)
or URIs. (These URIs are used as references, but may point to documentation
that describes the relationship.)

**Example:**

    car.$links['http://example.com/rels/owner'] = {
      href: 'http://example.com/composer/john',
      title: 'Owner'
    };

Link relations are followed in much the same way as property relations, using
the `$linkRel` method.

**Example:**

    expect(car.$linkRel('http://example.com/rels/owner')).toBe(composer);


## Profiles

Resources can often be said to be of a certain type, in the sense that in the
examples, `http://example.com/composer/john` "is a composer". This is called a
[profile](http://tools.ietf.org/html/rfc6906). Profiles are identified by a URI.
(As with relations, they may double as a pointer to the profile documentation.)
Resources have a `$profile` property containing the profile URI. 

It is possible to add functionality to resources of specific profiles by
registering properties. Setting `$profile` immediately applies the properties
registered with that profile. They are set on a per-resource prototype, so that
they do not interfere with the resource data and are removed when the profile is
removed.

Note: if using an array, adding profiles to the array after setting `$profile`
will not update the properties.

Profiles are registered using `Resource.registerProfile(profile, properties)`
or `Resource.registerProfiles(profileProperties)`.

**Example:**

    Resource.registerProfiles({
      'http://example.com/profiles/composer': {
        fullName: {get: function () {
          return this.firstName + ' ' + this.lastName;
        }},
        
        car: {get: function () {
          return this.propRel('carHref');
        }}
      }
    });

    composer.$profile = 'http://example.com/profiles/composer';
    
    expect(composer.fullName).toBe('John Williams');
    expect(composer.car.brand).toBe('Mercedes');

The profile is automatically set if the response of a GET request contains
either a profile Link header or the profile parameter in the Content-Type
header.


## Loading resources

Because different relations may point to the same URI, just calling `$get` on
all followed resources risks issuing GET requests for the same resource multiple
times. By using `$load` instead of `$get` a GET request will only be issued if
the resource was not already synchronized with the server.

**Example:**

    $q.when(friends.map(function (friend) {
      return friend.$propRel('carHref').$load();
    })).then(function (cars) {
      friends.forEach(function (friend) {
        console.log(friend.fullName + ' owns a ' + friend.car.brand);
      });
    });

When using resources in Angular views, it is important that all information
needed to render the template has been loaded. Often, this means loading all
resources that are reached by following a specific path through the resource
relations. The `$loadPaths` method loads all resources reached by follow
relation paths. The argument is a nested object hierarchy where the keys
represent either link or property relations, or computed properties that return
other resources directly (such as the `car` profile property in the examples).

**Example:**

    composer.$loadPaths({
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


## Blob resources

A `BlobResource` can be used to represent binary data. The data received from
the server will be stored as a `Blob` in the `data` property of the object.

**Example:**

    composer.profilePhotoHref = 'http://example.com/photos/johnwilliams.jpg';
    composer.$propRel('profilePhotoHref', BlobResource).$load().then(function (photo) {
      $scope.photoImgSrc = $window.URL.createObjectURL(resource.data);
    });
