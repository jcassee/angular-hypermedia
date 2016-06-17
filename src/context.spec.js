'use strict';

describe('ResourceContext', function () {
  beforeEach(module('hypermedia'));


  // Setup

  var $httpBackend, $q, ResourceContext, context, resource;
  var problemJson = 'application/problem+json';

  beforeEach(inject(function (_$httpBackend_, _$q_, _ResourceContext_) {
    $httpBackend = _$httpBackend_;
    $q = _$q_;
    ResourceContext = _ResourceContext_;
    context = new ResourceContext();
    resource = context.get('http://example.com');
  }));

  afterEach(function () {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });


  // Tests

  it('invokes error handler for content type', function () {
    var spy = jasmine.createSpy('spy').and.callFake(function () {
      return {};
    });
    ResourceContext.registerErrorHandler(problemJson, spy);

    context.httpGet(resource);
    $httpBackend.expectGET(resource.$uri, {'Accept': 'application/json'})
      .respond(500, null, {'Content-Type': problemJson});
    $httpBackend.flush();

    expect(spy).toHaveBeenCalled();
  });

  it('rejects response with error if no matching error handler', function () {
    var statusText = 'Validation error';
    var promiseResult = null;
    var spy = jasmine.createSpy('spy');

    ResourceContext.registerErrorHandler('application/json', spy);
    context.httpGet(resource).catch(function (result) {
      promiseResult = result;
    });
    $httpBackend.expectGET(resource.$uri, {'Accept': 'application/json'})
      .respond(500, {}, {'Content-Type': problemJson}, statusText);
    $httpBackend.flush();

    expect(spy).not.toHaveBeenCalled();
    expect(promiseResult.error.message).toBe(statusText);
    expect(promiseResult.status).toBe(500);
  });

  it('invokes default error handler for content type "application/vnd.error+json"', function () {
    var promiseResult = null;
    var msg = 'Validatie fout';
    context.httpGet(resource).catch(function (result) {
      promiseResult = result;
    });
    $httpBackend.expectGET(resource.$uri, {'Accept': 'application/json'})
      .respond(500, {message: msg}, {'Content-Type': 'application/vnd.error+json'});
    $httpBackend.flush();

    expect(promiseResult.error).toBeDefined();
    expect(promiseResult.error.message).toBe(msg);
  });

  it('creates unique resources', function () {
    expect(context.get('http://example.com')).toBe(resource);
    expect(context.get('http://example.com/other')).not.toBe(resource);
  });

  it('copies resources from another context', function () {
    resource.$links.profile = 'http://example.com/profile';
    resource.name = 'John';

    var context2 = new ResourceContext();
    var resource2 = context2.copy(resource);

    expect(resource2).not.toBe(resource);
    expect(resource2.$uri).toBe(resource.$uri);
    expect(resource2.name).toBe('John');
    expect(resource2.$links.profile).toBe('http://example.com/profile');
  });

  it('performs HTTP GET requests', function () {
    var promiseResult = null;
    context.httpGet(resource).then(function (result) {
      promiseResult = result;
    });
    $httpBackend.expectGET(resource.$uri, {'Accept': 'application/json'})
        .respond('{"name": "John"}', {'Content-Type': 'application/json'});
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.name).toBe('John');
    expect(resource.$syncTime / 100).toBeCloseTo(Date.now() / 100, 0);
  });

  it('converts content type profile parameter to link', function () {
    var promiseResult = null;
    context.httpGet(resource).then(function (result) {
      promiseResult = result;
    });
    $httpBackend.expectGET(resource.$uri, {'Accept': 'application/json'})
        .respond('{"name": "John"}', {'Content-Type': 'application/json; profile="http://example.com/profile"'});
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.name).toBe('John');
    expect(resource.$links.profile).toEqual({href: 'http://example.com/profile'});
    expect(resource.$syncTime / 100).toBeCloseTo(Date.now() / 100, 0);
  });

  it('performs HTTP PUT requests', function () {
    var promiseResult = null;
    context.httpPut(resource).then(function (result) {
      promiseResult = result;
    });
    $httpBackend.expectPUT(resource.$uri, {},
          {'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json'})
        .respond(204);
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.$syncTime / 100).toBeCloseTo(Date.now() / 100, 0);
  });

  it('performs HTTP PATCH requests', function () {
    var promiseResult = null;
    var data = {};
    context.httpPatch(resource, data).then(function (result) {
      promiseResult = result;
    });
    $httpBackend.expectPATCH(resource.$uri, data,
          {'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/merge-patch+json'})
        .respond(204);
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.$syncTime / 100).toBeCloseTo(Date.now() / 100, 0);
  });

  it('performs HTTP DELETE requests', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    context.httpDelete(resource).then(function (result) {
      promiseResult = result;
    });
    $httpBackend.expectDELETE(resource.$uri).respond(204);
    $httpBackend.flush();
    expect(promiseResult).toBe(resource);
    expect(resource.$syncTime).toBeNull();
    expect(context.get(resource.$uri)).not.toBe(resource);
  });

  it('performs HTTP POST requests', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    var promise = context.httpPost(resource, 'Test', {'Accept': '*/*', 'Content-Type': 'text/plain'});
    promise.then(function (result) {
      promiseResult = result;
    });
    $httpBackend.expectPOST(resource.$uri, 'Test', {'Accept': '*/*', 'Content-Type': 'text/plain'}).respond(204);
    $httpBackend.flush();
    expect(promiseResult.status).toBe(204);
    expect(resource.$syncTime).toBe(1);
  });

  it('performs HTTP POST requests without headers', function () {
    var promiseResult = null;
    resource.$syncTime = 1;
    var promise = context.httpPost(resource, 'Test');
    promise.then(function (result) {
      promiseResult = result;
    });
    $httpBackend.expectPOST(resource.$uri, 'Test').respond(204);
    $httpBackend.flush();
    expect(promiseResult.status).toBe(204);
    expect(resource.$syncTime).toBe(1);
  });

  it('counts the number of busy requests', function () {
    expect(ResourceContext.busyRequests).toBe(0);
    context.httpPut(resource);
    expect(ResourceContext.busyRequests).toBe(1);
    context.httpPut(resource);
    expect(ResourceContext.busyRequests).toBe(2);
    $httpBackend.whenPUT(resource.$uri).respond(204);
    $httpBackend.flush();
    expect(ResourceContext.busyRequests).toBe(0);
  });

  it('gets synced resources on refresh and stale', function () {
    var ts = Date.now();
    resource.$syncTime = 1;
    var resource2 = context.get('http://example.com/other');
    $httpBackend.expectGET(resource.$uri, {'Accept': 'application/json'})
      .respond('{"name": "John"}', {'Content-Type': 'application/json'});
    context.refresh(ts);
    $httpBackend.flush();
    expect(resource.name).toBe('John');
    expect(resource2.$isSynced).toBe(false);
  });

  it('does not get synced resources on refresh', function () {
    resource.$syncTime = Date.now();
    context.refresh(1);
    // No outstanding requests
  });

});
