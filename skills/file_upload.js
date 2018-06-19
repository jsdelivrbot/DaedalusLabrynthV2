const request = require('request');
const cloudinary = require('cloudinary');
const fs = require('fs');
// const 

module.exports = function(controller) {
  
  controller.fileUpload = function(bot, message, cb) {
    var destination_path = 'tmp/uploaded/';

    // the url to the file is in url_private. there are other fields containing image thumbnails as appropriate
    var url = message.file.url_private;

    var opts = {
        method: 'GET',
        url: url,
        headers: {
          Authorization: 'Bearer ' + bot.config.bot.token, // Authorization header with bot's access token
        }
    };
    
    var title = message.user + "_" + message.ts;

    var filePath = destination_path + title;

    var stream = request(opts, function(err, res, body) {
        console.log('FILE RETRIEVE STATUS',res.statusCode);          
    }).pipe(fs.createWriteStream(filePath));

    stream.on("finish", function() {
      // When stream is finished, upload the file
      cloudinary.v2.uploader.unsigned_upload(filePath, "image_counter_bot", 
          { resource_type: "image", tags: [ 'user_' + message.user, 'team_' + message.team ] },
         function(err, result) {
        console.log(err, result);
        
        if (fs.existsSync(filePath)) {
          // Remove the file from the temporary storage
          fs.unlinkSync(filePath);
        }
        
        // if we have a callback, run it
        if (cb) cb(result);
      });
    });
  };
}