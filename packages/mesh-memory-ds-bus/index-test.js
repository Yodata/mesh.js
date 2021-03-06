var dsTestCases = require('mesh-ds-bus-test-cases');
var MemoryDsBus = require('./index');
var co          = require('co');
var expect      = require('expect.js');

describe(__filename + "#", function() {

  dsTestCases.create(MemoryDsBus.create.bind(MemoryDsBus), {
    hasCollections: true
  }).forEach(function(tc) {
      it(tc.description, tc.run);
  });

  it('throws a descriptive error message if data doesn\'t exist on insert', co.wrap(function*() {
    var err;

    try {
      yield MemoryDsBus.create().execute({ type: 'dsInsert', collectionName: 'abba' });
    } catch(e) {
      err = e;
    }

    expect(err.message).to.contain('data must exist');
  }));

  it('can serialize the in-memory database', co.wrap(function*() {
    var bus = MemoryDsBus.create();
    yield bus.execute({ type: 'dsInsert', data: 'a', collectionName: 'as' });
    yield bus.execute({ type: 'dsInsert', data: 'b', collectionName: 'bs' });
    var json = bus.toJSON();
    expect(json.bs.length).to.be(1);
    expect(json.as.length).to.be(1);
    expect(json.as[0].data).to.be('a');
    expect(json.bs[0].data).to.be('b');
  }));

  it('can deserialize from a source', co.wrap(function*() {

    var bus = MemoryDsBus.create();
    yield bus.execute({ type: 'dsInsert', data: 'a', collectionName: 'as' });
    yield bus.execute({ type: 'dsInsert', data: 'b', collectionName: 'bs' });

    var bus2 = MemoryDsBus.create({
      source: bus.toJSON()
    });

    var json = bus2.toJSON();
    expect(json.bs.length).to.be(1);
    expect(json.as.length).to.be(1);
    expect(json.as[0].data).to.be('a');
    expect(json.bs[0].data).to.be('b');

  }));
});
