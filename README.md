# Angular-SwellRT
SwellRT integration for [angular.js](https://angularjs.org):

## Features
### 3 way data binding (client, model, server) for real time collaboration over a federated infraestructure thanks to [SwellRT](https://github.com/P2Pvalue/SwellRT) technology.
Use collaborative javascript models composed by:
  * Maps and lists
  * Strings values
  * Rich\-Text values

### Ready to use collaborative rich-text editor:
Use collaborative text edition in your angular projects thanks to the ready to use rich text collaborative editor from SwellRT.

### Integrated real-time collaboration
Angular-SwellRT provides an intuitive way to use the powerful SwellRT technology on your angular projects.

The communication and storage of your Angular models has never been so easy: first, you get your object from a SwellRT data model, then, any changes you do in the object propagates in real time to any other client using that data model and is automatically persisted in the SwellRT federated infrastructure.


## Getting started

### Install

* Angular-SwellRT is available at [bower](http://bower.io), to use it just run
```bower install angular-swellrt```. You can also directly download this repository 

* Include angular-swellrt.js source to your angular project:
 - add `./bower_components/angular-swellrt/angular-swellrt.js'` as a javascript source file.
 - add SwellRTService to your angular module:
``` javascript
angular
  .module('App', [
    ...,
    'SwellRTService'
  ]).
```


### Using a SwellRT model

You can either use you own SwellRT server or use the demo server at `demo-swellrt.p2pvalue.eu`

 * *Create a SwellRT user:* SwellRT provides access control and user management. To start, you can just share a user among all the collaborating clients.
``` javascript
  SwellRT.registerUser("http://server.com","user@server.com","password", successCallback, errorCallback);
```
 * *Start a SwellRT session:* 
``` javascript
  window.onSwellRTReady = function () {
    window.SwellRT.startSession(
      "http://server.com","user@server.com","password", successCallback, errorCallback)
    }
```

 * *Create a SwellRT model:* the data is shared and stored through SwellRT models. To create a model, run:
``` javascript
  var modelId = window.SwellRT.createModel();
```
   the return value `modelId` is the identifier of the data model, used to access it as explained next.
 
 * *Create the collaborative proxy object:*  create a proxy object that changes when SwellRT model changes and propagate the changes you do on it:

``` javascript
  angular.module('App').controller('TextEditor', ['swellRT', function(swellRT) {
    window.SwellRT.openModel(modelId, function(model){
      $scope.proxy = swellRT.proxy(model);
      );
    }
```

## Using Angular-SwellRT

### Use collaborative javascript models composed by:
  * Maps and lists
  * Strings values
  * Rich\-Text values
  
  
Once you get a proxy object of the model, any compatible change will be propagated, some examples are given bellow:

``` javascript
  // add a string to the 'newKey' key of the model
  proxy.newKey = "my new collaborative string";
```
``` javascript
  // add a list with a simple object and a string to the 'listKey' key of the model
  proxy.listKey = [{foo = "foo"}, "bar"];
```
``` javascript
  // remove the object at key 'newKey' of the model
  delete proxy.newKey;
```

### Ready to use collaborative rich-text editor: Rich text objects can be edited through the SwellRT editor. Following example shows how:
  - Create the rich-text object: In a proxy of a SwellRT model (see instructions above), add a TextObject:
  ``` javascript
  $scope.proxy.myText = new swellRT.TextObject()
  ```

  - Add the editor to the view and attach it to the text model:

  ``` html
    <div class="swellrt-editor" ng-model="proxy.myText"></div>
  ```

