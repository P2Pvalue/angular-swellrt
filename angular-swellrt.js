'use strict';

/**
 * @ngdoc function
 * @name SwellRTService.service:swellRT
 * @description
 * Interface service with SwellRT API
 */
angular.module('SwellRTService',[])
  .factory('swellRT', ['$rootScope', '$q', '$timeout', function($rootScope, $q, $timeout){

    function diff(a, b) {
      return a.filter(function(i) {return b.indexOf(i) < 0;});
    }

    //dummy TextType Object (used to create a real TextObject where it is attached)
    var TextObject = function(text){
      this.getType = function(){
        return 'TextType';
      };
      this.text = text;
    };
    // to handle unwatch and watch during model changed callbacks from SwellRT
    var unwatchMap = [];

    function proxy(model){
      var proxy = {};
      $timeout(function() {
        simplify(model.root, proxy, []);
        watchModel(model.root, proxy, [], model);
        registerEventHandlers(model.root, proxy, [], model);
      });
      return proxy;
    }

    // TODO 'Type' in *Type does not say anything
    function classSimpleName(o){
      return o.type();
    }

    // Creates and attach (if not attached) an object made from maps, arrays and strings
    function createAttachObject(obj, key, value, model) {

      // Create
      var o;
      try {
        o = obj.get(key);
      } catch (e) {
      }
      var isNew = !o;
      if (typeof value === 'string'){
        if (isNew){
          o = model.createString(value);
        } else {
          o.setValue(value);
        }
      } else if (value instanceof Array){
        if (isNew){
          o = model.createList();
        }
      } else if (value instanceof Object){
        if (isNew){
          // if it is a map
          if (typeof value.getType !== 'function'){
            o = model.createMap();
          }
          // if it is a TextObject
          else if (value.getType() === 'TextType'){
            o = model.createText(value.text);
          }
        }
      }
      // Attach
      var className = classSimpleName(obj);
      if (className === 'ListType'){
        try{
          obj.add(o);
        }
        // TODO check why catch and iff not necesary, delete
        catch (e){
        }
      } else if (className === 'MapType'){
        try{
          if(key !== '$$hashKey'){
            obj.put(key, o);
          }
        }
        // TODO check why catch and iff not necesary, delete
        catch (e){
        }
      }
      if (typeof value !== 'string'){
        angular.forEach(value, function(val, key){
          try{
            createAttachObject(o, key, val, model);
          }
          // TODO manage exception
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
    // TODO jsdoc & refactor {e,m,p}
    // TODO for performance & memory: create functions outside registerEventHandlers and refer functions
    function registerEventHandlers(e, m, p, model){

      depthFirstFunct(
        e, m, p,
        function(elem, mod, path){
          elem.registerEventHandler(
            SwellRT.events.ITEM_CHANGED,
            function(newStr) {
              try {
                setPathValue(mod,path,newStr);
              } catch (e) {
                console.log(e);
              }
              $timeout();
            },
            function(error) {
              // TODO, rise error. By exception?
              console.log(error);
            }
          );
        },
        function(elem, mod, path){
          elem.registerEventHandler(
            SwellRT.events.ITEM_ADDED,
            function(item) {
              var par = path.reduce(function(object,key){return object[key];},mod);
              // TODO check if change currentModel.model.root by elem works. Hypothesis: elem = ext

              var p = (path || []).slice();
              p.push('' + item[0]);
              // TODO check for possible failure due to paralel additions
              // if it is not a item I added
              try{
                // unwatch
                unwatchMap[path.join()][0]();

                simplify(item[1], mod, p);
                watchModel(item[1], mod, p, model);
                registerEventHandlers(item[1], mod, p, model);

                // watch
                var unwatch = unwatchMap[path.join()][1]();
                unwatchMap[path.join()][0] = unwatch;
                $timeout();
              } catch (e) {
                console.log(e);
              }
            });
          elem.registerEventHandler(
            SwellRT.events.ITEM_REMOVED,
            function(item) {
              var par = path.reduce(function(object, key){return object[key];}, mod);
              // unwatch
              unwatchMap[path.join()][0]();

              par.splice(item[0], 1);

              // watch
              var unwatch = unwatchMap[path.join()][1]();
              unwatchMap[path.join()][0] = unwatch;
              $timeout();
            },
            function(error) {
              console.log(error);
            });
        },
        function(elem, mod, path){
          elem.registerEventHandler(
            SwellRT.events.ITEM_ADDED,
            function(item) {
              var p = (path || []).slice();
              p.push(item[0]);
              try {

                // unwatch
                unwatchMap[path.join()][0]();

                simplify(item[1], mod, p);
                registerEventHandlers(item[1], mod, p, model);
                watchModel(item[1], mod, p, model);

                // watch
                var unwatch = unwatchMap[path.join()][1]();
                unwatchMap[path.join()][0] = unwatch;

                $timeout();
              }
              catch (e) {
                console.log(e);
              }
            },
            function(error) {
              console.log(error);
            });
          elem.registerEventHandler(
            SwellRT.events.ITEM_REMOVED,
            function(item) {
              var p = (path || []).slice();

              // unwatch
              unwatchMap[path.join()][0]();

              delete p.reduce(function(object, key){return object[key];}, mod)[item[0]];
              // watch
              var unwatch = unwatchMap[path.join()][1]();
              unwatchMap[path.join()][0] = unwatch;
              $timeout();
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

    function watchModel(e, m, p, model){
      depthFirstFunct(
        e, m, p,
        function(elem, mod, path){
          function watch(){
            var unwatch = $rootScope.$watch(
              function(){
                // TODO avoid path reduce
                try{
                  var r = path.reduce(function(object, key){return object[key];}, mod);
                  return r;
                } catch (e) {
                  if (e instanceof TypeError){
                    unwatch();
                    return null;
                  } else {
                    throw(e);
                  }
                }
              },
              function (newValue){
                if (newValue === null) {
                  return;
                }
                if (typeof newValue === 'string'){
                  elem.setValue(newValue);
                }
              }, true);
            return unwatch;
          }
          var unwatch = watch();
          unwatchMap[path.join()] = [unwatch, watch];
        },
        function(elem, mod, path){
          function watch() {
            var unwatch = $rootScope.$watchCollection(
              function(){
                // TODO avoid path.reduce
                try {
                  var r = path.reduce(function(object,key){return object[key];}, mod);
                  if (r === undefined) {
                    unwatch();
                    return null;
                  }
                  return r;
                } catch (e){
                  if (e instanceof TypeError){
                    unwatch();
                    return null;
                  } else {
                    throw(e);
                  }
                }
              },
              function(newValue, oldValue){
                if (newValue === null) {
                  return;
                }

                var newVals = diff(Object.keys(newValue), Object.keys(oldValue));
                angular.forEach(newVals, function(value){
                  createAttachObject(elem, value.toString(), newValue[value], model);
                });
                var deletedVars = diff(Object.keys(oldValue), Object.keys(newValue));
                // added again to be erased in the ITEM_REMOVED SwellRT callback
                angular.forEach(deletedVars, function(value){
                  createAttachObject(elem, value.toString(), oldValue[value], model);
                });

                angular.forEach(deletedVars.reverse(), function(value){
                  elem.remove(value);
                });
              });
            return unwatch;
          }
          var unwatch = watch();
          unwatchMap[path.join()] = [unwatch, watch];
        },
        function(elem, mod, path){
          function watch() {
            var unwatch = $rootScope.$watchCollection(
              function(){
                try {
                  // TODO avoid path.reduce
                  var r = path.reduce(function(object,key){return object[key];} , mod);
                  if (r === undefined) {
                    unwatch();
                    return null;
                  }
                  return r;
                } catch (e){
                  if (e instanceof TypeError){
                    unwatch();
                    return null;
                  } else {
                    throw(e);
                  }
                }
              },
              function(newValue, oldValue){
                if (newValue === null) {
                  return;
                }
                // AngularJS introduce $$haskKey property to some objects
                var oldKeys = Object.keys(oldValue);
                oldKeys.push('$$hashKey');
                var newVals = diff(Object.keys(newValue),oldKeys);
                angular.forEach(newVals, function(value){
                  createAttachObject(elem , value, newValue[value], model);
                });
                var deletedVars = diff(Object.keys(oldValue), Object.keys(newValue));
                angular.forEach(deletedVars, function(value){
                  elem.remove(value);
                });
              });
            return unwatch;
          }
          var unwatch = watch();
          unwatchMap[path.join()] = [unwatch, watch];
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
    return {
      proxy: proxy,
      TextObject: TextObject
    };


  }])
  .directive('swellrtEditor', function() {
    var editorCount = 0;
    function link(scope, element, attrs, ngModelCtrl) {
      var editor;
      var id = element.attr('id');
      if (!id){
        id = 'swellrt-editor-' + editorCount;
        editorCount ++;
        element.attr('id', id);
      }

      ngModelCtrl.$formatters.unshift(function (modelValue) {
        if (modelValue){
          editor = SwellRT.editor(id);
          editor.cleanUp();
          editor.edit(modelValue);
          var ph = $('#' + id).attr('placeholder');
          var model = $('#' + id).attr('ng-model');
          if(ph){

            //
            var style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = ".swellrt-placeholder:empty:not(:focus):before { \
              content: attr(placeholder) \
              }";
            document.getElementsByTagName("head")[0].appendChild( style );

            var editorDivs = $('#' + id + '>div >ul >div');
            editorDivs
              .addClass('swellrt-placeholder')
              .attr('tabindex', '-1')
              .attr('placeholder', ph);
            if (editorDivs.length === 1 && editorDivs.html() === '<br>'){
              editorDivs.empty();
            }
            $('#' + id + '>div')
              .attr('tabindex', '-1')
              .focus(
              function(){
                editorDivs.removeClass('swellrt-placeholder');
              }).blur(
                function(){
                  if (editorDivs.length === 1 && editorDivs.html() === '<br>'){
                  editorDivs.addClass('swellrt-placeholder');
                    editorDivs.empty();
                  }
                });
          }
        }
      });

      element.on('$destroy', function(){
        if (editor){
          editor.cleanUp();
        }
      })
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
