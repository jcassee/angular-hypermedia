# Hypermedia REST API client for AngularJS applications

A hypermedia client for AngularJS applications. Supports relations in HTTP
[Link headers](http://tools.ietf.org/html/rfc5988), JSON properties and
[JSON HAL](http://tools.ietf.org/html/draft-kelly-json-hal), and resource
[profiles](http://tools.ietf.org/html/rfc6906).


## Resources and contexts

Resources are represented by a `Resource` or one of its subclasses. A resource
is a unit of data that can be synchronized with its authoritative source using
HTTP requests. In this way, it is similar to a AngularJS `$resource` instance.

This module assumes that a hypermedia API client often interacts with 
multiple related resources for the functionality provided by a page. The 
`ResourceContext` is responsible for keeping together resources that are being
used together. Resources are bound to a single context.

`new ResourceContext()`: create a new resource context.

`context.get(uri)`: get the resource referenced by `uri`.

**Example:**

    var context, user;

    context = new ResourceContext();
    user = context.get('http://example.com/user/john');

The context acts like an identity map, in the sense that calling `context.get`
with the same URI returns the same `Resource` object.

If a subclass of `Resource` is required, a second argument may be used.

`context.get(uri, Factory)`: get the resource referenced by `uri` and use
`Factory` to create it if it does not already exist in the context.

**Example:**

    var movie;
    
    movie = context.get('http://example.com/movie/jaws', HalResource);

If you are using an API that is based on a media type for which a Resource
subclass exists (JSON HAL, for example) it is useful to create a context with a
default factory.

`new ResourceContext(Factory)`: create a new resource context that uses
`Factory` to create new resources.

**Example:**

    var context2, movie2;
    
    context2 = new ResourceContext(HalResource);
    movie2 = context.get('http://example.com/movie/jaws');


## GET, PUT, DELETE requests: synchronization

Resources are synchronized using GET, PUT and DELETE requests.

`resource.$get()`: get the latest data from the server and update the `resource`
object properties.

`resource.$put()`: update the server resource state from the `resource` object
properties.

`resource.$delete()`: remove the resource on the server.

These methods return a promise that is resolved with `resource` when the request
completes successfully.

(Note: the PATCH method is not (yet?) supported.)

**Example:**

    user.$get().then(function () {
      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Williams');
    });

    user.email = 'john@example.com';
    user.$put().then(function () {
      console.log('success!');
    });


## POST requests

A POST request is used to "operate on" data instead of synchronizing it. What
the "operate" means is up to the server, and depends on the resource. For
example, it is often used to create new resources.

`resource.$post(data, headers, callback)`: let the resource operate on `data`.
The optional `callback` function can be used to change the `$http` request
configuration object before it is sent, in the same way as a `$http` request
interceptor.

**Example:**

    user.$post({password: 'secret'}, {'Content-Type': 'text/plain'}).then(function () {
      console.log('password changed');
    });


## Relations

The essence of hypermedia is the linking of resources. In its simplest form,
a resource can link to another resource by including its URI as a property.
Because a reference to another resource is a hypermedia reference, such a
property is sometimes called an "href".

Note: a relation can be a string or an array of string.

**Example:**

    user.carHref = 'http://example.com/car/mercedes-sedan';
    user.friendHrefs = [
      'http://example.com/user/george',
      'http://example.com/user/steven'
    ];

Of course, it is possible to look up URIs in the context, but `Resource` has a
convenience method for getting related resources.

`resource.$propRel(prop)`: get the resource(s) referenced by the `prop`
property. If `resource[prop]` is an array, an array of resources is returned.

**Example:**

    var car, friends;

    car = user.$propRel('carHref');
    friends = user.$propRel('friendHrefs');
    
If the target resource is not created using the default context factory, you can
add the factory as the last parameter.

`resource.$propRel(prop, Factory)`: get the resource(s) referenced by the `prop`
property and use `Factory` to create it if it does not already exist in the
context.


## URI Templates

A reference can also be a [URI Template](http://tools.ietf.org/html/rfc6570),
containing paramaters that need to be substituted before it can be resolved.

`resource.$propRel(prop, vars)`: resolve the URI Template(s) in `resource[prop]`
and get the referenced resource(s).

**Example:**

    var todaysAppointments;

    user.appointmentsHref = 'http://example.com/appointments/john/{date}'
    todaysAppointments = user.$propRel('appointmentsHref', {date: '2015-03-05'});

URI Template variables and resource factory can be specified at the same time.

`resource.$propRel(prop, vars, Factory)`: resolve the URI Template(s) in
`resource[prop]` and get the referenced resource(s), using `Factory` to create
it if it does not already exist in the context.


## Links

Instead of referencing other resources in properties, it is also possible to use
links. Links are returned by the server as
[Link headers](http://tools.ietf.org/html/rfc5988).

`resource.$links`: a mapping of relations to link objects. A link object
has an `href` property containing the relation target URI and any other link
attributes. Often used attributes are listed in the RFC.

Relations are either keywords from the 
[IANA list](http://www.iana.org/assignments/link-relations/link-relations.xhtml)
or URIs. (These URIs are used as references, but may point to documentation
that describes the relationship.)

**Example:**

    car.$links['http://example.com/rels/owner'] = {href: 'http://example.com/user/john'};

Link relations are followed in much the same way as property relations.

`resource.$linkRel(rel, vars, Factory)`: get the resource(s) referenced by the
`rel` relation. If `resource.$links[rel]` is an array, an array of resources is
returned. If the optional `vars` argument can be used if the reference is a URI
Template. Use `Factory` to create resources if they do not already exist in the
context.

**Example:**

    expect(car.$linkRel('http://example.com/rels/owner')).toBe(user);


## Profiles

Resources can often be said to be of a certain type, in the sense that in the
examples, `http://example.com/user/john` "is a user". Resources support this
typing using [profiles](http://tools.ietf.org/html/rfc6906). Profiles are
identified by a URI. (As with relations, they may double as a pointer to the
profile documentation.)

`resource.$profile`: the resource profile(s).

It is possible to add functionality to resources of specific profiles by
registering properties. Setting `resource.$profile` immediately applies
the properties registered with that profile. They are set on a per-resource
prototype, so that they do not interfere with the resource data and are removed
when the profile is removed.

Note: if using an array, adding profiles to the array after setting `$profile`
will not update the properties.

`Resource.registerProfile(profile, properties)`: when a resource has the
`profile` profile, set `properties` on the resource using
`Object.defineProperties`.

`Resource.registerProfiles(profileProperties)`: register all profiles from the
mapping `profileProperties` of profiles to properties.

**Example:**

    Resource.registerProfiles({
      'http://example.com/profiles/user': {
        fullName: {get: function () {
          return this.firstName + ' ' + this.lastName;
        }},
        
        car: {get: function () {
          return this.propRel('carHref');
        }}
      }
    });

    user.$profile = 'http://example.com/profiles/user';
    
    expect(user.fullName).toBe('John Williams');
    expect(user.car.brand).toBe('Mercedes');

The profile is automatically set if the response of a GET request contains
either a profile Link header or the profile parameter in the Content-Type
header.


## Loading resources

Because different relations may point to the same URI, just calling `$get` on
all followed resources risks issuing GET requests for the same resource multiple
times. By using `$load` instead of `$get` a GET request will only be issued if
the resource was not already synchronized with the server.

`resource.$load()`: get the latest state from the server unless the resources
has already been synchronized.

**Example:**

    var owner;

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
relations.

`resource.$loadPaths(paths)`: follow the relation paths in the `paths` object
and load all resources. The `paths` argument is a nested object hierarchy where
the keys represent either link or property relations, or computed properties
that return other resources directly (such as the `car` profile property in the
examples).

**Example:**

    user.$loadPaths({
      car: {},
      friendHrefs: {
        car: {}
      },
      'http://example.com/rels/artistic-works': {}
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

    user.$propRel('profilePhoto', BlobResource).$load().then(function (photo) {
      $scope.photoImgSrc = $window.URL.createObjectURL(resource.data);
    });
