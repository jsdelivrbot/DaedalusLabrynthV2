const _ = require('underscore');
const request = require('request');

var dataChannel;

const { WebClient } = require('@slack/client');

// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
const token = process.env.slackToken;

const web = new WebClient(token);

module.exports = function(controller) {
  
    controller.on("count_colors", function (bot, event, team) {

      var web = new WebClient(team.bot.token);
      var length = (team.users.length * 3)/2;
      var ready = false;

      var redCount = 0;
      var greyCount = 0;
      var greenCount = 0;
      
      _.each(team.users, function(user) {
        
        _.each(user.startBtns, function(btn) {
          
          if (btn == "danger") {
            redCount++;
          } else if (btn == "primary") {
            greenCount++;
          } else {
            greyCount++;
          }
            // console.Log("RedCount:" + redCount);
            // console.Log(greenCount);
            // console.Log(greyCount);
        });
      });
      
      if(redCount >= length || greenCount >= length || greyCount >= length) {
        console.log("we did it!");
         _.each(team.users, function(user) {
            web.im.list().then(function(list) {
              var thisIM = _.findWhere(list.ims, { user: user.userId });
              var channel = thisIM.id;
              var context = { user: user.userId, channel: channel };
              
              controller.makeCard(bot, context, 'input_nodes_1', 'default', {}, function(card) {
                bot.replyInteractive(event, card);
              });
            }).catch(err => console.log(err));
         });
      }      

    });
  
  
  
  
  
    // message sent in the labyrinth channel
    controller.on('ambient', function(bot, message) {
      
      var puzzleChat;
      web.channels.list().then((res) => {
          _.each(res.channels, function(channel) {
            if (channel.name == "labyrinthPuzzle")
              puzzleChat = channel;
          });
      });
      
      if (message.channel == puzzleChat.id) {
        // Message tagging event
        var theBot = bot;
      
        if (message.event.text.includes("#")) {
          // console.log(message.event.text.match(/#[a-z0-9_]+/g));
          controller.trigger('message_tagged', [bot, message, message.event.text.match(/#[a-z0-9_]+/g)]);
        } else {
          // trigger the tagging script in botkit studio
          controller.studio.runTrigger(bot, 'tagging', message.user, message.channel).catch(function(err) {
              bot.reply(message, 'I experienced an error with a request to Botkit Studio: ' + err);
          });
          
        }
      }
        

    });
    
    // Tagged a message
    controller.on('message_tagged', function(bot, message, tag) {
      
      // console.log(tag, message);
      
      // console.log(bot, "this bot is listening to taggs");
      // console.log(message, "this message is being tagged");
      var teamId = message.team.id ? message.team.id : message.team_id;
      var thisMessage = message;
      
        controller.storage.teams.get(teamId, function(err,team) {

          if (!team.puzzles) {
             bot.reply(thisMessage, "huh, looks like you haven't started working on that puzzle...are you using the right #tag?"); 
          }
          
          var puzzle = _.where(team.puzzles, { name: tag[0] });
          
          if (!puzzle.discussion) puzzle.discussion = [];
                    
          puzzle.discussion.push(thisMessage);
          
          // console.log(team.puzzles);
          
          console.storage.teams.save(team, function(err, id) {
            // console.log("team updated with tagged message");
          });

          if (err) {
            throw new Error(err);
          }

        });

    });
  
  // Player clicks a download button
  controller.on('download', function(params) {
    
    controller.storage.teams.get(params.team, function(err, team) {

      var bot = controller.spawn(team.bot);

      var log = {
        bot: bot, 
        team: params.team,
        phase: downloadPhase(params.file), 
        codeType: "download",
        puzzle: params.file,
        player: params.user
      }

      console.log(log.codeType, log.puzzle);

      controller.trigger('gamelog_update', [log]);

      // request.get(process.env.domain + '/download/' + event.actions[0].value);
      
    });
    
  });
  
  
  // Map event for sending team the map link
  controller.on("map_event", function(options) {
    
    // bot, message, channel, team
    
    // console.log("map event message: " + JSON.stringify(options.message));
    // Based on the format of "message", set the teamId
    var teamId;

    teamId = (options.team) ? options.team.id : 
      ((options.message.team_id) ? options.message.team_id : 
          ((options.message.team.id) ? options.message.team.id : options.message.team));

    var mapLink = "/" + teamId + "/map";
    // console.log(mapLink, "is the map link for this team" );
    
    if (options.channel) {
      // console.log(options.channel, "is the map channel to post in");
      // Send this message to the specified channel
      options.bot.say({
        'channel': options.channel.id,
        'text': 'Follow this link for the team map',
        'attachments': [
            {
              "title": "Team Map",
              "title_link": process.env.domain + mapLink,
            }
         ]
      });
      
    } else if (options.message) {
    
      // Reply to the user
      options.bot.reply(options.message, {
        'text': 'Follow this link for the team map',
        'attachments': [
            {
              "title": "Team Map",
              "title_link": process.env.domain + mapLink,
            }
         ]
      });
      
    }
    
  });
  
  var downloadPhase = function(file) {
    
    console.log(file);
    
    var thisPhase;
    var count = 0;
    
    
    const phases = {
      phase_1: ["Stars.png", "directions.png", "CypherWheel.png"],
      phase_4: ["TangramZip.zip", "Guide.png"]
    }
    
    _.each(phases, function(files, phase) {
      console.log(files, phase);
      if (files.includes(file)) {
        console.log("the phase, ", phase);
        thisPhase = phase;
      }
      count++;

    });
    
    if (count == Object.keys(phases).length) {
      console.log("we should return the phase, ", thisPhase);

      return thisPhase;
    }
  }

  
}