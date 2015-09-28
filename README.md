# angular-hypermedia — Hypermedia REST API client for AngularJS applications

A hypermedia client for AngularJS applications. Supports the HTTP Link header,
URIs in JSON properties and [HAL](http://tools.ietf.org/html/draft-kelly-json-hal).

Usage documentation of the module is currently scarce, but the source is
documented and tested and should be easy to follow. Improving the docs is on
the roadmap.


## Example usage

### Getting resources

    var context, user;
    
    context = new ResourceContext();
    user = context.get('http://example.com/john');
    
    user.$get().then(function () {
      console.log(user.name);
    });


### Putting resources

    var context, user;
    
    context = new ResourceContext(HalResource);
    user = context.get('http://example.com/john');
    
    user.$get().then(function () {
      user.name = 'Jane';
      return user.$put();
    }).then(function () {
      console.log(user.name);
    });

Note that this library uses the common idiom of putting the resource state as
`application/json` instead of the full HAL representation including links.


### Following relations

    var context, user, car;
    
    context = new ResourceContext(HalResource);
    user = context.get('http://example.com/john');
    
    user.$get().then(function () {
      car = user.$linkRel('car');
      return car.$get();
    }).then(function () {
      console.log(user.name);
      console.log(car.brand);
    });


### Loading resources

By using `$load` instead of `$get` a GET request will only be issued if the
resource was not already synchronized with the server. This is useful for
avoiding unnecessary GET requests for embedded resources.

In this example, if the user resource embeds the car resource, that resource
will be extracted and added to the context. No GET request will be issued to
load the car resource.

    var context, user, car;
    
    context = new ResourceContext(HalResource);
    user = context.get('http://example.com/john');
    
    user.$load().then(function () {
      car = user.$linkRel('car');
      return car.$load();
    }).then(function () {
      console.log(user.name);
      console.log(car.brand);
    });


### Applying profiles

    var context, user;
    
    Resource.registerProfile('http://example.com/profiles/user', {
      fullName: {get: function () {
        return this.firstName + ' ' + this.lastName;
      })
    });

    context = new ResourceContext(HalResource);
    user = context.get('http://example.com/john');
    user.$profile = 'http://example.com/profiles/user';
    
    user.firstName = 'John';
    user.lastName = 'Snow';
    console.log(user.fullName);

If the representation received from a GET request contains a profile link, it is
applied automatically.
