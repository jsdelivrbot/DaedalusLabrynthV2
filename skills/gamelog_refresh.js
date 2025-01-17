const _ = require("underscore");

const puzzleNames = {
  random: "Random Few Dots", 
  safari: "Safari Video", 
  glyph: "Abstract Symbols Glyph", 
  orb: "Special Orb",
  hole: "Few Dots Hole",
  bookshelf: "Secret Bookshelf", 
  aris_door: "Door Out of ARIS", 
  keypad: "Super Sneaky Keypad"
}

const eggNames = {
  chicken: "Clucking",
  snake: "Slithery", 
  shrimp: "Squishy", 
  lizard: "Scaly", 
  turtle: "Flipping"
}

const hatchNames = {
  chicken: "Hatched Chick",
  snake: "Snake", 
  shrimp: "Shrimp", 
  lizard: "Lizard", 
  turtle: "Turtle"
}

const evolveNames = {
  chicken: "Chicken",
  snake: "Crocodile", 
  shrimp: "Dragon", 
  lizard: "T-Rex", 
  turtle: "Sauropod"
}

const locationNames = {
  bpl: "the Boston Public Library",
  mit: "MIT", 
  aquarium: "the Aquarium" 
}

module.exports = function(controller) {
  
  controller.gamelogEvent = function(name, event, date) {
    
    var message = "_" + name + "_";
    
    switch (event.type) {
      case 'buttons': 
        message += " solved a puzzle with the code _" + controller.puzzleCodes[event.puzzle] + "_";
        break;
        
      case 'download': 
        message += " downloaded _*" + event.puzzle + "*_";
        break;
        
      case 'image_count': 
        message += " uploaded the last image needed for _*" + locationNames[event.puzzle] + "*_";
        break;
        
      case 'image_complete':
        message += " completed the image uploads and got code _*" + process.env.safe_code + "*_";
        break;
      
      case 'bookshelf': 
        message += " found a special line from the bookshelf! The line turned into a black hole and lead to node 5";
        break;
        
      case 'tamagotchi_complete': 
        message += " satiated the _*" + evolveNames[event.puzzle] + "*_, and was told to look at the _*" + controller.bookSpecs[event.puzzle] + "*_";
        break;
        
      case 'tamagotchi_evolve': 
        message += " fed and grew the _*" + hatchNames[event.puzzle] + "*_, and it evolved into a _*" + evolveNames[event.puzzle] + "*_";
        break;
        
      case 'tamagotchi_hatch':
        message += " hatched the _*" + eggNames[event.puzzle] + "*_ egg! They now have a _*" + hatchNames[event.puzzle] + "*_";
        break;
        
      case 'tamagotchi_egg': 
        message += " picked up the _*" + eggNames[event.puzzle] + "*_ egg";
        break;
        
      case 'safe': 
        message += " unlocked the safe with _" + process.env.safe_code + "_ in node 2, which lead to node 4";
        break;
        
      case 'telegraph_key': 
        var puzzle = parseInt(event.puzzle.replace("channel_", ""))
        message += " heard a phonograph message about Channel " + puzzle + " by putting in   *" + controller.telegraphKeys[puzzle - 1].toString().replace(/,/g, "  ") + "*   ";
        break;
      
      case 'remote': 
        message += " unlocked Channel " + parseInt(event.puzzle.split("_")[1]) + " with _" + controller.channelCodes[event.puzzle] + "_";
        break;
        
      case 'aris_door':
        message += " unlocked the door with the code _"  + process.env.aris_code + "_ out of node 5 and found node 6";
        break;
        
      case 'keypad':
        message += " put _" + process.env.keypad_code + "_ into the keypad and made it to the final node";
        break;
     }
    
    message += " on _" + date.toDateString() + "_\n\n";
    
    return message;
  }
   
  controller.gamelogRefresh = function(phase, team) {
          
    var text = "";
    var phaseEvents = team.gamelog["phase_" + phase];

    if (!phaseEvents || phaseEvents.length <= 0)
      return "no puzzles solved";
    
    _.each(phaseEvents, function(item) {

      var newLogMsg = controller.gamelogEvent(item.unlockedBy.name, item.event, item.date);

      text += newLogMsg;

    });

    return text;

  }
  
}