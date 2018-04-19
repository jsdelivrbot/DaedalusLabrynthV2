const _ = require("underscore");
const fs = require('fs');
const request = require('request');


// Script for generation event
// Pulls scripts with a certain tag for team puzzle data 
    
var team, 
    user, 
    channel;

module.exports = function(controller) {
  
  controller.on("state_change", function(options) {
    
    console.log(options.key, "in the state change");
    var res = options.team;
    var code = options.key.code;

    // safety check
    if (!res.events) res.events = [];
    if (!res.codesEntered) res.codesEntered = [];
    // safety check
    if (!res.currentState) {
      res.currentState = "default";
    }
    
    var thread = 'correct';

    if (options.codeType == 'buttons' || options.codeType == "telegraph_key")
      thread += '_' + code;
    
    console.log(thread, "is the thread");
    
    // Has the player already entered this code?
    if (res.codesEntered.includes(code) && !['bookshelf', 'telegraph_key'].includes(options.codeType) && code !== "orb") {
      var vars = {};
      
      if (options.codeType == 'buttons') vars.recap = thread;
      
      controller.makeCard(options.bot, options.event, options.codeType, 'repeat', vars, function(card) {
        // replace the original button message with a new one
        options.bot.replyInteractive(options.event, card);

      });
      
    } else {
      
      if ('bookshelf' !== options.codeType)
        res.codesEntered.push(code);
      
      if (options.phaseUnlocked) {
        if (!res.phasesUnlocked) res.phasesUnlocked = ["phase_1"];
        res.phasesUnlocked.push(options.phaseUnlocked);
      }
      
      if (['random', 'safe'].includes(code)) {
        
        if (!res.events.includes(code))
            res.events.push(code);
        
      } else if (code == "orb") {
        var thisUser = _.findWhere(res.users, { userId: options.user });
        thisUser.hasOrb = true;
        res.users = _.map(res.users, function(user) {
          if (user.userId == thisUser.userId)
            return thisUser;
          else 
            return user;
        });
      } else {
        res.currentState = findState(res.currentState, code);
      }

      controller.storage.teams.save(res).then((updated) => {

        controller.studio.getScripts().then(scripts => {
          // console.log("We saved this new team state", updated);
          var vars = {};
          
          var thisScript = _.findWhere(scripts, { name: options.codeType });
          console.log(thisScript);
          var thisPhase = _.filter(thisScript.tags, function(tag) {
            return tag.includes('phase');
          })[0];

          console.log(thisPhase);
          console.log(thread + " is the thread we are going to in the " + options.codeType + " script");

          var log = {
            bot: options.bot, 
            team: options.event.team.id ? options.event.team.id : options.event.team,
            phase: thisPhase, 
            event: options.event,
            codeType: options.codeType,
            player: options.event.user
          }
          
          if (log.codeType == "buttons" || log.codeType == "telegraph_key")
            log.puzzle = code;
          else if (["bookshelf", "safe", "aris_door"].includes(log.codeType))
            log.puzzle = log.codeType;
          
          if (log.codeType == "telegraph_key") {
             vars.mp3 = log.puzzle; 
          }
          
          console.log(log.codeType, log.puzzle);

          controller.trigger('gamelog_update', [log]);

          controller.makeCard(options.bot, options.event, options.codeType, thread, vars, function(card) {
            // console.log(card, "is the card from the state change");
            // replace the original button message with a new one
            options.bot.replyInteractive(options.event, card);

          });
        });
        

      }); 
    }

    
  }); // End on event
}


var findState = function(currentState, event) {
      var newState;
  
      switch(currentState.toLowerCase()) {

        // everything is normal
        case 'default':
          
          switch(event) {
                
            case 'safari':
              
              // safari video state
              newState = "a"
              
              break;
              
            case 'hole':
              
              // hole state
              newState = "b"
              console.log(newState);
              break;
            
            case 'glyph':
              
              // abstract painting glyph state
              newState = "c"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;

        // video
        case 'a':
          
          switch(event) {
              
            case 'hole':
              
              newState = "e"
              
              break;
              
            case 'glyph':
              
              newState = "d"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
          
        // hole
        case 'b':
          
          switch(event) {
              
            case 'safari':
              // hole and video
              newState = "e"
              
              break;
              
            case 'glyph':
              // hole and glyph
              newState = "f"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
        
        // glyph
        case 'c':
          
          switch(event) {
              
            case 'safari':
              
              newState = "d"
              
              break;
              
            case 'hole':
              
              newState = "f"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
          
        // video and glyph
        case 'd':
          
          switch(event) {
              
            case 'hole':
              // everything
              newState = "g"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
          
        // hole and video
        case 'e':
          
          switch(event) {
              
            case 'glyph':
              // everything
              newState = "g"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;
          
        // hole and glyph
        case 'f':
          
          switch(event) {
              
            case 'safari':
              
              // everything
              newState = "g"
              
              break;
              
            default: 
              newState = currentState.toLowerCase();
              break;
              
          }

          break;

      }
  
  return newState;
  
}