# Angular-SwellRT
SwellRT integration for [angular.js](https://angularjs.org):

## Features
### 3 way data binding (client, model, server) for real time collaboration over a federated infraestructure thanks to [SwellRT](https://github.com/P2Pvalue/SwellRT) technology.
Use collaborative javascript models composed by:
  * Maps and lists
  * Strings values
  * Rich\-Text values
  * Attachments

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
 - add `./bower_components/angular-swellrt/dist/angular-swellrt.js'` as a javascript source file.
 - add SwellRTService to your angular module:
``` javascript
angular
  .module('App', [
    ...,
    'SwellRTService'
  ]).
```

#### SwellRT server

You have several options for the SwellRT server:

* Use the demo server at `https://demo-swellrt.p2pvalue.eu`
* Use the [gulp-docker-swellrt](https://github.com/P2Pvalue/gulp-docker-swellrt) package
* Use your [own SwellRT server](https://github.com/P2Pvalue/swellrt#setting-up-a-swellrt-server-javascript-api-provider)


### Using a SwellRT model

 * *Create a SwellRT user:* SwellRT provides access control and user management. To start, you can just share a user among all the collaborating clients.
``` javascript
  SwellRT.registerUser("http://swellrt-server.net","user@swellrt-server.net","password", successCallback, errorCallback);
```
 * *Start a SwellRT session:*
``` javascript
  window.onSwellRTReady = function () {
    window.SwellRT.startSession(
      "http://swellrt-server.net","user@swellrt-server.net","password", successCallback, errorCallback)
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

#### Non-Compatible changes: *Functions* and *Undefined* values and *Type changes*:

- In general, avoid assigning `undefined` and `function` values to proxy paths that should propagate their changes to SwellRT model.
SwellRT does not have any `undefined` or `function` object types, therefore there is not a correct way of propagating those changes. The bhaviour when asigning an `undefined` value to a property in the proxy object is:
  - Strings assigned to `undefined` will hold an `undefined` value in the proxy and a  `SwellRT.createString(undefined)` value in the SwellRT model.
  - FileObjects assigned to `undefined` will clear their previous value holding a cleared FileType object at the SwellRT model and an `undefined` value in the proxy.
  - Arrays and Maps assigned to `undefined` will stop propagating changes from their path (i.e. if an Array or a Map is assigned to `undefined`, the proxy object will have an undefined value in that path but the SwellRT model will keep the previous values. Further changes in that path will *not* be propatagted.
  - TextObjects assigned to `undefined` will not change the SwellRT model.

- To change directly the type of an already observed path will result in unexpected behaviour. Please, first `delete` and then add the new object of a ifferent type if you need to change the type of an attribute.

### Ready to use collaborative rich-text editor: Rich text objects can be edited through the SwellRT editor. Following example shows how:
  - Create the rich-text object: In a proxy of a SwellRT model (see instructions above), add a TextObject:
  ``` javascript
  $scope.proxy.myText = new swellRT.TextObject()
  ```

  - Add the editor to the view and attach it to the text model:

  ``` html
    <div class="swellrt-editor" ng-model="proxy.myText" placeholder="This is a SwellRT collaborative editor! write here in collaboration with others" block-edit="false" swellrt-editor-on-ready="callback()"></div>
  ```
     - `ng-model` takes the value of the TextObject
     - `placeholder` is an optional parameter to show a placeholder when the TextObject is empty
     - `block-edit` is an optional parameters block/allow editions of the editor's content.
     - `swellrt-editor-on-ready` allows to execute an scope function after the editor is built

*note*: TextObjects are not observed, since their changes are already propagated by SwellRT. To change the value that the model has at the path where a TextObject is attached, first delete that object.

### Files and attachements: Attach files to your collaborative model structure and store them in the SwellRT server. Following example shows how:
  - Create the attachement object: In a proxy of a SwellRT model (see instructions above), add a FileObject:

  ```javascript
  // Get a HTML5 File object from an input element.
  var inputFile = document.getElementById("inputFileElementId").files[0];
  $scope.proxy.myAttachement = new swellRT.FileObject(inputFile);
  ```
  - This uploads the attachement, when it is ready, its url will be accesible from `$scope.proxy.myAttachement.url`. Also, a promise is return by the `getUrl` method, which will be resolved when the file is succesfully uploaded: `$scope.proxy.myAttachement.getUrl(function(url){console.log('the attachement url:', url)})`


### Other features

#### Avatars

  a collection of generated avatars can be obtained with the directive ```swellrtAvatars``` which receives a list of user names and returns avatars built with their initials. This feature is based in [SwellRT avatars](https://github.com/P2Pvalue/swellrt/wiki/Extras#avatars)
  ``` html
    <div class="swellrt-avatars" ng-model="[foo@bar.net, foobar@baz.com]" swellrt-avatar-options = "{numberOfAvatars : 3}"></div>
  ```

See [SwellRT avatars](https://github.com/P2Pvalue/swellrt/wiki/Extras#avatars) to learn what can be used in swellrt-avat-options parameter (size, number of avatars, etc).

## Development

### Clone angular-swellrt

Clone this repository using git:

```
git clone P2Pvalue/angular-swellrt.git
cd angular-swellrt
```

### Install dependencies

Angular-swellRT uses npm and bower to manage dependencies, run the following code to get them:

```
npm install
bower install
```

### Compile changes with [Babel](https://babeljs.io/):

Angular-swellRT uses [Babel](https://babeljs.io/) to compile its ECMAScript 6 code to a previous javascript version. Following gulp commands does this job, resulting in the file dist/angular-swellrt.js:

To run it once:
```
gulp dist
```

To run it for every source code change:
```
gulp live:dist
```
