'use strict';

describe('Resource', function () {
  beforeEach(module('hypermedia'));

  // Setup

  var $log, $q, $rootScope, Resource, mockContext, uri, resource;

  beforeEach(inject(function (_$log_, _$q_, _$rootScope_, _Resource_) {
    $log = _$log_;
    $q = _$q_;
    $rootScope = _$rootScope_;
    Resource = _Resource_;
    mockContext = jasmine.createSpyObj('mockContext', ['get', 'httpGet', 'httpPut', 'httpDelete', 'httpPost', 'httpPatch']);
    uri = 'http://example.com';
    resource = new Resource(uri, mockContext);
  }));

  // Tests

  it('is initialized correctly', function () {
    expect(resource.$uri).toBe(uri);
    expect(resource.$context).toBe(mockContext);
    expect(resource.$links).toEqual({});
    expect(resource.$syncTime).toBeNull();
    expect(resource.$profile).toBeNull();
  });

  // Profiles

  it('adds properties by setting $profile', function () {
    Resource.registerProfile('profile', {test: {value: true}});
    resource.$profile = 'profile';
    expect(resource.test).toBe(true);
  });

  it('adds methods by setting $profile', function () {
    Resource.registerProfile('profile', {test: {value: function () {
      return 'test' + this.number;
    }}});
    resource.$profile = 'profile';
    resource.number = 1;
    expect(resource.test()).toBe('test1');
  });

  it('accepts multiple profiles', function () {
    Resource.registerProfiles({
      profile1: {test1: {value: true}},
      profile2: {test2: {value: true}}
    });
    resource.$profile = ['profile1', 'profile2'];
    expect(resource.test1).toBe(true);
    expect(resource.test2).toBe(true);
  });

  it('can switch profiles', function () {
    Resource.registerProfiles({
      profile1: {test1: {value: true}},
      profile2: {test2: {value: true}}
    });

    resource.$profile = 'profile1';
    expect(resource.test1).toBe(true);
    expect(resource.test2).toBeUndefined();

    resource.$profile = 'profile2';
    expect(resource.test1).toBeUndefined();
    expect(resource.test2).toBe(true);
  });

  // Property hrefs

  it('gets hrefs in properties', function () {
    resource.test_href = 'http://example.com/test';
    expect(resource.$propHref('test_href')).toBe('http://example.com/test');
  });

  it('resolves templated hrefs in properties', function () {
    resource.test_href = 'http://example.com/{id}';
    var result = resource.$propHref('test_href', {id: 'test'});
    expect(result).toBe('http://example.com/test');
  });

  it('resolves arrays of templated hrefs in properties', function () {
    resource.test_href = ['http://example.com/1/{id}', 'http://example.com/2/{id}'];
    var result = resource.$propHref('test_href', {id: 'test'});
    expect(result).toEqual(['http://example.com/1/test', 'http://example.com/2/test']);
  });

  it('returns undefined getting hrefs if property does not exist', function () {
    expect(resource.$propHref('test_href')).toBeUndefined();
  });

  it('follows hrefs in properties', function () {
    var resource2 = new Resource('http://example.com/test', mockContext);
    mockContext.get.and.returnValue(resource2);

    resource.test_href = 'http://example.com/test';
    expect(resource.$propRel('test_href')).toBe(resource2);
    expect(mockContext.get).toHaveBeenCalledWith('http://example.com/test', undefined);
  });

  it('follows templated hrefs in properties', function () {
    var resource2 = new Resource('http://example.com/test', mockContext);
    mockContext.get.and.returnValue(resource2);

    resource.test_href = 'http://example.com/{id}';
    expect(resource.$propRel('test_href', {id: 'test'})).toBe(resource2);
    expect(mockContext.get).toHaveBeenCalledWith('http://example.com/test', undefined);
  });

  it('follows arrays of templated hrefs in properties', function () {
    var resource1 = new Resource('http://example.com/1/test', mockContext);
    var resource2 = new Resource('http://example.com/2/test', mockContext);
    mockContext.get.and.callFake(function (uri) {
      if (uri == 'http://example.com/1/test') {
        return resource1;
      } else {
        return resource2;
      }
    });

    resource.test_href = ['http://example.com/1/{id}', 'http://example.com/2/{id}'];
    expect(resource.$propRel('test_href', {id: 'test'})).toEqual([resource1, resource2]);
    expect(mockContext.get).toHaveBeenCalledWith('http://example.com/1/test', undefined);
    expect(mockContext.get).toHaveBeenCalledWith('http://example.com/2/test', undefined);
  });

  it('returns undefined following hrefs if property does not exist', function () {
    expect(resource.$propRel('test_href')).toBeUndefined();
  });

  it('follow hrefs in properties with a factory', function () {
    var resource2 = new Resource('http://example.com/test', mockContext);
    mockContext.get.and.returnValue(resource2);

    resource.test_href = 'http://example.com/test';
    expect(resource.$propRel('test_href', Resource)).toBe(resource2);
    expect(mockContext.get).toHaveBeenCalledWith('http://example.com/test', Resource);
  });

  // Links

  it('resolves links', function () {
    resource.$links.example = {href: 'http://example.com/test'};
    expect(resource.$linkHref('example')).toBe('http://example.com/test');
  });

  it('resolves templated links', function () {
    resource.$links.example = {href: 'http://example.com/{id}', templated: true};
    var result = resource.$linkHref('example', {id: 'test'});
    expect(result).toBe('http://example.com/test');
  });

  it('warns when resolving templated links without vars', function () {
    resource.$links.example = {href: 'http://example.com/{id}', templated: true};
    resource.$linkHref('example');
    expect($log.warn.logs).toEqual([["Following templated link relation 'example' without variables"]]);
  });

  it('warns when resolving non-templated links with vars', function () {
    resource.$links.example = {href: 'http://example.com/test'};
    resource.$linkHref('example', {foo: 'bar'});
    expect($log.warn.logs).toEqual([["Following non-templated link relation 'example' with variables"]]);
  });

  it('warns when resolving a deprecated link', function () {
    resource.$links.example = {href: 'http://example.com/test', deprecation: 'http://example.com/deprecation'};
    resource.$linkHref('example');
    expect($log.warn.logs).toEqual([["Following deprecated link relation 'example': http://example.com/deprecation"]]);
  });

  it('resolves array links', function () {
    var href1 = 'http://example.com/1';
    var href2 = 'http://example.com/2';
    resource.$links.example = [{href: href1}, {href: href2}];
    expect(resource.$linkHref('example')).toEqual([href1, href2]);
  });

  it('follows links', function () {
    var resource1 = new Resource('http://example.com/1', mockContext);
    mockContext.get.and.returnValue(resource1);
    resource.$links.example = {href: resource1.$uri};
    expect(resource.$linkRel('example')).toBe(resource1);
    expect(mockContext.get).toHaveBeenCalledWith(resource1.$uri, undefined);
  });

  it('follows links with factory', function () {
    var resource1 = new Resource('http://example.com/1', mockContext);
    mockContext.get.and.returnValue(resource1);
    resource.$links.example = {href: resource1.$uri};
    expect(resource.$linkRel('example', Resource)).toBe(resource1);
    expect(mockContext.get).toHaveBeenCalledWith(resource1.$uri, Resource);
  });

  it('follows array links', function () {
    var resource1 = new Resource('http://example.com/1', mockContext);
    var resource2 = new Resource('http://example.com/2', mockContext);
    mockContext.get.and.callFake(function (uri) {
      if (uri == 'http://example.com/1') {
        return resource1;
      } else {
        return resource2;
      }
    });

    resource.$links.example = [{href: resource1.$uri}, {href: resource2.$uri}];
    expect(resource.$linkRel('example')).toEqual([resource1, resource2]);
    expect(mockContext.get).toHaveBeenCalledWith(resource1.$uri, undefined);
    expect(mockContext.get).toHaveBeenCalledWith(resource2.$uri, undefined);
  });

  // Loading

  it('loads a resource if it has not been synced yet', function () {
    resource.$load();
    expect(mockContext.httpGet).toHaveBeenCalledWith(resource);
  });

  it('does not load a resource again if it has been synced', function () {
    resource.$syncTime = Date.now();
    resource.$load();
    expect(mockContext.httpGet).not.toHaveBeenCalled();
  });

  it('loads paths of related resources', function (done) {
    var resource1 = new Resource('http://example.com/1', mockContext);
    var resource2 = new Resource('http://example.com/2', mockContext);
    var resource3 = new Resource('http://example.com/3', mockContext);
    mockContext.get.and.callFake(function (uri) {
      switch (uri) {
        case resource.$uri:  return resource;
        case resource1.$uri: return resource1;
        case resource2.$uri: return resource2;
        case resource3.$uri: return resource3;
      }
    });
    mockContext.httpGet.and.callFake(function (resource) {
      return $q.when(resource);
    });

    resource.$links.step1 = {href: resource1.$uri};
    resource1.step2 = resource2.$uri;
    resource2.step3 = resource3;

    resource.$loadPaths({step1: {step2: {}}}).then(function () {
      expect(mockContext.httpGet).toHaveBeenCalledWith(resource);
      expect(mockContext.httpGet).toHaveBeenCalledWith(resource1);
      expect(mockContext.httpGet).toHaveBeenCalledWith(resource2);
      expect(mockContext.httpGet).toHaveBeenCalledWith(resource3);
      done();
    });
    $rootScope.$digest();
  });

  // HTTP

  it('creates HTTP GET request', function () {
    expect(resource.$getRequest()).toEqual({
      method: 'get',
      url: 'http://example.com',
      headers: {Accept: 'application/json'}
    });
  });

  it('delegates HTTP GET request to the context', function () {
    resource.$get();
    expect(mockContext.httpGet).toHaveBeenCalledWith(resource);
  });

  it('creates HTTP PUT request', function () {
    expect(resource.$putRequest()).toEqual({
      method: 'put',
      url: 'http://example.com',
      data: resource,
      headers: {'Content-Type': 'application/json'}
    });
  });

  it('delegates HTTP PUT request to the context', function () {
    resource.$put();
    expect(mockContext.httpPut).toHaveBeenCalledWith(resource);
  });

  it('creates HTTP PATCH request', function () {
    var data = {};
    expect(resource.$patchRequest(data)).toEqual({
      method: 'patch',
      url: 'http://example.com',
      data: data,
      headers: {'Content-Type': 'application/merge-patch+json'}
    });
  });

  it('delegates HTTP PATCH request to the context', function () {
    resource.$patch();
    expect(mockContext.httpPatch).toHaveBeenCalledWith(resource);
  });

  it('creates HTTP DELETE request', function () {
    expect(resource.$deleteRequest()).toEqual({
      method: 'delete',
      url: 'http://example.com'
    });
  });

  it('delegates HTTP DELETE request to the context', function () {
    resource.$delete();
    expect(mockContext.httpDelete).toHaveBeenCalledWith(resource);
  });

  it('creates HTTP POST request', function () {
    function callback(config) {
      return angular.extend(config, {extra: 'value'});
    }

    expect(resource.$postRequest('data', {foo: 'bar'}, callback)).toEqual({
      method: 'post',
      url: 'http://example.com',
      data: 'data',
      headers: {foo: 'bar'},
      extra: 'value'
    });
  });

  it('delegates HTTP POST request to the context', function () {
    resource.$post('data', {foo: 'bar'}, angular.identity);
    expect(mockContext.httpPost).toHaveBeenCalledWith(resource, 'data', {foo: 'bar'}, angular.identity);
  });

  // Updates

  it('updates state, links and profile', function () {
    resource.aVar = 'test';
    resource.$update({foo: 'bar'}, {profile: {href: 'http://example.com/profile'}});
    expect(resource.aVar).toBeUndefined();
    expect(resource.foo).toBe('bar');
    expect(resource.$links).toEqual({profile: {href: 'http://example.com/profile'}});
    expect(resource.$profile).toBe('http://example.com/profile');
  });

  it('requires the href of a link with the "self" relation to equal the resource URI', function () {
    resource.$update({foo: 'bar'}, {self: {href: 'http://example.com'}});
    expect(function () {
      resource.$update({foo: 'qux'}, {self: {href: 'http://example.com/other'}});
    }).toThrowError('Self link href differs: expected "http://example.com", was "http://example.com/other"');
  });

  // Merges

  it('merges state', function () {
    resource.aVar = 'foo';
    resource.bVar = 'joe';
    resource.$merge({aVar: null, bVar: 'john', newVar: 'bar'});

    expect(resource.aVar).toBeUndefined();
    expect(resource.bVar).toBe('john');
    expect(resource.newVar).toBe('bar');
  });

  it('merges nested state', function () {
    resource.nested = {
      aVar: 'foo',
      bVar: 'joe'
    };
    resource.$merge({nested: {
      aVar: null,
      bVar: 'john',
      newVar: 'bar'
    }});

    expect(resource.nested.aVar).toBeUndefined();
    expect(resource.nested.bVar).toBe('john');
    expect(resource.nested.newVar).toBe('bar');
  });

});
