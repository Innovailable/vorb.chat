# vorb.chat

## Introduction

This is a WebRTC based video chat platform. It is using peer to peer
connections and end to end encryption. It supports two to around four
participants in a conversation (based on bandwidth).

A server module for more concurrent participants in a conversation might be
added later.

The project is based on [rtc-lib](https://github.com/Innovailable/rtc-lib) and
uses [calling-signaling](https://github.com/Innovailable/calling-signaling) as
signaling server. If you would like to integrate something like this into your
project feel free to contact us at mail@innovailable.eu.

## Usage

To start the webpack dev server run

    make serve

To create everything you need to deploy in the `dist` directory run

    make dist

This repository contains only the webinterface. It depends on a signaling
server (see
[calling-signaling](https://github.com/Innovailable/calling-signaling)), a STUN
server and TURN server (optional).

There are currently the following configuration options:

* `SIGNALING_URI`: the URI of the signaling server websocket (to run your own see [calling-signaling](https://github.com/Innovailable/calling-signaling))
* `STUN_URI`: the URI of the turn server
* `TURN_CONFIG`: JSON string containing an object describing the TURN server or an array of those objects

The web application should work without configuring anything. The default
configuration points to our public signaling and STUN servers. Please note that
you will share room names with everybody else using the same method for now.

