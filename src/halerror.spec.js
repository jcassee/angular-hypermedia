describe('HalError', function () {
  beforeEach(module('hypermedia'));

  var HalError;

  beforeEach(inject(function (_HalError_) {
    HalError = _HalError_;
  }));

  it('can be constructed with embedded errors', function () {
    var data = {
      'message': 'Validatie fout',
      '_links': {'profile': {'href': 'http://nocarrier.co.uk/profiles/vnd.error/'}},
      '_embedded': {
        'ilent:error': {
          'message': 'Invalide nummer',
          '_links': {'profile': {'href': 'http://nocarrier.co.uk/profiles/vnd.error/'}}
        }
      }
    };

    var error = new HalError(data);

    expect(error.message).toBe('Validatie fout');
    expect(error.errors.length).toBe(1);
  });
});
