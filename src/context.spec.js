'use strict';

xdescribe('ResourceContext', function () {
  beforeEach(module('halresource'));


  // Injection

  var ResourceContext;

  beforeEach(inject(function (_HalContext_) {
    ResourceContext = _HalContext_;
  }));


  // Setup

  var context;

  beforeEach(function () {
    context = new ResourceContext();
  });


  // Tests

  it('creates unique resources', function () {
    var resource1a = context.get('http://example.com/1');
    var resource1b = context.get('http://example.com/1');
    var resource2 = context.get('http://example.com/2');
    expect(resource1a).toBe(resource1b);
    expect(resource1a).not.toBe(resource2);
  });

  it('copies resources from another context', function () {
    var profileUri = 'http://example.com/profile';
    ResourceContext.registerProfile(profileUri, {foo: {value: 'bar'}});

    var resource = context.get('http://example.com');
    resource.$profile = profileUri;
    resource.name = 'John';

    var context2 = new ResourceContext();
    var resource2 = context2.copy(resource);

    expect(resource2).not.toBe(resource);
    expect(resource2.name).toBe('John');
    expect(resource2.foo).toBe('bar');
  });
});


xdescribe('HalResource', function () {
  beforeEach(module('halresource'));


  // Injection

  var $httpBackend, $log, $rootScope, ResourceContext;

  beforeEach(inject(function (_$httpBackend_, _$log_, _$rootScope_, _HalContext_) {
    $httpBackend = _$httpBackend_;
    $log = _$log_;
    $rootScope = _$rootScope_;
    ResourceContext = _HalContext_;
  }));


  // Setup

  var context, uri, profileUri, resource;

  beforeEach(function () {
    uri = 'http://example.com';
    profileUri = 'http://example.com/profile';
    ResourceContext.registerProfile(profileUri, {foo: {value: 'bar'}});
    context = new ResourceContext();
    resource = context.get(uri);
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });


  // Tests

  it('has a self href', function () {
    expect(resource._links.self.href).toBe(uri);
  });

  it('has a uri', function () {
    expect(resource.$uri).toBe(uri);
  });

  it('has a context', function () {
    expect(resource.$context).toBe(context);
  });

  it('has state', function () {
    resource.name = 'John';
    resource._embedded = {example: {_links: {self: {href: 'http://example.com/2'}}}};
    expect(resource.$toState()).toEqual({name: 'John'});
  });

  it('resolves links', function () {
    var href = 'http://example.com/1';
    resource._links.example = {href: href};
    expect(resource.$href('example')).toBe(href);
  });

  it('resolves templated links', function () {
    resource._links.example = {href: 'http://example.com/{id}', templated: true};
    expect(resource.$href('example', {id: '1'})).toBe('http://example.com/1');
  });

  it('warns when resolving templated links without vars', function () {
    resource._links.example = {href: 'http://example.com/{id}', templated: true};
    resource.$href('example');
    expect($log.warn.logs).toEqual([["Following templated link relation 'example' without variables"]]);
  });

  it('warns when resolving non-templated links with vars', function () {
    resource._links.example = {href: 'http://example.com/1'};
    resource.$href('example', {foo: 'bar'});
    expect($log.warn.logs).toEqual([["Following non-templated link relation 'example' with variables"]]);
  });

  it('warns when resolving non-templated links from embedded reesources with vars', function () {
    resource._embedded = {example: {_links: {self: {href: 'http://example.com/1'}}}};
    resource.$href('example', {foo: 'bar'});
    expect($log.warn.logs).toEqual([["Following non-templated link relation 'example' with variables"]]);
  });

  it('warns when resolving a deprecated link', function () {
    resource._links.example = {href: 'http://example.com/1', deprecation: 'http://example.com/deprecation'};
    resource.$href('example');
    expect($log.warn.logs).toEqual([["Following deprecated link relation 'example': http://example.com/deprecation"]]);
  });

  it('resolves array links', function () {
    var resource1 = context.get('http://example.com/1');
    var href1 = 'http://example.com/1';
    var href2 = 'http://example.com/2';
    resource1._links.example = [{href: href1}, {href: href2}];
    expect(resource1.$href('example')).toEqual([href1, href2]);
  });

  it('resolves links when relation is only embedded', function () {
    var href = 'http://example.com/1';
    resource._embedded = {example: {_links: {self: {href: href}}}};
    expect(resource.$href('example')).toBe(href);
  });

  it('merges links with self hrefs of embedded resources when resolving', function () {
    var href1 = 'http://example.com/1';
    var href2 = 'http://example.com/2';
    resource._links.example = {href: href1};
    resource._embedded = {example: {_links: {self: {href: href2}}}};
    expect(resource.$href('example')).toEqual([href1, href2]);
  });

  it('merges links with self hrefs of embedded resources when resolving when both are arrays', function () {
    var href1a = 'http://example.com/1a';
    var href1b = 'http://example.com/1b';
    var href2a = 'http://example.com/2a';
    var href2b = 'http://example.com/2b';
    resource._links.example = [{href: href1a}, {href: href1b}];
    resource._embedded = {example: [{_links: {self: {href: href2a}}}, {_links: {self: {href: href2b}}}]};
    expect(resource.$href('example')).toEqual([href1a, href1b, href2a, href2b]);
  });

  it('follows links', function () {
    var resource1 = context.get('http://example.com/1');
    resource._links.example = {href: resource1.$uri};
    expect(resource.$rel('example')).toBe(resource1);
  });

  it('follows array links', function () {
    var resource1 = context.get('http://example.com/1');
    var resource2 = context.get('http://example.com/2');
    resource._links.example = [{href: resource1.$uri}, {href: resource2.$uri}];
    expect(resource.$rel('example')).toEqual([resource1, resource2]);
  });

  it('follows links when relation is only embedded', function () {
    var resource1 = context.get('http://example.com/1');
    resource._embedded = {example: {_links: {self: {href: resource1.$uri}}}};
    expect(resource.$rel('example')).toBe(resource1);
  });

  it('starts out unsynced', function () {
    expect(resource.$syncTime).toBeNull();
  });

  it('performs HTTP GET requests', function () {
    var promiseResult = null;
    resource.$get().then(function (result) { promiseResult = result; });
    $httpBackend.expectGET(uri, {'Accept': 'application/hal+json'})
        .respond('{"name": "John", "_links": {"self": {"href": "'+uri+'"}}}', {'Content-Type': 'application/hal+json'});
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.name).toBe('John');
    expect(resource.$syncTime / 10).toBeCloseTo(Date.now() / 10, 0);
  });

  it('rejects a HTTP GET request if the self link in the response data differs', function () {
    var rejected = false;
    resource.$get().catch(function () { rejected = true; });
    $httpBackend.expectGET(uri, {'Accept': 'application/hal+json'})
      .respond('{"name": "John", "_links": {"self": {"href": "http://example.com/1"}}}',
        {'Content-Type': 'application/hal+json'});
    $httpBackend.flush();
    expect(rejected).toBe(true);
    expect(resource.name).toBeUndefined();
    expect(resource.$syncTime).toBeNull();
  });

  it('rejects a HTTP GET request if the Content-Type is not application/hal+json', function () {
    var rejected = false;
    resource.$get().catch(function () { rejected = true; });
    $httpBackend.expectGET(uri, {'Accept': 'application/hal+json'})
        .respond('{"name": "John", "_links": {"self": {"href": "'+uri+'"}}}', {'Content-Type': 'application/json'});
    $httpBackend.flush();
    expect(rejected).toBe(true);
    expect(resource.name).toBeUndefined();
    expect(resource.$syncTime).toBeNull();
  });

  it('rejects a HTTP GET request if the response contains no data', function () {
    var rejected = false;
    resource.$get().catch(function () { rejected = true; });
    $httpBackend.expectGET(uri, {'Accept': 'application/hal+json'})
        .respond('', {'Content-Type': 'application/hal+json'});
    $httpBackend.flush();
    expect(rejected).toBe(true);
    expect(resource.name).toBeUndefined();
    expect(resource.$syncTime).toBeNull();
  });

  it('performs state HTTP PUT requests', function () {
    var promiseResult = null;
    resource.$put().then(function (result) { promiseResult = result; });
    $httpBackend.expectPUT(uri, {},
          {'Accept': 'application/hal+json', 'Content-Type': 'application/json'})
        .respond(204);
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.$syncTime / 10).toBeCloseTo(Date.now() / 10, 0);
  });

  it('performs HTTP DELETE requests', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    resource.$delete().then(function (result) { promiseResult = result; });
    $httpBackend.expectDELETE(uri).respond(204);
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.$syncTime).toBeNull();
  });

  it('performs HTTP POST requests', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    var promise = resource.$post('Test', {'Accept': '*/*', 'Content-Type': 'text/plain'});
    promise.then(function (result) { promiseResult = result; });
    $httpBackend.expectPOST(uri, 'Test', {'Accept': '*/*', 'Content-Type': 'text/plain'}).respond(204);
    $httpBackend.flush();
    expect(promiseResult.status).toBe(204);
    expect(resource.$syncTime).toBe(1);
  });

  it('performs HTTP POST requests without headers', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    var promise = resource.$post('Test');
    promise.then(function (result) { promiseResult = result; });
    $httpBackend.expectPOST(uri, 'Test').respond(204);
    $httpBackend.flush();
    expect(promiseResult.status).toBe(204);
    expect(resource.$syncTime).toBe(1);
  });

  it('performs a HTTP GET on load if not yet synced', function () {
    var promiseResult = null;
    resource.$load().then(function (result) { promiseResult = result; });
    $httpBackend.expectGET(uri, {'Accept': 'application/hal+json'})
      .respond({name: 'John', _links: {self: {href: uri}}}, {'Content-Type': 'application/hal+json'});
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.name).toBe('John');
    expect(resource.$syncTime / 10).toBeCloseTo(Date.now() / 10, 0);
  });

  it('returns a resolved promise on load if already synced', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    resource.$load().then(function (result) { promiseResult = result; });
    $rootScope.$digest();
    expect(promiseResult).toBe(resource);
  });

  it('adds embedded resources from HTTP to the context recursively', function () {
    var carResource = context.get('http://example.com/car');
    resource.$get();
    $httpBackend.expectGET(uri, {'Accept': 'application/hal+json'})
      .respond({
        name: 'John',
        _links: {
          self: {href: uri}
        },
        _embedded: {
          hat: {
            style: 'Fedora',
            _links: {
              self: {href: 'http://example.com/hat'}
            }
          },
          car: {
            brand: 'Porsche',
            type: '911',
            _links: {
              self: {href: 'http://example.com/car'}
            },
            _embedded: {
              engine: {
                type: '901/01 flat-6',
                _links: {
                  self: {href: 'http://example.com/engine'}
                }
              }
            }
          }
        }
      }, {'Content-Type': 'application/hal+json'});
    $httpBackend.flush();
    expect(resource.name).toBe('John');
    expect(resource.$rel('hat')).toBe(context.get('http://example.com/hat'));
    expect(resource.$rel('car')).toBe(carResource);
    expect(carResource.brand).toBe('Porsche');
    expect(carResource.$rel('engine')).toBe(context.get('http://example.com/engine'));
    expect(resource.$syncTime / 10).toBeCloseTo(Date.now() / 10, 0);
    expect(carResource.$syncTime / 10).toBeCloseTo(Date.now() / 10, 0);
  });

  it('reject a HTTP request if the self link in the response is different', function () {
    var error = null;
    resource.$get().catch(function (e) { error = e; });
    $httpBackend.expectGET(uri, {'Accept': 'application/hal+json'})
      .respond({name: 'John', _links: {self: {href: 'http://example.com/other'}}},
        {'Content-Type': 'application/hal+json'});
    $httpBackend.flush();
    expect(error).toBe("Self link href differs: expected 'http://example.com', was 'http://example.com/other'");
    expect(resource.name).toBeUndefined();
  });

  it('applies a profile', function () {
    expect(resource.foo).toBeUndefined();

    resource.$profile = profileUri;
    expect(resource.$profile).toBe(profileUri);
    expect(resource.foo).toBe('bar');
  });

  it('applies an array of profiles', function () {
    var profileUri2 = 'http://example.com/profile1';
    ResourceContext.registerProfile(profileUri2, {qux: {value: 'baz'}});

    expect(resource.foo).toBeUndefined();

    resource.$profile = [profileUri, profileUri2];
    expect(resource.$profile).toEqual([profileUri, profileUri2]);
    expect(resource.foo).toBe('bar');
    expect(resource.qux).toBe('baz');
  });

  it('removes the profile when setting it to null', function () {
    resource.$profile = profileUri;
    expect(resource.foo).toBe('bar');

    resource.$profile = null;
    expect(resource.foo).toBeUndefined();
  });

  it('removes the profile when setting it to a non-registered URI', function () {
    resource.$profile = profileUri;
    expect(resource.foo).toBe('bar');

    resource.$profile = 'http://example.com/profile1';
    expect(resource.foo).toBeUndefined();
  });

  it('removes previous profile when applying new profile', function () {
    ResourceContext.registerProfile('http://example.com/profile1', {x: {value: 1}, y: {value: 2}});
    ResourceContext.registerProfile('http://example.com/profile2', {x: {value: 3}, z: {value: 4}});

    expect(resource.x).toBeUndefined();
    expect(resource.y).toBeUndefined();
    expect(resource.z).toBeUndefined();

    resource.$profile = 'http://example.com/profile1';
    expect(resource.x).toBe(1);
    expect(resource.y).toBe(2);
    expect(resource.z).toBeUndefined();

    resource.$profile = 'http://example.com/profile2';
    expect(resource.x).toBe(3);
    expect(resource.y).toBeUndefined();
    expect(resource.z).toBe(4);
  });

  it('applies the profile from HTTP data', function () {
    expect(resource.foo).toBeUndefined();
    resource.$get();
    $httpBackend.expectGET(uri, {'Accept': 'application/hal+json'})
      .respond({
        _links: {
          self: {href: uri},
          profile: {href: profileUri}
        }
      }, {'Content-Type': 'application/hal+json'});
    $httpBackend.flush();
    expect(resource.foo).toBe('bar');
  });

  it('applies an array of profiles from HTTP data', function () {
    var profileUri2 = 'http://example.com/profile1';
    ResourceContext.registerProfile(profileUri2, {qux: {value: 'baz'}});

    expect(resource.foo).toBeUndefined();
    resource.$get();
    $httpBackend.expectGET(uri, {'Accept': 'application/hal+json'})
      .respond({
        _links: {
          self: {href: uri},
          profile: [
            {href: profileUri},
            {href: profileUri2}
          ]
        }
      }, {'Content-Type': 'application/hal+json'});
    $httpBackend.flush();
    expect(resource.foo).toBe('bar');
    expect(resource.qux).toBe('baz');
  });

  it('does not include profile properties in HTTP data', function () {
    resource.$profile = profileUri;
    resource.name = 'John';

    resource.$put();
    $httpBackend.expectPUT(uri, {"name":"John"},
        {'Accept': 'application/hal+json', 'Content-Type': 'application/json'})
      .respond(204);
    $httpBackend.flush();
  });

  it('registers profiles in bulk', function () {
    expect(resource.foo).toBeUndefined();
    expect(resource.qux).toBeUndefined();

    ResourceContext.registerProfiles({
      'http://example.com/profile1': {foo: {value: 'bar'}},
      'http://example.com/profile2': {qux: {value: 'baz'}}
    });

    resource.$profile = ['http://example.com/profile1', 'http://example.com/profile2'];
    expect(resource.foo).toBe('bar');
    expect(resource.qux).toBe('baz');
  });
});
