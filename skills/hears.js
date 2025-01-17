

/*

WHAT IS THIS?

This module demonstrates simple uses of Botkit's `hears` handler functions.

In these examples, Botkit is configured to listen for certain phrases, and then
respond immediately with a single line response.

*/

var wordfilter = require('wordfilter');
var _ = require("underscore");
var dataChannel;
var fs = require('fs');



const { WebClient, RTMClient } = require('@slack/client');

// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
const token = process.env.slackToken;


module.exports = function(controller) {


  controller.hears('(.*)', 'ambient,direct_mention', function(bot,message) {

    // If we hear anything in the no-chat channels, delete it
    controller.storage.teams.get(message.team, function(err, team) {

      // if (team.noChatChannels.includes(message.channel))
      //   controller.deleteThisMsg(message, team.bot.app_token);
      // else {
      controller.dataStore(bot, message, "chat").catch(err => console.log('Chat datastore error: ', err));
      // }

    });

  });

  controller.hears('gamelog_update_kiwi', 'direct_message', function(bot, message) {

   if (message.match[0] != "gamelog_update_kiwi") return;

   var log = {
     bot: bot,
     team: bot.config.id,
   }

   controller.trigger('gamelog_update', [log]);
  });

  controller.hears('flavor_flave', 'direct_message', function(bot, message) {

    var botChannels = {};

    if (message.match[0] != "flavor_flave") return;

    controller.storage.teams.get(message.team, function(err, team) {

       _.each(team.users, function(user) {

          bot.api.im.open({ user: user.userId }, function(err, direct_message) {

            botChannels[user.userId] = direct_message.channel.id;

            console.log("onboarding this player", user);

            if (err) {
              console.log('Error sending onboarding message:', err);
            } else {
              controller.studio.get(bot, 'onboarding', user.userId, direct_message.channel.id).then(convo => {

                var template = convo.threads.default[0];
                template.username = process.env.username;
                template.icon_url = process.env.icon_url;

                convo.setVar("team", team.id);
                convo.setVar("user", user.userId);

                convo.activate();

              }).catch(function(err) {
                console.log('Error: encountered an error loading onboarding script from Botkit Studio:', err);
              });

            }

          });

       });

       setTimeout(function() {
         team.gameStarted = true;

         team.users = _.map(team.users, function(u) {

           u.bot_chat = botChannels[u.userId];
           u.startBtns = ["danger", "primary", "default"]
           return u;

         });

         controller.storage.teams.save(team, function(err, saved) {
            console.log(saved);
        });


       }, 1000 * team.users.length)

    });

  });

  controller.hears('grab', 'ambient,direct_message', function(bot,message) {

    if (process.env.environment != 'dev') return;
    controller.trigger("grab_text", [bot, message]);


  });



  controller.hears('timer_start', 'direct_message', function(bot,message) {
    if (process.env.environment != 'dev') return;
    controller.prisoners_time(bot, message.team, true);

  });

  controller.hears('chat', 'direct_message', function(bot,message) {
    if (process.env.environment != 'dev') return;
    controller.storage.teams.get(message.team, function(err, team) {
      var web = new WebClient(team.bot.token);

      web.conversations.list({types: "im"}).then(res => {
        team.users = _.map(res.channels, function(im) {
          console.log(im);
          var user = _.findWhere(team.users, { userId: im.user });
          if (im.is_im && user) {
            user.bot_chat = im.id;
            return user;
          }
        });

        team.users = _.filter(team.users, function(user) { return user != null });

        controller.storage.teams.save(team, function(err, saved) {
          console.log(saved, "saved team");
        });

      }).catch(err => console.log('im list error: ' + err));


    });


  });



  controller.hears('end_dilemma', 'direct_message', function(bot,message) {
    if (process.env.environment != 'dev') return;
    controller.storage.teams.get(message.team, function(err, team) {
      var web = new WebClient(bot.config.bot.token);

      team.prisoner_players = [];
      team.prisoner_started = false;
      team.prisoner_complete = false;

      team.prisoner_success = 0;
      team.prisoner_decisions = [];
      team.prisoner_time = {};

      team.users = _.map(team.users, function(user) {
        user.prisoner = false;
        return user;

      });

      controller.storage.teams.save(team, function(err, saved) {
        console.log(saved, "saved team");
      });

    });


  });

  controller.hears('clear', 'direct_message', function(bot,message) {
    if (process.env.environment != 'dev') return;
    controller.storage.teams.get(message.team, function(err, team) {
      var web = new WebClient(bot.config.bot.token);

      web.conversations.history(message.channel).then(res => {
        _.each(res.messages, function(ms) {
          var web = new WebClient(team.bot.app_token);
          setTimeout(function() {
            web.chat.delete(ms.ts, message.channel).then(res => {
              console.log(res);
            }).catch(err => console.log(err));
          }, 500 * res.messages.indexOf(ms));
        });
      }).catch(err => console.log(err));

    });


  });


  // Listen for
  controller.hears("^generate (.*)", 'direct_message,direct_mention', function(bot, message) {

    if (process.env.environment != 'dev') return;
    console.log(message, "in the hears");
    var options = {
      bot: bot,
      message: message,
      forced: true
    };

    // if the message is "generate player" then generate player data
    if (message.match[0] == "generate player") {
      options.player = true;
      controller.trigger('generation_event', [options]);
    } else if (message.match[0] == "generate dev") {
      options.player = false;
      // Otherwise, generate development data for each puzzle
      controller.trigger('generation_event', [options]);
    } else {
      bot.reply(message, {
        'text': "Hmm.. please specify if you want to generate dev or player data!"
      });
    }

  });

  controller.hears("prison", 'direct_message,direct_mention', function(bot, message) {

    if (process.env.environment != 'dev') return;
    if (message.match[0] != "prison") return;
    controller.studio.get(bot, 'keypad', message.user, message.channel).then(function(convo) {

      convo.changeTopic("correct");
      convo.activate();
    });

  });

  // controller.hears("reset_dilemma", 'direct_message', function(bot, message) {
  //   if (message.match[0] != "reset_dilemma") return;
  //
  //   controller.storage.teams.get(message.team, function(err, team) {
  //     controller.prisoners_check(bot, message.team, "Prison", false, function(users) {
  //       var web = new WebClient(team.bot.app_token);
  //       controller.prisoners_leftout(users);
  //     });
  //   });
  // });
  //
  controller.hears("check_dilemma", 'direct_message', function(bot, message) {
    if (message.match[0] != "check_dilemma") return;

    controller.storage.teams.get(message.team, function(err, team) {
      controller.trigger("prisoners_check", [bot, team.id]);
    });
  });

  controller.hears("continue_dilemma", 'direct_message', function(bot, message) {
    if (message.match[0] != "continue_dilemma") return;

    controller.storage.teams.get(message.team, function(err, team) {
      controller.prisoners_continue(bot, team);
      // controller.trigger("prisoners_continue", [bot, team]);
    });
  });

  controller.hears("players_get", 'direct_message', function(bot, message) {
    if (message.match[0] != "players_get") return;

    controller.storage.teams.get(message.team, function(err, team) {
      var web = new WebClient(bot.config.bot.token);
      var presentUsers = [];

      web.users.list().then(res => {
        _.each(res.members, function(user) {
          if (controller.isUser(user, false)) {
            presentUsers.push({
              userId: user.id,
              name: user.name,
              email: user.profile.email,
              startBtns: ["default", "primary", "danger"]
            });
          }
        });

        team.users = presentUsers;

        controller.storage.teams.save(team, function(err, saved) {
          console.log(saved.users);
        });
      });
    });
  });

  controller.hears("continue_dilemma", 'direct_message', function(bot, message) {
    if (message.match[0] != "continue_dilemma") return;

    controller.storage.teams.get(message.team, function(err, team) {
      const ready = _.where(team.prisoner_players, { "prisoner_ready": true });

      console.log(ready.length, team.prisoner_players.length);
      console.log("lets check and continue ", ready.length == team.prisoner_players.length);
      if (ready.length == team.prisoner_players.length) {
        controller.prisoners_continue(bot, team);
      }
    });
  });

  controller.hears("image_onboard_secret", 'direct_message,direct_mention', function(bot, message) {

    if (message.match[0] != "image_onboard_secret") return;
    controller.trigger("image_counter_onboard", [bot, message]);

  });

  controller.hears('image_refresh_secret', 'direct_message', function(bot, message) {

   if (message.match[0] != "image_refresh_secret") return;

   var log = {
     bot: bot,
     team: bot.config.id,
   }

   controller.storage.teams.get(message.team, function(err, team) {
     const bot = controller.spawn(team.bot);
     controller.imageRefresh(bot, message, team.image_channel_id, team)
      .then(res => console.log(res))
      .catch(err => console.log("image refresh error: ", err))
   })

  });

  controller.hears("prisoners_onboard", 'direct_message,direct_mention', function(bot, message) {

    if (process.env.environment != 'dev') return;
    controller.trigger("prisoners_onboard", [bot, message]);

  });


  var deleteThisMsg = function(message, token) {
    var web = new WebClient(token);

    web.chat.delete(message.ts, message.channel).then(res => {
      console.log(res);
    }).catch(err => console.log(err));

  }

  var botReply = function(params) {

    console.log(params[0], params[1]);

  };

};
