const _ = require("underscore");
const request = require("request");

module.exports = function(controller) {

  controller.confirmMovement = function(params) {

    var thread = params.thread ? params.thread : controller.determineThread(params.script, params.user);
    var vars = {};

    if (!thread)
      thread = 'default';

    console.log(params.user.codesEntered, params.data.value);

    // If this user has already entered this code
    if (params.user.codesEntered) {
      if (params.user.codesEntered.includes(params.data.value)) {
        // If there's a repeat thread, use that
        if (_.contains(params.script.threads, "repeat"))
          thread = "repeat";

        // If this is a channel, send them to the channel thread
        if (params.data.value.includes('channel')) {
          thread = "correct_" + parseInt(params.data.value.split('_')[1]);
          params.data.value = 'remote';
          vars.link = true;
        }

      }
    }

    if (params.data.value.includes('channel') && params.data.value != "animal_channel" && !params.user.codesEntered.includes(params.data.value)) {
      var channel = parseInt(params.data.value.split('_')[1]);
      vars.funnyDigits = controller.remoteCombos[channel - 1].join(" ");
      vars.channel = "Channel " + channel;
      params.data.value = 'remote';
      vars.link = true;
    }

    if (params.data.value == "prisoners_room") {
      var prisoners = _.where(params.team.users, { prisoner: true }).length;
      console.log(prisoners, " are the number of prisoners in the movement logic");

      vars.prisoners_length = process.env.prisoners_players - prisoners;
      vars.prisoners_started = params.team.prisoner_started;
      vars.prisoners_time = controller.prisoners_initial().toDateString();

      vars.prisoners_users = params.team.users;

      if (vars.prisoners_length < 0) vars.prisoners_length = 0;

      if (vars.prisoners_length == 2 || !params.team.prisoner_time || params.team.prisoner_time.length <= 0) {
        setTimeout(function() {
          controller.prisoners_time(params.bot, params.team.id, false);
        }, 2000);
      }

      setTimeout(function() {
        controller.prisoners_update(params.bot, params.team, params.event, "prison");
      }, 2000)

    }

    if (["drawer", "many_dots", "tv_guide", "pick_up_plaque", "few_dots", "remote", "safari", "animal_channel", "aris_projector", "desk", "prisoners_room"].includes(params.data.value))
      vars.link = true;

    if (["egg_table", "egg_table_dev"].includes(params.data.value) || vars.link) {
      vars.user = params.user.userId;
      vars.team = params.team.id;
    }

    vars.egg = params.data.value == "egg_table";

    controller.makeCard(params.bot, params.event, params.data.value, thread, vars, function(card) {
        // replace the original button message with a new one
        params.bot.replyInteractive(params.event, card);


        setTimeout(function() {

          if (params.data.value != "prisoners_room") return;
          
          var team = params.team;

          // Find the prisoner that belongs to the just-updated messages
          // We want to make sure we saved them as ready
          const thisPrisoner = _.findWhere(team.users, { "bot_chat": params.event.channel });
          console.log("time to do an extra check in the regular place", thisPrisoner);

          // If all players are ready, continue the game
          if (!thisPrisoner.prisoner) {
            // Check for unsaved but ready players
            team.users = _.map(team.users, function(user) {
              if (user.userId == event.user)
                user.prisoner = true;

              return user;
            });

            team.prisoner_players = _.where(team.users, { prisoner: true });

            controller.storage.teams.save(team, function(err, updated) {

              controller.prisoners_update(bot, updated, { user: "" }, "prison");

            });
          }

        }, 3000);

    });
  }

  controller.determineThread = function(script, user) {

    var thread;

    _.each(script.threads, function(t, v) {

      if (!thread || v.includes("combo")) {
        if (v.split("_").length > 1) {

          if (v.includes("combo")) {
            if (user.events) {

              _.each(user.events, function(event) {
                if (v.includes(event) && v.split("_")[2].includes(user.currentState))
                  thread = v;
              });

            }

          } else if (v.includes("state")) {
            if (user.currentState != 'default') {
              if (v.split("_")[1].includes(user.currentState))
                thread = v;
            }

          } else if (v.includes("event")) {

            if (user.events) {

              _.each(user.events, function(event) {
                if (v.includes(event))
                  thread = v;
              });

            }

          }

        }
      }

    });

    return thread;
  }
}
