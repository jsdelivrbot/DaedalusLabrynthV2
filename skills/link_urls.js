// Holds Link Urls object

// In studio urls should have this format:
// https://daedalusgame/link/LINK_NAME/{{vars.team}}/{{vars.user}}
// where LINK_NAME matches a key in the linkUrls object

https://daedalusgame/link/prisoners_steal/{{vars.team}}/{{vars.user}}

module.exports = function(controller) {

  controller.linkUrls = {
    "intro_video": "https://vimeo.com/276042721/05a58f2195",
    "safari_video": "https://vimeo.com/276042755/df1e47b928",
    "animal_channel": "https://vimeo.com/264486697/36cf124da8",
    "channel_1": "https://vimeo.com/264470344/ae1b908ca2",
    "channel_2": "https://vimeo.com/264470453/51a29f36b4",
    "channel_3": "https://vimeo.com/264470579/2297a95ee9",
    "channel_4": "https://vimeo.com/264470710/5afc4ee39f",
    "channel_5": "https://vimeo.com/264470816/d650932c55",
    "channel_6": "https://vimeo.com/264470908/659cf21f02",
    "channel_7": "https://vimeo.com/264471034/8d4da555b2",
    "channel_8": "https://vimeo.com/264471150/69a3fb3dee",
    "channel_9": "https://vimeo.com/264471288/f3c7f6552b",
    "aris": "https://vimeo.com/271473314/d09ad733eb",
    "aris_android": "http://res.cloudinary.com/extraludic/raw/upload/v1528919104/ARIS.apk.zip",
    "aris_ios": "https://itunes.apple.com/us/app/aris/id371788434?mt=8",
    "telegraph_1": "https://vimeo.com/265778846/d478c7e3fe",
    "telegraph_2": "https://vimeo.com/265778865/bd70cd883f",
    "telegraph_3": "https://vimeo.com/265778862/262c662ec1",
    "telegraph_4": "https://vimeo.com/265778829/b0cfe5884e",
    "telegraph_5": "https://vimeo.com/265778814/a434f07b8f",
    "telegraph_6": "https://vimeo.com/265778856/c1f348f4fb",
    "telegraph_7": "https://vimeo.com/265778848/12e96652d6",
    "telegraph_8": "https://vimeo.com/265778808/be4518756e",
    "telegraph_9": "https://vimeo.com/265778833/3a9e474031",
    "tamagotchi": "https://vimeo.com/276042849/eadeb8b59b",
    "prisoners_intro": "https://vimeo.com/276045361/3660b5fee7",
    "prisoners_share": "https://vimeo.com/276045432/22ce4e535f",
    "prisoners_eliminate": "https://vimeo.com/276045434/809da266b6"
  }

}
