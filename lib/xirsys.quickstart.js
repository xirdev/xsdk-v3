/*********************************************************************************
  The MIT License (MIT) 

  Copyright (c) 2014 XirSys

  @author: Lee Sylvester
  @contributor: Jerry Chabolla

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
        // qs.ref('local-full-screen').onclick = this.localFullScreenHandler.bind(self);
        qs.ref('remote-full-screen').onclick = this.remoteFullScreenHandler.bind(self);
        qs.ref('hideColumn').onclick = this.hideColumn.bind(self);
        qs.ref('showColumn').onclick = this.showColumn.bind(self);
        qs.ref('peers').onclick = this.doSelectPeer.bind(self);
        qs.ref('chat-btn').onclick = this.doChat.bind(self);
        qs.ref('remote-username').querySelectorAll('#hang-up')[0].onclick = this.hangUpHandler.bind(self);
        self.remotePeerName = document.querySelectorAll('#remote-username .title-text')[0];
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
            self.onMessage({
              sender: self.stripLeaf($msg.sender),
              data: $msg.data
            })
          }
        });
        
        self.events.on($xirsys.p2p.offer, function ($evt, $peer, $data) {
          self.callIncoming($peer, $data);
        });
        
        self.events.on($xirsys.signal.error, function ($evt, $msg) {
          console.error('error: ', $msg);
          self.addMessage('ERROR',{
            internal: true,
            type: 'There has been an error in the server connection.'
          });
        });

        self.events.on($xirsys.p2p.iceDisconnected, function ($evt) {
          self.callEnd($evt);
        });

        self.events.on($xirsys.p2p.requestDenied, function ($evt, $msg) {
          console.log('requestDenied !!!!!');
          self.callDenied($evt, $msg);
        });
        document.addEventListener("fullscreenchange", self.FShandler);
        document.addEventListener("webkitfullscreenchange", self.FShandler);
        document.addEventListener("mozfullscreenchange", self.FShandler);
        document.addEventListener("MSFullscreenChange", self.FShandler);
      },
      loginSubmitHandler : function ($event) {
        $event.preventDefault();
        self.username = qs.ref('username').value.replace(/\W+/g, '');
        if (!self.username || self.username === '') {
          return;
        }
        qs.ref('login').parentNode.style.visibility = 'hidden';
        qs.ref('log-out').style.visibility = 'visible';
        qs.ref('log-out').className = 'sign-out-grn menu-icon-btns';
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
        qs.ref('username-label').appendChild(qs.createText('User name'));
        qs.ref('log-out').className = 'sign-out menu-icon-btns';
        self.login.parentNode.style.visibility = 'visible';
        self.removeAllPeers();
        if (self.remoteChatRequest === undefined) {
          self.callEnd();
        }
        self.detachMediaStream(qs.ref('local-video'));
        self.p.close();
      },
      sendMessageHandler : function ($event) {
        $event.preventDefault();
        if (!self.p.signal) {
          self.addMessage('INFO', {
            internal : true, 
            type : 'msg-alert', 
            message: 'You are not yet logged into the chat.'
          });
          return;
        }
        var msg = qs.ref('message').value;
        if (msg.length == 0) return;
        self.sendMsg(msg, self.removeChatRequest.peer);
        self.addMessage(self.username, msg);
        qs.ref('message').value = '';
      },
      callPeerHandler : function () {
        if (!!self.remoteChatRequest.peer) {
          addMessage('ERROR', {
            internal: true,
            type: 'msg-alert',
            message: 'Only a one-on-one peer conversation is currently allowed. Please end this call to chat with another user.'
          });
          if (!self.chatOn) showChat(true);
          return;
        }
        var peerName = self.selectedPeer.call(self);
        if (!!peerName) {
          self.p.call(peerName);
          self.callStart(peerName);
        } else {
          self.addMessage('ERROR', {
            internal: true,
            type: 'msg-alert',
            message: 'You must select a single peer before initiating a call.'
          });
        }
      },
      hangUpHandler : function () {
        self.callEnd();
      },
      localFullScreenHandler : function ($evt) {
        self.fullScreenVideo(qs.ref('local-video'));
      },
      remoteFullScreenHandler : function ($evt) {
        self.fullScreenVideo(qs.ref('remote-video'));
      },
      showColumn : function ($evt) {
        $evt.target.style.display = 'none';
        var col = qs.clsel('vertical-bar')[0];
        col.style.display = "unset";
      },
      hideColumn : function ($evt) {
        var col = qs.clsel('vertical-bar')[0];
        col.style.display = 'none';
        qs.ref('showColumn').style.display = 'unset';
      },
      addPeer : function ($peerName) {
        if ($peerName == self.username) {
          while (qs.ref('username-label').hasChildNodes()) {
            qs.ref('username-label').removeChild(qs.ref('username-label').lastChild);
          }
          qs.ref('username-label').appendChild(qs.createText(self.stripLeaf($peerName)));
        } else {
          if (!qs.ref('peer-' + $peerName)) {
            var imgEl = qs.createEl('div');
            imgEl.className = 'user-icon-img peer-icon';
            var txtEl = qs.createEl('span');
            txtEl.className = 'sr-only peer-label';
            txtEl.textContent = self.stripLeaf($peerName);
            var nodeEl = qs.createEl('div');
            nodeEl.appendChild(imgEl);
            nodeEl.appendChild(txtEl);
            nodeEl.id = 'peer-' + $peerName;
            nodeEl.className = 'peer';
            qs.ref('peers').appendChild(nodeEl);
          }
        }
      },
      removePeer : function ($peerName) {
        var nodeEl = qs.ref('peer-' + $peerName);
        var curSel = self.selectedPeer(true);
        if (!!curSel && curSel.id == nodeEl.id) {
          self.setSelectedPeer(curSel, false);
        }
        console.log('removing:', nodeEl);
        qs.ref('peers').removeChild(nodeEl);
      },
      removeAllPeers : function () {
        var selectors = qs.tag('div', qs.ref('peers')), i,
          peerSelectors = [];
        for (i = 0; i < selectors.length; i++) {
            if (selectors[i].className.indexOf('peer') !== -1) {
            peerSelectors.push(selectors[i]);
          }
        }
        for (i = 0; i < peerSelectors.length; i++) {
          qs.ref('peers').removeChild(peerSelectors[i]);
        }
      },
      selectedPeer : function ($returnObj) {
        var peerEl = qs.clsel('peer');
        for (var i=0, l=peerEl.length; i<l; i++) {
          var peer = peerEl[i];
          if (peer.classList.contains('selected')) {
            if (peer.id == '__all__') return undefined;
            return (!!$returnObj) ? 
              peer : (peer.id).substr(5);
          }
        }
      },
      setSelectedPeer : function ($peer, $setting) {
        if ($setting == undefined) $setting = true;
        var sel = self.selectedPeer(true);
        if (!!sel) {
          sel.classList.remove('selected');
          if (sel.id == $peer.id) {
            qs.elem('call-peer').className = 'start-call menu-icon-btns';
            return;
          }
        }
        qs.elem('call-peer').className = 'start-call-grn menu-icon-btns';
        $peer.classList.add('selected');
      },
      doSelectPeer : function ($evt) {
        var tar = $evt.target;
        if (tar.classList.contains('peer')) self.setSelectedPeer(tar);
      },
      doChat : function ($evt) {
        self.showChat(!self.chatOn);
      },
      onMessage : function ($evt) {
        console.log('onMessage:', $evt.data);
        var peer = self.remoteChatRequest.peer;
        if (!!peer) {
          if ($evt.sender == peer) self.addMessage(peer, $evt.data);
        } else {
          self.addMessage($evt.sender, $evt.data);
        }
      },
      sendMsg : function ($msg, $peer) {
        self.p.signal.send('message', $msg, (!!$peer) ? $peer : null);
      },
      addMessage : function ($from, $msg) {
        //msg-user, msg-peer, msg-alert, msg-info
        var msgClass = 'chat-msg ' + ($from === self.username ? 'msg-user' : 'msg-peer');
        //for internal messages. (used obj in from to avoid spoofing.)
        if (typeof($msg) === 'object') {
          var type = $msg.type;
          //action message.
          if (type === 'action') {
            console.log('action:', $msg.code, 'peer:', $msg.peer, 'cur:', self.remoteChatRequest.peer);
            if ($msg.code === 'rtc.p2p.close' && self.remoteChatRequest.peer == $msg.peer) {
              self.callEnd();
              return;
            } else if ($msg.code === 'rtc.p2p.deny' && self.remoteChatRequest.peer == $msg.peer) {
              type = 'msg-alert'; //convert action to alert
              self.callEnd(null, true);
            } else {
              // PATCH: sends an extra call when end video chat
              return;
            }
          }
          if (!!$msg.from) $from = $msg.from;
          var msgClass = 'chat-msg ' + type;
          $msg = $msg.message;
        }
        var msgContainer = self.createMsgBox($from, $msg, msgClass);
        //user message container
        qs.ref('messages').appendChild(msgContainer);
        qs.ref('messages').scrollTop = qs.ref('messages').scrollHeight;
      },
      createMsgBox : function($from, $msg, $class) {
        // date sent
        var d = new Date(),
            hr = d.getHours().toString(), 
            min = d.getMinutes().toString(),
            msgTime = (hr.length == 1 ? 0+hr : hr)+":"+(min.length == 1 ? 0+min : min),
            //from name txt and message time text
            sentLbl = qs.createEl('span'),
            timeLbl = qs.createEl('span'),
            msgEl = qs.createEl('div'),
            headerTxt = qs.createEl('div'),
            msgContainer = qs.createEl('div'),
            nm = headerTxt.appendChild(sentLbl),
            tm = headerTxt.appendChild(timeLbl);
        
        sentLbl.innerHTML = $from.toUpperCase()+': ';
        timeLbl.innerHTML = msgTime;
        //header container for name and time ele.
        nm.className = 'msg-from';
        tm.className = 'msg-time';
        headerTxt.className = 'msg-header';
        //message text
        msgEl.innerHTML = $msg;
        msgContainer.appendChild(headerTxt);
        msgContainer.appendChild(msgEl);
        //msg-user, msg-alert, msg-info
        if (!!$class) msgContainer.className = $class;
        return msgContainer;
      },
      stripLeaf : function ($p) {
        if ($p === undefined) return '';
        return $p.substr($p.lastIndexOf('/')+1)
      },
      showChat : function ($show) {
        // relevent information.
        qs.ref('chatHistory').style.display = !$show ? 'none' : 'inherit';
        qs.ref('sendMessage').style.display = !$show ? 'none' : 'inherit';
        qs.ref('chat-btn').style.backgroundColor = !$show ? '#797979' : '#81b75c';
        console.log('showChat', $show, ', display:', qs.ref('chatHistory').style.display);
        self.chatOn = $show;
        qs.ref('messages').scrollTop = qs.ref('messages').scrollHeight;
        if (self.chatOn && self.isFullScreen() ){
          self.fullScreenVideo();
        }
      },
      callIncoming : function ($peer, $data) {
        console.log('callIncoming', $peer, '  -  insession: ', (!!self.remoteChatRequest.peer));
        console.log('callIncoming - auto answer:', self.automaticAnswer);
        if (self.automaticAnswer === false) {
          if (confirm('Take a call from ' + $peer + '?')) {
            self.p.answer($peer, $data);
            self.callStart($peer);
            self.addMessage('INFO', {
              internal: true, 
              type: 'msg-info', 
              message: 'Taking a call from ' + $peer
            });
          } else {
            self.addMessage('INFO', {
              internal: true, 
              type: 'msg-alert', 
              message: 'You rejected a call request from ' + $peer + '.'
            });
            console.log('Denied Call: ', $peer); //action
            self.sendMsg({
              internal: true,
              type: 'action',
              code: 'rtc.p2p.deny',
              peer: self.username,
              message: self.username + ' denied your call request.',
              from: 'INFO'
            }, $peer);
          }
        } else {
          self.addMessage('INFO', {
            internal: true,
            type: 'msg-info',
            message: 'Taking a call from ' + $peer
          });
          self.callStart($peer);
        }
      },
      fullScreenVideo : function ($video) {
        if (self.isFullScreen()) {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
        } else {
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
      FShandler : function () {
        if (self.isFullScreen()) {
          qs.ref('remote-full-screen').className = 'remote-fs-selected'
          if (qs.ref('showColumn').style.display != 'none') {
            qs.ref('showColumn').style.visibility = 'hidden';
          }
        } else {
          qs.ref('remote-full-screen').className = 'remote-fs-unselected'
          if (qs.ref('showColumn').style.display != 'none') {
            qs.ref('showColumn').style.visibility = 'visible';
          }
        }
      },
      isFullScreen : function () {
        return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      },
      callStart : function ($peerName) {
        self.remotePeerName.innerHTML = $peerName;
        self.remoteChatRequest = {peer:$peerName};

        qs.ref('hang-up').className = 'end-call-grn menu-icon-btns';

        //udpate indicator in userlist item
        var sel = qs.ref('peer-' + self.remoteChatRequest.peer);
        if (!!sel) {
          var pIcon = sel.getElementsByClassName('user-icon-img')[0];
          if (!!pIcon)
            pIcon.className = 'user-icon-img-grn';
        }
        //hide chat by default
        self.showChat(false);
        //show remote video elements.
        var majBox = qs.clsel('major-box')[0];
        if (majBox.classList.contains('hide-vid')) majBox.classList.remove('hide-vid');
        var minBox = qs.clsel('minor-box')[0];
        if (minBox.classList.contains('box-standby')) minBox.classList.remove('box-standby');
        qs.ref('remote-video').style.visibility = 'visible';

        //show buttons
        qs.ref('remote-username').style.visibility = 'visible';
        qs.ref('video-menu').style.visibility = 'visible';
        console.log('callStart:', self.remoteChatRequest);
      },
      callEnd : function ($evt, $denied) {
        console.log('*** callEnd, peer:', self.remoteChatRequest.peer);
        self.remotePeerName.innerHTML = 'No Caller';
        qs.ref('hang-up').className = 'end-call menu-icon-btns';
        self.p.hangUp();
        if (self.remoteChatRequest.peer === undefined) return;
        var sel = qs.ref('peer-' + self.remoteChatRequest.peer);
        if (!!sel) {
          var pIcon = sel.getElementsByClassName('user-icon-img-grn')[0];
          if (!!pIcon)
            pIcon.className = 'user-icon-img';
        }
        self.showChat(true);
        var majBox = qs.clsel('major-box')[0];
        if (!majBox.classList.contains('hide-vid')) majBox.classList.add('hide-vid');
        var minBox = qs.clsel('minor-box')[0];
        if (!minBox.classList.contains('box-standby')) minBox.classList.add('box-standby');
        qs.ref('remote-video').style.visibility = 'hidden';
        qs.ref('remote-username').style.visibility = 'hidden';
        qs.ref('video-menu').style.visibility = 'hidden';
        if (!$denied) {
          self.sendMsg({
            internal: true,
            type: 'action',
            code: 'rtc.p2p.close',
            peer: self.username
          },
          self.remoteChatRequest.peer);
        }
        self.remoteChatRequest = {};
        if (self.isFullScreen()) {
          self.fullScreenVideo();
        }
      },
      callDenied : function ($evt, $msg) {
        if ($msg.code === 'user.insession') {
          var peer = self.remoteChatRequest.peer;
          self.callEnd($evt, true);
          self.addMessage('ERROR', {
            internal: true,
            type: 'msg-alert',
            message: peer + 'is currently in a session, please try again later.'
          });
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
      clsel : function($elem) {
        return document.getElementsByClassName($elem);
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
      chatOn : true,
      remoteChatRequest : {}, //user requesting to chat
      automaticAnswer : false,
      data : {
        type: 'div',
        id: "xsdk-video-call",
        children: [{
          node: 'section',
          class: "vertical-bar",
          children: [{
            id: 'userInfo',
            children: [{
              node: 'h1',
              class: 'title-text',
              id: 'username-label',
              children: ["Username"]
            }, {
              children: [{
                class: "box",
                id: "log-out",
                class: "menu-icon-btns",
                children: [{
                  node: "text",
                  children: ["LOGOUT"]
                }]
              }, {
                id: "call-peer",
                class: "menu-icon-btns",
                children: [{
                  node: "text",
                  children: ["CALL"]
                }]
              }, {
                id: "hang-up",
                class: "menu-icon-btns",
                children: [{
                  node: "text",
                  children: ["HANG UP"]
                }]
              }]
            }, {
              id: "hideColumn",
              class: "hide-btn"
            }]
          }, {
            id: "peers"
          }]
        }, {
          id: "right-pane",
          children: [{
            node: "section",
            class: "major-box fb-col-item hide-vid",
            children: [{
              node: "video",
              id: "remote-video",
              autoplay: "autoplay"
            }, {
              node: "section",
              class: "minor-box box-standby",
              children: [{
                node: "video",
                id: "local-video",
                autoplay: "autoplay",
                muted: "true"
              }]
            }, {
              id: "remote-username",
              children: [{
                id: "hang-up",
                class: "rounded-btn end-call-wt"
              }, {
                node: "h1",
                class: "title-text",
                children: ["No Caller"]
              }]
            }, {
              id: "video-menu",
              children: [{
                id: "remote-full-screen",
                class: "rounded-btn",
                children: [{
                  class: "expand"
                }]
              }, {
                id: "chat-btn",
                class: "rounded-btn",
                children: [{
                  class: "chat-on"
                }]
              }]
            }, {
              id: "co-logo",
              class: "brand-logo"
            }, {
              id: "showColumn",
              class: "hide-btn"
            }]
          }, {
            node: "section",
            id: "chatHistory",
            class: "horizontal-bar fb-col-item",
            children: [{
              id: "messages"
            }]
          }, {
            node: 'form',
            id: "sendMessage",
            class: "message",
            children: [{
              node: 'input',
              type: "text",
              id: "message",
              autocomplete: "off",
              placeholder: "Enter chat text here"
            }, {
              node: 'button',
              id: "submit-btn",
              type: "submit"
            }]
          }]
        }, {
          node: 'section',
          class: "cover",
          children: [{
            node: 'form',
            id: "login",
            children: [{
              node: 'h1',
              id: "heading",
              children: ["Welcome"]
            }, {
              node: 'input',
              type: "text",
              id: "username",
              placeholder: "Enter your name"
            }, {
              node: 'button',
              id: "login-btn",
              type: "submit",
              children: ["CONNECT"]
            }]
          }]
        }]
      }
    }

  });

})();