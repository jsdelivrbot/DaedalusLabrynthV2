const _ = require("underscore");
const request = require("request");
const fs = require('fs');
const { WebClient } = require('@slack/client');
const token = process.env.slackToken;
const web = new WebClient(token);

const cloudinary = require('cloudinary');
    
cloudinary.config({
  cloud_name: process.env.cloudinary_cloud_name,
  api_key: process.env.cloudinary_api_key,
  api_secret: process.env.cloudinary_api_secret
});

function isUser(member) {
  // console.log(member.name, "is the member being checked");
  // console.log(member.is_bot, member.name == "slackbot");
  if ( (member.is_bot && member.name != process.env.botName) || member.name == "slackbot")
    return false;
  else
    return true;
}

module.exports = function(controller) {
  
  controller.on("image_counter_onboard", function(bot, message) {

    var id = message.team.id ? message.team.id : message.team
    // add everyone to a picture-counting channel 
    controller.storage.teams.get(id, function(err, team) {
      
      var token = team.oauth_token;

      var web = new WebClient(token); 
      
      // console.log(_.pluck(team.users, 'userId'), message.user);
      
      web.groups.create("priva_image_counter").then((response) => {
        console.log(response);
        var channel = response.group;
        var channelId = channel.id;
        
        team.image_channel_id = channelId;
        
        controller.storage.teams.save(team, function(err, savedTeam) {
          console.log(err, savedTeam);
          console.log("WE SAVED THE TEAM AFTER MAKING THE CHANNEL");
          
          var data = _.map(team.users, function(user) {
            return [ web, user.userId, channelId, savedTeam.users.indexOf(user) ]
          });

          data.push([ web, savedTeam.bot.user_id, channelId, 1 ])

          var mapPromises = data.map(channelJoin);
          console.log("completed channel joins");

          var results = Promise.all(mapPromises);

          results.then(members => {
            console.log("completed promises");

            setTimeout(function() {
              controller.imageFeedback(bot, message, channelId, savedTeam);
            }, 100 * data.length);
            
          });

        });

        
      });
    });
  });
  
  // An image has been uploaded
  controller.on("image_counter_upload", function(params) {
    console.log(params.message.file.title);

    controller.storage.teams.get(params.message.team, function(err, team) {
                  
      var token = team.bot.app_token;

      if (team.imagesComplete) {

        deleteThisMsg(params.message, token, function() { 
          controller.studio.get(params.bot, "image_tag", params.message.user, params.message.channel).then(convo => {

            convo.changeTopic("all_complete");

            convo.activate();
          });
        });
        
        return;

      }

      var destination_path = 'tmp/uploaded/';

      // the url to the file is in url_private. there are other fields containing image thumbnails as appropriate
      var url = params.message.file.url_private;

      var opts = {
          method: 'GET',
          url: url,
          headers: {
            Authorization: 'Bearer ' + params.bot.config.bot.token, // Authorization header with bot's access token
          }
      };

      var filePath = destination_path + params.message.file.title;

      var stream = request(opts, function(err, res, body) {
          console.log('FILE RETRIEVE STATUS',res.statusCode);          
      }).pipe(fs.createWriteStream(filePath));

      stream.on("finish", function() {
        cloudinary.v2.uploader.unsigned_upload(destination_path + params.message.file.title, "image_counter_bot", 
            { resource_type: "image", tags: [ 'user_' + params.message.user, 'team_' + params.message.team ] },
           function(err, result) {
          console.log(err, result);
          fs.unlinkSync(filePath);
          // SAVE TO TEAM //
          // ************ //

          deleteThisMsg(params.message, token, function() { 

            console.log("deleted") 
            if (!team.uploadedImages) team.uploadedImages = [];

            team.uploadedImages.push({
              user_uploaded: params.message.user, 
              url: result.url, 
              date_uploaded: Date.now()
            });

            controller.storage.teams.save(team, function(err, id) {
              var vars = {
                image_url: result.url, 
                user: params.message.user
              };

              // upon image upload, show menu asking for player to tag the image location
              controller.studio.get(params.bot, "image_tag", params.message.user, params.message.channel).then(convo => {

                convo.threads.default[0].attachments[0].image_url = vars.image_url;

                convo.activate();
              });

            });

          });

        });

      });
      
    });
    
  });
  
  controller.on("image_tag_submit", function(params) {
    // SAVE TO TEAM //
    // ************ //
    controller.storage.teams.get(params.message.team.id, function(err, team) {
      
      var thread;
      var vars = {
        location: params.location
      };
      
      if(_.where(team.uploadedImages, { location: params.location }).length >= 6) {
        controller.makeCard(params.bot, params.message, 'image_tag', "already_complete", vars, function(card) {
          params.bot.replyInteractive(params.message, card);
        });
      } else {
        var updated = _.map(team.uploadedImages, function(image) {
          if (image.url == params.url) {
            image.location = params.location;
          }
          return image;
        });

        team.uploadedImages = updated;
        
        var taggedImages = _.filter(team.uploadedImages, function(image) {
          return image.location;
        });
        
        if (team.uploadedImages.length == 18) 
          team.imagesComplete = true;          
                
        controller.storage.teams.save(team, function(err, saved) {
          // console.log("saved team: ", saved);

          vars.count = _.where(saved.uploadedImages, { location: params.location }).length;
          vars.max = 6;

          deleteThisMsg(params.message, team.oauth_token, function() {
            
            if(saved.imagesComplete) {
              vars.code = process.env.safe_code.replace(/-/g, "").toString();
              controller.makeCard(params.bot, params.message, 'image_tag', "complete", vars, function(card) {
                params.bot.replyInteractive(params.message, card);            
              });
            } else {

              deleteThisMsg(team.image_feedback, team.oauth_token, function() {
                controller.imageFeedback(params.bot, params.message, saved.image_channel_id, saved);
                
                if (saved.imagesComplete) {
                  controller.studio.get(params.bot, "image_tag", params.message.user, params.message.channel).then(convo => {

                    convo.changeTopic("all_complete");

                    convo.activate();
                  });
                }
                
              });

            } 

          });

        });
      }
    });
  });
  
  var channelCreate = function channelCreate(name) {
      
      // Create the channel
      return web.channels.join(name).then((res) => {
        
      }).catch((err) => { console.log(err) }); // End channels.join call 
      
  }; // End channel create

  var channelJoin = function channelJoin(params) {

    if (!params) return;
   // Set a timeout for 1 sec each so that we don't exceed our Slack Api limits

    setTimeout(function() {
      var member = params[1].toString();
      var channel = params[2].toString();
      var web = params[0];
      // console.log(member["userId"].toString(), "is the member that will join " + channel);

      // check if user is bot before adding
      // TODO check if user is already in channel
      if (member) {

        web.groups.info(channel).then(channelData => {
          // console.log(channelData.channel, "are the members in this current channel");
          
          if (channelData && channelData.group.members.indexOf(member) < 0) {
            // Invite each user to the labyrinth chat channel
            return web.groups.invite(channel, member)
              .then(res => {
                // console.log(res, "is the channel res");
                return member;
              }).catch((err) => { console.log(err) });

          } else {
            return "filled";
          }
        }).catch(err => console.log(err));


      }

    }, 100 * (params[3]+1));

  };// End channel Join
  
  var deleteThisMsg = function(message, token, callback) {
    
    // console.log(message, "we are deleting this");
    
    var ts = message.message_ts ? message.message_ts : message.ts;
    
    var web = new WebClient(token);
      
    web.chat.delete(ts, message.channel).then(res => {
      // console.log(res, "deleted");
      callback();
    }).catch(err => console.log(err));
  }
}