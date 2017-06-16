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
    if (!window.SwellRT || !window.SwellRT.ready){
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
    try {
      window.SwellRT.closeModel(config.swellrt.waveId2);
    } catch (e){
      if (e!== 'INVALID_ID_EXCEPTION'){
        throw e;
      }
    }
    try {
      window.SwellRT.closeModel(config.swellrt.waveId);
    }
    catch (e){
      if (e!== 'INVALID_ID_EXCEPTION'){
        throw e;
      }
    }
    window.SwellRT.stopSession();
  });

  beforeEach(function(done){
    var session = window.SwellRT.startSession(config.swellrt.server, config.swellrt.user, config.swellrt.pass, done, function(err){
      if (err === 'ACCESS_FORBIDDEN_EXCEPTION'){
        // register test user if not registered yet
        window.SwellRT.createUser({ id: config.swellrt.user, password: config.swellrt.pass}, done);
      }
    });
  });


  it('can add and delete File objects in proxy object from SwellRT model',
  function(done) {

    function test(m) {
      var proxy = swellRT.proxy(model);

      var key = 'key10';


        var d = new Date(2013, 12, 5, 16, 23, 45, 600);
        var file = new File(['Rough Draft ....'], 'Draft1.txt', {type: 'text/plain', lastModified: d});

        model.createFile(file, function(file){

          setTimeout(function(){

            model.root.put(key,file);

            var url = file.url();
            $rootScope.$digest();
            $rootScope.$apply();

            expect(proxy[key]).toBeDefined();
            var resolvedUrl;
            proxy[key].getUrl().then(function(val){
              resolvedUrl = val;
            });
            $rootScope.$apply();

            expect(resolvedUrl).toEqual(url);
            model.root.remove(key);
            expect(proxy[key]).toBeUndefined();
            done();
          },500);
        });
    }
    window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(m);});
  }, 5000);

  it('can add and delete File objects in SwellRT model from proxy object',
  function(done) {

    function test(model) {
      var proxy = swellRT.proxy(model);
      $rootScope.$apply();

      var key = 'key11';

      setTimeout(function(){

          var d = new Date(2013, 12, 5, 16, 23, 45, 600);
          var file = new File(['Rough Draft ....'], 'Draft1.txt', {type: 'text/plain', lastModified: d});

          proxy[key] = new swellRT.FileObject(file);
          $rootScope.$apply();

          proxy[key].getUrl().then(
            function(){
              expect(model.root.get(key)).toBeDefined();
              model.root.remove(key);
              var m = model.root.get(key);
              expect(m).toBeUndefined();
              expect(proxy[key]).toBeUndefined();
              done();
            });


          setTimeout(function () {
            $rootScope.$apply();
          }, 300);

      },500);
    }

    window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(m);});
  }, 5000);
  it('can add and delete string value in SwellRT object from angular-swellRT proxy function',
     function(done) {

       function test(model) {
         var proxy = swellRT.proxy(model);
         $rootScope.$apply();

         var key = 'key';
         var value = 'stringValue';

         setTimeout(function(){
           proxy[key] = value;
           $rootScope.$apply();
           expect(model.root.get(key)).toBeDefined();
           expect(model.root.get(key).getValue()).toBe(value);
           delete proxy[key];
           $rootScope.$digest();
           expect(model.root.get(key)).toBeUndefined();
           done();
         },500);
       }
       window.SwellRT.openModel(config.swellrt.waveId2, function(m) {model = m; test(m);});
     }, 5000);

  it('can add and delete string value in SwellRT object from angular-swellRT proxy function',
     function(done) {

       function test(model) {
         var proxy = swellRT.proxy(model);

         var key = 'k';
         var value = 'stringValue';

         setTimeout(function(){
           var str = model.createString(value);
           model.root.put(key,str);
           $rootScope.$digest();
           expect(model.root.get(key)).toBeDefined();
           expect(model.root.get(key).getValue()).toBe(value);
           expect(proxy[key]).toBe(value);
           model.root.remove(key);
           $rootScope.$digest();
           expect(model.root.get(key)).toBeUndefined();
           expect(proxy[key]).toBeUndefined();
           done();
         },500);
       }
       window.SwellRT.openModel(config.swellrt.waveId2, function(m) {model = m; test(m);});
     }, 5000);

  it('can add and delete simple object in SwellRT object from angular-swellRT proxy function',
     function(done) {

       function test(model) {
         var proxy = swellRT.proxy(model);
         $rootScope.$apply();
         var key = 'key2';
         var value = 'stringValue';

         setTimeout(function(){
           proxy[key] = {value: value};
           $rootScope.$apply();
           expect(model.root.get(key)).toBeDefined();
           expect(model.root.get(key).get('value').getValue()).toBe(value);
           expect(model.root.get(key)).toBeDefined();
           delete proxy[key];
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m).toBeUndefined();
           done();
         },500);
       }
       window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(m);});
     }, 5000);

  it('can add and delete simple object in SwellRT proxy modifying SwellRT model',

     function(done) {

       function test(model) {
         var proxy = swellRT.proxy(model);

         var key = 'key2';
         var value = 'stringValue';

         setTimeout(function(){
           var key2 = 'k2';
           var value2 = 'v2';
           var map = model.createMap();
           model.root.put(key, map);
           var str = model.createString(value);
           model.root.get(key).put(key2, value2);
           $rootScope.$digest();
           expect(model.root.get(key)).toBeDefined();
           expect(model.root.get(key).get(key2).getValue()).toBe(value2);
           expect(proxy[key][key2]).toBe(value2);
           expect(model.root.get(key)).toBeDefined();
           model.root.remove(key);
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m).toBeUndefined();
           expect(proxy[key]).toBeUndefined();
           done();
         },500);
       }
       window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(m);});
     }, 5000);


  it('can add and delete simple list in SwellRT object from angular-swellRT proxy function',
     function(done) {

       function test(model) {
         var proxy = swellRT.proxy(model);
         $rootScope.$apply();

         var key = 'key3';
         var value = 'stringValue';

         setTimeout(function(){
           proxy[key] = [value];
           $rootScope.$digest();
           $rootScope.$apply();           expect(model.root.get(key)).toBeDefined();
           expect(model.root.get(key).get(0).getValue()).toBe(value);
           proxy[key].splice(0,1);
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m.size()).toBe(0);
           expect(model.root.get(key)).toBeDefined();
           delete proxy[key];
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m).toBeUndefined();
           done();
         },500);
       }
       window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(m);});
     }, 5000);

  it('can add and delete simple list in proxy object from SwellRT model',
     function(done) {

       function test(model) {
         var proxy = swellRT.proxy(model);

         var key = 'key6';
         var value = 'stringValue';

         setTimeout(function(){
           var l = model.createList();
           var str = model.createString(value);
           var str2 = model.createString(value);
           model.root.put(key,l);
           model.root.get(key).add(str);
           model.root.get(key).add(str2);
           $rootScope.$digest();
           model.root.get(key).remove(0);
           model.root.get(key).remove(0);
           $rootScope.$digest();
           console.log(proxy[key]);
           expect(proxy[key].length).toBe(0);
           model.root.remove(key);
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m).toBeUndefined();
           expect(proxy[key]).toBeUndefined();
           done();
         },500);
       }
       window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(m);});
     }, 5000);

  it('can add and delete list of objects in proxy object from SwellRT model',
     function(done) {

       function test(model) {
         var proxy = swellRT.proxy(model);

         var key = 'key8';
         var k1 = 'k1';
         var k2 = 'k2';
         var value = 'stringValue';

         setTimeout(function(){
           var l = model.createList();
           var str = model.createString(value);
           var str2 = model.createString(value);
           var mod = model.createMap();

           model.root.put(key,l);
           model.root.get(key).add(mod);
           model.root.get(key).get(0).put(k1, str);
           model.root.get(key).get(0).put(k1, str2);
           $rootScope.$digest();
           model.root.get(key).remove(0);
           $rootScope.$digest();
           expect(proxy[key].length).toBe(0);
           model.root.remove(key);
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m).toBeUndefined();
           expect(proxy[key]).toBeUndefined();
           done();
         },500);
       }
       window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(m);});
     }, 5000);

  it('can add and delete list of objects in proxy object from SwellRT model',
     function(done) {

       function test(model) {
         var proxy = swellRT.proxy(model);
         $rootScope.$apply();

         var key = 'key9';
         var value = 'stringValue';

         setTimeout(function(){
           proxy[key] = [{'k1': value, 'k2': value}];
           $rootScope.$digest();
           proxy[key].splice(0,1);
           $rootScope.$digest();
           expect(model.root.get(key).size()).toBe(0);
           model.root.remove(key);
           $rootScope.$digest();
           var m = model.root.get(key);
           expect(m).toBeUndefined();
           expect(proxy[key]).toBeUndefined();
           done();
         },500);
       }
       window.SwellRT.openModel(config.swellrt.waveId, function(m) {model = m; test(m);});
     }, 5000);


});
