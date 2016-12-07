/* File: xirsys.core.js */
/*********************************************************************************
  The MIT License (MIT) 

  Copyright (c) 2014 XirSys

  @author: Lee Sylvester

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.

*********************************************************************************/

var $xirsys = {
  class: {},
  baseUrl: "https://ws.xirsys.com/"
  // baseUrl: "https://" + window.location.host + "/"
};

(function () {

  $xirsys.extend = function (dest, src) {
    for (var prop in src) {
      if (typeof src[prop] === "object" && src[prop] !== null) {
        dest[prop] = dest[prop] || {};
        arguments.callee(dest[prop], src[prop]);
      } else {
        dest[prop] = src[prop];
      }
    }
    return dest;
  };

  $xirsys.isArray = function ($val) {
    return (!!$val) ?
      $val.constructor == Array : false;
  };

  $xirsys.isString = function ($val) {
    return (typeof $val == 'string');
  };

  $xirsys.class.create = function (param) {
    var i, namespace, m, part, n,
      segs = [], f = function () { }, ctor = {}, e = {}, o = {},
      t = $xirsys,
      h = Object.prototype.hasOwnProperty;
    if (!param) {
      return function () { };
    }
    namespace = param.namespace;
    if (!namespace) {
      throw new Error("Please specify the Namespace.");
    }
    if (
      namespace.length == 0 ||
      namespace.indexOf(" ") != -1 ||
      namespace.charAt(0) == '.' ||
      namespace.charAt(namespace.length - 1) == '.' ||
      namespace.indexOf("..") != -1
    ) {
      throw new Error("Illegal Namespace: " + namespace);
    }
    segs = namespace.split('.');
    for (i = 0; i < segs.length; i++) {
      if (!!t) t = t[segs[i]];
    }
    if (!!t) {
      return t;
    }
    if (h.call(param, 'constructor')) {
      if (typeof param.constructor != "function") {
        throw new TypeError("Illegal function [" + namespace + ".constructor]!");
      }
      f = param.constructor;
    }
    if (param['inherits']) {
      this['inherits'] = function (c, p) {
        for (m in p) {
          if (h.call(p, m)) {
            c[m] = p[m];
          }
        }
        ctor = function () { this.constructor = c; };
        ctor.prototype = p.prototype;
        c.prototype = new ctor();
        c.__super__ = c.Super = p.prototype;
        m = p = ctor = c = null; // release memory
      };
      this['inherits'](f, param['inherits']);
    }
    e = function (obj, params, isStatic) {
      for (m in params) {
        if (h.call(params, m)) {
          if (!isStatic) {
            obj.prototype[m] = params[m];
          } else {
            obj[m] = params[m];
          }
        }
      }
    };
    if (param.methods) {
      e(f, param.methods);
    }
    if (!param.fields) {
      param.fields = {};
    }
    param.fields.className = namespace;
    e(f, param.fields);
    if (param.statics) {
      e(f, param.statics, true);
    }
    if (param.props) { // styles
      o = f.prototype.props = $.extend(true, {}, f.prototype.props);
      e(o, $.extend(true, {}, param.props), true);
    }
    // create the specified namespace and append the class to it.
    t = $xirsys;
    for (i = 0; i < segs.length - 1; i++) {
      part = segs[i];
      // If there is no property of t with this name, create an empty object.
      if (!t[part]) {
        t[part] = {};
      } else if (typeof t[part] != "object") {
        // If there is already a property, make sure it is an object
        n = segs.slice(0, i).join('.');
        throw new Error(n + " already exists and is not an object");
      }
      t = t[part];
    }
    t[segs[segs.length - 1]] = f;
    namespace = segs = h = t = e = i = null; // release memory
    return f;
  };

  $xirsys.class.create({
    namespace: 'ajax',
    fields: {
      host: {},
      xhr: null
    },
    methods: {
      request: function ($opts) {
        if (typeof $opts == 'string') {
          $opts = { url: $opts };
        }
        $opts.url = $opts.url || '';
        $opts.method = $opts.method || 'get';
        $opts.data = $opts.data || {};
        return this.process($opts);
      },
      getParams: function ($data, $url) {
        var arr = [], str;
        for (var n in $data) {
          arr.push(n + '=' + encodeURIComponent($data[n]));
        }
        str = arr.join('&');
        if (str != '') {
          return $url ? ($url.indexOf('?') < 0 ? '?' + str : '&' + str) : str;
        }
        return '';
      },
      extend: $xirsys.extend,
      done: function ($cb) {
        this.doneCallback = $cb;
        return this;
      },
      fail: function ($cb) {
        this.failCallback = $cb;
        return this;
      },
      always: function ($cb) {
        this.alwaysCallback = $cb;
        return this;
      },
      setHeaders: function ($headers) {
        for (var n in $headers) {
          this.xhr && this.xhr.setRequestHeader(n, $headers[n]);
        }
      },
      process: function ($opts) {
        var self = this;
        if (window.ActiveXObject) {
          this.xhr = new ActiveXObject('Microsoft.XMLHTTP');
        } else if (window.XMLHttpRequest) {
          this.xhr = new XMLHttpRequest();
        }
        if (this.xhr) {
          this.xhr.onreadystatechange = function () {
            if (self.xhr.readyState == 4 && self.xhr.status >= 200 && self.xhr.status < 300) {
              var result = self.xhr.responseText;
              if ((!$opts.json || $opts.json === true) && typeof JSON != 'undefined') {
                result = JSON.parse(result);
              }
              self.doneCallback && self.doneCallback.apply(self.host, [result, self.xhr]);
            } else if (self.xhr.readyState == 4) {
              self.failCallback && self.failCallback.apply(self.host, [self.xhr]);
            }
            self.alwaysCallback && self.alwaysCallback.apply(self.host, [self.xhr]);
          }
        }
        if ($opts.method.toLowerCase() == 'get') {
          this.xhr.open("GET", $opts.url + self.getParams($opts.data, $opts.url), true);
        } else {
          this.xhr.open($opts.method, $opts.url, true);
          this.setHeaders({
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
          });
        }
        if ($opts.headers && typeof $opts.headers == 'object') {
          this.setHeaders($opts.headers);
        }
        setTimeout(function () {
          $opts.method == 'get' ? self.xhr.send() : self.xhr.send(self.getParams($opts.data));
        }, 20);
        return this;
      }
    },
    statics: {
      inst: null,
      do: function ($opts) {
        var a = new $xirsys.ajax();
        return a.request($opts);
      }
    }
  });

  /**
   * Events class
   * Events collecting and notifications functions.
   **/

  $xirsys.class.create({
    namespace: 'events',
    fields: {
      delimiter: '.',
      wildcard: '*',
      _stack: {}
    },
    methods: {
      // Add an individual listener handler.
      on: function ($evt, $handler) {
        var pntr = $xirsys.events.getInstance()._getNamespaceSegment($evt);
        if (!this.has($evt, $handler)) {
          pntr._handlers.push($handler);
        }
      },
      // Remove a listener handler.
      remove: function ($evt, $handler) {
        var $pntr = $xirsys.events.getInstance()._getNamespaceSegment($evt);
        $pntr._handlers = $pntr._handlers || [];
        for (var i = 0; i < $pntr._handlers.length; i++) {
          if ($pntr._handlers[i] == $handler || $handler === -1) {
            $pntr._handlers.splice(i);
            return;
          }
        }
      },
      // Removes all listeners for a given event
      flush: function ($events) {
        if ($xirsys.isArray($events)) {
          for (var i = 0; i < $events.length; i++) {
            if (!!$events[i]) {
              this.removeAllListeners($events[i]);
            }
          }
        } else {
          if (!!$events[i]) { //todo: what does it mean?
            this.removeListener($events[i], -1);
          }
        }
      },
      // Check for a listener, returning true or false.
      has: function ($evt, $handler) {
        if (!$handler || typeof $handler != 'function') {
          throw 'Event handler must be supplied as a function';
        }
        var pntr = $xirsys.events.getInstance()._getNamespaceSegment($evt);
        if (!pntr._handlers) {
          pntr._handlers = [];
        }
        var f = false;
        for (var t = 0; t < pntr._handlers.length; t++) {
          if (pntr._handlers[t] == $handler) f = true;
        }
        return f;
      },
      emit: function ($evt /* additional params will be passed to event handlers */) {
        var pntr = $xirsys.events.getInstance()._getNamespaceSegment($evt, true),
          args = Array.prototype.slice.call(arguments, 0);
        for (var i = 0; i < pntr.length; i++) {
          for (var j = 0; j < pntr[i]._handlers.length; j++) {
            pntr[i]._handlers[j].apply(this, args);
          }
        }
      },
      // Splits down the passed events into constituent segments, seperated by periods.
      _getNamespaceSegment: function ($evt, $includeWildcards, $arr) {
        var e = $xirsys.isString($evt) ?
          $evt.split(this.delimiter) : $xirsys.isArray($evt) ?
            $evt : null;

        if (!e) {
          throw 'Event listener assigned to unknown type';
        }

        var pntr = this._stack;
        for (var i = 0; i < e.length; i++) {
          if (!$xirsys.isString(e[i])) {
            throw 'Event identifier segment not a string value';
          }
          if (e[i] == "_handlers" || (e[i] == this.wildcard && i < e.length - 1)) {
            throw 'Invalid name used in event namespace.';
          }
          pntr = pntr[e[i]] = pntr[e[i]] || {};
        }

        pntr._handlers = pntr._handlers || [];
        if ($includeWildcards) {
          if (!$arr || !$xirsys.isArray($arr)) {
            $arr = [];
          }
          $arr.push(pntr);

          if (e[e.length - 1] == this.wildcard) {
            e.pop();
          }

          if (e.length > 0) {
            e.pop();
            e.push(this.wildcard);
            this._getNamespaceSegment(e, $includeWildcards, $arr);
          }
          return $arr;
        }
        return pntr;
      }
    },
    statics: {
      _instance: null,
      getInstance: function () {
        return $xirsys.events._instance = $xirsys.events._instance || new $xirsys.events();
      }
    }
  });

})();

/* File: xirsys.signal.js */
/*********************************************************************************
  The MIT License (MIT) 

  Copyright (c) 2014 XirSys

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.

  ********************************************************************************

  This script provides functionality for connecting to the 
  XirSys signalling platform.

  No external libraries are required. However, if supporting an
  older browser (earlier than Internet Explorer 8, Firefox 3.1, 
  Safari 4, and Chrome 3), then you may want to use the open
  source JSON library by Douglas Crockford :
   (https://github.com/douglascrockford/JSON-js) 

  If using the XirSys signalling for testing, you may want to forgo
  using a secure server based token handler (see the XirSys example 
  getToken.php script) for acquiring data from the XirSys service 
  endpoints.  Therefore, when connecting to the signalling, you will 
  need to provide all the information needed by that endpoint.

  For example:

  var s = new $xirsys.signal();
  s.connect({
    'username' : 'name_of_user_connecting',
    'ident' : 'your_ident',
    'secret' : 'your_secret_key',
    'domain' : 'your_domain',
    'application' : 'your_application_name',
    'room' : 'your_room_name'
  });

  However, if you wish to connect via your own token handler, then you
  will need to provide the URL to the class constructor, and connect 
  only with the data needed by your token handler.

  var s = new $xirsys.signal("/getToken.php");
  s.connect({
    'username' : 'name_of_user_connecting',
    'password' : 'users_password',
    'room' : 'your_room_name'
  });

  The XirSys signal client provides a number of callback handlers for
  intercepting data. If you are using the signal class with one of the
  XirSys WebRTC classes, you will probably not need to extend many of
  these. However, they are there for your use. See at the end of this
  script for a list of these.

*********************************************************************************/

'use strict';

(function () {

  /*
    The following class is a heavily modified version of the bullet script.
    Copyright (c) 2011-2012, Loïc Hoguin <essen@ninenines.eu>
  */

  $xirsys.class.create({
    namespace: 'socket',
    constructor: function ($url, $httpUrl, $options) {
      this.url = $url;
      this.httpUrl = (!!$httpUrl) ? $httpUrl : $url.replace('ws:', 'http:').replace('wss:', 'https:');
      this.options = $xirsys.extend(this.options, $options);
      this.openSocket();
    },
    fields: {
      isClosed: true,
      readyState: 3,
      url: "",
      httpUrl: "",
      options: {},
      transport: null,
      tn: 0
    },
    methods: {
      xhrSend: function ($data) {
        if (this.readyState != $xirsys.signal.CONNECTING && this.readyState != $xirsys.signal.OPEN) {
          return false
        }
        var self = this;
        $xirsys.ajax.do({
          url: self.httpUrl,
          method: 'POST',
          data: $data,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
            'X-Socket-Transport': 'xhrPolling'
          }
        })
          .done(function ($data) {
            if ($data && $data.length !== 0) {
              self.onmessage({ 'data': $data });
            }
          });
        return true;
      },
      websocket: function () {
        if (!!this.options && this.options.disableWebSocket) {
          return false;
        }
        if (window.WebSocket) {
          this.transport = window.WebSocket;
        }
        if (window.MozWebSocket && navigator.userAgent.indexOf("Firefox/6.0") == -1) {
          this.transport = window.MozWebSocket;
        }
        if (!!this.transport) {
          return { 'heart': true, 'transport': this.transport };
        }
        return null;
      },
      eventPolling: function () {
        if (!!this.options && this.options.disableEventSource) {
          return false;
        }
        if (!window.EventSource) {
          return false;
        }
        var source = new window.EventSource(this.httpUrl);
        source.onopen = function () {
          fake.readyState = $xirsys.signal.OPEN;
          fake.onopen();
        };
        source.onmessage = function ($event) {
          fake.onmessage($event);
        };
        source.onerror = function () {
          source.close();
          source = undefined;
          fake.onerror();
        };
        var fake = {
          readyState: $xirsys.signal.CONNECTING,
          send: this.xhrSend,
          close: function () {
            fake.readyState = $xirsys.signal.CLOSED;
            source.close();
            source = undefined;
            fake.onclose();
          }
        };
        return {
          'heart': false, 'transport': function () {
            return fake;
          }
        };
      },
      xhrPolling: function () {
        if (!!this.options && this.options.disableXHRPolling) {
          return false;
        }
        var timeout;
        var xhr = null;
        var fake = {
          readyState: $xirsys.signal.CONNECTING,
          send: xhrSend,
          close: function () {
            this.readyState = $xirsys.signal.CLOSED;
            if (xhr) {
              xhr.abort();
              xhr = null;
            }
            clearTimeout(timeout);
            fake.onclose();
          },
          onopen: function () { },
          onmessage: function () { },
          onerror: function () { },
          onclose: function () { }
        };
        self.nextPoll();
        return {
          'heart': false, 'transport': function () {
            return fake;
          }
        };
      },
      poll: function () {
        xhr = $xirsys.ajax.do({
          url: this.httpUrl,
          method: 'GET',
          data: {},
          headers: { 'X-Socket-Transport': 'xhrPolling' }
        })
          .done(function ($data) {
            xhr = null;
            if (fake.readyState == $xirsys.signal.CONNECTING) {
              fake.readyState = $xirsys.signal.OPEN;
              fake.onopen(fake);
            }
            if ($data && $data.length !== 0) {
              fake.onmessage({ 'data': $data });
            }
            if (fake.readyState == $xirsys.signal.OPEN) {
              this.nextPoll();
            }
          })
          .fail(function (xhr) {
            xhr = null;
            fake.onerror();
          });
      },
      nextPoll: function () {
        timeout = setTimeout(function () {
          this.poll();
        }, 100);
      },
      next: function () {
        var c = 0,
          s = {
            websocket: this.websocket,
            eventPolling: this.eventPolling,
            xhrPolling: this.xhrPolling
          };
        for (var f in s) {
          if (this.tn == c) {
            var t = s[f]();
            if (t) {
              var ret = new t.transport(this.url);
              ret.heart = t.heart;
              return ret;
            }
            this.tn++;
          }
          c++;
        }
        return false;
      },
      openSocket: function () {
        var self = this,
          heartbeat,
          delay = 80,
          delayDefault = 80,
          delayMax = 10000;


        self.readyState = $xirsys.signal.CLOSED,
          self.isClosed = true;

        function init() {
          self.isClosed = false;
          self.readyState = $xirsys.signal.CONNECTING; // Should this be readyState or self.readyState?
          self.transport = self.next();

          if (!self.transport) {
            delay = delayDefault;
            self.tn = 0;
            self.ondisconnect();
            setTimeout(function () { init(); }, delayMax);
            return false;
          }

          self.transport.onopen = function () {
            delay = delayDefault;

            if (self.transport.heart) {
              heartbeat = setInterval(function () {
                self.send('ping');
                self.onheartbeat();
              }, 20000);
            }

            if (self.readyState != $xirsys.signal.OPEN) {
              self.readyState = $xirsys.signal.OPEN; // Should this be readyState or self.readyState?
              self.onopen();
            }
          };
          self.transport.onclose = function () {
            if (self.isClosed || self.readyState == $xirsys.signal.CLOSED) {
              return;
            }

            self.transport = null;
            clearInterval(heartbeat);

            if (self.readyState == $xirsys.signal.CLOSING) {
              self.readyState = $xirsys.signal.CLOSED;
              self.transport = false;
              self.onclose();
            } else {
              if (self.readyState == $xirsys.signal.CONNECTING) {
                self.tn++;
              }
              delay *= 2;
              if (delay > delayMax) {
                delay = delayMax;
              }
              self.isClosed = true;
              setTimeout(function () {
                init();
              }, delay);
            }
          };
          self.transport.onerror = function ($e) {
            self.onerror($e);
          };
          self.transport.onmessage = function ($e) {
            self.onmessage($e);
          };
        }
        init();

        this.onopen = function () { };
        this.onmessage = function () { };
        this.ondisconnect = function () { };
        this.onclose = function () { };
        this.onheartbeat = function () { };
        this.onerror = function () { };
      },
      send: function ($data) {
        if (!!this.transport) {
          return this.transport.send($data);
        } else {
          return false;
        }
      },
      close: function () {
        this.readyState = $xirsys.signal.CLOSING;
        if (this.transport) {
          this.transport.close();
        }
      },
      setURL: function ($newURL) {
        this.url = $newURL;
      }
    },
    statics: {
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3
    }
  });

  /*********************************************************************************
   * For full use of this class, see the information at the top of this script.
   *********************************************************************************/

  $xirsys.class.create({
    namespace: 'signal',
    constructor: function ($url) {
      if (!!$url) {
        $xirsys.signal.wsList = $url + "signal/list?secure=0";
        $xirsys.signal.tokenUrl = $url + "signal/token";
      }
    },
    inherits: $xirsys.socket,
    fields: {
      token: "",
      wsUrl: "",
      sock: null,
      xirsys_opts: null,
      room_key: ''
    },
    methods: {
      connect: function ($opts) {
        var self = this;
        this.room_key = "/" + $opts.domain + "/" + $opts.application + "/" + $opts.room;
        this.xirsys_opts = $opts;
        self.getToken(null, null, function (td) {
          self.getSocketEndpoints(function (sd) {
            self.sock = new $xirsys.socket(sd + "/" + td); //, {disableWebsocket:true, disableEventSource:true});
            self.sock.onmessage = self.handleService.bind(self);
            self.sock.onopen = self.onOpen.bind(self);
            self.sock.ondisconnect = self.onDisconnect.bind(self);
            self.sock.onclose = self.onClose.bind(self);
            self.sock.onerror = self.onError.bind(self);
          });
        });
      },
      close: function () {
        this.sock.close();
      },
      send: function ($event, $data, $targetUser, $type) {
        var service_pkt = {
          t: "u", // user message service
          m: {
            f: this.room_key + "/" + this.xirsys_opts.username,
            t: $targetUser,
            o: $event
          },
          p: $data
        }
        if (!!$type && ($type == "pub" || $type == "sub")) {
          service_pkt.t = "tm";
          service_pkt.m.o = $type;
        }

        var pkt = JSON.stringify(service_pkt)
        this.sock.send(pkt);
      },

      handleService: function (evt) {
        var pkt = JSON.parse(evt.data);
        if (!pkt.t) {
          this.onError({ message: "invalid message received", data: pkt });
        }
        switch (pkt.t) {
          case "u":
            //user signal
            this.handleUserService(pkt);
            break;
          default:
            console.log("don't know this packet type " + pkt.t);
        }
      },
      handleUserService: function (pkt) {
        //console.log('handleUserService ',pkt);
        var peer = null;
        if (pkt.m.f) {
          peer = pkt.m.f.split("/");
          peer = peer[peer.length - 1];
        }

        switch (pkt.m.o) {
          case "peers":
            this.onPeers(pkt.p);
            break;
          case "peer_connected":
            this.onPeerConnected(peer);
            break;
          case "peer_removed":
            this.onPeerRemoved(peer);
            break;
          default:
            this.onMessage({ type: pkt.m.o, sender: peer, data: pkt.p, peer: peer });
            break;
        }
      },
      getToken: function ($url, $data, $cb) {
        var self = this;
        $xirsys.ajax.do({
          url: $url || $xirsys.signal.tokenUrl,
          method: 'POST',
          data: $data || self.xirsys_opts
        })
          .done(function ($data) {

            if (!!$data.e) {
              self.onError($data.e);
              return;
            }
            self.token = $data.d;
            $cb.apply(this, [self.token]);
          });
      },
      getSocketEndpoints: function ($cb) {
        var self = this;
        var p = $xirsys.ajax.do({
          url: $xirsys.signal.wsList,
          method: 'GET',
          data: {}
        })
          .done(function ($data) {
            if (!!$data.e) {
              self.onError($data.e);
              return;
            }
            self.wsUrl = $data.d + "/v1";
            $cb.apply(this, [self.wsUrl]);
          });
      },
      /*********************************************************************************
       * Any of these handlers may be overidden for your own functionality.
       *********************************************************************************/
      onOpen: function () {
        $xirsys.events.getInstance().emit($xirsys.signal.open);
      },
      onPeers: function ($peers) {
        $xirsys.events.getInstance().emit($xirsys.signal.peers, $peers);
      },
      onPeerConnected: function ($peer) {
        $xirsys.events.getInstance().emit($xirsys.signal.peerConnected, $peer);
      },
      onPeerRemoved: function ($peer) {
        $xirsys.events.getInstance().emit($xirsys.signal.peerRemoved, $peer);
      },
      onMessage: function ($msg) {
        $xirsys.events.getInstance().emit($xirsys.signal.message, $msg);
      },
      onDisconnect: function () {
        $xirsys.events.getInstance().emit($xirsys.signal.disconnected);
      },
      onClose: function () {
        $xirsys.events.getInstance().emit($xirsys.signal.closed);
      },
      onError: function ($error) {
        $xirsys.events.getInstance().emit($xirsys.signal.error, $error);
      }
      /*********************************************************************************/
    },
    statics: {
      wsList: $xirsys.baseUrl + "signal/list?secure=1",
      tokenUrl: $xirsys.baseUrl + "signal/token",
      /* events */
      open: "signalling.open",
      peers: "signalling.peers",
      peerConnected: "signalling.peer.connected",
      peerRemoved: "signalling.peer.removed",
      message: "signalling.message",
      disconnected: "signalling.disconnected",
      closed: "signalling.closed",
      error: "signalling.error"
    }
  });

})();

/* File: xirsys.api.js */
/*********************************************************************************
	The MIT License (MIT) 

	Copyright (c) 2014 XirSys

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.

	********************************************************************************

	This script provides functionality for connecting to the 
	XirSys API endpoints.

	No external libraries are required. However, if supporting an
	older browser (earlier than Internet Explorer 8, Firefox 3.1, 
	Safari 4, and Chrome 3), then you may want to use the open
	source JSON library by Douglas Crockford :
	 (https://github.com/douglascrockford/JSON-js) 

*********************************************************************************/

'use strict';

(function () {

	/*********************************************************************************
	 * For full use of this class, see the information at the top of this script.
	 *********************************************************************************/

	$xirsys.class.create({
		namespace : 'api',
		constructor : function ($opts, $url) {
			if (!!$url) {
				$xirsys.api.iceUrl = $url + "ice";
			}
			this.data = $opts;
		},
		fields : {
			ice : null
		},
		methods : {
			getIceServers : function ($cb) {
				var self = this;
				$xirsys.ajax.do({
					url: $xirsys.api.iceUrl,
					method: 'POST', // In http://xirsys.com/guide/ it uses a GET rather than a POST ... Should resolve.
					data: self.xirsys_opts
				}) 
				.done(function($data) {
					self.ice = $data.d;
					$cb.apply(this, [self.ice]);
				});
			}
		},
		statics : {
			iceUrl : $xirsys.baseUrl + "ice"
		}
	});

})();

/* File: xirsys.p2p.adapter.js */
/*********************************************************************************
	Copyright (c) 2011, The WebRTC project authors. All rights reserved.

	Redistribution and use in source and binary forms, with or without
	modification, are permitted provided that the following conditions are
	met:

		* Redistributions of source code must retain the above copyright
			notice, this list of conditions and the following disclaimer.

		* Redistributions in binary form must reproduce the above copyright
			notice, this list of conditions and the following disclaimer in
			the documentation and/or other materials provided with the
			distribution.

		* Neither the name of Google nor the names of its contributors may
			be used to endorse or promote products derived from this software
			without specific prior written permission.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
	"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
	LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
	A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
	HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
	LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
	DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
	THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
	 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
	OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*********************************************************************************/

'use strict';

var RTCPeerConnection = RTCPeerConnection || null,
	RTCIceCandidate = RTCIceCandidate || null,
	RTCSessionDescription = RTCSessionDescription || null,
	getUserMedia = getUserMedia || null,
	attachMediaStream = null,
	detachMediaStream = null,
	reattachMediaStream = null,
	webrtcDetectedBrowser = null;

if (navigator.mozGetUserMedia) {
	console.log("This appears to be Firefox");

	webrtcDetectedBrowser = "firefox";
	RTCPeerConnection = mozRTCPeerConnection;
	RTCSessionDescription = mozRTCSessionDescription;
	RTCIceCandidate = mozRTCIceCandidate;

	// Get UserMedia (only difference is the prefix).
	// Code from Adam Barth.
	getUserMedia = navigator.mozGetUserMedia.bind(navigator);

	attachMediaStream = function (element, stream) {
		console.log("Attaching media stream");
		element.mozSrcObject = stream;
		element.play();
	};
	
	detachMediaStream = function (element) {
		console.log("detaching media stream");
		element.pause();
		element.mozSrcObject = null;
	};

	reattachMediaStream = function (to, from) {
		console.log("Reattaching media stream");
		to.mozSrcObject = from.mozSrcObject;
		to.play();
	};

	// Fake get{Video,Audio}Tracks
	if (!MediaStream.prototype.getVideoTracks) {
		MediaStream.prototype.getVideoTracks = function () {
			return [];
		}
	}

	if (!MediaStream.prototype.getAudioTracks) {
		MediaStream.prototype.getAudioTracks = function () {
			return [];
		}
	}
} else if (navigator.webkitGetUserMedia) {
	console.log("This appears to be Chrome");

	webrtcDetectedBrowser = "chrome";

	RTCPeerConnection = webkitRTCPeerConnection;
	
	// Get UserMedia (only difference is the prefix).
	// Code from Adam Barth.
	getUserMedia = navigator.webkitGetUserMedia.bind(navigator);

	// Attach a media stream to an element.
	attachMediaStream = function (element, stream) {
		if (typeof element.srcObject !== 'undefined') {
			element.srcObject = stream;
		} else if (typeof element.mozSrcObject !== 'undefined') {
			element.mozSrcObject = stream;
		} else if (typeof element.src !== 'undefined') {
			element.src = URL.createObjectURL(stream);
		} else {
			console.log('Error attaching stream to element.');
		}
	};
	
	detachMediaStream = function (element) {
		console.log("detaching media stream");
		element.pause();
		if (typeof element.srcObject !== 'undefined') {
			element.srcObject = null;
		} else if (typeof element.mozSrcObject !== 'undefined') {
			element.mozSrcObject = null;
		} else if (typeof element.src !== 'undefined') {
			element.src = null;
		}
	};

	reattachMediaStream = function (to, from) {
		to.src = from.src;
	};

	// The representation of tracks in a stream is changed in M26.
	// Unify them for earlier Chrome versions in the coexisting period.
	if (!webkitMediaStream.prototype.getVideoTracks) {
		webkitMediaStream.prototype.getVideoTracks = function () {
			return this.videoTracks;
		};
		webkitMediaStream.prototype.getAudioTracks = function () {
			return this.audioTracks;
		};
	}

	// New syntax of getXXXStreams method in M26.
	if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
		webkitRTCPeerConnection.prototype.getLocalStreams = function () {
			return this.localStreams;
		};
		webkitRTCPeerConnection.prototype.getRemoteStreams = function () {
			return this.remoteStreams;
		};
	}
} else {
	console.log("Browser does not appear to be WebRTC-capable");
}


/* File: xirsys.p2p.js */
/*********************************************************************************
	The MIT License (MIT) 

	Copyright (c) 2014 XirSys

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.

	********************************************************************************

	This script provides functionality for connecting using Peer-to-Peer 
	via the XirSys WebRTC services [STUN/TURN].

	No external libraries are required. However, if supporting an
	older browser (earlier than Internet Explorer 8, Firefox 3.1, 
	Safari 4, and Chrome 3), then you may want to use the open
	source JSON library by Douglas Crockford :
	 (https://github.com/douglascrockford/JSON-js) 

*********************************************************************************/

'use strict';

(function () {

	/*********************************************************************************
	 * For full use of this class, see the information at the top of this script.
	 *********************************************************************************/

	$xirsys.class.create({
		namespace : 'p2p',
		constructor : function ($url, $config, $localVideo, $remoteVideo) {
			this.status = $xirsys.p2p.DISCONNECTED;
			if($config.video !== undefined) this.rtc.useVideo = (!!$config.video);
			if($config.audio !== undefined) this.rtc.useAudio = (!!$config.audio);
			this.rtc.useDataChannel = (!!$config.dataChannels);
			if (this.rtc.useDataChannel) {
				this.rtc.dataChannelList = $config.dataChannels;
			}
			this.rtc.forceTurn = (!!$config.forceTurn);
			this.rtc.screenshare = (!!$config.screenshare);
			this.rtc.connType = $config.connType;
			this.rtc.localVideo = $localVideo;
			this.rtc.remoteVideo = $remoteVideo;
			this.url = $url || null;
			//update ice path
			if (!!$url) {
				$xirsys.api.iceUrl = $url + "ice";
			}
			console.log('url '+$url+' ice: '+$xirsys.api.iceUrl);
		},
		inherits : $xirsys.api,
		fields : {
			status : null,
			signal : null,
			xirsys_opts : {
				username : null,
				password : null,
				domain : null,
				application : null,
				room : null,
				automaticAnswer : true
			},
			autoreply : null,
			rtc : {
				state : null,
				sdpConstraints : {'mandatory': {'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true }},
				useVideo : true,
				useAudio : true,
				useDataChannel : true,
				dataChannelList : [],
				forceTurn : false,
				screenshare : false,
				connType : null,
				localStream : null,
				remoteStream : null,
				localVideo : null,
				remoteVideo : null,
				dataChannel : null,
				remoteDataChannel : null,
				peerConn : null,
				peer : null,
				ice : null,
				participant : null
			}
		},
		methods : {
			open : function ($opts, $autoreply) {
				if (!!this.signal && !this.signal.isClosed) {
					this.close();
				}
				if (!$opts) {
					this.error('connect', 'User credentials should be specified.');
					return;
				}
				this.xirsys_opts = $opts;
				this.autoreply = !!$autoreply;
				this.xirsys_opts.type = (this.rtc.connType == "pub") ? 
					"publish" : (this.rtc.connType == "sub") ? 
						"subscribe" : null;
				this.signal = new $xirsys.signal(this.url);
				this.signal.onOpen = (this.onSignalOpen).bind(this);
				this.signal.onClose = (this.onSignalClose).bind(this);
				this.signal.onMessage = (this.onSignalMessage).bind(this);
				this.signal.connect(this.xirsys_opts);
				return this.signal;
			},
			close : function () {
				this.signal.close();
			},
			call : function ($targetUser) {
				this.rtc.peer = $targetUser;
				this.rtc.participant = $xirsys.p2p.CLIENT;
				this.status = $xirsys.p2p.CALLING;
				this.setConstraints();
				this.doPeerConnection((function () {
					var _constraints = {"optional": [], "mandatory": {"MozDontOfferDataChannel": (!this.rtc.useDataChannel) }};
					if (webrtcDetectedBrowser === "chrome") {
						for (var prop in _constraints.mandatory) {
							if (prop.indexOf("Moz") != -1) {
								delete _constraints.mandatory[prop];
							}
						}
					}
					_constraints = this.mergeConstraints(_constraints, this.rtc.sdpConstraints);
					if (this.rtc.useDataChannel) {
						this.rtc.peerConn.ondatachannel = this.onRemoteDataChannel.bind(this);
						for (var i = 0; i < this.rtc.dataChannelList.length; i++) {
							this.doCreateDataChannel(this.rtc.dataChannelList[i]);
						}
					}
					this.rtc.peerConn.createOffer((this.setLocalAndSendMessage).bind(this), function(){}, _constraints); // Showing error on Firefox
					
				}).bind (this));
			},
			hangUp : function () {
				if (!!this.rtc.peerConn && this.rtc.peerConn.signalingState != 'closed') { // Should this function be watching and setting this.status?
					this.rtc.peerConn.close();
				}
			},
			answer : function ($peer) {
				this.rtc.participant = $xirsys.p2p.PEER;
				if (!this.status == $xirsys.p2p.CALLING) {
					this.status = $xirsys.p2p.ANSWERING;
				}
				this.rtc.peer = $peer;
				this.setConstraints();
				this.rtc.peerConn.createAnswer((this.setLocalAndSendMessage).bind(this), function(){});
			},
			doCreateDataChannel : function ($label) {
				$label = $label || "channelLabel";
				this.rtc.dataChannel = this.rtc.peerConn.createDataChannel($label, {}); // make channel label dynamic?
				this.rtc.dataChannel.onopen = function (event) {
					var readyState = this.rtc.dataChannel.onopen.readyState;
					if (readyState == "open") {
						this.onDataChannelOpen();
					}
				};
				this.rtc.dataChannel.onerror = this.onDataChannelError.bind(this);
				this.rtc.dataChannel.onmessage = this.onDataChannelMessage.bind(this);
				this.rtc.dataChannel.onopen = this.onDataChannelOpen.bind(this);
				this.rtc.dataChannel.onclose = this.onDataChannelClose.bind(this);
			},
			onRemoteDataChannel : function ($event) {
				this.rtc.remoteDataChannel = $event.channel;
				this.rtc.remoteDataChannel.onmessage = this.onRemoteDataChannelMessage.bind(this);
			},
			onRemoteDataChannelMessage : function ($event) {
				$xirsys.events.getInstance().emit($xirsys.p2p.dataChannelMessage, $event.data);
			},
			onDataChannel : function ($channelData) {
				var newDataChannel = new xrtc.DataChannel(channelData.channel, remoteUser);
				dataChannels.push(newDataChannel);
			},
			onDataChannelError : function ($error) {
				$xirsys.events.getInstance().emit($xirsys.p2p.dataChannelError, $error);
			},
			onDataChannelMessage : function ($event) {
				$xirsys.events.getInstance().emit($xirsys.p2p.dataChannelMessage, $event.data);
			},
			onDataChannelOpen : function () {
				$xirsys.events.getInstance().emit($xirsys.p2p.dataChannelOpen);
			},
			onDataChannelClose : function () {
				$xirsys.events.getInstance().emit($xirsys.p2p.dataChannelClose);
			},
			dataChannelSend : function ($data) {
				this.rtc.dataChannel.send($data);
			},
			dataChannelClose : function () {
				this.rtc.dataChannel.close();
			},
			onSignalOpen : function () {
				this.doGetUserMedia();
			},
			onSignalClose : function () {
				// TODO
			},
			onSignalMessage : function ($msg) {
				switch ($msg.data.type) {
					case "ice":
						this.onIceServers($msg.data.ice);
						break;
					case "offer":
						// setRemoteDescription is intended to be in the answer
						// method, but then candidate messages crash the app.
						this.rtc.peerConn.setRemoteDescription(new RTCSessionDescription($msg.data), function(){}, function(){});
						if (this.xirsys_opts.automaticAnswer === true) {
							this.answer($msg.peer, $msg.data);
						}
						$xirsys.events.getInstance().emit($xirsys.p2p.offer, $msg.peer, $msg.data);
						break;
					case "answer":
						this.rtc.peerConn.setRemoteDescription(new RTCSessionDescription($msg.data), function(){}, function(){});
						$xirsys.events.getInstance().emit($xirsys.p2p.answer);
						break;
					case "candidate":
						this.rtc.peerConn.addIceCandidate(
							new RTCIceCandidate({
								sdpMLineIndex:$msg.data.label, 
								candidate:$msg.data.candidate
							})
						);
						break;
					default:
						$xirsys.events.getInstance().emit($xirsys.signal.message, $msg);
						break;
				}
			},
			onIceCandidate : function ($evt) {
				if ($evt.candidate) {
					var components = $evt.candidate.candidate.split(" ");
					if (!(this.rtc.forceTurn && components[7] != "relay")) {
						this.signal.send('session', {
							type: 'candidate',
							label: $evt.candidate.sdpMLineIndex,
							id: $evt.candidate.sdpMid,
							candidate: $evt.candidate.candidate
						}, this.rtc.peer, this.rtc.connType);
					}
				}
			},
			onIceServers : function ($ice) {
				this.rtc.ice = $ice;
				var peer_constraints = {"optional": [{"DtlsSrtpKeyAgreement": true}]};
				if (this.rtc.useDataChannel) {
					peer_constraints.optional.push({"RtpDataChannels": true});
				}
				try {
					this.rtc.peerConn = new RTCPeerConnection(this.rtc.ice, peer_constraints);
					if (this.rtc.useDataChannel) {
						this.rtc.peerConn.ondatachannel = this.onRemoteDataChannel.bind(this);
					}
					this.rtc.peerConn.onicecandidate = this.onIceCandidate.bind(this);
					if (!!this.rtc.localStream) {
						this.rtc.peerConn.addStream(this.rtc.localStream);
					}
					this.rtc.peerConn.onaddstream = this.onRemoteStreamAdded.bind(this);
					this.rtc.peerConn.oniceconnectionstatechange = this.onICEConnectionState.bind(this);
				} catch (e) {
					this.rtc.onPeerConnectionError();
				}
			},
			onRemoteStreamAdded : function ($evt) {
				if (!!this.rtc.remoteVideo) {
					attachMediaStream(this.rtc.remoteVideo, $evt.stream);
					this.rtc.remoteStream = $evt.stream;
				}
			},
			onICEConnectionState : function ($evt) {
				if ($evt.target.iceGatheringState == "connected" || $evt.target.iceGatheringState == "complete") {
					this.status = $xirsys.p2p.CONNECTED;
					$xirsys.events.getInstance().emit($xirsys.p2p.iceConnected);
				}
				if( $evt.target.iceConnectionState == "disconnected" || $evt.target.iceConnectionState == "closed" || $evt.target.iceConnectionState == "failed") {
					this.status = $xirsys.p2p.DISCONNECTED;
					$xirsys.events.getInstance().emit($xirsys.p2p.iceDisconnected);
			    }
			},
			onUserMediaSuccess : function ($stream) {
				if (!!this.rtc.localVideo && this.rtc.useVideo) {
					attachMediaStream(this.rtc.localVideo, $stream);
					this.rtc.localStream = $stream;
				}
			},
			onUserMediaError : function () {
				this.error("doGetUserMedia", "Could not get user media");
			},
			doPeerConnection : function ($cb) {
				this.getIceServers((function ($ice) {
					this.signal.send('session', {type: 'ice', ice: $ice}, this.rtc.peer, this.rtc.connType);
					this.onIceServers($ice);
					$cb();
				}).bind(this));
			},
			onPeerConnectionError : function () {
				this.error ("doPeerConnection", "Could not create peer connection");
			},
			doGetUserMedia : function () {
				var _constraint = {"audio": this.rtc.useAudio, "video": {"mandatory": {}, "optional": []}};
				if (this.rtc.screenshare) {
					_constraint.video.mandatory = {
						maxWidth : window.screen.width,
						maxHeight : window.screen.height,
						maxFrameRate : 3
					}
					if (webrtcDetectedBrowser === "chrome") {
						_constraint.video.mandatory.chromeMediaSource = 'screen';
					} else {
						_constraint.video.mandatory.mediaSource = 'screen';
					}
					_constraint.audio = false;
				}
				try {
					if( !this.rtc.useAudio && !this.rtc.useVideo ) return;
					getUserMedia(_constraint,(this.onUserMediaSuccess).bind(this),(this.onUserMediaError).bind(this));
				} catch (e) {
					this.onUserMediaError();
				}
			},
			setLocalAndSendMessage : function ($sessionDescription) {
				this.rtc.peerConn.setLocalDescription($sessionDescription);
				this.signal.send('session', $sessionDescription, this.rtc.peer, this.rtc.connType);
			},
			mergeConstraints : function ($c1, $c2) {
				var m = $c1;
				for (var n in $c2.mandatory) {
					m.mandatory[n] = $c2.mandatory[n];
				}
				m.optional.concat($c2.optional);
				return m;
			},
			setConstraints : function () {
				this.rtc.sdpConstraints = "{'mandatory': {'OfferToReceiveAudio':" + (!!this.rtc.useAudio).toString() + ", 'OfferToReceiveVideo':" + (!!this.rtc.useVideo).toString() + " }}"
			},
			error : function ($func, $msg) {
				$xirsys.events.getInstance().emit($xirsys.p2p.error, $func, $msg);
			}
		},
		statics : {
			/* status */
			PEER : "peer",
			CLIENT : "client",
			DISCONNECTED : "disconnected",
			CONNECTED : "connected",
			CALLING : "calling",
			ANSWERING : "answering",
			/* events */
			offer : "p2p.offer",
			answer : "p2p.answer",
			error : "p2p.error",
			iceConnected : "p2p.iceConnected",
			iceDisconnected : "p2p.iceDisconnected",
			dataChannelError : "p2p.dataChannelError",
			dataChannelMessage : "p2p.dataChannelMessage",
			dataChannelOpen : "p2p.dataChannelOpen",
			dataChannelClose : "p2p.dataChannelClose",
			/* connection type */
			publish : "pub",
			subscribe : "sub",
			direct : null // force null value for standard calls
		}
	});

})();





/* File: xirsys.ui.js */
/*********************************************************************************
  The MIT License (MIT) 

  Copyright (c) 2014 XirSys

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.

  ********************************************************************************

  This script provides functionality for creating UI elements from objects.

*********************************************************************************/

'use strict';

(function () {

  /*********************************************************************************
   * For full use of this class, see the information at the top of this script.
   *********************************************************************************/

  var clz = $xirsys.class.create({
    namespace : 'ui',
    statics : {
      parse : function($node, $data) {
        var node = clz.buildNode($node, $data);
        if (!!node && !!$data.children && $data.children.constructor == Array) {
          $data.children.forEach(function($child) {
            clz.parse(node, $child);
          });
        }
      },
      buildNode : function($parent, $data) {
        if (typeof $data == "string") {
          $parent.append(document.createTextNode($data));
          return null;
        } else {
          var elem = document.createElement($data.node || "div")
          Object.keys($data).filter(function(e) {
            return e != "node" && e != "children" && $data.hasOwnProperty(e);
          }).map(function(key) {
            elem.setAttribute(key, $data[key]);
          });
          $parent.append(elem);
          return elem
        }
      }
    }
  });

})();



/* File: xirsys.quickstart.js */
/*********************************************************************************
  The MIT License (MIT) 

  Copyright (c) 2014 XirSys

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.

  ********************************************************************************

  This script provides a quickstart application which extends 
  the SDKs WebRTC framework.

*********************************************************************************/

'use strict';

(function () {

  /*********************************************************************************
   * For full use of this class, see the information at the top of this script.
   *********************************************************************************/

  var self, qs;

  qs = $xirsys.class.create({
    namespace : 'quickstart',
    inherits : $xirsys.ui,
    constructor : function($data, $server) {
      self = this;
      self.qs = qs;
      self.events = $xirsys.events.getInstance();
      var d = self.connectionData = $xirsys.extend({}, $data);
      if (!d.room) d.room = 'default';
      if (!d.application) d.application = 'default';
      self.server = $server;
      self.secureTokenRetrieval = $data.secure == 1;
      window.onload = function () {
        qs.parse(qs.tag("body")[0], self.data);
        self.init();
      }
    },
    methods : {
      init : function() {
        this.p = new $xirsys.p2p(
          (this.secureTokenRetrieval === true) ? this.server : null,
          {
            audio: true, 
            video: true
          },
          qs.ref('local-video'),
          qs.ref('remote-video')
        );
        qs.ref('login').onsubmit = this.loginSubmitHandler.bind(self);
        qs.ref('log-out').onclick = this.logoutClickHandler.bind(self);
        qs.ref('sendMessage').onsubmit = this.sendMessageHandler.bind(self);
        qs.ref('call-peer').onclick = this.callPeerHandler.bind(self);
        qs.ref('hang-up').onclick = this.hangUpHandler.bind(self);
        qs.ref('local-full-screen').onclick = this.localFullScreenHandler.bind(self);
        qs.ref('remote-full-screen').onclick = this.remoteFullScreenHandler.bind(self);

        self.events.on($xirsys.signal.peers, function ($evt, $msg) {
          for (var i = 0; i < $msg.users.length; i++) {
            self.addPeer($msg.users[i]);
          }
        });

        self.events.on($xirsys.signal.peerConnected, function ($evt, $msg) {
          self.addPeer($msg);
        });
        
        self.events.on($xirsys.signal.peerRemoved, function ($evt, $msg) {
          self.removePeer($msg);
        });
        
        self.events.on($xirsys.signal.message, function ($evt, $msg) {
          if ($msg.sender != self.username) {
            self.addMessage('From ' + self.stripLeaf($msg.sender), $msg.data);
          }
        });
        
        self.events.on($xirsys.p2p.offer, function ($evt, $peer, $data) {
          self.callIncoming($peer, $data);
        });
        
        self.events.on($xirsys.signal.error, function ($evt, $msg) {
          console.error('error: ', $msg);
          self.addMessage('Error', 'There has been an error in the server connection');
        });
      },
      loginSubmitHandler : function ($event) {
        $event.preventDefault();
        self.username = qs.ref('username').value.replace(/\W+/g, '');
        if (!self.username || self.username == '') {
          return;
        }
        qs.ref('login').parentNode.style.visibility = 'hidden';
        qs.ref('log-out').style.visibility = 'visible';
        self.connectionData.username = self.username;
        self.connectionData.automaticAnswer = self.automaticAnswer;
        self.p.open(self.connectionData);
      },
      logoutClickHandler : function ($event) {
        $event.preventDefault();
        self.username = '';
        while (qs.ref('username-label').hasChildNodes()) {
          qs.ref('username-label').removeChild(qs.ref('username-label').lastChild);
        }
        qs.ref('username-label').appendChild(qs.createText('[Not logged in]'));
        self.login.parentNode.style.visibility = 'visible';
        qs.ref('log-out').style.visibility = 'hidden';
        self.removeAllPeers();
        self.p.hangUp();
        self.detachMediaStream(qs.ref('local-video'));
        self.p.close();
      },
      sendMessageHandler : function ($event) {
        $event.preventDefault();
        if (!self.p.signal) {
          self.addMessage('You are not yet connected to the signalling server');
          return;
        }
        var peer = self.selectedPeer.call(self);
        if (!!peer) {
          self.p.signal.send('message', self.message.value, peer);
        } else {
          self.p.signal.send('message', self.message.value);
        }
        self.addMessage((!!peer) ? 'To ' + peer : 'To all peers', qs.ref('message').value);
        qs.ref('message').value = '';
      },
      callPeerHandler : function () {
        var peerName = self.selectedPeer.call(self);
        if (!!peerName) {
          self.p.call(peerName);
          self.addMessage('Calling ' + peerName);
        } else {
          self.addMessage('Error', 'You must select a single peer before initiating a call');
        }
      },
      hangUpHandler : function () {
        self.p.hangUp();
      },
      localFullScreenHandler : function ($evt) {
        self.fullScreenVideo(qs.ref('local-video'));
      },
      remoteFullScreenHandler : function ($evt) {
        self.fullScreenVideo(qs.ref('remote-video'));
      },
      addPeer : function ($peerName) {
        if ($peerName == self.username) {
          while (qs.ref('username-label').hasChildNodes()) {
            qs.ref('username-label').removeChild(qs.ref('username-label').lastChild);
          }
          qs.ref('username-label').appendChild(qs.createText(self.stripLeaf($peerName)));
        } else {
          if (!qs.ref('peer-' + $peerName)) {
            var nodeEl = qs.createEl('div'),
              btnEl = qs.createEl('input');
            btnEl.setAttribute('type', 'radio');
            btnEl.setAttribute('name', 'peer');
            btnEl.setAttribute('value', $peerName);
            nodeEl.appendChild(btnEl);
            nodeEl.appendChild(qs.createText(self.stripLeaf($peerName)));
            nodeEl.id = 'peer-' + $peerName;
            nodeEl.className = 'peer';
            qs.ref('peers').appendChild(nodeEl);
          }
        }
      },
      removePeer : function ($peerName) {
        var nodeEl = qs.ref('peer-' + $peerName);
        qs.ref('peers').removeChild(nodeEl);
      },
      removeAllPeers : function () {
        var selectors = qs.tag('div', qs.ref('peers')),
          peerSelectors = [];
        for (var i = 0; i < selectors.length; i++) {
            if (selectors[i].className.indexOf('peer') !== -1) {
            peerSelectors.push(selectors[i]);
          }
        }
        for (var i = 0; i < peerSelectors.length; i++) {
          qs.ref('peers').removeChild(peerSelectors[i]);
        }
      },
      selectedPeer : function () {
        var peerEl = qs.elem('peer');
        for (var i=0, l=peerEl.length; i<l; i++) {
          if (peerEl[i].checked) {
            return (peerEl[i].value == '__all__') ? 
              undefined : peerEl[i].value;
          }
        }
      },
      addMessage : function ($msgLeader, $msgTrail) {
        var msgEl = qs.createEl('div'),
          leaderEl = qs.createEl('strong');
        leaderEl.appendChild(qs.createText('[' + self.formattedTime() + '] ' + $msgLeader));
        msgEl.appendChild(leaderEl);
        if (!!$msgTrail) {
          msgEl.appendChild(qs.createText(': ' + $msgTrail));
        }
        qs.ref('messages').appendChild(msgEl);
        qs.ref('messages').parentNode.scrollTop = qs.ref('messages').parentNode.scrollHeight;
      },
      stripLeaf : function ($p) {
        return $p.substr($p.lastIndexOf('/')+1)
      },
      formattedTime : function () {
        var t = new Date();
        return ( '0' + t.getHours() ).slice( -2 ) + ':' + 
          ( '0' + t.getMinutes() ).slice( -2 ) + ':' + 
          ( '0' + t.getSeconds() ).slice( -2 );
      },
      callIncoming : function ($peer, $data) {
        if (self.automaticAnswer === false) {
          if (confirm('Take a call from ' + $peer + '?')) {
            self.p.answer($peer, $data);
            self.addMessage('Taking a call from ' + $peer);
          } else {
            self.addMessage('Call from ' + $peer + ' rejected');
          }
        } else {
          self.addMessage('Taking a call from ' + $peer);
        }
      },
      fullScreenVideo : function ($video) {
        if ($video.requestFullscreen) {
          $video.requestFullscreen();
        } else if ($video.webkitRequestFullscreen) {
          $video.webkitRequestFullscreen();
        } else if ($video.mozRequestFullScreen) {
          $video.mozRequestFullScreen();
        } else if ($video.msRequestFullscreen) {
          $video.msRequestFullscreen();
        }
      }
    },
    statics : {
      ref : function($elem) {
        return document.getElementById($elem);
      },
      tag : function($elem, $trg) {
        return ($trg || document).getElementsByTagName($elem);
      },
      elem : function($elem) {
        return document.getElementsByName($elem);
      },
      createEl : function($elem) {
        return document.createElement($elem);
      },
      createText : function($txt) {
        return document.createTextNode($txt);
      }
    },
    fields : {
      username : '',
      automaticAnswer : false,
      data : {type:'div',id:"xsdk-video-call",children:[{node:'section',class:"major-box",children:[{node:'h2',children:["Remote video"]},{node:'video',autoplay:"autoplay",id:"remote-video"},{node:'input',type:"image",src:"../images/full-screen.png",id:"remote-full-screen",alt:"Go full screen",title:"Go full screen",height:"20",width:"20"}]},{node:'section',class:"minor-box",children:[{node:'h2',children:["Local video"]},{node:'video',autoplay:"autoplay",id:"local-video",muted:"true"},{node:'input',type:"image",src:"../images/full-screen.png",id:"local-full-screen",alt:"Go full screen",title:"Go full screen",height:"20",width:"20"}]},{node:'section',class:"vertical-bar",children:[{node:'h1',children:["Xirsys XSDK: WebRTC Example"]},{class:"box",children:[{node:'strong',children:["Your username:"]},{node:'span',id:"username-label",children:["[Not logged in]"]},{node:'button',id:"log-out",style:"visibility:hidden",children:["Log out"]}]},{id:"peers",children:[{node:'h2',children:["Peers:"]},{node:'button',id:"call-peer",children:["Call"]},{node:'button',id:"hang-up",children:["Hang up"]},{node:'br'},{node:'br'},{children:[{node:'input',type:"radio",name:"peer",value:"__all__",checked:"checked"},"[All peers]"]}]}]},{node:'section',class:"horizontal-bar",children:[{id:"messages",children:[{node:'h2',children:["Conversation thread:"]}]},{node:'form',id:"sendMessage",class:"message",children:["New message:",{node:'input',type:"text",id:"message"},{node:'button',type:"submit",children:["Send"]}]}]},{node:'section',class:"cover",children:[{node:'form',id:"login",children:[{node:'h2',children:["Username:"]},{node:'input',type:"text",id:"username",placeholder:"enter a username"},{node:'button',id:"login-btn",type:"submit",children:["Connect"]}]}]}]}
    }
  });

})();