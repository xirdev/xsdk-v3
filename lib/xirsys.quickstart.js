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

  var self;

  var clz = $xirsys.class.create({
    namespace : 'quickstart',
    inherits : $xirsys.ui,
    constructor : function($data, $server) {
      self = this;
      self.events = $xirsys.events.getInstance();
      var d = self.connectionData = $xirsys.extend({}, $data);
      if (!d.room) d.room = 'default';
      if (!d.application) d.application = 'default';
      self.server = $server;
      self.secureTokenRetrieval = $data.secure == 1;
      window.onload = function () {
        clz.parse(clz.tag("body")[0], self.data);
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
          clz.ref('local-video'),
          clz.ref('remote-video')
        );
        clz.ref('login').onsubmit = this.loginSubmitHandler;
        clz.ref('log-out').onclick = this.logoutClickHandler;
        clz.ref('sendMessage').onsubmit = this.sendMessageHandler;
        clz.ref('call-peer').onclick = this.callPeerHandler;
        clz.ref('hang-up').onclick = this.hangUpHandler;
        clz.ref('local-full-screen').onclick = this.localFullScreenHandler;
        clz.ref('remote-full-screen').onclick = this.remoteFullScreenHandler;

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
          if ($msg.sender != name) {
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
        self.username = clz.ref('username').value.replace(/\W+/g, '');
        if (!self.username || self.username == '') {
          return;
        }
        clz.ref('login').parentNode.style.visibility = 'hidden';
        clz.ref('log-out').style.visibility = 'visible';
        self.connectionData.username = self.username;
        self.connectionData.automaticAnswer = self.automaticAnswer;
        p.open(self.connectionData);
      },
      logoutClickHandler : function ($event) {
        $event.preventDefault();
        self.username = '';
        while (clz.ref('username-label').hasChildNodes()) {
          clz.ref('username-label').removeChild(clz.ref('username-label').lastChild);
        }
        clz.ref('username-label').appendChild(clz.createText('[Not logged in]'));
        self.login.parentNode.style.visibility = 'visible';
        clz.ref('log-out').style.visibility = 'hidden';
        self.removeAllPeers();
        self.p.hangUp();
        self.detachMediaStream(clz.ref('local-video'));
        self.p.close();
      },
      sendMessageHandler : function ($event) {
        $event.preventDefault();
        if (!self.p.signal) {
          self.addMessage('You are not yet connected to the signalling server');
          return;
        }
        var peer = self.selectedPeer();
        if (!!peer) {
          self.p.signal.send('message', self.message.value, peer);
        } else {
          self.p.signal.send('message', self.message.value);
        }
        self.addMessage((!!peer) ? 'To ' + peer : 'To all peers', clz.ref('message').value);
        clz.ref('message').value = '';
      },
      callPeerHandler : function () {
        var peerName = self.selectedPeer();
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
        self.fullScreenVideo(clz.ref('local-video'));
      },
      remoteFullScreenHandler : function ($evt) {
        self.fullScreenVideo(clz.ref('remote-video'));
      },
      addPeer : function ($peerName) {
        if ($peerName == self.username) {
          while (clz.ref('username-label').hasChildNodes()) {
            clz.ref('username-label').removeChild(clz.ref('username-label').lastChild);
          }
          clz.ref('username-label').appendChild(clz.createText(self.stripLeaf($peerName)));
        } else {
          if (!clz.ref('peer-' + $peerName)) {
            var nodeEl = clz.createEl('div'),
              btnEl = clz.createEl('input');
            btnEl.setAttribute('type', 'radio');
            btnEl.setAttribute('name', 'peer');
            btnEl.setAttribute('value', $peerName);
            nodeEl.appendChild(btnEl);
            nodeEl.appendChild(clz.createText(self.stripLeaf($peerName)));
            nodeEl.id = 'peer-' + $peerName;
            nodeEl.className = 'peer';
            clz.ref('peers').appendChild(nodeEl);
          }
        }
      },
      removePeer : function ($peerName) {
        var nodeEl = clz.ref('peer-' + $peerName);
        clz.ref('peers').removeChild(nodeEl);
      },
      removeAllPeers : function () {
        var selectors = clz.tag('div', clz.ref('peers')),
          peerSelectors = [];
        for (var i = 0; i < selectors.length; i++) {
            if (selectors[i].className.indexOf('peer') !== -1) {
            peerSelectors.push(selectors[i]);
          }
        }
        for (var i = 0; i < peerSelectors.length; i++) {
          clz.ref('peers').removeChild(peerSelectors[i]);
        }
      },
      selectedPeer : function () {
        var peerEl = clz.name('peer');
        for (var i=0, l=peerEl.length; i<l; i++) {
          if (peerEl[i].checked) {
            return (peerEl[i].value == '__all__') ? 
              undefined : peerEl[i].value;
          }
        }
      },
      addMessage : function ($msgLeader, $msgTrail) {
        var msgEl = clz.createEl('div'),
          leaderEl = clz.createEl('strong');
        leaderEl.appendChild(clz.createText('[' + self.formattedTime() + '] ' + $msgLeader));
        msgEl.appendChild(leaderEl);
        if (!!$msgTrail) {
          msgEl.appendChild(clz.createText(': ' + $msgTrail));
        }
        clz.ref('messages').appendChild(msgEl);
        clz.ref('messages').parentNode.scrollTop = clz.ref('messages').parentNode.scrollHeight;
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
      name : function($elem) {
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
      data : {type: 'div', id: "xsdk-video-call", children: [
        {node: 'section', class: "major-box", children: [
          {node: 'h2', children: ["Remote video"]},
          {node: 'video', autoplay: "autoplay", id: "remote-video"},
          {node: 'input', type: "image", src: "../images/full-screen.png", id: "remote-full-screen", alt: "Go full screen", title: "Go full screen",  height: "20", width: "20"}
        ]},
        {node: 'section', class: "minor-box", children: [
          {node: 'h2', children: ["Local video"]},
          {node: 'video', autoplay: "autoplay", id: "local-video", muted: "true"},
          {node: 'input', type: "image", src: "../images/full-screen.png", id: "local-full-screen", alt: "Go full screen", title: "Go full screen", height: "20", width: "20"}
        ]},
        {node: 'section', class: "vertical-bar", children: [
          {node: 'h1', children: ["Xirsys XSDK: WebRTC Example"]},
          {class: "box", children: [
            {node: 'strong', children: ["Your username:"]},
            {node: 'span', id: "username-label", children: ["[Not logged in]"]},
            {node: 'button', id: "log-out", style: "visibility:hidden", children: ["Log out"]}
          ]},
          {id: "peers", children: [
            {node: 'h2', children: ["Peers:"]},
            {node: 'button', id: "call-peer", children: ["Call"]},
            {node: 'button', id: "hang-up", children: ["Hang up"]},
            {node: 'br'},
            {node: 'br'},
            {children: [
              {node: 'input', type: "radio", name: "peer", value: "__all__", checked: "checked"},
              "[All peers]"
            ]}
          ]}
        ]},
        {node: 'section', class: "horizontal-bar", children: [
          {id: "messages", children: [
            {node: 'h2', children: ["Conversation thread:"]}
          ]},
          {node: 'form', id: "sendMessage", class: "message", children: [
            "New message:",
            {node: 'input', type: "text", id: "message"},
            {node: 'button', type: "submit", children: ["Send"]}
          ]}
        ]},
        {node: 'section', class: "cover", children: [
          {node: 'form', id: "login", children: [
            {node: 'h2', children: ["Username:"]},
            {node: 'input', type: "text", id: "username", placeholder: "enter a username"},
            {node: 'button', id: "login-btn", type: "submit", children: ["Connect"]}
          ]}
        ]}
      ]}
    }
  });

})();
