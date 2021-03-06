'use strict';

/**
 * @ngdoc function
 * @name SwellRTService.service:swellRT
 * @description
 * Interface service with SwellRT API
 */
angular.module('SwellRTService',[])
  .factory('swellRT', ['$rootScope', '$q', '$timeout', '$browser', function($rootScope, $q, $timeout, $browser){

    function diff(a, b) {
      return a.filter(function(i) {return b.indexOf(i) < 0;});
    }

    //dummy TextType Object (used to create a real TextObject where it is attached)
    class TextObject {
      constructor (text){
        this.text = text;
      }

      type() {
        return 'TextType';
      }
    }

    this.TextObject = TextObject;

    class FileObject {
      constructor (file){
        this.file = file;
        this._fileDef = $q.defer();
        this.swellRTFile = this._fileDef.promise;
        this._url = undefined;
      }

      type (){
        return 'FileType';
      }

      setValue (newValue){
          this._fileDef.resolve(newValue);
          this._url = newValue.getUrl();
          $timeout();
      }

      getValue(){
        return this.swellRTFile;
      }

      // returns a promise
      getUrl (){
        this._urlDef = $q.defer();
        this.swellRTFile.then((f) => {
          this._urlDef.resolve(f.getUrl());
          $timeout();
        });
        return this._urlDef.promise;
      }

      get url(){
        return this._url;
      }
    }

    this.FileObject = FileObject;

    // to handle unwatch and watch during model changed callbacks from SwellRT
    var unwatchMap = [];

    function addParticipantsObservableList(model, proxy){

      var unwatch;
      proxy._participants = model.getParticipants();

      model.registerEventHandler(SwellRT.events.PARTICIPANT_ADDED,
        function(participant){
          proxy._participants.push(participant);
          $timeout();
        });

      model.registerEventHandler(SwellRT.events.PARTICIPANT_REMOVED,
        function(participant){
          proxy._participants.splice(proxy._participants.indexOf(participant), 1);
          $timeout();
        });

      function watch() {
        unwatch = $rootScope.$watchCollection(function(){
          return proxy._participants;
        },
          function(newValues, oldValues) {
            if (oldValues === undefined){
              return;
            }

            newValues = newValues || [];
            oldValues = oldValues || [];
            var addedVals = diff(newValues, oldValues);
            var deletedVals = diff(oldValues, newValues);

            if (addedVals.length === 0 && deletedVals.length === 0){
              return;
            }

            unwatch();
            proxy._participants = model.getParticipants();
            watch();

            angular.forEach(addedVals, function(value){
              model.addParticipant(value);
            });

            angular.forEach(deletedVals, function(value){
              model.removeParticipant(value);
            });
          }
        );
      }

      watch();
    }

    var reservedRootKeys = [
      '_id',
      '_participants'
    ];

    function proxy(model, ProxyClass) {
      var proxyObj;
      if (ProxyClass){
        proxyObj = new ProxyClass();
      } else {
        proxyObj = {};
      }

      proxyObj._id = model.id();

      simplify(model.root, proxyObj, []);
      watchModel(model.root, proxyObj, [], model);
      registerEventHandlers(model.root, proxyObj, [], model);

      addParticipantsObservableList(model, proxyObj);

      $rootScope.$digest();

      return proxyObj;
    }

    // TODO 'Type' in *Type does not say anything
    function classSimpleName(o){
      return o.type();
    }

    // Attaches the object <o> to <obj> at key <key>
    function attach(obj, o, key) {
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
        // if it is a map
        if (isNew && typeof value.type !== 'function'){
          o = model.createMap();
        }
        // if it is a new TextObject
        else if ( isNew && value.type() === 'TextType'){
          o = model.createText(value.text);
        }
        // if it is a FileObject
        else if (typeof value.type === 'function' && value.type() === 'FileType'){
          model.createFile(value.file, function(response){
            if (response.error) {
              // The file couldn't be uploaded
              console.log(response.error);
            } else {
              if (isNew){
                value.setValue(response);
                attach(obj, response, key);
                $timeout();
              } else {
                o.setValue(response);
                $timeout();
              }
            }
          });
        }
      }

      if (o){
        attach(obj, o, key);
        if (typeof value !== 'string' && !(typeof value.type === 'function' && value.type() !== 'FileType') )
         {
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


    }

    function setPathValue(obj, path, value){
      return path.reduce(
        function(object,key){
          return function(v){
            if (v !== undefined) {
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
                setPathValue(mod, path, newStr);
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

              //unwatch erased element
              unwatchMap[path.concat(item[0]).join()][0]();

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

              //unwatch erased element
              unwatchMap[path.concat(item[0]).join()][0]();

              delete p.reduce(function(object, key){return object[key];}, mod)[item[0]];
              // watch
              var unwatch = unwatchMap[path.join()][1]();
              unwatchMap[path.join()][0] = unwatch;
              $timeout();
            },
            function(error) {
              console.log(error);
            });
        },
        // TextType
         undefined,
        // FileType
        function(elem, mod, path){
          elem.registerEventHandler(
            SwellRT.events.ITEM_CHANGED,
            function(newValue) {
              var r = path.reduce(function(object, key){return object[key];}, mod);
              try {
                r.setValue(newValue);
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
        }
      );
    }

    // visits all nodes of the model and depending on the type (string, list, map or text)
    // call a function of the params
    function depthFirstFunct(e, mod, path, funStr, funList, funMap, funText, funFile){
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
            depthFirstFunct(el, mod, p, funStr, funList, funMap, funText, funFile);
          });

          break;

        case 'ListType':

          funList(e, mod, path);
          var keyNum = e.size();
          for(var i = 0; i < keyNum; i++){
            var p = (path || []).slice();
            p.push('' + i);
            depthFirstFunct(e.get(i), mod, p, funStr, funList, funMap, funText, funFile);
          }

          break;

        case 'TextType':

          if (typeof funText === 'function'){
            funText(e, mod, path);
          }
          break;

        case 'FileType':
          if (typeof funFile === 'function'){
            funFile(e, mod, path);
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
                } else if (typeof newValue === 'undefined'){

                  var parent =
                        path.slice(0, path.length -1).reduce(
                          function(object, key){
                            return object[key];
                          }, mod);

                  // if the value has been deleted
                  if (Object.keys(parent).indexOf(path[path.lenght -1]) === -1){
                    unwatch();
                  } else {
                    console.log(
                      'WARNING: trying to set a string value to undefined:',
                      ' operation not supported, at path: ', path.join('.'));
                  }
                }
              }, true);
            return unwatch;
          }
          var unwatch = watch();
          unwatchMap[path.join()] = [unwatch, watch];
        },
        function(elem, mod, path){
          function watch() {
            // unwatch (needed for resynch SwellRT object after reconnection)
            if (unwatchMap[path.join()]){
              unwatchMap[path.join()][0]();
            }

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
            // unwatch (needed for resynch SwellRT object after reconnection)
            if (unwatchMap[path.join()]) {
              unwatchMap[path.join()][0]();
            }
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

                // ignore root reserved keys
                if (path.join()===''){
                  oldKeys.push(...reservedRootKeys);
                }

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
        },
        undefined,
        function(elem, mod, path){
          function watch(){
            var unwatch = $rootScope.$watch(
              function(){
                try{
                  var r = path.reduce(function(object, key){return object[key];}, mod);

                  if (r instanceof Object) {
                    return r.file || r.url;
                  }
                  return undefined;
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
                if (newValue === undefined){
                   elem.clearValue();
                } else {
                  var r = path.reduce(function(object, key){return object[key];}, mod);
                  if (r.file !== undefined) {
                    model.createFile(r.file, function(newFile){
                      elem.setValue(newFile);
                      r.setValue(newFile);
                      $timeout();
                    });
                  }
                }
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
        },
        function(elem, mod, path) {
          var f = new FileObject();
          f.setValue(elem);

          setPathValue(mod, path, f);
        }
      );
    }

    /*
     * SwellRT API
     */

    function startSession (server, user, password, onSuccess, onError) {
      $browser.$$incOutstandingRequestCount();

      SwellRT.startSession(server, user, password,
        (session) => {

          $browser.$$completeOutstandingRequest(onSuccess, session);
        },
        (error) => {

          $browser.$$completeOutstandingRequest(onError, error);
        });
    }

    function resumeSession (onSuccess, onError) {

      $browser.$$incOutstandingRequestCount();

      SwellRT.resumeSession(
        (res) => {

          $browser.$$completeOutstandingRequest(onSuccess, res);
        },
        (error) => {

          $browser.$$completeOutstandingRequest(onError, error);
      });
    }

    function recoverPassword (email, recoverUrl, onSuccess, onError) {

      $browser.$$incOutstandingRequestCount();

      SwellRT.recoverPassword(email, recoverUrl,
        (success) => {

          $browser.$$completeOutstandingRequest(onSuccess, success);
        },
        (error) => {

          $browser.$$completeOutstandingRequest(onError, error);
        });
    }

    function setPassword(id, tokenOrPassword, password, onSuccess, onError) {

      $browser.$$incOutstandingRequestCount();

      SwellRT.setPassword(id, tokenOrPassword, password,
        (success) => {

          $browser.$$completeOutstandingRequest(onSuccess, success);
        },
        (error) => {

          $browser.$$completeOutstandingRequest(onError, error);
        });
    }

    function createUser (data, cb) {
      $browser.$$incOutstandingRequestCount();

      SwellRT.createUser(data, (res) => {

        $browser.$$completeOutstandingRequest(cb, res);
      });
    }

    function getUserProfile (data, cb) {

      $browser.$$incOutstandingRequestCount();

      SwellRT.getUserProfile(data, (res) => {

        $browser.$$completeOutstandingRequest(cb, res);
      });
    }

    function updateUserProfile (data, cb) {

      $browser.$$incOutstandingRequestCount();

      SwellRT.updateUserProfile(data, (res) => {

        $browser.$$completeOutstandingRequest(cb, res);
      });
    }

    function createModel (onReady) {

      $browser.$$incOutstandingRequestCount();

       SwellRT.createModel((dataModel) => {

        $browser.$$completeOutstandingRequest(onReady, dataModel);
      });
    }

    function openModel (dataModelId, onReady) {

      $browser.$$incOutstandingRequestCount();

       SwellRT.openModel(dataModelId, (dataModel) => {

        $browser.$$completeOutstandingRequest(onReady, dataModel);
      });
    }

    function query (expresion, onSuccess, onFailure) {

      $browser.$$incOutstandingRequestCount();

      SwellRT.query(expresion,
        (result) => {

          $browser.$$completeOutstandingRequest(onSuccess, result);
        },
        (error) => {

          $browser.$$completeOutstandingRequest(onFailure, error);
        });
    }

    function invite (emails, url, name, onSuccess, onFailure) {

      $browser.$$incOutstandingRequestCount();

      SwellRT.invite(emails, url, name,
        (result) => {

          $browser.$$completeOutstandingRequest(onSuccess, result);
        },
        (error) => {

          $browser.$$completeOutstandingRequest(onFailure, error);
        });
    }

    function join (emailOrUser, waveUrl, waveTitle, text, user, onSuccess, onFailure) {

      $browser.$$incOutstandingRequestCount();

      SwellRT.join(emailOrUser, waveUrl, waveTitle, text, user,
        (result) => {

          $browser.$$completeOutstandingRequest(onSuccess, result);
        },
        (error) => {

          $browser.$$completeOutstandingRequest(onFailure, error);
        });
    }

    return {
      proxy: proxy,
      TextObject: TextObject,
      FileObject: FileObject,
      startSession,
      resumeSession,
      recoverPassword,
      setPassword,
      createUser,
      getUserProfile,
      updateUserProfile,
      createModel,
      openModel,
      query,
      invite,
      join
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

          if (!editor){
            editor = SwellRT.editor(id, scope.widgets || {}, scope.annotations || {});
          }

          editor.cleanUp();

          if (scope.onCreate()) {
            scope.onCreate()(editor);
          }

          editor.edit(modelValue);

          var blockEditor = function(isBlocked){

            var editable;

            if (isBlocked === 'false'){
              editable = true;
            } else if (isBlocked === 'true'){
              editable = false;
            }

            if (typeof editable !== 'undefined'){
              editor.setEditing(editable);
            }

          };

          if (attrs.blockEdit){
            blockEditor(attrs.blockEdit);
          }

          attrs.$observe('blockEdit', blockEditor);

          var ph = attrs.placeholder;
          if(ph){

            //
            var style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = '.swellrt-placeholder:empty:before {' +
              'content: attr(placeholder)' +
            '}';
            document.getElementsByTagName('head')[0].appendChild( style );

            var editorDiv = element.children();

            var editorDivs = angular.element(
              element.children().children().children()[0]);

            editorDivs
              .addClass('swellrt-placeholder')
              .attr('placeholder', ph);
            var emptyPad = function(){
              return editorDiv.children().children().length === 1 &&
                (editorDivs.html() === '<br>' || editorDivs.html() === '');
            };

            if (emptyPad()){
              editorDivs.empty();
            }

            editorDiv
              .attr('tabindex', '-1')
              .on('blur',
                function(){
                  if (emptyPad()){
                    editorDivs.empty();
                  }
                });
          }

          scope.onReady()(editor);
        }
      });

      // Suscribe to scope $destroy event better than element,
      // so it is triggered before. Otherwise, it is triggered after it is
      // propagated through the DOM, and can be fired after the
      // editor loads a new model
      scope.$on('$destroy', function () {
        if (editor){
          editor.cleanUp();
        }
      });
    }

    return {
      restrict: 'AEC',
      require: 'ngModel',
      link: link,
      scope: {
        ngModel: '=',
        onReady: '&swellrtEditorOnReady',
        onCreate: '&swellrtEditorOnCreate',
        widgets: '=swellrtEditorWidgets',
        annotations: '=swellrtEditorAnnotations'
      }
    };
  })
  // TODO number of avatars
  // TODO css class
  .directive('swellrtAvatars', function() {

    function link(scope, element) {

      scope.$watch('ngModel', function(value){
        if (!value || value.length === 0){
          return;
        }
        var avatarAttrs = [];
        // if there is only one name
        if (typeof value === 'string'){
          avatarAttrs.push({name: value});
        }
        // if it is a collection of names:
        else {
          angular.forEach(value, function(val){
            avatarAttrs.push({name: val});
          });
        }

        if (scope.swellrtAvatarOptions){
          scope.swellrtAvatarOptions.numberOfAvatars =
            Math.min(
              avatarAttrs.length,
              scope.swellrtAvatarOptions.numberOfAvatars
            );
        }

        if (window.SwellRT){
          var avatars = window.SwellRT.utils.avatar(avatarAttrs, scope.swellrtAvatarOptions);

          element.empty().append(avatars);
        }
      }, true);
    }
    return {
      restrict: 'AEC',
      require: 'ngModel',
      link: link,
      scope: {
        ngModel: '=',
        swellrtAvatarOptions: '='
      }
    };
  });
