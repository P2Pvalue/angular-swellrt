'use strict';

/**
 * @ngdoc function
 * @name SwellRTService.service:swellRT
 * @description
 * Interface service with SwellRT API
 */
angular.module('SwellRTService',[])
  .factory('swellRT', ['$rootScope', '$q', function($rootScope, $q){

    function diff(a, b) {
      return a.filter(function(i) {return b.indexOf(i) < 0;});
    }

    var defSwellRT = $q.defer();
    var swellrt = defSwellRT.promise;
    var defSession = $q.defer();
    var session = defSession.promise;
    var currentWaveId = null;
    var currentModel = {model: {}};
    var loginData;
    var defModel = $q.defer();

    window.onSwellRTReady = function() {
      defSwellRT.resolve(window.SwellRT);
    };

    if (window.SwellRT){
      defSwellRT.resolve(window.SwellRT);
    }

    function getModel(){
      return defModel.promise;
    }

    var ret = {
      startSession: startSession,
      stopSession: stopSession,
      open: openModel,
      close: closeModel,
      create: create,
      copy: {},
      model: getModel
    };

    var apply = function (fun) {
      var p = $rootScope.$$phase;
      if (p !== '$digest' && p !== '$apply') {
        $rootScope.$apply(fun);
      }
    };

    //dummy TextType Object (used to create a real TextObject where it is attached)
    ret.SwellrtTextObject = function(text){
      this.getType = function(){
        return 'TextType';
      };
      this.text = text;
    };

    function startSession(server, user, pass){
       swellrt.then(function() {
         window.SwellRT.startSession(
         server, user, pass,
         function () {
           apply(function() {
             defSession.resolve(window.SwellRT);
           });
         },
         function () {
           defSession.reject('Error conecting to wavejs server: Try again later');
         });
       });
    }

    function stopSession(server, user, pass){
       swellrt.then(function() {
         window.SwellRT.stopSession();
       });
    }

    function openModel(waveId){
      var deferred = $q.defer();
      defModel.notify('Opening ' + waveId + ' model.');
      session.then(function(api) {
        api
          .openModel(waveId,
                     function (model) {
                       apply(function() {
                         currentWaveId = waveId;
                         currentModel.model = model;
                         simplify(model.root, ret.copy, []);
                         registerEventHandlers(model.root, ret.copy, []);
                         watchModel(model.root, ret.copy, []);
                         deferred.resolve(model);
                         defModel.resolve(ret.copy);
                       });
                     },
                     function(error){
                       console.log(error);
                       apply(function() {
                         deferred.reject(error);
                         defModel.reject(error);
                         currentWaveId = null;
                         currentModel = {};
                       });
                     }
                    );
      });
      return deferred.promise;
    }

    function closeModel(waveId){
      session.then(function(api) {
        api.closeModel(waveId);
        currentWaveId = null;
      });
    }

    function create(){
      session.then(function(api) {
        var deferred = $q.defer();
        api.createModel(
          function(modelId) {
            apply(function() {
              deferred.resolve(modelId);
            });
            currentWaveId = modelId;
          },
          function(error) {
            apply(function() {
              deferred.reject(error);
              });
          });
        return deferred.promise;
      });
    }

    function classSimpleName(o){
      if (typeof o.keySet === 'function'){
        return 'MapType';
      }
      if (typeof o.size === 'function'){
        return 'ListType';
      }
      if (typeof o.getValue === 'function'){
        return 'StringType';
      }
      if (typeof o.getDelegate === 'function'){
        return 'TextType';
      }
      return 'unknown';
    }

    // Creates and attach (if not attached) an object made from maps, arrays and strings
    function createAttachObject(obj, key, value) {

      // Create
      var o;
      try {
        o = obj.get(key);
      } catch (e) {
      }
      var isNew = !o;
      if (typeof value === 'string'){
        if (isNew){
          o = currentModel.model.createString(value);
        } else {
          o.setValue(value);
        }
      } else if (value instanceof Array){
        if (isNew){
          o = currentModel.model.createList();
        }
      } else if (value instanceof Object){
        if (isNew){
          if (typeof value.getType !== 'function'){
            o = currentModel.model.createMap();
          } else if (value.getType() === 'TextType'){
            o = currentModel.model.createText(value.text);
          }
        }
      }
      // Attach
      var className = classSimpleName(obj);
      if (className === 'ListType'){
        try{
          obj.add(o);
          }
        catch (e){
        }
      } else if (className === 'MapType'){
        try{
          obj.put(key, o);
        }
        catch (e){
        }
      }
      if (typeof value !== 'string'){
        angular.forEach(value, function(val, key){
          try{
            createAttachObject(o, key, val);
            }
          catch (e) {
            console.log(e);
          }
        });
      }
    }

    function setPathValue(obj, path, value){
      return path.reduce(
        function(object,key){
          return function(v){
            if (v) {
              object()[key] = v;
            }
            return object()[key];
          };
        },
        function(){
          return obj;
        })(value);
    }

    /**

     */
    function registerEventHandlers(e, m, p){

      depthFirstFunct(
        e, m, p,
        function(elem, mod, path){
        elem.registerEventHandler(
          SwellRT.events.ITEM_CHANGED,
          function(newStr) {
            setPathValue(mod,path,newStr);
            apply();
          },
          function(error) {
            console.log(error);
          }
        );
      },
        function(elem, mod, path){
          elem.registerEventHandler(
            SwellRT.events.ITEM_ADDED,
            function(item) {
              var par = path.reduce(function(object,key){return object[key];},mod);
              // TODO check if change currentModel.model.root by elem works
              var ext = path.reduce(function(object,key){return object.get(key);},currentModel.model.root);
              //var p = path.concat([par.length]);
              var p = (path || []).slice();
              p.push('' + (par.length || '0'));
              // TODO check for possible failure due to paralel additions
              // if it is not a item I added
              if (ext.size() > par.length){
                try{
                  simplify(item, mod, p);
                  registerEventHandlers(item, mod, p);
                  watchModel(item, mod, p);
                } catch (e) {
                  console.log(e);
                }
              }
              apply();
            });
          //TODO: check why is not needed!
          // elem.registerEventHandler(SwellRT.events.ITEM_REMOVED,
          //                        function(item) {
          // function copy(v1){
          //   className = classSimpleName(v1);
          //   var r;
          //   if (className === 'StringType'){
          //     r = v1.getValue();
          //   }
          //   if (className === 'ListType'){
          //     r = [];
          //     for (var i = 0; i < v1.size(); i++){
          //       r.push(copy(v1.get(i)));
          //     }
          //   }
          //   if (className === 'MapType'){
          //     r = {};
          //     angular.forEach(v1.keySet(), function(value, key){
          //       r[value] = copy(v1.get(value));
          //     });
          //   }
          //   return r;
          // }
          // var cp = copy(foo);
          // var par = path.reduce(function(object, key){return object[key]}, mod);
          // // TODO if cp in par, delete it
          // //
          // apply();
          // },
          // function(error) {
          //   console.log(error);
          // });
        },
        function(elem, mod, path){
          elem.registerEventHandler(
            SwellRT.events.ITEM_ADDED,
            function(item) {
              var p = (path || []).slice();
              p.push(item[0]);
              try {
                simplify(item[1], mod, p);
                registerEventHandlers(item[1], mod, p);
                watchModel(item[1], mod, p);
              }
              catch (e) {
                console.log(e);
              }
              apply();
            },
            function(error) {
              console.log(error);
            });
          elem.registerEventHandler(
            SwellRT.events.ITEM_REMOVED,
            function(item) {
              var p = (path || []).slice();
              delete p.reduce(function(object, key){return object[key];}, mod)[item[0]];
              apply();
            },
            function(error) {
              console.log(error);
            });
        }
      );
    }

    // visits all nodes of the model and depending on the type (string, list, map or text)
    // call a function of the params
    function depthFirstFunct(e, mod, path, funStr, funList, funMap, funText){
      var className = classSimpleName(e);
      switch (className) {

        case 'StringType':

          funStr(e, mod, path);

          break;

        case 'MapType':

          var keys = e.keySet();
          funMap(e, mod, path);
          angular.forEach(keys,function(value){
            var el = e.get(value);
            var p = (path || []).slice();
            p.push(value);
            depthFirstFunct(el, mod, p, funStr, funList, funMap, funText);
          });

          break;

        case 'ListType':

          funList(e, mod, path);
          var keyNum = e.size();
          for(var i = 0; i < keyNum; i++){
            var p = (path || []).slice();
            p.push('' + i);
            depthFirstFunct(e.get(i), mod, p, funStr, funList, funMap, funText);
          }

          break;

        case 'TextType':

        if (typeof funText === 'function'){
           funText(e, mod, path);
          }
          break;
      }
    }

    function watchModel(e, m, p){
      depthFirstFunct(
        e, m, p,
        function(elem, mod, path){
          $rootScope.$watch(
            function(){
              var r = path.reduce(function(object, key){return object[key];}, mod);
              return r;
            },
            function (newValue){
              if (typeof newValue === 'string'){
                // TODO check if change currentModel.model.root by e works
                path.reduce(function(object,key){return object.get(key);}, currentModel.model.root).setValue(newValue);
              }
            },
            true);
        },
        function(elem, mod, path){
          $rootScope.$watchCollection(
             function(){
               var r = path.reduce(function(object,key){return object[key];}, mod);
               return r;
             },
             function(newValue, oldValue){
               var newVals = diff(Object.keys(newValue), Object.keys(oldValue));
               angular.forEach(newVals, function(value){
                 // TODO check if change currentModel.model.root by e works
                 var m = path.reduce(function(object,k){return object.get(k);}, currentModel.model.root);
                 createAttachObject(m, ''+value, newValue[value]);
                 apply();
               });
               var deletedVars = diff(Object.keys(oldValue), Object.keys(newValue));
               angular.forEach(deletedVars, function(value){
                 elem.remove(value);
                 apply();
               });
           });
        },
        function(elem, mod, path){
          $rootScope.$watchCollection(
            function(){
              var r = path.reduce(function(object,key){return object[key];} , mod);
              return r;
            },
            function(newValue, oldValue){
              // AngularJS introduce $$haskKey property to some objects
              var oldKeys = Object.keys(oldValue);
              oldKeys.push('$$hashKey');
              var newVals = diff(Object.keys(newValue),oldKeys);
              angular.forEach(newVals, function(value){
                // TODO check if change currentModel.model.root by elem works
                var m = path.reduce(function(object,k){return object.get(k);}, currentModel.model.root);
                createAttachObject(m, value, newValue[value]);
                apply();
              });
              var deletedVars = diff(Object.keys(oldValue), Object.keys(newValue));
              angular.forEach(deletedVars, function(value){
                elem.remove(value);
                apply();
              });
          });
        }
      );
    }

    function simplify(e, m, p){
      depthFirstFunct(
        e, m, p,
        function (elem, mod, path) {
          setPathValue(mod, path, elem.getValue());
        },
        function(elem, mod, path) {
          // TODO: only if not exists
          setPathValue(mod, path, []);
        },
        function(elem, mod, path) {
          // TODO: only if not exists
          setPathValue(mod, path, {});
        },
        function(elem, mod, path) {
          setPathValue(mod, path, elem);
        }
      );
    }
    return ret;
  }])
  .directive('swellrtEditor', function() {

    function link(scope, element, attrs, ngModelCtrl) {
      if (!element.attr('id')){
        var id = Math.random().toString(36).substr(2, 5);
        element.attr('id', id);
      }

      ngModelCtrl.$formatters.unshift(function (modelValue) {
        if (modelValue){
          var editor = window.SwellRT.editor(id);
          editor.edit(modelValue);
        }
      });
    }

    return {
      restrict: 'AEC',
      require: 'ngModel',
      link: link,
      scope: {
          ngModel : '='
        }
    };
  });
