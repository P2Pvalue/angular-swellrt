'use strict';

var swellReady = false;

describe( 'swellRT', function(){
  var swellRT,
      $timeout,
      $q,
      $rootScope,
      waveId,
      model;

  beforeEach(function(done){
    module('SwellRTService');
    if (!window.SwellRT){
      window.onSwellRTReady = function() {
        done();
      };
    }
    else {
      done();
    }
  });

  beforeEach(inject(function(_swellRT_,_$rootScope_, _$q_, _$timeout_) {
    $timeout = _$timeout_;
    $rootScope= _$rootScope_;
    $q = _$q_;
    swellRT = _swellRT_;
  }));

  afterEach(function(){
    window.SwellRT.closeModel(config.swellrt.waveId);
    window.SwellRT.stopSession();
  });

  beforeEach(function(done){
    var session = window.SwellRT.startSession(config.swellrt.server, config.swellrt.user, config.swellrt.pass, done);
  });

  it('can add and delete string value in SwellRT object from angular-swellRT proxy function',
     function(done) {

       function test() {
         var proxy = swellRT.proxy(model);

         var key = 'key';
         var value = 'stringValue';

         setTimeout(function(){
           $timeout.flush();
         },1000);

         setTimeout(function(){
           proxy[key] = value;
           $rootScope.$digest();
           expect(model.root.get(key)).toBeDefined();
           expect(model.root.get(key).getValue()).toBe(value);
         },1500);

         setTimeout(function(){
           expect(model.root.get(key)).toBeDefined();
           delete proxy[key];
           $rootScope.$digest();
           expect(model.root.get(key)).toBeUndefined();
           done();
         },2000);

       }
       window.SwellRT.openModel(config.swellrt.waveId2, function(m) {model = m; test(done);});
     }, 20000);

  it('can add and delete simple object in SwellRT object from angular-swellRT proxy function',
     function(done) {

       function test() {
         var proxy = swellRT.proxy(model);

         var key = 'key2';
         var value = 'stringValue';


         setTimeout(function(){
           $timeout.flush();
         },1000);


         setTimeout(function(){
           proxy[key] = {value: value};
           $rootScope.$digest();
           expect(model.root.get(key)).toBeDefined();
           expect(model.root.get(key).get('value').getValue()).toBe(value);
         },1500);

         setTimeout(function(){
           expect(model.root.get(key)).toBeDefined();
           delete proxy[key];
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m).toBeUndefined();
           done();
         },2000);
       }
       window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(done);});
     }, 5000);

  it('can add and delete simple list in SwellRT object from angular-swellRT proxy function',
     function(done) {

       function test() {
         var proxy = swellRT.proxy(model);

         var key = 'key3';
         var value = 'stringValue';


         setTimeout(function(){
           $timeout.flush();
         },1000);


         setTimeout(function(){
           proxy[key] = [value];
           $rootScope.$digest();
           expect(model.root.get(key)).toBeDefined();
           expect(model.root.get(key).get(0).getValue()).toBe(value);
         },1500);

         setTimeout(function(){
           expect(model.root.get(key)).toBeDefined();
           proxy[key].splice(0,1);
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m.size()).toBe(0);
           done();
         },2000);

         setTimeout(function(){
           expect(model.root.get(key)).toBeDefined();
           delete proxy[key];
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m).toBeUndefined();
           done();
         },2500);
       }
       window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(done);});
     }, 5000);


});
