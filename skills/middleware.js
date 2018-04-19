const _ = require("underscore");
// const gm = require("gm");
const http = require('http');
const fs = require('fs');
const request = require('request');
const { WebClient } = require('@slack/client');

var acceptedTypes = ['jpg', 'jpeg', 'png'];

module.exports = function(controller) {

    controller.middleware.receive.use(function(bot, message, next) {
    
//         // do something...
        // console.log('RCVD:', message);
      
        if (message.file) {
          if (acceptedTypes.indexOf(message.file.filetype) > -1) {
            var messId = message.team.id ? message.team.id : message.team;
            controller.storage.teams.get(messId, function(err, team){
              // console.log(messId, "is the team id");
              // console.log(team, "is the team");
              if(team.image_channel_id == message.channel) {
                controller.trigger("image_counter_upload", [{ bot:bot, message:message }]);
              }
            });
          }
          
        }
        next();
    
    });
    
    
    controller.middleware.send.use(function(bot, message, next) {
    
        // do something...
        // console.log('SEND:', message);
      
        if (message.type == "feedback") {
          controller.storage.teams.get(bot.config.id, function(err, team) {
            var token = team.oauth_token;

            var web = new WebClient(token);
            
            setTimeout(function() {
              web.groups.history(message.channel).then(res => {
                // console.log(res.messages);
                var thisMsg = _.findWhere(res.messages, { text: message.text });
                
                thisMsg.channel = message.channel;
                if (!team.image_channel_id) team.image_channel_id = thisMsg.channel;
                
                team.image_feedback = thisMsg;
                controller.storage.teams.save(team, function(err, saved) { 
                  console.log("saved") 
                });
              });
            }, 1000);
          });
        } else if (message.type == "already_complete") {
          controller.storage.teams.get(bot.config.id, function(err, team) {
            var token = team.oauth_token;

            var web = new WebClient(token);
            console.log(message);
            
            setTimeout(function() {
              web.groups.history(message.channel).then(res => {
                // console.log(res.messages);
                var thisMsg = _.findWhere(res.messages, { text: message.text });
                
                thisMsg.channel = message.channel;
                
                bot.api.chat.delete({ts: thisMsg.ts, channel: message.channel}, function(err, res) {
                    console.log(err, res);
                });
              });
            }, 1000);
            
          });
        }
      
        next();
    
    });

}